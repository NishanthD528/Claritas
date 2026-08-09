// lib/gemini.ts
//
// Server-only Gemini client. GEMINI_API_KEY is read here and MUST NOT be
// exposed to the browser. Model is gemini-2.5-flash on the Google AI Studio
// free tier. Two operations: transcribe an image/scan, and extract structured
// line items from scrubbed text.

import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import { EXTRACTION_PROMPT, TRANSCRIPTION_PROMPT } from "@/lib/prompts";

// Model selection. gemini-flash-latest gives cleaner extraction (per-line
// dates, tidy descriptions) but is slow on big bills: a 124-line bill takes
// ~97s, past the serverless limit (Vercel caps at 60s), so it fails outright.
// gemini-flash-lite-latest does the same bill in ~38s but a bit more roughly.
// So we use the quality model for normal bills and switch to the fast one only
// when the scrubbed text is large enough to risk a timeout. Both are free-tier
// Flash aliases. (The spec targeted gemini-2.5-flash, but Google blocks that
// alias for new API keys.)
const QUALITY_MODEL = "gemini-flash-latest";
const FAST_MODEL = "gemini-flash-lite-latest";

// Above this many characters of scrubbed bill text, prefer the fast model so
// large itemized bills finish within the function timeout.
const FAST_MODEL_CHAR_THRESHOLD = 5000;

function extractionModel(textLength: number): string {
  return textLength > FAST_MODEL_CHAR_THRESHOLD ? FAST_MODEL : QUALITY_MODEL;
}

// Thrown when Gemini returns 429 (free tier is ~10 req/min). The route turns
// this into a friendly retry message for the user.
export class RateLimitError extends Error {
  constructor() {
    super("Gemini rate limit reached.");
    this.name = "RateLimitError";
  }
}

function getClient(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set.");
  }
  return new GoogleGenerativeAI(key);
}

function isRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b429\b|rate.?limit|quota|resource.?exhausted/i.test(msg);
}

// Response schema for structured extraction. Nullable fields use the SDK's
// `nullable` flag. INTEGER/NUMBER are distinguished so units stays whole.
const EXTRACTION_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    provider_name: { type: SchemaType.STRING, nullable: true },
    facility_type: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["hospital", "clinic", "lab", "imaging", "other"],
    },
    service_date_start: { type: SchemaType.STRING, nullable: true },
    service_date_end: { type: SchemaType.STRING, nullable: true },
    stated_total: { type: SchemaType.NUMBER, nullable: true },
    charges: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          line_number: { type: SchemaType.INTEGER },
          code: { type: SchemaType.STRING, nullable: true },
          code_type: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["cpt", "hcpcs", "revenue", "none"],
          },
          description_raw: { type: SchemaType.STRING },
          description_plain: { type: SchemaType.STRING },
          service_date: { type: SchemaType.STRING, nullable: true },
          units: { type: SchemaType.INTEGER },
          unit_price: { type: SchemaType.NUMBER, nullable: true },
          amount_charged: { type: SchemaType.NUMBER, nullable: true },
        },
        required: [
          "line_number",
          "code_type",
          "description_raw",
          "description_plain",
          "units",
          "amount_charged",
        ],
      },
    },
  },
  required: ["facility_type", "charges"],
};

/**
 * Transcribe an image or scanned PDF to plain text. The bytes are sent as
 * inline data; Gemini reads PDFs and images natively (no separate OCR).
 * The returned transcription is UNSCRUBBED and must be run through scrub()
 * before it is stored, logged, or reused.
 */
export async function transcribeFile(
  bytes: Buffer,
  mimeType: string
): Promise<string> {
  const model = getClient().getGenerativeModel({ model: QUALITY_MODEL });
  try {
    const result = await model.generateContent([
      { text: TRANSCRIPTION_PROMPT },
      { inlineData: { data: bytes.toString("base64"), mimeType } },
    ]);
    return result.response.text();
  } catch (err) {
    if (isRateLimit(err)) throw new RateLimitError();
    throw err;
  }
}

/**
 * Extract structured line items from already-scrubbed bill text. Returns the
 * raw parsed JSON (unknown); callers pass it through validateExtraction().
 */
export async function extractCharges(scrubbedText: string): Promise<unknown> {
  const model = getClient().getGenerativeModel({
    model: extractionModel(scrubbedText.length),
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: EXTRACTION_SCHEMA,
      temperature: 0,
    },
  });
  try {
    const result = await model.generateContent([
      { text: EXTRACTION_PROMPT },
      { text: "\n\nBILL TEXT:\n" + scrubbedText },
    ]);
    const text = result.response.text();
    return JSON.parse(text);
  } catch (err) {
    if (isRateLimit(err)) throw new RateLimitError();
    if (err instanceof SyntaxError) {
      throw new Error("Gemini returned malformed JSON.");
    }
    throw err;
  }
}

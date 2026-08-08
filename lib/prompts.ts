// lib/prompts.ts
//
// Prompts for the Gemini pipeline. The model does exactly two things:
//   1. Transcribe a scanned/photographed bill into text (image path only).
//   2. Extract structured line items from bill text.
//
// It never prices anything. The hard rule against stating fair prices,
// Medicare rates, or benchmarks is repeated in every prompt because it is the
// single most important behavioral constraint of the whole app.

// Used on the image/scan path to turn pixels into text BEFORE scrubbing.
// We ask only for a faithful transcription — no interpretation.
export const TRANSCRIPTION_PROMPT = `You are transcribing a medical bill image.
Return the full text of the document exactly as it appears, line by line.
Preserve billing codes, descriptions, dates, units, and dollar amounts.
Do not summarize, interpret, price, or add anything that is not printed on the
document. Output plain text only.`;

// The extraction prompt. Input is already PII-scrubbed text.
export const EXTRACTION_PROMPT = `You are a medical billing analyst. Extract every line item from this bill.

For each line item return:
- line_number: sequential integer
- code: the billing code exactly as printed, or null if absent
- code_type: "cpt", "hcpcs", "revenue", or "none"
- description_raw: the description exactly as printed
- description_plain: a one-sentence plain-English explanation of what this
  service is, for someone with no medical background. No jargon.
- service_date: ISO date for this line, or null
- units: integer, default 1
- unit_price: number or null
- amount_charged: number, no currency symbol

Also return:
- provider_name: billing facility or practice, or null
- facility_type: "hospital", "clinic", "lab", "imaging", or "other"
- service_date_start and service_date_end: ISO dates or null
- stated_total: the total printed on the bill, or null

Rules:
- Do not invent line items. Only return what appears on the bill.
- Never estimate, guess, or state any fair price, Medicare rate, typical cost,
  or benchmark amount. You have no pricing data. Do not comment on whether
  any amount is high or low.
- If a value is unreadable, return null rather than guessing.
- Return only valid JSON matching the schema. No prose, no markdown fences.`;

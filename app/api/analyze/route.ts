// app/api/analyze/route.ts
//
// The analyze pipeline. Deployed by @netlify/plugin-nextjs as a serverless
// function, so GEMINI_API_KEY and the service work stay server-side and never
// reach the browser.
//
// The response is a stream of newline-delimited JSON. As each real phase
// completes the route emits {phase} so the client can show an honest,
// step-by-step loading state; the final line is {done, saved, billId,
// analysis} or {error}. If a host buffers the stream, the client still gets
// every line at the end and simply jumps to the result.
//
// Pipeline:
//   1. Read text (pasted, PDF text layer via pdf-parse, or Gemini inline
//      transcription for scans/photos).
//   2. scrub() ALL text before it is stored, logged, or reused.
//   3. Gemini extraction (JSON schema) -> validate/normalize.
//   4. Deterministic rule pass + rights matcher.
//   5. Persist for signed-in users; always return the analysis.

import { NextResponse } from "next/server";
import { scrub } from "@/lib/scrub";
import { extractPdfText, SCAN_TEXT_THRESHOLD } from "@/lib/pdf";
import { transcribeFile, extractCharges, RateLimitError } from "@/lib/gemini";
import {
  validateExtraction,
  computeTotal,
  type BillExtraction,
} from "@/lib/types";
import { runFlags, type Flag } from "@/lib/flags";
import { matchRights, type MatchedRight } from "@/lib/rights";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/heic", "image/heif"];

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}
function isImage(file: File): boolean {
  if (IMAGE_TYPES.includes(file.type)) return true;
  return /\.(png|jpe?g|webp|heic|heif)$/i.test(file.name);
}

const RATE_LIMIT_MESSAGE =
  "Claritas is getting a lot of requests right now. Wait about a minute and try again.";

// Persist bill + charges + flags + rights for a signed-in user. Returns the
// new bill id, or null when signed out / persistence failed (analysis is
// still returned to the client either way).
async function persistBill(
  supabase: SupabaseClient,
  user: User,
  extraction: BillExtraction,
  computed_total: number,
  flags: Flag[],
  rights: MatchedRight[],
  scrubbedText: string,
  filename: string | null
): Promise<string | null> {
  const { data: bill, error: billErr } = await supabase
    .from("bills")
    .insert({
      user_id: user.id,
      filename,
      provider_name: extraction.provider_name,
      facility_type: extraction.facility_type,
      service_date_start: extraction.service_date_start,
      service_date_end: extraction.service_date_end,
      stated_total: extraction.stated_total,
      computed_total,
      flag_count: flags.length,
      status: "analyzed",
      scrubbed_text: scrubbedText,
    })
    .select("id")
    .single();
  if (billErr || !bill) return null;

  const chargeRows = extraction.charges.map((c) => ({
    bill_id: bill.id,
    line_number: c.line_number,
    code: c.code,
    code_type: c.code_type,
    description_raw: c.description_raw,
    description_plain: c.description_plain,
    service_date: c.service_date,
    units: c.units,
    unit_price: c.unit_price,
    amount_charged: c.amount_charged,
  }));
  const { data: insertedCharges } = await supabase
    .from("charges")
    .insert(chargeRows)
    .select("id, line_number");

  if (flags.length > 0) {
    const idByLine = new Map<number, string>();
    for (const row of insertedCharges ?? []) {
      idByLine.set(row.line_number as number, row.id as string);
    }
    await supabase.from("flags").insert(
      flags.map((f) => ({
        bill_id: bill.id,
        charge_id:
          f.charge_line_number !== null
            ? idByLine.get(f.charge_line_number) ?? null
            : null,
        flag_type: f.flag_type,
        severity: f.severity,
        explanation: f.explanation,
        suggested_question: f.suggested_question,
      }))
    );
  }

  if (rights.length > 0) {
    await supabase.from("rights").insert(
      rights.map((r) => ({
        bill_id: bill.id,
        right_key: r.right_key,
        relevance: r.relevance,
      }))
    );
  }

  return bill.id as string;
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Could not read the upload. Please try again." },
      { status: 400 }
    );
  }

  const pastedText = (form.get("text") as string | null)?.trim() || "";
  const file = form.get("file") as File | null;
  const filename = file?.name ?? (pastedText ? "pasted-text" : null);

  // Fast pre-checks return a single JSON line the client parses the same way.
  if (!pastedText && !file) {
    return NextResponse.json(
      { error: "No bill provided. Upload a file or paste the bill text." },
      { status: 400 }
    );
  }
  if (file && file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error:
          "That file is over 4.5 MB. Please upload a smaller PDF or photo, " +
          "or paste the bill text instead.",
      },
      { status: 413 }
    );
  }
  if (file && !isPdf(file) && !isImage(file)) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload a PDF or an image, or paste text." },
      { status: 415 }
    );
  }

  // Resolve the session before streaming so any auth-cookie refresh lands in
  // the response headers.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      try {
        // ---- 1: read text ------------------------------------------------
        send({ phase: "reading" });
        let rawText: string;
        if (pastedText) {
          rawText = pastedText;
        } else {
          const f = file as File;
          const bytes = Buffer.from(await f.arrayBuffer());
          if (isPdf(f)) {
            const text = await extractPdfText(bytes);
            rawText =
              text.length >= SCAN_TEXT_THRESHOLD
                ? text
                : await transcribeFile(bytes, "application/pdf");
          } else {
            const mime = IMAGE_TYPES.includes(f.type) ? f.type : "image/jpeg";
            rawText = await transcribeFile(bytes, mime);
          }
        }

        // ---- 2: scrub ----------------------------------------------------
        send({ phase: "scrubbing" });
        const scrubbedText = scrub(rawText);
        if (!scrubbedText.trim()) {
          send({
            error:
              "No readable text was found in that bill. Try a clearer image " +
              "or paste the text.",
          });
          return;
        }

        // ---- 3: structured extraction ------------------------------------
        send({ phase: "extracting" });
        const extraction = validateExtraction(await extractCharges(scrubbedText));

        const anyCode = extraction.charges.some((c) => c.code !== null);
        const anyAmount = extraction.charges.some((c) => c.amount_charged !== null);
        const hasProvider = extraction.provider_name !== null;

        if (
          extraction.charges.length === 0 ||
          (!anyCode && !anyAmount && !hasProvider)
        ) {
          send({
            error:
              "This doesn't look like an itemized medical bill. Make sure " +
              "you're uploading or pasting the full itemized statement.",
          });
          return;
        }
        if (!anyAmount) {
          send({
            error:
              "We couldn't read this bill clearly. Try a clearer photo, or " +
              "paste the text directly instead.",
          });
          return;
        }

        // ---- 4: deterministic checks + rights ----------------------------
        send({ phase: "checking" });
        const computed_total = computeTotal(extraction.charges);
        const flags = runFlags(extraction);
        const rights = matchRights({
          facility_type: extraction.facility_type,
          charges: extraction.charges,
          computed_total,
          stated_total: extraction.stated_total,
          status: "analyzed",
        });

        const analysis = {
          filename,
          provider_name: extraction.provider_name,
          facility_type: extraction.facility_type,
          service_date_start: extraction.service_date_start,
          service_date_end: extraction.service_date_end,
          stated_total: extraction.stated_total,
          computed_total,
          flag_count: flags.length,
          charges: extraction.charges,
          flags,
          rights,
          scrubbed_text: scrubbedText,
        };

        // ---- 5: persist for signed-in users ------------------------------
        let billId: string | null = null;
        if (user) {
          try {
            billId = await persistBill(
              supabase,
              user,
              extraction,
              computed_total,
              flags,
              rights,
              scrubbedText,
              filename
            );
          } catch {
            billId = null; // never fail the request just because saving failed
          }
        }

        send({ done: true, saved: billId !== null, billId, analysis });
      } catch (err) {
        if (err instanceof RateLimitError) {
          send({ error: RATE_LIMIT_MESSAGE, rateLimited: true });
        } else {
          send({ error: "The bill could not be analyzed. Please try again." });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

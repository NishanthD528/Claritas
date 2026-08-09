// app/api/analyze/route.ts
//
// The analyze pipeline. Deployed by @netlify/plugin-nextjs as a serverless
// function, so GEMINI_API_KEY and the service work stay server-side and never
// reach the browser.
//
// Pipeline:
//   1. Receive an uploaded file (PDF or image) or pasted text.
//   2. PDF -> try text layer (pdf-parse). If < threshold chars, treat as scan.
//   3. Scan/image -> send bytes to Gemini inline for transcription.
//   4. scrub() ALL text before it is stored, logged, or reused.
//   5. Gemini extraction call (JSON schema) -> validate/normalize.
//   6. Deterministic rule pass (lib/flags.ts) over the bill's own contents.
//   7. Rights matcher (lib/rights.ts) against the bill's situation.
//   8. Persist for signed-in users; always return the analysis.

import { NextResponse } from "next/server";
import { scrub } from "@/lib/scrub";
import { extractPdfText, SCAN_TEXT_THRESHOLD } from "@/lib/pdf";
import { transcribeFile, extractCharges, RateLimitError } from "@/lib/gemini";
import { validateExtraction, computeTotal } from "@/lib/types";
import { runFlags } from "@/lib/flags";
import { matchRights } from "@/lib/rights";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Keep uploads under Netlify's inbound function body limit (~6 MB). Base64
// transport and headers eat into that, so cap the raw file conservatively.
const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024;

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/heic", "image/heif"];

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isImage(file: File): boolean {
  if (IMAGE_TYPES.includes(file.type)) return true;
  return /\.(png|jpe?g|webp|heic|heif)$/i.test(file.name);
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

  // ---- 1-4: get scrubbed text from whichever input we were given ----------
  let scrubbedText: string;

  try {
    if (pastedText) {
      scrubbedText = scrub(pastedText);
    } else if (file) {
      if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json(
          {
            error:
              "That file is over 4.5 MB. Please upload a smaller PDF or photo, " +
              "or paste the bill text instead.",
          },
          { status: 413 }
        );
      }
      const bytes = Buffer.from(await file.arrayBuffer());

      if (isPdf(file)) {
        const text = await extractPdfText(bytes);
        if (text.length >= SCAN_TEXT_THRESHOLD) {
          // Real text layer.
          scrubbedText = scrub(text);
        } else {
          // Scanned PDF -> image path. Scrub the model transcription.
          const transcription = await transcribeFile(bytes, "application/pdf");
          scrubbedText = scrub(transcription);
        }
      } else if (isImage(file)) {
        const mime = IMAGE_TYPES.includes(file.type) ? file.type : "image/jpeg";
        const transcription = await transcribeFile(bytes, mime);
        scrubbedText = scrub(transcription);
      } else {
        return NextResponse.json(
          { error: "Unsupported file type. Upload a PDF or an image, or paste text." },
          { status: 415 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "No bill provided. Upload a file or paste the bill text." },
        { status: 400 }
      );
    }
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        {
          error:
            "The free analysis service is busy right now (rate limit). " +
            "Please wait about a minute and try again.",
        },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "Could not read the bill. Please try a clearer file or paste the text." },
      { status: 502 }
    );
  }

  if (!scrubbedText.trim()) {
    return NextResponse.json(
      { error: "No readable text was found in that bill. Try a clearer image or paste the text." },
      { status: 422 }
    );
  }

  // ---- 5: structured extraction via Gemini --------------------------------
  let extraction;
  try {
    const raw = await extractCharges(scrubbedText);
    extraction = validateExtraction(raw);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        {
          error:
            "The free analysis service is busy right now (rate limit). " +
            "Please wait about a minute and try again.",
        },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "The bill could not be analyzed. Please try again." },
      { status: 502 }
    );
  }

  let computed_total: number;
  let flags;
  let rights;
  try {
    computed_total = computeTotal(extraction.charges);

    // ---- 6: deterministic rule pass over the bill's own contents ----------
    flags = runFlags(extraction);

    // ---- 7: rights matcher against the bill's situation -------------------
    rights = matchRights({
      facility_type: extraction.facility_type,
      charges: extraction.charges,
      computed_total,
      stated_total: extraction.stated_total,
      status: "analyzed",
    });
  } catch {
    // Never let post-extraction analysis crash into a non-JSON 500.
    return NextResponse.json(
      { error: "The bill could not be analyzed. Please try again." },
      { status: 500 }
    );
  }

  // ---- 8: persist for signed-in users; always return the analysis ---------
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

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Signed out: analysis is held in the client session, not persisted.
      return NextResponse.json({ saved: false, billId: null, analysis });
    }

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

    if (billErr || !bill) {
      // Persistence failed, but the analysis is still valid to return.
      return NextResponse.json({ saved: false, billId: null, analysis });
    }

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
    // Insert charges and read back their ids so flags can reference them.
    const { data: insertedCharges } = await supabase
      .from("charges")
      .insert(chargeRows)
      .select("id, line_number");

    if (flags.length > 0) {
      const idByLine = new Map<number, string>();
      for (const row of insertedCharges ?? []) {
        idByLine.set(row.line_number as number, row.id as string);
      }
      const flagRows = flags.map((f) => ({
        bill_id: bill.id,
        charge_id:
          f.charge_line_number !== null
            ? idByLine.get(f.charge_line_number) ?? null
            : null,
        flag_type: f.flag_type,
        severity: f.severity,
        explanation: f.explanation,
        suggested_question: f.suggested_question,
      }));
      await supabase.from("flags").insert(flagRows);
    }

    if (rights.length > 0) {
      const rightRows = rights.map((r) => ({
        bill_id: bill.id,
        right_key: r.right_key,
        relevance: r.relevance,
      }));
      await supabase.from("rights").insert(rightRows);
    }

    return NextResponse.json({ saved: true, billId: bill.id, analysis });
  } catch {
    // Never fail the whole request just because saving didn't work.
    return NextResponse.json({ saved: false, billId: null, analysis });
  }
}

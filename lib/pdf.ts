// lib/pdf.ts
//
// Text-layer extraction for PDFs. If a PDF has a real text layer we read it
// here and skip the model entirely. Scanned PDFs (images of paper) yield
// little or no text; the caller detects that via the length threshold and
// falls through to the Gemini image path.

import pdfParse from "pdf-parse/lib/pdf-parse.js";

// Below this many characters we assume the PDF is a scan, not digital text.
export const SCAN_TEXT_THRESHOLD = 200;

export async function extractPdfText(bytes: Buffer): Promise<string> {
  try {
    const result = await pdfParse(bytes);
    return (result.text || "").trim();
  } catch {
    // A corrupt or image-only PDF can throw; treat as no extractable text so
    // the caller falls through to the image path.
    return "";
  }
}

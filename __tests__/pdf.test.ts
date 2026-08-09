// __tests__/pdf.test.ts
//
// Confirms our pdf-parse wrapper loads (no debug-file crash from importing the
// package index) and degrades gracefully. Real text-layer extraction is
// pdf-parse's own well-tested job; what we own is the wrapper's contract:
// return trimmed text, and return "" instead of throwing on unreadable input,
// so the route can fall through to the Gemini image path.

import { extractPdfText, SCAN_TEXT_THRESHOLD } from "@/lib/pdf";

describe("extractPdfText wrapper", () => {
  test("returns '' (not a throw) for a non-PDF buffer", async () => {
    const out = await extractPdfText(Buffer.from("this is plainly not a pdf"));
    expect(out).toBe("");
  });

  test("returns '' for an empty buffer", async () => {
    const out = await extractPdfText(Buffer.alloc(0));
    expect(out).toBe("");
  });

  test("scan threshold is a positive number", () => {
    expect(SCAN_TEXT_THRESHOLD).toBeGreaterThan(0);
  });
});

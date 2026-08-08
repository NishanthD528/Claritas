// Type shim for the inner pdf-parse module. We import the library entry
// (pdf-parse/lib/pdf-parse.js) directly to avoid the package index's debug
// block, which tries to read a bundled sample PDF from disk at import time.
declare module "pdf-parse/lib/pdf-parse.js" {
  interface PDFParseResult {
    text: string;
    numpages: number;
    info: unknown;
  }
  function pdfParse(dataBuffer: Buffer): Promise<PDFParseResult>;
  export default pdfParse;
}

// The app deliberately does not estimate fair prices. If a user wants to know
// what a code "should" cost, we point them to the government's own public
// lookup tool rather than answering.
export function PriceQuestionNote() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
      <span className="font-medium text-ink">
        Wondering what a charge should cost?
      </span>{" "}
      This app does not estimate fair prices. You can look up a billing code
      yourself with the government&rsquo;s{" "}
      <a
        href="https://www.cms.gov/medicare/physician-fee-schedule/search"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-accent hover:underline"
      >
        CMS Physician Fee Schedule Look-Up Tool
      </a>
      .
    </div>
  );
}

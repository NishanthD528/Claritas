"use client";

import { useMemo, useState } from "react";
import { buildLetter } from "@/lib/letter";
import type { BillView } from "@/lib/view";

// Generate letter, copy to clipboard, download as .txt. The letter is built
// deterministically on the client from the same BillView the page renders.
export function LetterSection({ bill }: { bill: BillView }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const letter = useMemo(() => buildLetter(bill), [bill]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function download() {
    const blob = new Blob([letter], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dispute-letter.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover"
        >
          Generate a letter to the billing department
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={copy}
              className="inline-flex items-center rounded-lg border border-accent px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent-soft/40"
            >
              {copied ? "Copied" : "Copy to clipboard"}
            </button>
            <button
              onClick={download}
              className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400"
            >
              Download as .txt
            </button>
            <button
              onClick={() => setOpen(false)}
              className="inline-flex items-center rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-ink"
            >
              Hide
            </button>
          </div>
          <textarea
            readOnly
            value={letter}
            rows={20}
            className="w-full rounded-lg border border-slate-300 bg-slate-50 p-4 font-mono text-xs text-slate-800"
          />
          <p className="text-xs text-slate-500">
            Review and fill in the blanks (account number, your name and
            contact details) before sending. This is a starting point, not legal
            advice.
          </p>
        </div>
      )}
    </div>
  );
}

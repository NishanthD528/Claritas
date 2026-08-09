"use client";

import { useState } from "react";
import { fmtMoney, fmtDate } from "@/lib/format";
import type { ChargeView } from "@/lib/view";

// Above this many line items the table collapses by default to the flagged
// rows plus the first N unflagged rows, with a toggle to show everything.
const COLLAPSE_ABOVE = 25;
const UNFLAGGED_PREVIEW = 10;

// The charge table: code, plain-English description, date, units, amount.
// Rows tied to a flag are marked. Scrolls horizontally on small screens so the
// whole table stays readable on a phone.
export function ChargeTable({
  charges,
  flaggedLines,
}: {
  charges: ChargeView[];
  flaggedLines: Set<number>;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLarge = charges.length > COLLAPSE_ABOVE;
  const collapsed = isLarge && !expanded;

  let visible = charges;
  if (collapsed) {
    let unflaggedShown = 0;
    visible = charges.filter((c) => {
      if (flaggedLines.has(c.line_number)) return true;
      if (unflaggedShown < UNFLAGGED_PREVIEW) {
        unflaggedShown += 1;
        return true;
      }
      return false;
    });
  }
  const hidden = charges.length - visible.length;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 text-right font-medium">Units</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((c) => {
              const flagged = flaggedLines.has(c.line_number);
              // A row we couldn't read cleanly: no amount, or no description.
              const unclear =
                c.amount_charged === null ||
                (!c.description_raw && !c.description_plain);
              return (
                <tr
                  key={c.line_number}
                  className={flagged ? "bg-danger-soft/40" : undefined}
                >
                  <td className="whitespace-nowrap px-4 py-3 align-top font-mono text-xs text-slate-700">
                    {c.code ?? "—"}
                    {c.code_type !== "none" && c.code ? (
                      <span className="ml-1 rounded bg-slate-100 px-1 py-0.5 text-[10px] uppercase text-slate-500">
                        {c.code_type}
                      </span>
                    ) : null}
                    {c.code ? (
                      <a
                        href="https://www.cms.gov/medicare/physician-fee-schedule/search"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Look up this code's Medicare rate on the government's tool"
                        className="mt-1 block font-sans text-[11px] font-medium text-accent hover:underline"
                      >
                        Look up rate ↗
                      </a>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-start gap-2">
                      {flagged ? (
                        <span
                          aria-label="flagged"
                          title="This line has a question worth asking"
                          className="mt-1 inline-block h-2 w-2 flex-none rounded-full bg-danger"
                        />
                      ) : null}
                      <div>
                        <div className="flex items-center gap-2 font-medium text-ink">
                          {c.description_raw || c.description_plain || "—"}
                          {unclear ? (
                            <span
                              title="This line couldn't be read clearly from the bill"
                              className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700"
                            >
                              Unclear
                            </span>
                          ) : null}
                        </div>
                        {c.description_raw && c.description_plain ? (
                          <div className="mt-0.5 text-xs text-slate-500">
                            {c.description_plain}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-top text-slate-600">
                    {fmtDate(c.service_date)}
                  </td>
                  <td className="px-4 py-3 align-top text-right tabular-nums text-slate-700">
                    {c.units}
                  </td>
                  <td className="px-4 py-3 align-top text-right tabular-nums font-medium text-ink">
                    {fmtMoney(c.amount_charged)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isLarge ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <span className="text-slate-500">
            {collapsed
              ? `Showing flagged items and the first ${UNFLAGGED_PREVIEW} charges (${hidden} more hidden).`
              : `Showing all ${charges.length} charges.`}
          </span>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="font-medium text-accent transition hover:underline"
          >
            {collapsed ? `Show all ${charges.length} charges` : "Show fewer"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

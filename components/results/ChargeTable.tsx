import { fmtMoney, fmtDate } from "@/lib/format";
import type { ChargeView } from "@/lib/view";

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
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
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
          {charges.map((c) => {
            const flagged = flaggedLines.has(c.line_number);
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
                      <div className="font-medium text-ink">
                        {c.description_raw || "—"}
                      </div>
                      {c.description_plain ? (
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
  );
}

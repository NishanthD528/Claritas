import { fmtMoney } from "@/lib/format";
import type { BillView } from "@/lib/view";

// A colorful at-a-glance summary row above the results. Soft tinted tiles keep
// it professional while adding color and useful context.
export function StatTiles({
  bill,
  amountsComplete,
}: {
  bill: BillView;
  amountsComplete: boolean;
}) {
  const total = bill.stated_total ?? bill.computed_total;

  const tiles = [
    {
      label: "Total billed",
      value: amountsComplete || bill.stated_total !== null ? fmtMoney(total) : "—",
      className: "from-blue-50 to-white border-blue-100",
      accent: "text-blue-700",
    },
    {
      label: `Line item${bill.charges.length === 1 ? "" : "s"}`,
      value: String(bill.charges.length),
      className: "from-cyan-50 to-white border-cyan-100",
      accent: "text-cyan-700",
    },
    {
      label: `Question${bill.flag_count === 1 ? "" : "s"} to consider`,
      value: String(bill.flag_count),
      className:
        bill.flag_count > 0
          ? "from-amber-50 to-white border-amber-100"
          : "from-slate-50 to-white border-slate-200",
      accent: bill.flag_count > 0 ? "text-amber-700" : "text-slate-500",
    },
    {
      label: `Thing${bill.rights.length === 1 ? "" : "s"} you can do`,
      value: String(bill.rights.length),
      className: "from-emerald-50 to-white border-emerald-100",
      accent: "text-emerald-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((t) => (
        <div
          key={t.label}
          className={`rounded-xl border bg-gradient-to-br p-4 ${t.className}`}
        >
          <div className={`text-2xl font-bold tabular-nums ${t.accent}`}>
            {t.value}
          </div>
          <div className="mt-0.5 text-xs font-medium text-slate-500">
            {t.label}
          </div>
        </div>
      ))}
    </div>
  );
}

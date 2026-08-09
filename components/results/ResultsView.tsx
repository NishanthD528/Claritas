import type { BillView } from "@/lib/view";
import { fmtDate } from "@/lib/format";
import { MathBanner } from "./MathBanner";
import { PriceQuestionNote } from "./PriceQuestionNote";
import { ChargeTable } from "./ChargeTable";
import { RightsCards } from "./RightsCards";
import { FlagCards } from "./FlagCards";
import { LetterSection } from "./LetterSection";
import { StatTiles } from "./StatTiles";

// A colored accent bar keys each section to the palette (blue → emerald).
function SectionHeading({
  children,
  color = "bg-accent",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <h2 className="mb-3 flex items-center gap-2.5 text-lg font-semibold tracking-tight text-ink">
      <span className={`h-5 w-1.5 flex-none rounded-full ${color}`} />
      {children}
    </h2>
  );
}

// Composes the full results experience from a BillView. Pure presentational so
// it serves both the persisted (/bills/[id]) and in-session (signed-out) paths.
export function ResultsView({ bill }: { bill: BillView }) {
  const flaggedLines = new Set<number>(
    bill.flags
      .map((f) => f.charge_line_number)
      .filter((n): n is number => n !== null)
  );

  // Whether every line has a readable amount. When not, the total can't be
  // reliably checked and we say so instead of showing a computed figure.
  const amountsComplete =
    bill.charges.length > 0 &&
    bill.charges.every((c) => c.amount_charged !== null);

  const dateRange =
    bill.service_date_start && bill.service_date_end
      ? bill.service_date_start === bill.service_date_end
        ? fmtDate(bill.service_date_start)
        : `${fmtDate(bill.service_date_start)} to ${fmtDate(bill.service_date_end)}`
      : bill.service_date_start
      ? fmtDate(bill.service_date_start)
      : null;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {bill.provider_name || "Your bill"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {dateRange ? <>Service dates: {dateRange} · </> : null}
          {bill.charges.length} line item
          {bill.charges.length === 1 ? "" : "s"} · {bill.flag_count} question
          {bill.flag_count === 1 ? "" : "s"} to consider
        </p>
      </div>

      <StatTiles bill={bill} amountsComplete={amountsComplete} />

      <MathBanner
        stated={bill.stated_total}
        computed={bill.computed_total}
        amountsComplete={amountsComplete}
      />

      <PriceQuestionNote />

      <section>
        <SectionHeading color="bg-gradient-to-b from-blue-500 to-cyan-500">
          Every charge, explained
        </SectionHeading>
        <ChargeTable charges={bill.charges} flaggedLines={flaggedLines} />
      </section>

      {bill.rights.length > 0 ? (
        <section>
          <SectionHeading color="bg-gradient-to-b from-emerald-500 to-teal-500">
            What you can do
          </SectionHeading>
          <RightsCards rights={bill.rights} />
        </section>
      ) : null}

      <section>
        <SectionHeading color="bg-gradient-to-b from-amber-500 to-orange-500">
          Questions worth asking
        </SectionHeading>
        <FlagCards flags={bill.flags} />
      </section>

      <section>
        <SectionHeading color="bg-gradient-to-b from-indigo-500 to-blue-500">
          Send a letter
        </SectionHeading>
        <p className="mb-3 text-sm text-slate-600">
          This drafts a neutral, professional letter to the billing department
          listing your questions and requesting a corrected itemized statement.
        </p>
        <LetterSection bill={bill} />
      </section>
    </div>
  );
}

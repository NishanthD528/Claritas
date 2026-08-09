import { fmtMoney } from "@/lib/format";

// The math-check banner: the single most winnable dispute, shown first and
// prominently. Green when the line items match the printed total, red when
// they do not, neutral when the bill printed no total to compare against.
export function MathBanner({
  stated,
  computed,
}: {
  stated: number | null;
  computed: number;
}) {
  if (stated === null) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm font-medium text-slate-700">
          No printed total found on this bill to compare against.
        </p>
        <p className="mt-1 text-sm text-slate-600">
          The listed charges add up to{" "}
          <span className="font-semibold">{fmtMoney(computed)}</span>.
        </p>
      </div>
    );
  }

  const diff = Math.round((stated - computed) * 100) / 100;
  const matches = Math.abs(diff) <= 0.01;

  if (matches) {
    return (
      <div className="rounded-lg border border-ok/30 bg-ok-soft p-5">
        <p className="text-sm font-semibold text-ok">
          The math checks out.
        </p>
        <p className="mt-1 text-sm text-slate-700">
          The listed charges add up to {fmtMoney(computed)}, which matches the
          bill&rsquo;s stated total of {fmtMoney(stated)}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-danger/30 bg-danger-soft p-5">
      <p className="text-sm font-semibold text-danger">
        The totals don&rsquo;t match.
      </p>
      <p className="mt-1 text-sm text-slate-700">
        The listed charges add up to{" "}
        <span className="font-semibold">{fmtMoney(computed)}</span>, but the
        bill&rsquo;s stated total is{" "}
        <span className="font-semibold">{fmtMoney(stated)}</span> — a difference
        of <span className="font-semibold">{fmtMoney(Math.abs(diff))}</span>.
      </p>
      <p className="mt-2 text-xs text-slate-600">
        This is worth asking your billing department about first.
      </p>
    </div>
  );
}

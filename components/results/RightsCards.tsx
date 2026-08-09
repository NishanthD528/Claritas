import type { RightView } from "@/lib/view";
import { RIGHTS, type RightKey } from "@/lib/rights";

// "What you can do": each matched right rendered as a card with the static
// plain-language explanation, why it applies to THIS bill, the concrete next
// action, and the verify note. Framed as things to look into, not guarantees.
export function RightsCards({ rights }: { rights: RightView[] }) {
  if (rights.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {rights.map((r, i) => {
        const entry = RIGHTS[r.right_key as RightKey];
        if (!entry) return null;
        return (
          <div
            key={`${r.right_key}-${i}`}
            className="flex flex-col rounded-lg border border-slate-200 bg-white p-5"
          >
            <h3 className="text-base font-semibold text-ink">{entry.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{entry.explanation}</p>

            <div className="mt-3 rounded-md bg-accent-soft/40 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-accent">
                Why this applies to your bill
              </p>
              <p className="mt-1 text-sm text-slate-700">{r.relevance}</p>
            </div>

            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Next step
              </p>
              <p className="mt-1 text-sm text-ink">{entry.action}</p>
            </div>

            <p className="mt-4 text-xs text-slate-400">{entry.verifyNote}</p>
          </div>
        );
      })}
    </div>
  );
}

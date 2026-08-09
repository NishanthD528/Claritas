"use client";

import { useState } from "react";
import type { FlagView } from "@/lib/view";
import type { Severity } from "@/lib/flags";

// Human-readable labels for flag types.
const FLAG_LABELS: Record<string, string> = {
  math_error: "Total doesn't add up",
  line_math_error: "Line total doesn't add up",
  duplicate: "Possible duplicate charge",
  near_duplicate: "Possible duplicate charge",
  unit_anomaly: "Unusual quantity",
  date_outside_range: "Date outside service window",
  unbundling: "Possibly unbundled services",
  vague_line: "Unclear charge",
};

const SEVERITY_ORDER: Severity[] = ["high", "medium", "low"];

const SEVERITY_META: Record<
  Severity,
  { label: string; dot: string; badge: string }
> = {
  high: {
    label: "Worth asking about first",
    dot: "bg-danger",
    badge: "bg-danger-soft text-danger",
  },
  medium: {
    label: "Worth a question",
    dot: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700",
  },
  low: {
    label: "Minor — good to clarify",
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-600",
  },
};

// One expandable flag card. `action` renders the dismiss/restore control in
// the summary; it stops the click from toggling the <details>.
function FlagCard({
  flag,
  action,
}: {
  flag: FlagView;
  action: React.ReactNode;
}) {
  const meta = SEVERITY_META[flag.severity];
  return (
    <details className="group rounded-lg border border-slate-200 bg-white p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${meta.badge}`}
          >
            {FLAG_LABELS[flag.flag_type] ?? flag.flag_type}
          </span>
          <span className="text-xs text-slate-500">
            {flag.charge_line_number !== null
              ? `Line ${flag.charge_line_number}`
              : "Whole bill"}
          </span>
        </span>
        <span className="flex items-center gap-3">
          <span className="text-xs text-accent group-open:hidden">Show</span>
          <span className="hidden text-xs text-accent group-open:inline">
            Hide
          </span>
          {action}
        </span>
      </summary>
      <div className="mt-3 space-y-3 text-sm">
        <p className="text-slate-600">{flag.explanation}</p>
        <div className="rounded-md bg-accent-soft/40 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">
            What to ask billing
          </p>
          <p className="mt-1 text-ink">{flag.suggested_question}</p>
        </div>
      </div>
    </details>
  );
}

// Flags grouped by severity, each an expandable card the user can dismiss.
// Dismissed flags move to a collapsed section at the bottom so they can be
// restored. Dismissals are session-only (not persisted), which is fine here.
export function FlagCards({ flags }: { flags: FlagView[] }) {
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  function dismiss(i: number) {
    setDismissed((prev) => new Set(prev).add(i));
  }
  function restore(i: number) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.delete(i);
      return next;
    });
  }

  if (flags.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        No internal inconsistencies were detected on this bill. That does not
        guarantee every charge is correct — it means the automated checks found
        nothing to question.
      </p>
    );
  }

  const indexed = flags.map((f, i) => ({ f, i }));
  const active = indexed.filter(({ i }) => !dismissed.has(i));
  const dismissedList = indexed.filter(({ i }) => dismissed.has(i));

  return (
    <div className="space-y-6">
      {SEVERITY_ORDER.map((sev) => {
        const group = active.filter(({ f }) => f.severity === sev);
        if (group.length === 0) return null;
        const meta = SEVERITY_META[sev];
        return (
          <div key={sev}>
            <div className="mb-2 flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${meta.dot}`} />
              <h3 className="text-sm font-semibold text-ink">{meta.label}</h3>
              <span className="text-xs text-slate-400">({group.length})</span>
            </div>
            <div className="space-y-2">
              {group.map(({ f, i }) => (
                <FlagCard
                  key={i}
                  flag={f}
                  action={
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        dismiss(i);
                      }}
                      className="text-xs font-medium text-slate-400 transition hover:text-ink"
                      title="Dismiss this question"
                    >
                      Dismiss
                    </button>
                  }
                />
              ))}
            </div>
          </div>
        );
      })}

      {active.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          You&rsquo;ve dismissed every question. They&rsquo;re still available
          below if you want to bring any back.
        </p>
      ) : null}

      {dismissedList.length > 0 ? (
        <details className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-600">
            Dismissed ({dismissedList.length})
          </summary>
          <div className="mt-3 space-y-2">
            {dismissedList.map(({ f, i }) => (
              <FlagCard
                key={i}
                flag={f}
                action={
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      restore(i);
                    }}
                    className="text-xs font-medium text-accent transition hover:underline"
                    title="Restore this question"
                  >
                    Restore
                  </button>
                }
              />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

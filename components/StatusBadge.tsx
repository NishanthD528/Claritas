const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  analyzed: { label: "Analyzed", className: "bg-slate-100 text-slate-600" },
  disputing: { label: "Disputing", className: "bg-amber-100 text-amber-700" },
  resolved: { label: "Resolved", className: "bg-ok-soft text-ok" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.analyzed;
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}
    >
      {s.label}
    </span>
  );
}

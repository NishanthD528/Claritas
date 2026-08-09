"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface DisputeNote {
  id: string;
  note: string;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  analyzed: "Analyzed",
  disputing: "Disputing",
  resolved: "Resolved",
};

// Status dropdown + dispute notes, for a saved bill only. Changing the status
// re-runs the rights engine server-side (so collections-pause appears once
// disputing), then refreshes the server component to reflect it.
export function DisputeSection({
  billId,
  initialStatus,
  initialNotes,
}: {
  billId: string;
  initialStatus: string;
  initialNotes: DisputeNote[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [notes, setNotes] = useState<DisputeNote[]>(initialNotes);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function changeStatus(next: string) {
    const prev = status;
    setStatus(next);
    setErr(null);
    const res = await fetch(`/api/bills/${billId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      setStatus(prev);
      setErr("Could not update status. Please try again.");
      return;
    }
    // Rights may have changed (collections pause); refresh the page data.
    router.refresh();
  }

  async function addNote() {
    const text = draft.trim();
    if (!text) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/bills/${billId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error ?? "Could not save note.");
        return;
      }
      setNotes((n) => [...n, data.note]);
      setDraft("");
    } catch {
      setErr("Could not save note.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="status" className="text-sm font-medium text-ink">
          Status
        </label>
        <select
          id="status"
          value={status}
          onChange={(e) => changeStatus(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {status === "disputing" ? (
          <span className="text-xs text-slate-500">
            Marking a bill as disputing surfaces your right to ask for a
            collections pause.
          </span>
        ) : null}
      </div>

      <div>
        <h3 className="text-sm font-medium text-ink">Notes</h3>
        {notes.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {notes.map((n) => (
              <li
                key={n.id}
                className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
              >
                <p className="whitespace-pre-wrap text-slate-700">{n.note}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {new Date(n.created_at).toLocaleString("en-US")}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            Keep a record of calls, dates, and who you spoke with.
          </p>
        )}

        <div className="mt-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Add a note (e.g. 'Called billing on 5/2, spoke with…')"
            className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            onClick={addNote}
            disabled={saving || draft.trim().length === 0}
            className="mt-2 inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Add note"}
          </button>
        </div>
      </div>

      {err ? <p className="text-sm text-danger">{err}</p> : null}
    </div>
  );
}

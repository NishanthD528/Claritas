"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Delete a saved bill (and its charges/flags/rights/notes via cascade). Two
// clicks: the first arms a confirm state, the second deletes — no modal needed.
export function DeleteBillButton({
  billId,
  redirectTo,
  className = "",
}: {
  billId: string;
  // If set, navigate here after deleting (e.g. back to the list from a bill
  // page). Otherwise just refresh the current route.
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);

  async function del() {
    setBusy(true);
    setErr(false);
    try {
      const res = await fetch(`/api/bills/${billId}`, { method: "DELETE" });
      if (!res.ok) {
        setErr(true);
        setConfirming(false);
        return;
      }
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  }

  if (confirming) {
    return (
      <span className={`inline-flex items-center gap-2 ${className}`}>
        <button
          onClick={del}
          disabled={busy}
          className="rounded-md bg-danger px-2.5 py-1 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Deleting…" : "Confirm delete"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="text-xs text-slate-500 hover:text-ink"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className={`text-xs font-medium text-slate-400 transition hover:text-danger ${className}`}
      title="Delete this bill"
    >
      {err ? "Try again" : "Delete"}
    </button>
  );
}

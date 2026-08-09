"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ResultsView } from "@/components/results/ResultsView";
import type { BillView } from "@/lib/view";

type Analysis = {
  provider_name: string | null;
  facility_type: string;
  service_date_start: string | null;
  service_date_end: string | null;
  stated_total: number | null;
  computed_total: number;
  flag_count: number;
  charges: BillView["charges"];
  flags: BillView["flags"];
  rights: BillView["rights"];
};

function analysisToBillView(a: Analysis): BillView {
  return {
    id: null,
    provider_name: a.provider_name,
    facility_type: a.facility_type,
    service_date_start: a.service_date_start,
    service_date_end: a.service_date_end,
    stated_total: a.stated_total,
    computed_total: a.computed_total,
    flag_count: a.flag_count,
    status: "analyzed",
    charges: a.charges,
    flags: a.flags,
    rights: a.rights,
  };
}

const LOADING_STEPS = [
  "Reading your bill…",
  "Removing personal details…",
  "Extracting every charge…",
  "Checking the math and looking for inconsistencies…",
  "Matching your rights and programs…",
];

export default function AnalyzePage() {
  const router = useRouter();
  const [tab, setTab] = useState<"upload" | "paste">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BillView | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cycle the loading label so it names the stage roughly in progress.
  useEffect(() => {
    if (!loading) return;
    setStepIdx(0);
    const id = setInterval(() => {
      setStepIdx((i) => Math.min(i + 1, LOADING_STEPS.length - 1));
    }, 2500);
    return () => clearInterval(id);
  }, [loading]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }, []);

  async function submit() {
    setError(null);
    setResult(null);
    const hasFile = tab === "upload" && file;
    const hasText = tab === "paste" && text.trim().length > 0;
    if (!hasFile && !hasText) {
      setError("Add a file or paste your bill text first.");
      return;
    }

    setLoading(true);
    try {
      const body = new FormData();
      if (hasFile) body.append("file", file as File);
      if (hasText) body.append("text", text);

      const res = await fetch("/api/analyze", { method: "POST", body });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        return;
      }

      if (data.saved && data.billId) {
        router.push(`/bills/${data.billId}`);
        return;
      }
      setResult(analysisToBillView(data.analysis));
    } catch {
      setError("Could not reach the analysis service. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div>
        <div className="mb-6 rounded-lg border border-accent/30 bg-accent-soft/40 p-4 text-sm">
          <span className="font-medium text-ink">
            This analysis isn&rsquo;t saved.
          </span>{" "}
          <Link href="/auth" className="font-medium text-accent hover:underline">
            Create a free account
          </Link>{" "}
          to keep it and track your dispute.
        </div>
        <ResultsView bill={result} />
        <div className="mt-10 border-t border-slate-200 pt-6 text-sm">
          <button
            onClick={() => {
              setResult(null);
              setFile(null);
              setText("");
            }}
            className="text-accent hover:underline"
          >
            ← Check another bill
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Check a bill</h1>
      <p className="mt-2 text-slate-600">
        Upload a PDF or photo of an itemized bill, or paste the text.
        You&rsquo;ll see every charge explained, the math checked, and what you
        can do next.
      </p>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Your personal details (name, address, ID numbers, and similar) are
        removed automatically before anything is analyzed. You can also black
        out anything you prefer to omit before uploading.
      </div>

      <div className="mt-6 flex gap-2 border-b border-slate-200">
        <TabButton active={tab === "upload"} onClick={() => setTab("upload")}>
          Upload a file
        </TabButton>
        <TabButton active={tab === "paste"} onClick={() => setTab("paste")}>
          Paste text
        </TabButton>
      </div>

      {tab === "upload" ? (
        <div className="mt-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition ${
              dragging
                ? "border-accent bg-accent-soft/30"
                : "border-slate-300 hover:border-accent"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <p className="text-sm font-medium text-ink">{file.name}</p>
            ) : (
              <>
                <p className="text-sm font-medium text-ink">
                  Drag a PDF or photo here, or click to choose
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  PDF or image, up to 4.5&nbsp;MB
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="Paste the text of your bill here…"
            className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      )}

      {error ? (
        <p className="mt-4 rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        onClick={submit}
        disabled={loading}
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? LOADING_STEPS[stepIdx] : "Analyze this bill"}
      </button>

      {loading ? (
        <p className="mt-3 text-xs text-slate-500">
          This can take up to a minute for photos. Please keep this tab open.
        </p>
      ) : null}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
        active
          ? "border-accent text-accent"
          : "border-transparent text-slate-500 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

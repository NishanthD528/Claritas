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

// A realistic synthetic bill so visitors can see a full analysis in one click.
const SAMPLE_BILL = `Riverside General Hospital
Patient Name: Jordan Smith
Account #: 88231-04
Date of Service: 06/14/2025

99284  Emergency department visit, high complexity   1   $1,250.00
99284  Emergency department visit, high complexity   1   $1,250.00
80053  Comprehensive metabolic panel                 1   $180.00
85025  Complete blood count                          1   $95.00
71046  Chest X-ray, 2 views                          1   $320.00
J1885  Ketorolac injection                           6   $90.00
Miscellaneous supplies                               1   $475.00
Anesthesiology services                              1   $600.00

Stated Total: $4,000.00`;

export default function AnalyzePage() {
  const router = useRouter();
  const [tab, setTab] = useState<"upload" | "paste">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0); // seconds left after a 429
  const [result, setResult] = useState<BillView | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Count the rate-limit cooldown down to zero.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => {
      setCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown]);

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
    // Guard against fast double-clicks burning two Gemini calls on one bill,
    // and against submitting during the rate-limit cooldown.
    if (loading || cooldown > 0) return;
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

      // The server always answers with JSON on success or a handled error.
      // If parsing fails, the response was a crash/timeout page — treat it as
      // such rather than a generic network error.
      let data: {
        error?: string;
        saved?: boolean;
        billId?: string | null;
        analysis?: Analysis;
      } | null = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (res.status === 429) {
        setCooldown(60);
        return;
      }

      if (!res.ok || !data) {
        setError(
          data?.error ??
            "The analysis took too long or the file couldn't be processed. " +
              "Try a clearer photo or paste the bill text instead."
        );
        return;
      }

      if (data.saved && data.billId) {
        router.push(`/bills/${data.billId}`);
        return;
      }
      if (data.analysis) {
        setResult(analysisToBillView(data.analysis));
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch {
      setError(
        "Couldn't reach the analysis service. Check your connection and try again."
      );
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

      <div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Your personal details (name, address, ID numbers, and similar) are
          removed automatically before anything is analyzed.
        </span>
        <button
          type="button"
          onClick={() => {
            setTab("paste");
            setText(SAMPLE_BILL);
            setError(null);
          }}
          className="inline-flex flex-none items-center gap-1 self-start rounded-lg border border-accent/40 bg-white px-3 py-1.5 text-sm font-medium text-accent transition hover:bg-accent-soft/40 active:scale-[0.98] sm:self-auto"
        >
          Try a sample bill →
        </button>
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

      {cooldown > 0 ? (
        <div className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">
            Claritas is getting a lot of requests right now.
          </p>
          <p className="mt-0.5">
            Wait about a minute and try again — you can retry in{" "}
            <span className="font-semibold tabular-nums">{cooldown}s</span>.
          </p>
        </div>
      ) : error ? (
        <p className="mt-4 rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        onClick={submit}
        disabled={loading || cooldown > 0}
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? LOADING_STEPS[stepIdx]
          : cooldown > 0
          ? `Try again in ${cooldown}s`
          : "Analyze this bill"}
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

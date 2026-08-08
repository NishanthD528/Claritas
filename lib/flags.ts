// lib/flags.ts
//
// Deterministic, rule-based flagging. This is plain TypeScript run on the
// bill's OWN contents — never model output. It states no fair price, no
// benchmark, and no legal conclusion. Every flag is phrased as a QUESTION the
// patient can ask their billing department, never an accusation.
//
// Order of intent: the math checks run first because a total that doesn't add
// up is the single most winnable dispute.

import type { BillExtraction, ChargeExtraction } from "@/lib/types";
import { computeTotal } from "@/lib/types";
import { BUNDLES } from "@/lib/bundles";

export type Severity = "low" | "medium" | "high";

export type FlagType =
  | "math_error"
  | "line_math_error"
  | "duplicate"
  | "near_duplicate"
  | "unit_anomaly"
  | "date_outside_range"
  | "unbundling"
  | "vague_line";

export interface Flag {
  // Which line this is about, by line_number. null for bill-level flags
  // (e.g. the overall math check). The route maps this to a charge_id.
  charge_line_number: number | null;
  flag_type: FlagType;
  severity: Severity;
  explanation: string;
  suggested_question: string;
}

export interface FlagConfig {
  // vague_line only fires above this dollar amount — a patient has a right to
  // know what a large, unlabeled charge was for.
  vagueLineMinAmount: number;
  // unit_anomaly fires when units exceed this on any line.
  unitAnomalyMax: number;
  // tolerance for money comparisons, in dollars.
  centTolerance: number;
}

export const DEFAULT_FLAG_CONFIG: FlagConfig = {
  vagueLineMinAmount: 100,
  unitAnomalyMax: 10,
  centTolerance: 0.01,
};

const SEVERITY_RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

// Descriptions that imply a single, non-repeatable event. More than one unit
// of these is worth a question.
const SINGLE_EVENT_KEYWORDS = [
  "consult",
  "consultation",
  "admission",
  "admit",
  "room and board",
  "room charge",
  "daily room",
  "initial hospital",
  "initial visit",
  "new patient visit",
  "emergency department visit",
  "er visit",
];

// Non-specific descriptions that tell the patient nothing.
const VAGUE_KEYWORDS = [
  "miscellaneous",
  "misc",
  "supplies",
  "other",
  "pharmacy",
  "general",
  "sundry",
  "floor stock",
  "self-administered",
  "unspecified",
];

function fmt(n: number): string {
  return (
    "$" +
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function norm(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function label(c: ChargeExtraction): string {
  const desc = c.description_raw?.trim() || c.description_plain?.trim() || "this item";
  return `line ${c.line_number} (${desc})`;
}

// ---------------------------------------------------------------------------
// Individual checks. Each returns zero or more flags.
// ---------------------------------------------------------------------------

// 1) Bill-level math: line items vs. the printed total.
function checkBillMath(bill: BillExtraction, cfg: FlagConfig): Flag[] {
  const computed = computeTotal(bill.charges);
  if (bill.stated_total === null) return [];
  const diff = Math.abs(bill.stated_total - computed);
  if (diff <= cfg.centTolerance) return [];
  return [
    {
      charge_line_number: null,
      flag_type: "math_error",
      severity: "high",
      explanation:
        `The individual charges add up to ${fmt(computed)}, but the total ` +
        `printed on the bill is ${fmt(bill.stated_total)} — a difference of ` +
        `${fmt(diff)}.`,
      suggested_question:
        `Your itemized charges add up to ${fmt(computed)}, but the stated ` +
        `total is ${fmt(bill.stated_total)}. Can you explain the ` +
        `${fmt(diff)} difference and send a corrected statement?`,
    },
  ];
}

// 2) Per-line math: unit_price * units vs. amount_charged.
function checkLineMath(bill: BillExtraction, cfg: FlagConfig): Flag[] {
  const flags: Flag[] = [];
  for (const c of bill.charges) {
    if (c.unit_price === null || c.amount_charged === null) continue;
    const expected = Math.round(c.unit_price * c.units * 100) / 100;
    if (Math.abs(expected - c.amount_charged) > cfg.centTolerance) {
      flags.push({
        charge_line_number: c.line_number,
        flag_type: "line_math_error",
        severity: "high",
        explanation:
          `This line shows ${c.units} unit(s) at ${fmt(c.unit_price)} each, ` +
          `which comes to ${fmt(expected)}, but the amount charged is ` +
          `${fmt(c.amount_charged)}.`,
        suggested_question:
          `On ${label(c)}, ${c.units} unit(s) at ${fmt(c.unit_price)} each ` +
          `should be ${fmt(expected)}, but I was charged ` +
          `${fmt(c.amount_charged)}. Can you explain the difference?`,
      });
    }
  }
  return flags;
}

// Group charges by a key, skipping charges for which keyFor returns null.
function groupBy(
  charges: ChargeExtraction[],
  keyFor: (c: ChargeExtraction) => string | null
): ChargeExtraction[][] {
  const groups = new Map<string, ChargeExtraction[]>();
  for (const c of charges) {
    const key = keyFor(c);
    if (key === null) continue;
    const existing = groups.get(key);
    if (existing) existing.push(c);
    else groups.set(key, [c]);
  }
  return Array.from(groups.values());
}

// 3) Exact duplicates: same code AND same service date, more than once.
function checkDuplicates(bill: BillExtraction): Flag[] {
  const groups = groupBy(bill.charges, (c) =>
    c.code && c.service_date ? norm(c.code) + "|" + c.service_date : null
  );
  const flags: Flag[] = [];
  for (const group of groups) {
    if (group.length < 2) continue;
    const first = group[0];
    const lines = group.map((c) => c.line_number).join(", ");
    flags.push({
      charge_line_number: first.line_number,
      flag_type: "duplicate",
      severity: "high",
      explanation:
        `Code ${first.code} on ${first.service_date} appears ${group.length} ` +
        `times (lines ${lines}). This may be a duplicate charge.`,
      suggested_question:
        `Code ${first.code} appears ${group.length} times for ` +
        `${first.service_date} (lines ${lines}). Were these separate services, ` +
        `or is this a duplicate that should be removed?`,
    });
  }
  return flags;
}

// 4) Near-duplicates: same description AND date, but codes differ or missing.
function checkNearDuplicates(bill: BillExtraction): Flag[] {
  const groups = groupBy(bill.charges, (c) => {
    const d = norm(c.description_raw);
    return d && c.service_date ? d + "|" + c.service_date : null;
  });
  const flags: Flag[] = [];
  for (const group of groups) {
    if (group.length < 2) continue;
    // Skip if this is already an exact code+date duplicate (all same code).
    const codes = new Set(group.map((c) => norm(c.code)));
    if (codes.size === 1 && !codes.has("")) continue;
    const first = group[0];
    const lines = group.map((c) => c.line_number).join(", ");
    flags.push({
      charge_line_number: first.line_number,
      flag_type: "near_duplicate",
      severity: "medium",
      explanation:
        `The same description ("${first.description_raw}") on ` +
        `${first.service_date} appears on lines ${lines} with different or ` +
        `missing codes. This may be a duplicate.`,
      suggested_question:
        `Lines ${lines} all describe "${first.description_raw}" on ` +
        `${first.service_date}. Were these distinct services, or is one a ` +
        `duplicate?`,
    });
  }
  return flags;
}

// 5) Unit anomalies: very high units, or >1 unit on a single-event line.
function checkUnitAnomalies(bill: BillExtraction, cfg: FlagConfig): Flag[] {
  const flags: Flag[] = [];
  for (const c of bill.charges) {
    const desc = norm(c.description_raw);
    const singleEvent = SINGLE_EVENT_KEYWORDS.some((k) => desc.includes(k));
    if (c.units > cfg.unitAnomalyMax) {
      flags.push({
        charge_line_number: c.line_number,
        flag_type: "unit_anomaly",
        severity: "medium",
        explanation:
          `This line is billed with ${c.units} units, an unusually high ` +
          `count.`,
        suggested_question:
          `On ${label(c)}, the bill shows ${c.units} units. Can you confirm ` +
          `that quantity is correct and explain what each unit represents?`,
      });
    } else if (singleEvent && c.units > 1) {
      flags.push({
        charge_line_number: c.line_number,
        flag_type: "unit_anomaly",
        severity: "medium",
        explanation:
          `This line describes a single event but is billed with ${c.units} ` +
          `units.`,
        suggested_question:
          `On ${label(c)}, this is normally a single event but shows ` +
          `${c.units} units. Can you explain why more than one was billed?`,
      });
    }
  }
  return flags;
}

// 6) Service date outside the bill's stated window.
function checkDateRange(bill: BillExtraction): Flag[] {
  const start = bill.service_date_start;
  const end = bill.service_date_end;
  if (!start && !end) return [];
  const flags: Flag[] = [];
  for (const c of bill.charges) {
    if (!c.service_date) continue;
    const before = start && c.service_date < start;
    const after = end && c.service_date > end;
    if (before || after) {
      const window =
        start && end ? `${start} to ${end}` : start ? `on or after ${start}` : `on or before ${end}`;
      flags.push({
        charge_line_number: c.line_number,
        flag_type: "date_outside_range",
        severity: "medium",
        explanation:
          `This line's service date (${c.service_date}) falls outside the ` +
          `bill's stated service window (${window}).`,
        suggested_question:
          `On ${label(c)}, the service date ${c.service_date} is outside this ` +
          `bill's service window (${window}). Does this charge belong on this ` +
          `bill?`,
      });
    }
  }
  return flags;
}

// 7) Possible unbundling: multiple components of a known panel billed apart.
function checkUnbundling(bill: BillExtraction): Flag[] {
  const flags: Flag[] = [];
  const descs = bill.charges.map((c) => ({ c, d: norm(c.description_raw) }));
  for (const bundle of BUNDLES) {
    const matched: { line: number; component: string }[] = [];
    const seen = new Set<string>();
    for (const comp of bundle.components) {
      const hit = descs.find(({ d }) => d.includes(comp));
      if (hit && !seen.has(comp)) {
        seen.add(comp);
        matched.push({ line: hit.c.line_number, component: comp });
      }
    }
    if (matched.length >= 2) {
      const lines = matched.map((m) => m.line).join(", ");
      const first = bill.charges.find((c) => c.line_number === matched[0].line)!;
      flags.push({
        charge_line_number: first.line_number,
        flag_type: "unbundling",
        severity: "medium",
        explanation:
          `Lines ${lines} appear to be individual components that are often ` +
          `billed together as a single "${bundle.name}". Billing them ` +
          `separately can cost more.`,
        suggested_question:
          `Lines ${lines} look like parts of a ${bundle.name}. Should these ` +
          `have been billed together as one comprehensive service rather than ` +
          `separately?`,
      });
    }
  }
  return flags;
}

// 8) Vague, unlabeled charges above a threshold.
function checkVagueLines(bill: BillExtraction, cfg: FlagConfig): Flag[] {
  const flags: Flag[] = [];
  for (const c of bill.charges) {
    const desc = norm(c.description_raw);
    if (!desc) continue;
    const amount = c.amount_charged ?? 0;
    if (amount < cfg.vagueLineMinAmount) continue;
    // "Vague" means a short description that is essentially just a filler word.
    const wordCount = desc.split(" ").length;
    const isVague = VAGUE_KEYWORDS.some((k) => desc.includes(k)) && wordCount <= 3;
    if (isVague) {
      flags.push({
        charge_line_number: c.line_number,
        flag_type: "vague_line",
        severity: "low",
        explanation:
          `This ${fmt(amount)} charge is described only as ` +
          `"${c.description_raw}", with no detail about what it covers.`,
        suggested_question:
          `On ${label(c)}, can you provide an itemized breakdown of what this ` +
          `${fmt(amount)} charge covers?`,
      });
    }
  }
  return flags;
}

// ---------------------------------------------------------------------------
// Public entry point.
// ---------------------------------------------------------------------------

/**
 * Run every deterministic check over a bill and return the flags, ordered by
 * severity (high first), with the bill-level math error always first.
 */
export function runFlags(
  bill: BillExtraction,
  config: FlagConfig = DEFAULT_FLAG_CONFIG
): Flag[] {
  const flags = [
    ...checkBillMath(bill, config),
    ...checkLineMath(bill, config),
    ...checkDuplicates(bill),
    ...checkNearDuplicates(bill),
    ...checkUnitAnomalies(bill, config),
    ...checkDateRange(bill),
    ...checkUnbundling(bill),
    ...checkVagueLines(bill, config),
  ];

  // Stable sort: math_error first, then by severity, preserving check order.
  return flags
    .map((f, i) => ({ f, i }))
    .sort((a, b) => {
      if (a.f.flag_type === "math_error" && b.f.flag_type !== "math_error") return -1;
      if (b.f.flag_type === "math_error" && a.f.flag_type !== "math_error") return 1;
      const s = SEVERITY_RANK[a.f.severity] - SEVERITY_RANK[b.f.severity];
      return s !== 0 ? s : a.i - b.i;
    })
    .map(({ f }) => f);
}

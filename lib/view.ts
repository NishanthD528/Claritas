// lib/view.ts
//
// A single view model the results UI renders, plus a builder that normalizes
// database rows into it. The API's in-session analysis (signed-out) and the
// persisted bill (signed-in) both collapse to BillView so one set of
// presentational components serves both paths.

import type { CodeType, FacilityType } from "@/lib/types";
import type { FlagType, Severity } from "@/lib/flags";
import type { RightKey } from "@/lib/rights";

export interface ChargeView {
  line_number: number;
  code: string | null;
  code_type: CodeType;
  description_raw: string;
  description_plain: string;
  service_date: string | null;
  units: number;
  unit_price: number | null;
  amount_charged: number | null;
}

export interface FlagView {
  charge_line_number: number | null;
  flag_type: FlagType | string;
  severity: Severity;
  explanation: string;
  suggested_question: string;
}

export interface RightView {
  right_key: RightKey | string;
  relevance: string;
}

export interface BillView {
  id: string | null;
  provider_name: string | null;
  facility_type: FacilityType | string;
  service_date_start: string | null;
  service_date_end: string | null;
  stated_total: number | null;
  computed_total: number;
  flag_count: number;
  status: string;
  charges: ChargeView[];
  flags: FlagView[];
  rights: RightView[];
}

// Minimal shapes for the DB rows we read on the results page.
interface BillRow {
  id: string;
  provider_name: string | null;
  facility_type: string | null;
  service_date_start: string | null;
  service_date_end: string | null;
  stated_total: number | null;
  computed_total: number | null;
  flag_count: number | null;
  status: string | null;
}
interface ChargeRow {
  id: string;
  line_number: number | null;
  code?: string | null;
  code_type?: string | null;
  description_raw?: string | null;
  description_plain?: string | null;
  service_date?: string | null;
  units?: number | null;
  unit_price?: number | null;
  amount_charged?: number | null;
}
interface FlagRow {
  charge_id: string | null;
  flag_type: string;
  severity: string;
  explanation: string;
  suggested_question: string;
}
interface RightRow {
  right_key: string;
  relevance: string;
}

/**
 * Build a BillView from persisted rows. Flags are stored with a charge_id
 * (a uuid); we map that back to the charge's line_number so the UI can mark
 * the right row and group flags the same way as the in-session path.
 */
export function billViewFromRows(
  bill: BillRow,
  charges: ChargeRow[],
  flags: FlagRow[],
  rights: RightRow[]
): BillView {
  const lineByChargeId = new Map<string, number>();
  for (const c of charges) {
    if (c.line_number !== null) lineByChargeId.set(c.id, c.line_number);
  }

  const chargeViews: ChargeView[] = charges
    .map((c) => ({
      line_number: c.line_number ?? 0,
      code: c.code ?? null,
      code_type: (c.code_type ?? "none") as CodeType,
      description_raw: c.description_raw ?? "",
      description_plain: c.description_plain ?? "",
      service_date: c.service_date ?? null,
      units: c.units ?? 1,
      unit_price: c.unit_price ?? null,
      amount_charged: c.amount_charged ?? null,
    }))
    .sort((a, b) => a.line_number - b.line_number);

  const flagViews: FlagView[] = flags.map((f) => ({
    charge_line_number:
      f.charge_id !== null ? lineByChargeId.get(f.charge_id) ?? null : null,
    flag_type: f.flag_type,
    severity: (f.severity as Severity) ?? "medium",
    explanation: f.explanation,
    suggested_question: f.suggested_question,
  }));

  return {
    id: bill.id,
    provider_name: bill.provider_name,
    facility_type: bill.facility_type ?? "other",
    service_date_start: bill.service_date_start,
    service_date_end: bill.service_date_end,
    stated_total: bill.stated_total,
    computed_total: bill.computed_total ?? 0,
    flag_count: bill.flag_count ?? flags.length,
    status: bill.status ?? "analyzed",
    charges: chargeViews,
    flags: flagViews,
    rights: rights.map((r) => ({ right_key: r.right_key, relevance: r.relevance })),
  };
}

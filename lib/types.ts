// lib/types.ts
//
// Shared types for the extraction pipeline plus a defensive validator/
// normalizer. Gemini is asked for JSON matching a response schema, but we
// never trust model output blindly: validateExtraction() coerces types,
// drops garbage, and guarantees the shape the rest of the app relies on.

export type CodeType = "cpt" | "hcpcs" | "revenue" | "none";
export type FacilityType = "hospital" | "clinic" | "lab" | "imaging" | "other";

export interface ChargeExtraction {
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

export interface BillExtraction {
  provider_name: string | null;
  facility_type: FacilityType;
  service_date_start: string | null;
  service_date_end: string | null;
  stated_total: number | null;
  charges: ChargeExtraction[];
}

const CODE_TYPES: CodeType[] = ["cpt", "hcpcs", "revenue", "none"];
const FACILITY_TYPES: FacilityType[] = [
  "hospital",
  "clinic",
  "lab",
  "imaging",
  "other",
];

// Coerce a value to a finite number, or null. Strips currency symbols and
// thousands separators if the model returned a string despite the schema.
function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const cleaned = v.replace(/[$,\s]/g, "");
    if (cleaned === "") return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toStringOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" || s.toLowerCase() === "null" ? null : s;
}

// Accept only real ISO-ish dates (YYYY-MM-DD). Anything else becomes null so
// downstream date math never chokes on free text.
function toIsoDateOrNull(v: unknown): string | null {
  const s = toStringOrNull(v);
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[1] + "-" + m[2] + "-" + m[3] : null;
}

function toCodeType(v: unknown): CodeType {
  const s = toStringOrNull(v)?.toLowerCase();
  return CODE_TYPES.includes(s as CodeType) ? (s as CodeType) : "none";
}

function toFacilityType(v: unknown): FacilityType {
  const s = toStringOrNull(v)?.toLowerCase();
  return FACILITY_TYPES.includes(s as FacilityType)
    ? (s as FacilityType)
    : "other";
}

/**
 * Validate and normalize raw parsed JSON from Gemini into a BillExtraction.
 * Throws only when the payload is structurally unusable (not an object, or
 * missing a charges array). Individual bad fields are coerced, not fatal.
 */
export function validateExtraction(raw: unknown): BillExtraction {
  if (raw === null || typeof raw !== "object") {
    throw new Error("Extraction result is not an object.");
  }
  const obj = raw as Record<string, unknown>;

  if (!Array.isArray(obj.charges)) {
    throw new Error("Extraction result is missing a charges array.");
  }

  const charges: ChargeExtraction[] = obj.charges.map((rawCharge, i) => {
    const c = (rawCharge ?? {}) as Record<string, unknown>;
    const unitsNum = toNumberOrNull(c.units);
    const units =
      unitsNum === null || unitsNum < 1 ? 1 : Math.round(unitsNum);
    const lineNum = toNumberOrNull(c.line_number);
    return {
      line_number: lineNum === null ? i + 1 : Math.round(lineNum),
      code: toStringOrNull(c.code),
      code_type: toCodeType(c.code_type),
      description_raw: toStringOrNull(c.description_raw) ?? "",
      description_plain: toStringOrNull(c.description_plain) ?? "",
      service_date: toIsoDateOrNull(c.service_date),
      units,
      unit_price: toNumberOrNull(c.unit_price),
      amount_charged: toNumberOrNull(c.amount_charged),
    };
  });

  return {
    provider_name: toStringOrNull(obj.provider_name),
    facility_type: toFacilityType(obj.facility_type),
    service_date_start: toIsoDateOrNull(obj.service_date_start),
    service_date_end: toIsoDateOrNull(obj.service_date_end),
    stated_total: toNumberOrNull(obj.stated_total),
    charges,
  };
}

// Sum of line-item amounts, rounded to cents. Used for the math-check banner.
export function computeTotal(charges: ChargeExtraction[]): number {
  const sum = charges.reduce((acc, c) => acc + (c.amount_charged ?? 0), 0);
  return Math.round(sum * 100) / 100;
}

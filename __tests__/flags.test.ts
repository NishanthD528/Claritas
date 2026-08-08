// __tests__/flags.test.ts
//
// Deterministic flagging tests. All fixtures are synthetic.

import { runFlags, DEFAULT_FLAG_CONFIG } from "@/lib/flags";
import type { BillExtraction, ChargeExtraction } from "@/lib/types";

function charge(p: Partial<ChargeExtraction>): ChargeExtraction {
  return {
    line_number: 1,
    code: null,
    code_type: "none",
    description_raw: "",
    description_plain: "",
    service_date: null,
    units: 1,
    unit_price: null,
    amount_charged: null,
    ...p,
  };
}

function bill(p: Partial<BillExtraction>): BillExtraction {
  return {
    provider_name: "Test Hospital",
    facility_type: "hospital",
    service_date_start: null,
    service_date_end: null,
    stated_total: null,
    charges: [],
    ...p,
  };
}

const has = (flags: { flag_type: string }[], t: string) =>
  flags.some((f) => f.flag_type === t);

describe("runFlags deterministic checks", () => {
  test("math_error: line items do not match stated total", () => {
    const b = bill({
      stated_total: 500,
      charges: [
        charge({ line_number: 1, amount_charged: 150 }),
        charge({ line_number: 2, amount_charged: 200 }),
      ],
    });
    const flags = runFlags(b);
    expect(has(flags, "math_error")).toBe(true);
    // math_error is always first.
    expect(flags[0].flag_type).toBe("math_error");
    expect(flags[0].charge_line_number).toBeNull();
  });

  test("no math_error when totals match within a cent", () => {
    const b = bill({
      stated_total: 350,
      charges: [
        charge({ line_number: 1, amount_charged: 150 }),
        charge({ line_number: 2, amount_charged: 200 }),
      ],
    });
    expect(has(runFlags(b), "math_error")).toBe(false);
  });

  test("line_math_error: units * unit_price != amount_charged", () => {
    const b = bill({
      charges: [charge({ line_number: 1, units: 2, unit_price: 50, amount_charged: 150 })],
    });
    expect(has(runFlags(b), "line_math_error")).toBe(true);
  });

  test("duplicate: same code and date more than once", () => {
    const b = bill({
      charges: [
        charge({ line_number: 1, code: "99213", service_date: "2025-04-12", amount_charged: 100 }),
        charge({ line_number: 2, code: "99213", service_date: "2025-04-12", amount_charged: 100 }),
      ],
    });
    expect(has(runFlags(b), "duplicate")).toBe(true);
  });

  test("near_duplicate: same description and date, different/missing codes", () => {
    const b = bill({
      charges: [
        charge({ line_number: 1, code: "A100", description_raw: "Wound care", service_date: "2025-04-12", amount_charged: 80 }),
        charge({ line_number: 2, code: null, description_raw: "Wound care", service_date: "2025-04-12", amount_charged: 80 }),
      ],
    });
    const flags = runFlags(b);
    expect(has(flags, "near_duplicate")).toBe(true);
    expect(has(flags, "duplicate")).toBe(false);
  });

  test("unit_anomaly: very high units", () => {
    const b = bill({
      charges: [charge({ line_number: 1, description_raw: "Gauze pad", units: 25, unit_price: 2, amount_charged: 50 })],
    });
    expect(has(runFlags(b), "unit_anomaly")).toBe(true);
  });

  test("unit_anomaly: >1 unit on a single-event line (consult)", () => {
    const b = bill({
      charges: [charge({ line_number: 1, description_raw: "Cardiology consultation", units: 2, unit_price: 300, amount_charged: 600 })],
    });
    expect(has(runFlags(b), "unit_anomaly")).toBe(true);
  });

  test("date_outside_range: line date outside stated window", () => {
    const b = bill({
      service_date_start: "2025-04-01",
      service_date_end: "2025-04-30",
      charges: [charge({ line_number: 1, service_date: "2025-05-15", amount_charged: 100 })],
    });
    expect(has(runFlags(b), "date_outside_range")).toBe(true);
  });

  test("unbundling: two components of a known panel billed separately", () => {
    const b = bill({
      charges: [
        charge({ line_number: 1, description_raw: "Sodium blood test", amount_charged: 20 }),
        charge({ line_number: 2, description_raw: "Potassium blood test", amount_charged: 20 }),
        charge({ line_number: 3, description_raw: "Chloride blood test", amount_charged: 20 }),
      ],
    });
    expect(has(runFlags(b), "unbundling")).toBe(true);
  });

  test("vague_line: non-specific description above threshold", () => {
    const b = bill({
      charges: [charge({ line_number: 1, description_raw: "Miscellaneous", amount_charged: 450 })],
    });
    expect(has(runFlags(b), "vague_line")).toBe(true);
  });

  test("vague_line: does NOT fire below threshold", () => {
    const b = bill({
      charges: [charge({ line_number: 1, description_raw: "Supplies", amount_charged: 12 })],
    });
    expect(has(runFlags(b), "vague_line")).toBe(false);
  });

  test("clean bill produces no flags", () => {
    const b = bill({
      service_date_start: "2025-04-12",
      service_date_end: "2025-04-12",
      stated_total: 350,
      charges: [
        charge({ line_number: 1, code: "99213", code_type: "cpt", description_raw: "Office visit", service_date: "2025-04-12", units: 1, unit_price: 150, amount_charged: 150 }),
        charge({ line_number: 2, code: "85025", code_type: "cpt", description_raw: "Complete blood count", service_date: "2025-04-12", units: 1, unit_price: 200, amount_charged: 200 }),
      ],
    });
    expect(runFlags(b)).toHaveLength(0);
  });

  test("flags are ordered by severity (high before low)", () => {
    const b = bill({
      stated_total: 999,
      charges: [
        charge({ line_number: 1, code: "99213", service_date: "2025-04-12", units: 2, unit_price: 50, amount_charged: 150 }),
        charge({ line_number: 2, description_raw: "Pharmacy", amount_charged: 500 }),
      ],
    });
    const flags = runFlags(b, DEFAULT_FLAG_CONFIG);
    const firstLow = flags.findIndex((f) => f.severity === "low");
    const lastHigh = flags.map((f) => f.severity).lastIndexOf("high");
    if (firstLow !== -1 && lastHigh !== -1) {
      expect(lastHigh).toBeLessThan(firstLow);
    }
  });

  test("every flag is phrased as a question", () => {
    const b = bill({
      stated_total: 500,
      charges: [charge({ line_number: 1, amount_charged: 150 })],
    });
    for (const f of runFlags(b)) {
      expect(f.suggested_question.trim().endsWith("?")).toBe(true);
    }
  });
});

// __tests__/rights.test.ts
//
// Rights matcher tests. All fixtures are synthetic.

import { matchRights, RIGHTS, getRight } from "@/lib/rights";
import type { ChargeExtraction, FacilityType } from "@/lib/types";

function charge(p: Partial<ChargeExtraction>): ChargeExtraction {
  return {
    line_number: 1,
    code: "99213",
    code_type: "cpt",
    description_raw: "Office visit",
    description_plain: "",
    service_date: "2025-04-12",
    units: 1,
    unit_price: 100,
    amount_charged: 100,
    ...p,
  };
}

function input(p: {
  facility_type?: FacilityType;
  charges?: ChargeExtraction[];
  computed_total?: number;
  stated_total?: number | null;
  status?: string;
}) {
  return {
    facility_type: p.facility_type ?? "clinic",
    charges: p.charges ?? [charge({})],
    computed_total: p.computed_total ?? 100,
    stated_total: p.stated_total ?? null,
    status: p.status,
  };
}

const keys = (arr: { right_key: string }[]) => arr.map((r) => r.right_key);

describe("matchRights", () => {
  test("insurance_eob_check always applies", () => {
    const r = matchRights(input({}));
    expect(keys(r)).toContain("insurance_eob_check");
  });

  test("financial_assistance and payment_plan for a large hospital bill", () => {
    const r = matchRights(
      input({
        facility_type: "hospital",
        computed_total: 3400,
        charges: [
          charge({ line_number: 1, amount_charged: 1700 }),
          charge({ line_number: 2, amount_charged: 900 }),
          charge({ line_number: 3, amount_charged: 800 }),
        ],
      })
    );
    expect(keys(r)).toContain("financial_assistance");
    expect(keys(r)).toContain("payment_plan");
  });

  test("financial_assistance does NOT apply to a clinic", () => {
    const r = matchRights(input({ facility_type: "clinic", computed_total: 3400 }));
    expect(keys(r)).not.toContain("financial_assistance");
  });

  test("payment_plan does NOT apply below the threshold", () => {
    const r = matchRights(input({ computed_total: 40, stated_total: 40 }));
    expect(keys(r)).not.toContain("payment_plan");
  });

  test("surprise_billing when a hospital bill has anesthesia", () => {
    const r = matchRights(
      input({
        facility_type: "hospital",
        charges: [
          charge({ line_number: 1, description_raw: "Surgical procedure" }),
          charge({ line_number: 2, description_raw: "Anesthesiology services" }),
          charge({ line_number: 3, description_raw: "Recovery room" }),
        ],
      })
    );
    expect(keys(r)).toContain("surprise_billing");
  });

  test("surprise_billing does NOT apply without a separate-provider service", () => {
    const r = matchRights(
      input({
        facility_type: "hospital",
        charges: [
          charge({ line_number: 1, description_raw: "Office visit" }),
          charge({ line_number: 2, description_raw: "Blood draw" }),
          charge({ line_number: 3, description_raw: "X-ray of chest" }),
        ],
      })
    );
    expect(keys(r)).not.toContain("surprise_billing");
  });

  test("itemized_bill when the document looks like a summary", () => {
    const r = matchRights(
      input({ charges: [charge({ line_number: 1, description_raw: "Balance due" })] })
    );
    expect(keys(r)).toContain("itemized_bill");
  });

  test("itemized_bill does NOT apply to a fully itemized bill", () => {
    const r = matchRights(
      input({
        charges: [
          charge({ line_number: 1, code: "99213" }),
          charge({ line_number: 2, code: "85025" }),
          charge({ line_number: 3, code: "80053" }),
          charge({ line_number: 4, code: "71046" }),
        ],
      })
    );
    expect(keys(r)).not.toContain("itemized_bill");
  });

  test("collections_pause only once the bill is disputing", () => {
    const analyzed = matchRights(input({ status: "analyzed" }));
    expect(keys(analyzed)).not.toContain("collections_pause");
    const disputing = matchRights(input({ status: "disputing" }));
    expect(keys(disputing)).toContain("collections_pause");
  });

  test("every matched key has a static entry with a verify note", () => {
    const r = matchRights(
      input({ facility_type: "hospital", computed_total: 3400, status: "disputing" })
    );
    for (const m of r) {
      const entry = getRight(m.right_key);
      expect(entry).toBeDefined();
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.action.length).toBeGreaterThan(0);
      expect(entry.verifyNote.toLowerCase()).toContain("verify");
    }
  });

  test("knowledge base has all six seed entries", () => {
    expect(Object.keys(RIGHTS).sort()).toEqual(
      [
        "collections_pause",
        "financial_assistance",
        "insurance_eob_check",
        "itemized_bill",
        "payment_plan",
        "surprise_billing",
      ].sort()
    );
  });
});

// __tests__/letter.test.ts
// All fixtures synthetic.

import { buildLetter } from "@/lib/letter";
import type { BillView } from "@/lib/view";

const FIXED_DATE = new Date(2025, 4, 1); // May 1, 2025, deterministic

function bill(p: Partial<BillView>): BillView {
  return {
    id: "abc",
    provider_name: "Springfield General Hospital",
    facility_type: "hospital",
    service_date_start: "2025-04-12",
    service_date_end: "2025-04-12",
    stated_total: 900,
    computed_total: 760,
    flag_count: 0,
    status: "analyzed",
    charges: [],
    flags: [],
    rights: [],
    ...p,
  };
}

describe("buildLetter", () => {
  const base = bill({
    charges: [
      {
        line_number: 1,
        code: "99213",
        code_type: "cpt",
        description_raw: "Office Visit",
        description_plain: "",
        service_date: "2025-04-12",
        units: 1,
        unit_price: 150,
        amount_charged: 150,
      },
    ],
    flags: [
      {
        charge_line_number: null,
        flag_type: "math_error",
        severity: "high",
        explanation: "…",
        suggested_question:
          "Your itemized charges add up to $760.00 but the stated total is $900.00. Can you explain the difference?",
      },
      {
        charge_line_number: 1,
        flag_type: "duplicate",
        severity: "high",
        explanation: "…",
        suggested_question: "Is line 1 a duplicate that should be removed?",
      },
    ],
    rights: [
      { right_key: "financial_assistance", relevance: "hospital bill" },
    ],
  });

  test("addresses the provider billing department", () => {
    const out = buildLetter(base, { date: FIXED_DATE });
    expect(out).toContain("Billing Department");
    expect(out).toContain("Springfield General Hospital");
  });

  test("includes an account-number placeholder for the user to fill in", () => {
    expect(buildLetter(base, { date: FIXED_DATE })).toMatch(/Account number: _+/);
  });

  test("lists each flagged line with code, description, and amount", () => {
    const out = buildLetter(base, { date: FIXED_DATE });
    expect(out).toContain("Line 1");
    expect(out).toContain("Office Visit");
    expect(out).toContain("code 99213");
    expect(out).toContain("$150.00");
  });

  test("includes the bill-level question and the line-level question", () => {
    const out = buildLetter(base, { date: FIXED_DATE });
    expect(out).toContain("stated total is $900.00");
    expect(out).toContain("duplicate that should be removed");
  });

  test("requests a corrected itemized statement within 30 days", () => {
    const out = buildLetter(base, { date: FIXED_DATE });
    expect(out).toMatch(/fully itemized statement/i);
    expect(out).toMatch(/within 30 days/i);
  });

  test("requests the financial assistance application when matched", () => {
    const out = buildLetter(base, { date: FIXED_DATE });
    expect(out).toMatch(/financial assistance/i);
  });

  test("adds collections-pause request when disputing", () => {
    const disputing = buildLetter(
      bill({ ...base, status: "disputing" }),
      { date: FIXED_DATE }
    );
    expect(disputing).toMatch(/collections activity.*paused/i);
  });

  test("never asserts a fair price", () => {
    const out = buildLetter(base, { date: FIXED_DATE });
    expect(out).toMatch(/not making any claim about what these services should cost/i);
    expect(out).not.toMatch(/fair price|should cost \$|medicare rate/i);
  });

  test("is deterministic for a fixed date", () => {
    expect(buildLetter(base, { date: FIXED_DATE })).toBe(
      buildLetter(base, { date: FIXED_DATE })
    );
  });

  test("handles a clean bill with no flags gracefully", () => {
    const out = buildLetter(bill({}), { date: FIXED_DATE });
    expect(out).toMatch(/fully itemized statement/i);
    expect(out).not.toMatch(/Regarding specific charges/);
  });
});

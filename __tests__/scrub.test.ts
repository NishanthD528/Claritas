// __tests__/scrub.test.ts
//
// All fixtures below are SYNTHETIC. No real bill data is committed anywhere.
// Names, numbers, and addresses are invented for testing only.

import { scrub, REDACTION_TOKENS } from "@/lib/scrub";

describe("scrub() removes every PII identifier type", () => {
  test("1. patient name (label-anchored)", () => {
    const out = scrub("Patient Name: John Q. Public");
    expect(out).toContain(REDACTION_TOKENS.name);
    expect(out).not.toMatch(/John|Public/);
  });

  test("2. guarantor name", () => {
    const out = scrub("Guarantor: Jane A. Doe");
    expect(out).toContain(REDACTION_TOKENS.name);
    expect(out).not.toMatch(/Jane|Doe/);
  });

  test("3. street address and city/state/zip", () => {
    const out = scrub("Address: 4821 Maple Avenue Apt 3B\nSpringfield, IL 62704");
    expect(out).not.toMatch(/Maple|Springfield|62704/);
    expect(out).toContain(REDACTION_TOKENS.address);
  });

  test("4. date of birth (label-anchored, does not touch service dates)", () => {
    const out = scrub("DOB: 03/14/1978");
    expect(out).toContain(REDACTION_TOKENS.dob);
    expect(out).not.toMatch(/1978/);
  });

  test("5. medical record number", () => {
    const out = scrub("MRN: 00847213");
    expect(out).toContain(REDACTION_TOKENS.id);
    expect(out).not.toMatch(/00847213/);
  });

  test("6. account / guarantor / claim numbers", () => {
    const out = scrub(
      "Account Number: AC-99381\nGuarantor No: 55821\nClaim #: CLM7788201"
    );
    expect(out).not.toMatch(/99381|55821|CLM7788201/);
    const idCount = (out.match(/\[REDACTED_ID\]/g) || []).length;
    expect(idCount).toBe(3);
  });

  test("7. insurance member and group IDs", () => {
    const out = scrub("Member ID: XYZ123456789\nGroup Number: GRP-00421");
    expect(out).not.toMatch(/XYZ123456789|GRP-00421/);
    const insCount = (out.match(/\[REDACTED_INSURANCE_ID\]/g) || []).length;
    expect(insCount).toBe(2);
  });

  test("8. phone numbers in several formats", () => {
    const out = scrub(
      "Call (312) 555-0182 or 312-555-0147 or 312.555.0166"
    );
    expect(out).not.toMatch(/555-0182|555-0147|555\.0166/);
    expect(out).toContain(REDACTION_TOKENS.phone);
  });

  test("9. email addresses", () => {
    const out = scrub("Email: billing.contact_1@example-hospital.org");
    expect(out).toContain(REDACTION_TOKENS.email);
    expect(out).not.toMatch(/example-hospital/);
  });

  test("10. social security number", () => {
    const out = scrub("SSN: 123-45-6789");
    expect(out).toContain(REDACTION_TOKENS.ssn);
    expect(out).not.toMatch(/123-45-6789/);
  });

  test("11. subscriber and policy identifiers (both are insurance IDs)", () => {
    const out = scrub("Subscriber ID: SUB-9981\nPolicy No: P0012345");
    expect(out).not.toMatch(/SUB-9981|P0012345/);
    const insCount = (out.match(/\[REDACTED_INSURANCE_ID\]/g) || []).length;
    expect(insCount).toBe(2);
  });
});

describe("scrub() preserves audit-critical data", () => {
  test("keeps provider name, service dates, codes, units, and amounts", () => {
    const bill = [
      "Springfield General Hospital",
      "Date of Service: 04/12/2025",
      "99213  Office Visit  1  $150.00",
      "0450   Emergency Room  2  $1,240.50",
      "J1885  Ketorolac injection  1  $85.00",
    ].join("\n");

    const out = scrub(bill);
    expect(out).toContain("Springfield General Hospital");
    expect(out).toContain("04/12/2025");
    expect(out).toContain("99213");
    expect(out).toContain("0450");
    expect(out).toContain("J1885");
    expect(out).toContain("$150.00");
    expect(out).toContain("$1,240.50");
    expect(out).toContain("$85.00");
    // No redaction tokens should appear at all.
    expect(out).not.toMatch(/\[REDACTED/);
  });

  test("does NOT redact dollar amount on a 'Patient Responsibility' line", () => {
    const out = scrub("Patient Responsibility: $200.00");
    expect(out).toContain("$200.00");
    expect(out).not.toMatch(/\[REDACTED/);
  });

  test("does NOT treat a bare 5-digit CPT code as a ZIP", () => {
    const out = scrub("99283  Emergency dept visit  1  $980.00");
    expect(out).toContain("99283");
    expect(out).not.toMatch(/\[REDACTED/);
  });

  test("does NOT redact a medication strength that looks address-like", () => {
    const out = scrub("Ibuprofen 200 MG Tablet  30  $12.00");
    expect(out).toContain("200 MG");
    expect(out).not.toMatch(/\[REDACTED/);
  });
});

describe("scrub() edge cases", () => {
  test("empty input returns empty string", () => {
    expect(scrub("")).toBe("");
  });

  test("keeps the label text, only blanks the value", () => {
    const out = scrub("Patient Name: Alex Rivera");
    expect(out.startsWith("Patient Name")).toBe(true);
    expect(out).toContain(REDACTION_TOKENS.name);
  });
});

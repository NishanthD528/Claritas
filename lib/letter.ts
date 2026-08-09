// lib/letter.ts
//
// Deterministic dispute-letter generation. Built entirely from stored bill
// data, never model-generated. The tone is neutral and professional, it
// lists each flagged line as a question, requests a corrected itemized
// statement within 30 days, and (where the rights engine matched) asks for the
// financial assistance application or notes the dispute. It NEVER asserts a
// fair price or what anything should cost.

import type { BillView } from "@/lib/view";
import { fmtMoney, fmtDate } from "@/lib/format";

export interface LetterOptions {
  // Defaults to today; injectable so output is testable.
  date?: Date;
}

function chargeLabel(bill: BillView, line: number): string {
  const c = bill.charges.find((x) => x.line_number === line);
  if (!c) return `Line ${line}`;
  const parts = [`Line ${line}`];
  const desc = c.description_raw || c.description_plain;
  if (desc) parts.push(desc);
  if (c.code) parts.push(`code ${c.code}`);
  if (c.amount_charged !== null) parts.push(fmtMoney(c.amount_charged));
  return parts.join(", ");
}

export function buildLetter(bill: BillView, opts: LetterOptions = {}): string {
  const date = opts.date ?? new Date();
  const dateStr = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const provider = bill.provider_name || "Provider";
  const serviceWindow =
    bill.service_date_start && bill.service_date_end
      ? bill.service_date_start === bill.service_date_end
        ? fmtDate(bill.service_date_start)
        : `${fmtDate(bill.service_date_start)} to ${fmtDate(bill.service_date_end)}`
      : bill.service_date_start
      ? fmtDate(bill.service_date_start)
      : "[service date(s)]";

  const rightKeys = new Set(bill.rights.map((r) => r.right_key));
  const billLevel = bill.flags.filter((f) => f.charge_line_number === null);
  const lineLevel = bill.flags.filter((f) => f.charge_line_number !== null);

  const lines: string[] = [];

  lines.push(dateStr);
  lines.push("");
  lines.push("Billing Department");
  lines.push(provider);
  lines.push("");
  lines.push("Re: Request for review and correction of my account");
  lines.push("Account number: ____________________  (please see enclosed statement)");
  lines.push(`Service date(s): ${serviceWindow}`);
  lines.push("");
  lines.push("To whom it may concern,");
  lines.push("");
  lines.push(
    "I am writing to ask for a review of the account referenced above. After " +
      "going through the itemized charges, I have questions about the items " +
      "below and would appreciate a corrected, fully itemized statement."
  );

  if (billLevel.length > 0) {
    lines.push("");
    lines.push("Regarding the bill overall:");
    for (const f of billLevel) {
      lines.push(`  - ${f.suggested_question}`);
    }
  }

  if (lineLevel.length > 0) {
    lines.push("");
    lines.push("Regarding specific charges:");
    for (const f of lineLevel) {
      const label = chargeLabel(bill, f.charge_line_number as number);
      lines.push(`  - ${label}`);
      lines.push(`      ${f.suggested_question}`);
    }
  }

  if (billLevel.length === 0 && lineLevel.length === 0) {
    lines.push("");
    lines.push(
      "I would like to confirm that each charge is accurate and ask for a " +
        "fully itemized statement for my records."
    );
  }

  // Requests
  lines.push("");
  lines.push("I am requesting the following:");
  let n = 1;
  lines.push(
    `  ${n++}. A corrected, fully itemized statement that addresses the items above.`
  );
  if (rightKeys.has("financial_assistance")) {
    lines.push(
      `  ${n++}. A copy of your financial assistance (charity care) application, ` +
        `which I would like to be considered for.`
    );
  }
  if (rightKeys.has("collections_pause") || bill.status === "disputing") {
    lines.push(
      `  ${n++}. That any collections activity on this account be paused while ` +
        `these questions are being reviewed.`
    );
  }
  lines.push(`  ${n++}. A written response within 30 days of the date of this letter.`);

  lines.push("");
  lines.push(
    "To be clear, I am not making any claim about what these services should " +
      "cost. I am only asking for clarification and correction of the specific " +
      "items noted above."
  );
  lines.push("");
  lines.push("Thank you for your time and assistance.");
  lines.push("");
  lines.push("Sincerely,");
  lines.push("");
  lines.push("____________________  (your name)");
  lines.push("____________________  (your contact information)");

  return lines.join("\n");
}

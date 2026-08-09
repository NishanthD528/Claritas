// lib/rights.ts
//
// A STATIC, hand-written knowledge base of patient rights and programs, written
// in plain language from public federal sources. The model never generates any
// of this legal/program content, and nothing here cites a statute as advice.
//
// Everything is framed as something to LOOK INTO, not a guarantee about the
// user's situation. Every entry carries a "verify with your provider or state
// consumer agency" note. The matcher decides which entries are relevant to a
// specific bill and writes a short, bill-specific relevance string.

import type { BillExtraction, ChargeExtraction, FacilityType } from "@/lib/types";

export type RightKey =
  | "itemized_bill"
  | "surprise_billing"
  | "financial_assistance"
  | "payment_plan"
  | "collections_pause"
  | "insurance_eob_check"
  | "medical_necessity";

export interface RightEntry {
  key: RightKey;
  title: string;
  explanation: string; // plain English, no jargon
  action: string; // one concrete next step
  verifyNote: string;
}

const VERIFY =
  "This is general information, not legal advice. Verify the details with " +
  "your provider or your state consumer-protection or insurance agency.";

// The knowledge base. Keys map to rows stored in the `rights` table.
export const RIGHTS: Record<RightKey, RightEntry> = {
  itemized_bill: {
    key: "itemized_bill",
    title: "Request a fully itemized bill",
    explanation:
      "This looks like a summary or balance-due statement rather than a " +
      "fully itemized bill. You have the right to ask any provider for an " +
      "itemized bill that lists every service, code, and charge, so you can " +
      "see exactly what you are being billed for.",
    action:
      "Call the billing department and ask for a fully itemized statement " +
      "(sometimes called a \"detailed\" or \"line-item\" bill).",
    verifyNote: VERIFY,
  },
  surprise_billing: {
    key: "surprise_billing",
    title: "Possible surprise / out-of-network billing protection",
    explanation:
      "This bill includes services often provided by a separate group " +
      "(such as anesthesiology, radiology, pathology, or an ER physician " +
      "group) that can bill out-of-network even at an in-network facility. " +
      "Federal protections (the No Surprises Act) may mean you are not " +
      "responsible for those out-of-network charges in certain situations.",
    action:
      "Ask your insurer and the facility whether the No Surprises Act " +
      "applies, and request that any out-of-network amount be reprocessed.",
    verifyNote: VERIFY,
  },
  financial_assistance: {
    key: "financial_assistance",
    title: "Ask about financial assistance (charity care)",
    explanation:
      "This bill is from a hospital. Nonprofit hospitals are required to " +
      "maintain a written financial assistance policy, and eligibility is " +
      "often far more generous than people expect, and can cover part " +
      "or all of a bill well above the poverty line.",
    action:
      "Ask the billing office for the \"financial assistance application\" " +
      "by name, and request that collections pause while you apply.",
    verifyNote: VERIFY,
  },
  payment_plan: {
    key: "payment_plan",
    title: "Request an interest-free payment plan",
    explanation:
      "Most providers offer interest-free payment plans on request. Setting " +
      "one up can stop a bill from going to collections and spread the cost " +
      "into manageable monthly amounts.",
    action:
      "Ask the billing office to set up a no-interest monthly payment plan " +
      "and get the terms in writing before you agree.",
    verifyNote: VERIFY,
  },
  collections_pause: {
    key: "collections_pause",
    title: "Ask to pause collections during a dispute",
    explanation:
      "Many providers will hold collections activity while a billing dispute " +
      "is open. Putting your dispute in writing creates a record and can stop " +
      "the account from advancing while questions are unresolved.",
    action:
      "Submit your dispute in writing, ask for collections to be paused, and " +
      "keep a dated copy of everything you send.",
    verifyNote: VERIFY,
  },
  insurance_eob_check: {
    key: "insurance_eob_check",
    title: "Compare against your insurer's EOB before paying",
    explanation:
      "Before paying anything, compare this bill against the Explanation of " +
      "Benefits (EOB) your insurer sent. The EOB shows what the plan paid, " +
      "what was adjusted, and what you actually owe, which sometimes differs " +
      "from the provider's bill.",
    action:
      "Find the matching EOB from your insurer and confirm the patient " +
      "responsibility amount matches this bill before paying.",
    verifyNote: VERIFY,
  },
  medical_necessity: {
    key: "medical_necessity",
    title: "Ask why each service was ordered",
    explanation:
      "A bill shows what you were charged for, but not why. Claritas does not " +
      "give medical advice and cannot judge whether a test or service was " +
      "needed. Only your care team can. If a charge is unclear to you, it is " +
      "always reasonable to ask why it was ordered and whether it was " +
      "necessary for your visit.",
    action:
      "Ask your provider to explain why each test or service was ordered and " +
      "whether all of them were necessary for your visit.",
    verifyNote: VERIFY,
  },
};

export interface MatchedRight {
  right_key: RightKey;
  relevance: string; // why this applies to THIS bill
}

export interface RightsConfig {
  // payment_plan is surfaced for bills at or above this amount.
  paymentPlanMinAmount: number;
  // A bill with this many or fewer line items looks like a summary.
  summaryMaxLines: number;
}

export const DEFAULT_RIGHTS_CONFIG: RightsConfig = {
  paymentPlanMinAmount: 250,
  summaryMaxLines: 2,
};

// Descriptions/providers that suggest a separately-billed provider group.
const SURPRISE_KEYWORDS = [
  "anesthesia",
  "anesthesiology",
  "anesthesiologist",
  "crna",
  "radiology",
  "radiologist",
  "pathology",
  "pathologist",
  "emergency physician",
  "er physician",
  "emergency department physician",
  "assistant surgeon",
  "consulting physician",
];

export interface RightsMatchInput {
  facility_type: FacilityType;
  charges: ChargeExtraction[];
  computed_total: number;
  stated_total: number | null;
  // Bill workflow status; collections_pause only applies once disputing.
  status?: string;
}

function norm(s: string | null | undefined): string {
  return (s ?? "").toLowerCase();
}

// Does this bill look like a summary rather than a fully itemized bill?
function looksLikeSummary(
  charges: ChargeExtraction[],
  cfg: RightsConfig
): boolean {
  if (charges.length === 0) return true;
  if (charges.length <= cfg.summaryMaxLines) return true;
  // Most lines lacking a code AND a unit price reads like a summary total.
  const bare = charges.filter((c) => !c.code && c.unit_price === null).length;
  return bare / charges.length >= 0.7;
}

/**
 * Match the static rights entries against a specific bill and produce a
 * short, bill-specific relevance note for each. insurance_eob_check always
 * applies; the rest are conditional.
 */
export function matchRights(
  input: RightsMatchInput,
  cfg: RightsConfig = DEFAULT_RIGHTS_CONFIG
): MatchedRight[] {
  const matched: MatchedRight[] = [];
  const amount = input.stated_total ?? input.computed_total;
  const isHospital = input.facility_type === "hospital";

  // itemized_bill
  if (looksLikeSummary(input.charges, cfg)) {
    matched.push({
      right_key: "itemized_bill",
      relevance:
        `This document has only ${input.charges.length} line item(s) and ` +
        `reads more like a summary than a fully itemized bill.`,
    });
  }

  // surprise_billing (hospital + a separately-billed provider service)
  if (isHospital) {
    const hit = input.charges.find((c) =>
      SURPRISE_KEYWORDS.some((k) => norm(c.description_raw).includes(k))
    );
    if (hit) {
      matched.push({
        right_key: "surprise_billing",
        relevance:
          `Line ${hit.line_number} ("${hit.description_raw}") is the kind of ` +
          `service often billed by a separate provider group that can be ` +
          `out-of-network.`,
      });
    }
  }

  // financial_assistance (any hospital bill)
  if (isHospital) {
    matched.push({
      right_key: "financial_assistance",
      relevance:
        "This bill is from a hospital, so a financial assistance (charity " +
        "care) policy is likely available.",
    });
  }

  // payment_plan (bill at or above threshold)
  if (amount >= cfg.paymentPlanMinAmount) {
    matched.push({
      right_key: "payment_plan",
      relevance:
        `At about $${amount.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}, this bill may be a good candidate for an interest-free payment ` +
        `plan.`,
    });
  }

  // collections_pause (only once the user marks the bill as disputing)
  if (input.status === "disputing") {
    matched.push({
      right_key: "collections_pause",
      relevance:
        "You have marked this bill as disputed, so you can ask the provider " +
        "to pause collections while it is reviewed.",
    });
  }

  // insurance_eob_check (always)
  matched.push({
    right_key: "insurance_eob_check",
    relevance:
      "Comparing any bill against your insurer's EOB before paying applies to " +
      "every bill.",
  });

  // medical_necessity (always): a question to ask, never a judgment that
  // anything was unnecessary.
  matched.push({
    right_key: "medical_necessity",
    relevance:
      "You can ask about the reason for any service on any bill; this is a " +
      "question for your care team, not something this app decides.",
  });

  return matched;
}

// Convenience for the UI: pair a matched right with its static content.
export function getRight(key: RightKey): RightEntry {
  return RIGHTS[key];
}

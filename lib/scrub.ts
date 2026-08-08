// lib/scrub.ts
//
// PII scrubbing for Claritas. This runs SERVER-SIDE before any bill text is
// stored, logged, or sent to the Gemini API. Nothing here ever runs in the
// browser and the raw, unscrubbed text must never leave the function.
//
// Design principle: aggressively remove personal identifiers, but NEVER touch
// the data an audit depends on — provider name, service dates, billing codes,
// units, and dollar amounts. Over-redacting a name is harmless; accidentally
// blanking a charge amount or a CPT code would make the analysis worthless.
//
// That constraint drives two deliberate choices:
//   1. Dates of birth are only removed when they follow a DOB-style label.
//      There is no bare "date" regex, because service dates must survive.
//   2. Bare numbers are never removed on their own. A lone 5-digit number is
//      far more likely to be a CPT/ZIP-shaped code than PII, so numeric
//      identifiers are only stripped via labels or highly specific patterns
//      (SSN, phone, email, "City, ST 12345").

export const REDACTION_TOKENS = {
  name: "[REDACTED_NAME]",
  address: "[REDACTED_ADDRESS]",
  dob: "[REDACTED_DOB]",
  id: "[REDACTED_ID]",
  insurance: "[REDACTED_INSURANCE_ID]",
  phone: "[REDACTED_PHONE]",
  email: "[REDACTED_EMAIL]",
  ssn: "[REDACTED_SSN]",
} as const;

// Words that can immediately follow "Patient"/"Guarantor" on a billing line
// and are NOT names — these lines carry dollar amounts we must keep, e.g.
// "Patient Responsibility: $200.00" or "Guarantor Balance Due: $50.00".
const BILLING_TERM_AFTER_NAME_LABEL = new RegExp(
  "^(responsibility|responsible\\s+amount|balance|portion|payment|paid|due|" +
    "total|amount|share|owes|owed|copay|co-pay|coinsurance|deductible)\\b",
  "i"
);

// ---------------------------------------------------------------------------
// Structured, global regex passes. These are specific enough that they will
// not match codes, units, or dollar amounts.
// ---------------------------------------------------------------------------

// Social Security numbers: 123-45-6789 or 123 45 6789. Run before phone.
const SSN_RE = /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/g;

// Email addresses.
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

// Phone numbers: (123) 456-7890, 123-456-7890, 123.456.7890, +1 123 456 7890.
// Requires a separator between the exchange and line number so it cannot
// swallow a bare 10-digit account run without punctuation (those are handled
// by labels instead).
const PHONE_RE =
  /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g;

// "City, ST 12345" or "City, ST 12345-6789". Anchors the ZIP to a two-letter
// state + comma so we never redact a lone 5-digit code/amount.
const CITY_STATE_ZIP_RE =
  /\b[A-Za-z][A-Za-z.'\-\s]{1,40},\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/g;

// Street address: a house number followed by words and a street-type suffix.
// The required suffix keeps this off medical descriptions like "200 MG Tablet".
const STREET_RE = new RegExp(
  "\\b\\d{1,6}\\s+[A-Za-z0-9.'\\-]+(?:\\s+[A-Za-z0-9.'\\-]+){0,5}\\s+" +
    "(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|" +
    "Court|Ct|Way|Place|Pl|Terrace|Ter|Circle|Cir|Parkway|Pkwy|Highway|Hwy|" +
    "Trail|Trl|Square|Sq|Loop|Alley|Aly)\\b\\.?" +
    "(?:\\s+(?:Suite|Ste|Apt|Apartment|Unit|Bldg|Building|Floor|Fl|Rm|Room)\\.?" +
    "\\s*#?\\s*[A-Za-z0-9-]+)?",
  "gi"
);

// ---------------------------------------------------------------------------
// Label-anchored line pass. For lines shaped "Label: value" we replace the
// value with a token. Label groups are tested most-specific-first so an ID
// label wins over the broad name labels.
// ---------------------------------------------------------------------------

type LabelGroup = {
  // Matches the label + separator at the start of a line, capturing nothing;
  // whatever follows is the value to be redacted.
  label: RegExp;
  token: string;
  // If true, skip redaction when the value is a pure dollar amount or a known
  // billing term (protects amounts on name-prefixed lines).
  guardAmount?: boolean;
};

// A value that is only a dollar amount / number-with-currency — never redact.
const PURE_AMOUNT_RE = /^\$?\s*[\d,]+(?:\.\d{1,2})?\s*$/;

const sep = "\\s*[:#\\-]?\\s*";

const LABEL_GROUPS: LabelGroup[] = [
  {
    label: new RegExp(`^\\s*(?:ssn|social\\s+security(?:\\s+(?:no|number|#))?)${sep}`, "i"),
    token: REDACTION_TOKENS.ssn,
  },
  {
    label: new RegExp(`^\\s*(?:dob|d\\.o\\.b\\.?|date\\s+of\\s+birth|birth\\s*date)${sep}`, "i"),
    token: REDACTION_TOKENS.dob,
  },
  {
    label: new RegExp(`^\\s*(?:phone|tel|telephone|mobile|cell|fax)(?:\\s*(?:no|number|#))?${sep}`, "i"),
    token: REDACTION_TOKENS.phone,
  },
  {
    label: new RegExp(`^\\s*(?:e-?mail)(?:\\s+address)?${sep}`, "i"),
    token: REDACTION_TOKENS.email,
  },
  {
    label: new RegExp(`^\\s*(?:address|mailing\\s+address|street|city\\s*/?\\s*state\\s*/?\\s*zip)${sep}`, "i"),
    token: REDACTION_TOKENS.address,
  },
  {
    // Insurance identifiers.
    label: new RegExp(
      `^\\s*(?:member(?:\\s+id)?|subscriber\\s+id|group(?:\\s+(?:id|no|number|#))?|` +
        `policy(?:\\s+(?:no|number|#))?|insurance\\s+id|plan\\s+id|payer\\s+id)${sep}`,
      "i"
    ),
    token: REDACTION_TOKENS.insurance,
  },
  {
    // Account / medical-record / claim / guarantor numbers.
    label: new RegExp(
      `^\\s*(?:mrn|medical\\s+record(?:\\s+(?:no|number|#))?|` +
        `account(?:\\s+(?:no|number|#))?|acct(?:\\s+(?:no|number|#))?|` +
        `guarantor(?:\\s+(?:no|number|#|id))|` +
        `claim(?:\\s+(?:no|number|#))?|` +
        `patient\\s+(?:id|no|number|#)|chart(?:\\s+(?:no|number|#))?|` +
        `statement(?:\\s+(?:no|number|#))|invoice(?:\\s+(?:no|number|#))?)${sep}`,
      "i"
    ),
    token: REDACTION_TOKENS.id,
  },
  {
    // Names (broadest — tested last). Guarded against billing-amount lines.
    label: new RegExp(
      `^\\s*(?:patient\\s+name|guarantor\\s+name|subscriber\\s+name|insured\\s+name|` +
        `member\\s+name|responsible\\s+party|bill\\s+to|name|patient|guarantor|` +
        `subscriber|insured)${sep}`,
      "i"
    ),
    token: REDACTION_TOKENS.name,
    guardAmount: true,
  },
];

function scrubLine(line: string): string {
  for (const group of LABEL_GROUPS) {
    const m = line.match(group.label);
    if (!m) continue;

    const labelText = m[0];
    const value = line.slice(labelText.length);

    if (group.guardAmount) {
      const trimmed = value.trim();
      // Keep dollar amounts and billing-term lines intact.
      if (trimmed === "" || PURE_AMOUNT_RE.test(trimmed)) return line;
      if (BILLING_TERM_AFTER_NAME_LABEL.test(trimmed)) return line;
    }

    if (value.trim() === "") return line; // nothing to redact after the label
    return labelText + group.token;
  }
  return line;
}

// ---------------------------------------------------------------------------
// Public entry point.
// ---------------------------------------------------------------------------

export function scrub(input: string): string {
  if (!input) return "";

  // 1) Global structured passes. Order matters: SSN before phone.
  let text = input
    .replace(SSN_RE, REDACTION_TOKENS.ssn)
    .replace(EMAIL_RE, REDACTION_TOKENS.email)
    .replace(PHONE_RE, REDACTION_TOKENS.phone)
    .replace(CITY_STATE_ZIP_RE, REDACTION_TOKENS.address)
    .replace(STREET_RE, REDACTION_TOKENS.address);

  // 2) Label-anchored line pass for the remaining structured identifiers.
  text = text
    .split("\n")
    .map((line) => scrubLine(line))
    .join("\n");

  return text;
}

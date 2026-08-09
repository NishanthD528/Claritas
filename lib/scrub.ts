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

// Inline identifiers that appear mid-line, e.g. "(Guarantor #1000619184)" or
// "Account No 55210". The value must contain at least one digit and be 4+
// chars, so it never matches a dollar amount (those carry $ / decimals).
const INLINE_ID_RE = new RegExp(
  "\\b(guarantor|account|acct|mrn|medical\\s+record|claim|chart|statement|" +
    "invoice|member|subscriber|policy)\\b[\\s:#no.-]*" +
    "((?=[A-Za-z0-9-]*\\d)[A-Za-z0-9-]{4,})",
  "gi"
);

// Address lines that the US-style street/zip passes miss: apartment blocks and
// international address components (e.g. "... Apts, 54 NO10011", "Bengaloru
// 560035"). Kept narrow so medical terms aren't caught — note "block",
// "colony", and "sector" are deliberately excluded ("nerve block", "colony
// count" are real charges).
const APT_ADDRESS_LINE_RE = /^.*\b(?:apartments?|apts?|nagar|layout)\b.*$/gim;
const ROAD_COMMA_LINE_RE =
  /^.*\b(?:road|street|marg|avenue|lane)\s*,\s*[A-Za-z].*$/gim;
const INTL_CITY_POSTCODE_RE = /\b[A-Z][a-zA-Z]{3,}\s+\d{6}\b/g;

// Name-in-context patterns. We capture the patient/guarantor name from the
// contexts a bill states it in, then redact EVERY occurrence of that name —
// including a bare name line that carries no label of its own.
const NAME_CONTEXT_RES: RegExp[] = [
  // "... for Veeresa Dara (Guarantor #...)" / "services for NAME"
  /\bfor\s+([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,3})(?=\s*\(?\s*(?:guarantor|patient|account|mrn|dob)|[\s.,)])/g,
  // "Guarantor: NAME", "Patient Name: NAME", "Bill To: NAME"
  /\b(?:guarantor|patient|subscriber|insured|member|responsible\s+party|bill\s+to)(?:\s+name)?\s*[:#]\s*([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,3})/gi,
];

// Words that can be capitalized in a name context but are not personal names;
// don't redact these as name tokens.
const NAME_TOKEN_STOPWORDS = new Set([
  "the","and","for","guarantor","patient","health","hospital","medical",
  "center","clinic","services","service","document","following","contains",
  "requested","questions","please","contact","customer","insurance","payments",
  "charges","adjustments","total","date","account","number","this","not","bill",
]);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Collect distinct personal names stated in name contexts.
function extractNames(text: string): string[] {
  const names = new Set<string>();
  for (const re of NAME_CONTEXT_RES) {
    for (const m of Array.from(text.matchAll(re))) {
      const name = (m[1] || "").trim();
      if (name.split(/\s+/).length >= 2) names.add(name);
    }
  }
  return Array.from(names);
}

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

  // 1) Names stated in context are captured from the ORIGINAL text (before
  //    other passes rewrite it), then every occurrence is redacted — including
  //    a bare name line elsewhere in the document.
  const names = extractNames(input);

  // 2) Global structured passes. Order matters: SSN before phone.
  let text = input
    .replace(SSN_RE, REDACTION_TOKENS.ssn)
    .replace(EMAIL_RE, REDACTION_TOKENS.email)
    .replace(PHONE_RE, REDACTION_TOKENS.phone)
    .replace(CITY_STATE_ZIP_RE, REDACTION_TOKENS.address)
    .replace(STREET_RE, REDACTION_TOKENS.address)
    .replace(APT_ADDRESS_LINE_RE, REDACTION_TOKENS.address)
    .replace(ROAD_COMMA_LINE_RE, REDACTION_TOKENS.address)
    .replace(INTL_CITY_POSTCODE_RE, REDACTION_TOKENS.address);

  // 3) Label-anchored line pass handles line-start "Label: value" first, so an
  //    ID label (e.g. "Guarantor No:") wins over the broad name label.
  text = text
    .split("\n")
    .map((line) => scrubLine(line))
    .join("\n");

  // 4) Inline identifiers the label pass can't see (mid-line, in prose), e.g.
  //    "(Guarantor #1000619184)".
  text = text.replace(
    INLINE_ID_RE,
    (_m, label) => `${label} ${REDACTION_TOKENS.id}`
  );

  // 5) Redact every occurrence of a name captured from context — including a
  //    bare name line that carried no label of its own.
  for (const name of names) {
    text = text.replace(new RegExp(escapeRegExp(name), "gi"), REDACTION_TOKENS.name);
    for (const token of name.split(/\s+/)) {
      if (token.length >= 4 && !NAME_TOKEN_STOPWORDS.has(token.toLowerCase())) {
        text = text.replace(
          new RegExp(`\\b${escapeRegExp(token)}\\b`, "gi"),
          REDACTION_TOKENS.name
        );
      }
    }
  }

  return text;
}

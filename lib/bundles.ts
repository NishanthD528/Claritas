// lib/bundles.ts
//
// A deliberately small, hand-written map of common comprehensive services and
// the component services that are frequently billed together under them. This
// is NOT a medical code database and owns no pricing — it is keyed on plain
// description KEYWORDS, not code numbers, and only powers a "these are often
// billed together, can you confirm they were correctly billed separately?"
// question.
//
// The list is intentionally small and easy to expand: add an entry with a
// human-readable name and the component keywords that, when they appear as
// separate line items, may indicate unbundling worth asking about.

export interface Bundle {
  name: string; // the comprehensive service, in plain language
  // Component keywords. If two or more DISTINCT components appear as separate
  // line items on the same bill, we surface an unbundling question.
  components: string[];
}

export const BUNDLES: Bundle[] = [
  {
    name: "Basic Metabolic Panel",
    components: [
      "sodium",
      "potassium",
      "chloride",
      "carbon dioxide",
      "glucose",
      "calcium",
      "creatinine",
      "bun",
      "blood urea nitrogen",
    ],
  },
  {
    name: "Comprehensive Metabolic Panel",
    components: [
      "albumin",
      "total protein",
      "bilirubin",
      "alkaline phosphatase",
      "ast",
      "alt",
      "aspartate aminotransferase",
      "alanine aminotransferase",
    ],
  },
  {
    name: "Complete Blood Count (CBC)",
    components: [
      "white blood cell",
      "wbc",
      "red blood cell",
      "rbc",
      "hemoglobin",
      "hematocrit",
      "platelet",
    ],
  },
  {
    name: "Lipid Panel",
    components: [
      "total cholesterol",
      "hdl",
      "ldl",
      "triglyceride",
    ],
  },
  {
    name: "Hepatic (Liver) Function Panel",
    components: [
      "albumin",
      "direct bilirubin",
      "total bilirubin",
      "alkaline phosphatase",
      "ast",
      "alt",
    ],
  },
  {
    name: "Electrolyte Panel",
    components: ["sodium", "potassium", "chloride", "bicarbonate"],
  },
  {
    name: "Thyroid Panel",
    components: ["tsh", "t3", "t4", "free t4", "free t3"],
  },
  {
    name: "Surgical Global Package",
    // A procedure normally includes routine pre/post-op care and closure.
    components: [
      "incision",
      "wound closure",
      "suture",
      "surgical tray",
      "post-operative visit",
      "postoperative visit",
    ],
  },
  {
    name: "Operating Room & Recovery",
    components: [
      "operating room",
      "recovery room",
      "post anesthesia",
      "pacu",
    ],
  },
  {
    name: "Room & Nursing Care",
    // Routine nursing is normally included in the daily room-and-board rate.
    components: [
      "room and board",
      "semi-private room",
      "private room",
      "routine nursing",
      "nursing care",
    ],
  },
  {
    name: "Anesthesia with Procedure",
    components: ["anesthesia", "anesthesiologist", "crna"],
  },
  {
    name: "Venipuncture with Lab Panel",
    // Routine blood draw sometimes billed separately alongside the panel.
    components: ["venipuncture", "blood draw", "specimen collection"],
  },
  {
    name: "Obstetric Panel",
    components: [
      "blood type",
      "abo",
      "rh",
      "antibody screen",
      "rubella",
      "hepatitis b surface",
    ],
  },
];

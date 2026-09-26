import { describe, expect, it } from "vitest";

import { CONTACT_FIELDS } from "../../src/model/contact.js";
import type { Contact, ContactField } from "../../src/model/contact.js";
import { createDecision } from "../../src/model/decision.js";
import type { Decision } from "../../src/model/decision.js";
import { explain } from "../../src/model/explain.js";
import type { SourceRecordId } from "../../src/model/source-record.js";

// Criterion 11, as changed by the WTC-11 addendum: explain() gathers source
// ids from every entry of every field in CONTACT_FIELDS, returns matching
// decisions in their input order, each once, and stays contact-scoped.
// Moved out of contact.test.ts per the addendum's test file plan.
//
// Fabricated data only: example.com/.org/.net emails, +44 7700 900xxx
// phones, "Ada Example" names, "Example Widgets Ltd" company.

function emptyContact(): Contact {
  return {
    givenName: [],
    familyName: [],
    fullName: [],
    emails: [],
    phones: [],
    company: [],
    title: [],
    linkedinUrl: [],
  };
}

function contactWithOnly(field: ContactField, sourceId: SourceRecordId): Contact {
  return {
    ...emptyContact(),
    [field]: [{ value: "Example value", sources: [sourceId], primary: true }],
  };
}

describe("explain: scans exactly CONTACT_FIELDS, one source id per field (finding 2)", () => {
  it.each(CONTACT_FIELDS)(
    "returns a decision citing the id carried only on %s, and not one citing an unrelated id",
    (field) => {
      const sourceId = `linkedin:${field}-only` as SourceRecordId;
      const contact = contactWithOnly(field, sourceId);

      const relevant = createDecision({
        ruleId: "M-test",
        sourceRecordIds: [sourceId],
        outcome: "merged",
        confidence: "high",
        reason: `Exercises the ${field} field in isolation.`,
      });
      const unrelated = createDecision({
        ruleId: "M-other",
        sourceRecordIds: ["google:unrelated-id"],
        outcome: "merged",
        confidence: "high",
        reason: "Unrelated decision; must not be returned.",
      });

      expect(explain(contact, [relevant, unrelated])).toEqual([relevant]);
    },
  );

  it("returns an empty array when no decision cites any of the contact's source ids", () => {
    const contact = contactWithOnly("company", "linkedin:company-only");
    const unrelated = createDecision({
      ruleId: "M-other",
      sourceRecordIds: ["google:someone-else"],
      outcome: "merged",
      confidence: "high",
      reason: "Same phone number, unrelated contact.",
    });

    expect(explain(contact, [unrelated])).toEqual([]);
  });
});

// Source ids used nowhere else on the contact, one per field, plus a second
// (non-primary) company id -- per the addendum's finding-2 fixture guidance.
const LINKEDIN_URL_ONLY = "linkedin:url-only";
const LINKEDIN_COMPANY_ONLY = "linkedin:company-only";
const GOOGLE_SECOND_COMPANY_ONLY = "google:second-company-only";
const GOOGLE_TITLE_ONLY = "google:title-only";
const PHONE_PHONE_ONLY = "phone:phone-only";
const GOOGLE_OTHER_EMAIL_ONLY = "google-other:email-only";
const LINKEDIN_GIVEN_ONLY = "linkedin:given-only";
const LINKEDIN_FAMILY_ONLY = "linkedin:family-only";
const LINKEDIN_FULL_ONLY = "linkedin:full-only";

function buildRichContact(): Contact {
  return {
    givenName: [{ value: "Ada", sources: [LINKEDIN_GIVEN_ONLY], primary: true }],
    familyName: [{ value: "Example", sources: [LINKEDIN_FAMILY_ONLY], primary: true }],
    fullName: [{ value: "Ada Example", sources: [LINKEDIN_FULL_ONLY], primary: true }],
    emails: [{ value: "ada@example.com", sources: [GOOGLE_OTHER_EMAIL_ONLY], primary: true }],
    phones: [{ value: "+44 7700 900123", sources: [PHONE_PHONE_ONLY], primary: true }],
    company: [
      { value: "Example Widgets Ltd", sources: [LINKEDIN_COMPANY_ONLY], primary: true },
      { value: "Example Widgets Holdings", sources: [GOOGLE_SECOND_COMPANY_ONLY], primary: false },
    ],
    title: [{ value: "Engineer", sources: [GOOGLE_TITLE_ONLY], primary: true }],
    linkedinUrl: [
      { value: "https://linkedin.example.com/in/ada-example", sources: [LINKEDIN_URL_ONLY], primary: true },
    ],
  };
}

describe("explain: order and de-duplication", () => {
  it("returns matching decisions in input order, each once, given [d3, d1, d2]", () => {
    const contact = buildRichContact();
    const d1: Decision = createDecision({
      ruleId: "M1",
      sourceRecordIds: [LINKEDIN_GIVEN_ONLY],
      outcome: "merged",
      confidence: "high",
      reason: "Same given name.",
    });
    const d2: Decision = createDecision({
      ruleId: "M2",
      sourceRecordIds: [GOOGLE_OTHER_EMAIL_ONLY],
      outcome: "merged",
      confidence: "high",
      reason: "Same email address.",
    });
    const d3: Decision = createDecision({
      ruleId: "M3",
      sourceRecordIds: [GOOGLE_SECOND_COMPANY_ONLY],
      outcome: "flagged-for-review",
      confidence: "medium",
      reason: "Second company candidate flagged for review.",
    });

    expect(explain(contact, [d3, d1, d2])).toEqual([d3, d1, d2]);
  });

  it("includes a decision overlapping several of the contact's source ids only once", () => {
    const contact = buildRichContact();
    const overlapping = createDecision({
      ruleId: "M4",
      sourceRecordIds: [LINKEDIN_GIVEN_ONLY, LINKEDIN_FAMILY_ONLY, GOOGLE_TITLE_ONLY],
      outcome: "merged",
      confidence: "high",
      reason: "Overlaps three fields of the same contact.",
    });

    expect(explain(contact, [overlapping])).toEqual([overlapping]);
  });

  it("includes a decision that partially overlaps the contact's source ids", () => {
    const contact = buildRichContact();
    const partiallyOverlapping = createDecision({
      ruleId: "M5",
      sourceRecordIds: [PHONE_PHONE_ONLY, "google:someone-else"],
      outcome: "merged",
      confidence: "high",
      reason: "Same phone number as an unrelated third record.",
    });

    expect(explain(contact, [partiallyOverlapping])).toEqual([partiallyOverlapping]);
  });

  it("does not return a decision that cites only an unrelated source id", () => {
    const contact = buildRichContact();
    const unrelatedDecision = createDecision({
      ruleId: "M6",
      sourceRecordIds: ["google:someone-else"],
      outcome: "merged",
      confidence: "high",
      reason: "Same phone number, unrelated contact entirely.",
    });

    expect(explain(contact, [unrelatedDecision])).toEqual([]);
  });
});

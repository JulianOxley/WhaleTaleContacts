import { describe, expect, it } from "vitest";

import { validateContact } from "../../src/model/contact.js";
import type { Contact } from "../../src/model/contact.js";
import { createDecision } from "../../src/model/decision.js";
import { explain } from "../../src/model/explain.js";
import type { Decision } from "../../src/model/decision.js";
import type { PrimarySourced, Sourced } from "../../src/model/provenance.js";

// Fabricated data only: example.com/.org emails, +44 7700 900xxx phones,
// "Ada Example" / "Test Person" names, "Example Widgets Ltd" company.

const LINKEDIN_ID = "linkedin:ada-example";
const PHONE_ID = "phone:ada-mobile";
const GOOGLE_ID = "google:ada-contact";

function buildTwoSourceContact(): Contact {
  return {
    givenName: { value: "Ada", sources: [LINKEDIN_ID] },
    familyName: { value: "Example", sources: [LINKEDIN_ID] },
    fullName: { value: "Ada Example", sources: [LINKEDIN_ID] },
    company: { value: "Example Widgets Ltd", sources: [LINKEDIN_ID] },
    title: { value: "Engineer", sources: [LINKEDIN_ID] },
    emails: [
      { value: "ada@example.com", sources: [LINKEDIN_ID], primary: true },
      { value: "ada.example@example.org", sources: [PHONE_ID], primary: false },
    ],
    phones: [
      { value: "+44 7700 900123", sources: [PHONE_ID], primary: true },
    ],
  };
}

describe("Contact provenance shape (criterion 5)", () => {
  it("carries a { value, sources } pair for each singular field, with a non-empty sources list", () => {
    const contact = buildTwoSourceContact();

    const fullName: Sourced<string> | undefined = contact.fullName;
    expect(fullName).toBeDefined();
    expect(fullName?.value).toBe("Ada Example");
    expect(fullName?.sources.length).toBeGreaterThan(0);
    expect(fullName?.sources).toContain(LINKEDIN_ID);
  });

  it("records which source(s) each email and phone came from, across two different sources", () => {
    const contact = buildTwoSourceContact();

    const linkedinEmail = contact.emails.find(
      (email) => email.value === "ada@example.com",
    );
    const phoneSourcedEmail = contact.emails.find(
      (email) => email.value === "ada.example@example.org",
    );

    expect(linkedinEmail?.sources).toEqual([LINKEDIN_ID]);
    expect(phoneSourcedEmail?.sources).toEqual([PHONE_ID]);

    const phone = contact.phones[0];
    expect(phone?.sources).toEqual([PHONE_ID]);
  });

  it("has no problems when every sources list is non-empty and provenance is well formed", () => {
    expect(validateContact(buildTwoSourceContact())).toEqual([]);
  });
});

describe("Contact primary email/phone invariants (criterion 6)", () => {
  it("allows several emails and several phones with exactly one primary each", () => {
    const contact: Contact = {
      fullName: { value: "Test Person", sources: [GOOGLE_ID] },
      emails: [
        { value: "test.person@example.com", sources: [GOOGLE_ID], primary: true },
        { value: "test.person@example.net", sources: [LINKEDIN_ID], primary: false },
      ],
      phones: [
        { value: "+44 7700 900456", sources: [GOOGLE_ID], primary: true },
        { value: "555-0199", sources: [PHONE_ID], primary: false },
      ],
    };

    expect(validateContact(contact)).toEqual([]);
  });

  it("reports a problem when no email is marked primary", () => {
    const contact: Contact = {
      fullName: { value: "Test Person", sources: [GOOGLE_ID] },
      emails: [
        { value: "test.person@example.com", sources: [GOOGLE_ID], primary: false },
      ],
      phones: [],
    };

    const problems = validateContact(contact);
    expect(problems.length).toBeGreaterThan(0);
  });

  it("reports a problem when more than one email is marked primary", () => {
    const contact: Contact = {
      fullName: { value: "Test Person", sources: [GOOGLE_ID] },
      emails: [
        { value: "test.person@example.com", sources: [GOOGLE_ID], primary: true },
        { value: "test.person@example.org", sources: [LINKEDIN_ID], primary: true },
      ],
      phones: [],
    };

    const problems = validateContact(contact);
    expect(problems.length).toBeGreaterThan(0);
  });

  it("reports a problem when no phone is marked primary but at least one phone exists", () => {
    const contact: Contact = {
      fullName: { value: "Test Person", sources: [GOOGLE_ID] },
      emails: [],
      phones: [
        { value: "+44 7700 900456", sources: [PHONE_ID], primary: false },
      ],
    };

    const problems = validateContact(contact);
    expect(problems.length).toBeGreaterThan(0);
  });

  it("reports a problem when more than one phone is marked primary", () => {
    const contact: Contact = {
      fullName: { value: "Test Person", sources: [GOOGLE_ID] },
      emails: [],
      phones: [
        { value: "+44 7700 900456", sources: [PHONE_ID], primary: true },
        { value: "555-0199", sources: [GOOGLE_ID], primary: true },
      ],
    };

    const problems = validateContact(contact);
    expect(problems.length).toBeGreaterThan(0);
  });

  it("reports a problem when a field value has an empty sources list", () => {
    const badEmail: PrimarySourced<string> = {
      value: "test.person@example.com",
      sources: [],
      primary: true,
    };
    const contact: Contact = {
      fullName: { value: "Test Person", sources: [GOOGLE_ID] },
      emails: [badEmail],
      phones: [],
    };

    const problems = validateContact(contact);
    expect(problems.length).toBeGreaterThan(0);
  });

  it("has no problems for a contact with zero emails and zero phones", () => {
    const contact: Contact = {
      fullName: { value: "Test Person", sources: [GOOGLE_ID] },
      emails: [],
      phones: [],
    };

    expect(validateContact(contact)).toEqual([]);
  });
});

describe("explain (criterion 11)", () => {
  it("returns decisions whose sourceRecordIds overlap a source id cited by the contact", () => {
    const contact = buildTwoSourceContact();

    const relevantDecision = createDecision({
      ruleId: "M1",
      sourceRecordIds: [LINKEDIN_ID, PHONE_ID],
      outcome: "merged",
      confidence: "high",
      reason: "Same email address across LinkedIn and phone exports.",
    });
    const unrelatedDecision = createDecision({
      ruleId: "M4",
      sourceRecordIds: ["google:someone-else"],
      outcome: "flagged-for-review",
      confidence: "medium",
      reason: "Same full name and company, different contact entirely.",
    });

    const decisions: Decision[] = [relevantDecision, unrelatedDecision];

    const result = explain(contact, decisions);

    expect(result).toEqual([relevantDecision]);
  });

  it("returns an empty array when no decision cites any of the contact's source ids", () => {
    const contact = buildTwoSourceContact();
    const unrelatedDecision = createDecision({
      ruleId: "M2",
      sourceRecordIds: ["google:someone-else"],
      outcome: "merged",
      confidence: "high",
      reason: "Same phone number, unrelated contact.",
    });

    expect(explain(contact, [unrelatedDecision])).toEqual([]);
  });

  it("includes a decision that partially overlaps the contact's source ids", () => {
    const contact = buildTwoSourceContact();
    const partiallyOverlapping = createDecision({
      ruleId: "M2",
      sourceRecordIds: [PHONE_ID, "google:someone-else"],
      outcome: "merged",
      confidence: "high",
      reason: "Same phone number as an unrelated third record.",
    });

    expect(explain(contact, [partiallyOverlapping])).toEqual([
      partiallyOverlapping,
    ]);
  });
});

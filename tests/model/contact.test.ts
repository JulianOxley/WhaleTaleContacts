import { describe, expect, it } from "vitest";

import { CONTACT_FIELDS, validateContact } from "../../src/model/contact.js";
import type { Contact, ContactField } from "../../src/model/contact.js";
import { primaryOf } from "../../src/model/provenance.js";
import type { PrimarySourced } from "../../src/model/provenance.js";
import type { NormalisedFields } from "../../src/model/source-record.js";

// Fabricated data only: example.com/.org/.net emails, +44 7700 900xxx phones,
// "Ada Example" / "Test Person" names, "Example Widgets Ltd" company.
//
// Criteria covered here (addendum numbering): 5 (replaced by 15), 6 (widened
// by 16), 15, 16, 17, 18, 19 [proposed], 20 [proposed], 23 [proposed].
// explain() moved to explain.test.ts.

function validBaselineContact(): Contact {
  return {
    givenName: [{ value: "Ada", sources: ["linkedin:given"], primary: true }],
    familyName: [{ value: "Example", sources: ["linkedin:family"], primary: true }],
    fullName: [{ value: "Ada Example", sources: ["linkedin:full"], primary: true }],
    emails: [{ value: "ada@example.com", sources: ["linkedin:email"], primary: true }],
    phones: [{ value: "+44 7700 900123", sources: ["linkedin:phone"], primary: true }],
    company: [{ value: "Example Widgets Ltd", sources: ["linkedin:company"], primary: true }],
    title: [{ value: "Engineer", sources: ["linkedin:title"], primary: true }],
    linkedinUrl: [
      { value: "https://linkedin.example.com/in/ada-example", sources: ["linkedin:url"], primary: true },
    ],
  };
}

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

describe("CONTACT_FIELDS and Contact shape (criteria 15, 18)", () => {
  it("exposes exactly the eight fields, in this order", () => {
    expect(CONTACT_FIELDS).toEqual([
      "givenName",
      "familyName",
      "fullName",
      "emails",
      "phones",
      "company",
      "title",
      "linkedinUrl",
    ]);
  });

  it("gives a Contact whose own keys are exactly CONTACT_FIELDS", () => {
    const contact = validBaselineContact();
    expect(Object.keys(contact).sort()).toEqual([...CONTACT_FIELDS].sort());
  });

  it("holds a list of { value, sources, primary } for every field, not just emails/phones", () => {
    const contact = validBaselineContact();
    for (const field of CONTACT_FIELDS) {
      const entries = contact[field];
      expect(Array.isArray(entries)).toBe(true);
      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries) {
        expect(entry.sources.length).toBeGreaterThan(0);
        expect(typeof entry.primary).toBe("boolean");
      }
    }
  });

  it("keyof NormalisedFields equals ContactField exactly (checked at typecheck)", () => {
    // If this type stops compiling, NormalisedFields (source-record.ts) and
    // ContactField (contact.ts) have drifted apart -- criterion 18.
    type IsExactly<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
      ? true
      : false;
    type NormalisedKeysMatchContactField = IsExactly<ContactField, keyof NormalisedFields>;
    const check: NormalisedKeysMatchContactField = true;
    expect(check).toBe(true);
  });
});

describe("validateContact: several conflicting values per field (criterion 15)", () => {
  it("accepts several conflicting company values with exactly one primary and distinct sources", () => {
    const contact: Contact = {
      ...validBaselineContact(),
      company: [
        { value: "Example Widgets Ltd", sources: ["linkedin:company"], primary: true },
        { value: "Example Widgets Holdings", sources: ["google:company"], primary: false },
      ],
    };

    expect(validateContact(contact)).toEqual([]);
  });

  it("accepts several conflicting given names with exactly one primary and distinct sources", () => {
    const contact: Contact = {
      ...validBaselineContact(),
      givenName: [
        { value: "Ada", sources: ["linkedin:given"], primary: true },
        { value: "A.", sources: ["google:given"], primary: false },
      ],
    };

    expect(validateContact(contact)).toEqual([]);
  });

  it("accepts an inferred company value with inferredBy set", () => {
    const contact: Contact = {
      ...validBaselineContact(),
      company: [{ value: "Example Widgets Ltd", sources: ["linkedin:company"], primary: true, inferredBy: "C2" }],
    };

    expect(validateContact(contact)).toEqual([]);
  });

  it("accepts a contact with every field empty", () => {
    expect(validateContact(emptyContact())).toEqual([]);
  });
});

const DEFECT_A = "linkedin:defect-a";
const DEFECT_B = "linkedin:defect-b";
const DEFECT_SINGLE = "linkedin:defect-single";

interface SingleFieldDefect {
  label: string;
  entries: PrimarySourced<string>[];
}

const SINGLE_FIELD_DEFECTS: SingleFieldDefect[] = [
  {
    label: "an entry with an empty sources list",
    entries: [{ value: "Example value", sources: [], primary: true }],
  },
  {
    label: "no entry marked primary, with two entries",
    entries: [
      { value: "Example value A", sources: [DEFECT_A], primary: false },
      { value: "Example value B", sources: [DEFECT_B], primary: false },
    ],
  },
  {
    label: "more than one entry marked primary",
    entries: [
      { value: "Example value A", sources: [DEFECT_A], primary: true },
      { value: "Example value B", sources: [DEFECT_B], primary: true },
    ],
  },
  {
    label: "inferredBy is an empty string",
    entries: [{ value: "Example value", sources: [DEFECT_SINGLE], primary: true, inferredBy: "" }],
  },
  {
    label: "inferredBy is whitespace only",
    entries: [{ value: "Example value", sources: [DEFECT_SINGLE], primary: true, inferredBy: "   " }],
  },
  {
    label: "two entries with the same value (criterion 20 [proposed])",
    entries: [
      { value: "Example value", sources: [DEFECT_A], primary: true },
      { value: "Example value", sources: [DEFECT_B], primary: false },
    ],
  },
];

describe("validateContact: exactly one problem per single-field defect (criteria 16, 17, 20 [proposed]; message format per criterion 19 [proposed])", () => {
  for (const field of CONTACT_FIELDS) {
    describe(`field: ${field}`, () => {
      for (const defect of SINGLE_FIELD_DEFECTS) {
        it(`${defect.label} -> exactly one problem, prefixed with "${field}"`, () => {
          const contact: Contact = { ...validBaselineContact(), [field]: defect.entries };

          const problems = validateContact(contact);

          expect(problems).toHaveLength(1);
          expect(problems[0]?.startsWith(field)).toBe(true);
        });
      }
    });
  }
});

describe("validateContact: baseline sanity", () => {
  it("has no problems for a fully valid baseline contact", () => {
    expect(validateContact(validBaselineContact())).toEqual([]);
  });
});

describe("primaryOf (criterion 23 [proposed])", () => {
  it("returns the entry marked primary", () => {
    const values: readonly PrimarySourced<string>[] = [
      { value: "test.person@example.com", sources: ["google:e1"], primary: false },
      { value: "test.person@example.org", sources: ["linkedin:e2"], primary: true },
    ];

    expect(primaryOf(values)).toEqual(values[1]);
  });

  it("returns undefined for an empty list", () => {
    expect(primaryOf([])).toBeUndefined();
  });

  it("returns undefined for a non-empty list with no primary entry", () => {
    const values: readonly PrimarySourced<string>[] = [
      { value: "test.person@example.com", sources: ["google:e1"], primary: false },
    ];

    expect(primaryOf(values)).toBeUndefined();
  });

  it("returns the first primary entry when (invalidly) more than one is marked primary", () => {
    const first: PrimarySourced<string> = {
      value: "test.person@example.com",
      sources: ["google:e1"],
      primary: true,
    };
    const second: PrimarySourced<string> = {
      value: "test.person@example.org",
      sources: ["linkedin:e2"],
      primary: true,
    };

    expect(primaryOf([first, second])).toEqual(first);
  });
});

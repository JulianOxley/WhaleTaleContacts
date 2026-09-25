import { describe, expect, it } from "vitest";

import { SOURCE_KINDS } from "../../src/model/source-kind.js";
import { createSourceRecord } from "../../src/model/source-record.js";
import type { SourceKind } from "../../src/model/source-kind.js";
import type {
  NormalisedFields,
  RawFields,
  SourceRecord,
  SourceRecordId,
} from "../../src/model/source-record.js";

// Fabricated data only: example.com/.org/.net emails, +44 7700 900xxx phones,
// obviously fake names ("Ada Example", "Test Person").

describe("SOURCE_KINDS / SourceKind (criterion 1)", () => {
  it("exposes exactly linkedin, google, google-other and phone, and no others", () => {
    expect(SOURCE_KINDS).toHaveLength(4);
    expect(new Set(SOURCE_KINDS)).toEqual(
      new Set(["linkedin", "google", "google-other", "phone"]),
    );
  });

  it("is usable as a runtime enumeration (adapters/tests can loop over it)", () => {
    const seen: SourceKind[] = [];
    for (const kind of SOURCE_KINDS) {
      seen.push(kind);
    }
    expect(seen).toEqual(SOURCE_KINDS);
  });
});

describe("SourceRecord shape (criterion 2)", () => {
  const cases: Array<{ source: SourceKind; id: SourceRecordId }> = [
    { source: "linkedin", id: "linkedin:ada-example" },
    { source: "google", id: "google:contact-1" },
    { source: "google-other", id: "google-other:contact-2" },
    { source: "phone", id: "phone:row-3" },
  ];

  it.each(cases)(
    "carries source, id, raw and normalised for source kind $source",
    ({ source, id }) => {
      const raw: RawFields = { Name: "Ada Example", Email: "ada@example.com" };
      const normalised: NormalisedFields = {
        fullName: "Ada Example",
        emails: ["ada@example.com"],
        phones: [],
      };

      const record: SourceRecord = createSourceRecord({
        source,
        id,
        raw,
        normalised,
      });

      expect(record.source).toBe(source);
      expect(record.id).toBe(id);
      expect(record.raw).toEqual(raw);
      expect(record.normalised).toEqual(normalised);
    },
  );

  it("accepts raw fields with repeated values as a readonly string array (vCard-style)", () => {
    const raw: RawFields = {
      EMAIL: ["ada@example.com", "ada.example@example.org"],
      TEL: ["+44 7700 900123"],
    };
    const normalised: NormalisedFields = {
      emails: ["ada@example.com", "ada.example@example.org"],
      phones: ["+44 7700 900123"],
    };

    const record = createSourceRecord({
      source: "phone",
      id: "phone:row-4",
      raw,
      normalised,
    });

    expect(record.raw.EMAIL).toEqual([
      "ada@example.com",
      "ada.example@example.org",
    ]);
  });
});

describe("createSourceRecord immutability (criterion 3)", () => {
  it("freezes the returned record so assigning to a top-level field throws or has no effect", () => {
    const record = createSourceRecord({
      source: "linkedin",
      id: "linkedin:ada-example",
      raw: { Name: "Ada Example" },
      normalised: { fullName: "Ada Example", emails: [], phones: [] },
    });

    expect(Object.isFrozen(record)).toBe(true);
    expect(() => {
      // @ts-expect-error -- id is readonly; this checks the runtime guard too.
      record.id = "linkedin:someone-else";
    }).toThrow(TypeError);
    expect(record.id).toBe("linkedin:ada-example");
  });

  it("deep-freezes raw so a field inside it cannot be reassigned", () => {
    const record = createSourceRecord({
      source: "google",
      id: "google:contact-1",
      raw: { Name: "Ada Example" },
      normalised: { fullName: "Ada Example", emails: [], phones: [] },
    });

    expect(Object.isFrozen(record.raw)).toBe(true);
    expect(() => {
      // @ts-expect-error -- raw is Readonly<Record<...>>; checking runtime guard.
      record.raw.Name = "Someone Else";
    }).toThrow(TypeError);
    expect(record.raw.Name).toBe("Ada Example");
  });

  it("deep-freezes normalised, including array fields like emails/phones", () => {
    const record = createSourceRecord({
      source: "google-other",
      id: "google-other:contact-2",
      raw: { Email: "ada@example.com" },
      normalised: {
        fullName: "Ada Example",
        emails: ["ada@example.com"],
        phones: [],
      },
    });

    expect(Object.isFrozen(record.normalised)).toBe(true);
    expect(Object.isFrozen(record.normalised.emails)).toBe(true);
    expect(() => {
      // @ts-expect-error -- emails is readonly string[]; checking runtime guard.
      record.normalised.emails.push("someone.else@example.com");
    }).toThrow(TypeError);
    expect(() => {
      // @ts-expect-error -- normalised is readonly; checking runtime guard.
      record.normalised.fullName = "Someone Else";
    }).toThrow(TypeError);
  });
});

describe("createSourceRecord determinism (criterion 13, source-record.ts half)", () => {
  it("gives deep-equal results for two calls with equal inputs", () => {
    const input = {
      source: "google-other" as const,
      id: "google-other:contact-7" as SourceRecordId,
      raw: { Name: "Ada Example", Email: "ada@example.com" },
      normalised: {
        fullName: "Ada Example",
        emails: ["ada@example.com"],
        phones: [],
      },
    };

    const first = createSourceRecord({ ...input });
    const second = createSourceRecord({ ...input });

    expect(first).toEqual(second);
  });
});

describe("createSourceRecord defensive copying (criterion 4)", () => {
  it("is unaffected by later mutation of the caller's raw object", () => {
    const raw: Record<string, string> = { Name: "Ada Example" };
    const record = createSourceRecord({
      source: "linkedin",
      id: "linkedin:ada-example",
      raw,
      normalised: { fullName: "Ada Example", emails: [], phones: [] },
    });

    raw.Name = "Mutated Later";

    expect(record.raw.Name).toBe("Ada Example");
  });

  it("is unaffected by later mutation of an array inside the caller's raw object", () => {
    const raw: Record<string, string[]> = {
      EMAIL: ["ada@example.com"],
    };
    const record = createSourceRecord({
      source: "phone",
      id: "phone:row-5",
      raw,
      normalised: { emails: ["ada@example.com"], phones: [] },
    });

    raw.EMAIL.push("mutated-later@example.com");

    expect(record.raw.EMAIL).toEqual(["ada@example.com"]);
  });

  it("is unaffected by later mutation of the caller's normalised object", () => {
    const normalised: {
      fullName: string;
      emails: string[];
      phones: string[];
    } = {
      fullName: "Ada Example",
      emails: ["ada@example.com"],
      phones: [],
    };
    const record = createSourceRecord({
      source: "google",
      id: "google:contact-6",
      raw: { Name: "Ada Example" },
      normalised,
    });

    normalised.fullName = "Mutated Later";
    normalised.emails.push("mutated-later@example.com");

    expect(record.normalised.fullName).toBe("Ada Example");
    expect(record.normalised.emails).toEqual(["ada@example.com"]);
  });
});

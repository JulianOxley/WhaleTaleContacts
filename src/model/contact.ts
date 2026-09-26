import type { NormalisedFields } from "./source-record.js";
import type { SourcedValues } from "./provenance.js";

/**
 * The fields a `Contact` carries, in a fixed order. This is the only field
 * list: `Contact` is a mapped type over it, and `validateContact` and
 * `explain` iterate it, so a later ticket that widens the field set touches
 * this array once instead of several hard-coded lists.
 */
export const CONTACT_FIELDS = [
  "givenName",
  "familyName",
  "fullName",
  "emails",
  "phones",
  "company",
  "title",
  "linkedinUrl",
] as const;

export type ContactField = (typeof CONTACT_FIELDS)[number];

/**
 * The merged "golden" record. Every field holds every conflicting value the
 * merge has seen for it, each with its own provenance; when a field's list
 * is non-empty exactly one entry is `primary` (the value chosen by source
 * precedence, or the primary email/phone). An empty list means the contact
 * has no value for that field. Contact identity (an id) is deferred to
 * WTC-16.
 */
export type Contact = {
  readonly [K in ContactField]: SourcedValues<string>;
};

/**
 * A type-level equality test between two string-literal unions, used only to
 * assert that `ContactField` and `keyof NormalisedFields` cannot drift apart.
 * The double-conditional-through-a-generic-function form avoids the
 * distribution that a plain `X extends Y ? Y extends X : never` would suffer
 * over a union.
 */
type IsEqual<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
  ? true
  : false;

type AssertTrue<T extends true> = T;

/**
 * Compile-time only: fails to typecheck if the normalised shape a source
 * record carries (`NormalisedFields`, in source-record.ts) and the contact
 * shape (`ContactField`, above) ever list different keys.
 */
export type ContactFieldsMatchNormalisedFields = AssertTrue<
  IsEqual<ContactField, keyof NormalisedFields>
>;

function checkField(field: ContactField, entries: SourcedValues<string>): string[] {
  const problems: string[] = [];

  entries.forEach((entry, index) => {
    if (entry.sources.length === 0) {
      problems.push(`${field}[${index}]: sources is empty`);
    }
    if (entry.inferredBy !== undefined && entry.inferredBy.trim().length === 0) {
      problems.push(`${field}[${index}]: inferredBy is blank`);
    }
  });

  if (entries.length > 0) {
    const primaryCount = entries.filter((entry) => entry.primary).length;
    if (primaryCount === 0) {
      problems.push(`${field}: no entry is marked primary`);
    } else if (primaryCount > 1) {
      problems.push(`${field}: more than one entry is marked primary`);
    }
  }

  const seenValues = new Set<string>();
  const duplicateValues = new Set<string>();
  for (const entry of entries) {
    if (seenValues.has(entry.value)) {
      duplicateValues.add(entry.value);
    }
    seenValues.add(entry.value);
  }
  for (const value of duplicateValues) {
    problems.push(`${field}: duplicate value ${JSON.stringify(value)}`);
  }

  return problems;
}

/**
 * A pure validator for the invariants CKB-1 and CKB-4 place on a `Contact`.
 * For every field in `CONTACT_FIELDS`: every entry has a non-empty
 * `sources`; a non-empty list has exactly one entry marked `primary`; an
 * `inferredBy`, when present, is not blank; and no two entries in the same
 * field carry the exact same `value` (provenance for one value belongs on
 * one entry, not split across duplicates). Returns an array of problem
 * strings, each starting with the field name it concerns, empty when the
 * contact is valid.
 */
export function validateContact(contact: Contact): string[] {
  const problems: string[] = [];
  for (const field of CONTACT_FIELDS) {
    problems.push(...checkField(field, contact[field]));
  }
  return problems;
}

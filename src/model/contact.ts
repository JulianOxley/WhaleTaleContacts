import type { PrimarySourced, Sourced } from "./provenance.js";

/**
 * The merged "golden" record. Every field value carries the source record
 * id(s) it came from. A contact may keep several emails and phones; exactly
 * one of each is marked primary when there is at least one.
 */
export interface Contact {
  readonly givenName?: Sourced<string>;
  readonly familyName?: Sourced<string>;
  readonly fullName?: Sourced<string>;
  readonly emails: readonly PrimarySourced<string>[];
  readonly phones: readonly PrimarySourced<string>[];
  readonly company?: Sourced<string>;
  readonly title?: Sourced<string>;
  readonly linkedinUrl?: Sourced<string>;
}

function singleValueFieldsOf(
  contact: Contact,
): readonly { readonly name: string; readonly field: Sourced<string> | undefined }[] {
  return [
    { name: "givenName", field: contact.givenName },
    { name: "familyName", field: contact.familyName },
    { name: "fullName", field: contact.fullName },
    { name: "company", field: contact.company },
    { name: "title", field: contact.title },
    { name: "linkedinUrl", field: contact.linkedinUrl },
  ];
}

function checkPrimary(fieldName: string, entries: readonly PrimarySourced<string>[]): string[] {
  if (entries.length === 0) {
    return [];
  }
  const primaryCount = entries.filter((entry) => entry.primary).length;
  if (primaryCount === 0) {
    return [`${fieldName}: no entry is marked primary`];
  }
  if (primaryCount > 1) {
    return [`${fieldName}: more than one entry is marked primary`];
  }
  return [];
}

function checkSources(fieldName: string, entries: readonly Sourced<string>[]): string[] {
  const problems: string[] = [];
  entries.forEach((entry, index) => {
    if (entry.sources.length === 0) {
      problems.push(`${fieldName}[${index}]: sources is empty`);
    }
  });
  return problems;
}

/**
 * A pure validator for the invariants CKB-1 places on a `Contact`: when a
 * multi-valued field (emails, phones) is non-empty exactly one entry is
 * primary, and no field value is left with an empty `sources` list. Returns
 * an array of problem strings, empty when the contact is valid.
 */
export function validateContact(contact: Contact): string[] {
  const problems: string[] = [
    ...checkPrimary("emails", contact.emails),
    ...checkPrimary("phones", contact.phones),
    ...checkSources("emails", contact.emails),
    ...checkSources("phones", contact.phones),
  ];

  for (const { name, field } of singleValueFieldsOf(contact)) {
    if (field !== undefined && field.sources.length === 0) {
      problems.push(`${name}: sources is empty`);
    }
  }

  return problems;
}

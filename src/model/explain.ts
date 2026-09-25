import type { Contact } from "./contact.js";
import type { Decision } from "./decision.js";
import type { SourceRecordId } from "./source-record.js";

function sourceIdsOf(contact: Contact): ReadonlySet<SourceRecordId> {
  const ids = new Set<SourceRecordId>();

  const singleValueFields = [
    contact.givenName,
    contact.familyName,
    contact.fullName,
    contact.company,
    contact.title,
    contact.linkedinUrl,
  ];
  for (const field of singleValueFields) {
    field?.sources.forEach((id) => ids.add(id));
  }

  for (const email of contact.emails) {
    email.sources.forEach((id) => ids.add(id));
  }
  for (const phone of contact.phones) {
    phone.sources.forEach((id) => ids.add(id));
  }

  return ids;
}

/**
 * Traces a contact back to the decisions that produced it: the decisions
 * whose `sourceRecordIds` overlap any source record id cited on the contact.
 * This is how any output row is explained back to its inputs (CKB-1).
 */
export function explain(contact: Contact, decisions: readonly Decision[]): Decision[] {
  const contactSourceIds = sourceIdsOf(contact);
  return decisions.filter((decision) =>
    decision.sourceRecordIds.some((id) => contactSourceIds.has(id)),
  );
}

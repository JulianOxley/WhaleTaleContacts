import { CONTACT_FIELDS } from "./contact.js";
import type { Contact } from "./contact.js";
import type { Decision } from "./decision.js";
import type { SourceRecordId } from "./source-record.js";

function sourceIdsOf(contact: Contact): ReadonlySet<SourceRecordId> {
  const ids = new Set<SourceRecordId>();
  for (const field of CONTACT_FIELDS) {
    for (const entry of contact[field]) {
      entry.sources.forEach((id) => ids.add(id));
    }
  }
  return ids;
}

/**
 * Traces a contact back to the decisions that produced it: the decisions
 * whose `sourceRecordIds` overlap any source record id cited on the
 * contact, gathered from every entry of every field in `CONTACT_FIELDS`.
 * Matching decisions are returned in their input order, each exactly once,
 * so re-running with the same inputs gives identical output. This stays
 * contact-scoped and does not explain exclusions: an excluded record never
 * reaches a contact, and that is WTC-15's exclusion report to build.
 */
export function explain(contact: Contact, decisions: readonly Decision[]): Decision[] {
  const contactSourceIds = sourceIdsOf(contact);
  return decisions.filter((decision) =>
    decision.sourceRecordIds.some((id) => contactSourceIds.has(id)),
  );
}

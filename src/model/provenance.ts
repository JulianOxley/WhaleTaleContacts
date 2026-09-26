import type { SourceRecordId } from "./source-record.js";

/**
 * A value paired with the source record id(s) it came from. `sources` should
 * never be empty for a value actually carried on a `Contact`; that is
 * enforced by `validateContact`, not by the type.
 *
 * `inferredBy` is absent when the value was read from a source, and present
 * (and non-blank) when a rule inferred it: an "inferred with no rule id"
 * state cannot be written.
 */
export interface Sourced<T> {
  readonly value: T;
  readonly sources: readonly SourceRecordId[];
  readonly inferredBy?: string;
}

/**
 * A `Sourced` value that can be one of several (an email, a phone, or a
 * conflicting single value kept alongside others), with a flag for which one
 * is the chosen/winning value of its field.
 */
export interface PrimarySourced<T> extends Sourced<T> {
  readonly primary: boolean;
}

/**
 * All values a contact holds for one field, each with its own provenance.
 * More than one entry marked `primary` is always a problem; zero primaries
 * in a non-empty list is allowed only when every entry carries `inferredBy`
 * (a value inferred at low confidence, awaiting review). Both invariants are
 * enforced by `validateContact`, not by the type.
 */
export type SourcedValues<T> = readonly PrimarySourced<T>[];

/**
 * The primary entry of a field, or `undefined` when the field is empty, or
 * when a non-empty field legitimately has no primary because every entry
 * carries `inferredBy` (see `SourcedValues`). Pure: returns the first entry
 * marked primary, and does not validate.
 */
export function primaryOf<T>(values: SourcedValues<T>): PrimarySourced<T> | undefined {
  return values.find((entry) => entry.primary);
}

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
 * Exactly one entry is `primary` when the list is non-empty; that invariant
 * is enforced by `validateContact`, not by the type.
 */
export type SourcedValues<T> = readonly PrimarySourced<T>[];

/**
 * The primary entry of a field, or `undefined` when the field is empty (or
 * holds no primary, which `validateContact` would flag as a problem). Pure:
 * returns the first entry marked primary, and does not validate.
 */
export function primaryOf<T>(values: SourcedValues<T>): PrimarySourced<T> | undefined {
  return values.find((entry) => entry.primary);
}

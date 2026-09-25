import type { SourceRecordId } from "./source-record.js";

/**
 * A value paired with the source record id(s) it came from. `sources` should
 * never be empty for a value actually carried on a `Contact`; that is
 * enforced by `validateContact`, not by the type.
 */
export interface Sourced<T> {
  readonly value: T;
  readonly sources: readonly SourceRecordId[];
}

/**
 * A `Sourced` value that can be one of several (an email, a phone), with a
 * flag for which one is the primary.
 */
export interface PrimarySourced<T> extends Sourced<T> {
  readonly primary: boolean;
}

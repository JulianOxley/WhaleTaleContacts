import type { SourceKind } from "./source-kind.js";

/**
 * A stable id for one `SourceRecord`, prefixed with the kind it came from,
 * for example `linkedin:row-42`. *How* the key half is derived is an adapter
 * concern (WTC-12/13/14); this module only fixes the shape.
 */
export type SourceRecordId = `${SourceKind}:${string}`;

/**
 * The fields exactly as read from the export, before normalisation. CSV rows
 * carry one value per header; vCard can repeat a line (for example several
 * `EMAIL` lines), hence the `readonly string[]` alternative.
 */
export type RawFields = Readonly<Record<string, string | readonly string[]>>;

/**
 * The shape of the normalised fields a `SourceRecord` carries. The
 * normalisation *rules* (email lower-casing, phone E.164, and so on) belong
 * to later model tickets; this only fixes what a normalised record looks
 * like once those rules have run.
 */
export interface NormalisedFields {
  readonly givenName?: string;
  readonly familyName?: string;
  readonly fullName?: string;
  readonly emails: readonly string[];
  readonly phones: readonly string[];
  readonly company?: string;
  readonly title?: string;
  readonly linkedinUrl?: string;
}

/**
 * One row or card from one export, exactly as it was read, plus its
 * normalised fields. Never modified after ingest: `createSourceRecord`
 * returns a deeply frozen object.
 */
export interface SourceRecord {
  readonly source: SourceKind;
  readonly id: SourceRecordId;
  readonly raw: RawFields;
  readonly normalised: NormalisedFields;
}

export interface CreateSourceRecordInput {
  readonly source: SourceKind;
  readonly id: SourceRecordId;
  readonly raw: RawFields;
  readonly normalised: NormalisedFields;
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const key of Object.keys(value as Record<string, unknown>)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}

function cloneRaw(raw: RawFields): Record<string, string | readonly string[]> {
  const copy: Record<string, string | readonly string[]> = {};
  for (const [key, value] of Object.entries(raw)) {
    copy[key] = Array.isArray(value) ? [...value] : value;
  }
  return copy;
}

function cloneNormalised(normalised: NormalisedFields): NormalisedFields {
  return {
    ...normalised,
    emails: [...normalised.emails],
    phones: [...normalised.phones],
  };
}

/**
 * Builds a `SourceRecord`. Takes its own copy of `raw` and `normalised`, so a
 * later change to the caller's input objects never reaches the record, then
 * deeply freezes the result so it cannot be modified after creation.
 */
export function createSourceRecord(input: CreateSourceRecordInput): SourceRecord {
  const record: SourceRecord = {
    source: input.source,
    id: input.id,
    raw: cloneRaw(input.raw),
    normalised: cloneNormalised(input.normalised),
  };
  return deepFreeze(record);
}

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

/**
 * Copies one raw value. An array is copied element-by-element so the
 * record's own array is never the caller's. A value that is neither a
 * string nor a string array (off-type input, reachable only by bypassing
 * the type through `unknown`) is copied one level shallow instead of kept by
 * reference: `createSourceRecord` deep-freezes everything reachable from
 * `raw`, and without this copy that freeze would reach back into an object
 * the caller still holds and freeze it too. A string passes through
 * unchanged; primitives cannot be frozen in a way that is observable on the
 * caller's own value, so no copy is needed for them.
 */
function cloneRawValue(value: string | readonly string[]): string | readonly string[] {
  if (Array.isArray(value)) {
    return [...value];
  }
  if (typeof value === "object" && value !== null) {
    return { ...(value as object) } as unknown as string | readonly string[];
  }
  return value;
}

/**
 * Copies `raw` one entry at a time via `Object.fromEntries`, which defines
 * each property directly rather than assigning through `[]`. That matters
 * for a header literally named `__proto__`: a plain `copy[key] = value`
 * assignment would run the inherited `__proto__` setter instead of creating
 * an own property, silently dropping the header. `Object.fromEntries`
 * defines it as an ordinary own property instead, and leaves the returned
 * object's prototype as the ordinary `Object.prototype`.
 */
function cloneRaw(raw: RawFields): RawFields {
  return Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, cloneRawValue(value)]),
  ) as RawFields;
}

/**
 * Copies only the known `NormalisedFields` keys. Any extra, off-type
 * property the caller's object happens to carry is not copied, so it is
 * never reachable from the record and `deepFreeze` never touches it (a
 * plain `{ ...normalised }` spread would have carried an extra property's
 * value across by reference, and then frozen the caller's own object).
 *
 * The optional fields are only assigned when present (not `undefined`) on
 * the input, so an absent optional field stays absent as an own key on the
 * record's `normalised` (`"company" in record.normalised` is `false`)
 * rather than becoming an own key holding `undefined`. `emails` and
 * `phones` are always present, as `NormalisedFields` requires.
 */
function cloneNormalised(normalised: NormalisedFields): NormalisedFields {
  const result: { -readonly [K in keyof NormalisedFields]?: NormalisedFields[K] } & Pick<
    NormalisedFields,
    "emails" | "phones"
  > = {
    emails: [...normalised.emails],
    phones: [...normalised.phones],
  };
  if (normalised.givenName !== undefined) {
    result.givenName = normalised.givenName;
  }
  if (normalised.familyName !== undefined) {
    result.familyName = normalised.familyName;
  }
  if (normalised.fullName !== undefined) {
    result.fullName = normalised.fullName;
  }
  if (normalised.company !== undefined) {
    result.company = normalised.company;
  }
  if (normalised.title !== undefined) {
    result.title = normalised.title;
  }
  if (normalised.linkedinUrl !== undefined) {
    result.linkedinUrl = normalised.linkedinUrl;
  }
  return result;
}

/**
 * Throws unless `id` starts with `${source}:` and the key after that prefix
 * is non-blank, so a record's id always agrees with its declared source
 * kind (for example a `google` record cannot carry a `linkedin:` id).
 */
function assertIdMatchesSource(source: SourceKind, id: SourceRecordId): void {
  const prefix = `${source}:`;
  if (!id.startsWith(prefix)) {
    throw new Error(`createSourceRecord: id "${id}" must start with "${prefix}"`);
  }
  const key = id.slice(prefix.length);
  if (key.trim().length === 0) {
    throw new Error(`createSourceRecord: id "${id}" must have a non-blank key after "${prefix}"`);
  }
}

/**
 * Builds a `SourceRecord`. Validates that `id` agrees with `source`, takes
 * its own copy of `raw` and `normalised` (only the known keys, for
 * `normalised`), so a later change to the caller's input objects never
 * reaches the record and the caller's objects are never frozen, then deeply
 * freezes the result so it cannot be modified after creation.
 */
export function createSourceRecord(input: CreateSourceRecordInput): SourceRecord {
  assertIdMatchesSource(input.source, input.id);
  const record: SourceRecord = {
    source: input.source,
    id: input.id,
    raw: cloneRaw(input.raw),
    normalised: cloneNormalised(input.normalised),
  };
  return deepFreeze(record);
}

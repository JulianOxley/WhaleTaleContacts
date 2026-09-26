/**
 * The four export kinds an adapter can produce a `SourceRecord` from.
 *
 * `google-other` is Google's separately exported "Other contacts", which Gmail
 * fills automatically from mail traffic. It is kept distinct from `google`
 * because the two carry different confidence and different fields.
 */
export const SOURCE_KINDS = ["linkedin", "google", "google-other", "phone"] as const;

export type SourceKind = (typeof SOURCE_KINDS)[number];

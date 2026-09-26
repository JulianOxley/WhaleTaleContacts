/**
 * What a rule decided to do with the source records it looked at.
 */
export const OUTCOMES = [
  "merged",
  "excluded",
  "flagged-for-review",
  "inferred",
  "kept-separate",
] as const;

export type Outcome = (typeof OUTCOMES)[number];

/**
 * How sure a rule is about a decision it made.
 *
 * `high` acts automatically, `medium` goes to the review queue, and `low`
 * records the observation without acting on it.
 */
export const CONFIDENCES = ["high", "medium", "low"] as const;

export type Confidence = (typeof CONFIDENCES)[number];

/** What a confidence level means the pipeline should do. */
export type Action = "act" | "review" | "record-only";

/**
 * Maps a confidence to the action the pipeline should take, so rules do not
 * each re-implement the mapping.
 */
export function actionFor(confidence: Confidence): Action {
  switch (confidence) {
    case "high":
      return "act";
    case "medium":
      return "review";
    case "low":
      return "record-only";
  }
}

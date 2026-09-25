import type { Confidence } from "./confidence.js";
import type { Outcome } from "./outcome.js";
import type { SourceRecordId } from "./source-record.js";

/**
 * One entry per rule outcome: which rule fired, which source records it
 * looked at, what it decided, how sure it was, and a plain-English reason.
 * The decision log is how any output row is explained back to its inputs.
 *
 * `ruleId` is a plain `string` (not a closed union) so a new rule can be
 * added without editing this file.
 */
export interface Decision {
  readonly ruleId: string;
  readonly sourceRecordIds: readonly SourceRecordId[];
  readonly outcome: Outcome;
  readonly confidence: Confidence;
  readonly reason: string;
}

export interface CreateDecisionInput {
  readonly ruleId: string;
  readonly sourceRecordIds: readonly SourceRecordId[];
  readonly outcome: Outcome;
  readonly confidence: Confidence;
  readonly reason: string;
}

/**
 * Builds a `Decision`, rejecting an empty reason or an empty list of source
 * record ids: a decision that explains nothing and cites nothing is not
 * useful as a log entry.
 */
export function createDecision(input: CreateDecisionInput): Decision {
  if (input.sourceRecordIds.length === 0) {
    throw new Error("createDecision: sourceRecordIds must not be empty");
  }
  if (input.reason.trim().length === 0) {
    throw new Error("createDecision: reason must not be empty");
  }
  return Object.freeze({
    ruleId: input.ruleId,
    sourceRecordIds: Object.freeze([...input.sourceRecordIds]),
    outcome: input.outcome,
    confidence: input.confidence,
    reason: input.reason,
  });
}

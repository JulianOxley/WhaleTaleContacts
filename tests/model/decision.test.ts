import { describe, expect, it } from "vitest";

import { actionFor, CONFIDENCES } from "../../src/model/confidence.js";
import type { Confidence } from "../../src/model/confidence.js";
import { createDecision } from "../../src/model/decision.js";
import type { Decision } from "../../src/model/decision.js";
import { OUTCOMES } from "../../src/model/outcome.js";
import type { Outcome } from "../../src/model/outcome.js";
import type { SourceRecordId } from "../../src/model/source-record.js";

// Fabricated data only: example.com emails, +44 7700 900xxx phones, fictional source ids.

describe("OUTCOMES / Outcome (criterion 24, replaces criterion 8)", () => {
  it("exposes exactly merged, excluded, flagged-for-review, inferred and kept-separate, in that order", () => {
    expect(OUTCOMES).toEqual([
      "merged",
      "excluded",
      "flagged-for-review",
      "inferred",
      "kept-separate",
    ]);
  });

  it("is usable as a runtime enumeration", () => {
    const seen: Outcome[] = [];
    for (const outcome of OUTCOMES) {
      seen.push(outcome);
    }
    expect(seen).toEqual(OUTCOMES);
  });
});

describe("CONFIDENCES / Confidence (criterion 9)", () => {
  it("exposes exactly high, medium and low, and no others", () => {
    expect(CONFIDENCES).toHaveLength(3);
    expect(new Set(CONFIDENCES)).toEqual(new Set(["high", "medium", "low"]));
  });

  it("is usable as a runtime enumeration", () => {
    const seen: Confidence[] = [];
    for (const confidence of CONFIDENCES) {
      seen.push(confidence);
    }
    expect(seen).toEqual(CONFIDENCES);
  });
});

describe("actionFor (criterion 10)", () => {
  it("maps high to 'act'", () => {
    expect(actionFor("high")).toBe("act");
  });

  it("maps medium to 'review'", () => {
    expect(actionFor("medium")).toBe("review");
  });

  it("maps low to 'record-only'", () => {
    expect(actionFor("low")).toBe("record-only");
  });

  it("is pure: calling it twice with the same input gives the same result", () => {
    expect(actionFor("high")).toBe(actionFor("high"));
    expect(actionFor("medium")).toBe(actionFor("medium"));
    expect(actionFor("low")).toBe(actionFor("low"));
  });
});

describe("Decision shape (criterion 7)", () => {
  it("records ruleId, sourceRecordIds, outcome, confidence and reason", () => {
    const decision: Decision = createDecision({
      ruleId: "M1",
      sourceRecordIds: ["linkedin:ada-example", "phone:ada-mobile"],
      outcome: "merged",
      confidence: "high",
      reason: "Same email address ada@example.com on both records.",
    });

    expect(decision.ruleId).toBe("M1");
    expect(decision.sourceRecordIds).toEqual([
      "linkedin:ada-example",
      "phone:ada-mobile",
    ]);
    expect(decision.outcome).toBe("merged");
    expect(decision.confidence).toBe("high");
    expect(decision.reason).toBe(
      "Same email address ada@example.com on both records.",
    );
  });

  it("accepts every outcome and every confidence value", () => {
    for (const outcome of OUTCOMES) {
      for (const confidence of CONFIDENCES) {
        const decision = createDecision({
          ruleId: "M4",
          sourceRecordIds: ["google:test-person"],
          outcome,
          confidence,
          reason: `Exercising outcome ${outcome} at confidence ${confidence}.`,
        });
        expect(decision.outcome).toBe(outcome);
        expect(decision.confidence).toBe(confidence);
      }
    }
  });

  it("rejects an empty sourceRecordIds list", () => {
    expect(() =>
      createDecision({
        ruleId: "M1",
        sourceRecordIds: [],
        outcome: "merged",
        confidence: "high",
        reason: "Some reason.",
      }),
    ).toThrow();
  });

  it("rejects a blank reason", () => {
    expect(() =>
      createDecision({
        ruleId: "M1",
        sourceRecordIds: ["linkedin:ada-example"],
        outcome: "merged",
        confidence: "high",
        reason: "",
      }),
    ).toThrow();
  });

  it("rejects a reason that is only whitespace", () => {
    expect(() =>
      createDecision({
        ruleId: "M1",
        sourceRecordIds: ["linkedin:ada-example"],
        outcome: "merged",
        confidence: "high",
        reason: "   ",
      }),
    ).toThrow();
  });

  it("rejects an empty ruleId (criterion 22, finding 6)", () => {
    expect(() =>
      createDecision({
        ruleId: "",
        sourceRecordIds: ["linkedin:ada-example"],
        outcome: "merged",
        confidence: "high",
        reason: "Some reason.",
      }),
    ).toThrow();
  });

  it("rejects a ruleId that is only whitespace (criterion 22, finding 6)", () => {
    expect(() =>
      createDecision({
        ruleId: "   ",
        sourceRecordIds: ["linkedin:ada-example"],
        outcome: "merged",
        confidence: "high",
        reason: "Some reason.",
      }),
    ).toThrow();
  });

  it("is unaffected by later mutation of the caller's sourceRecordIds array (finding 6)", () => {
    const sourceRecordIds: SourceRecordId[] = ["linkedin:ada-example", "phone:ada-mobile"];
    const decision = createDecision({
      ruleId: "M1",
      sourceRecordIds,
      outcome: "merged",
      confidence: "high",
      reason: "Same email address on both records.",
    });

    sourceRecordIds.push("google:extra-record");
    sourceRecordIds[0] = "google:mutated-in-place";

    expect(decision.sourceRecordIds).toEqual([
      "linkedin:ada-example",
      "phone:ada-mobile",
    ]);
  });

  it("returns a frozen decision", () => {
    const decision = createDecision({
      ruleId: "M2",
      sourceRecordIds: ["phone:ada-mobile"],
      outcome: "merged",
      confidence: "high",
      reason: "Same phone number +44 7700 900123 on both records.",
    });

    expect(Object.isFrozen(decision)).toBe(true);
    expect(() => {
      // @ts-expect-error -- reason is readonly; checking runtime guard too.
      decision.reason = "Mutated reason.";
    }).toThrow(TypeError);
  });
});

describe("Decision determinism (criterion 13, decision.ts half)", () => {
  it("gives deep-equal results for two calls with equal inputs", () => {
    const input = {
      ruleId: "M3",
      sourceRecordIds: ["linkedin:ada-example"] as const,
      outcome: "inferred" as const,
      confidence: "low" as const,
      reason: "Same LinkedIn profile URL inferred from a partial match.",
    };

    const first = createDecision(input);
    const second = createDecision({ ...input });

    expect(first).toEqual(second);
  });
});

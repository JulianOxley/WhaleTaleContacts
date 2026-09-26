import { globSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import { scanPurityViolations } from "./purity-scan.js";

// This test scans every src/model source file as text, parsed by
// purity-scan.ts (the TypeScript compiler API). It deliberately does not
// import anything from src/model, and it must never be moved into src/model
// (criterion 12: the model itself must stay pure; this test's own imports of
// node:fs / node:path must not count against it).
//
// Criterion 12 (rewritten by the addendum) is an allowlist: every module
// specifier under src/model must be a relative specifier that resolves
// inside src/model, or the one allowed external import,
// `import { createHash } from "node:crypto"`. Criterion 13 bans clocks,
// randomness and other non-deterministic globals. purity-scan.ts enforces
// both, plus the review-round-2 findings (criteria 25 to 29, 31); see
// purity-scan.test.ts for the scanner's own self-tests.
//
// Criterion 31 (review round 2, finding 8): scan every *.ts, *.mts, *.cts,
// *.js, *.mjs and *.cjs file under src/model, not just *.ts.

const MODEL_ROOT = join(process.cwd(), "src", "model");

const MODEL_FILE_GLOBS = ["**/*.ts", "**/*.mts", "**/*.cts", "**/*.js", "**/*.mjs", "**/*.cjs"];

const MODEL_FILES = Array.from(
  new Set(
    MODEL_FILE_GLOBS.flatMap((pattern) => globSync(pattern, { cwd: MODEL_ROOT })),
  ),
).map((file) => join(MODEL_ROOT, file));

describe("src/model purity and determinism (criteria 12, 13, 25 to 29, 31)", () => {
  it("finds at least one source file under src/model to scan", () => {
    // Guards against the scan silently passing over an empty/misconfigured glob.
    expect(MODEL_FILES.length).toBeGreaterThan(0);
  });

  for (const filePath of MODEL_FILES) {
    const modelRelativePath = relative(MODEL_ROOT, filePath);
    const displayPath = relative(process.cwd(), filePath);

    it(`${displayPath} has no purity or determinism violations`, () => {
      const source = readFileSync(filePath, "utf8");
      const violations = scanPurityViolations(source, { modelRelativePath });
      expect(violations).toEqual([]);
    });
  }
});

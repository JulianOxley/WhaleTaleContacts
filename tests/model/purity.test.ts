import { globSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import { scanPurityViolations } from "./purity-scan.js";

// This test scans src/model/**/*.ts as text, parsed by purity-scan.ts (the
// TypeScript compiler API). It deliberately does not import anything from
// src/model, and it must never be moved into src/model (criterion 12: the
// model itself must stay pure; this test's own imports of node:fs /
// node:path must not count against it).
//
// Criterion 12 (rewritten by the addendum) is an allowlist: every module
// specifier under src/model must be a relative specifier that resolves
// inside src/model, or the one allowed external import,
// `import { createHash } from "node:crypto"`. Criterion 13 bans clocks,
// randomness and other non-deterministic globals. purity-scan.ts enforces
// both; see purity-scan.test.ts for the scanner's own self-tests.

const MODEL_ROOT = join(process.cwd(), "src", "model");

const MODEL_FILES = globSync("**/*.ts", { cwd: MODEL_ROOT }).map((file) => join(MODEL_ROOT, file));

describe("src/model purity and determinism (criteria 12, 13)", () => {
  it("finds at least one .ts file under src/model to scan", () => {
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

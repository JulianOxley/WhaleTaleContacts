import { globSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// This test scans src/model/**/*.ts as plain text. It deliberately does not
// import anything from src/model, and it must never be moved into src/model
// (criterion 12: the model itself must stay pure, and this test's own
// imports of node:fs / node:path must not count against it).

const MODEL_ROOT = join(process.cwd(), "src", "model");

const MODEL_FILES = globSync("**/*.ts", { cwd: MODEL_ROOT }).map((file) =>
  join(MODEL_ROOT, file),
);

// Criterion 12: no file or network access, and no reaching across the
// src/ingest or src/review boundary.
const FORBIDDEN_IMPORT_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  // Any import/require of a Node built-in written with the "node:" protocol
  // prefix, e.g. `from "node:fs"`, `from "node:fs/promises"`.
  { name: "node: protocol import", pattern: /\bfrom\s+["']node:[^"']+["']/ },
  { name: "require('node:...')", pattern: /\brequire\(\s*["']node:[^"']+["']\s*\)/ },
  // Bare specifiers for the specific I/O modules the criterion names.
  ...[
    "fs",
    "fs/promises",
    "path",
    "http",
    "https",
    "net",
    "dgram",
    "child_process",
  ].map((moduleName) => ({
    name: `bare "${moduleName}" import`,
    pattern: new RegExp(
      `\\b(from|require\\()\\s*["']${moduleName.replace("/", "\\/")}["']`,
    ),
  })),
  // Reaching across the ingest/review boundary.
  { name: "import from src/ingest", pattern: /src\/ingest/ },
  { name: "import from src/review", pattern: /src\/review/ },
];

// Network access via fetch (global or via globalThis).
const FETCH_CALL_PATTERN = /\bfetch\s*\(/;

// Criterion 13: no clocks or randomness anywhere in the model.
const NON_DETERMINISTIC_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "Date.now()", pattern: /\bDate\.now\s*\(/ },
  { name: "new Date()", pattern: /\bnew\s+Date\s*\(/ },
  { name: "Math.random()", pattern: /\bMath\.random\s*\(/ },
  { name: "crypto.randomUUID()", pattern: /\bcrypto\.randomUUID\s*\(/ },
];

describe("src/model purity (criterion 12)", () => {
  it("finds at least one .ts file under src/model to scan", () => {
    // Guards against the scan silently passing over an empty/misconfigured glob.
    expect(MODEL_FILES.length).toBeGreaterThan(0);
  });

  for (const filePath of MODEL_FILES) {
    const relativePath = filePath.slice(process.cwd().length + 1);

    describe(relativePath, () => {
      const source = readFileSync(filePath, "utf8");

      for (const { name, pattern } of FORBIDDEN_IMPORT_PATTERNS) {
        it(`does not contain a forbidden import: ${name}`, () => {
          expect(pattern.test(source)).toBe(false);
        });
      }

      it("does not call fetch", () => {
        expect(FETCH_CALL_PATTERN.test(source)).toBe(false);
      });
    });
  }
});

describe("src/model determinism, no clocks or randomness (criterion 13)", () => {
  for (const filePath of MODEL_FILES) {
    const relativePath = filePath.slice(process.cwd().length + 1);

    describe(relativePath, () => {
      const source = readFileSync(filePath, "utf8");

      for (const { name, pattern } of NON_DETERMINISTIC_PATTERNS) {
        it(`does not use ${name}`, () => {
          expect(pattern.test(source)).toBe(false);
        });
      }
    });
  }
});

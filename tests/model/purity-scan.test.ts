import { describe, expect, it } from "vitest";

import { scanPurityViolations } from "./purity-scan.js";

// Self-tests for the purity scanner itself (WTC-11 addendum, "Test
// requirements that close the findings", finding 1). Every sample listed
// there is exercised here, on inline strings only -- this file never reads
// src/model.

describe("purity scanner: forbidden imports", () => {
  it('flags `import fs from "fs"`', () => {
    expect(scanPurityViolations(`import fs from "fs";`).length).toBeGreaterThan(0);
  });

  it('flags a side-effect `import "node:fs"`', () => {
    expect(scanPurityViolations(`import "node:fs";`).length).toBeGreaterThan(0);
  });

  it('flags `export { x } from "fs"`', () => {
    expect(scanPurityViolations(`export { x } from "fs";`).length).toBeGreaterThan(0);
  });

  it('flags `await import("fs")`', () => {
    const source = `async function run() { await import("fs"); }`;
    expect(scanPurityViolations(source).length).toBeGreaterThan(0);
  });

  it('flags `import("node:fs")`', () => {
    expect(scanPurityViolations(`import("node:fs");`).length).toBeGreaterThan(0);
  });

  it("flags a dynamic import with a template literal specifier: import(`fs`)", () => {
    expect(scanPurityViolations("import(`fs`);").length).toBeGreaterThan(0);
  });

  it("flags a dynamic import with a non-literal specifier: import(name)", () => {
    const source = `const name = "fs"; import(name);`;
    expect(scanPurityViolations(source).length).toBeGreaterThan(0);
  });

  it('flags `require("path")`', () => {
    expect(scanPurityViolations(`const p = require("path");`).length).toBeGreaterThan(0);
  });

  it('flags `import x = require("http")`', () => {
    expect(scanPurityViolations(`import x = require("http");`).length).toBeGreaterThan(0);
  });

  it('flags `import os from "os"`', () => {
    expect(scanPurityViolations(`import os from "os";`).length).toBeGreaterThan(0);
  });

  it('flags `import { request } from "undici"`', () => {
    expect(scanPurityViolations(`import { request } from "undici";`).length).toBeGreaterThan(0);
  });

  it.each([
    "fs/promises",
    "node:fs/promises",
    "path",
    "http",
    "https",
    "net",
    "dgram",
    "child_process",
    "worker_threads",
  ])("flags a static import of %s", (moduleName) => {
    const violations = scanPurityViolations(`import mod from "${moduleName}";`);
    expect(violations.length).toBeGreaterThan(0);
  });

  it('flags `import { randomUUID } from "crypto"` (bare specifier)', () => {
    expect(
      scanPurityViolations(`import { randomUUID } from "crypto";`).length,
    ).toBeGreaterThan(0);
  });

  it('flags `import { randomUUID } from "node:crypto"` even though node:crypto is allowlisted', () => {
    expect(
      scanPurityViolations(`import { randomUUID } from "node:crypto";`).length,
    ).toBeGreaterThan(0);
  });

  it('flags `import * as c from "node:crypto"` (namespace import of crypto)', () => {
    expect(scanPurityViolations(`import * as c from "node:crypto";`).length).toBeGreaterThan(0);
  });

  it('flags a relative import that leaves src/model: "../ingest/csv.js"', () => {
    expect(
      scanPurityViolations(`import { X } from "../ingest/csv.js";`).length,
    ).toBeGreaterThan(0);
  });

  it('flags a relative import that leaves src/model: "../review/queue.js"', () => {
    expect(
      scanPurityViolations(`import { X } from "../review/queue.js";`).length,
    ).toBeGreaterThan(0);
  });

  it('flags a relative import that leaves src/model: "../../src/ingest/x.js"', () => {
    expect(
      scanPurityViolations(`import { X } from "../../src/ingest/x.js";`).length,
    ).toBeGreaterThan(0);
  });
});

describe("purity scanner: forbidden identifiers and calls", () => {
  it("flags fetch(...)", () => {
    expect(scanPurityViolations(`fetch("https://example.com");`).length).toBeGreaterThan(0);
  });

  it("flags `const f = fetch`", () => {
    expect(scanPurityViolations(`const f = fetch;`).length).toBeGreaterThan(0);
  });

  it("flags `globalThis.fetch`", () => {
    expect(scanPurityViolations(`const f = globalThis.fetch;`).length).toBeGreaterThan(0);
  });

  it('flags `globalThis["fetch"]`', () => {
    expect(scanPurityViolations(`const f = globalThis["fetch"];`).length).toBeGreaterThan(0);
  });

  it.each([
    "globalThis",
    "window",
    "self",
    "global",
    "process",
    "require",
    "eval",
    "Function",
    "XMLHttpRequest",
    "WebSocket",
  ])("flags a bare reference to %s", (identifierName) => {
    const violations = scanPurityViolations(`const captured = ${identifierName};`);
    expect(violations.length).toBeGreaterThan(0);
  });

  it("flags Date.now()", () => {
    expect(scanPurityViolations(`const now = Date.now();`).length).toBeGreaterThan(0);
  });

  it("flags new Date()", () => {
    expect(scanPurityViolations(`const now = new Date();`).length).toBeGreaterThan(0);
  });

  it("flags Date() called without new", () => {
    expect(scanPurityViolations(`const now = Date();`).length).toBeGreaterThan(0);
  });

  it("flags any reference to the Date identifier", () => {
    expect(scanPurityViolations(`const D = Date;`).length).toBeGreaterThan(0);
  });

  it("flags performance.now()", () => {
    expect(scanPurityViolations(`const now = performance.now();`).length).toBeGreaterThan(0);
  });

  it("flags any reference to performance", () => {
    expect(scanPurityViolations(`const p = performance;`).length).toBeGreaterThan(0);
  });

  it("flags Math.random()", () => {
    expect(scanPurityViolations(`const r = Math.random();`).length).toBeGreaterThan(0);
  });

  it("flags crypto.randomUUID()", () => {
    expect(scanPurityViolations(`const id = crypto.randomUUID();`).length).toBeGreaterThan(0);
  });

  it("flags crypto.getRandomValues(...)", () => {
    const source = `crypto.getRandomValues(new Uint8Array(1));`;
    expect(scanPurityViolations(source).length).toBeGreaterThan(0);
  });

  it("flags a bare reference to the global crypto", () => {
    expect(scanPurityViolations(`const c = crypto;`).length).toBeGreaterThan(0);
  });
});

describe("purity scanner: allowed samples (must not be flagged)", () => {
  it('does not flag `import type { X } from "./x.js"`', () => {
    expect(scanPurityViolations(`import type { X } from "./x.js";`)).toEqual([]);
  });

  it('does not flag `import { Y } from "./sub/y.js"`', () => {
    expect(scanPurityViolations(`import { Y } from "./sub/y.js";`)).toEqual([]);
  });

  it('does not flag the allowlisted `import { createHash } from "node:crypto"`', () => {
    expect(scanPurityViolations(`import { createHash } from "node:crypto";`)).toEqual([]);
  });

  it("does not flag forbidden text that appears only in a line comment", () => {
    const source = `// fetch(); Date.now(); require("fs"); Math.random(); crypto.randomUUID();`;
    expect(scanPurityViolations(source)).toEqual([]);
  });

  it("does not flag forbidden text that appears only in a block comment", () => {
    const source = `/* import fs from "fs"; new Date(); performance.now(); */`;
    expect(scanPurityViolations(source)).toEqual([]);
  });

  it("does not flag forbidden text inside a string literal", () => {
    const source = `const reason = 'no Date() here, and no require("fs") either';`;
    expect(scanPurityViolations(source)).toEqual([]);
  });

  it("does not flag a property access named .date", () => {
    const source = `const record = { date: 1 }; const x = record.date;`;
    expect(scanPurityViolations(source)).toEqual([]);
  });

  it("does not flag an object literal key named fetch", () => {
    expect(scanPurityViolations(`const obj = { fetch: 1 };`)).toEqual([]);
  });

  it("does not flag ordinary pure model code", () => {
    const source = `
      export interface Widget {
        readonly id: string;
        readonly name: string;
      }

      export function describeWidget(widget: Widget): string {
        return \`Widget \${widget.id}: \${widget.name}\`;
      }
    `;
    expect(scanPurityViolations(source)).toEqual([]);
  });
});

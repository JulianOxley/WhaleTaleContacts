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

describe("purity scanner: absolute module specifiers (criterion 25, review round 2 finding 1)", () => {
  it('flags a POSIX absolute specifier: import x from "/abs/src/ingest/x.js"', () => {
    expect(
      scanPurityViolations(`import x from "/abs/src/ingest/x.js";`).length,
    ).toBeGreaterThan(0);
  });

  it('flags a Windows drive-letter specifier with a backslash: "C:\\\\Users\\\\x\\\\file.js"', () => {
    const source = `import x from "C:\\\\Users\\\\x\\\\file.js";`;
    expect(scanPurityViolations(source).length).toBeGreaterThan(0);
  });

  it('flags a Windows drive-letter specifier with a forward slash: "C:/Users/x/file.js"', () => {
    expect(
      scanPurityViolations(`import x from "C:/Users/x/file.js";`).length,
    ).toBeGreaterThan(0);
  });

  it('flags a UNC specifier: "\\\\\\\\server\\\\share\\\\file.js"', () => {
    const source = `import x from "\\\\\\\\server\\\\share\\\\file.js";`;
    expect(scanPurityViolations(source).length).toBeGreaterThan(0);
  });

  it('flags a file: URL specifier: "file:///abs/src/ingest/x.js"', () => {
    expect(
      scanPurityViolations(`import x from "file:///abs/src/ingest/x.js";`).length,
    ).toBeGreaterThan(0);
  });

  it("never treats an absolute specifier as resolving inside src/model, even at the model root", () => {
    // A relative-looking resolution would otherwise land back inside
    // src/model; the leading "/" must still make it a violation.
    const violations = scanPurityViolations(`import x from "/contact.js";`, {
      modelRelativePath: "contact.ts",
    });
    expect(violations.length).toBeGreaterThan(0);
  });
});

describe("purity scanner: shorthand property references (criterion 26, review round 2 finding 2)", () => {
  it.each(["fetch", "Date", "crypto"])(
    "flags the shorthand property `{ %s }` as a reference",
    (identifierName) => {
      const violations = scanPurityViolations(`const obj = { ${identifierName} };`);
      expect(violations.length).toBeGreaterThan(0);
    },
  );

  it("does not flag a property name in `obj.fetch`", () => {
    const source = `const obj = { fetch: 1 }; const x = obj.fetch;`;
    expect(scanPurityViolations(source)).toEqual([]);
  });

  it("does not flag a property key `{ fetch: 1 }` in an object literal", () => {
    expect(scanPurityViolations(`const obj = { fetch: 1 };`)).toEqual([]);
  });

  it("does not flag a method named fetch", () => {
    expect(scanPurityViolations(`const obj = { fetch() { return 1; } };`)).toEqual([]);
  });

  it("does not flag a declared function named fetch (shadowing)", () => {
    expect(scanPurityViolations(`function fetch() { return 1; }`)).toEqual([]);
  });

  it("does not flag a declared local variable named fetch (shadowing)", () => {
    expect(scanPurityViolations(`const fetch = 1;`)).toEqual([]);
  });
});

describe("purity scanner: Math.random in every shape (criterion 27, review round 2 finding 3)", () => {
  it("flags an uncalled reference to Math.random", () => {
    expect(scanPurityViolations(`const r = Math.random;`).length).toBeGreaterThan(0);
  });

  it("flags a call to Math.random()", () => {
    expect(scanPurityViolations(`const r = Math.random();`).length).toBeGreaterThan(0);
  });

  it('flags element access Math["random"]', () => {
    expect(scanPurityViolations(`const r = Math["random"];`).length).toBeGreaterThan(0);
  });

  it("flags destructuring random from Math: const { random } = Math", () => {
    expect(scanPurityViolations(`const { random } = Math;`).length).toBeGreaterThan(0);
  });

  it("does not flag Math.max", () => {
    expect(scanPurityViolations(`const m = Math.max(1, 2);`)).toEqual([]);
  });

  it("does not flag Math.floor", () => {
    expect(scanPurityViolations(`const m = Math.floor(1.5);`)).toEqual([]);
  });
});

describe("purity scanner: extended identifier/meta/method bans (criterion 28, review round 2 finding 4)", () => {
  it("flags a reference to Intl", () => {
    expect(scanPurityViolations(`const nf = Intl.NumberFormat;`).length).toBeGreaterThan(0);
  });

  it("flags a reference to console", () => {
    expect(scanPurityViolations(`console.log("x");`).length).toBeGreaterThan(0);
  });

  it.each(["setTimeout", "setInterval", "setImmediate", "queueMicrotask"])(
    "flags a call to %s",
    (name) => {
      expect(scanPurityViolations(`${name}(() => {}, 0);`).length).toBeGreaterThan(0);
    },
  );

  it("flags `new WeakRef(...)`", () => {
    expect(scanPurityViolations(`const w = new WeakRef({});`).length).toBeGreaterThan(0);
  });

  it("flags `new FinalizationRegistry(...)`", () => {
    expect(
      scanPurityViolations(`const r = new FinalizationRegistry(() => {});`).length,
    ).toBeGreaterThan(0);
  });

  it("flags the import.meta meta-property", () => {
    expect(scanPurityViolations(`const u = import.meta.url;`).length).toBeGreaterThan(0);
  });

  it.each([
    "toLocaleString",
    "toLocaleDateString",
    "toLocaleTimeString",
    "localeCompare",
    "toLocaleLowerCase",
    "toLocaleUpperCase",
  ])("flags the method call x.%s(...)", (methodName) => {
    const args = methodName === "localeCompare" ? '"y"' : "";
    expect(
      scanPurityViolations(`const s = x.${methodName}(${args});`).length,
    ).toBeGreaterThan(0);
  });

  it('flags element access to a banned method name: x["toLocaleString"]()', () => {
    expect(scanPurityViolations(`const s = x["toLocaleString"]();`).length).toBeGreaterThan(0);
  });

  it("does not flag an ordinary method call like x.toString()", () => {
    expect(scanPurityViolations(`const s = x.toString();`)).toEqual([]);
  });

  it("flags email.toLocaleLowerCase() (final review pass extension of criterion 28)", () => {
    expect(
      scanPurityViolations(`const e = email.toLocaleLowerCase();`).length,
    ).toBeGreaterThan(0);
  });

  it("flags name.toLocaleUpperCase() (final review pass extension of criterion 28)", () => {
    expect(
      scanPurityViolations(`const n = name.toLocaleUpperCase();`).length,
    ).toBeGreaterThan(0);
  });

  it('flags element access to a banned method name: s["toLocaleLowerCase"]()', () => {
    expect(scanPurityViolations(`const l = s["toLocaleLowerCase"]();`).length).toBeGreaterThan(
      0,
    );
  });

  it("does not flag plain toLowerCase()", () => {
    expect(scanPurityViolations(`const l = email.toLowerCase();`)).toEqual([]);
  });

  it("does not flag plain toUpperCase()", () => {
    expect(scanPurityViolations(`const u = name.toUpperCase();`)).toEqual([]);
  });
});

describe("purity scanner: node:crypto allowlist, exact clause only (criterion 29, review round 2 finding 5)", () => {
  it("flags an aliased import: import { createHash as h } from \"node:crypto\"", () => {
    expect(
      scanPurityViolations(`import { createHash as h } from "node:crypto";`).length,
    ).toBeGreaterThan(0);
  });

  it(
    "flags the guard-testing alias case: import { randomBytes as createHash } from " +
      '"node:crypto" (local name matches, imported name does not)',
    () => {
      expect(
        scanPurityViolations(
          `import { randomBytes as createHash } from "node:crypto";`,
        ).length,
      ).toBeGreaterThan(0);
    },
  );

  it('flags an extra binding: import { createHash, randomBytes } from "node:crypto"', () => {
    expect(
      scanPurityViolations(`import { createHash, randomBytes } from "node:crypto";`).length,
    ).toBeGreaterThan(0);
  });

  it('flags a default import alongside the named one: import crypto, { createHash } from "node:crypto"', () => {
    expect(
      scanPurityViolations(`import crypto, { createHash } from "node:crypto";`).length,
    ).toBeGreaterThan(0);
  });

  it('flags an `import type` of createHash: import type { createHash } from "node:crypto"', () => {
    expect(
      scanPurityViolations(`import type { createHash } from "node:crypto";`).length,
    ).toBeGreaterThan(0);
  });

  it('flags a type-only named binding: import { type createHash } from "node:crypto"', () => {
    expect(
      scanPurityViolations(`import { type createHash } from "node:crypto";`).length,
    ).toBeGreaterThan(0);
  });

  it('flags export-from of createHash: export { createHash } from "node:crypto"', () => {
    expect(
      scanPurityViolations(`export { createHash } from "node:crypto";`).length,
    ).toBeGreaterThan(0);
  });

  it("resolves a relative import against the file's own subdirectory: rules/m1/rule.ts -> ../../contact.js is inside", () => {
    const violations = scanPurityViolations(`import { Contact } from "../../contact.js";`, {
      modelRelativePath: "rules/m1/rule.ts",
    });
    expect(violations).toEqual([]);
  });

  it("resolves a relative import against the file's own subdirectory: rules/m1/rule.ts -> ../../../ingest/x.js is outside", () => {
    const violations = scanPurityViolations(`import { X } from "../../../ingest/x.js";`, {
      modelRelativePath: "rules/m1/rule.ts",
    });
    expect(violations.length).toBeGreaterThan(0);
  });
});

describe("purity scanner: Date is not flagged in type-only positions (criterion 31, review round 2 finding 8)", () => {
  it("does not flag `let d: Date;`", () => {
    expect(scanPurityViolations(`let d: Date;`)).toEqual([]);
  });

  it("does not flag a function-type parameter annotation: `let f: (x: Date) => void;`", () => {
    expect(scanPurityViolations(`let f: (x: Date) => void;`)).toEqual([]);
  });

  it("does not flag `type T = Date;`", () => {
    expect(scanPurityViolations(`type T = Date;`)).toEqual([]);
  });

  it("still flags Date used in expression position alongside a type-only use", () => {
    const violations = scanPurityViolations(`let d: Date; const now = Date.now();`);
    expect(violations.length).toBeGreaterThan(0);
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

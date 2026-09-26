// A static-analysis helper for the src/model purity test (criteria 12 and 13,
// as rewritten by the WTC-11 addendum, and criteria 25-29 and 31 from the
// second review round). It parses TypeScript source with the TypeScript
// compiler API, so matches never fall inside a comment or a string literal,
// and reports every purity/determinism violation it finds as a plain-English
// string. It performs no I/O of its own: callers (the tests) are responsible
// for reading files.
//
// This file lives under tests/, never under src/model, precisely so that the
// scanner itself is never a candidate for the purity scan it implements.

import * as ts from "typescript";
import { posix } from "node:path";

export interface PurityScanOptions {
  /**
   * The path of the file being scanned, relative to src/model (for example
   * "contact.ts", or "rules/m1/rule.ts" for a file in a subdirectory). Used
   * only to resolve relative import specifiers against a conceptual location
   * inside src/model; no filesystem access happens here. Defaults to a
   * virtual file at the root of src/model.
   */
  modelRelativePath?: string;
}

const MODEL_ROOT = "src/model";

// "Any reference" identifiers: flagged wherever they appear in expression
// position (i.e. not as a declared name, a property/key name, or a
// type-only reference). Criterion 28 adds Intl, console, the timer/microtask
// globals, WeakRef and FinalizationRegistry to the original list.
const FORBIDDEN_IDENTIFIERS = new Set([
  "fetch",
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
  "Date",
  "performance",
  "crypto",
  "Intl",
  "console",
  "setTimeout",
  "setInterval",
  "setImmediate",
  "queueMicrotask",
  "WeakRef",
  "FinalizationRegistry",
]);

// Property/element-access names that are banned regardless of the object
// they are accessed on (criterion 28's method list).
const BANNED_MEMBER_NAMES = new Set([
  "toLocaleString",
  "toLocaleDateString",
  "toLocaleTimeString",
  "localeCompare",
]);

const ALLOWED_EXTERNAL_SPECIFIER = "node:crypto";
const ALLOWED_EXTERNAL_NAMED_IMPORT = "createHash";

// Absolute specifiers (criterion 25): a POSIX absolute path, a Windows drive
// path (C:\... or C:/...), a UNC path (\\server\...), or a file: URL. These
// are never treated as "inside src/model", regardless of what they resolve
// to on disk.
const WINDOWS_OR_UNC_OR_FILE_URL = /^([a-zA-Z]:[\\/]|\\\\|file:)/;

function isAbsoluteSpecifier(specifier: string): boolean {
  return specifier.startsWith("/") || WINDOWS_OR_UNC_OR_FILE_URL.test(specifier);
}

function containingDirFor(modelRelativePath: string): string {
  const full = posix.normalize(posix.join(MODEL_ROOT, modelRelativePath));
  return posix.dirname(full);
}

function resolvesInsideModel(specifier: string, containingDir: string): boolean {
  const resolved = posix.normalize(posix.join(containingDir, specifier));
  return resolved === MODEL_ROOT || resolved.startsWith(`${MODEL_ROOT}/`);
}

/**
 * True only for the one allowed external import shape: a named,
 * non-type-only import of exactly `createHash`, with no alias, and nothing
 * else in the import clause (no default import alongside it, no other named
 * bindings, not a namespace import, not `import type`).
 */
function isCreateHashOnlyImportClause(importClause: ts.ImportClause | undefined): boolean {
  if (!importClause) return false;
  if (importClause.name) return false;
  if (importClause.isTypeOnly) return false;
  const bindings = importClause.namedBindings;
  if (!bindings || !ts.isNamedImports(bindings)) return false;
  if (bindings.elements.length !== 1) return false;
  const [element] = bindings.elements;
  if (element.propertyName) return false;
  if (element.isTypeOnly) return false;
  return element.name.text === ALLOWED_EXTERNAL_NAMED_IMPORT;
}

function literalTextOf(node: ts.Expression | undefined): string | undefined {
  if (!node) return undefined;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return undefined;
}

/**
 * True when `node` sits in a position that only names something (a
 * declaration's name, a binding's property name, an object literal's
 * property key, ...) rather than referencing the identifier's value. A
 * shorthand property assignment (`{ fetch }`) is deliberately NOT exempt
 * here: it both names the key and references the value (criterion 26).
 */
function isNameOnlyPosition(node: ts.Identifier, parent: ts.Node): boolean {
  if (ts.isShorthandPropertyAssignment(parent) && parent.name === node) {
    return false;
  }
  if ("name" in parent && (parent as { name?: ts.Node }).name === node) {
    return true;
  }
  if ("propertyName" in parent && (parent as { propertyName?: ts.Node }).propertyName === node) {
    return true;
  }
  return false;
}

/** True for `Date` in `let d: Date`, `(x: Date) => void`, `type T = Date` (criterion 31). */
function isTypeOnlyReference(node: ts.Identifier, parent: ts.Node): boolean {
  return ts.isTypeReferenceNode(parent) && parent.typeName === node;
}

export function scanPurityViolations(source: string, options: PurityScanOptions = {}): string[] {
  const modelRelativePath = options.modelRelativePath ?? "virtual.ts";
  const containingDir = containingDirFor(modelRelativePath);
  const violations: string[] = [];

  const fileName = modelRelativePath.endsWith(".ts") ? modelRelativePath : `${modelRelativePath}.ts`;
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TS,
  );

  function reportSpecifier(
    contextLabel: string,
    specifierText: string,
    importClauseForAllowlist: ts.ImportClause | undefined,
  ): void {
    if (isAbsoluteSpecifier(specifierText)) {
      violations.push(
        `${contextLabel}: absolute import "${specifierText}" is never inside src/model`,
      );
      return;
    }

    if (specifierText.startsWith(".")) {
      if (!resolvesInsideModel(specifierText, containingDir)) {
        violations.push(
          `${contextLabel}: relative import "${specifierText}" resolves outside src/model`,
        );
      }
      return;
    }

    if (
      specifierText === ALLOWED_EXTERNAL_SPECIFIER &&
      isCreateHashOnlyImportClause(importClauseForAllowlist)
    ) {
      return;
    }

    violations.push(`${contextLabel}: external import "${specifierText}" is not allowlisted`);
  }

  function checkMathRandomDestructure(node: ts.VariableDeclaration): void {
    if (!node.initializer || !ts.isIdentifier(node.initializer) || node.initializer.text !== "Math") {
      return;
    }
    if (!ts.isObjectBindingPattern(node.name)) return;
    for (const element of node.name.elements) {
      let propName: string | undefined;
      if (element.propertyName) {
        propName = ts.isIdentifier(element.propertyName)
          ? element.propertyName.text
          : literalTextOf(element.propertyName as unknown as ts.Expression);
      } else if (ts.isIdentifier(element.name)) {
        propName = element.name.text;
      }
      if (propName === "random") {
        violations.push('destructuring "random" from Math');
      }
    }
  }

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node)) {
      const specifier = node.moduleSpecifier;
      if (ts.isStringLiteral(specifier)) {
        reportSpecifier("import declaration", specifier.text, node.importClause);
      } else {
        violations.push("import declaration: non-literal module specifier");
      }
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      const specifier = node.moduleSpecifier;
      if (ts.isStringLiteral(specifier)) {
        reportSpecifier("export-from declaration", specifier.text, undefined);
      } else {
        violations.push("export-from declaration: non-literal module specifier");
      }
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      const text = literalTextOf(node.moduleReference.expression);
      if (text !== undefined) {
        reportSpecifier("import ... = require(...)", text, undefined);
      } else {
        violations.push("import ... = require(...): non-literal module specifier");
      }
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const text = literalTextOf(node.arguments[0]);
      if (text !== undefined) {
        reportSpecifier("dynamic import()", text, undefined);
      } else {
        violations.push("dynamic import(): non-literal module specifier");
      }
    } else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "require") {
      const text = literalTextOf(node.arguments[0]);
      if (text !== undefined) {
        reportSpecifier("require(...)", text, undefined);
      } else {
        violations.push("require(...): non-literal module specifier");
      }
    }

    // Math.random: property access (called or not), element access, and
    // destructuring off Math (criterion 27). Other Math members are fine.
    if (ts.isPropertyAccessExpression(node)) {
      if (
        ts.isIdentifier(node.expression) &&
        node.expression.text === "Math" &&
        node.name.text === "random"
      ) {
        violations.push("reference to Math.random");
      }
      if (BANNED_MEMBER_NAMES.has(node.name.text)) {
        violations.push(`reference to ".${node.name.text}"`);
      }
    }

    if (ts.isElementAccessExpression(node)) {
      const key = literalTextOf(node.argumentExpression as ts.Expression);
      if (key !== undefined) {
        if (ts.isIdentifier(node.expression) && node.expression.text === "Math" && key === "random") {
          violations.push('reference to Math["random"]');
        }
        if (BANNED_MEMBER_NAMES.has(key)) {
          violations.push(`reference to ["${key}"]`);
        }
      }
    }

    if (ts.isVariableDeclaration(node)) {
      checkMathRandomDestructure(node);
    }

    // import.meta (criterion 28).
    if (ts.isMetaProperty(node) && node.keywordToken === ts.SyntaxKind.ImportKeyword) {
      violations.push('reference to "import.meta"');
    }

    if (ts.isIdentifier(node) && FORBIDDEN_IDENTIFIERS.has(node.text)) {
      const parent = node.parent as ts.Node | undefined;
      if (
        parent !== undefined &&
        !isNameOnlyPosition(node, parent) &&
        !isTypeOnlyReference(node, parent)
      ) {
        violations.push(`reference to forbidden identifier "${node.text}"`);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return violations;
}

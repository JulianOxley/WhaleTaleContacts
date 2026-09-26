// A static-analysis helper for the src/model purity test (criteria 12 and 13,
// as rewritten by the WTC-11 addendum). It parses TypeScript source with the
// TypeScript compiler API, so matches never fall inside a comment or a string
// literal, and reports every purity/determinism violation it finds as a
// plain-English string. It performs no I/O of its own: callers (the tests)
// are responsible for reading files.
//
// This file lives under tests/, never under src/model, precisely so that the
// scanner itself is never a candidate for the purity scan it implements.

import * as ts from "typescript";
import { posix } from "node:path";

export interface PurityScanOptions {
  /**
   * The path of the file being scanned, relative to src/model (for example
   * "contact.ts", or "rules/m1.ts" for a file in a subdirectory). Used only
   * to resolve relative import specifiers against a conceptual location
   * inside src/model; no filesystem access happens here. Defaults to a
   * virtual file at the root of src/model.
   */
  modelRelativePath?: string;
}

const MODEL_ROOT = "src/model";

// "Any reference" identifiers: flagged wherever they appear in expression
// position (i.e. not as a declared name or a property/key name).
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
]);

const ALLOWED_EXTERNAL_SPECIFIER = "node:crypto";
const ALLOWED_EXTERNAL_NAMED_IMPORT = "createHash";

function containingDirFor(modelRelativePath: string): string {
  const full = posix.normalize(posix.join(MODEL_ROOT, modelRelativePath));
  return posix.dirname(full);
}

function resolvesInsideModel(specifier: string, containingDir: string): boolean {
  const resolved = posix.normalize(posix.join(containingDir, specifier));
  return resolved === MODEL_ROOT || resolved.startsWith(`${MODEL_ROOT}/`);
}

/**
 * True only for the one allowed external import shape: a named import of
 * exactly `createHash`, with no alias, and nothing else in the import
 * clause (no default import alongside it, no other named bindings, not a
 * namespace import).
 */
function isCreateHashOnlyImportClause(importClause: ts.ImportClause | undefined): boolean {
  if (!importClause) return false;
  if (importClause.name) return false;
  const bindings = importClause.namedBindings;
  if (!bindings || !ts.isNamedImports(bindings)) return false;
  if (bindings.elements.length !== 1) return false;
  const [element] = bindings.elements;
  if (element.propertyName) return false;
  return element.name.text === ALLOWED_EXTERNAL_NAMED_IMPORT;
}

function literalTextOf(node: ts.Expression | undefined): string | undefined {
  if (!node) return undefined;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return undefined;
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
    if (specifierText.startsWith(".") || specifierText.startsWith("/")) {
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

    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const callee = node.expression;
      if (
        ts.isIdentifier(callee.expression) &&
        callee.expression.text === "Math" &&
        ts.isIdentifier(callee.name) &&
        callee.name.text === "random"
      ) {
        violations.push("call to Math.random()");
      }
    }

    if (ts.isIdentifier(node) && FORBIDDEN_IDENTIFIERS.has(node.text)) {
      const parent = node.parent as (ts.Node & { name?: ts.Node }) | undefined;
      const isNamePosition = parent !== undefined && "name" in parent && parent.name === node;
      if (!isNamePosition) {
        violations.push(`reference to forbidden identifier "${node.text}"`);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return violations;
}

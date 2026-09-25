#!/usr/bin/env node
// Validates a planner output file against the frontmatter contract described in AGENTS.md.
//
// A plan must name the ticket and epic it read, and either:
//   - list at least one page it fetched beyond the ticket/epic, OR
//   - be explicitly flagged `thin: true`, meaning the planner looked and there was
//     genuinely nothing else to cite.
//
// This exists to turn "do not infer a requirement you could have fetched" from a prose
// instruction the model can silently skip into a property of the artifact that gets checked.
// It cannot prove the MCP calls actually happened — only that the plan claims specific sources
// rather than none. That is a real limit; see README.md "What this does not solve."
//
// Usage: node scripts/check-plan.mjs .claude/plans/TT-14.md
//        node scripts/check-plan.mjs .claude/plans/*.md   (via shell glob)

import { readFileSync } from "node:fs";

const TICKET_PATTERN = /^WTC-\d+$/;

function parseFrontmatter(text, filePath) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    fail(filePath, "no frontmatter block found (expected --- ... --- at the top of the file)");
  }
  const lines = match[1].split("\n");
  const fm = {};
  for (const line of lines) {
    if (!line.trim()) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    } else if (value === "true" || value === "false") {
      value = value === "true";
    }
    fm[key] = value;
  }
  return fm;
}

function fail(filePath, reason) {
  console.error(`FAIL ${filePath}: ${reason}`);
  process.exitCode = 1;
}

function checkPlan(filePath) {
  const text = readFileSync(filePath, "utf8");
  const fm = parseFrontmatter(text, filePath);

  if (!fm.ticket || !TICKET_PATTERN.test(fm.ticket)) {
    fail(filePath, `missing or malformed "ticket" (expected WTC-<n>, got ${JSON.stringify(fm.ticket)})`);
    return;
  }
  if (!fm.epic || !TICKET_PATTERN.test(fm.epic)) {
    fail(filePath, `missing or malformed "epic" (expected WTC-<n>, got ${JSON.stringify(fm.epic)})`);
    return;
  }

  const pages = Array.isArray(fm.pages) ? fm.pages : [];
  const thin = fm.thin === true;

  if (pages.length === 0 && !thin) {
    fail(
      filePath,
      'no "pages" cited and not flagged "thin: true". Either the planner fetched supporting ' +
        "pages and should list them, or the ticket is genuinely thin and the plan should say so " +
        "explicitly rather than citing nothing silently."
    );
    return;
  }

  console.log(`OK   ${filePath}  (ticket=${fm.ticket} epic=${fm.epic} pages=${pages.length} thin=${thin})`);
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: node scripts/check-plan.mjs <plan-file> [more...]");
  process.exit(1);
}
files.forEach(checkPlan);

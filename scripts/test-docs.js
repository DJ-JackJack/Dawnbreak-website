#!/usr/bin/env node
/**
 * The human doc and the machine schema must agree about section headings.
 *
 * They stopped agreeing once already. `Contested / unconfirmed` was removed
 * from `schema.js`, and `docs/ARTICLE-TEMPLATES.md` went on instructing writers
 * to include it in all five categories for another week. The linter rejected
 * the section the doc was recommending, which is the worst version of drift:
 * the guidance and the gate disagree, and the writer is caught between them.
 *
 * schema.js is the authority. This only checks that the doc has not fallen
 * behind it.
 */

const fs = require("fs");
const path = require("path");
const { CATEGORIES, sectionNames } = require("../src/_data/schema.js");

const DOC = path.join(__dirname, "..", "docs", "ARTICLE-TEMPLATES.md");
const doc = fs.readFileSync(DOC, "utf8");

let pass = 0;
const problems = [];

for (const category of Object.keys(CATEGORIES)) {
  const heading = `## ${CATEGORIES[category].label.toUpperCase()}`;
  const start = doc.indexOf(heading);
  if (start === -1) {
    problems.push(`${category}: no "${heading}" section in the doc`);
    continue;
  }
  const after = doc.indexOf("\n## ", start + 1);
  const block = doc.slice(start, after === -1 ? undefined : after);

  // The numbered list of headings, e.g. `6. **The Public Record** — ...`
  const listed = [...block.matchAll(/^\d+\.\s+\*\*([^*]+)\*\*/gm)].map((m) => m[1].trim());
  const want = sectionNames(category);

  if (JSON.stringify(listed) !== JSON.stringify(want)) {
    problems.push(
      `${category}: the doc lists sections the schema does not\n` +
      `      doc:    ${listed.join(" | ") || "(none found)"}\n` +
      `      schema: ${want.join(" | ")}`
    );
  } else pass++;
}

for (const p of problems) console.error("  • " + p);
console.log(`\n${pass} of ${Object.keys(CATEGORIES).length} category section lists match the schema.`);
process.exit(problems.length ? 1 : 0);

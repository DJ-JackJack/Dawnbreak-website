#!/usr/bin/env node
/**
 * Check every article against its category's template — and write new ones.
 *
 *   node scripts/lint-articles.js                       validate all articles
 *   node scripts/lint-articles.js --new heroes "Coldstreak"
 *
 * Both modes read `src/_data/schema.js`, which is also what the article layout
 * renders its dossier panel from. One definition, so a template cannot drift
 * from what is enforced or from what is displayed.
 *
 * Exits non-zero on any error, so CI fails a push that breaks a template. That
 * is the whole difference between this and a style guide nobody opens.
 *
 * Deliberately dependency-free. The frontmatter parser below handles exactly
 * the subset the templates use -- `key: value`, `key: [a, b]`, quoted strings,
 * and block lists -- and REFUSES anything it does not understand rather than
 * guessing. A parser that silently mis-reads a field would be worse than none,
 * because the linter would then be certifying articles it had not really
 * checked.
 */

const fs = require("fs");
const path = require("path");
const { UNIVERSAL, CATEGORIES } = require("../src/_data/schema.js");
const { splitFrontmatter, parseFrontmatter } = require("./frontmatter.js");

const ARTICLES = path.join(__dirname, "..", "src", "articles");

/* ------------------------------------------------------------------ parsing */

/* The parser lives in its own module because the Obsidian converter reads
   articles too, and two parsers would eventually disagree about what a file
   says. See scripts/frontmatter.js. */

/* --------------------------------------------------------------- validation */

function checkArticle(file, raw) {
  const problems = [];
  const split = splitFrontmatter(raw);
  if (!split) return ["no `---` frontmatter block at the top of the file"];

  const { data, errors } = parseFrontmatter(split.front);
  problems.push(...errors);

  const category = data.category;
  if (!category) return [...problems, "`category` is missing, so no template can be applied"];
  const def = CATEGORIES[category];
  if (!def) {
    return [...problems,
      `unknown category ${JSON.stringify(category)} — expected one of ${Object.keys(CATEGORIES).join(", ")}`];
  }

  // --- fields
  const expected = [...UNIVERSAL, ...def.fields];
  const known = new Set(expected.map(f => f.key));

  for (const field of expected) {
    const present = Object.prototype.hasOwnProperty.call(data, field.key);
    if (!present) {
      // Every field appears in every article, per the template's own first
      // rule -- an optional field must still be present, it may just be empty.
      problems.push(`missing field \`${field.key}\`${field.required ? "" : " (optional, but must still appear)"}`);
      continue;
    }
    const value = data[field.key];
    if (field.list && !Array.isArray(value)) {
      problems.push(`\`${field.key}\` must be a list — write \`[]\` if there are none`);
      continue;
    }
    if (!field.list && Array.isArray(value)) {
      problems.push(`\`${field.key}\` must be a single value, not a list`);
      continue;
    }
    if (field.required && !field.list && String(value).trim() === "") {
      problems.push(`\`${field.key}\` is empty — fill it, or write "—" deliberately`);
    }
    if (field.enum && !field.list && String(value).trim() !== "" && !field.enum.includes(String(value).trim())) {
      problems.push(`\`${field.key}\` is ${JSON.stringify(value)} — expected one of ${field.enum.join(" | ")}`);
    }
  }
  for (const key of Object.keys(data)) {
    if (!known.has(key)) problems.push(`unknown field \`${key}\` — not in the ${category} template`);
  }

  // --- summary is one sentence, and is what every card and search result shows
  const summary = String(data.summary ?? "").trim();
  if (summary && /[.!?]\s+\S/.test(summary)) {
    problems.push("`summary` reads as more than one sentence — cards and search results show it whole");
  }
  if (summary && /\[\[/.test(summary)) {
    problems.push("`summary` contains a wiki link — it appears outside the page, where links cannot resolve");
  }

  // --- sections, present and in order
  const headings = [...split.body.matchAll(/^##\s+(.+?)\s*$/gm)].map(m => m[1].trim());
  let cursor = 0;
  for (const want of def.sections) {
    const at = headings.indexOf(want, cursor);
    if (at === -1) {
      problems.push(headings.includes(want)
        ? `section "${want}" is out of order`
        : `missing section "## ${want}"`);
    } else {
      cursor = at + 1;
    }
  }
  for (const got of headings) {
    if (!def.sections.includes(got)) {
      problems.push(`unexpected section "## ${got}" — the ${category} template's headings are fixed`);
    }
  }

  /* --- a bare date is a Date object, not a string
   *
   * YAML reads an unquoted `2026-09-02` as a timestamp, so Eleventy hands the
   * page a JS Date and "Recently added" prints
   * `Tue Sep 01 2026 20:00:00 GMT-0400` — the wrong format AND, after the
   * timezone shift, the wrong day. It shipped that way and nothing caught it,
   * because this parser reads the same characters either way. Checking the raw
   * line is the only place the difference is still visible.
   */
  if (/^date_added:\s*\d{4}-\d{2}-\d{2}\s*$/m.test(split.front)) {
    problems.push('`date_added` must be quoted — `"2026-09-02"`, or YAML makes it a Date and the page prints a timestamp');
  }

  // --- a standfirst before the first heading
  const firstHeading = split.body.search(/^##\s+/m);
  const standfirst = (firstHeading === -1 ? split.body : split.body.slice(0, firstHeading))
    .replace(/^#\s+.*$/m, "").trim();
  if (!standfirst) problems.push("no standfirst — one short paragraph before the first `##`, introducing the subject");

  return problems;
}

/* ------------------------------------------------------------- skeleton mode */

function skeleton(category, title) {
  const def = CATEGORIES[category];
  if (!def) {
    console.error(`Unknown category "${category}". Expected: ${Object.keys(CATEGORIES).join(", ")}`);
    process.exit(1);
  }
  const today = new Date().toISOString().slice(0, 10);
  const line = f => {
    const value = f.list ? "[]"
      : f.key === "title" ? JSON.stringify(title)
      : f.key === "category" ? category
      : f.key === "record" ? "draft"
      : f.key === "date_added" ? JSON.stringify(today)
      : '""';
    return `${f.key}: ${value}${f.note ? `   # ${f.note}` : ""}`;
  };

  return [
    "---",
    ...UNIVERSAL.map(line),
    ...def.fields.map(line),
    "---",
    "",
    // No `# Title` here: the article layout renders the H1 from frontmatter,
    // so repeating it in the body prints the title twice on the page.
    "One short paragraph. Who or what this is, and why the city knows it.",
    "Assume the reader has read nothing else.",
    "",
    ...def.sections.flatMap(s => [`## ${s}`, "", "", ""]),
    "<!-- OPEN QUESTIONS",
    "- Invented: ",
    "- Unresolved: ",
    "-->",
    "",
  ].join("\n");
}

module.exports = { checkArticle, skeleton };

/* ---------------------------------------------------------------------- main */

// Required as a module by the converter; only the CLI below should run then.
if (require.main !== module) return;

const args = process.argv.slice(2);

if (args[0] === "--new") {
  const [, category, title] = args;
  if (!category || !title) {
    console.error('Usage: node scripts/lint-articles.js --new <category> "<Title>"');
    process.exit(1);
  }
  const slug = title.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const dest = path.join(ARTICLES, `${slug}.md`);
  if (fs.existsSync(dest)) { console.error(`Refusing to overwrite ${dest}`); process.exit(1); }
  fs.mkdirSync(ARTICLES, { recursive: true });
  fs.writeFileSync(dest, skeleton(category, title), "utf8");
  console.log(`Wrote ${path.relative(process.cwd(), dest)}`);
  process.exit(0);
}

if (!fs.existsSync(ARTICLES)) {
  console.log("No src/articles/ yet — nothing to check.");
  process.exit(0);
}

const files = fs.readdirSync(ARTICLES).filter(f => f.endsWith(".md")).sort();
let failed = 0;
for (const file of files) {
  const problems = checkArticle(file, fs.readFileSync(path.join(ARTICLES, file), "utf8"));
  if (problems.length) {
    failed++;
    console.error(`\n${file}`);
    for (const p of problems) console.error(`  • ${p}`);
  }
}

console.log(`\n${files.length} article${files.length === 1 ? "" : "s"} checked, ${failed} with problems.`);
process.exit(failed ? 1 : 0);

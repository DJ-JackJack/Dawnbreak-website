#!/usr/bin/env node
/**
 * Obsidian vault → `src/articles/`.
 *
 *   npm run sync         convert, validate, write
 *   npm run sync:dry     report what would change, write nothing
 *
 * ## What makes this different from Ahvantir's converter
 *
 * Ahvantir's maps a loose set of vault categories onto site categories with a
 * lookup table, and publishes whatever comes out. That is exactly how its
 * articles drifted into "several hundred separate essays": nothing downstream
 * ever refused a malformed one.
 *
 * This one validates every converted article against `src/_data/schema.js` —
 * the same check CI runs — and exits non-zero if any fail. The files are still
 * written, so the problem is visible in the diff rather than described in a log,
 * but the weekly sync stops before committing. A broken article cannot reach
 * the site by accident.
 *
 * ## Transformations
 *
 *   - `vault_status: stub`          → skipped entirely
 *   - `vault_status`/`source`/`created` → stripped (the linter rejects unknown fields)
 *   - `> [!warning]` callout        → `{% dmonly %}` spoiler block
 *   - `> [!note] Title` callout     → styled blockquote
 *   - ```dataview blocks, `= inline queries → removed
 *   - `#inline-tags` in body        → removed (frontmatter `tags` is the real list)
 *   - `<% templater %>`             → removed
 *   - frontmatter                   → re-emitted in schema order
 *   - `date_added`                  → stamped on first sync, preserved after
 *
 * `[[Wiki Links]]` pass through untouched; Eleventy turns them into links at
 * build time, and unwritten ones are reported here as a to-write list.
 */

const fs = require("fs");
const path = require("path");
const { UNIVERSAL, CATEGORIES } = require("../src/_data/schema.js");
const { splitFrontmatter, parseFrontmatter } = require("./frontmatter.js");
const { checkArticle } = require("./lint-articles.js");
const { vaultPath } = require("./vault-path.js");
const { SITE_OWNED, VAULT_ONLY, FOLDERS } = require("./vault-init.js");

const OUTPUT_DIR = path.join(__dirname, "..", "src", "articles");
const DRY = process.argv.includes("--dry-run");

const SKIP_DIRS = new Set(["_Templates", "_Meta", ".obsidian", "Attachments", ".git", ".trash"]);
const VAULT_ONLY_KEYS = new Set(VAULT_ONLY.map((f) => f.key));

/** Fields the site owns that a re-sync must not clobber. */
const PRESERVE = new Set([...SITE_OWNED]);

/** Folder name → category slug, for catching a note filed in the wrong place. */
const DIR_TO_SLUG = new Map(FOLDERS.map((f) => [f.dir, f.slug]));

/* ------------------------------------------------------------ body cleanup */

const stripTemplater = (s) => s.replace(/<%[^]*?%>/g, "");

const stripDataview = (s) =>
  s.replace(/```dataview[^]*?```/g, "").replace(/`=\s*[^`]+`/g, "");

/* Only a `#tag` that is not part of a heading, a URL fragment, or a wiki link.
   `(?<![\w#\[/])` keeps `##  Heading` (already consumed by \s) and `#6` in
   `Ward #6` — which is why the tag must start with a letter.

   The trailing `[ \t]*` goes with it. Without it, "a #civic matter" becomes
   "a  matter" with a doubled space, and a line holding nothing but tags leaves
   its indentation behind. A tag at end of line leaves a trailing space, which
   the whitespace trim in convert() takes off. */
const stripInlineTags = (s) => s.replace(/(?<![\w#\[/])#[a-zA-Z][\w/-]*[ \t]*/g, "");

/** Drop the leading `> ` from the body lines of a callout. */
function unquoteBlock(raw) {
  return raw
    .split("\n")
    .map((l) => (l.startsWith("> ") ? l.slice(2) : l === ">" ? "" : l))
    .join("\n");
}

function convertWarnings(body) {
  return body.replace(
    /^> \[!warning\][^\n]*\n((?:> ?[^\n]*\n?)*)/gim,
    (_, raw) => {
      const inner = unquoteBlock(raw).trim();
      return inner ? `{% dmonly %}\n${inner}\n{% enddmonly %}\n` : "";
    }
  );
}

function convertNotes(body) {
  return body.replace(
    /^> \[!note\] ?([^\n]*)\n((?:> ?[^\n]*\n?)*)/gim,
    (_, title, raw) => {
      const lines = unquoteBlock(raw)
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => `> ${l}`)
        .join("\n");
      const head = title.trim() ? `> **${title.trim()}**` : "";
      return [head, lines].filter(Boolean).join("\n") + "\n";
    }
  );
}

/* ------------------------------------------------------------ frontmatter */

/** Quote a scalar only when YAML would otherwise misread it. */
function scalar(value) {
  const s = String(value ?? "");
  if (s === "") return '""';
  if (/^[\d.-]+$/.test(s) || /^(true|false|null|yes|no|on|off)$/i.test(s)) return JSON.stringify(s);
  if (/[:#\[\]{}",']/.test(s) || /^\s|\s$/.test(s)) return JSON.stringify(s);
  return s;
}

/**
 * Re-emit frontmatter in schema order: universal block, then the category's
 * own fields. Every field appears even when empty — that is the template's
 * first rule, and the article page renders an empty field as a visible gap.
 */
function buildFrontmatter(slugCategory, data, preserved) {
  const def = CATEGORIES[slugCategory];
  const lines = ["---"];

  for (const f of [...UNIVERSAL, ...def.fields]) {
    if (SITE_OWNED.has(f.key)) {
      lines.push(`${f.key}: ${scalar(preserved[f.key] ?? "")}`);
      continue;
    }
    const value = data[f.key];
    // Free text is always quoted. A title or summary containing a colon is
    // ordinary English, and unquoted it becomes a YAML mapping instead.
    if (f.key === "title" || f.key === "summary") {
      lines.push(`${f.key}: ${JSON.stringify(String(value ?? ""))}`);
      continue;
    }
    if (f.list) {
      const items = Array.isArray(value) ? value : value === undefined || value === "" ? [] : [value];
      lines.push(`${f.key}: [${items.map((v) => scalar(v)).join(", ")}]`);
    } else {
      lines.push(`${f.key}: ${scalar(Array.isArray(value) ? value.join(", ") : value)}`);
    }
  }

  // Anything else the author added stays, rather than being silently dropped.
  // The linter will call it an unknown field, which is the correct outcome:
  // either it belongs in the schema or it does not belong in the article.
  for (const key of Object.keys(data)) {
    if (VAULT_ONLY_KEYS.has(key)) continue;
    if ([...UNIVERSAL, ...def.fields].some((f) => f.key === key)) continue;
    const value = data[key];
    lines.push(Array.isArray(value)
      ? `${key}: [${value.map(scalar).join(", ")}]`
      : `${key}: ${scalar(value)}`);
  }

  lines.push("---");
  return lines.join("\n");
}

/* ---------------------------------------------------------------- per file */

const slugify = (title) =>
  String(title).toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * @returns {{slug, content, title}|{skip: string}|{error: string}}
 */
function convert(raw, relDir, preserved) {
  const split = splitFrontmatter(raw);
  if (!split) return { skip: "no frontmatter" };

  const { data, errors } = parseFrontmatter(split.front);
  if (errors.length) return { error: errors.join("; ") };

  if (String(data.vault_status ?? "").trim() !== "ready") {
    return { skip: `vault_status is ${JSON.stringify(String(data.vault_status ?? ""))}, not "ready"` };
  }

  const title = String(data.title ?? "").trim();
  // An un-filled template still carries its placeholder. Publishing that would
  // put "{{title}}" on the live site.
  if (!title || title.includes("{{") || title.includes("<%")) {
    return { skip: "no usable title (unfilled template?)" };
  }

  const category = String(data.category ?? "").trim();
  if (!CATEGORIES[category]) {
    return { error: `category ${JSON.stringify(category)} is not one of ${Object.keys(CATEGORIES).join(", ")}` };
  }

  /* A note filed under 03 - Organizations but tagged `category: heroes` is a
     mistake every time, and a silent one: the frontmatter wins, the article
     publishes into a category the folder disagrees with, and nobody notices
     until the nav looks wrong. */
  const byFolder = DIR_TO_SLUG.get(relDir);
  if (byFolder && byFolder !== category) {
    return { error: `filed in "${relDir}" but category is "${category}" — move the note or fix the field` };
  }

  let body = split.body;
  body = stripTemplater(body);
  body = stripDataview(body);
  body = convertWarnings(body);
  body = convertNotes(body);
  body = stripInlineTags(body);
  body = body.replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();

  const content = `${buildFrontmatter(category, data, preserved)}\n\n${body}\n`;
  return { slug: slugify(title), content, title };
}

/* -------------------------------------------------------------------- main */

function listNotes(vault) {
  const out = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
      } else if (entry.name.endsWith(".md")) {
        out.push(path.join(dir, entry.name));
      }
    }
  })(vault);
  return out.sort();
}

function main() {
  const vault = vaultPath();
  const notes = listNotes(vault);
  console.log(`Vault: ${vault}`);
  console.log(`${notes.length} note${notes.length === 1 ? "" : "s"} found${DRY ? "  (dry run)" : ""}\n`);

  const today = new Date().toISOString().slice(0, 10);
  const written = [];
  const created = [];
  const skipped = [];
  const problems = [];
  const claimed = new Map();

  for (const src of notes) {
    const rel = path.relative(vault, src);
    const relDir = path.dirname(rel).split(path.sep)[0];
    let preserved = {};
    let raw;
    try {
      raw = fs.readFileSync(src, "utf8");
    } catch (e) {
      problems.push([rel, `could not read: ${e.message}`]);
      continue;
    }

    // Peek at the title to find the existing article, so site-owned fields on
    // it survive this sync.
    const peek = splitFrontmatter(raw);
    const peekTitle = peek ? String(parseFrontmatter(peek.front).data.title ?? "").trim() : "";
    const peekDest = peekTitle ? path.join(OUTPUT_DIR, `${slugify(peekTitle)}.md`) : null;
    if (peekDest && fs.existsSync(peekDest)) {
      const existing = parseFrontmatter(splitFrontmatter(fs.readFileSync(peekDest, "utf8")).front).data;
      for (const key of PRESERVE) if (key in existing) preserved[key] = existing[key];
    }
    if (!preserved.date_added) preserved.date_added = today;

    const result = convert(raw, relDir, preserved);

    if (result.skip) { skipped.push([rel, result.skip]); continue; }
    if (result.error) { problems.push([rel, result.error]); continue; }

    if (claimed.has(result.slug)) {
      problems.push([rel, `slug "${result.slug}" is already taken by ${claimed.get(result.slug)}`]);
      continue;
    }
    claimed.set(result.slug, rel);

    const out = path.join(OUTPUT_DIR, `${result.slug}.md`);
    const isNew = !fs.existsSync(out);
    if (!isNew && fs.readFileSync(out, "utf8") === result.content) continue;

    if (!DRY) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      fs.writeFileSync(out, result.content, "utf8");
    }
    (isNew ? created : written).push(`${result.slug}.md`);

    const bad = checkArticle(`${result.slug}.md`, result.content);
    if (bad.length) problems.push([`${rel}  →  ${result.slug}.md`, bad.join("\n      • ")]);
  }

  /* ---- report */

  if (created.length) console.log(`Added (${created.length}):\n  ${created.join("\n  ")}\n`);
  if (written.length) console.log(`Updated (${written.length}):\n  ${written.join("\n  ")}\n`);
  if (!created.length && !written.length) console.log("No article changed.\n");

  if (skipped.length) {
    console.log(`Skipped (${skipped.length}):`);
    for (const [rel, why] of skipped) console.log(`  ${rel} — ${why}`);
    console.log("");
  }

  reportUnwrittenLinks();

  if (problems.length) {
    console.error(`\n${problems.length} note${problems.length === 1 ? "" : "s"} did not convert cleanly:`);
    for (const [rel, why] of problems) console.error(`  ${rel}\n      • ${why}`);
    console.error("\nNothing will be committed until these are fixed in the vault.");
    process.exit(1);
  }

  console.log(`${DRY ? "Would update" : "Updated"} ${created.length + written.length} article(s). No problems.`);
}

/** Wiki links pointing at articles nobody has written yet — a to-write list. */
function reportUnwrittenLinks() {
  if (!fs.existsSync(OUTPUT_DIR)) return;
  const files = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith(".md"));
  const have = new Set(files.map((f) => f.replace(/\.md$/, "")));
  const wanted = new Map();

  for (const file of files) {
    const body = fs.readFileSync(path.join(OUTPUT_DIR, file), "utf8");
    for (const m of body.matchAll(/\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g)) {
      const slug = slugify(m[1]);
      if (have.has(slug)) continue;
      if (!wanted.has(slug)) wanted.set(slug, new Set());
      wanted.get(slug).add(file);
    }
  }
  if (!wanted.size) return;

  console.log(`Linked but not yet written (${wanted.size}):`);
  for (const [slug, from] of [...wanted].sort()) {
    console.log(`  ${slug}  ← ${[...from].join(", ")}`);
  }
  console.log("");
}

if (require.main === module) main();

module.exports = { convert, buildFrontmatter, stripInlineTags, convertWarnings, convertNotes, slugify };

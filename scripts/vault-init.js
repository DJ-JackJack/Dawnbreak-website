#!/usr/bin/env node
/**
 * Build (or refresh) the Obsidian vault the site draws from.
 *
 *   node scripts/vault-init.js            create/refresh the vault
 *   node scripts/vault-init.js --dry-run  say what it would do
 *
 * ## Why this is a script and not a folder someone made by hand
 *
 * The Ahvantir vault's templates were written by hand, and the site's idea of
 * an article and the vault's idea of an article drifted apart — which is the
 * whole reason Krys asked for templates before any Dawnbreak article was
 * written. So the vault templates here are GENERATED from `src/_data/schema.js`,
 * the same definition the linter enforces and the article page renders. Add a
 * field to the schema, re-run this, and the vault template has it too.
 *
 * That makes four consumers of one definition:
 *   1. the linter that validates articles
 *   2. `--new`, which writes site-side skeletons
 *   3. the article layout's dossier panel
 *   4. these Obsidian templates
 *
 * ## What it will and will not touch
 *
 * `_Templates/` and `_Meta/` are generated and are rewritten every run — do
 * not hand-edit them, the edits will be lost. Category folders are created if
 * missing. **Nothing else is ever written or deleted**: your notes are safe to
 * re-run this over, and it will not overwrite a single article.
 */

const fs = require("fs");
const path = require("path");
const { UNIVERSAL, CATEGORIES } = require("../src/_data/schema.js");
const { vaultPath } = require("./vault-path.js");

const DRY = process.argv.includes("--dry-run");

/* Fields the site owns and the vault must not carry.

   `date_added` means "the day this reached the site", which the vault has no
   way to know and no business guessing. The converter stamps it on first sync
   and preserves it forever after. */
const SITE_OWNED = new Set(["date_added"]);

/* Fields the vault owns and the site must never see. The converter strips
   these; the linter would reject them as unknown fields if it did not.

   `vault_status`, not `status`: every Dawnbreak category already has a real
   `status` field with its own meaning, and reusing the name would have made
   every finished article read as an unpublished stub. */
const VAULT_ONLY = [
  { key: "vault_status", value: "stub",
    note: "stub while drafting; change to `ready` to publish it to the site" },
  { key: "source", value: '""',
    note: "where this came from: canon | session | invented" },
  { key: "created", value: "{{date:YYYY-MM-DD}}", note: "" },
];

const FOLDERS = Object.keys(CATEGORIES).map((slug, i) => ({
  slug,
  dir: `${String(i + 1).padStart(2, "0")} - ${CATEGORIES[slug].label}`,
}));

/* -------------------------------------------------------------- templates */

/**
 * One Obsidian template per category, in the site's own field and section
 * order, so a note written here converts to a valid article without editing.
 *
 * `{{title}}` and `{{date:...}}` are core-Templates placeholders — no plugin
 * to install. Templater's `<% %>` is stripped by the converter too, if you
 * would rather use that.
 */
function template(slug) {
  const def = CATEGORIES[slug];

  const line = (f) => {
    const value =
      f.list ? "[]"
      : f.key === "title" ? "{{title}}"
      : f.key === "category" ? slug
      : f.key === "record" ? "draft"
      : '""';
    /* Both, when a field has both: the enum is the allowed set and the note is
       why it matters. Showing only one of them was the first version, and it hid
       the allowed values of every enum field that also had guidance. */
    const hint = [f.enum && f.enum.join(" | "), f.note].filter(Boolean).join("  —  ");
    const note = hint ? `   # ${hint}` : "";
    return `${f.key}: ${value}${note}`;
  };

  return [
    "---",
    ...UNIVERSAL.filter((f) => !SITE_OWNED.has(f.key)).map(line),
    ...def.fields.map(line),
    "",
    "# --- vault only, stripped on sync ---",
    ...VAULT_ONLY.map((f) => `${f.key}: ${f.value}${f.note ? `   # ${f.note}` : ""}`),
    "---",
    "",
    // No `# {{title}}` heading: the article page renders the H1 from
    // frontmatter, and repeating it here prints the title twice.
    "One short paragraph. Who or what this is, and why the city knows it.",
    "Assume the reader has read nothing else.",
    "",
    // No open-questions block. An article states what is there and stops;
    // telling the reader what to wonder about is the writer's job leaking onto
    // the page. Invented detail goes in _Meta/Open Questions.md instead, where
    // it stays overrulable without riding along inside the article.
    ...def.sections.flatMap((s) => [`## ${s}`, "", "", ""]),
  ].join("\n");
}

/* ------------------------------------------------------------------- _Meta */

function metaHome() {
  const rows = FOLDERS.map(
    (f) => `| [[${CATEGORIES[f.slug].label}]] | \`${f.dir}/\` | ${CATEGORIES[f.slug].sections.length} fixed sections |`
  );
  return [
    "# Dawnbreak City — lore vault",
    "",
    "The source the website is built from. Write here; the site follows.",
    "",
    "| Category | Folder | Shape |",
    "|---|---|---|",
    ...rows,
    "",
    "## The one rule",
    "",
    "A note publishes when its `vault_status` is `ready`. While it says `stub`",
    "the sync skips it entirely, so an unfinished note is never a half-published",
    "article.",
    "",
    "## Writing a new one",
    "",
    "1. New note in the right numbered folder.",
    "2. Insert the matching template (`_Templates/`).",
    "3. Fill the frontmatter. Every field appears in every article — `—` is a",
    "   real answer, and an awkward field is usually where the characterization is.",
    "4. Leave the section headings exactly as they are. Content may be short.",
    "5. Record anything you invented in [[Open Questions]], not in the note.",
    "6. Set `vault_status: ready` when it should go live.",
    "",
    "See [[How this vault works]] for the voice and the sync.",
    "",
  ].join("\n");
}

function metaHowItWorks() {
  return [
    "# How this vault works",
    "",
    "## The voice",
    "",
    "Neutral, vague, quietly omniscient. The narrator is never named, described,",
    "explained or acknowledged.",
    "",
    "- No `I`, `we`, `our records`, `this site`, `the editors`, `the archive`.",
    "- Never explain the record's own limits. \"The connection has never been",
    "  established\" is in voice; \"no sources could be found\" is not — it admits",
    "  someone was looking.",
    "- State plainly. A dispute is reported as a fact, flatly. Avoid `some say`,",
    "  `it is rumoured`, `many believe` — the record is not uncertain, it is",
    "  withholding, which is different.",
    "- Occasionally know too much, and never wink about it.",
    "",
    "In-world publications — the Arkon Media Pantheon above all — are quoted",
    "*inside* articles with attribution, never adopted as the narrator's voice.",
    "Arkon has a byline. The record does not.",
    "",
    "The full version lives in `docs/ARTICLE-TEMPLATES.md` in the website repo.",
    "",
    "## What the sync does to your notes",
    "",
    "| In the vault | On the site |",
    "|---|---|",
    "| `vault_status: stub` | skipped entirely |",
    "| `vault_status`, `source`, `created` | stripped |",
    "| `> [!warning]` callout | a collapsed **DM Only** spoiler block |",
    "| `> [!note] Title` callout | a styled blockquote |",
    "| ` ```dataview ` blocks, `` `= expr` `` | removed |",
    "| `#inline-tags` in the body | removed (frontmatter `tags` is the real list) |",
    "| `[[Wiki Links]]` | real links, and a list of unwritten ones after each sync |",
    "| `<% templater %>` | removed |",
    "",
    "Everything else is passed through untouched.",
    "",
    "## Running it",
    "",
    "From the website repo:",
    "",
    "```",
    "npm run sync        # vault -> src/articles/, then validate",
    "npm run sync:dry    # say what would change, write nothing",
    "```",
    "",
    "It also runs itself every Sunday at 21:00 and pushes, which rebuilds the",
    "site. Nothing is committed if the converter reports a problem.",
    "",
    "## Canon",
    "",
    "Nothing here may contradict `dawnbreak-canon.md` on the Desktop. An article",
    "may omit, soften, reframe and imply. It may not state something canon says",
    "is false — unless it is explicitly reporting someone else's claim, in which",
    "case it is attributed.",
    "",
  ].join("\n");
}

function metaOpenQuestions() {
  return [
    "# Open questions",
    "",
    "Things invented in notes that have not been ruled on, and things the canon",
    "does not settle. Articles carry none of this themselves: an article states",
    "what is there and lets the reader decide what else they want to know. This",
    "is where the uncertainty lives instead.",
    "",
    "## Unresolved",
    "",
    "- ",
    "",
    "## Ruled on",
    "",
    "- ",
    "",
  ].join("\n");
}

/* -------------------------------------------------------------------- main */

function write(file, content) {
  if (DRY) { console.log(`  would write ${path.basename(file)}`); return; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

function main() {
  const vault = vaultPath({ mustExist: false });
  console.log(`Vault: ${vault}${DRY ? "  (dry run)" : ""}\n`);

  const madeDirs = [];
  for (const dir of [...FOLDERS.map((f) => f.dir), "_Templates", "_Meta", "Attachments"]) {
    const full = path.join(vault, dir);
    if (!fs.existsSync(full)) {
      madeDirs.push(dir);
      if (!DRY) fs.mkdirSync(full, { recursive: true });
    }
  }
  console.log(madeDirs.length ? `Folders created: ${madeDirs.join(", ")}` : "Folders: already present");

  console.log("\nTemplates (regenerated from schema.js):");
  for (const slug of Object.keys(CATEGORIES)) {
    write(path.join(vault, "_Templates", `Template - ${CATEGORIES[slug].label}.md`), template(slug));
    if (!DRY) console.log(`  Template - ${CATEGORIES[slug].label}.md`);
  }

  console.log("\n_Meta:");
  write(path.join(vault, "_Meta", "Home.md"), metaHome());
  write(path.join(vault, "_Meta", "How this vault works.md"), metaHowItWorks());
  const oq = path.join(vault, "_Meta", "Open Questions.md");
  if (fs.existsSync(oq)) {
    console.log("  Open Questions.md — left alone (it has your answers in it)");
  } else {
    write(oq, metaOpenQuestions());
  }
  if (!DRY) console.log("  Home.md, How this vault works.md");

  /* Seed Obsidian's own settings only for a brand-new vault. An existing
     `.obsidian` holds the user's preferences and is never touched. */
  const dotObsidian = path.join(vault, ".obsidian");
  if (!fs.existsSync(dotObsidian)) {
    write(path.join(dotObsidian, "templates.json"), JSON.stringify({ folder: "_Templates" }, null, 2) + "\n");
    console.log("\nObsidian: templates folder set to _Templates");
  } else {
    console.log("\nObsidian: .obsidian already exists — settings left alone");
  }

  console.log("\nDone. Open the vault in Obsidian and start in _Meta/Home.md.");
}

if (require.main === module) main();

module.exports = { template, FOLDERS, SITE_OWNED, VAULT_ONLY };

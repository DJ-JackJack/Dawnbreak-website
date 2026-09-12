#!/usr/bin/env node
/**
 * Voice checks, for the rules a person cannot be trusted to remember.
 *
 * `lint-articles.js` checks an article's SHAPE — fields, headings, order.
 * Nothing checked how it was written, and `docs/ARTICLE-TEMPLATES.md` has
 * carried the voice rules in prose since the first article.
 *
 * That was not enough, and there is a worked example. The doc has said "no
 * jokes at the subject's expense, sneering is not the register" from the
 * beginning. The DeVito article shipped with "he was an actor, which is the
 * whole of his qualification for what he did", which is exactly that, and it
 * took a reader to catch it. A rule nothing checks is a rule that holds until
 * somebody is tired.
 *
 * So the checkable half moved here. What stays in the doc is the half that
 * genuinely needs judgment: whether a sentence sneers, whether a short
 * paragraph earns its emphasis, whether a detail honours its subject.
 *
 * ## What it looks at
 *
 * Prose only. Frontmatter is `lint-articles.js`'s business, and the `Related`
 * block at the foot is a link list whose `**Places** — [[x]]` form is
 * typography rather than a prose dash.
 *
 * ## Errors and warnings
 *
 * Errors fail the build. They are the rules with no defensible exception.
 * Warnings print and pass, because they are densities rather than mistakes:
 * one is fine, a habit is not, and only a person can tell which is happening.
 * Thresholds come from the corpus itself, not from taste — see each rule.
 *
 * Run: `npm run lint:prose`. CI runs it through `npm test`.
 */

const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "src", "articles");
const NOTES = path.join(__dirname, "..", "notes");

/** Body prose: frontmatter and the Related link list both dropped. */
function prose(raw) {
  const parts = raw.split(/^---$/m);
  const body = parts.length >= 3 ? parts.slice(2).join("---") : raw;
  return body.split(/^## Related$/m)[0];
}

const ERRORS = [
  {
    id: "em-dash",
    // Every em dash in the corpus is either a frontmatter placeholder or the
    // `**Places** — [[x]]` list form, and both are outside `prose()`. A dash
    // left in running prose is therefore always a slip.
    re: /—|(?<!-)--(?!-)/g,
    msg: "em dash in prose — use a comma, a full stop, or two sentences",
  },
  {
    id: "self-labelling",
    // Telling the reader which part matters. If it matters, the writing shows
    // it; if the writing does not show it, the label will not rescue it.
    re: /\b(what .{0,30} is actually about|that is the measure of|here'?s (what'?s |the )?interesting|the real (story|question) is|is the interesting part|which is the point)\b/gi,
    msg: "tells the reader what to think instead of showing it",
  },
  {
    id: "hollow-intensifier",
    // "a genuine clinic", "truly remarkable". The adjective implies everything
    // else is fake without saying what. State the property instead.
    re: /\b(genuinely|truly|very real)\b|\bgenuine(?!\s+(article|risk))\b/gi,
    msg: "hollow intensifier — state the property rather than insisting on it",
  },
  {
    id: "narrator",
    // docs/ARTICLE-TEMPLATES.md: the record has no first person and no
    // institution. Nothing enforced it until now.
    // Case-insensitive. A lowercase-only pattern let "We think" through when
    // this was first written, which is exactly the class of slip the file
    // exists to catch and ought not to commit itself.
    re: /(^|[^\w'])(I|we|our|us)\b|our records|this site|the editors|the archive\b/gim,
    msg: "the record has no first person and never refers to itself",
  },
  {
    id: "meta",
    // The writing process showing through the page.
    re: /\b(this article|this entry|as (?:noted|mentioned) above|see below|the author|citation needed)\b/gi,
    msg: "the article referring to itself",
  },
];

const WARNINGS = [
  {
    id: "silence-habit",
    /*
     * "X has never said / explained / written / suggested / admitted."
     *
     * The construction is IN voice and the doc blesses it: the record
     * withholds rather than hedges. It is a spice. The DeVito article ran nine
     * of them and read as one arch narrator doing a bit, which is what a
     * reader finally caught. Corpus max outside that article is one.
     */
    re: /\b(never|nobody|no one|nothing)\b[^.]{0,70}\b(said|says|explained|written|wrote|suggested|instituted|treated|obliged|dressed|conferred|pretended|asked|admitted|acknowledged|published|recorded|commented|disputed|questioned|challenged|bothered)\b/gi,
    limit: 2,
    msg: (n) => `${n} "has never said/explained/..." constructions; over ${2} it reads as a tic`,
  },
];

/* Negation density. Measured across all 25 articles: Krys's own run 3.9 to
 * 15.8 per thousand words. Above that an article is defining things by what
 * they are not, which is the same habit the warning above catches in miniature.
 */
const NEG = /\b(never|nobody|no one|nothing|not been|has not|have not|had not|did not|does not|is not|was not)\b/gi;
const NEG_CEILING = 16;

const files = fs.existsSync(DIR)
  ? fs.readdirSync(DIR).filter((f) => f.endsWith(".md")).sort()
  : [];

let errors = 0;
let warnings = 0;

for (const file of files) {
  const raw = fs.readFileSync(path.join(DIR, file), "utf8");
  const text = prose(raw);
  const found = [];

  for (const rule of ERRORS) {
    const hits = text.match(rule.re);
    if (!hits) continue;
    const shown = [...new Set(hits.map((h) => h.trim()))].slice(0, 3).join(", ");
    found.push({ level: "error", text: `${rule.msg}  [${shown}]` });
    errors += hits.length;
  }

  for (const rule of WARNINGS) {
    const n = (text.match(rule.re) || []).length;
    if (n <= rule.limit) continue;
    found.push({ level: "warn", text: rule.msg(n) });
    warnings++;
  }

  /*
   * An article promoted to canon should say what was invented in it.
   * ARTICLE-TEMPLATES.md has always required the companion file; nothing
   * checked, and thirteen articles reached the site without one. A draft is
   * exempt, because a draft is still being argued with.
   */
  const record = (raw.match(/^record:\s*(\w+)/m) || [])[1];
  const slug = file.replace(/\.md$/, "");
  if (record === "canon" && !fs.existsSync(path.join(NOTES, `${slug}-notes.md`))) {
    found.push({
      level: "warn",
      text: `marked canon with no notes/${slug}-notes.md recording what was invented`,
    });
    warnings++;
  }

  const words = text.split(/\s+/).filter(Boolean).length;
  const per1k = words ? (1000 * (text.match(NEG) || []).length) / words : 0;
  if (per1k > NEG_CEILING) {
    found.push({
      level: "warn",
      text: `negation density ${per1k.toFixed(1)} per 1k words (corpus tops out at 15.8)`,
    });
    warnings++;
  }

  if (found.length) {
    console.log(`\n${file}`);
    for (const f of found) {
      console.log(`  ${f.level === "error" ? "✗" : "!"} ${f.text}`);
    }
  }
}

console.log(
  `\n${files.length} article${files.length === 1 ? "" : "s"} read, ` +
  `${errors} error${errors === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}.`
);
if (warnings && !errors) console.log("Warnings do not fail the build. Read them anyway.");
process.exit(errors ? 1 : 0);

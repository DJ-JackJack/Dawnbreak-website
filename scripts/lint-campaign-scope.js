#!/usr/bin/env node
/**
 * Every database query in the player area must be scoped to this campaign.
 *
 * Ahvantir and Dawnbreak City share one Supabase project. Nine tables carry a
 * `campaign` column; a query that forgets to filter on it returns the OTHER
 * campaign's rows — a player's D&D characters showing up in the superhero game,
 * or worse, one table's session notes leaking into the other's.
 *
 * Nothing errors when that happens. The page renders, the data is simply wrong,
 * and the only way to notice is for a person to recognise a name they should
 * not be seeing. That is precisely the class of bug worth spending a linter on.
 *
 * There are 41 query sites across ~2,200 lines of player JS. Checking them by
 * hand once is feasible; checking them again after every future edit is not.
 *
 * Run: `npm run lint:scope`. CI runs it too.
 *
 * ## What it checks
 *
 * For each `.from("<scoped table>")` it walks forward to the end of the
 * statement and requires that the chain mentions `campaign` — either as a
 * filter (`.eq("campaign", …)`) or in an inserted payload.
 *
 * ## What it deliberately ignores
 *
 * `supabase.storage.from("character-images")` — Storage buckets, not tables.
 * Note the HYPHEN: the bucket is `character-images`, the table is
 * `character_images`. They differ by one character and mean entirely different
 * things, which is exactly why this is matched against an explicit table list
 * rather than any `.from(` call.
 */

const fs = require("fs");
const path = require("path");

/** The nine tables that carry a campaign column. `profiles` deliberately does not. */
const SCOPED_TABLES = [
  "characters",
  "character_secrets",
  "character_images",
  "campaign_notes",
  "messages",
  "player_bookmarks",
  "player_notes",
  "player_scratchpad",
  "sessions",
];

const JS_DIR = path.join(__dirname, "..", "src", "assets", "js");

/**
 * The text of one query chain, starting at a `.from(...)` and running to the
 * end of the statement.
 *
 * Chains here span multiple lines and end at a `;`, but a `;` can also appear
 * inside a string. Scanning character by character with a string-literal guard
 * is duller than a regex and does not fall over on the first awkward case.
 */
function chainFrom(src, start) {
  let i = start;
  let depth = 0;
  let quote = null;
  for (; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === "\\") { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { quote = c; continue; }
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === ";" && depth <= 0) break;
  }
  return src.slice(start, i);
}

function checkFile(file, src) {
  const problems = [];
  for (const table of SCOPED_TABLES) {
    // Either quote style, and only a database `.from` -- a storage call reads
    // `storage.from(`, which this pattern will also match, so it is excluded
    // explicitly below.
    const re = new RegExp(`\\.from\\(\\s*['"]${table}['"]\\s*\\)`, "g");
    let m;
    while ((m = re.exec(src))) {
      const before = src.slice(Math.max(0, m.index - 40), m.index);
      if (/storage\s*$/.test(before)) continue;   // a bucket, not a table

      const chain = chainFrom(src, m.index);
      /*
       * `\bcampaign\b`, not `campaign`.
       *
       * One of the scoped tables is literally called `campaign_notes`, so a
       * bare substring test finds the word inside the table name and passes
       * every query against it — the checker reporting success precisely where
       * it was needed most. `_` is a word character, so there is no boundary
       * between `campaign` and `_notes`, and the anchored form matches only a
       * real reference: `.eq("campaign", …)` or `campaign:` in a payload.
       */
      if (!/\bcampaign\b/.test(chain)) {
        const line = src.slice(0, m.index).split("\n").length;
        problems.push(
          `${file}:${line}  .from("${table}") is not scoped to a campaign — ` +
          `add .eq("campaign", CAMPAIGN) or include campaign in the payload`);
      }
    }
  }
  return problems;
}

if (!fs.existsSync(JS_DIR)) {
  console.log("No src/assets/js/ yet — nothing to check.");
  process.exit(0);
}

const files = fs.readdirSync(JS_DIR).filter((f) => f.endsWith(".js")).sort();
let problems = [];
let queries = 0;

for (const file of files) {
  const src = fs.readFileSync(path.join(JS_DIR, file), "utf8");
  for (const table of SCOPED_TABLES) {
    queries += (src.match(new RegExp(`\\.from\\(\\s*['"]${table}['"]`, "g")) || []).length;
  }
  problems = problems.concat(checkFile(file, src));
}

for (const p of problems) console.error("  • " + p);
console.log(
  `\n${files.length} file${files.length === 1 ? "" : "s"} checked, ` +
  `${queries} scoped-table quer${queries === 1 ? "y" : "ies"}, ` +
  `${problems.length} unscoped.`);
process.exit(problems.length ? 1 : 0);

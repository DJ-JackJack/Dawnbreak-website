#!/usr/bin/env node
/**
 * No link in the built site should lead to a 404.
 *
 * This exists because I shipped a dashboard whose cards pointed at four pages,
 * two of which had not been built. Nothing failed: the site built cleanly, the
 * links rendered, and the first person to click one got a 404. A human found it
 * before this did, which is the wrong order.
 *
 * Run after a build: `npm run check:links` (CI runs it as part of build:prod).
 *
 * ## Wiki links are a separate case
 *
 * `[[New Haven]]` pointing at an article nobody has written yet is not a
 * defect — it is how a wiki says "this is worth writing". Those are reported
 * as a list and do NOT fail the check. Everything else does.
 */

const fs = require("fs");
const path = require("path");

const SITE = path.join(__dirname, "..", "_site");

function walk(dir, fn) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, fn);
    else fn(full);
  }
}

if (!fs.existsSync(SITE)) {
  console.error("No _site/ — run a build first.");
  process.exit(1);
}

/** Every URL the built site actually serves. */
const pages = new Set(["/"]);
walk(SITE, (file) => {
  if (path.basename(file) !== "index.html") return;
  const rel = path.relative(SITE, path.dirname(file)).split(path.sep).join("/");
  pages.add(rel === "" ? "/" : `/${rel}/`);
});

const broken = new Map();   // href -> Set of pages linking to it
const wiki = new Map();

walk(SITE, (file) => {
  if (!file.endsWith(".html")) return;
  const html = fs.readFileSync(file, "utf8");
  const from = path.relative(SITE, file).split(path.sep).join("/");

  // Only directory-style internal links. Assets carry an extension and are
  // served directly; off-site links are not ours to verify.
  for (const m of html.matchAll(/href="(\/[^"#?]*\/)"/g)) {
    const href = m[1];
    if (pages.has(href)) continue;
    // A wiki link carries the class the markdown transform gives it.
    const isWiki = new RegExp(`class="wikilink"[^>]*href="${href}"|href="${href}"[^>]*class="wikilink"`)
      .test(html);
    const bucket = isWiki ? wiki : broken;
    if (!bucket.has(href)) bucket.set(href, new Set());
    bucket.get(href).add(from);
  }
});

if (wiki.size) {
  console.log(`${wiki.size} unwritten article${wiki.size === 1 ? "" : "s"} linked from the record:`);
  for (const [href, from] of [...wiki].sort()) {
    console.log(`  ${href}  (from ${[...from].join(", ")})`);
  }
  console.log("");
}

if (broken.size) {
  console.error(`${broken.size} broken link${broken.size === 1 ? "" : "s"}:`);
  for (const [href, from] of [...broken].sort()) {
    console.error(`  • ${href}  linked from ${[...from].join(", ")}`);
  }
  process.exit(1);
}

console.log(`${pages.size} pages, no broken links.`);

#!/usr/bin/env node
/**
 * The Obsidian converter, pinned.
 *
 * This is the one piece of the site nobody watches while it runs: it fires
 * from Task Scheduler on a Sunday night and pushes whatever it produced. A
 * transformation that quietly stops working would show up as articles going
 * subtly wrong on the live site, days later, with no error anywhere.
 *
 * So every transformation is asserted here, and — the part that matters —
 * asserted in a way that can actually FAIL. Several of these were written as
 * "the output contains the body text", which passes whether or not the
 * transformation ran at all. Each one below checks for the thing that should
 * be there AND the thing that should be gone.
 */

const { convert, buildFrontmatter, stripInlineTags, convertWarnings, convertNotes, slugify } =
  require("./obsidian-to-md.js");

let pass = 0, fail = 0;

function ok(cond, what) {
  if (cond) pass++;
  else { fail++; console.error(`FAIL ${what}`); }
}
function eq(got, want, what) {
  if (got === want) pass++;
  else { fail++; console.error(`FAIL ${what}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`); }
}

/** A minimal, valid Locations note. Fields are overridable per test. */
function note(front = {}, body = "A standfirst paragraph.\n\n## The Place\n\nText.") {
  const f = {
    title: "Test Place", category: "locations", summary: "One sentence.",
    record: "draft", tags: "[a, b]", place_type: "district", district: "—",
    status: "standing", built: "2030", h_day: "untouched", operator: "City",
    vault_status: "ready", source: "canon", created: "2026-01-01",
    ...front,
  };
  const lines = Object.entries(f)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join("\n")}\n---\n\n${body}\n`;
}

const run = (raw, dir = "04 - Locations", preserved = { date_added: "2026-01-02" }) =>
  convert(raw, dir, preserved);

/* ------------------------------------------------------------ publishing */

ok(run(note()).content, "a ready note converts");
eq(run(note({ vault_status: "stub" })).skip !== undefined, true, "a stub is skipped");
eq(run(note({ vault_status: null })).skip !== undefined, true, "a note with no vault_status is skipped");

/* The default template ships `vault_status: stub`, so the safe direction is
   "publish only what explicitly says ready" rather than "skip what says stub".
   Anything unrecognised must stay unpublished. */
eq(run(note({ vault_status: "Ready?" })).skip !== undefined, true, "an unrecognised vault_status is skipped");

eq(run(note({ title: "{{title}}" })).skip !== undefined, true, "an unfilled core-Templates title is skipped");
eq(run(note({ title: "<% tp.file.title %>" })).skip !== undefined, true, "an unfilled Templater title is skipped");

/* ------------------------------------------------------------- validation */

/* From an unnumbered folder, so ONLY the category check can produce the error.
   Asserted from "04 - Locations" first, this passed even with the category
   check disabled — the folder-mismatch check was answering for it. */
ok(run(note({ category: "sidekicks" }), "Inbox").error,
   "an unknown category is an error, not a silent pass");
ok(run(note({ category: "heroes" }), "04 - Locations").error,
   "a note filed in the wrong folder is an error — the frontmatter must not silently win");
ok(!run(note(), "Some Other Folder").error,
   "a note outside the numbered folders is not folder-checked");

/* ------------------------------------------------------------ frontmatter */

{
  const out = run(note()).content;
  ok(!/vault_status/.test(out), "vault_status is stripped");
  ok(!/^source:/m.test(out), "source is stripped");
  ok(!/^created:/m.test(out), "created is stripped");
  ok(/^date_added: "2026-01-02"$/m.test(out), "date_added comes from the site, quoted");

  const keys = [...out.matchAll(/^([a-z_]+):/gm)].map((m) => m[1]);
  eq(keys.slice(0, 6).join(","), "title,category,summary,record,date_added,tags",
     "the universal block comes first, in schema order");
  eq(keys[6], "place_type", "the category's own fields follow it");
}

/* Free text is quoted ALWAYS, not just when it needs to be.
 *
 * The colon case alone was not a real test: the general scalar quoter already
 * quotes anything containing a colon, so it passed with the title/summary rule
 * removed. A plain title is the case that distinguishes them — and it is the
 * one that was actually wrong, printing `title: The Old Financial District`. */
{
  const out = run(note()).content;
  ok(/^title: "Test Place"$/m.test(out), "a plain title is quoted anyway");
  ok(/^summary: "One sentence."$/m.test(out), "so is a plain summary");
}
{
  const out = run(note({ title: "H-Day: the morning after" })).content;
  ok(/^title: "H-Day: the morning after"$/m.test(out), "a title containing a colon survives");
}

/* An unknown field is passed through, not dropped: the linter then rejects it,
   which is the correct outcome. Dropping it would hide the author's mistake. */
ok(/^nonsense:/m.test(run(note({ nonsense: "x" })).content), "an unknown field is passed through for the linter to catch");

/* Lists are always emitted as lists, so a single-item list is not flattened
   into a bare string that the linter would then reject. */
{
  const heroBody = "Standfirst.\n\n" +
    ["June 11, 2028", "The Decision", "Capabilities", "In the City",
     "The Public Record", "Contested / unconfirmed", "Related"]
      .map((s) => `## ${s}\n\nText.`).join("\n\n");
  const hero = note({
    category: "heroes", title: "Test Hero", codename: "Test", epithet: "The Test",
    civilian_name: "Undisclosed", generation: "second", powered_since: "2028",
    active_since: "2032", power_source_published: "BEV-131", affiliation: "[Solo Team]",
    base: "Grid Row", status: "active", first_recorded: "2032",
    place_type: null, district: null, built: null, h_day: null, operator: null,
  }, heroBody);
  ok(/^affiliation: \[Solo Team\]$/m.test(run(hero, "01 - Heroes").content),
     "a list written as a list stays one");

  /* An author writing `affiliation: Solo Team` — no brackets — is the common
     slip, and it arrives here as a bare string. Coercing it to a one-item list
     is what keeps the article valid; emitting the bare string would fail the
     linter, and emitting [] would silently lose the affiliation. The bracketed
     case above cannot test this: the parser already returns an array for it. */
  const bare = hero.replace("affiliation: [Solo Team]", "affiliation: Solo Team");
  ok(/^affiliation: \[Solo Team\]$/m.test(run(bare, "01 - Heroes").content),
     "a list field written as a bare string becomes a one-item list");
}

eq(buildFrontmatter("locations", { title: "T", summary: "S", tags: [] }, { date_added: "2026-01-01" })
     .includes("tags: []"), true, "an empty list is emitted as []");

/* ------------------------------------------------------------------ body */

{
  const out = run(note({}, "Standfirst.\n\n## The Place\n\n> [!warning] Spoiler\n> Erroghastor is alive.\n\nAfter.")).content;
  ok(out.includes("{% dmonly %}"), "a warning callout opens a dmonly block");
  ok(out.includes("{% enddmonly %}"), "and closes it");
  ok(out.includes("Erroghastor is alive."), "with the content inside");
  ok(!out.includes("[!warning]"), "and the callout marker is gone");
  ok(!/^> Erroghastor/m.test(out), "and the blockquote prefix is stripped");
}

{
  const out = run(note({}, "Standfirst.\n\n## The Place\n\n> [!note] On the record\n> Contested.\n")).content;
  ok(out.includes("> **On the record**"), "a note callout keeps its title, bolded");
  ok(out.includes("> Contested."), "and stays a blockquote");
  ok(!out.includes("[!note]"), "and the callout marker is gone");
}

{
  const out = run(note({}, "Standfirst.\n\n## The Place\n\n```dataview\nlist from #x\n```\n\nKept.")).content;
  ok(out.includes("Kept."), "text around a dataview block survives");
  ok(!out.includes("dataview"), "and the block itself is gone");
  ok(!out.includes("list from"), "including its query");
}

eq(stripInlineTags("A #hero and a #villain/major here."), "A and a here.",
   "inline tags are removed, and do not leave a doubled space behind");
eq(stripInlineTags("Text.\n#civic\nMore."), "Text.\n\nMore.", "a line of nothing but tags empties out");
eq(stripInlineTags("See [[H-Day]] and Ward #6."), "See [[H-Day]] and Ward #6.",
   "a wiki link and a number sign survive — only real tags go");
eq(stripInlineTags("## Heading"), "## Heading", "a markdown heading is not a tag");

{
  const out = run(note({}, "Standfirst.\n\n## The Place\n\n<% tp.date.now() %>Text.")).content;
  ok(out.includes("Text."), "text after a templater expression survives");
  ok(!out.includes("<%"), "and the expression is gone");
}

{
  const out = run(note({}, "Standfirst.\n\n## The Place\n\n[[New Haven]] and [[H-Day|that day]].")).content;
  ok(out.includes("[[New Haven]]"), "a wiki link is passed through untouched");
  ok(out.includes("[[H-Day|that day]]"), "including an aliased one");
}

/* ---------------------------------------------------------------- slugs */

eq(slugify("The Old Financial District"), "the-old-financial-district", "slug: spaces to hyphens");
eq(slugify("Krys' Bar"), "krys-bar", "slug: apostrophes are dropped, not hyphenated");
eq(slugify("H-Day: The Morning After"), "h-day-the-morning-after", "slug: punctuation collapses");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

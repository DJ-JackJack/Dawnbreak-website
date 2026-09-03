#!/usr/bin/env node
/**
 * The timeline draws from a different field in every category, so the mapping
 * is worth pinning: getting it wrong places an article in the wrong decade, or
 * drops it off the timeline with no error anywhere.
 */
const data = require("../src/articles/articles.11tydata.js");
const year = data.eleventyComputed.timelineYear;

let pass = 0, fail = 0;
const eq = (got, want, what) => {
  if (got === want) pass++;
  else { fail++; console.error(`FAIL ${what}\n  got  ${got}\n  want ${want}`); }
};

eq(year({ category: "events", date: "2028-06-11" }), 2028, "an event uses its date");
eq(year({ category: "organizations", founded: "2038" }), 2038, "an organization uses its founding");
eq(year({ category: "heroes", active_since: "2032", powered_since: "2028" }), 2032,
   "a hero uses active_since, NOT powered_since — the generation rule the book insists on");
eq(year({ category: "villains", first_recorded: "2035-01-02" }), 2035, "a villain uses first_recorded");
eq(year({ category: "locations", built: "2035" }), 2035, "a location uses when it was built");

/* "Pre-H-Day" is the documented answer where nobody has established a year.
   Such an article is absent from the timeline rather than placed wrongly. */
eq(year({ category: "locations", built: "Pre-H-Day" }), null, "a non-year date yields no placement");
eq(year({ category: "heroes" }), null, "a missing field yields no placement");
eq(year({ category: "nonsense", date: "2028" }), null, "an unknown category contributes nothing");

/* Word boundaries: a stray digit run inside an identifier is not a year. */
eq(year({ category: "events", date: "BEV-131" }), null, "a three-digit code is not a year");
eq(year({ category: "events", date: "ref-12345" }), null, "a five-digit run is not a year either");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

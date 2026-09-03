const { CATEGORIES } = require("../_data/schema.js");

/**
 * Directory data for every article.
 *
 * `dossierRows` is the reason `schema.js` has three consumers rather than
 * two: the same definition the linter enforces is what the page renders. A
 * field the template requires therefore always has a visible slot, filled or
 * not, and an unfilled one shows as a gap rather than as nothing at all.
 * Making an omission LOOK like an omission is what keeps the templates
 * honoured once the novelty wears off.
 *
 * Computed rather than written per article, so adding a field to a category
 * updates every existing article in that category at the next build.
 */
module.exports = {
  layout: "article",
  eleventyComputed: {
    /** The category's own colour, applied as `--cat` and used for the edge,
        badge, and section rules. Read from meta.js so the palette lives in
        one place and the stylesheet never restates it. */
    catColor: (data) => {
      const cat = (data.meta?.categories ?? []).find((c) => c.slug === data.category);
      return cat ? cat.color : "#FF7A18";
    },

    /**
     * The year this article belongs at on the city's timeline.
     *
     * Ahvantir's inherited `timeline` collection reads a single
     * `timeline_year` field. Dawnbreak has no such field and should not gain
     * one: every category already carries the date that matters FOR THAT
     * CATEGORY, and forcing authors to restate it in a second field is how
     * two sources of truth start disagreeing.
     *
     * So each category contributes through its own most meaningful date, and
     * the timeline assembles itself out of events, foundings and debuts —
     * which is a truer picture of how a city's history is actually made than
     * a list of events alone.
     *
     * A field may legitimately hold something that is not a year at all —
     * `built: "Pre-H-Day"` is the documented answer where nobody has bothered
     * to find out. Those articles simply do not appear on the timeline, which
     * is correct: the timeline cannot place them.
     */
    timelineYear: (data) => {
      const source = {
        events: data.date,
        organizations: data.founded,
        heroes: data.active_since,
        villains: data.first_recorded,
        locations: data.built,
      }[data.category];
      const match = String(source ?? "").match(/\b(\d{4})\b/);
      return match ? Number(match[1]) : null;
    },

    dossierRows: (data) => {
      const def = CATEGORIES[data.category];
      if (!def) return [];
      return def.fields.map((field) => {
        const raw = data[field.key];
        // A list renders as a joined string; an empty list is an empty value,
        // not "[]". Both are legitimately empty and are styled as such.
        const value = Array.isArray(raw) ? raw.join(", ") : raw ?? "";
        return { label: field.label, value: String(value).trim() };
      });
    },
  },
};

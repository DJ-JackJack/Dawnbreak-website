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

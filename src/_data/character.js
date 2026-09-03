/**
 * What a player's character page records.
 *
 * **No stat numbers.** This is a lore site, not a character sheet — Foundry
 * already owns the authoritative character and every rating on it. Duplicating
 * attributes here would create a second set of numbers to keep in sync, and the
 * copy would be wrong within a session.
 *
 * So the fields below describe WHO a hero is, never what they roll. Powers,
 * talents and drawbacks appear as names, not levels.
 *
 * ## Why these fields and not a fresh invention
 *
 * They are the Heroes article template's vocabulary, from
 * `docs/ARTICLE-TEMPLATES.md`, minus the parts only a published article needs
 * (`record`, `summary`, `tags`) and plus the parts only a player needs
 * (`backstory`, which is theirs to write and not necessarily public).
 *
 * That is deliberate: a player's character and a Heroes article are the same
 * kind of thing at different stages of publicity. Sharing the vocabulary means
 * a character can graduate into a public article with no translation step, and
 * nobody has to decide twice what a hero is made of.
 *
 * Stored as JSON in `characters.data`, which is a `jsonb` column — so adding a
 * field here needs no migration.
 */

/** `type` drives the input the form renders. Nothing here is a number. */
const FIELDS = [
  // ── Identity ──────────────────────────────────────────────
  { key: "codename", label: "Codename", type: "text", group: "Identity",
    note: "The name they work under." },
  { key: "epithet", label: "Epithet", type: "text", group: "Identity",
    note: "What the city calls them. Rarely what they chose." },
  { key: "civilian_name", label: "Civilian name", type: "text", group: "Identity",
    note: '"Undisclosed" is a real answer.' },
  { key: "rank", label: "Rank", type: "select", group: "Identity",
    options: ["Teen Upstart", "Street Defender", "Global Guardian", "Cosmic Champion"] },
  { key: "archetype", label: "Archetype", type: "text", group: "Identity" },
  { key: "role", label: "Role", type: "select", group: "Identity",
    options: ["Blaster", "Brains", "Brawn", "Defender", "Face", "Striker", "Support", "Wildcard"] },
  /*
   * Subjective, in-world, and low-stakes -- Krys's own framing. It strictly
   * applies only to people whose powers came from BEV-131, but the city
   * categorises everyone anyway, which is itself the interesting part. Free
   * text rather than a fixed list, so "second, arguably" is sayable.
   */
  { key: "generation", label: "Generation", type: "text", group: "Identity",
    note: "How the city files them. Set by when they STARTED, not when they were powered." },
  { key: "status", label: "Status", type: "select", group: "Identity",
    options: ["Active", "Inactive", "Retired", "Missing", "Deceased"] },

  // ── Standing ──────────────────────────────────────────────
  { key: "affiliation", label: "Affiliation", type: "text", group: "Standing",
    note: "Team, or blank for independents." },
  { key: "base", label: "Base", type: "text", group: "Standing",
    note: "District, or Citywide." },
  { key: "occupation", label: "Occupation", type: "text", group: "Standing",
    note: "The day job. Often the more interesting half." },

  // ── Kit. Names, never ratings. ────────────────────────────
  { key: "power_source", label: "Power source", type: "text", group: "Kit" },
  { key: "powers", label: "Powers", type: "textarea", group: "Kit",
    note: "Names only. Levels live in Foundry." },
  { key: "talents", label: "Talents", type: "textarea", group: "Kit" },
  { key: "drawbacks", label: "Drawbacks", type: "textarea", group: "Kit" },

  // ── The person ────────────────────────────────────────────
  { key: "personality", label: "Personality", type: "text", group: "The person" },
  { key: "drive", label: "Drive", type: "text", group: "The person" },
  { key: "flaw", label: "Flaw", type: "text", group: "The person" },
  { key: "relationships", label: "Key relationships", type: "textarea", group: "The person" },

  // ── Free text ─────────────────────────────────────────────
  { key: "appearance", label: "Appearance", type: "textarea", group: "Description" },
  { key: "backstory", label: "Backstory", type: "textarea", group: "Description" },
];

/** Group order for the form and the public card. */
const GROUPS = ["Identity", "Standing", "Kit", "The person", "Description"];

/**
 * The line under a hero's name on a card or roster row.
 *
 * Ahvantir's equivalent read "Level 7 · Human · Wizard". None of that exists
 * here, and inventing an Invincible-flavoured stat line would reintroduce
 * exactly the numbers this schema leaves in Foundry. Rank, archetype and
 * affiliation say who someone is without saying what they roll.
 */
function subtitle(data) {
  return [data.rank, data.archetype, data.affiliation].filter(Boolean).join(" · ");
}

module.exports = { FIELDS, GROUPS, subtitle };

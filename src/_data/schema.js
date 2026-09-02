/**
 * The article schema — one definition, three consumers.
 *
 * `docs/ARTICLE-TEMPLATES.md` explains this to a human. This file is the same
 * thing in a form three other things can read:
 *
 *   1. `scripts/lint-articles.js` validates every article against it and fails
 *      CI when one drifts.
 *   2. `scripts/lint-articles.js --new <category> "<Title>"` writes a skeleton
 *      from it, so a new article starts correct instead of being corrected.
 *   3. The article layout renders the dossier panel from it, which is what
 *      makes the structure visible rather than merely required. An empty field
 *      shows as a gap on the page. That is deliberate: the fastest way to keep
 *      a template honoured is to make skipping it look like an omission.
 *
 * Keeping all three off one definition is the entire point. The Ahvantir
 * articles went haphazard because the shape lived only in whoever was writing
 * at the time.
 *
 * `label` is what the dossier panel prints. `note` is authoring guidance and is
 * carried into generated skeletons as a comment; it never reaches the page.
 */

/** Present on every article regardless of category. */
const UNIVERSAL = [
  { key: "title", label: "Title", required: true },
  { key: "category", label: "Category", required: true },
  { key: "summary", label: "Summary", required: true,
    note: "ONE sentence. Cards, search results and the meta description all use it, so it must stand alone." },
  { key: "record", label: "Record", required: true, enum: ["draft", "canon", "contested"],
    note: "draft until Krys says otherwise. Renders as a banner." },
  { key: "date_added", label: "Added", required: true, note: "YYYY-MM-DD" },
  { key: "tags", label: "Tags", required: true, list: true, note: "lowercase-hyphenated, reused across articles" },
];

/**
 * The categories, in the order they appear in navigation.
 *
 * `fields` are category-specific and come after the universal block.
 * `sections` are the fixed `##` headings, in the order they must appear. The
 * standfirst paragraph carries no heading and so is not listed.
 */
const CATEGORIES = {
  heroes: {
    label: "Heroes",
    fields: [
      { key: "codename", label: "Codename", required: true },
      { key: "epithet", label: "Epithet", required: true,
        note: "The name the CITY gave them, which Arkon then adopted. Arkon rarely coins these." },
      { key: "civilian_name", label: "Civilian name", required: true,
        note: '"Undisclosed" is a real answer and itself a fact worth stating.' },
      { key: "generation", label: "Generation", required: true, enum: ["first", "second", "third"],
        note: "Set by when they STARTED heroing, never by when they got powers. Coldstreak is the reference case." },
      { key: "powered_since", label: "Powered since", required: true, note: "The year they got it." },
      { key: "active_since", label: "Active since", required: true,
        note: "The year they started. Frequently not the same as powered_since, and never collapsed into it." },
      { key: "power_source_published", label: "Power source (as published)", required: true,
        note: "What the record SAYS. Worded to admit it may be wrong, because for at least one hero it is." },
      { key: "affiliation", label: "Affiliation", required: true, list: true, note: "[] for independents." },
      { key: "base", label: "Base", required: true, note: 'District, or "Citywide".' },
      { key: "status", label: "Status", required: true,
        enum: ["active", "inactive", "retired", "missing", "deceased"] },
      { key: "first_recorded", label: "First recorded", required: false,
        note: "First confirmed public appearance." },
    ],
    sections: [
      "June 11, 2028", "The Decision", "Capabilities", "In the City",
      "The Public Record", "Contested / unconfirmed", "Related",
    ],
  },

  villains: {
    label: "Villains",
    fields: [
      { key: "alias", label: "Alias", required: true },
      { key: "epithet", label: "Epithet", required: true, note: "What the press or the street calls them." },
      { key: "civilian_name", label: "Civilian name", required: true,
        note: '"Unidentified" — a meaningful distinction from a hero\'s "Undisclosed".' },
      { key: "first_recorded", label: "First recorded", required: true, note: "First confirmed incident." },
      { key: "power_source_published", label: "Power source (as published)", required: true },
      { key: "status", label: "Status", required: true,
        enum: ["at large", "in custody", "deceased", "unknown"] },
      { key: "custody", label: "Custody", required: true,
        note: 'Tartarus Sands | DCPD | federal | "—"' },
      { key: "territory", label: "Territory", required: true, note: 'District, or "Itinerant".' },
      { key: "associated", label: "Associated", required: true, list: true },
    ],
    sections: [
      "Emergence", "Method", "Capabilities", "Encounters", "Custody",
      "The Public Record", "Contested / unconfirmed", "Related",
    ],
  },

  organizations: {
    label: "Organizations",
    fields: [
      { key: "org_type", label: "Type", required: true,
        enum: ["hero team", "agency", "corporation", "police", "criminal", "civic", "media", "sports"] },
      { key: "founded", label: "Founded", required: true },
      { key: "founded_by", label: "Founded by", required: true },
      { key: "headquarters", label: "Headquarters", required: true },
      { key: "leadership", label: "Leadership", required: true },
      { key: "parent", label: "Parent", required: true,
        note: 'Who owns it. "—" for independent, which is itself a real claim.' },
      { key: "status", label: "Status", required: true,
        enum: ["active", "dormant", "defunct", "dissolved"] },
      { key: "members", label: "Members", required: true, list: true, note: "Teams and rosters only; [] otherwise." },
    ],
    sections: [
      "Founding", "Structure", "Operations", "In the City",
      "The Public Record", "Contested / unconfirmed", "Related",
    ],
  },

  locations: {
    label: "Locations",
    fields: [
      { key: "place_type", label: "Type", required: true,
        enum: ["district", "landmark", "building", "infrastructure", "institution"] },
      { key: "district", label: "District", required: true, note: 'Parent district, or "—" for a district itself.' },
      { key: "status", label: "Status", required: true,
        enum: ["standing", "rebuilt", "condemned", "levelled", "lost"] },
      { key: "built", label: "Built", required: true,
        note: '"Pre-H-Day" where nobody has bothered to find out.' },
      { key: "h_day", label: "H-Day", required: true,
        enum: ["ground zero", "destroyed", "damaged", "untouched", "postdates H-Day"] },
      { key: "operator", label: "Operator", required: true, note: "City, corporation, or nobody." },
    ],
    sections: [
      "The Place", "H-Day and After", "Who's There", "Incidents",
      "The Public Record", "Contested / unconfirmed", "Related",
    ],
  },

  events: {
    label: "Events",
    fields: [
      { key: "event_type", label: "Type", required: true,
        enum: ["attack", "disaster", "founding", "legal", "civic", "anniversary"] },
      { key: "date", label: "Date", required: true, note: "YYYY-MM-DD where known, YYYY where not." },
      { key: "location", label: "Location", required: true },
      { key: "toll", label: "Toll", required: true,
        note: 'Human cost in the terms the record uses. "Never established" is a real and common answer.' },
      { key: "participants", label: "Participants", required: true, list: true },
      { key: "status", label: "Status", required: true,
        enum: ["resolved", "ongoing", "unresolved", "annual"] },
    ],
    sections: [
      "What Happened", "The Response", "Aftermath", "How It's Remembered",
      "The Public Record", "Contested / unconfirmed", "Related",
    ],
  },
};

module.exports = { UNIVERSAL, CATEGORIES };

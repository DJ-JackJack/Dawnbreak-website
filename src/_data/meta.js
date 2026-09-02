/**
 * Site-wide data for Dawnbreak City.
 *
 * The five categories below are the top-level shape of the whole site: they
 * drive the home page's index, the article header chips, the colour a card is
 * edged with, and the filters on search. Adding one here adds it everywhere,
 * so this is the file to edit as the world grows rather than any template.
 *
 * `color` is a real design decision, not decoration. Every category is a hue
 * the night palette already contains, so a page full of mixed categories still
 * reads as one city after dark rather than a bag of highlighters.
 */
module.exports = {
  /**
   * Dawnbreak needs its OWN Supabase project -- not Ahvantir's.
   *
   * Copying Ahvantir's credentials here would put both campaigns' players in
   * one `profiles` table, sharing one `is_dm` flag: an Ahvantir player would
   * arrive already signed in, and the DM flag would carry across settings. So
   * these stay empty until a second project exists, and the player area is
   * inert (and says so) while they are.
   *
   * The anon key IS meant to be public -- it ships to every browser, and Row
   * Level Security is what actually protects the data. Committing it to a
   * public repo is normal and safe PROVIDED RLS is switched on for every
   * table; `scripts/supabase-schema.sql` sets those policies up.
   */
  supabase: {
    url: "",
    anonKey: "",
  },

  /**
   * The other setting, for the header switcher.
   *
   * The switcher is the one control that exists on both sites, and it is
   * deliberately the same object on each — same geometry, same proportions,
   * same behaviour — wearing this site's tokens instead of Ahvantir's. It
   * should read as the seam between two worlds, not as a stray outbound link.
   *
   * Blanking `url` removes the control site-wide without touching a template.
   */
  sister: {
    label: "Ahvantir",
    url: "https://ahvantir.world/",
  },

  site: {
    title: "Dawnbreak City",
    /**
     * Not a slogan the site invented — a phrase the city has carried since its
     * founding, whose meaning H-Day took away from it. The refugees who founded
     * Dawnbreak meant a place where a life could be changed. After 11 June 2028
     * it means something that happens to people rather than something they
     * choose. Nobody rebranded; the words simply stopped meaning the first
     * thing. See docs/CANON-NOTES.md.
     */
    subtitle: "The City of Changes",
    description:
      "The living record of Dawnbreak City — its heroes, the people who fight them, " +
      "the streets they keep wrecking, and the day everything changed.",
    url: "https://dawnbreak.ahvantir.world",
    author: "Krys (M4st3r_0f_G4m3s)",
    /** The Foundry tunnel the /play/ page embeds and polls. */
    foundry: "https://play-tunnel.ahvantir.world",
  },

  categories: [
    {
      slug: "heroes",
      label: "Heroes",
      icon: "✷",
      color: "#FF7A18",
      description: "The people who answer the call, and what it costs them",
    },
    {
      slug: "villains",
      label: "Villains",
      icon: "✖",
      color: "#FF3355",
      description: "Threats to the city, from street muscle to world-enders",
    },
    {
      slug: "organizations",
      label: "Organizations",
      icon: "◈",
      color: "#33E1ED",
      description: "Teams, agencies, corporations, and the people pulling strings",
    },
    {
      slug: "locations",
      label: "Locations",
      icon: "▲",
      color: "#FFC145",
      description: "Districts, landmarks, and the places that keep getting levelled",
    },
    {
      slug: "events",
      label: "Events",
      icon: "◆",
      color: "#A78BFA",
      description: "H-Day, the anniversaries, and everything the city still measures time by",
    },
  ],
};

# Article templates

The fixed structure for every article on the Dawnbreak City site. One template
per category. Fields and section order do not change between articles in a
category — only the content inside them.

This exists because the Ahvantir articles were written without it and read as
several hundred separate essays rather than one reference work. The cure is
boring and it works: decide the shape once, then never decide it again.

**Written before any article, deliberately.** Changing a template later means
revisiting every article already written under it.

---

## The voice

**Default, and the one every template below is written for: the site is a civic
record, not a publication with an agenda.** Neutral, specific, unhurried. It
reports what is known, attributes what is claimed, and says plainly when the
two differ.

In-world publications — the Arkon Media Pantheon roster above all — are
**quoted inside** articles, never adopted as the site's own voice. That keeps
your existing Arkon material usable exactly as written, as a source with a
byline, and it stops "Locations" and "Events" articles from having to sound
like a press release, which they cannot.

The alternative, if you want it, is that the site IS an in-world artifact —
the city's own archive, or an independent outlet operating in Arkon's shadow.
That is a better story and a worse encyclopedia, and it would mean rewriting
all five templates around a narrator. Say the word and I will.

---

## Rules that apply to every article

Lifted from your own `pantheon-bio-template.md`, because they were right there.

- **Every field appears in every article, in the order given.** If a field
  genuinely does not apply, fill it anyway — `—` is a last resort, and what
  gets written in an awkward field is usually characterization. A record that
  publishes a blank has told you something about the record.
- **Section headings are fixed.** Do not add, remove, rename or reorder them.
  Content may be short; the heading still appears.
- **Nothing may contradict `dawnbreak-canon.md`.** An article may omit, soften,
  reframe and imply. It may not state something canon says is false, unless it
  is explicitly reporting a claim someone else made — in which case it is
  attributed.
- **Invented details are flagged**, every time, in the article's own
  `Open questions` block, so they stay easy for you to overrule. This is the
  habit already visible in `dawnbreak-harriers.md` and it should not be lost.
- **`record: draft` until you say otherwise.** Nothing becomes canon by being
  written down and forgotten about.
- **Never invent named first-generation heroes.** Canon is explicit: there was
  no first-generation team, an earlier session invented one and it was deleted.
  The framing exists; the roster deliberately does not.

### One rule the public repo adds

The site's source is a **public GitHub repository**. Anything committed is
readable by anyone who finds it, permanently, including in git history.

**So an article contains only what the city could plausibly know.** Genuine
secrets — Witchmark's fabricated origin, the threat registry, session prep —
stay in `dawnbreak-canon.md` on your machine and never enter the repo.

This is not a limitation to work around. It is the setting: the public record
is thin and partly wrong in exactly the places that matter, and an article that
says *"the attribution has never been independently verified"* is both true and
spoiler-free. Where you want the reader to feel a gap, the
`Contested / unconfirmed` section is the tool.

---

## Universal frontmatter

Every article, every category, opens with these. Category fields come after,
before the closing `---`.

```yaml
---
title: ""            # what the article is filed under, and its <h1>
category: ""         # heroes | villains | organizations | locations | events
summary: ""          # ONE sentence. Cards, search results and meta description
                     # all use it, so it must stand alone with no context.
record: draft        # draft | canon | contested
date_added: ""       # YYYY-MM-DD
tags: []             # lowercase-hyphenated, free-form, reused across articles
---
```

**`record`** renders as a visible banner. `draft` says this is a build you can
overrule; `contested` says the city itself disagrees about this. Both are
honest states for a living setting and neither should be embarrassing.

**`summary`** is the field most likely to be written lazily and most likely to
be read. It appears on every card and every search result. One sentence, no
wiki links, understandable to someone who has read nothing else.

---

## HEROES

```yaml
codename: ""                  # the name they work under
epithet: ""                   # the name the CITY gave them, which Arkon then
                              # adopted. Arkon rarely coins these; it catches
                              # them and monetizes them.
civilian_name: ""             # or "Undisclosed" — itself a fact worth stating
generation: ""                # first | second | third
powered_since: ""             # the year they GOT it
active_since: ""              # the year they STARTED. Never the same field as
                              # above, and frequently not the same year.
power_source_published: ""    # what the record SAYS. Worded to admit it may be
                              # wrong, because for at least one hero it is.
affiliation: []               # [[Pantheon]], or [] for independents
base: ""                      # district, or "Citywide"
status: ""                    # active | inactive | retired | missing | deceased
first_recorded: ""            # first confirmed public appearance, YYYY-MM-DD
```

**Sections, in order:**

1. *(standfirst — one short paragraph, no heading)* Who they are and why the
   city knows the name. Assume the reader knows nothing.
2. **June 11, 2028** — where they were on H-Day and what it did to them. The
   spine of the site. Even a hero born after 2028 gets this section: what H-Day
   means to someone who only ever knew the after.
3. **The Decision** — when and why they started, and what it cost. If
   `powered_since` and `active_since` differ, this is where the gap is
   explained. Coldstreak's four years are the reference case.
4. **Capabilities** — what they can do, and the limits that are publicly known.
   Not a stat block; the site is a record, not a character sheet.
5. **In the City** — where they operate, who they work alongside, and their
   standing with the DCPD, Arkon Media and the public. Three different
   relationships, often three different answers.
6. **The Public Record** — what has actually been published about them, by whom,
   and where it is thin. Arkon roster copy is quoted here with attribution.
7. **Contested / unconfirmed** — what the city argues about. Omit the section
   only if there is genuinely nothing, which is rare for anyone famous.
8. **Related** — wiki links, grouped: people, places, events.

---

## VILLAINS

```yaml
alias: ""                     # the name they are recorded under
epithet: ""                   # what the press or the street calls them
civilian_name: ""             # or "Unidentified" — a meaningful distinction
                              # from a hero's "Undisclosed"
first_recorded: ""            # first confirmed incident, YYYY-MM-DD
power_source_published: ""    # the attributed origin, same caveat as heroes
status: ""                    # at large | in custody | deceased | unknown
custody: ""                   # Tartarus Sands | DCPD | federal | —
territory: ""                 # district, or "Itinerant"
associated: []                # [[organizations]] and other individuals
```

**Sections, in order:**

1. *(standfirst)* What they do and why the city is afraid of it — or isn't,
   which is sometimes the more interesting answer.
2. **Emergence** — when the city first knew. For anyone active since 2028, this
   section carries the H-Day relationship the way a hero's does.
3. **Method** — how they operate and what they actually want. The wants matter
   more than the powers.
4. **Capabilities** — what they can do, and what has stopped them before.
5. **Encounters** — notable incidents, who has faced them, how it ended.
6. **Custody** — arrests, Tartarus Sands, escapes, current whereabouts. If
   `status` is `at large`, this section says how long and why.
7. **The Public Record** — how they have been reported, and by whom. A villain
   Arkon finds useful is covered differently from one it does not.
8. **Contested / unconfirmed**
9. **Related**

---

## ORGANIZATIONS

```yaml
org_type: ""                  # hero team | agency | corporation | police |
                              # criminal | civic | media | sports
founded: ""                   # year
founded_by: ""
headquarters: ""              # district or named building
leadership: ""
parent: ""                    # who owns it — [[Arkon Media]] more often than
                              # anyone in the city is comfortable with. "—" for
                              # independent, and that is a real claim.
status: ""                    # active | dormant | defunct | dissolved
members: []                   # wiki links, for teams and rosters
```

**Sections, in order:**

1. *(standfirst)* What it is and what it is for.
2. **Founding** — when, why, and who wanted it to exist. For anything founded
   after 2028, its relationship to H-Day belongs here.
3. **Structure** — leadership, membership, how decisions actually get made as
   opposed to how the org chart says they do.
4. **Operations** — what it does day to day. The least glamorous section and
   usually the most revealing.
5. **In the City** — standing, reputation, and who it answers to. For anything
   Arkon owns, the gap between the brand and the operation lives here.
6. **The Public Record**
7. **Contested / unconfirmed**
8. **Related**

---

## LOCATIONS

```yaml
place_type: ""                # district | landmark | building | infrastructure
                              # | institution
district: ""                  # the parent district, or "—" for a district itself
status: ""                    # standing | rebuilt | condemned | levelled | lost
built: ""                     # year, or "Pre-H-Day" where nobody has bothered
                              # to find out
h_day: ""                     # ground zero | destroyed | damaged | untouched
                              # | postdates H-Day
operator: ""                  # who runs it — city, corporation, nobody
```

**Sections, in order:**

1. *(standfirst)* Where it is and what it is for.
2. **The Place** — what it is actually like to stand there. Sound, light,
   smell, who is around. The section that stops a location article from being
   a map annotation.
3. **H-Day and After** — what happened to it on June 11 and what happened next.
   For anything built after 2028, what it replaced.
4. **Who's There** — residents, businesses, institutions, and who is not there
   any more.
5. **Incidents** — what has happened here since. In a city where fights level
   blocks, this section fills itself.
6. **The Public Record** — property values, official designations, the things
   the city says on paper about a place everyone knows better.
7. **Contested / unconfirmed** — the Old Financial District's unproven mutation
   cases are the model: never proven, never debunked, and load-bearing.
8. **Related**

---

## EVENTS

```yaml
event_type: ""                # attack | disaster | founding | legal | civic |
                              # anniversary
date: ""                      # YYYY-MM-DD where known, YYYY where not
location: ""                  # wiki link
toll: ""                      # human cost, in the terms the record uses.
                              # "Never established" is a real and common answer.
participants: []              # wiki links
status: ""                    # resolved | ongoing | unresolved | annual
```

**Sections, in order:**

1. *(standfirst)* What happened, in one paragraph, for someone who has never
   heard of it.
2. **What Happened** — the sequence, in order, with times where they are known.
3. **The Response** — who acted and how fast. DCPD, heroes, federal, Arkon's
   cameras. Frequently four different answers to "who helped".
4. **Aftermath** — what changed, structurally and legally.
5. **How It's Remembered** — anniversaries, memorials, media, and who is unhappy
   with the version that stuck. June 11 is the model and canon already treats
   the anniversary as its own subject.
6. **The Public Record**
7. **Contested / unconfirmed**
8. **Related**

---

## Open questions

Every article ends with this block, or omits it if there is genuinely nothing.
It does not render in the published article — it is authoring scaffolding, and
it is the mechanism that keeps invented detail overrulable.

```markdown
<!-- OPEN QUESTIONS
- Invented: the Cross's naming-rights contract detail. Overrule freely.
- Unresolved: does the DCPD still staff the Aldergate courthouse post-2038?
-->
```

An HTML comment, so it survives in the source, travels with the article, and
never reaches the page. Note that it DOES reach the public repo — so it holds
"what I made up", never "what the players must not know".

---

## Enforcement

`npm run lint:articles` checks every file in `src/articles/` against the
category it declares: required frontmatter present, no unknown fields, section
headings present and in order, `summary` a single sentence, `record` a legal
value. It fails the build in CI.

That is the actual difference between a template and a good intention. Ahvantir
had good intentions.

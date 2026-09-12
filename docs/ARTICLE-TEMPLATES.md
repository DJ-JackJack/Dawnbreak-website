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

**Neutral, vague, and quietly omniscient. The narrator is never named,
described, explained or acknowledged.**

The record knows more than it says. It states things nobody in the city could
have verified, and it does not draw attention to the fact that it knows them.
It does not have a masthead, a byline, an editorial policy or an about page. It
never refers to itself.

That is the whole effect, and it is fragile: one sentence explaining where the
information came from collapses it.

### What that means in practice

- **Never `I`, `we`, `our records`, `this site`, `the editors`, `the archive`.**
  There is no first person and no institution. If a sentence needs a subject,
  it is the city, the DCPD, Arkon, or the fact itself.
- **Never explain the record's own limits.** "The connection has never been
  established" is in voice. "No sources could be found" is not — it admits
  someone was looking.
- **State plainly; attribute where it matters.** When something is disputed,
  the dispute is reported as a fact, flatly. Avoid `some say`, `it is
  rumoured`, `many believe` — hedges make the narrator sound uncertain, and it
  is not uncertain. It is *withholding*, which is different.
- **Occasionally know too much, and never wink about it.** A private
  conversation, a number nobody published, what someone was thinking. Used
  sparingly it is the entire character of the thing. Used with a nudge —
  irony, a knowing aside, a rhetorical question — it dies instantly.
- **No jokes at the subject's expense.** Dry is fine, and understatement is the
  register. Sneering is not.
- **Unhurried.** Nothing is being sold and nothing is urgent. Short declarative
  sentences, and no build-up to a reveal.

In-world publications — the Arkon Media Pantheon roster above all — are
**quoted inside** articles with attribution, never adopted as the narrator's
own voice. Arkon has a byline. The record does not.

### The line this walks

The narrator must never become a character. No personality, no history, no
motive, no hints toward any of the three. A reader should finish fifty articles
with the strong sense that something is telling them this, and nothing whatever
to say about what.

---

### What goes wrong anyway

Everything above was already written down when the articles below were drafted,
and the same faults kept appearing. These are the ones that recur, each with the
article that produced it.

- **Emphasis is earned, never asserted.** A one-line paragraph should carry a
  fact. `The city had nothing to do with it.` carries none: it performs weight
  by sitting alone. The test is deletion. Cut the line; if nothing is lost, it
  was never content. *(DeVito school)*

- **Density turns a device into a tic.** `X has never said / explained /
  written` is in voice — the record withholds rather than hedges, and that is
  the effect. One or two of them per article is the register. Nine of them in
  one article reads as an arch narrator doing a bit, and a reader noticed before
  any tooling did. `lint:prose` warns above two. *(DeVito school, Oracle Prime)*

- **Point the dryness at institutions, never at people.** Dawnbreak attaching
  itself to a dead actor's news cycle is fair game. The actor is not. `he was an
  actor, which is the whole of his qualification for what he did` is a sneer
  wearing the house register, and it shipped. *(DeVito school)*

- **Take the subject's reasoning seriously.** A man with an irregular heartbeat
  concluding he was developing powers is not deluded in a city where that
  happens to people. Written as a misapprehension he is a punchline; written as
  a reasonable inference the same paragraph is tragic. Nothing was added to make
  that turn, only granted. *(DeVito school)*

- **Do not explain the joke.** A detail that lands, or a title like *A Hero
  Nonetheless*, does its own work. A sentence telling the reader what it is
  getting at replaces the effect with a description of the effect.
  *(DeVito school)*

- **A heading is not a reason to write.** An article whose subject has no
  connection to H-Day has nothing to put under that heading, and `there is no
  H-Day history here` is a section spent saying so. `schema.js` lets a section
  declare `omitWhen`; the dossier already carries the fact in a line.
  *(DeVito school)*

- **Repeat the right word rather than varying it.** Encyclopedic prose repeats
  proper nouns by design, and a type-token ratio near 0.40 is normal at length
  for this corpus. Reaching for synonyms to lift a number produces thesaurus
  prose, which reads far worse than repetition.

### Measure against this corpus, not a general standard

Every number here came from the articles themselves and is worth re-measuring as
the corpus grows, because the baseline moves.

| | across the articles |
|---|---|
| em dashes in prose | none, anywhere |
| negation density | 3.9 to 15.8 per 1,000 words |
| sentence-length standard deviation | 9.3 to 11.2 |
| type-token ratio | 0.39 to 0.48, falling as an article lengthens |

Structure carries further than vocabulary. Every fault found so far passed the
word-level checks and failed on shape: a drumroll of short declaratives, a
negation split across two sentences, one construction used nine times.

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
- **No article carries an open-questions section.** An article states what is
  there and stops. It does not tell the reader what to wonder about, because
  deciding what is worth asking next is the reader's to do and not the writer's.
- **Invented details are still flagged**, every time, so they stay easy to
  overrule. They go in a companion `<article>-notes.md`, never in the article.
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
spoiler-free. Where you want the reader to feel a gap, state the dispute where
it is relevant and leave it standing. The Old Financial District's unproven
mutation cases sit in its public record; the Harbor's smuggling reputation sits
with the people who work the port. Disputes are setting material and belong in
the body of the article, never gathered into a section of their own.

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
7. **Related** — wiki links, grouped: people, places, events.

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
8. **Related**

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
7. **Related**

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
7. **Related**

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
7. **Related**

---

## Where the open questions went

Articles used to end with an `OPEN QUESTIONS` HTML comment. They no longer do.

An article is an in-world artifact. It records what is there and leaves the
reader to decide what, if anything, they want to know more about. A list of the
writer's own uncertainties, even one that never renders, is the writing process
showing through the page.

Invented detail still has to stay overrulable, so the flagging moved rather than
disappeared. It lives in a companion file beside the article:

```
src/articles/the-old-financial-district.md         the article
notes/the-old-financial-district-notes.md          what was invented, what is unresolved
```

The companion carries what the comment used to: what was made up, what has not
been decided, and what a ruling would change. It holds "what I made up", never
"what the players must not know", since both repos are public.

---

## Writing one

1. **Read `dawnbreak-canon.md` first**, then `open-questions.md`. The second
   matters as much as the first: an entry on that list is something Krys has
   deliberately left undecided, and an article that answers one has invented
   canon rather than recorded it.
2. **Generate the skeleton** — `npm run new <category> "<Title>"` — so the
   frontmatter and headings start correct instead of being corrected.
3. **Draft in the vault**, never in `src/articles/`. The next `npm run sync`
   overwrites anything written there.
4. **Check what the article may know.** Both repos are public. A fact that is
   true in canon but unknown to the city is either attributed to whoever claims
   it, or left out.
5. **`npm run sync && npm test`.** Shape, voice, scope and docs all run.
6. **Read it back before committing**, against the habits above. The linter
   catches words and counts. Nobody has automated whether a paragraph earns its
   emphasis or whether a line sneers at its subject, and those are the two
   faults that have actually reached the site.
7. **Record invented detail** in the companion `notes/<article>-notes.md`, so it
   stays easy to overrule.

---

## Enforcement

`npm test` runs four checks over the articles and their documentation, and CI
runs the same command.

- **`lint:articles`** — shape. Required frontmatter present, no unknown fields,
  section headings present and in order, `summary` a single sentence, `record` a
  legal value.
- **`lint:prose`** — voice. Em dashes in prose, first person, the article
  referring to itself, hollow intensifiers, and telling the reader what to
  think, all of which fail the build. Two densities warn without failing, since
  one instance is the register and a habit is not.
- **`test:docs`** — this file against `schema.js`. The two disagreed once, with
  the doc recommending a section the linter rejected, and the writer caught in
  between.
- **`lint:scope`** — every player-area database query filtered to this campaign.

That is the actual difference between a template and a good intention. Ahvantir
had good intentions.

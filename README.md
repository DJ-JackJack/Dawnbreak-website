# Dawnbreak City

The living record of Dawnbreak City — the setting for an [Invincible –
Superhero Roleplaying](https://freeleaguepublishing.com/) campaign run on
Foundry VTT.

An original setting. No ties to the *Invincible* comic or show.

Sibling site to [ahvantir.world](https://ahvantir.world), and built on the same
machinery: [Eleventy](https://www.11ty.dev/) for the build, wiki-style
`[[links]]` with automatic backlinks, and [Pagefind](https://pagefind.app/) for
search.

## Running it

```bash
npm install
npm run dev            # local server with live reload
npm run lint:articles  # check every article against its template
npm run build:prod     # lint, build, and index for search
```

## Writing an article

**Read `docs/ARTICLE-TEMPLATES.md` first.** Every article belongs to one of five
categories, and each category has a fixed set of frontmatter fields and a fixed
set of section headings. That is deliberate: it is the thing that keeps a few
hundred articles reading as one reference work instead of a few hundred essays.

Start from a generated skeleton rather than a blank file, so the article begins
correct instead of being corrected:

```bash
npm run new heroes "Coldstreak"
npm run new locations "Grid Row"
```

`npm run lint:articles` then checks it — required fields present, no unknown
fields, section headings present and in the right order, `summary` a single
sentence. It fails the build, so a half-finished article cannot quietly ship.

`src/_data/schema.js` is the single definition all of that reads from, and it is
also what the article page renders its dossier panel from. Change a template
there, not in three places.

## A note on what goes in here

**This repository is public.** Anything committed is readable by anyone who
finds it, permanently, including in the git history.

Articles therefore contain only what the city could plausibly know. Campaign
prep, GM-only truth and session material stay out of the repo entirely.

This is less of a constraint than it sounds, because it is also the setting: the
public record is thin and partly wrong in exactly the places that matter. Every
category has a **Contested / unconfirmed** section for saying so out loud.

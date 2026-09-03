# The lore vault

The site does not hold the lore. The Obsidian vault does, and the site is built
from it — the same arrangement Ahvantir uses, with the one thing that went wrong
there fixed.

```
C:\Users\klfal\Documents\Claude\Projects\Dawnbreak Lore
```

Next to `Ahvantir Lore`, so Obsidian sees both and you can switch between them
from the vault picker.

---

## What's in it

```
Dawnbreak Lore/
  01 - Heroes/          write here
  02 - Villains/
  03 - Organizations/
  04 - Locations/       The Old Financial District.md
  05 - Events/
  _Templates/           generated — do not hand-edit
  _Meta/                Home, How this vault works, Open Questions
  Attachments/          images
```

Start at `_Meta/Home.md`.

---

## Writing an article

1. New note in the right numbered folder.
2. **Insert the matching template.** `Ctrl-P` → *Insert template* → pick the one
   for that folder. No plugin needed; Obsidian's built-in Templates plugin is
   already pointed at `_Templates`.
3. Fill in the frontmatter. Each field carries its own note after a `#`, with
   the allowed values where there are any.
4. Write the body. **Do not add, remove, rename or reorder the `##` headings.**
   Content may be short; the heading still appears.
5. Flag anything you invented in the `OPEN QUESTIONS` comment at the foot.
6. When it should go live, change `vault_status: stub` to `vault_status: ready`.

A note stays invisible to the site until it says `ready`. Half-written notes can
sit in the vault indefinitely and nothing leaks.

---

## Publishing

```bash
npm run sync
```

Reads the vault, writes `src/articles/`, and validates everything it wrote. Then
commit and push as normal, or leave it to the weekly task.

```bash
npm run sync:dry
```

Same thing, reporting what would change without writing anything.

It also tells you which `[[Wiki Links]]` point at articles nobody has written
yet — a to-write list that maintains itself.

### The weekly task

`scripts/dawnbreak-weekly-sync.ps1` syncs, commits and pushes every **Sunday at
21:15**, which rebuilds the site. Fifteen minutes after the Ahvantir sync, so the
two never collide. Registration command is at the bottom of that file; it isn't
registered yet.

Log: `Desktop\Claude_Directory\dawnbreak-sync-log.txt`.

Worth checking once after you register it, and once in a while after that:

```bash
schtasks /Query /TN "Dawnbreak Weekly Lore Sync" /FO LIST
```

`Status: Ready` and a Sunday in `Next Run Time` mean it is armed. A task can
register successfully and then sit `Disabled`, in which case the vault simply
stops reaching the site with nothing to announce it — which is what happened
to the Ahvantir sync, quietly, at the end of June.

**If an article fails validation the sync stops before committing.** The
converted files are still written, so you can see what went wrong in the diff,
but nothing reaches the live site.

---

## What the sync does to a note

| In the vault | On the site |
|---|---|
| `vault_status: stub` | skipped entirely |
| `vault_status`, `source`, `created` | stripped |
| `> [!warning]` callout | a collapsed **DM Only** spoiler block |
| `> [!note] Title` callout | a styled blockquote |
| ```` ```dataview ```` blocks, `` `= expr` `` | removed |
| `#inline-tags` in the body | removed — frontmatter `tags` is the real list |
| `<% templater %>` | removed |
| frontmatter | re-emitted in schema order, every field present |
| `date_added` | stamped on first publish, preserved forever after |

`[[Wiki Links]]` pass through untouched and become real links at build time.

Everything else is left exactly as you wrote it.

---

## Why the templates are generated

This is the part Ahvantir got wrong, and the reason you asked for templates
before any article was written.

There, the vault templates were written by hand and the site's idea of an
article drifted away from the vault's. Nothing downstream ever refused a
malformed article, so the drift only showed up as the articles gradually
reading like several hundred separate essays.

Here there is **one definition**, `src/_data/schema.js`, and four things read it:

1. the linter that validates every article, and fails CI when one drifts
2. `npm run new`, which writes site-side skeletons
3. the article page, which renders the dossier panel from it — so a field you
   left empty shows as a visible gap rather than as nothing at all
4. `npm run vault:init`, which generates the Obsidian templates

Add a field to the schema, run `npm run vault:init`, and the vault template has
it, the linter requires it, and every existing article in that category grows a
row for it at the next build.

`vault:init` rewrites `_Templates/` and `_Meta/Home.md` every run, and creates
missing folders. **It never touches a note and never deletes anything** — it is
safe to re-run over a full vault. `_Meta/Open Questions.md` is left alone once it
exists, since that one accumulates your answers.

### One name to watch

The vault's "is this finished" field is `vault_status`, not `status`. Every
category already has a real `status` field with its own meaning — a hero's
`active`, a villain's `at large` — and reusing the name would have made every
finished article read as an unpublished stub.

---

## If something breaks

**"OBSIDIAN_VAULT_PATH is not set."** Copy `.env.example` to `.env`. It is
gitignored; this is a public repo and the path is a local detail.

**A note is filed in the wrong folder.** The sync refuses it rather than
publishing into a category the folder disagrees with. Move the note, or fix the
`category` field.

**Two notes want the same slug.** The sync names the collision and skips the
second one. Rename one of them.

**Obsidian ate the `#` notes in the frontmatter.** Editing properties through
Obsidian's Properties panel rewrites the block and drops comments. The fields
survive; only the guidance goes. Re-copy from `_Templates/` if you want it back,
or edit frontmatter in source mode (`Ctrl-E`).

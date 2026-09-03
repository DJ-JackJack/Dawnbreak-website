# What Krys needs to do

**Steps 0 through 4 are done. Two optional steps are left: 5 and 6.**

The site is live at <https://dawnbreak.ahvantir.world>, it deploys on every
push, the world switcher works both ways, and the player area — sign-in,
dashboard, notes, messages, your hero, and the roster — runs on your existing
Ahvantir account. One login, both settings.

What is left is optional: step 5, the Foundry status worker, which only
affects whether the play page can say "the game is live right now"; and step
6, putting the lore sync on a weekly timer. Everything works without either.

The Obsidian vault the site draws its articles from is built and wired up —
see `docs/VAULT.md`.

The completed steps are kept below rather than deleted: each one records a trap
worth remembering if you ever set this up again.

---

## 0. Land the deploy workflow — DONE

Unblocks: **everything below.** Without it nothing deploys at all.

GitHub refuses to let my token create `.github/workflows/` — that needs a
`workflow` scope mine does not have, and it is a deliberate GitHub protection
rather than something to route around. The file is written and sitting in your
working tree, untracked.

Two ways. Either commit it yourself, which needs nothing from me:

```bash
cd /c/Users/klfal/Desktop/Claude_Directory/Dawnbreak-website
git add .github/workflows/deploy.yml
git commit -m "Add the build and deploy workflow"
git push
```

Or grant the scope once and tell me, and I'll push it:

```bash
gh auth refresh -s workflow
```

---

## 1. Turn on GitHub Pages — DONE

Unblocks: **seeing the site on a real URL.**

1. Go to <https://github.com/DJ-JackJack/Dawnbreak-website/settings/pages>
2. Under **Build and deployment → Source**, choose **GitHub Actions**
3. **Leave "Custom domain" empty.** Nothing goes in that box until step 2.

> The box is a trap, and I walked into it once already by writing the site's
> address next to this step. A custom domain is a **bare hostname** —
> `dawnbreak.ahvantir.world`. Not a full URL, no `https://`, no path. Anything
> else is rejected with a red banner, which is harmless: GitHub refuses to save
> it rather than half-applying it. Dismiss the banner and carry on.

Once step 0 has landed the workflow, the site builds and publishes on every
push. GitHub will then serve it at its own default address — you don't type
that anywhere, it just is where the site lives until the subdomain is pointed
at it in step 2.

---

## 2. Point the subdomain at it — DONE

Unblocks: **`dawnbreak.ahvantir.world`**, and both Ahvantir pull requests.

### What a DNS record actually is

A signpost. It says "when someone asks for **this name**, send them **here**."

You already have three of them. `ahvantir.world`, `www.ahvantir.world` and
`play-tunnel.ahvantir.world` are all signposts you have set up before —
`play-tunnel` points at the Foundry tunnel, the other two at GitHub. You are
adding a fourth of exactly the same kind.

### Doing it

**Cloudflare → pick `ahvantir.world` → DNS → Records → Add record.** Five
fields:

| Field | What to put | Why |
| --- | --- | --- |
| **Type** | `CNAME` | "point this name at another name" (an `A` record points at a numeric address instead — not what we want) |
| **Name** | `dawnbreak` | just that word. Cloudflare adds `.ahvantir.world` itself |
| **Target** | `dj-jackjack.github.io` | where GitHub serves from. **No `https://`, no trailing slash, no repo name** |
| **Proxy status** | **grey cloud** to begin with — see below | |
| **TTL** | Auto | |

Save.

### The cloud toggle, and why grey first

Your other three records are all **orange** (proxied through Cloudflare), and
that works fine. So the end state for this one is orange too.

But get the certificate issued *first*. GitHub has to prove it owns the name
before it can serve HTTPS on it, and it does that by being reached directly.
With Cloudflare proxying in the way, that check sometimes stalls — and the
symptom is a TLS error that looks like a GitHub fault and isn't.

So:

1. **In Cloudflare**, add the record with the cloud **grey** (click it so it
   goes grey — "DNS only"). Then you are finished with Cloudflare.
2. **On GitHub — a different website** —
   <https://github.com/DJ-JackJack/Dawnbreak-website/settings/pages>, put
   `dawnbreak.ahvantir.world` in **Custom domain** and save. Bare hostname,
   nothing else. This is the same box that rejected a full URL earlier; it
   accepts this one.
3. Wait for GitHub to say the certificate is issued. Minutes, usually.
4. **Back in Cloudflare**, switch the cloud to orange, matching your other
   records.

> These are **two different sites doing two different jobs.** Cloudflare owns
> the signpost — where the name points. GitHub owns the answer — what the site
> replies when someone arrives under that name. Both are needed and neither can
> do the other's half.

If step 4 feels like fuss, leaving it grey forever is a perfectly good outcome.
It just means Cloudflare stops caching that one subdomain.

Then tell me, and I'll add the `CNAME` file to the repo so it survives future
deploys. Give DNS ten minutes before worrying about anything.

---

## 3. Merge the two Ahvantir pull requests — DONE

Unblocks: **the world switcher, and one login across both sites.**

Do this *after* step 2, or the switcher's link 404s.

- [#6 — Share the player session across subdomains](https://github.com/DJ-JackJack/Ahvantir-website/pull/6)
- [#7 — Add a world switcher to the header](https://github.com/DJ-JackJack/Ahvantir-website/pull/7)

Both are safe to merge on their own. #6 changes only *where* a session is
stored — nobody currently logged in gets signed out.

---

## 4. The database migration — DONE (the one that needed care)

Unblocks: **the player area** — characters, notes, messages, shared across both
settings with one account.

**This runs against your live database, with your players' real accounts in it.**
Nothing in the migration drops or rewrites anything, but take the backup anyway.

1. **Back up.** Supabase dashboard → your project → **Database → Backups**.
   Take a manual one and wait for it to finish.
2. Open **SQL Editor**, paste the whole of `scripts/supabase-migration.sql`,
   and run it.
3. Check it landed:
   ```sql
   select campaign, count(*) from characters group by campaign;
   ```
   Every existing row should say `ahvantir`.
4. **Auth → URL Configuration → Redirect URLs**: add
   `https://dawnbreak.ahvantir.world/**`
   Without this, sign-in emails bounce to the wrong site.
5. ~~Tell me, and I'll build the player pages.~~ Built: `/player/character/`,
   `/player/hall-of-heroes/`, `/player/notes/`, `/player/messages/`.

While you're in there with a backup already taken, this is also the right moment
for the three deferred hardening items — see
`supabase-hardening-todo.md` on your Desktop.

---

## 5. Deploy the Foundry status worker — 5 minutes, optional

Unblocks: **the play page telling players whether the game is actually live.**

```bash
cd workers/foundry-status
npx wrangler deploy
```

It'll open a browser to log in to Cloudflare. Until this is deployed the play
page shows "No signal" permanently — which is safe, just uninformative.

This one is genuinely optional. Everything else works without it.

---

## 6. Register the weekly lore sync — 1 minute, optional

Unblocks: **the vault publishing itself.** Without it you run `npm run sync`
by hand, which is fine.

The vault is built and the sync works. This only puts it on a timer. In an
**Administrator** PowerShell:

```
schtasks --% /Create /TN "Dawnbreak Weekly Lore Sync" /TR "powershell.exe -NonInteractive -ExecutionPolicy Bypass -File \"C:\Users\klfal\Desktop\Claude_Directory\Dawnbreak-website\scripts\dawnbreak-weekly-sync.ps1\"" /SC WEEKLY /D SUN /ST 21:15 /RU klfal /F
```

Sunday 21:15 — fifteen minutes after the Ahvantir sync, so the two never push
at the same moment.

> The `--%` is load-bearing. Without it PowerShell reads the `\"` inside
> `/TR` as an ordinary quote, the `/TR` value swallows everything after it,
> and schtasks answers `Mandatory option 'sc' is missing`. `--%` hands the
> rest of the line to schtasks verbatim, which is the only way cmd-style
> escaping survives a PowerShell prompt.

Then confirm it is actually armed — a registered task can sit there disabled:

```
schtasks /Query /TN "Dawnbreak Weekly Lore Sync" /FO LIST
```

`Status` should say **Ready** and `Next Run Time` should name a Sunday. If it
says `Disabled`, re-enable it with:

```
schtasks /Change /TN "Dawnbreak Weekly Lore Sync" /ENABLE
```

See `docs/VAULT.md` for how the vault works and what the sync does to a note.

---

## The order, if you want it in one line

Only **5** and **6** are left, and both are optional. The rest is done.


---

## What I've done that you might want to look at

- **`docs/VAULT.md`** — the Obsidian vault, how to write in it, and what the
  sync does to a note. Read this one first; it is where the articles come from.
- **`docs/ARTICLE-TEMPLATES.md`** — the five article templates. Worth reading
  once before you write anything, since it's the thing that keeps a few hundred
  articles reading as one work.
- **`docs/CANON-NOTES.md`** — the City of Changes, with its open questions
  deliberately unanswered.
- `npm run sync` publishes the vault. `npm run sync:dry` says what it would do.
- `npm run new heroes "Coldstreak"` writes a skeleton straight into the site,
  for the rare article you would rather not keep in the vault.
- `npm test` checks articles, campaign scoping, auth, the timeline mapping and
  the vault converter. CI runs it too, so a broken article fails the build
  rather than shipping.

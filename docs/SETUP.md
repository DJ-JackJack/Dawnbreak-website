# What Krys needs to do

Everything that could be built without you is built. This is what's left, in
order. Each step says what it unblocks, so you can stop at any point and the
site is still in a working state.

**Nothing here is urgent and nothing is risky except step 4**, which touches the
live database and is flagged accordingly.

---

## 0. Land the deploy workflow — 30 seconds

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

## 1. Turn on GitHub Pages — 1 minute

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

## 2. Point the subdomain at it — 2 minutes

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

## 3. Merge the two Ahvantir pull requests — 2 minutes

Unblocks: **the world switcher, and one login across both sites.**

Do this *after* step 2, or the switcher's link 404s.

- [#6 — Share the player session across subdomains](https://github.com/DJ-JackJack/Ahvantir-website/pull/6)
- [#7 — Add a world switcher to the header](https://github.com/DJ-JackJack/Ahvantir-website/pull/7)

Both are safe to merge on their own. #6 changes only *where* a session is
stored — nobody currently logged in gets signed out.

---

## 4. The database migration — 10 minutes, and the one to be careful with

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
5. Tell me, and I'll build the player pages against the new column and flip
   `playerArea.enabled` to `true`.

While you're in there with a backup already taken, this is also the right moment
for the three deferred hardening items — see
`supabase-hardening-todo.md` on your Desktop.

---

## 5. Deploy the Foundry status worker — 5 minutes

Unblocks: **the play page telling players whether the game is actually live.**

```bash
cd workers/foundry-status
npx wrangler deploy
```

It'll open a browser to log in to Cloudflare. Until this is deployed the play
page shows "No signal" permanently — which is safe, just uninformative.

This one is genuinely optional. Everything else works without it.

---

## The order, if you want it in one line

**0 → 1 → 2 → tell me → 3 → 5**, and **4** whenever you're ready to give the player
area a session's attention.

---

## What I've done that you might want to look at

- **`docs/ARTICLE-TEMPLATES.md`** — the five article templates. Worth reading
  once before you write anything, since it's the thing that keeps a few hundred
  articles reading as one work.
- **`docs/CANON-NOTES.md`** — the City of Changes, with its open questions
  deliberately unanswered.
- `npm run new heroes "Coldstreak"` writes a correct skeleton to start from.
- `npm test` checks articles, auth and the timeline mapping. CI runs it too, so
  a broken article fails the build rather than shipping.

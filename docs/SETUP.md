# What Krys needs to do

Everything that could be built without you is built. This is what's left, in
order. Each step says what it unblocks, so you can stop at any point and the
site is still in a working state.

**Nothing here is urgent and nothing is risky except step 4**, which touches the
live database and is flagged accordingly.

---

## 1. Turn on GitHub Pages — 1 minute

Unblocks: **seeing the site on a real URL.**

1. Go to <https://github.com/DJ-JackJack/Dawnbreak-website/settings/pages>
2. Under **Build and deployment → Source**, choose **GitHub Actions**
3. Save

That's it. The workflow is already committed, so it builds and publishes on the
next push. The site appears at:

```
https://dj-jackjack.github.io/Dawnbreak-website/
```

Have a look. It will keep working at that address forever, so there's no rush
on step 2.

---

## 2. Point the subdomain at it — 2 minutes

Unblocks: **`dawnbreak.ahvantir.world`**, and both Ahvantir pull requests.

In **Cloudflare → ahvantir.world → DNS → Add record**:

| Field | Value |
| --- | --- |
| Type | `CNAME` |
| Name | `dawnbreak` |
| Target | `dj-jackjack.github.io` |
| Proxy status | **DNS only** (grey cloud, not orange) |
| TTL | Auto |

> **The grey cloud matters.** Orange-clouded (proxied) records in front of
> GitHub Pages break its certificate issuance, and the symptom is a TLS error
> that looks like a GitHub problem.

Then tell me, and I'll add the `CNAME` file to the repo so Pages answers on the
new name. Give DNS ten minutes or so before worrying.

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

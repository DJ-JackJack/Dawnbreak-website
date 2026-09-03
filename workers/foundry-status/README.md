# foundry-status

Answers "is my game running?" for the `/play/` page.

```
GET https://dawnbreak.ahvantir.world/api/foundry-status
→ { "up": true, "active": true, "world": "...", "system": "invincible", "users": 3 }
```

## Deploy

```bash
cd workers/foundry-status
npx wrangler deploy
```

Needs a Cloudflare login with access to the `ahvantir.world` zone.

## Why it exists

A browser cannot tell a live Foundry from a closed one by fetching the tunnel
directly — a cross-origin `no-cors` response is opaque and hides the status
code, so "tunnel up, Foundry closed" looks identical to "Foundry running". A
Worker fetches server-side and can read the real status.

It reports the loaded **system** as well as up/down because Ahvantir and
Dawnbreak share one Foundry install. Without that, this site would show a green
light while the D&D game was running.

Ahvantir has its own copy of this worker at
`ahvantir.world/api/foundry-status`. They are separate deployments pointed at
the same tunnel; neither depends on the other.

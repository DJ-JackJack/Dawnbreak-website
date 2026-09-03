/**
 * foundry-status — Cloudflare Worker
 *
 * Reports whether the Foundry server behind the tunnel is up, and WHICH GAME
 * is loaded, as JSON:
 *
 *   { "up": true, "active": true, "world": "...", "system": "invincible", "users": 3 }
 *
 * ## Why a Worker and not a browser fetch
 *
 * The page cannot tell a live Foundry (200) from a closed one (Cloudflare 502
 * — tunnel up, origin down) by fetching the tunnel directly: a cross-origin
 * `no-cors` response is opaque and hides the status code. A Worker fetches
 * server-side and can read it.
 *
 * ## Why it reports the system, not just up/down
 *
 * Ahvantir and Dawnbreak City run on ONE Foundry install, different worlds.
 * A naive "is it up?" check shows Dawnbreak players a green light while the
 * D&D game is running, which is worse than showing nothing — it invites them
 * to click into someone else's session.
 *
 * `/api/status` gives the loaded world and system, so each site can ask the
 * question it actually means: not "is Foundry up" but "is MY game running".
 * Matching on the SYSTEM id rather than the world id is deliberate — it
 * survives a world rename and a switch to the testbed, both of which happen
 * far more often than the system changes.
 *
 * Deploy: see wrangler.toml.
 */

const FOUNDRY_URL = "https://play-tunnel.ahvantir.world";

export default {
  async fetch() {
    const body = { up: false, active: false, world: null, system: null, users: null };

    try {
      const res = await fetch(FOUNDRY_URL + "/api/status", {
        method: "GET",
        redirect: "manual",
        // Foundry's state changes minute to minute; never serve a cached verdict.
        cf: { cacheTtl: 0, cacheEverything: false },
      });

      // A login redirect still means the server is up.
      body.up = res.status >= 200 && res.status < 400;

      if (res.ok) {
        try {
          const status = await res.json();
          body.active = !!status.active;
          body.world = status.world ?? null;
          body.system = status.system ?? null;
          body.users = typeof status.users === "number" ? status.users : null;
        } catch (_) {
          // Up, but the body was not the JSON we expected -- an older build, or
          // something else answering on that hostname. "Up with no detail" is a
          // real state and is reported as such rather than as an error.
        }
      }
    } catch (_) {
      // DNS or connection failure: the tunnel itself is gone.
    }

    return new Response(JSON.stringify(body), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
};

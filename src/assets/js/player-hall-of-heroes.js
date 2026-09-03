/* player-hall-of-heroes.js — the team, as its players describe it.
 *
 * Shows only characters their owners marked public. RLS enforces that
 * server-side too; the filter here is the client agreeing with the rule rather
 * than relying on it alone.
 */
(function () {
  "use strict";

  var db = window.__supabase;
  var CAMPAIGN = window.CAMPAIGN;
  if (!db) return;

  var root = document.getElementById("roster-root");
  var names = {};

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* Kept in step with `subtitle()` in src/_data/character.js. No stat line:
     this site records who a hero is, never what they roll. */
  function subtitle(d) {
    return [d.rank, d.archetype, d.affiliation].filter(Boolean).join(" · ");
  }

  /** The handful of fields worth showing on a card, in reading order. */
  var CARD_FIELDS = [
    ["civilian_name", "Civilian name"],
    ["power_source", "Power source"],
    ["powers", "Powers"],
    ["base", "Base"],
    ["occupation", "Occupation"],
    ["generation", "Generation"]
  ];

  function card(row, myId) {
    var d = row.data || {};
    var sub = subtitle(d);
    var rows = CARD_FIELDS
      .filter(function (f) { return d[f[0]] && String(d[f[0]]).trim(); })
      .map(function (f) {
        return "<dt>" + esc(f[1]) + "</dt><dd>" + esc(d[f[0]]) + "</dd>";
      }).join("");

    var owner = names[row.player_id];
    var mine = row.player_id === myId;

    return '<article class="dossier roster-card" style="--cat: #FF7A18">' +
      '<h2 class="roster-card__name">' + esc(d.codename || "Unnamed hero") + "</h2>" +
      (d.epithet ? '<p class="roster-card__epithet">' + esc(d.epithet) + "</p>" : "") +
      (sub ? '<p class="roster-card__sub">' + esc(sub) + "</p>" : "") +
      (rows ? '<dl class="dossier__list">' + rows + "</dl>" : "") +
      '<p class="roster-card__player">' +
        (mine ? "Yours" :
          esc(owner || "Someone") +
          ' · <a href="/player/messages/?with=' + encodeURIComponent(row.player_id) + '">Message</a>') +
      "</p>" +
    "</article>";
  }

  async function main() {
    var session = await window.requireAuth(true);
    if (!session) return;
    var me = await window.getProfile();

    /* `profiles` is not campaign-scoped: one person, one account, both settings. */
    var pRes = await db.from("profiles").select("id, display_name");
    (pRes.data || []).forEach(function (p) { names[p.id] = p.display_name; });

    var res = await db
      .from("characters")
      .select("id, player_id, data, updated_at")
      .eq("campaign", CAMPAIGN)
      .eq("is_public", true)
      .order("updated_at", { ascending: false });

    if (res.error) {
      root.innerHTML = '<p class="entry-empty">Could not load the roster just now.</p>';
      return;
    }

    var rows = res.data || [];
    if (!rows.length) {
      root.innerHTML =
        '<p class="entry-empty">Nobody has put a hero on the board yet. ' +
        '<a href="/player/character/">Add yours</a>.</p>';
      return;
    }

    root.innerHTML = '<div class="roster">' +
      rows.map(function (r) { return card(r, me && me.id); }).join("") + "</div>";
  }

  main();
})();

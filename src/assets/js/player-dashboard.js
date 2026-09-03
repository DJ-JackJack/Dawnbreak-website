/* player-dashboard.js — where a signed-in player lands. */
(function () {
  'use strict';

  var client = window.__supabase;
  var CAMPAIGN = window.CAMPAIGN;
  if (!client) return;

  var greeting = document.getElementById('dash-greeting');
  var listEl   = document.getElementById('dash-characters');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* The line under a hero's name.
     Ahvantir's read "Level 7 · Human · Wizard". This site records no stat
     numbers at all -- Foundry owns those -- so it says who someone is instead.
     Kept in step with `subtitle()` in src/_data/character.js. */
  function subtitle(d) {
    return [d.rank, d.archetype, d.affiliation].filter(Boolean).join(' · ');
  }

  async function main() {
    var session = await window.requireAuth(true);
    if (!session) return;

    var profile = await window.getProfile();
    if (greeting) {
      greeting.textContent = profile && profile.display_name
        ? 'Welcome back, ' + profile.display_name + '.'
        : 'Welcome back.';
    }

    var res = await client
      .from('characters')
      .select('id, data, is_public, updated_at')
      .eq('player_id', profile.id)
      .eq('campaign', CAMPAIGN)
      .order('updated_at', { ascending: false });

    if (res.error) {
      listEl.innerHTML = '<p class="entry-empty">Could not load your hero just now.</p>';
      return;
    }

    var rows = res.data || [];
    if (!rows.length) {
      listEl.innerHTML =
        '<p class="entry-empty">No hero yet.</p>' +
        '<p><a class="btn btn--primary" href="/player/character/">Create one</a></p>';
      return;
    }

    listEl.innerHTML = '<ul class="entry-list" role="list">' + rows.map(function (row) {
      var d = row.data || {};
      var sub = subtitle(d);
      return '<li class="entry" style="--cat: #FF7A18">' +
        '<a class="entry__link" href="/player/character/?id=' + encodeURIComponent(row.id) + '">' +
          esc(d.codename || d.name || 'Unnamed hero') + '</a>' +
        (row.is_public ? '' : '<span class="entry__record">private</span>') +
        (sub ? '<p class="entry__summary">' + esc(sub) + '</p>' : '') +
      '</li>';
    }).join('') + '</ul>';
  }

  main();
})();

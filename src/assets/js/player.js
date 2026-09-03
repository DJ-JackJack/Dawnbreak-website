/* player.js — Supabase client, auth helpers, and the campaign this site owns.
   Load AFTER the Supabase CDN script on every /player/* page. */
(function () {
  'use strict';

  var SUPABASE_URL = document.querySelector('meta[name="supabase-url"]').content;
  var SUPABASE_KEY = document.querySelector('meta[name="supabase-anon-key"]').content;

  /* Which campaign's rows this site owns. Ahvantir and Dawnbreak share one
     database; every query against a campaign-scoped table must filter on this,
     or it returns the other setting's data with no error to say so.
     `scripts/lint-campaign-scope.js` fails the build if one forgets. */
  var CAMPAIGN = document.querySelector('meta[name="campaign"]').content;
  window.CAMPAIGN = CAMPAIGN;

  /* Share the session across ahvantir.world and its subdomains, so signing in
     on either site signs you in on both. See auth-storage.js. Guarded on both
     sides: if that script failed to load, or localStorage is blocked, this
     falls back to Supabase's default. The site loses the SHARED sign-in; it
     does not lose sign-in. */
  var localFallback = null;
  try { localFallback = window.localStorage; } catch (e) { /* blocked */ }

  var sharedStorage = window.AhvantirAuthStorage
    ? window.AhvantirAuthStorage.createAuthStorage(document, localFallback, location.hostname)
    : null;

  var client = sharedStorage
    ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { storage: sharedStorage } })
    : supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  window.__supabase = client;

  /* Redirect to /player/login/ if no active session.
     Pass withRedirect=true to bounce the user back after sign-in. */
  window.requireAuth = async function (withRedirect) {
    var result = await client.auth.getSession();
    if (!result.data.session) {
      var next = withRedirect
        ? '?next=' + encodeURIComponent(location.pathname + location.search)
        : '';
      location.replace('/player/login/' + next);
      return null;
    }
    return result.data.session;
  };

  /* The current user's profiles row, or null.
     `profiles` is NOT campaign-scoped: one person, one account, one display
     name, both settings. That is the whole reason for sharing a project. */
  window.getProfile = async function () {
    var userResult = await client.auth.getUser();
    if (!userResult.data.user) return null;
    var profileResult = await client
      .from('profiles')
      .select('*')
      .eq('id', userResult.data.user.id)
      .single();
    return profileResult.data || null;
  };

  window.playerSignOut = async function () {
    await client.auth.signOut();
    location.href = '/player/login/';
  };

  /* Unread-message badge. Scoped to this campaign, or a player would see a
     count that includes messages from the other game and then find nothing
     when they opened the page. */
  window.loadUnreadBadge = async function () {
    var userResult = await client.auth.getUser();
    if (!userResult.data.user) return;
    var myId = userResult.data.user.id;

    var res = await client
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', myId)
      .eq('campaign', CAMPAIGN)
      .is('read_at', null);

    var badge = document.getElementById('nav-msg-badge');
    if (!badge) return;
    var count = res.count || 0;
    if (count > 0) {
      badge.textContent = count > 9 ? '9+' : String(count);
      badge.setAttribute('aria-label', count + ' unread message' + (count !== 1 ? 's' : ''));
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (location.pathname.startsWith('/player/')) {
      client.auth.getSession().then(function (res) {
        if (!res.data.session) return;
        window.loadUnreadBadge();
        var signoutItem = document.getElementById('nav-signout-item');
        var signoutBtn  = document.getElementById('nav-signout');
        var playItem    = document.getElementById('nav-play-item');
        if (signoutItem) signoutItem.hidden = false;
        if (signoutBtn)  signoutBtn.addEventListener('click', function () { window.playerSignOut(); });
        if (playItem)    playItem.hidden    = false;
      });
    }
  });
})();

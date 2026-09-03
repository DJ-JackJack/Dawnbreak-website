/* player-login.js — sign in, or create an account.
 *
 * Nothing here is campaign-scoped: an account is a person, not a character, and
 * one account covers both settings. `profiles` has no campaign column for the
 * same reason.
 */
(function () {
  'use strict';

  var client = window.__supabase;
  var form   = document.getElementById('login-form');
  if (!form || !client) return;

  var emailEl  = document.getElementById('email');
  var passEl   = document.getElementById('password');
  var submitEl = document.getElementById('login-submit');
  var toggleEl = document.getElementById('signup-toggle');
  var errorEl  = document.getElementById('login-error');
  var okEl     = document.getElementById('login-ok');

  var mode = 'signin';

  function say(el, msg) {
    [errorEl, okEl].forEach(function (n) { if (n) { n.hidden = true; n.textContent = ''; } });
    if (!el || !msg) return;
    el.textContent = msg;
    el.hidden = false;
  }

  /* Where to go after signing in. Only ever a path on this site -- an
     attacker-supplied absolute URL in ?next= would otherwise turn the login
     page into an open redirect. */
  function nextPath() {
    var raw = new URLSearchParams(location.search).get('next') || '/player/dashboard/';
    return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/player/dashboard/';
  }

  toggleEl.addEventListener('click', function () {
    mode = mode === 'signin' ? 'signup' : 'signin';
    submitEl.textContent = mode === 'signin' ? 'Sign in' : 'Create account';
    toggleEl.textContent = mode === 'signin' ? 'Create an account' : 'I already have an account';
    passEl.setAttribute('autocomplete', mode === 'signin' ? 'current-password' : 'new-password');
    say(null);
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    say(null);
    submitEl.disabled = true;

    var email = emailEl.value.trim();
    var password = passEl.value;

    try {
      if (mode === 'signup') {
        var up = await client.auth.signUp({
          email: email,
          password: password,
          options: { emailRedirectTo: location.origin + '/player/dashboard/' }
        });
        if (up.error) throw up.error;
        // With email confirmation on, there is no session yet and the user has
        // to go and click a link. Say so plainly rather than appearing to hang.
        if (!up.data.session) {
          say(okEl, 'Check your email for a confirmation link.');
          submitEl.disabled = false;
          return;
        }
      } else {
        var inRes = await client.auth.signInWithPassword({ email: email, password: password });
        if (inRes.error) throw inRes.error;
      }
      location.href = nextPath();
    } catch (err) {
      say(errorEl, err && err.message ? err.message : 'That did not work. Try again.');
      submitEl.disabled = false;
    }
  });

  // Already signed in -- including from Ahvantir, since the session is shared
  // across the domain. Do not make someone sign in twice for no reason.
  client.auth.getSession().then(function (res) {
    if (res.data.session) location.replace(nextPath());
  });
})();

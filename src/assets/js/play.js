/* play.js — is MY game running?
 *
 * Not "is Foundry up". Ahvantir and Dawnbreak share one Foundry install, so a
 * plain up/down check would show a green light while the other campaign is
 * mid-session and invite players into someone else's game. The worker at
 * /api/foundry-status reports the loaded SYSTEM, and this asks the question
 * that actually matters.
 *
 * Matching on system id rather than world id is deliberate: it survives a world
 * rename and a switch to the testbed, both of which happen far more often than
 * the system changes.
 */
(function () {
  "use strict";

  var ENDPOINT      = "/api/foundry-status";
  var OUR_SYSTEM    = "invincible";
  var POLL_INTERVAL = 30000;   // ms
  var TIMEOUT       = 8000;    // ms before a silent endpoint counts as "no signal"
  var MOBILE_MAX    = 768;     // px — Foundry is not usable below this

  var states = {
    checking: document.getElementById("play-checking"),
    live:     document.getElementById("play-live"),
    other:    document.getElementById("play-other"),
    dark:     document.getElementById("play-dark"),
    mobile:   document.getElementById("play-mobile"),
  };
  if (!states.checking) return;

  var detail = document.getElementById("play-live-detail");

  function show(name) {
    Object.keys(states).forEach(function (k) {
      if (states[k]) states[k].hidden = (k !== name);
    });
  }

  function describe(status) {
    if (!detail) return;
    var who = typeof status.users === "number"
      ? (status.users === 1 ? "1 player connected" : status.users + " players connected")
      : "";
    detail.textContent = who;
  }

  function check() {
    var done = false;
    var timer = setTimeout(function () {
      // The endpoint itself is unreachable -- most likely the Worker is not
      // deployed yet. Reported as "no signal" rather than as an error, because
      // from a player's side those are the same thing: no game to join.
      if (!done) { done = true; show("dark"); }
    }, TIMEOUT);

    fetch(ENDPOINT, { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (status) {
        if (done) return;
        done = true;
        clearTimeout(timer);

        if (!status || !status.up) { show("dark"); return; }

        // Up but not yet in a world (setup screen, or loading) is not our game.
        if (!status.active) { show("other"); return; }

        // An older Foundry, or something else answering, may not report a
        // system. Up-and-active with no detail is treated as ours rather than
        // hidden: the cost of a wrong "join" is a click, the cost of a wrong
        // "no signal" is a player missing a session.
        if (status.system && status.system !== OUR_SYSTEM) { show("other"); return; }

        describe(status);
        show("live");
      })
      .catch(function () {
        if (done) return;
        done = true;
        clearTimeout(timer);
        show("dark");
      });
  }

  if (window.innerWidth < MOBILE_MAX) {
    show("mobile");
  } else {
    check();
    setInterval(check, POLL_INTERVAL);
  }
})();

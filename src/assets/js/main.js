/* main.js — Daybreak toggle.
   The pre-paint class is set inline in base.njk's <head>; this only handles
   the click and remembers the choice. */
(function () {
  "use strict";
  var KEY = "dawnbreak-theme";
  var btn = document.getElementById("theme-toggle");
  if (!btn) return;

  function label() {
    var day = document.documentElement.classList.contains("daybreak");
    btn.setAttribute("aria-label", day ? "Switch to night" : "Switch to Daybreak");
    btn.setAttribute("title", day ? "Night" : "Daybreak");
  }
  label();

  btn.addEventListener("click", function () {
    var day = document.documentElement.classList.toggle("daybreak");
    try { localStorage.setItem(KEY, day ? "daybreak" : "night"); } catch (e) { /* blocked */ }
    label();
  });
})();

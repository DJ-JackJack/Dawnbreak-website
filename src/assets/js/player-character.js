/* player-character.js — a player's own hero.
 *
 * The form itself is rendered server-side from src/_data/character.js, so this
 * only has to populate it, save it, and keep the visibility flag honest. Adding
 * a field to that schema needs no change here: everything is driven off the
 * `data-field` attributes the template writes.
 *
 * `characters.data` is a jsonb column, so the shape can grow without a
 * migration.
 */
(function () {
  "use strict";

  var db = window.__supabase;
  var CAMPAIGN = window.CAMPAIGN;
  if (!db) return;

  var SAVE_DELAY = 1200;

  var root = document.getElementById("char-root");
  var loading = document.getElementById("char-loading");
  var titleEl = document.getElementById("char-title");
  var publicEl = document.getElementById("char-public");

  var me = null;
  var rowId = null;
  var saveTimer = null;
  var dirty = false;

  function fields() {
    return Array.prototype.slice.call(document.querySelectorAll("[data-field]"));
  }

  function setStatus(text) {
    var el = document.getElementById("char-status");
    if (el) el.textContent = text;
  }

  function readForm() {
    var data = {};
    fields().forEach(function (el) { data[el.getAttribute("data-field")] = el.value; });
    return data;
  }

  function fillForm(data) {
    fields().forEach(function (el) {
      var key = el.getAttribute("data-field");
      el.value = data && data[key] != null ? data[key] : "";
    });
    retitle();
  }

  function retitle() {
    var codename = document.getElementById("f-codename");
    if (titleEl) {
      titleEl.textContent = (codename && codename.value.trim()) || "Your hero";
    }
  }

  function schedule() {
    dirty = true;
    setStatus("Unsaved");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, SAVE_DELAY);
  }

  async function save() {
    if (!dirty || !rowId) return;
    setStatus("Saving…");
    var res = await db
      .from("characters")
      .update({
        data: readForm(),
        is_public: !!(publicEl && publicEl.checked),
        updated_at: new Date().toISOString()
      })
      .eq("id", rowId)
      .eq("campaign", CAMPAIGN);

    if (res.error) { setStatus("Could not save"); return; }
    dirty = false;
    setStatus("Saved");
  }

  async function createRow() {
    var res = await db
      .from("characters")
      .insert({ player_id: me.id, data: {}, is_public: false, campaign: CAMPAIGN })
      .select()
      .single();
    return res.data || null;
  }

  async function load() {
    /* A URL id is honoured only if the row also belongs to this player and this
       campaign -- the .eq() filters below do that, so a guessed id in the query
       string returns nothing rather than someone else's hero. RLS enforces the
       same thing server-side; this is the client agreeing with it rather than
       relying on it alone. */
    var wanted = new URLSearchParams(location.search).get("id");

    var q = db
      .from("characters")
      .select("*")
      .eq("player_id", me.id)
      .eq("campaign", CAMPAIGN)
      .order("updated_at", { ascending: false });
    if (wanted) q = q.eq("id", wanted);

    var res = await q;
    var rows = res.data || [];
    return rows.length ? rows[0] : null;
  }

  async function main() {
    var session = await window.requireAuth(true);
    if (!session) return;
    me = await window.getProfile();
    if (!me) { loading.textContent = "No profile found for this account."; return; }

    var row = await load();
    // First visit: give them a hero to fill in rather than an empty state and
    // a button. There is exactly one thing to do here.
    if (!row) row = await createRow();
    if (!row) { loading.textContent = "Could not create a hero just now."; return; }

    rowId = row.id;
    fillForm(row.data || {});
    if (publicEl) publicEl.checked = !!row.is_public;

    loading.hidden = true;
    root.hidden = false;

    fields().forEach(function (el) {
      el.addEventListener("input", schedule);
      el.addEventListener("change", schedule);
    });
    var codename = document.getElementById("f-codename");
    if (codename) codename.addEventListener("input", retitle);
    if (publicEl) publicEl.addEventListener("change", schedule);

    var del = document.getElementById("char-delete");
    if (del) {
      del.addEventListener("click", async function () {
        if (!confirm("Delete this hero? It cannot be recovered.")) return;
        await db.from("characters").delete().eq("id", rowId).eq("campaign", CAMPAIGN);
        location.href = "/player/dashboard/";
      });
    }
  }

  window.addEventListener("beforeunload", function () { if (dirty) save(); });

  main();
})();

/* player-notes.js — a player's own notes.
 *
 * Uses `campaign_notes`, which is campaign-scoped despite the name suggesting
 * something shared: the row belongs to one player in one setting. Notes from
 * the D&D game must not appear in the superhero game.
 *
 * That table name is also why the scope linter matches `\bcampaign\b` rather
 * than the bare substring -- see scripts/lint-campaign-scope.js.
 */
(function () {
  "use strict";

  var db = window.__supabase;
  var CAMPAIGN = window.CAMPAIGN;
  if (!db) return;

  var SAVE_DELAY = 1200;   // ms of quiet before autosaving

  var root = document.getElementById("notes-root");
  var me = null;
  var notes = [];
  var activeId = null;
  var saveTimer = null;
  var dirty = false;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function when(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
  }

  async function loadList() {
    var res = await db
      .from("campaign_notes")
      .select("id, title, updated_at")
      .eq("player_id", me.id)
      .eq("campaign", CAMPAIGN)
      .order("updated_at", { ascending: false });
    notes = res.data || [];
  }

  async function loadNote(id) {
    var res = await db
      .from("campaign_notes")
      .select("*")
      .eq("id", id)
      .eq("campaign", CAMPAIGN)
      .single();
    return res.data || null;
  }

  async function createNote() {
    var res = await db
      .from("campaign_notes")
      .insert({ player_id: me.id, title: "Untitled", content: "", campaign: CAMPAIGN })
      .select()
      .single();
    if (res.data) {
      activeId = res.data.id;
      await loadList();
      draw();
      var t = document.getElementById("note-title");
      if (t) { t.focus(); t.select(); }
    }
  }

  async function deleteNote(id) {
    await db.from("campaign_notes").delete().eq("id", id).eq("campaign", CAMPAIGN);
    if (activeId === id) activeId = null;
    await loadList();
    draw();
  }

  /* Autosave rather than a Save button. A note nobody remembered to save is
     the same as a note never written, and this is the page most likely to be
     closed mid-thought. */
  function scheduleSave() {
    dirty = true;
    setStatus("Unsaved");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, SAVE_DELAY);
  }

  async function save() {
    if (!activeId || !dirty) return;
    var title = document.getElementById("note-title");
    var body = document.getElementById("note-body");
    if (!title || !body) return;

    setStatus("Saving…");
    var res = await db
      .from("campaign_notes")
      .update({
        title: title.value.trim() || "Untitled",
        content: body.value,
        updated_at: new Date().toISOString()
      })
      .eq("id", activeId)
      .eq("campaign", CAMPAIGN);

    if (res.error) { setStatus("Could not save"); return; }
    dirty = false;
    setStatus("Saved");
    await loadList();
    paintList();
  }

  function setStatus(text) {
    var el = document.getElementById("note-status");
    if (el) el.textContent = text;
  }

  function listMarkup() {
    var items = notes.length
      ? '<ul class="notes-list" role="list">' + notes.map(function (n) {
          return "<li><button type=\"button\" class=\"notes-item" +
            (n.id === activeId ? " is-open" : "") + "\" data-note=\"" + esc(n.id) + "\">" +
            '<span class="notes-item__title">' + esc(n.title || "Untitled") + "</span>" +
            '<span class="notes-item__date">' + esc(when(n.updated_at)) + "</span>" +
            "</button></li>";
        }).join("") + "</ul>"
      : '<p class="entry-empty">Nothing yet.</p>';
    return '<div class="notes-pane">' +
      '<button class="btn btn--ghost notes-new" type="button" id="note-new">New note</button>' +
      items + "</div>";
  }

  function paintList() {
    var pane = root.querySelector(".notes-pane");
    if (!pane) return;
    pane.outerHTML = listMarkup();
    bindList();
  }

  function bindList() {
    var newBtn = document.getElementById("note-new");
    if (newBtn) newBtn.addEventListener("click", createNote);
    root.querySelectorAll("[data-note]").forEach(function (b) {
      b.addEventListener("click", async function () {
        await save();
        activeId = b.getAttribute("data-note");
        draw();
      });
    });
  }

  async function draw() {
    var note = activeId ? await loadNote(activeId) : null;

    var editor = note
      ? '<div class="notes-editor">' +
          '<input class="notes-title" id="note-title" value="' + esc(note.title) + '" aria-label="Note title">' +
          '<textarea class="notes-body" id="note-body" aria-label="Note">' + esc(note.content) + "</textarea>" +
          '<div class="notes-bar">' +
            '<span class="notes-status" id="note-status">Saved</span>' +
            '<button class="notes-delete" type="button" id="note-delete">Delete</button>' +
          "</div>" +
        "</div>"
      : '<div class="notes-editor"><p class="entry-empty">Pick a note, or start a new one.</p></div>';

    root.innerHTML = listMarkup() + editor;
    bindList();

    var title = document.getElementById("note-title");
    var body = document.getElementById("note-body");
    if (title) title.addEventListener("input", scheduleSave);
    if (body) body.addEventListener("input", scheduleSave);

    var del = document.getElementById("note-delete");
    if (del) {
      del.addEventListener("click", function () {
        // One note, one click to lose it -- worth a confirmation, since there
        // is no undo and no version history behind this.
        if (confirm("Delete this note? It cannot be recovered.")) deleteNote(activeId);
      });
    }
  }

  async function main() {
    var session = await window.requireAuth(true);
    if (!session) return;
    me = await window.getProfile();
    if (!me) {
      root.innerHTML = '<p class="entry-empty">No profile found for this account.</p>';
      return;
    }
    await loadList();
    if (notes.length) activeId = notes[0].id;
    await draw();
  }

  // A note half-typed when the tab closes should still be saved.
  window.addEventListener("beforeunload", function () { if (dirty) save(); });

  main();
})();

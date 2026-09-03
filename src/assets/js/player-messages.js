/* player-messages.js — conversations between players and the GM.
 *
 * Every `messages` query is scoped to this campaign. Without that, a message
 * about the D&D game would surface in the superhero game with nothing to
 * indicate it came from somewhere else. `scripts/lint-campaign-scope.js` fails
 * the build if one is missed.
 */
(function () {
  "use strict";

  var db = window.__supabase;
  var CAMPAIGN = window.CAMPAIGN;
  if (!db) return;

  var POLL_MS = 15000;
  var root = document.getElementById("msg-root");
  var me = null;
  var names = {};        // profile id -> display name
  var openWith = null;   // the other person in the visible thread

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function when(iso) {
    var d = new Date(iso);
    var today = new Date().toDateString() === d.toDateString();
    return today
      ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  /* `profiles` is NOT campaign-scoped: one person, one account, both settings. */
  async function loadNames() {
    var res = await db.from("profiles").select("id, display_name");
    (res.data || []).forEach(function (p) { names[p.id] = p.display_name; });
  }

  async function allMine() {
    var res = await db
      .from("messages")
      .select("*")
      .eq("campaign", CAMPAIGN)
      .or("sender_id.eq." + me.id + ",recipient_id.eq." + me.id)
      .order("created_at", { ascending: false });
    return res.data || [];
  }

  /** Latest message per conversation partner, newest first, with unread counts. */
  function conversations(rows) {
    var seen = {};
    var out = [];
    rows.forEach(function (m) {
      var other = m.sender_id === me.id ? m.recipient_id : m.sender_id;
      var unread = !m.read_at && m.recipient_id === me.id ? 1 : 0;
      if (seen[other]) { seen[other].unread += unread; return; }
      seen[other] = { id: other, latest: m, unread: unread };
      out.push(seen[other]);
    });
    return out;
  }

  function renderList(convos) {
    if (!convos.length) {
      return '<p class="entry-empty">No messages yet.</p>';
    }
    return '<ul class="msg-list" role="list">' + convos.map(function (c) {
      var mine = c.latest.sender_id === me.id;
      return "<li><button type=\"button\" class=\"msg-convo" +
        (c.id === openWith ? " is-open" : "") + "\" data-with=\"" + esc(c.id) + "\">" +
        '<span class="msg-convo__name">' + esc(names[c.id] || "Unknown") + "</span>" +
        (c.unread ? '<span class="nav-badge">' + c.unread + "</span>" : "") +
        '<span class="msg-convo__time">' + esc(when(c.latest.created_at)) + "</span>" +
        '<span class="msg-convo__preview">' + (mine ? "You: " : "") +
          esc(c.latest.content.slice(0, 70)) + "</span>" +
        "</button></li>";
    }).join("") + "</ul>";
  }

  function renderThread(rows) {
    if (!openWith) {
      return '<div class="msg-thread"><p class="entry-empty">Pick a conversation, or start one from the roster.</p></div>';
    }
    var bubbles = rows.map(function (m) {
      var mine = m.sender_id === me.id;
      return '<li class="msg-bubble' + (mine ? " is-mine" : "") + '">' +
        '<span class="msg-bubble__body">' + esc(m.content) + "</span>" +
        '<span class="msg-bubble__time">' + esc(when(m.created_at)) + "</span></li>";
    }).join("");
    return '<div class="msg-thread">' +
      '<h2 class="msg-thread__who">' + esc(names[openWith] || "Unknown") + "</h2>" +
      '<ol class="msg-bubbles" id="msg-bubbles" role="list">' + bubbles + "</ol>" +
      '<form class="msg-send" id="msg-send">' +
        '<label class="skip-link" for="msg-input">Message</label>' +
        '<input class="auth__input" id="msg-input" autocomplete="off" placeholder="Write a message">' +
        '<button class="btn btn--primary" type="submit">Send</button>' +
      "</form></div>";
  }

  async function threadWith(otherId) {
    var res = await db
      .from("messages")
      .select("*")
      .eq("campaign", CAMPAIGN)
      .or("and(sender_id.eq." + me.id + ",recipient_id.eq." + otherId + ")," +
          "and(sender_id.eq." + otherId + ",recipient_id.eq." + me.id + ")")
      .order("created_at", { ascending: true });
    return res.data || [];
  }

  async function markRead(otherId) {
    await db
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("campaign", CAMPAIGN)
      .eq("recipient_id", me.id)
      .eq("sender_id", otherId)
      .is("read_at", null);
    if (window.loadUnreadBadge) window.loadUnreadBadge();
  }

  async function draw() {
    var rows = await allMine();
    var convos = conversations(rows);
    var thread = openWith ? await threadWith(openWith) : [];

    root.innerHTML =
      '<div class="msg-pane">' + renderList(convos) + "</div>" +
      '<div class="msg-pane msg-pane--thread">' + renderThread(thread) + "</div>";

    root.querySelectorAll("[data-with]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        openWith = btn.getAttribute("data-with");
        history.replaceState(null, "", "?with=" + encodeURIComponent(openWith));
        await markRead(openWith);
        await draw();
      });
    });

    var form = document.getElementById("msg-send");
    if (form) {
      form.addEventListener("submit", async function (e) {
        e.preventDefault();
        var input = document.getElementById("msg-input");
        var text = input.value.trim();
        if (!text) return;
        input.value = "";
        await db.from("messages").insert({
          sender_id: me.id,
          recipient_id: openWith,
          content: text,
          campaign: CAMPAIGN
        });
        await draw();
      });
    }

    var list = document.getElementById("msg-bubbles");
    if (list) list.scrollTop = list.scrollHeight;
  }

  async function main() {
    var session = await window.requireAuth(true);
    if (!session) return;
    me = await window.getProfile();
    if (!me) {
      root.innerHTML = '<p class="entry-empty">No profile found for this account.</p>';
      return;
    }

    await loadNames();

    // ?with=<uuid> deep link, e.g. from the roster. Checked against known
    // profiles so a made-up id in the URL opens nothing.
    var wanted = new URLSearchParams(location.search).get("with");
    if (wanted && names[wanted]) {
      openWith = wanted;
      await markRead(openWith);
    }

    await draw();
    setInterval(function () { if (!document.hidden) draw(); }, POLL_MS);
  }

  main();
})();

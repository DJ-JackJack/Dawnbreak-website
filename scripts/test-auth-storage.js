#!/usr/bin/env node
/**
 * Tests for the cross-subdomain auth storage adapter.
 *
 * This is the one piece of the site that can lock every player out at once, so
 * it gets tested rather than eyeballed. Run with `npm run test:auth`.
 *
 * The fake below behaves like a real `document.cookie`: assigning a string
 * sets or replaces one cookie, `max-age=0` deletes it, and reading back yields
 * only `name=value` pairs with the attributes stripped -- which is exactly the
 * asymmetry that makes cookie code easy to get wrong.
 */

const { createAuthStorage, _chunk, _canUseCookies, CHUNK } =
  require("../src/assets/js/auth-storage.js");

let pass = 0, fail = 0;
const eq = (got, want, what) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) pass++; else { fail++; console.error(`FAIL ${what}\n  got  ${g}\n  want ${w}`); }
};

/** A document.cookie that behaves like a browser's. */
function fakeDocument() {
  const jar = new Map();
  return {
    get cookie() {
      return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
    },
    set cookie(str) {
      const [pair, ...attrs] = str.split(";").map(s => s.trim());
      const eqAt = pair.indexOf("=");
      const name = pair.slice(0, eqAt);
      const value = pair.slice(eqAt + 1);
      const expired = attrs.some(a => /^max-age=0$/i.test(a));
      if (expired) jar.delete(name); else jar.set(name, value);
    },
    _jar: jar,
  };
}

function fakeStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
    _map: map,
  };
}

const KEY = "sb-fbfqeijisvckwmkqzjtd-auth-token";
const short = JSON.stringify({ access_token: "abc", user: { id: "1" } });
const long = JSON.stringify({ access_token: "x".repeat(7000), user: { id: "1" } });

/* ------------------------------------------------------------ domain gating */

eq(_canUseCookies("ahvantir.world"), true, "the parent domain itself can share cookies");
eq(_canUseCookies("dawnbreak.ahvantir.world"), true, "a subdomain can share cookies");
eq(_canUseCookies("localhost"), false, "localhost cannot — dev must fall back to localStorage");
eq(_canUseCookies("127.0.0.1"), false, "an IP cannot");
eq(_canUseCookies(""), false, "an empty hostname cannot");
/* The check matches on a leading dot, so a lookalike registered by someone
   else can never be treated as ours. */
eq(_canUseCookies("notahvantir.world"), false, "a lookalike domain is not a subdomain");
eq(_canUseCookies("ahvantir.world.evil.com"), false, "…and neither is a domain that merely contains it");

/* ---------------------------------------------------------------- chunking */

eq(_chunk("").length, 1, "an empty value still produces one chunk, never zero");
eq(_chunk("x".repeat(CHUNK)).length, 1, "a value exactly at the limit is one chunk");
eq(_chunk("x".repeat(CHUNK + 1)).length, 2, "one byte over becomes two");
eq(_chunk(long).join("") === long, true, "chunks rejoin to exactly the original");

/* ------------------------------------------------------------- round trips */

{
  const doc = fakeDocument();
  const store = createAuthStorage(doc, fakeStorage(), "dawnbreak.ahvantir.world");
  store.setItem(KEY, short);
  eq(store.getItem(KEY), short, "a short session round-trips");
  eq([...doc._jar.keys()], [KEY], "…in a single unchunked cookie");
}

{
  const doc = fakeDocument();
  const store = createAuthStorage(doc, fakeStorage(), "ahvantir.world");
  store.setItem(KEY, long);
  eq(store.getItem(KEY), long, "a session too big for one cookie round-trips");
  eq([...doc._jar.keys()].every(k => /\.\d+$/.test(k)), true, "…stored only as numbered chunks");
  eq(doc._jar.size > 1, true, "…across more than one cookie");
}

/* Written on one site, read on the other. The entire point of the file. */
{
  const doc = fakeDocument();
  const a = createAuthStorage(doc, fakeStorage(), "ahvantir.world");
  const b = createAuthStorage(doc, fakeStorage(), "dawnbreak.ahvantir.world");
  a.setItem(KEY, long);
  eq(b.getItem(KEY), long, "a session written on one site is readable on the other");
}

/* ------------------------------------------ the bug worth testing for */

/*
 * A long session replaced by a short one. Miss this and the leftover chunks
 * are read back as trailing garbage, producing a corrupt session that survives
 * a reload and cannot be cleared by signing out.
 */
{
  const doc = fakeDocument();
  const store = createAuthStorage(doc, fakeStorage(), "ahvantir.world");
  store.setItem(KEY, long);
  store.setItem(KEY, short);
  eq(store.getItem(KEY), short, "a shorter session replaces a longer one cleanly");
  eq([...doc._jar.keys()], [KEY], "…leaving no stale chunks behind");
}

/* And the reverse: an unchunked cookie must not survive alongside chunks. */
{
  const doc = fakeDocument();
  const store = createAuthStorage(doc, fakeStorage(), "ahvantir.world");
  store.setItem(KEY, short);
  store.setItem(KEY, long);
  eq(store.getItem(KEY), long, "a longer session replaces a shorter one cleanly");
  eq(doc._jar.has(KEY), false, "…and the unchunked cookie is gone");
}

/* A long session replaced by a slightly less long one, still chunked. */
{
  const doc = fakeDocument();
  const store = createAuthStorage(doc, fakeStorage(), "ahvantir.world");
  store.setItem(KEY, "y".repeat(CHUNK * 5));
  store.setItem(KEY, "z".repeat(CHUNK * 2));
  eq(store.getItem(KEY), "z".repeat(CHUNK * 2), "chunk count shrinking is handled");
  eq(doc._jar.size, 2, "…and the surplus chunks are deleted");
}

/* ------------------------------------------------------------- signing out */

{
  const doc = fakeDocument();
  const ls = fakeStorage();
  const store = createAuthStorage(doc, ls, "ahvantir.world");
  store.setItem(KEY, long);
  store.removeItem(KEY);
  eq(store.getItem(KEY), null, "signing out clears the session");
  eq(doc._jar.size, 0, "…every chunk of it");
}

/*
 * Signing out has to STAY signed out.
 *
 * The dangerous case is a player who was already logged in before this
 * adapter shipped: their session is adopted out of localStorage and promoted
 * to a cookie, but the localStorage copy is still sitting there. If signing
 * out only clears the cookies, the very next page load finds them empty,
 * falls through to the legacy branch, and signs the player back in.
 *
 * An earlier version of this test seeded nothing into localStorage, so it
 * asserted that an already-empty map was empty and passed no matter what
 * `removeItem` did. Seeding it first is the whole test.
 */
{
  const doc = fakeDocument();
  const ls = fakeStorage({ [KEY]: short });
  const store = createAuthStorage(doc, ls, "ahvantir.world");
  eq(store.getItem(KEY), short, "the pre-existing session is adopted");
  store.removeItem(KEY);
  eq(doc._jar.size, 0, "signing out clears the cookies");
  eq(ls._map.size, 0, "…and the localStorage copy it was adopted from");
  eq(store.getItem(KEY), null, "…so the next page load does not sign them back in");
}

/* ------------------------------------------------------ migration and dev */

/*
 * Deploying this must not sign out everyone who is already logged in. They
 * would have no way to tell that from a bug.
 */
{
  const doc = fakeDocument();
  const ls = fakeStorage({ [KEY]: short });
  const store = createAuthStorage(doc, ls, "ahvantir.world");
  eq(store.getItem(KEY), short, "an existing localStorage session is adopted, not discarded");
  eq(doc._jar.size > 0, true, "…and promoted to a cookie so the other site can see it");
}

{
  const doc = fakeDocument();
  const ls = fakeStorage();
  const store = createAuthStorage(doc, ls, "localhost");
  store.setItem(KEY, short);
  eq(store.getItem(KEY), short, "on localhost the session still round-trips");
  eq(doc._jar.size, 0, "…via localStorage, because the cookie would be dropped");
  eq(ls._map.get(KEY), short, "…and it really is in localStorage");
}

/* Cookies and storage both blocked. Not signed in, but not throwing either. */
{
  const doc = fakeDocument();
  const store = createAuthStorage(doc, null, "localhost");
  store.setItem(KEY, short);
  eq(store.getItem(KEY), null, "with no storage at all, reads return null rather than throwing");
  store.removeItem(KEY);
  pass++;   // reaching here without an exception is the assertion
}

/* Values that survive encoding. A JWT is base64url, but a display name in the
   session is not, and a `;` would otherwise end the cookie early. */
{
  const doc = fakeDocument();
  const store = createAuthStorage(doc, fakeStorage(), "ahvantir.world");
  const awkward = JSON.stringify({ name: 'Krys; "M4st3r"', note: "a=b; c=d" });
  store.setItem(KEY, awkward);
  eq(store.getItem(KEY), awkward, "semicolons and quotes survive the round trip");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

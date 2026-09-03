/**
 * Where the Obsidian vault lives.
 *
 * Read from `OBSIDIAN_VAULT_PATH`, in the environment or in `.env` at the repo
 * root. `.env` is gitignored — the path is a local machine detail, and this is
 * a public repo.
 *
 * The parsing here is deliberately fussy about three things that have all
 * actually broken this kind of file before:
 *
 *   - a UTF-8 BOM, which Notepad and PowerShell's `>` both add, and which turns
 *     the first key into `﻿OBSIDIAN_VAULT_PATH` — a different key, silently
 *   - a trailing ` # comment`, stripped only when a space precedes the `#`, so
 *     a path containing a `#` survives
 *   - surrounding quotes, which people add when a path has spaces in it, as
 *     this one does
 */

const fs = require("fs");
const path = require("path");

const ENV_FILE = path.join(__dirname, "..", ".env");

/** Parse `.env` into a plain object. Missing file is not an error. */
function readEnvFile(file = ENV_FILE) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const raw of fs.readFileSync(file, "utf8").replace(/^﻿/, "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    const quoted = value.length >= 2 && value[0] === value.at(-1) && (value[0] === '"' || value[0] === "'");
    if (quoted) {
      value = value.slice(1, -1);           // quotes protect the whole value, comments included
    } else {
      const c = value.indexOf(" #");
      if (c !== -1) value = value.slice(0, c).trim();
    }
    out[key] = value;
  }
  return out;
}

/**
 * The configured vault path.
 * @param {{mustExist?: boolean}} opts `mustExist` false lets vault-init create it.
 * @returns {string}
 */
function vaultPath({ mustExist = true } = {}) {
  const configured = (process.env.OBSIDIAN_VAULT_PATH || readEnvFile().OBSIDIAN_VAULT_PATH || "").trim();

  if (!configured) {
    console.error(
      "OBSIDIAN_VAULT_PATH is not set.\n" +
      "Copy .env.example to .env and put your vault's path in it."
    );
    process.exit(1);
  }
  if (mustExist && !fs.existsSync(configured)) {
    console.error(
      `The vault path does not exist:\n  ${configured}\n\n` +
      "Fix the path in .env, or run `npm run vault:init` to create the vault there."
    );
    process.exit(1);
  }
  return configured;
}

module.exports = { vaultPath, readEnvFile };

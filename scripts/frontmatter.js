/**
 * The YAML subset the templates use, parsed once for everything that reads it.
 *
 * This lives on its own because two things now read article frontmatter — the
 * linter that validates articles and the converter that writes them — and if
 * they parsed differently the converter could emit a file the linter rejects,
 * or worse, one it wrongly accepts. One parser, one set of bugs, one place to
 * fix them.
 *
 * Deliberately dependency-free. It handles exactly the subset the templates
 * use — `key: value`, `key: [a, b]`, quoted strings, and block lists — and
 * REFUSES anything it does not understand rather than guessing. A parser that
 * silently mis-reads a field would be worse than none, because the linter
 * would then be certifying articles it had not really checked.
 */

/** Strip one layer of matching quotes, if present. */
function unquote(s) {
  const t = s.trim();
  if (t.length >= 2 && ((t[0] === '"' && t.at(-1) === '"') || (t[0] === "'" && t.at(-1) === "'"))) {
    return t.slice(1, -1);
  }
  return t;
}

/**
 * Split the `---` frontmatter block off the body.
 * @returns {{front: string, body: string}|null} null when there is no block.
 */
function splitFrontmatter(raw) {
  /*
   * Normalize CRLF first, and a leading BOM with it.
   *
   * Without this the parser breaks on the LAST frontmatter line, and only on
   * that one: the block is found with `indexOf("\n---")`, which leaves the
   * preceding `\r` stranded at the end of `front` where the `\r?\n` split has
   * no `\n` to anchor to. The line then fails to match `key: value` and the
   * field reads as missing. This is a Windows checkout with git's default
   * `core.autocrlf` -- that is to say, the normal case here -- and it was
   * invisible until a test rewrote the file with CRLF.
   */
  const text = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;
  const front = text.slice(text.indexOf("\n") + 1, end);
  const after = text.slice(end + 4);
  return { front, body: after.replace(/^\r?\n/, "") };
}

/**
 * Parse a frontmatter block. Returns `{ data, errors }` rather than throwing,
 * so one malformed line is reported alongside every other problem in the file
 * instead of hiding them.
 */
function parseFrontmatter(front) {
  const data = {};
  const errors = [];
  const lines = front.split(/\r?\n/);
  let listKey = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) continue;

    // A block-list item belonging to the key above it.
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item) {
      if (!listKey) { errors.push(`line ${i + 1}: list item with no key above it`); continue; }
      data[listKey].push(unquote(item[1]));
      continue;
    }

    const kv = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (!kv) { errors.push(`line ${i + 1}: not a "key: value" pair — ${JSON.stringify(line)}`); continue; }

    const [, key, rawValue] = kv;
    /*
     * Trailing `  # note` is a comment, not part of the value. Generated
     * skeletons carry the schema's authoring notes that way, so an untouched
     * field would otherwise validate as "filled in, with the instructions" --
     * the one failure mode that would make this linter worse than useless,
     * because it would certify articles it had not really checked. It did
     * exactly that on first run: `summary: ""  # ONE sentence...` passed the
     * empty check and then failed the one-sentence check, on the note.
     *
     * A quoted value has its comment stripped by matching the closing quote
     * rather than by looking for a `#`, so `title: "Ward #6"` survives whole.
     */
    const trimmed = rawValue.trim();
    const quoted = trimmed.match(/^(['"])((?:\\.|(?!\1).)*)\1\s*(?:#.*)?$/);
    const bare = quoted ? null : trimmed.replace(/\s+#.*$/, "").trim();

    // Nothing after the colon means a block list follows on the next lines.
    // An explicitly EMPTY QUOTED STRING does not: `summary: ""` is a field the
    // author has not filled in yet, and must be reported as such rather than
    // quietly becoming an empty list that passes every check after it.
    if (!quoted && bare === "") { data[key] = []; listKey = key; continue; }
    listKey = null;

    if (!quoted && bare.startsWith("[") && bare.endsWith("]")) {          // inline list
      const inner = bare.slice(1, -1).trim();
      data[key] = inner === "" ? [] : inner.split(",").map(unquote).filter(s => s !== "");
      continue;
    }
    data[key] = quoted ? quoted[2] : unquote(bare);
  }
  return { data, errors };
}

module.exports = { unquote, splitFrontmatter, parseFrontmatter };

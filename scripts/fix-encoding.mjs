import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

function buildMaps(encoding) {
  const d = new TextDecoder(encoding);
  const bytes = [];
  for (let b = 0; b <= 0xff; b++) bytes.push(d.decode(new Uint8Array([b])));
  const charToByte = new Map();
  for (let b = 0; b <= 0xff; b++) {
    const c = bytes[b];
    if (!charToByte.has(c)) charToByte.set(c, b);
  }
  return { charToByte };
}

const maps = {
  "windows-1256": buildMaps("windows-1256"),
  "windows-1252": buildMaps("windows-1252"),
};

function tryDecodeRun(run, encoding) {
  const { charToByte } = maps[encoding];
  const dec = new TextDecoder(encoding);
  const out = [];
  for (const ch of run) {
    const b = charToByte.get(ch);
    if (b === undefined) return null;
    out.push(b);
  }
  let result;
  try {
    result = new TextDecoder("utf-8").decode(Uint8Array.from(out));
  } catch {
    return null;
  }
  if (result.includes("\uFFFD")) return null;
  const roundTrip = dec.decode(new TextEncoder().encode(result));
  if (roundTrip !== run) return null;
  return result;
}

function isMojibakeClassChar(c) {
  const cp = c.codePointAt(0);
  if (cp <= 0x7f) return false;
  return maps["windows-1256"].charToByte.has(c) || maps["windows-1252"].charToByte.has(c);
}

function fixText(text) {
  const out = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (!isMojibakeClassChar(ch)) {
      out.push(ch);
      i++;
      continue;
    }
    let j = i;
    while (j < text.length && isMojibakeClassChar(text[j])) j++;
    const run = text.slice(i, j);
    const fixed = tryDecodeRun(run, "windows-1256") ?? tryDecodeRun(run, "windows-1252");
    out.push(fixed !== null && fixed !== run ? fixed : run);
    i = j;
  }
  return out.join("");
}

function collectFiles(dir, acc, exts) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === ".git" || entry === "vendor") continue;
      collectFiles(full, acc, exts);
    } else if (exts.has(extname(entry).toLowerCase())) {
      acc.push(full);
    }
  }
  return acc;
}

const DEFAULT_EXTS = new Set([".js", ".json", ".html"]);
const dryRun = !process.argv.includes("--apply");
const paths = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const files = paths.length
  ? paths
  : collectFiles(join(ROOT, "frontend"), [], DEFAULT_EXTS)
      .concat(collectFiles(join(ROOT, "functions"), [], DEFAULT_EXTS));

let totalChanges = 0;
for (const file of files) {
  console.error("processing:", file.replace(ROOT, "."));
  const original = readFileSync(file, "utf8");
  console.error("  size:", original.length);
  const fixed = fixText(original);
  console.error("  fixed size:", fixed.length);
  if (fixed !== original) {
    totalChanges++;
    console.log("=== " + file.replace(ROOT, "."));
    let a = original, b = fixed;
    let start = 0;
    while (start < a.length && start < b.length && a[start] === b[start]) start++;
    let aEnd = a.length, bEnd = b.length;
    while (aEnd > start && bEnd > start && a[aEnd - 1] === b[bEnd - 1]) { aEnd--; bEnd--; }
    console.log("  before: " + JSON.stringify(a.slice(Math.max(0, start - 30), aEnd + 30)));
    console.log("  after:  " + JSON.stringify(b.slice(Math.max(0, start - 30), bEnd + 30)));
    if (!dryRun) writeFileSync(file, fixed, "utf8");
  }
}
console.log(`\n${dryRun ? "DRY-RUN" : "APPLIED"} — ${totalChanges} file(s) changed.`);
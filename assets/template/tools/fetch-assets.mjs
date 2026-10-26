#!/usr/bin/env node
// Downloads Figma asset URLs (they expire quickly) into src/assets/.
// Usage: node tools/fetch-assets.mjs assets.json      where assets.json = { "logo.svg": "https://…", "hero.png": "https://…" }
//    or: node tools/fetch-assets.mjs name.png https://…
// Writes src/assets/manifest.json recording what was fetched (and what failed).
import fs from "node:fs";
import path from "node:path";

const [a, b] = process.argv.slice(2);
if (!a) {
  console.error("usage: fetch-assets.mjs <map.json> | <name> <url>");
  process.exit(2);
}
const map = b ? { [a]: b } : JSON.parse(fs.readFileSync(a, "utf8"));
const dir = "src/assets";
fs.mkdirSync(dir, { recursive: true });
const manPath = path.join(dir, "manifest.json");
const man = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, "utf8")) : {};
let failed = 0;
for (const [name, url] of Object.entries(map)) {
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, "-");
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) throw new Error("empty response");
    fs.writeFileSync(path.join(dir, safe), buf);
    man[safe] = { ok: true, bytes: buf.length, at: new Date().toISOString() };
    console.log(`✓ ${safe} (${(buf.length / 1024).toFixed(1)} KB)`);
  } catch (e) {
    failed++;
    man[safe] = { ok: false, error: String(e.message ?? e), at: new Date().toISOString() };
    console.log(`✗ ${safe}: ${e.message ?? e}`);
  }
}
fs.writeFileSync(manPath, JSON.stringify(man, null, 2));
if (failed) {
  console.log(`\n${failed} asset(s) failed. Figma URLs expire after a short time — re-request them and retry, or note the gap.`);
  process.exit(1);
}

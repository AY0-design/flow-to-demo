#!/usr/bin/env node
// Compares prototype screenshots (qa/screens/<id>.png, from `npm test`) with
// Figma screenshots (figma/screens/<id>.png). Writes qa/diff/<id>.png and qa/visual-report.json.
// Usage: node tools/visual-diff.mjs [--fail-above 0.06]
import fs from "node:fs";
import path from "node:path";
import { compare, crop, readPng } from "./png.mjs";

const args = process.argv.slice(2);
const failAbove = args.includes("--fail-above") ? Number(args[args.indexOf("--fail-above") + 1]) : 0.06;
const figDir = "figma/screens", protoDir = "qa/screens", diffDir = "qa/diff";
fs.mkdirSync(diffDir, { recursive: true });

if (!fs.existsSync(protoDir)) {
  console.error("✗ qa/screens is empty — run `npm test` first (it captures one screenshot per screen).");
  process.exit(1);
}
const results = [];
for (const f of fs.readdirSync(protoDir).filter((f) => f.endsWith(".png")).sort()) {
  const id = path.basename(f, ".png");
  const fig = path.join(figDir, f);
  if (!fs.existsSync(fig)) {
    results.push({ id, status: "no-figma-reference" });
    continue;
  }
  const a = readPng(path.join(protoDir, f));
  let b = readPng(fig);
  let note;
  // Figma frames of scrollable screens are often taller than the viewport: compare the top viewport
  if (b.width / b.height < a.width / a.height - 0.01) {
    const h = Math.round(b.width * (a.height / a.width));
    b = crop(b, 0, 0, b.width, h);
    note = "figma frame taller than viewport — compared top viewport only";
  }
  const aspectA = a.width / a.height, aspectB = b.width / b.height;
  const { ratio } = compare(a, b, path.join(diffDir, f));
  const r = { id, mismatch: +ratio.toFixed(4), size: `${a.width}x${a.height}`, figmaSize: `${b.width}x${b.height}` };
  if (note) r.note = note;
  if (Math.abs(aspectA - aspectB) > 0.01) r.warning = "aspect ratio differs — check viewport size or scroll height";
  r.status = ratio > failAbove ? "review" : "ok";
  results.push(r);
}
fs.writeFileSync("qa/visual-report.json", JSON.stringify({ failAbove, results }, null, 2));
for (const r of results) {
  const pct = r.mismatch === undefined ? "  —  " : `${(r.mismatch * 100).toFixed(1).padStart(5)}%`;
  console.log(`${r.status === "ok" ? "✓" : r.status === "review" ? "✗" : "·"} ${pct}  ${r.id}${r.warning ? `  (${r.warning})` : ""}${r.status === "no-figma-reference" ? "  (no figma/screens reference)" : ""}`);
}
const bad = results.filter((r) => r.status === "review");
console.log(`\n${results.length - bad.length}/${results.length} screens within ${(failAbove * 100).toFixed(0)}% — diffs in qa/diff/`);
process.exit(bad.length ? 1 : 0);

#!/usr/bin/env node
// Validates flow.json (and optionally that every screen has a component).
// Usage: node tools/validate-flow.mjs [path/to/flow.json] [--draft]
//   --draft  skip the approval check (use while the Flow Review is still open)
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const draft = args.includes("--draft");
const file = args.find((a) => !a.startsWith("--")) ?? "flow.json";
const errors = [];
const warns = [];
let m;
try {
  m = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (e) {
  console.error(`✗ cannot read ${file}: ${e.message}`);
  process.exit(1);
}

const EVIDENCE = ["confirmed", "inferred", "assumed"];
const KINDS = ["screen", "modal", "sheet", "drawer", "dropdown"];
const TRANS = ["push", "fade", "rise", "none"];
const ACTIONS = ["navigate", "back", "reset", "open", "close", "set", "toast", "loading", "wait"];
const STEPS = ["wait", "tap", "type", "scroll", "set", "action"];

if (m.version !== 1) errors.push("version must be 1");
const meta = m.meta ?? {};
for (const k of ["name", "slug", "platform", "viewport", "start"]) if (!meta[k]) errors.push(`meta.${k} is required`);
if (meta.platform && !["mobile", "tablet", "web"].includes(meta.platform)) errors.push(`meta.platform "${meta.platform}" invalid`);
if (meta.viewport && !(meta.viewport.width > 0 && meta.viewport.height > 0)) errors.push("meta.viewport needs positive width/height");
if (!draft && !meta.approval?.approved)
  errors.push("meta.approval.approved is not true — the Flow Review must be approved before building (use --draft while reviewing)");

const screens = m.screens ?? [];
const ids = new Set();
for (const s of screens) {
  if (!s.id || !/^[a-z0-9][a-z0-9-]*$/.test(s.id)) errors.push(`screen id "${s.id}" must be kebab-case`);
  if (ids.has(s.id)) errors.push(`duplicate screen id "${s.id}"`);
  ids.add(s.id);
  if (!EVIDENCE.includes(s.status)) errors.push(`screen "${s.id}" status must be one of ${EVIDENCE.join("/")}`);
  if (s.kind && !KINDS.includes(s.kind)) errors.push(`screen "${s.id}" kind "${s.kind}" invalid`);
  if (!s.figmaNodeId) warns.push(`screen "${s.id}" has no figmaNodeId (traceability)`);
}
if (meta.start && !ids.has(meta.start)) errors.push(`meta.start "${meta.start}" is not a screen`);
const overlay = (id) => (screens.find((s) => s.id === id)?.kind ?? "screen") !== "screen";

const ixIds = new Set();
for (const ix of m.interactions ?? []) {
  if (ixIds.has(ix.id)) errors.push(`duplicate interaction id "${ix.id}"`);
  ixIds.add(ix.id);
  if (ix.screen !== "*" && !ids.has(ix.screen)) errors.push(`interaction "${ix.id}": unknown screen "${ix.screen}"`);
  if (!ix.element) errors.push(`interaction "${ix.id}": element is required`);
  if (!EVIDENCE.includes(ix.status)) errors.push(`interaction "${ix.id}": status must be ${EVIDENCE.join("/")}`);
  if (ix.status !== "confirmed" && !ix.source) warns.push(`interaction "${ix.id}" is ${ix.status} but has no "source" explaining why`);
  if (!Array.isArray(ix.actions) || !ix.actions.length) errors.push(`interaction "${ix.id}": needs at least one action`);
  for (const a of ix.actions ?? []) {
    if (!ACTIONS.includes(a.type)) errors.push(`interaction "${ix.id}": unknown action "${a.type}"`);
    if ((a.type === "navigate" || a.type === "reset") && !ids.has(a.to)) errors.push(`interaction "${ix.id}": navigates to unknown "${a.to}"`);
    if ((a.type === "navigate" || a.type === "reset") && overlay(a.to)) errors.push(`interaction "${ix.id}": "${a.to}" is an overlay — use {"type":"open"}`);
    if (a.type === "open" && !ids.has(a.overlay)) errors.push(`interaction "${ix.id}": opens unknown overlay "${a.overlay}"`);
    if (a.type === "open" && ids.has(a.overlay) && !overlay(a.overlay)) errors.push(`interaction "${ix.id}": "${a.overlay}" is a screen — use navigate`);
    if (a.transition && !TRANS.includes(a.transition)) errors.push(`interaction "${ix.id}": transition "${a.transition}" invalid`);
  }
}

const steps = m.demo?.steps ?? [];
if (!steps.length) (draft ? warns : errors).push("demo.steps is empty");
steps.forEach((st, i) => {
  if (!STEPS.includes(st.do)) errors.push(`demo step ${i}: unknown "do": "${st.do}"`);
  if ((st.do === "tap" || st.do === "type") && !st.target) errors.push(`demo step ${i}: target required`);
  if (st.do === "tap" && !(m.interactions ?? []).some((ix) => ix.element === st.target))
    errors.push(`demo step ${i}: no interaction uses element "${st.target}"`);
  if (st.do === "type" && typeof st.text !== "string") errors.push(`demo step ${i}: text required`);
});

for (const g of m.gaps ?? []) if (g.severity === "critical" && !g.resolution) errors.push(`critical gap "${g.id}" has no resolution`);

// component registry check (only inside a generated project)
const reg = path.join(path.dirname(path.resolve(file)), "src", "screens", "index.ts");
if (fs.existsSync(reg)) {
  const src = fs.readFileSync(reg, "utf8");
  for (const id of ids) {
    const re = new RegExp(`(["'\`])${id}\\1\\s*:|^\\s*${id.replace(/-/g, "_")}\\s*[,:]`, "m");
    if (!re.test(src)) (draft ? warns : errors).push(`screen "${id}" is not registered in src/screens/index.ts`);
  }
}

for (const w of warns) console.log(`⚠ ${w}`);
if (errors.length) {
  for (const e of errors) console.log(`✗ ${e}`);
  console.log(`\n${errors.length} error(s) in ${file}`);
  process.exit(1);
}
const counts = { confirmed: 0, inferred: 0, assumed: 0 };
for (const ix of m.interactions ?? []) counts[ix.status]++;
console.log(`✓ ${file} valid — ${screens.length} screens, ${(m.interactions ?? []).length} interactions (${counts.confirmed} confirmed, ${counts.inferred} inferred, ${counts.assumed} assumed), ${steps.length} demo steps`);

#!/usr/bin/env node
// Creates a new Flow to Demo project from the skill template. Never overwrites.
// Usage:
//   node new-project.mjs --slug acme-onboarding --name "Acme onboarding" \
//     --platform mobile --width 390 --height 844 --figma-url "https://…" [--dir ./flow-demos] [--install] [--example]
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const template = path.join(here, "..", "assets", "template");
const example = path.join(here, "..", "assets", "example");

const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const flag = (k) => argv.includes(`--${k}`);

const slug = (opt("slug") ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
if (!slug) {
  console.error("✗ --slug is required (e.g. --slug acme-onboarding)");
  process.exit(2);
}
const root = path.resolve(opt("dir", "flow-demos"));
const dest = path.join(root, slug);
if (fs.existsSync(dest) && fs.readdirSync(dest).length) {
  let n = 2;
  while (fs.existsSync(`${dest}-${n}`)) n++;
  console.error(`✗ ${dest} already exists and is not empty — not overwriting.\n  Ask the user, then either update that project in place or use --slug ${slug}-${n}`);
  process.exit(3);
}

const skip = new Set(["node_modules", "dist", "out", "test-results", "playwright-report"]);
fs.cpSync(template, dest, { recursive: true, filter: (src) => !skip.has(path.basename(src)) });
for (const d of ["out", "qa", "figma/screens", "src/assets"]) fs.mkdirSync(path.join(dest, d), { recursive: true });

const flowPath = path.join(dest, "flow.json");
if (flag("example")) {
  fs.copyFileSync(path.join(example, "flow.json"), flowPath);
  fs.cpSync(path.join(example, "src", "screens"), path.join(dest, "src", "screens"), { recursive: true });
  fs.cpSync(path.join(example, "src", "assets"), path.join(dest, "src", "assets"), { recursive: true });
} else {
  const flow = JSON.parse(fs.readFileSync(flowPath, "utf8"));
  flow.meta.name = opt("name", slug);
  flow.meta.slug = slug;
  flow.meta.platform = opt("platform", "mobile");
  flow.meta.viewport = { width: Number(opt("width", 390)), height: Number(opt("height", 844)) };
  const url = opt("figma-url", "");
  if (url) {
    const m = url.match(/figma\.com\/(?:design|file|proto)\/([A-Za-z0-9]+)(?:\/branch\/([A-Za-z0-9]+))?/);
    const node = new URL(url).searchParams.get("node-id");
    flow.meta.figma = { url, fileKey: m ? m[2] ?? m[1] : "", nodeId: node ? node.replace("-", ":") : "" };
  }
  fs.writeFileSync(flowPath, JSON.stringify(flow, null, 2) + "\n");
  const pj = path.join(dest, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pj, "utf8"));
  pkg.name = slug;
  fs.writeFileSync(pj, JSON.stringify(pkg, null, 2) + "\n");
}

console.log(`✓ created ${dest}`);
if (flag("install")) {
  console.log("  installing dependencies (1–2 min)…");
  try {
    execSync("npm install --no-audit --no-fund", { cwd: dest, stdio: "inherit" });
    console.log("✓ dependencies installed");
  } catch {
    console.error(`✗ npm install failed — run it manually: cd "${dest}" && npm install`);
    process.exit(4);
  }
}
console.log(dest);

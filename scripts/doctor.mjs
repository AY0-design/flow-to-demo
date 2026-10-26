#!/usr/bin/env node
// Environment check for /flow-to-demo. Prints what is ready, what is missing and how to fix it.
// Usage: node doctor.mjs [projectDir]
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const project = process.argv[2];
const rows = [];
const add = (ok, name, detail, fix, note = "") => rows.push({ ok, name, detail, fix, note });
const cmd = (c) => {
  try {
    return execSync(c, { stdio: ["ignore", "pipe", "ignore"], timeout: 20000 }).toString().trim();
  } catch {
    return null;
  }
};

const node = process.versions.node;
const [maj] = node.split(".").map(Number);
add(maj >= 18, "Node.js", `v${node}`, "Install Node 20+ from https://nodejs.org (LTS).");
const npmV = cmd("npm -v");
add(!!npmV, "npm", npmV ?? "not found", "npm ships with Node — reinstall Node.");
const ff = cmd("ffmpeg -version");
add(true, "ffmpeg (optional)", ff ? ff.split("\n")[0].slice(0, 40) : "not on PATH — Remotion's bundled ffmpeg will be used", "");

// a Chromium for Playwright / Remotion
const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, path.join(os.homedir(), ".cache", "ms-playwright"), path.join(os.homedir(), "Library", "Caches", "ms-playwright"), path.join(os.homedir(), "AppData", "Local", "ms-playwright")].filter(Boolean);
const browsers = roots.flatMap((r) => (fs.existsSync(r) ? fs.readdirSync(r).filter((d) => d.startsWith("chromium")).map((d) => path.join(r, d)) : []));
add(
  true,
  "Chromium",
  browsers.length ? browsers[0] : "none cached yet",
  "",
  browsers.length ? "" : "Run `npx playwright install chromium` inside the project once (Remotion downloads its own headless shell on first render).",
);

if (project) {
  const pj = path.join(project, "package.json");
  add(fs.existsSync(pj), "Project", project, "Create it with scripts/new-project.mjs.");
  add(fs.existsSync(path.join(project, "node_modules")), "Dependencies installed", fs.existsSync(path.join(project, "node_modules")) ? "node_modules present" : "missing", `cd "${project}" && npm install`);
  const pw = path.join(project, "node_modules", "@playwright", "test");
  add(fs.existsSync(pw), "Playwright", fs.existsSync(pw) ? "installed" : "missing", "npm install inside the project");
  const rm = path.join(project, "node_modules", "remotion");
  add(fs.existsSync(rm), "Remotion", fs.existsSync(rm) ? "installed" : "missing", "npm install inside the project");
}

let bad = 0;
for (const r of rows) {
  console.log(`${r.ok ? "✓" : "✗"} ${r.name.padEnd(24)} ${r.detail}`);
  if (!r.ok) {
    bad++;
    console.log(`    fix: ${r.fix}`);
  } else if (r.note) console.log(`    note: ${r.note}`);
}
console.log(
  "\nFigma MCP is checked from inside Claude (call the Figma `whoami` tool); this script can't see MCP servers.",
);
process.exit(bad ? 1 : 0);

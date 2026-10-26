#!/usr/bin/env node
// End-to-end self-test: scaffolds the bundled sample flow into a temp folder,
// installs dependencies, and runs the full QA pipeline (validate → typecheck →
// build → Playwright → render → video checks). Use it once after installing the
// skill to prove the toolchain works on this machine before a real Figma file.
// Usage: node self-test.mjs [--keep] [--quick]
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const keep = process.argv.includes("--keep");
const quick = process.argv.includes("--quick");
const base = fs.mkdtempSync(path.join(os.tmpdir(), "flow-to-demo-selftest-"));
const dir = path.join(base, "sample-wallet");
const steps = [
  ["scaffold", `node "${path.join(here, "new-project.mjs")}" --slug sample-wallet --dir "${base}" --example`, here],
  ["install", "npm install --no-audit --no-fund", dir],
  ["validate", "npm run validate", dir],
  ["typecheck", "npm run typecheck", dir],
  ["playwright", "npx playwright test", dir],
  ["render", `npm run render --${quick ? " -- --quick" : ""}`, dir],
  ["video-qa", "npm run qa:video", dir],
];
const results = [];
for (const [name, cmd, cwd] of steps) {
  process.stdout.write(`• ${name} … `);
  const t = Date.now();
  try {
    execSync(cmd, { cwd, stdio: ["ignore", "pipe", "pipe"], env: process.env, maxBuffer: 1 << 26 });
    results.push([name, true]);
    console.log(`ok (${((Date.now() - t) / 1000).toFixed(0)}s)`);
  } catch (e) {
    results.push([name, false]);
    console.log("FAILED");
    const out = `${e.stdout ?? ""}\n${e.stderr ?? ""}`.trim().split("\n").slice(-25).join("\n");
    console.log(out);
    if (name === "playwright") console.log("\nHint: run `npx playwright install chromium` in the project, or set FLOW_BROWSER to a Chrome binary.");
    break;
  }
}
const ok = results.length === steps.length && results.every((r) => r[1]);
console.log(ok ? `\n✓ self-test passed — sample video: ${path.join(dir, "out", "walkthrough.mp4")}` : `\n✗ self-test failed at "${results.at(-1)[0]}" — project kept at ${dir}`);
if (ok && !keep) fs.rmSync(path.join(dir, "node_modules"), { recursive: true, force: true });
process.exit(ok ? 0 : 1);

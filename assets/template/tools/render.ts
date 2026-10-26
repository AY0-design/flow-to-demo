// Renders the walkthrough: out/walkthrough.mp4 (master), out/walkthrough-web.mp4
// (small, fast-start for portfolios), out/poster.png and out/timeline.json.
// Usage: npm run render [-- --quick] [-- --no-web] [-- --name demo]
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import { compileTimeline } from "../src/flow/engine";
import { flow, presentation as pres } from "../src/flow/load";
// @ts-expect-error plain JS helper
import { findChrome } from "./browser.mjs";

const args = process.argv.slice(2);
const quick = args.includes("--quick");
const noWeb = args.includes("--no-web");
const name = args.includes("--name") ? args[args.indexOf("--name") + 1] : "walkthrough";

const tl = compileTimeline(flow, pres);
fs.mkdirSync("out", { recursive: true });

const fps = pres.fps;
const frames = Math.ceil((tl.totalMs / 1000) * fps);
const scale = quick ? 1 : pres.scale;
const posterMs =
  typeof pres.poster.step === "number" && tl.steps[pres.poster.step]
    ? tl.steps[pres.poster.step].settledMs + 250
    : Math.min(tl.totalMs, pres.timing.leadInMs * 0.6);
const posterFrame = Math.min(frames - 1, Math.round((posterMs / 1000) * fps));

fs.writeFileSync(
  "out/timeline.json",
  JSON.stringify(
    {
      fps, frames, totalMs: tl.totalMs, posterFrame,
      steps: tl.steps.map((s) => ({
        index: s.index, do: s.step.do, target: "target" in s.step ? s.step.target : undefined,
        startFrame: Math.round((s.startMs / 1000) * fps), actionFrame: Math.round((s.actionMs / 1000) * fps),
        settledFrame: Math.round((s.settledMs / 1000) * fps), endFrame: Math.round((s.endMs / 1000) * fps),
        surfaceAfter: s.surfaceAfter,
      })),
      warnings: tl.warnings,
    },
    null,
    2,
  ),
);
if (tl.warnings.length) console.warn("Timeline warnings:\n  " + tl.warnings.join("\n  "));

const browser = findChrome({ headlessShell: true });
const common = ["src/video/index.ts", "--log=warn", ...(browser ? [`--browser-executable=${browser}`] : [])];
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

function run(cmd: string, a: string[]) {
  console.log(`$ ${cmd} ${a.join(" ")}`);
  const r = spawnSync(cmd, a, { stdio: "inherit" });
  if (r.status !== 0) {
    console.error(`\n✗ ${cmd} failed (exit ${r.status}). See the log above.`);
    process.exit(r.status ?? 1);
  }
}

const master = `out/${name}.mp4`;
run(npx, ["remotion", "render", ...common, "Walkthrough", master, `--scale=${scale}`, "--codec=h264", `--crf=${quick ? 22 : 14}`, "--pixel-format=yuv420p"]);
run(npx, ["remotion", "still", ...common, "Poster", "out/poster.png", `--scale=${scale}`, `--props=${JSON.stringify({ frame: posterFrame })}`]);

if (!noWeb) {
  const ff = (() => {
    try {
      execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
      return ["ffmpeg"];
    } catch {
      return [npx, "remotion", "ffmpeg"];
    }
  })();
  // web version: ≤1080px tall, H.264 + faststart so it begins playing immediately
  run(ff[0], [
    ...ff.slice(1), "-y", "-loglevel", "error", "-i", master,
    "-vf", "scale='if(gt(ih,1600),trunc(iw*1600/ih/2)*2,iw)':'if(gt(ih,1600),1600,ih)':flags=lanczos",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an",
    `out/${name}-web.mp4`,
  ]);
}

console.log(`\n✓ Rendered ${frames} frames @ ${fps}fps (${(tl.totalMs / 1000).toFixed(1)}s)`);
console.log(`  ${master}${noWeb ? "" : `\n  out/${name}-web.mp4`}\n  out/poster.png\n  out/timeline.json`);

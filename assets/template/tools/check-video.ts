// Video QA: checks dimensions/fps/duration, finds blank frames and long freezes,
// extracts key frames + a contact sheet to inspect, and compares each screen's
// first settled video frame with the prototype screenshot (parity check).
// Usage: npm run qa:video [-- --file out/walkthrough.mp4]
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import { flow, presentation as pres, stageSize } from "../src/flow/load";
// @ts-expect-error plain JS helper
import { compare, lumaStats, readPng } from "./png.mjs";

const args = process.argv.slice(2);
const file = args.includes("--file") ? args[args.indexOf("--file") + 1] : "out/walkthrough.mp4";
if (!fs.existsSync(file)) {
  console.error(`✗ ${file} not found — run \`npm run render\` first.`);
  process.exit(1);
}
const tl = JSON.parse(fs.readFileSync("out/timeline.json", "utf8"));
const ff = (() => {
  try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); return { ff: ["ffmpeg"], fp: ["ffprobe"] }; }
  catch { return { ff: ["npx", "remotion", "ffmpeg"], fp: ["npx", "remotion", "ffprobe"] }; }
})();
const sh = (c: string[], a: string[]) => {
  const r = spawnSync(c[0], [...c.slice(1), ...a], { encoding: "utf8", maxBuffer: 1 << 28 });
  return (r.stdout ?? "") + (r.stderr ?? "");
};

const issues: string[] = [];
const notes: string[] = [];

// 1. container facts
const probe = JSON.parse(sh(ff.fp, ["-v", "error", "-select_streams", "v:0", "-count_frames", "-show_entries", "stream=width,height,r_frame_rate,nb_read_frames,codec_name,pix_fmt", "-show_entries", "format=duration", "-of", "json", file]));
const st = probe.streams[0];
const [fn, fd] = String(st.r_frame_rate).split("/").map(Number);
const fps = fn / (fd || 1);
const stage = stageSize();
const expW = stage.width * pres.scale, expH = stage.height * pres.scale;
const facts = { width: st.width, height: st.height, fps, frames: Number(st.nb_read_frames), duration: Number(probe.format.duration), codec: st.codec_name, pixfmt: st.pix_fmt };
if (st.width !== expW || st.height !== expH)
  (st.width === stage.width && st.height === stage.height ? notes : issues).push(`dimensions ${st.width}x${st.height}, expected ${expW}x${expH}${st.width === stage.width ? " (rendered with --quick?)" : ""}`);
if (Math.abs(fps - pres.fps) > 0.01) issues.push(`fps ${fps}, expected ${pres.fps}`);
if (Math.abs(facts.frames - tl.frames) > 2) issues.push(`frame count ${facts.frames}, timeline expects ${tl.frames}`);
const vw = flow.meta.viewport.width, vh = flow.meta.viewport.height;
const aspectStage = stage.width / stage.height, aspectVideo = st.width / st.height;
if (Math.abs(aspectStage - aspectVideo) > 0.005) issues.push("aspect ratio differs from the stage");

// 2. blank frames + freezes (whole video)
const sig = sh(ff.ff, ["-hide_banner", "-i", file, "-vf", "signalstats,metadata=print:key=lavfi.signalstats.YMAX:key=lavfi.signalstats.YMIN", "-f", "null", "-"]);
const ymax = [...sig.matchAll(/YMAX=(\d+)/g)].map((m) => +m[1]);
const ymin = [...sig.matchAll(/YMIN=(\d+)/g)].map((m) => +m[1]);
const blank = ymax.map((mx, i) => mx - ymin[i]).map((r, i) => (r < 6 ? i : -1)).filter((i) => i >= 0);
if (blank.length) issues.push(`${blank.length} blank/uniform frame(s), first at frame ${blank[0]}`);
const maxHold = (pres.timing.holdAfterTransitionMs + pres.timing.outroMs + pres.timing.leadInMs) / 1000 / pres.speed + 1.5;
const fz = sh(ff.ff, ["-hide_banner", "-i", file, "-vf", `freezedetect=n=0.0005:d=${maxHold.toFixed(2)}`, "-f", "null", "-"]);
const freezes = [...fz.matchAll(/freeze_start: ([\d.]+)[\s\S]*?freeze_duration: ([\d.]+)/g)].map((m) => ({ start: +m[1], dur: +m[2] }));
for (const f of freezes) issues.push(`no motion for ${f.dur.toFixed(1)}s from ${f.start.toFixed(1)}s — check for a stuck step or missing scroll`);

// 3. key frames + contact sheet
fs.rmSync("qa/frames", { recursive: true, force: true });
fs.mkdirSync("qa/frames", { recursive: true });
type S = { index: number; do: string; target?: string; actionFrame: number; settledFrame: number; endFrame: number; surfaceAfter: string };
const picks: { name: string; frame: number }[] = [{ name: "00-start", frame: Math.round(tl.fps * 0.5) }];
for (const s of tl.steps as S[]) {
  const n = String(s.index + 1).padStart(2, "0");
  const mid = Math.round((s.actionFrame + s.settledFrame) / 2);
  if (s.settledFrame - s.actionFrame > 6) picks.push({ name: `${n}-mid-${s.do}`, frame: mid });
  picks.push({ name: `${n}-settled-${s.surfaceAfter}`, frame: Math.max(0, s.endFrame - 2) });
}
const sc = pres.scale;
const cropW = Math.round(vw * sc), cropH = Math.round(vh * sc);
const cx = Math.round((st.width - cropW) / 2), cy = Math.round((st.height - cropH) / 2);
for (const p of picks) {
  sh(ff.ff, ["-y", "-loglevel", "error", "-i", file, "-vf", `select=eq(n\\,${p.frame})`, "-vsync", "0", "-frames:v", "1", `qa/frames/${p.name}.png`]);
}
sh(ff.ff, ["-y", "-loglevel", "error", "-pattern_type", "glob", "-i", "qa/frames/*.png", "-vf", `scale=-2:360,tile=${Math.min(8, picks.length)}x${Math.ceil(picks.length / 8)}:padding=8:margin=8:color=white`, "-frames:v", "1", "qa/video-contact-sheet.png"]);

// 4. parity: video settled frame vs prototype screenshot, first visit of each surface
const parity: { surface: string; frame: number; mismatch: number | null }[] = [];
const seen = new Set<string>();
const firstVisits = [{ surface: flow.meta.start, frame: Math.round(tl.fps * 0.5) }, ...(tl.steps as S[]).map((s) => ({ surface: s.surfaceAfter, frame: Math.max(0, s.endFrame - 2) }))];
const screenKind = (id: string) => flow.screens.find((s) => s.id === id)?.kind ?? "screen";
for (const v of firstVisits) {
  if (seen.has(v.surface)) continue;
  seen.add(v.surface);
  const shot = `qa/screens/${v.surface}.png`;
  if (!fs.existsSync(shot) || sc !== 2) continue; // screenshots are 2x
  const out = `qa/frames/parity-${v.surface}.png`;
  sh(ff.ff, ["-y", "-loglevel", "error", "-i", file, "-vf", `select=eq(n\\,${v.frame}),crop=${cropW}:${cropH}:${cx + (pres.frame === "device" ? 14 * sc : 0)}:${cy + (pres.frame === "device" ? 14 * sc : 0)}`, "-vsync", "0", "-frames:v", "1", out]);
  if (!fs.existsSync(out)) continue;
  const { ratio } = compare(readPng(shot), readPng(out), `qa/frames/parity-diff-${v.surface}.png`, { ignoreCorners: pres.frame === "none" ? 0 : pres.cornerRadius * sc });
  parity.push({ surface: v.surface, frame: v.frame, mismatch: +ratio.toFixed(4) });
  // overlays and scrolled screens legitimately differ more; flag only clear divergence
  const limit = screenKind(v.surface) === "screen" ? 0.04 : 0.1;
  if (ratio > limit) issues.push(`video vs prototype differ by ${(ratio * 100).toFixed(1)}% on "${v.surface}" (frame ${v.frame}) — see qa/frames/parity-diff-${v.surface}.png`);
}

// frame brightness sanity for the extracted frames
for (const p of picks) {
  const f = `qa/frames/${p.name}.png`;
  if (!fs.existsSync(f)) { issues.push(`could not extract frame ${p.frame} (${p.name})`); continue; }
  const { std } = lumaStats(readPng(f));
  if (std < 2) issues.push(`frame ${p.frame} (${p.name}) looks blank`);
}

const report = { file, facts, expected: { width: expW, height: expH, fps: pres.fps, frames: tl.frames }, freezes, blankFrames: blank.length, parity, issues, notes };
fs.writeFileSync("qa/video-report.json", JSON.stringify(report, null, 2));
console.log(`${file}: ${facts.width}x${facts.height} @ ${fps}fps, ${facts.frames} frames, ${facts.duration.toFixed(2)}s, ${facts.codec}/${facts.pixfmt}`);
for (const p of parity) console.log(`  parity ${p.surface.padEnd(20)} ${((p.mismatch ?? 0) * 100).toFixed(1)}%`);
for (const n of notes) console.log(`· ${n}`);
if (issues.length) {
  for (const i of issues) console.log(`✗ ${i}`);
  console.log(`\nKey frames: qa/frames/  ·  contact sheet: qa/video-contact-sheet.png`);
  process.exit(1);
}
console.log(`✓ video checks passed — key frames in qa/frames/, contact sheet qa/video-contact-sheet.png`);

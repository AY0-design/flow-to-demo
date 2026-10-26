---
name: flow-to-demo
description: Turns a Figma link into a portfolio-ready product walkthrough video (Mobbin-style, rendered with Remotion) plus a genuinely interactive React prototype, after reconstructing and verifying the user journey with the designer. Use whenever someone runs /flow-to-demo, pastes a Figma URL and wants a demo video, flow video, walkthrough, screen recording, clickable or interactive prototype, case-study motion asset or "bring these screens to life" — even if they only say "make a video of this flow" or "turn my Figma screens into something people can click through".
---

# Flow to Demo

Figma link in → verified user journey → **interactive prototype** + **walkthrough video** out, both rendered by the *same* React screens so they always match.

The user is usually a product designer. Speak in design language (screens, flows, states, transitions), not build jargon, and keep them out of the terminal unless they ask.

## The pipeline at a glance

| # | Phase | You do | User does |
|---|-------|--------|-----------|
| 0 | Preflight | Check Figma MCP + Node; parse the link | – |
| 1 | Inspect | Read only the relevant frames; tokens, assets, screenshots | – |
| 2 | Discover | Rebuild the journey; tag every link confirmed / inferred / missing | – |
| 3 | Validate | Find gaps; separate critical from optional | – |
| 4 | **Flow Review** | Present it; ask grouped questions | **Approve or correct** ← hard stop |
| 5 | Prototype | Write flow.json, build screens in the template | – |
| 6 | Video | Render with Remotion from the same manifest | – |
| 7 | QA | Playwright journey, Figma diff, video checks; fix and re-run | – |
| 8 | Deliver | README, results, links | Review |

Read each reference file when you reach its phase — they hold the detail; this file is the map.

## Phase 0 — Preflight (always, before touching the design)

1. `node <skill>/scripts/parse-figma-url.mjs "<url>"` → fileKey, nodeId, link type. Board/Slides/Make links aren't design files: ask for the Design link. No `node-id` → list pages with `get_metadata` (no nodeId) and ask which page or section holds the flow.
2. Figma MCP: call `whoami`. If the Figma tools are missing or fail, stop and say so plainly — tell the user to connect the Figma connector (claude.ai → Settings → Connectors, or `claude mcp add` in Claude Code) and that the file must be viewable by their account. **Never describe screens you could not actually read.**
3. Then `create_session` with the fileKey (the Figma server requires it before file tools) and reuse the sessionId on every call.
4. Load the `/figma-design-to-code` skill (or the `skill://figma/figma-design-to-code/SKILL.md` MCP resource) before the first `get_design_context` call — the Figma server requires it.
5. `node <skill>/scripts/doctor.mjs` — Node ≥ 18 is the only hard requirement up front; everything else installs per project. Report anything missing with its fix.

`<skill>` = the directory containing this SKILL.md.

## Phases 1–3 — Inspect, discover, validate

Read `references/flow-discovery.md` now. Core rules:

- Start at the linked node and widen only as far as the journey needs (parent section → siblings). Don't crawl the whole file.
- Canvas position is **not** journey order. Order comes from prototype reactions, CTAs, labels, back affordances, form logic and state names.
- Tag every screen and transition **confirmed** (Figma says so: prototype reaction, explicit annotation), **inferred** (reasonable reading of UI/naming) or **missing**. Never upgrade an inference to confirmed.
- Ask only what the designs can't answer. Group questions, offer the likely options, recommend one.

## Phase 4 — Flow Review (hard stop)

Present the review in chat using the structure in `references/flow-discovery.md` (A Overview · B Ordered flow with a diagram · C Gaps & questions · D Interaction behaviour · E Walkthrough story). Also save it as `flow-review.md` in the project once the project exists.

**Do not build, scaffold screens or render anything until the user approves the flow or explicitly says to proceed with the stated assumptions.** Approval of a revised flow is still required after corrections. Record the approval in `flow.json` → `meta.approval` (`approved: true`, date, the assumptions they accepted). `npm run validate` refuses unapproved manifests, which protects this checkpoint.

If running unattended (no one to answer), do phases 0–4, write the review, and stop there.

## Phase 5 — Build the prototype

1. Create the project (never overwrites; exit code 3 means it exists — ask before reusing):
   `node <skill>/scripts/new-project.mjs --slug <slug> --name "<Flow name>" --platform <mobile|tablet|web> --width <w> --height <h> --figma-url "<url>" --install`
   Default location: `./flow-demos/<slug>` under the current directory (pass `--dir` to change).
2. Write `flow.json` from the approved review — schema and examples in `references/manifest.md`.
3. Implement each Figma frame as a component in `src/screens/`, registered in `src/screens/index.ts`. Follow `references/design-fidelity.md` (tokens, fonts, assets, exact measurements) and `references/prototype.md` (the `Tap`/`Field`/`Scroll` primitives that make one component work in both prototype and video).
4. `npm run validate && npm run typecheck && npm run dev` — open it, fix anything obviously off before moving on.

## Phase 6 — Render the video

Read `references/video.md`. The demo script in `flow.json` drives it; presentation options live in `presentation.json` (background, frame, speed, fps, loop, size, timing). `npm run render` writes `out/walkthrough.mp4`, `out/walkthrough-web.mp4`, `out/poster.png`. Use `npm run render -- --quick` for fast drafts while tuning timing.

## Phase 7 — QA (don't skip; don't fake)

Read `references/quality-assurance.md`. Run `npm test` (Playwright journey + every reachable interaction), `npm run qa:visual` (vs Figma screenshots), `npm run qa:video` (dimensions, blank frames, freezes, video↔prototype parity, contact sheet). **Look** at `qa/video-contact-sheet.png` and a few full frames yourself. Fix and re-run until clean or until what remains is a documented limitation. Only report checks that actually ran, with their real results.

## Phase 8 — Deliver

Fill the project `README.md` from `assets/README.template.md` (what it is, how to run, embed, re-render, QA results, assumptions, limitations). Then tell the user, briefly: where the project is, the three outputs (prototype, video, poster), QA summary, open assumptions, and the one-line commands to preview (`npm run dev`) and re-render (`npm run render`). If file-sending tools exist, send the MP4 and poster.

## Changing things later (no restart needed)

- Timing, speed, background, frame, fps, size, loop → edit `presentation.json`, `npm run render`.
- Story order, which screens appear, captions → edit `flow.json` → `demo.steps`, re-render.
- New/changed interactions → edit `flow.json` → `interactions` (+ the screen component if a new element), `npm test`, re-render.
- A design changed in Figma → re-inspect just those frames, update their components, re-run QA.

## Failure handling (say what happened, then the fix)

| Problem | Do |
|---|---|
| Figma tools missing / 403 / rate-limited | Stop design work; run `whoami`; explain access needed. Don't guess the design. |
| Node too large for `get_design_context` | Use `get_metadata` for structure, then fetch children individually. |
| Asset URLs fail | `node tools/fetch-assets.mjs` reports which; re-request (URLs expire), else use the exported frame crop and list it as a limitation. |
| Font not available | Google Font → link it in `index.html` + `src/video/fonts.ts`; licensed font → ask for the files (`public/fonts/` + `@font-face`), meanwhile use the closest metric-compatible fallback and say so. |
| `npm install` fails | Show the error line; common fixes: Node version, network/proxy, disk space. |
| Playwright can't launch | `npx playwright install chromium` (or set `FLOW_BROWSER` to a Chrome binary). |
| Remotion render fails | Read the first error, not the last; usual causes: font load timeout (fonts.ts), missing asset path, a component using `Date.now()`/`Math.random()`/CSS animation. Re-render with `--quick` while fixing. |

# Quality assurance (Phase 7)

Code that compiles proves nothing about whether the journey works or looks like the design. Run every check below, read the results, fix, re-run. Report only what actually ran — if a check couldn't run (no Figma screenshots, browser missing), say so and why.

## The checks

| Command | What it proves | Output |
|---|---|---|
| `npm run validate` | manifest is consistent and **approved**; every screen has a component | console |
| `npm run typecheck` | no TypeScript errors | console |
| `npm test` | Playwright: the demo journey completes by real clicks/typing with the right screen after every step; each reachable interaction leads where the manifest says; no page errors, console errors or failed requests (missing assets) | `qa/playwright-results.json`, `qa/screens/<id>.png` |
| `npm run qa:visual` | each screen vs its Figma screenshot (pixel diff, top viewport for tall frames) | `qa/visual-report.json`, `qa/diff/<id>.png` |
| `npm run render` | the video renders | `out/` |
| `npm run qa:video` | dimensions, fps, frame count, blank frames, long freezes, video↔prototype parity per screen, key frames + contact sheet | `qa/video-report.json`, `qa/frames/`, `qa/video-contact-sheet.png` |
| `npm run qa` | all of the above in order | – |

## Visual review — you must look

Numbers catch regressions; eyes catch wrongness. After the automated checks:

1. Open each `qa/diff/<id>.png` with a high mismatch, and compare `qa/screens/<id>.png` with `figma/screens/<id>.png` directly (Read both images). Check, in order of how much they're noticed: typography (family, weight, size, line height), colours, spacing and alignment, component sizes, icons/assets, clipping/overflow, screen dimensions.
2. Read `qa/video-contact-sheet.png`: correct order? every transition mid-frame looks like a real transition (not a blank or a jump)? text crisp? nothing clipped by the rounded corners?
3. Read 2–3 full-size frames from `qa/frames/` (a mid-transition, a typing frame, the final screen).

Interpreting `qa:visual` mismatch (2× screenshots): < 3% usually anti-aliasing/font hinting — fine; 3–8% look for a real difference (font fallback, spacing, missing asset); > 8% something is clearly off (wrong font, wrong layout, missing image, different content). Figma screenshots include fonts rendered by Figma, so tiny text differences are expected; layout and colour differences are not.

## Fix loop

1. Fix the cause (component styles, manifest, demo step, asset), not the test.
2. Re-run the failing check, then the full `npm run qa` before delivery.
3. Common failures:
   - *"should exist on X"* → element id mismatch between screen code and flow.json, or the element is inside a different surface.
   - *"should be enabled"* → the demo taps a button before its condition is met (type first, or fix the validation logic).
   - *surface mismatch* → interaction actions wrong (navigate vs open), or overlay kind wrong in `screens`.
   - *HTTP 404* → asset path; import assets from `src/assets` instead of URL strings.
   - *freeze detected* → a step whose effect isn't visible (tapping an element with no visible change) or a very long hold; shorten `holdAfter` or add the missing state change.
   - *parity mismatch* → a screen uses something non-deterministic (time, random, CSS animation) or state that only the prototype sets (local `useState`). Move it into flags/values.
   - *blank frames* → fonts or images not ready, or a screen throwing during render (check the render log).

## Record results honestly

Put a QA section in the README:

```markdown
## Quality checks (run <date>)
- Manifest: ✓ valid, approved (<n> screens, <c> confirmed / <i> inferred / <a> assumed interactions)
- Prototype journey (Playwright): ✓ <n>/<n> tests passed
- Visual match vs Figma: <n> screens ≤ 3% · <m> reviewed: <screen> 5.1% (font fallback: SF Pro → Inter)
- Video: ✓ 1068×1976 @ 60 fps, 21.4 s, no blank frames or freezes, parity ≤ 2.6%
- Not checked: <anything that couldn't run, and why>
```

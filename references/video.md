# Walkthrough video (Phase 6)

Target feel: a Mobbin flow recording — calm, real, nothing decorative. Someone is clearly *using* the product: they read, tap, type, scroll, wait for a spinner, see the result. No zooms, no spins, no title cards unless asked.

## How it works

`src/video/Walkthrough.tsx` renders the same `ScreenStack` and screen components as the prototype, inside a `PlaybackProvider`. For each frame it computes `stateAt(time)` from the timeline compiled out of `flow.json → demo.steps` and `presentation.json`. Rendering is therefore deterministic: the same inputs always produce the same frames, and any frame can be rendered alone (that's how the poster works).

Every tap in the video goes through the same manifest interaction the prototype uses, so the two cannot drift apart: if the video shows it, a user can do it.

## Writing the demo script (the story)

Think like an editor cutting a 15–40 s product clip:
- Open on the first screen long enough to read it (`leadInMs`, default 1.2 s).
- Show the core task end to end. Skip repetitive steps (a 4-digit PIN typed twice → type it once, or use a `holdAfter` to suggest progress).
- Type realistic values from the Figma copy; use the same values the next screens display.
- Scroll only where the content below matters, then (optionally) return to top before navigating.
- End on the outcome (success screen, dashboard, confirmation) and hold it (`outroMs`).
- Branches/error states: include only if they're the point of the story or the user asks.

The defaults produce natural pacing; adjust per step with `holdAfter` (ms), `charMs` (typing speed), `ms` (scroll duration).

## presentation.json

| Key | Default | Meaning |
|---|---|---|
| `background` | `#EDEEF1` | stage colour around the UI (use the portfolio page colour for a "transparent-looking" result) |
| `frame` | `rounded` | `rounded` = Mobbin-style screen card with shadow · `device` = generic dark bezel · `none` = raw UI at exact size |
| `cornerRadius` / `padding` / `shadow` | 44 / 72 / true | card radius, stage padding (each side), drop shadow |
| `fps` | 60 | output frame rate |
| `scale` | 2 | render multiplier — 2 gives retina-crisp text (390×844 UI → 1068×1976 video with padding) |
| `speed` | 1 | global pace (0.85 slower, 1.2 faster) — scales every duration |
| `loop` | false | adds a short cross-fade back to the first screen so the clip loops seamlessly |
| `cursor` | `auto` | `auto` = none on mobile/tablet, pointer on web · `touch` = subtle touch dot · `pointer` · `none` |
| `output.width/height` | null | force a canvas size (e.g. 1920×1080 for a web flow on a 16:9 stage); UI stays at its own size, centred |
| `timing.*` | see file | lead-in, hold after transitions, press, typing, scroll, outro (ms) |
| `transitions.*` | push 460, fade 320, rise 480, overlay 380 | durations (ms); curves are iOS-like and shared with the prototype |
| `poster.step` | `auto` | `auto` = first screen; a step index = that step's settled frame |

The video always preserves the design's aspect ratio: the UI is drawn at its Figma size × `scale`; only the stage around it changes.

## Rendering

```bash
npm run render               # out/walkthrough.mp4 (master, CRF 14), out/walkthrough-web.mp4, out/poster.png, out/timeline.json
npm run render -- --quick    # 1× scale, faster — for checking timing
npm run render -- --no-web   # skip the web transcode
npm run studio               # Remotion Studio: scrub the timeline in a browser
```

- The web version is H.264 with `+faststart`, ≤ 1600 px tall, CRF 24 — small enough for portfolio sites; use it with `<video autoplay muted loop playsinline poster="poster.png">`.
- Rendering a 20 s, 60 fps, 2× clip takes a few minutes on a laptop; `--quick` is ~4× faster.
- Remotion downloads its headless browser on the first render (needs internet once). `tools/browser.mjs` reuses a Playwright Chromium if one is cached, or `FLOW_BROWSER=/path/to/chrome`.

## Platform conventions (defaults the engine applies)

- **Mobile/tablet:** horizontal push for forward/back, sheets rise from the bottom, no cursor; press = slight scale-down.
- **Web:** cross-fade between pages (or `none` for in-place state changes), a small pointer glides onto each target and clicks.
- Full-screen modals on mobile: `"transition":"rise"`.
- Override per interaction in `flow.json` when the design implies otherwise (e.g. Figma reaction says "dissolve" → `fade`, "move in from bottom" → `rise`, "instant" → `none`).

## Things that break determinism (avoid in screens)

CSS `animation`/`transition`, `setTimeout`/`setInterval`, `Date.now()`/`new Date()`, `Math.random()`, video/GIF elements, fonts not listed in `src/video/fonts.ts`, images loaded from expiring URLs. The playback CSS already disables CSS transitions; derive loops from `--flow-t`.

## When the video and prototype can't match exactly

Document it in the README. Known equivalences built in: the video's text field is a styled replica with a drawn caret (no blinking); press feedback is a scale/opacity pulse rather than the browser's active state; scrolling is eased rather than momentum-based.

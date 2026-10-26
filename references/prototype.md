# Interactive prototype (Phase 5)

The project template (copied by `scripts/new-project.mjs`) already contains the whole runtime. Your job per project is: write `flow.json`, write one component per Figma frame, register them. Do not rebuild navigation, transitions or the video player — reuse the runtime so prototype and video stay identical.

## How the template fits together

```
flow.json            approved manifest (source of truth)
presentation.json    video/prototype presentation options
src/flow/engine.ts   pure engine: actions → timed ops; demo → timeline; stateAt(time)
src/runtime/         FlowProvider (prototype), PlaybackProvider (video), ScreenStack,
                     transitions, primitives: Tap, Field, Scroll, Spinner
src/screens/         ← your screen components + index.ts registry
src/present/Stage.tsx  device/rounded frame + background (shared)
src/prototype/       Vite app shell (fit-to-window, ?embed, restart)
src/video/           Remotion composition (frame → state → same screens)
tests/flow.spec.ts   generic Playwright journey tests (driven by flow.json)
tools/               validate, render, visual diff, video QA, asset fetch
```

One UI state object (`UiState`: stack, nav transition, overlays, values, flags, scroll, pressed, loading, toast) feeds the screens. In the prototype it changes because the user clicks; in the video it's computed from the frame number. Screens never know which mode they're in unless they ask (`useFlow().mode`).

## Writing a screen

```tsx
import { Field, Scroll, Tap } from "../runtime/primitives";
import { useFlag, useLoading, useValue } from "../runtime/FlowContext";

export function Otp() {
  const code = useValue("otp");            // text typed into <Field id="otp">
  const loading = useLoading();            // true during a {"type":"loading"} action
  const [method] = useFlag("method", "sms");
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--screen-bg)" }}>
      <StatusBar />
      <Tap id="back" label="Back" press="opacity"><ChevronLeft /></Tap>
      <Scroll style={{ flex: 1 }}>…content…</Scroll>
      <Tap id="verify" disabled={code.length < 6 || loading} style={…}>Verify</Tap>
    </div>
  );
}
```

Register it: `screens = { otp: Otp, … }` in `src/screens/index.ts` (keys = flow.json screen ids, overlays included).

### Primitives

- **`<Tap id>`** — every clickable thing. `id` = the interaction's `element`. Renders a div with button semantics so layout is identical in prototype and video. Props: `disabled` (looks + behaves disabled; tests refuse to click it), `press` (`scale` default, `opacity` for rows/icons, `none`), `label` (aria-label for icon buttons), `onTap` (extra local effect, e.g. toggling a checkbox flag via `useFlag` setter — keep manifest actions for navigation).
- **`<Field id>`** — text input bound to `values[id]`. Real `<input>` in the prototype, a static replica with a drawn caret in the video (so typing is frame-exact). Pass the same `className`/`style` the Figma input has, plus `placeholderColor` and `caretColor`. For OTP boxes / PIN dots, put a visually hidden `Field` (or a normal one styled transparent over the boxes) and render the boxes from `useValue`.
- **`<Scroll>`** — the scrollable part of a screen. Native scroll in the prototype; driven by `scroll` demo steps in the video. One per screen is typical; give extra ones an `id` (horizontal carousels: `horizontal`).
- **`<Spinner>`** — loading indicator that is deterministic in the video. For any other looping animation in the video, derive it from the CSS variable `--flow-t` (ms) set on the screen root, not from CSS keyframes, timers or `Date.now()`.

### Overlays
Overlays are ordinary components whose root is the panel itself (the sheet card, the dialog box). The runtime adds the scrim, positioning and enter/exit motion based on `kind` (`sheet` bottom, `modal` centred, `drawer` left, `dropdown` full-surface fade — position dropdown content yourself). Tapping the scrim closes the overlay unless you wire an interaction for element `"scrim"`.

### Tabs and in-page state
Tabs, segmented controls, toggles, selected rows → flags. Either wire `{"type":"set"}` actions in the manifest (preferred: the video can show them) or use `onTap` with the `useFlag` setter for purely local toggles.

### Persistent chrome
A tab bar shared by several screens: build it once, render it inside each screen that shows it, and wire its interactions with `"screen": "*"`. Switching tabs = `navigate` with `"transition":"none"` (or `reset` if tabs shouldn't stack).

### Mock data and backend behaviour
Put sample data in `src/screens/data.ts`, using the exact content from Figma. Simulated async: `loading` action with a realistic duration (600–1200 ms). Validation: compute it in the screen from values (e.g. enable Continue at 10 digits) — and if Figma shows an error state, show it when invalid input is submitted. Never fake success for something the design shows can fail without the user agreeing.

## Rules that keep prototype and video identical

- No `Math.random()`, `Date.now()`, `new Date()` (use fixed sample dates), `setTimeout`/`setInterval` for visuals, or CSS animations/transitions in screens. Motion comes from the runtime (transitions, overlays, press, scroll) or from state.
- Motion's `whileTap`/`whileHover` are fine for prototype-only flourishes (the video shows press feedback its own way), but nothing that changes layout.
- Every element a demo step touches must exist on the active surface at that moment.

## Presentation and embedding

- `npm run dev` → local prototype; `npm run build` → `dist/` static site (relative paths, works in any subfolder).
- URL options: `?embed=1` (no toolbar, transparent background, fills the frame), `&frame=none|rounded|device`, `&bg=%23ffffff`.
- Portfolio embed (host `dist/` anywhere — Netlify, Vercel, GitHub Pages, Framer/Webflow embed):
  ```html
  <iframe src="https://your-host/flow-demo/?embed=1" style="width:100%;aspect-ratio:390/844;border:0;border-radius:24px" loading="lazy" title="Interactive prototype"></iframe>
  ```
  Use the flow's real aspect ratio (viewport, plus padding if not `embed`).
- Mobile flows render at true size inside the rounded frame (scaled down to fit small windows); web flows render at their Figma width scaled to fit.

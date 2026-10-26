# flow.json — the approved flow manifest

`flow.json` (project root) is the single source of truth. The prototype reads it to decide what each tap does; the video compiles `demo.steps` into a frame-exact timeline; the Playwright tests replay it. Change behaviour here, not in screen code. Types: `src/flow/types.ts`. Validate: `npm run validate` (or `node tools/validate-flow.mjs flow.json --draft` before approval).

## Shape

```jsonc
{
  "version": 1,
  "meta": {
    "name": "Wallet onboarding", "slug": "wallet-onboarding",
    "figma": { "url": "…", "fileKey": "…", "nodeId": "12:345" },
    "platform": "mobile",                       // mobile | tablet | web — drives defaults (push vs fade, cursor)
    "viewport": { "width": 390, "height": 844 },// exact Figma frame size
    "start": "welcome",
    "approval": { "approved": true, "at": "2026-10-26", "assumptions": ["Success shown as toast — no success screen in file"] }
  },
  "screens": [
    { "id": "welcome", "name": "Welcome", "figmaNodeId": "12:346", "kind": "screen", "status": "confirmed" },
    { "id": "country-sheet", "name": "Country picker", "figmaNodeId": "12:400", "kind": "sheet", "status": "inferred", "notes": "opened from the +234 chip" }
  ],
  "interactions": [
    {
      "id": "welcome.get-started", "screen": "welcome", "element": "get-started",
      "actions": [{ "type": "navigate", "to": "phone", "transition": "push" }],
      "status": "confirmed", "source": "figma prototype reaction"
    }
  ],
  "initialState": { "values": {}, "flags": { "tab": "home" } },
  "branches": [{ "id": "otp-error", "from": "otp", "description": "Wrong code", "paths": [["otp", "otp-error"]], "inDemo": [] }],
  "gaps": [{ "id": "no-success", "severity": "optional", "description": "No success screen", "resolution": "toast (approved)" }],
  "demo": { "steps": [ { "do": "tap", "target": "get-started" } ] }
}
```

### Screens
- `id`: kebab-case, stable; used as `data-screen` and in the registry.
- `kind`: `screen` (full page, navigated to) or an overlay: `modal`, `sheet`, `drawer`, `dropdown` (opened on top).
- `status`: confirmed / inferred / assumed. Keep `figmaNodeId` for traceability.
- Visual **states** of one frame (filled, error, loading) are usually *not* separate screens — they're the same component reading `values`/`flags`/`loading`. Make a separate screen only when Figma treats it as a distinct page.

### Interactions
`screen` + `element` identify the control (`<Tap id="element">` inside that screen). Use `"screen": "*"` for persistent chrome (tab bar) available everywhere. Actions run in order:

| Action | Effect |
|---|---|
| `{"type":"navigate","to":"otp","transition":"push"}` | push a screen (`push` / `fade` / `rise` / `none`; default push on mobile, fade on web) |
| `{"type":"back"}` | pop to previous screen with the reverse transition |
| `{"type":"reset","to":"home"}` | replace the whole stack (end of onboarding, logout) |
| `{"type":"open","overlay":"country-sheet"}` | open an overlay |
| `{"type":"close"}` / `{"type":"close","overlay":"x"}` | close top / named overlay |
| `{"type":"set","key":"tab","value":"cards"}` | set a flag: tabs, toggles, selected item |
| `{"type":"loading","ms":900}` | simulate async work (`useLoading()` is true meanwhile) |
| `{"type":"toast","text":"Saved"}` | show a toast (non-blocking) |
| `{"type":"wait","ms":300}` | pause |

Typical combos: submit = `[loading, navigate]`; select-and-dismiss = `[set, close]`; success = `[loading, reset, toast]`.

`source` explains the evidence for anything not confirmed — it ends up in the README.

### Demo steps (the video script)

| Step | Notes |
|---|---|
| `{"do":"tap","target":"continue"}` | runs that element's interaction on the active surface; press feedback (+ cursor on web) |
| `{"do":"type","target":"phone","text":"803 555 0142"}` | types into `<Field id="phone">` char by char (`charMs` optional) |
| `{"do":"scroll","to":"end"}` | scroll the active surface's `<Scroll>`; `to`: px, `"end"`, `"top"`; `ms`, `screen` optional |
| `{"do":"set","key":"tab","value":"cards"}` | silent state change (e.g. pre-select) |
| `{"do":"action","actions":[…]}` | run actions without a tap (auto-advance after OTP, timed redirect) |
| `{"do":"wait","ms":800}` | extra pause |

All steps accept `holdAfter` (ms to linger afterwards) and `caption` (documentation). Defaults give the viewer ~1.3 s on each new screen. The demo is a *story*, not a tour: include what communicates the journey, skip repetitive screens, and end on the outcome.

Tests replay `demo.steps` against the real prototype, so a step that's impossible for a user (tapping a disabled button, typing into a field on another screen) fails `npm test` — that's intended.

# Flow discovery, validation and the Flow Review (Phases 1–4)

Goal: understand the journey the way a senior product designer would on day one with an unfamiliar product — then prove it to the user before anything is built. Getting this right matters more than any later phase: a beautiful video of the wrong journey is worthless, and fixing the flow after building costs far more than asking now.

## Contents
1. Inspect the design (efficiently)
2. Find prototype connections
3. Reconstruct the journey
4. Evidence levels
5. Gap analysis
6. Asking questions
7. The Flow Review format

---

## 1. Inspect the design

Work outward from the link, stopping as soon as the journey is clear.

1. **Structure first, cheaply.** `get_metadata(fileKey, nodeId)` returns XML with ids, names, types, positions and sizes. If the node is a single frame, call `get_metadata` on its parent (section/page) to see siblings — related screens usually live next to it. Avoid fetching unrelated sections of a large file.
2. **Classify frames** from the metadata:
   - Viewport class from width: ≤ 480 mobile, 481–1024 tablet, > 1024 web/desktop. Same screen at several widths = responsive variants; pick the one the user linked (or ask which).
   - Overlays: names or shapes suggesting modal / sheet / dialog / drawer / dropdown / toast, or frames much shorter than the viewport anchored to the bottom.
   - States: names with loading, empty, error, success, filled, focused, disabled, selected, step 2/3, v2 etc.
   - Noise: "old", "archive", "WIP", "copy", components pages, specs/redlines, sticky notes — exclude unless the user says otherwise.
3. **Look at the screens.** `get_screenshot` for each candidate frame (default size is fine for analysis). Reading the actual UI — buttons, labels, back arrows, step indicators — is where most of the journey evidence comes from.
4. **Design context** (`get_design_context`) is heavier: save it for Phase 5 when you implement a screen, unless you need it to resolve a question now (e.g. hidden layers, component variant names).
5. **Tokens**: `get_variable_defs` on one representative frame gives colour/type/spacing variables for the whole flow.

Keep a working table as you go: frame id, name, size, class (screen / overlay / state / noise), what's on it, candidate outgoing actions.

## 2. Find prototype connections

Figma prototype reactions are the only source of **confirmed** navigation, so check for them:

- A `/proto/` link, or a design link with `starting-point-node-id`, means prototype flows exist.
- Load the `/figma-use` skill (mandatory before `use_figma`) and run a **read-only** script that walks the section and returns each node's `reactions` (trigger type, action type, `destinationId`, navigation, transition type/duration) plus the page's `flowStartingPoints`. Map destinations back to your frame table. Never modify the file.
- `get_motion_context` on a frame can reveal smart-animate / keyframe intent useful for transitions.
- If `use_figma` isn't available or the file has no reactions, say so in the review ("No prototype connections in the file — navigation is inferred from the UI") rather than implying you checked something you couldn't.

## 3. Reconstruct the journey

Build a graph, then pick the path to demonstrate.

For each screen, list its interactive elements and where each one goes. Evidence to use, strongest first:
1. Prototype reaction → confirmed.
2. Explicit annotations/sticky notes on the canvas ("tap → OTP"), numbered frame names ("03 – OTP") → confirmed if unambiguous.
3. CTA semantics: "Continue" after a form → next step of the same task; "Verify" → verification result; "Done"/"Back to home" → exit.
4. Step indicators, progress bars, matching headers ("Step 2 of 4").
5. Content continuity: the phone number typed on screen A appears on screen B; selected item on a list appears on the detail screen.
6. Back affordances (chevrons, close ×) → returns to the previous screen / dismisses the overlay.
7. Platform convention: tab bars switch sections, a sheet's drag handle dismisses it, bottom-sheet scrim taps close.

Canvas arrangement (left-to-right rows) is a hint at most — designers rearrange, duplicate and park frames. Never use it as evidence on its own, and say so when it's the only signal.

Branching: record alternate paths (error vs success, new vs returning user) as branches. The demo usually follows the happy path; the prototype should include branches that have designs.

For every transition capture: source, user intent, element, destination/result, transition type, evidence level, and *why* (the source of evidence) — these map 1:1 to `flow.json` interactions.

## 4. Evidence levels

| Level | Meaning | Example |
|---|---|---|
| **Confirmed** | Figma states it directly | Prototype reaction from "Continue" to "OTP" |
| **Inferred** | Reasonable reading of the UI | "Verify" on OTP leads to "Create PIN" — next in step indicator |
| **Missing** | Needed but not in the file | No success screen after "Send money" |

`flow.json` uses `confirmed` / `inferred` / `assumed` — "assumed" is a missing piece the user approved filling (e.g. a toast instead of a success screen). Keep the label honest all the way through to the README.

## 5. Gap analysis

Walk the path as a user. At each step ask: what do I see, what do I do, what happens, how do I get back?

Check for:
- Missing screens between steps (a jump that skips verification, loading, confirmation)
- Buttons with no known destination; dead ends
- Undefined back/close behaviour; overlays with no dismiss
- Missing success / error / empty / loading states the journey implies
- Unclear validation (when is "Continue" enabled? what does an error look like?)
- Ambiguous order (two screens that could each come first)
- Screens that don't seem to belong
- Things that need a backend (OTP, payments, search results) → will be mocked; say what the mock does

Severity:
- **Critical** — you can't build a correct journey without an answer (unknown order, missing core screen, unclear purpose). Must be resolved before building.
- **Optional** — a sensible default exists (button disabled until valid; loading spinner for 900 ms; toast for success). Propose the default; the user can accept all defaults at once.

Don't invent major screens, business rules or features. Small connective behaviour (a spinner, a disabled state, a scrim tap to close) can be proposed as defaults, clearly labelled.

## 6. Asking questions

- One grouped message, numbered, critical first.
- Each question offers the likely options and your recommendation, so the user can answer "1a, 2 yes, 3 as you suggest".
- Don't ask what the designs answer. Don't ask about implementation (framework, file layout) — decide that yourself.
- If the user says "proceed with your assumptions", record each assumption in `meta.approval.assumptions`.

## 7. The Flow Review format

Use this structure (in chat, and saved as `flow-review.md`):

```markdown
# Flow Review — <Flow name>
Figma: <link> · <n> screens analysed · platform: <mobile 390×844 | web 1440×900 …>
Prototype connections in file: <yes, n reactions | none found | couldn't check (why)>

## A. Flow overview
<2–3 sentences: who the user is, what they accomplish, where they end.>

## B. Ordered screen flow
<mermaid flowchart: nodes = screens, edges labelled with the action; dashed edges for inferred, red/“?” for missing>

| # | From | User action (element) | Result | Transition | Evidence |
|---|------|-----------------------|--------|------------|----------|
| 1 | Welcome | Tap "Get started" | Phone number | push | Confirmed — prototype reaction |
| 2 | Phone number | Type number → tap "Continue" | OTP | push (after 0.9 s loading) | Inferred — CTA + step indicator |

Branches: <list, and whether each appears in the demo>
Excluded frames: <names + why (archive, duplicate, other flow)>

## C. Missing or uncertain
**Critical (need your answer)**
1. <question> — options: a) … b) … — I recommend <x> because …
**Optional (I'll use these defaults unless you object)**
- <gap> → <default>

## D. Proposed interaction behaviour
Navigation & back · forms & validation · scrolling · overlays · loading/mocked responses · micro-interactions — bullet points, concrete.

## E. Recommended walkthrough story
<~15–40 s; the steps the video will show, in order, with what's typed/selected, where it scrolls, which screens are skipped and why. Ends on a satisfying “outcome” screen.>

---
Reply **approve** to build, or tell me what to change.
```

Mermaid tip: `flowchart LR` for ≤ 6 screens, `TD` beyond; quote labels with spaces.

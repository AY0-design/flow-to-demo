# Design fidelity — Figma to code (Phase 5)

The work is a portfolio piece *about the design*. Every px of drift reads as sloppiness on the designer's behalf, so the default is "match Figma", never "improve it". If something in the design looks wrong, implement it as designed and mention it.

## Workflow per screen

1. `get_design_context(fileKey, nodeId)` (after loading `/figma-design-to-code`). Treat the returned code as a **reference** — translate it into this project's conventions: plain React + inline styles or CSS classes, tokens from `src/tokens.css`, and the runtime primitives (`Tap`, `Field`, `Scroll`) for anything interactive. Don't paste Tailwind classes; the template has no Tailwind.
2. If the node is too big, use `get_metadata` for the tree and request children (header, list, footer) separately.
3. Save a reference screenshot for QA at 2× the viewport so it lines up with Playwright's 2× captures:
   `get_screenshot(fileKey, nodeId, maxDimension = 2 × max(width, height))` → download the returned URL to `figma/screens/<screen-id>.png` (e.g. `curl -sSL "<url>" -o figma/screens/otp.png`). Do this for every screen and overlay in the flow. For overlays, screenshot the frame that shows the overlay over its screen if one exists.
4. Build the component, then compare with the screenshot (`npm test` then `npm run qa:visual`, or just look at both side by side).

## Tokens

- `get_variable_defs` → put colours, radii, spacing, type styles into `src/tokens.css` as CSS variables, keeping names traceable to Figma (`--color-primary-500` for `color/primary/500`).
- Use tokens wherever Figma used a variable; hard-code only what Figma hard-coded.

## Typography

- Match family, weight, size, line height, letter-spacing exactly (Figma letter-spacing % → `em`: 2% = 0.02em; px stays px).
- Google Fonts: add the `<link>` to `index.html` **and** the CSS URL to `src/video/fonts.ts` (the video waits for fonts before rendering any frame). Use `display=block` for the video URL.
- Licensed/custom fonts: ask for the files → `public/fonts/` + `@font-face` in `tokens.css`. Until then use the closest metric-compatible fallback (SF Pro → Inter/system-ui, Circular → DM Sans, …) and list it under limitations.
- iOS system font mockups: `-apple-system, "SF Pro Text", Inter, system-ui` renders well on most machines; the video is rendered in Chromium on the user's machine, so it uses whatever the OS has — prefer Inter for consistency if SF isn't installed.

## Assets

- Icons and logos: prefer the SVGs from `get_design_context`/`download_assets` (`svgAssets`). Images (photos, illustrations): `rawImages`.
- Figma asset URLs expire within minutes — download immediately: write a map `{ "logo.svg": url, … }` and run `node tools/fetch-assets.mjs map.json`. Files land in `src/assets/`; successes/failures are recorded in `src/assets/manifest.json`.
- **Import** assets in components (`import logo from "../assets/logo.svg"; <img src={logo} />`). Imports work identically in Vite (prototype) and Remotion (video) and survive the relative-path build; `public/` paths do not resolve the same way in both, so don't use them for design assets.
- If an asset can't be fetched, crop it from a high-res `download_assets` export of the frame rather than redrawing it, and note it.
- Don't substitute stock icons for designed ones.

## Layout

- Viewport = exact Figma frame size (`meta.viewport`). Every screen fills it (`height: 100%`).
- Auto-layout → flexbox with the same gaps/padding; fixed elements (status bar, tab bar, sticky CTA) stay outside `<Scroll>`.
- Status bars and home indicators in the mock are part of the design — reproduce them as drawn (they appear in the video).
- Scrollable screens: a Figma frame taller than the viewport means the content scrolls. Put the scrolling part inside `<Scroll>`; keep the fixed header/footer outside.
- Components repeated across screens (buttons, inputs, list rows, nav bars) → one shared component in `src/screens/ui/` with variants matching Figma's variant names.
- Text content: use the copy from Figma verbatim, including sample names and numbers — they're part of the design.

## States

Implement the states Figma shows (empty/filled/error/disabled/loading/selected) by reading `useValue`, `useFlag`, `useLoading` — not as separate pages — unless Figma treats them as separate screens. A disabled button must look disabled and not respond.

## Responsive

Build for the linked viewport. If the user wants several breakpoints, make one project per viewport (the video needs one fixed size anyway) unless they ask otherwise.

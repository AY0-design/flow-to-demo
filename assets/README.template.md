# {{Flow name}} — interactive prototype & walkthrough

Generated with the Flow to Demo skill from [Figma]({{figma url}}) on {{date}}.

| Deliverable | Where |
|---|---|
| Walkthrough video (master) | `out/walkthrough.mp4` — {{W}}×{{H}}, {{fps}} fps, {{seconds}} s |
| Walkthrough video (web) | `out/walkthrough-web.mp4` |
| Poster image | `out/poster.png` |
| Interactive prototype | `npm run dev` (local) · `npm run build` → `dist/` (static, embeddable) |
| Flow documentation | `flow-review.md` (human) · `flow.json` (machine, source of truth) |

## The journey
{{1–2 sentences + the ordered flow, e.g. Welcome → Phone → OTP → Create PIN → Home}}

## Run the prototype
```bash
npm install        # first time only
npm run dev        # http://localhost:5173
```

## Embed it in a portfolio
Build once with `npm run build`, upload the `dist/` folder to any static host (Netlify drop, Vercel, GitHub Pages), then:
```html
<iframe src="https://YOUR-HOST/PATH/?embed=1" style="width:100%;max-width:{{viewport width}}px;aspect-ratio:{{viewport width}}/{{viewport height}};border:0;border-radius:{{radius}}px" loading="lazy" title="{{Flow name}} prototype"></iframe>
```
Options: `&frame=device` (phone bezel), `&frame=none`, `&bg=%23ffffff`.

For the video:
```html
<video src="walkthrough-web.mp4" poster="poster.png" autoplay muted loop playsinline style="width:100%;border-radius:16px"></video>
```

## Change and re-render
- Look & pacing (background, frame, speed, fps, loop, size, timing): edit `presentation.json`, then `npm run render`.
- Story (which steps the video shows): edit `demo.steps` in `flow.json`, then `npm run render`.
- Preview the video timeline interactively: `npm run studio`.
- Full quality pass: `npm run qa`.

## Quality checks (run {{date}})
{{results — see references/quality-assurance.md for the format; only checks that ran}}

## Assumptions (approved)
{{from meta.approval.assumptions + inferred interactions with their sources}}

## Limitations
{{fonts substituted, assets recreated, mocked backend behaviour, any prototype/video differences}}

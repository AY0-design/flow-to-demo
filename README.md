# flow-to-demo

A Claude skill that turns a Figma link into two things built from the same React screens:

- an **interactive prototype** you can click through
- a **walkthrough video** (MP4 + poster), rendered with [Remotion](https://www.remotion.dev/)

Because both outputs render the same components, the video always matches the prototype.

## How it works

1. **Preflight**: checks the Figma MCP connection and Node, and parses the link.
2. **Inspect and discover**: reads only the relevant frames and rebuilds the user journey. Each step is tagged *confirmed*, *inferred* or *missing*.
3. **Flow review**: presents the flow and its gaps, then waits for your approval before building anything.
4. **Prototype**: scaffolds a Vite + React project and implements each frame as a screen.
5. **Video**: renders the walkthrough from the same `flow.json`.
6. **QA**: runs a Playwright journey test, a visual diff against Figma, and video checks.
7. **Deliver**: fills in a project README with run, embed and re-render instructions.

## Requirements

- Claude with this skill installed
- The Figma connector, with a file your account can view
- Node 18 or newer

Everything else installs per project.

## Usage

Run `/flow-to-demo` with a Figma Design link, or just ask for a demo video or clickable prototype of a flow:

```
/flow-to-demo https://www.figma.com/design/<fileKey>/<name>?node-id=<id>
```

The generated project lands in `./flow-demos/<slug>`:

```bash
npm run dev       # preview the prototype
npm test          # Playwright journey tests
npm run render    # writes out/walkthrough.mp4, walkthrough-web.mp4, poster.png
```

Timing, background, frame, fps and size live in `presentation.json`. The story order and captions live in `flow.json`. Edit either and re-render, with no restart.

## Layout

| Path | Contents |
|------|----------|
| `SKILL.md` | The skill: pipeline and rules |
| `references/` | Detail for each phase (discovery, manifest, fidelity, prototype, video, QA) |
| `scripts/` | Project scaffolding, Figma URL parser, environment doctor |
| `assets/template/` | The project template (runtime, video, tests, QA tools) |
| `assets/example/` | A small worked example |

## Installing the skill

Copy this folder into your Claude skills directory as `flow-to-demo`, or upload it as a skill in Claude settings.

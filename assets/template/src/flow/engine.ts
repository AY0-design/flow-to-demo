// Pure flow engine shared by the prototype (real time, user driven), the video
// (frame driven, deterministic) and the Playwright tests (expected screens).
// Nothing in here touches the DOM or React.

import type { Action, DemoStep, FlowManifest, Interaction, Presentation, TransitionKind } from "./types";

export type ScrollPos = number | "end" | "top";

export interface UiState {
  stack: string[]; // navigation stack of screen ids; last = visible
  nav?: { from: string; to: string; kind: TransitionKind; dir: 1 | -1; p: number }; // p: linear 0..1
  overlays: { id: string; p: number }[]; // p: 0 hidden .. 1 fully open
  values: Record<string, string>; // text field values keyed by field id
  flags: Record<string, string | boolean | number>; // tabs, toggles, selections
  scroll: Record<string, { from: ScrollPos; to: ScrollPos; p: number }>; // playback-controlled scroll
  pressed?: string; // element id currently showing press feedback
  pressP?: number; // 0..1..0 press curve
  focus?: string; // focused field id
  loading: Record<string, boolean>;
  toast?: { text: string; p: number };
  pointer?: { target: string; p: number }; // cursor/touch approach progress (video only)
}

export interface Op {
  start: number; // ms from timeline start (prototype ignores)
  dur: number; // ms
  blocking: boolean; // false = runs in background (toasts)
  label: string;
  apply: (s: UiState, t: number) => void; // t in [0,1]; t === 1 commits the final effect
}

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

// cubic-bezier evaluator so prototype and video share exactly the same curves
export function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dsx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const d = sx(t) - x;
      if (Math.abs(d) < 1e-6) break;
      const ds = dsx(t);
      if (Math.abs(ds) < 1e-6) break;
      t -= d / ds;
    }
    return sy(clamp01(t));
  };
}

export const easeNav = bezier(0.32, 0.72, 0, 1); // iOS-like navigation curve
export const easeOverlay = bezier(0.2, 0.8, 0.2, 1);
export const easeScroll = bezier(0.45, 0.05, 0.25, 1); // gentle start, soft landing

export function initialState(m: FlowManifest): UiState {
  return {
    stack: [m.meta.start],
    overlays: [],
    values: { ...(m.initialState?.values ?? {}) },
    flags: { ...(m.initialState?.flags ?? {}) },
    scroll: {},
    loading: {},
  };
}

export function topScreen(s: UiState): string {
  return s.stack[s.stack.length - 1];
}

/** The surface that receives taps: the top-most overlay if any, else the visible screen. */
export function activeSurface(s: UiState): string {
  const open = s.overlays.filter((o) => o.p > 0);
  return open.length ? open[open.length - 1].id : topScreen(s);
}

export function findInteraction(m: FlowManifest, surface: string, element: string): Interaction | undefined {
  return (
    m.interactions.find((i) => i.screen === surface && i.element === element) ??
    // elements in persistent chrome (tab bars, headers) may be declared with screen "*"
    m.interactions.find((i) => i.screen === "*" && i.element === element)
  );
}

const ms = (p: Presentation, v: number) => v / (p.speed || 1);

/** Expand one manifest action into timed ops. `s` is the state right before it runs. */
export function expandAction(a: Action, s: UiState, p: Presentation, m: FlowManifest): Op[] {
  const op = (dur: number, label: string, apply: Op["apply"], blocking = true): Op => ({
    start: 0, dur: ms(p, dur), blocking, label, apply,
  });
  const navDur = (k: TransitionKind) => (k === "none" ? 0 : p.transitions[k]);
  switch (a.type) {
    case "navigate":
    case "reset": {
      const kind = a.transition ?? defaultTransition(m);
      const to = a.to;
      return [
        op(navDur(kind), `${a.type}→${to}`, (st, t) => {
          if (t < 1) st.nav = { from: topScreen(st), to, kind, dir: 1, p: t };
          else {
            st.nav = undefined;
            st.overlays = [];
            st.stack = a.type === "reset" ? [to] : [...st.stack, to];
            delete st.scroll[to];
          }
        }),
      ];
    }
    case "back": {
      const kind = a.transition ?? defaultTransition(m);
      return [
        op(navDur(kind), "back", (st, t) => {
          if (st.stack.length < 2) return;
          if (t < 1) st.nav = { from: topScreen(st), to: st.stack[st.stack.length - 2], kind, dir: -1, p: t };
          else {
            st.nav = undefined;
            st.overlays = [];
            st.stack = st.stack.slice(0, -1);
          }
        }),
      ];
    }
    case "open":
      return [
        op(p.transitions.overlay, `open ${a.overlay}`, (st, t) => {
          const o = st.overlays.find((x) => x.id === a.overlay);
          if (o) o.p = t;
          else st.overlays.push({ id: a.overlay, p: t });
        }),
      ];
    case "close": {
      const id = a.overlay ?? s.overlays[s.overlays.length - 1]?.id;
      if (!id) return [];
      return [
        op(p.transitions.overlay * 0.85, `close ${id}`, (st, t) => {
          const o = st.overlays.find((x) => x.id === id);
          if (!o) return;
          if (t < 1) o.p = 1 - t;
          else st.overlays = st.overlays.filter((x) => x.id !== id);
        }),
      ];
    }
    case "set":
      return [op(0, `set ${a.key}`, (st) => void (st.flags[a.key] = a.value))];
    case "toast": {
      const hold = a.ms ?? 1800;
      const total = 250 + hold + 250;
      return [
        op(
          total,
          "toast",
          (st, t) => {
            const e = t * total;
            const vis = e < 250 ? e / 250 : e > 250 + hold ? 1 - (e - 250 - hold) / 250 : 1;
            if (t >= 1) st.toast = undefined;
            else st.toast = { text: a.text, p: clamp01(vis) };
          },
          false,
        ),
      ];
    }
    case "loading": {
      const key = a.key ?? "global";
      return [op(a.ms, `loading ${key}`, (st, t) => void (st.loading[key] = t < 1))];
    }
    case "wait":
      return [op(a.ms, "wait", () => {})];
  }
}

export function defaultTransition(m: FlowManifest): TransitionKind {
  return m.meta.platform === "web" ? "fade" : "push";
}

export function showsPointer(m: FlowManifest, p: Presentation): "none" | "touch" | "pointer" {
  if (p.cursor !== "auto") return p.cursor;
  return m.meta.platform === "web" ? "pointer" : "none";
}

export interface StepInfo {
  index: number;
  step: DemoStep;
  startMs: number;
  actionMs: number; // when the visible action (press / first char / scroll) begins
  settledMs: number; // when everything caused by the step has finished, before holdAfter
  endMs: number;
  surfaceAfter: string; // active surface once settled (what tests assert)
  screenAfter: string;
  warnings: string[];
}

export interface Timeline {
  ops: Op[];
  steps: StepInfo[];
  totalMs: number;
  warnings: string[];
}

function commit(s: UiState, ops: Op[]) {
  for (const o of ops) o.apply(s, 1);
}

/** Compile the demo script into a deterministic list of timed ops. */
export function compileTimeline(m: FlowManifest, p: Presentation): Timeline {
  const ops: Op[] = [];
  const steps: StepInfo[] = [];
  const warnings: string[] = [];
  const sim = initialState(m);
  let cursor = 0;
  const pointerMode = showsPointer(m, p);

  const push = (o: Op) => {
    o.start = cursor;
    ops.push(o);
    if (o.blocking) cursor += o.dur;
    commit(sim, [o]);
  };
  const runActions = (actions: Action[]) => {
    for (const a of actions) for (const o of expandAction(a, sim, p, m)) push(o);
  };
  const T = (v: number) => ms(p, v);
  const changesView = (actions: Action[]) =>
    actions.some((a) => ["navigate", "back", "reset", "open", "close"].includes(a.type));

  push({ start: 0, dur: T(p.timing.leadInMs), blocking: true, label: "lead-in", apply: () => {} });

  m.demo.steps.forEach((step, index) => {
    const startMs = cursor;
    const w: string[] = [];
    let actionMs = cursor;
    let hold = 0;
    switch (step.do) {
      case "wait":
        push({ start: 0, dur: T(step.ms), blocking: true, label: "wait", apply: () => {} });
        break;
      case "set":
        push({ start: 0, dur: 0, blocking: true, label: "set", apply: (st) => void (st.flags[step.key] = step.value) });
        break;
      case "tap": {
        const surface = activeSurface(sim);
        const ix = findInteraction(m, surface, step.target);
        if (!ix) w.push(`step ${index}: no interaction for "${step.target}" on "${surface}"`);
        if (pointerMode !== "none") {
          push({
            start: 0, dur: T(420), blocking: true, label: "pointer",
            apply: (st, t) => void (st.pointer = { target: step.target, p: t }),
          });
        }
        actionMs = cursor;
        push({
          start: 0, dur: T(p.timing.pressMs), blocking: true, label: `press ${step.target}`,
          apply: (st, t) => {
            if (t < 1) {
              st.pressed = step.target;
              st.pressP = Math.sin(Math.PI * t);
            } else {
              st.pressed = undefined;
              st.pressP = undefined;
              st.pointer = undefined;
            }
          },
        });
        if (ix) runActions(ix.actions);
        hold = step.holdAfter ?? (ix && changesView(ix.actions) ? p.timing.holdAfterTransitionMs : 500);
        break;
      }
      case "type": {
        const base = sim.values[step.target] ?? "";
        const n = step.text.length;
        const charMs = step.charMs ?? p.timing.typingCharMs;
        push({ start: 0, dur: 0, blocking: true, label: "focus", apply: (st) => void (st.focus = step.target) });
        actionMs = cursor;
        push({
          start: 0, dur: T(n * charMs), blocking: true, label: `type ${step.target}`,
          apply: (st, t) => {
            const count = t >= 1 ? n : Math.min(n, Math.floor(t * n) + 1);
            st.values[step.target] = base + step.text.slice(0, count);
          },
        });
        hold = step.holdAfter ?? 450;
        break;
      }
      case "scroll": {
        const screen = step.screen ?? activeSurface(sim);
        const from = sim.scroll[screen]?.to ?? 0;
        actionMs = cursor;
        push({
          start: 0, dur: T(step.ms ?? p.timing.scrollMs), blocking: true, label: `scroll ${screen}`,
          apply: (st, t) => void (st.scroll[screen] = { from, to: step.to, p: t }),
        });
        hold = step.holdAfter ?? 600;
        break;
      }
      case "action":
        runActions(step.actions);
        hold = step.holdAfter ?? (changesView(step.actions) ? p.timing.holdAfterTransitionMs : 400);
        break;
    }
    const settledMs = cursor;
    if (hold) push({ start: 0, dur: T(hold), blocking: true, label: "hold", apply: () => {} });
    steps.push({
      index, step, startMs, actionMs, settledMs, endMs: cursor,
      surfaceAfter: activeSurface(sim), screenAfter: topScreen(sim), warnings: w,
    });
    warnings.push(...w);
  });

  // let background ops (toasts) finish, then the outro
  const bgEnd = Math.max(0, ...ops.map((o) => o.start + o.dur));
  cursor = Math.max(cursor, bgEnd);
  push({ start: 0, dur: T(p.timing.outroMs), blocking: true, label: "outro", apply: () => {} });

  if (p.loop && topScreen(sim) !== m.meta.start) {
    // gentle cross-fade back to the first screen so the clip loops seamlessly
    push({
      start: 0, dur: T(p.transitions.fade), blocking: true, label: "loop",
      apply: (st, t) => {
        if (t < 1) st.nav = { from: topScreen(st), to: m.meta.start, kind: "fade", dir: 1, p: t };
        else Object.assign(st, initialState(m));
      },
    });
    push({ start: 0, dur: T(p.timing.leadInMs * 0.5), blocking: true, label: "loop-hold", apply: () => {} });
  }

  return { ops, steps, totalMs: cursor, warnings };
}

/** Deterministic UI state at a given time — replays every op from scratch. */
export function stateAt(m: FlowManifest, tl: Timeline, timeMs: number): UiState {
  const s = initialState(m);
  for (const o of tl.ops) {
    if (o.start > timeMs) break;
    const t = o.dur === 0 ? 1 : clamp01((timeMs - o.start) / o.dur);
    o.apply(s, t);
  }
  return s;
}

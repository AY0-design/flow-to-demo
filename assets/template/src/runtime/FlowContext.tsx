import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { animate } from "motion";
import {
  activeSurface,
  expandAction,
  findInteraction,
  initialState,
  type Op,
  type UiState,
} from "../flow/engine";
import type { Action, FlowManifest, Presentation } from "../flow/types";

export type Mode = "interactive" | "playback";

interface FlowCtx {
  mode: Mode;
  state: UiState;
  manifest: FlowManifest;
  presentation: Presentation;
  /** Fire the manifest interaction for `element` on `surface` (interactive mode only). */
  tap: (element: string, surface: string) => void;
  setValue: (field: string, value: string) => void;
  setFlag: (key: string, value: string | boolean | number) => void;
  setFocus: (field: string | undefined) => void;
  run: (actions: Action[]) => Promise<void>;
  restart: () => void;
  busy: boolean;
}

const Ctx = createContext<FlowCtx | null>(null);

export function useFlow(): FlowCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFlow must be used inside <FlowProvider> or <PlaybackProvider>");
  return c;
}

/** Text value of a field — works identically in prototype and video. */
export function useValue(field: string): string {
  return useFlow().state.values[field] ?? "";
}

/** Flag (tab, toggle, selection) plus a setter that works in the prototype. */
export function useFlag<T extends string | boolean | number>(key: string, fallback: T): [T, (v: T) => void] {
  const f = useFlow();
  const v = (f.state.flags[key] as T | undefined) ?? fallback;
  return [v, (nv: T) => f.setFlag(key, nv)];
}

export function useLoading(key = "global"): boolean {
  return !!useFlow().state.loading[key];
}

/** Which surface (screen/overlay id) a component is rendered inside. */
export const SurfaceCtx = createContext<string>("");
export const useSurface = () => useContext(SurfaceCtx);

/* ---------------- interactive (prototype) provider ---------------- */

export function FlowProvider(props: { manifest: FlowManifest; presentation: Presentation; children: ReactNode }) {
  const { manifest, presentation } = props;
  const [state, setState] = useState<UiState>(() => initialState(manifest));
  const latest = useRef(state);
  latest.current = state;
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const generation = useRef(0); // invalidates in-flight animations on restart

  const applyOp = useCallback((o: Op, t: number) => {
    setState((s) => {
      const c = structuredClone(s);
      o.apply(c, t);
      latest.current = c;
      return c;
    });
  }, []);

  const playOp = useCallback(
    (o: Op, gen: number) =>
      new Promise<void>((resolve) => {
        if (o.dur <= 0) {
          if (gen === generation.current) applyOp(o, 1);
          resolve();
          return;
        }
        animate(0, 1, {
          duration: o.dur / 1000,
          ease: "linear", // easing is applied in transitions.ts so video and prototype match
          onUpdate: (t) => {
            if (gen === generation.current && t < 1) applyOp(o, t);
          },
          onComplete: () => {
            if (gen === generation.current) applyOp(o, 1);
            resolve();
          },
        });
      }),
    [applyOp],
  );

  const run = useCallback(
    async (actions: Action[]) => {
      const gen = generation.current;
      busyRef.current = true;
      setBusy(true);
      try {
        for (const a of actions) {
          const ops = expandAction(a, latest.current, presentation, manifest);
          for (const o of ops) {
            if (gen !== generation.current) return;
            if (o.blocking) await playOp(o, gen);
            else void playOp(o, gen);
          }
        }
      } finally {
        if (gen === generation.current) {
          busyRef.current = false;
          setBusy(false);
        }
      }
    },
    [manifest, presentation, playOp],
  );

  const tap = useCallback(
    (element: string, surface: string) => {
      if (busyRef.current) return; // ignore taps mid-transition, like a real app
      const ix = findInteraction(manifest, surface, element);
      if (!ix) {
        console.warn(`[flow] no interaction wired for "${element}" on "${surface}"`);
        return;
      }
      void run(ix.actions);
    },
    [manifest, run],
  );

  const restart = useCallback(() => {
    generation.current++;
    busyRef.current = false;
    setBusy(false);
    const s = initialState(manifest);
    latest.current = s;
    setState(s);
  }, [manifest]);

  // Escape closes the top overlay (keyboard / desktop convenience)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && latest.current.overlays.length && !busyRef.current) void run([{ type: "close" }]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run]);

  // expose state for Playwright assertions
  useEffect(() => {
    (window as unknown as { __flow: unknown }).__flow = {
      state,
      surface: activeSurface(state),
      busy,
      api: {
        run,
        restart,
        setFlag: (k: string, v: string | boolean | number) => setState((s) => ({ ...s, flags: { ...s.flags, [k]: v } })),
      },
    };
  }, [state, busy, run, restart]);

  const value = useMemo<FlowCtx>(
    () => ({
      mode: "interactive",
      state,
      manifest,
      presentation,
      tap,
      run,
      restart,
      busy,
      setValue: (field, v) =>
        setState((s) => {
          const c = { ...s, values: { ...s.values, [field]: v } };
          latest.current = c;
          return c;
        }),
      setFlag: (key, v) =>
        setState((s) => {
          const c = { ...s, flags: { ...s.flags, [key]: v } };
          latest.current = c;
          return c;
        }),
      setFocus: (field) =>
        setState((s) => {
          const c = { ...s, focus: field };
          latest.current = c;
          return c;
        }),
    }),
    [state, manifest, presentation, tap, run, restart, busy],
  );

  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>;
}

/* ---------------- playback (video) provider ---------------- */

const noop = () => {};

export function PlaybackProvider(props: {
  manifest: FlowManifest;
  presentation: Presentation;
  state: UiState;
  children: ReactNode;
}) {
  const value: FlowCtx = {
    mode: "playback",
    state: props.state,
    manifest: props.manifest,
    presentation: props.presentation,
    tap: noop,
    setValue: noop,
    setFlag: noop,
    setFocus: noop,
    run: async () => {},
    restart: noop,
    busy: false,
  };
  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>;
}

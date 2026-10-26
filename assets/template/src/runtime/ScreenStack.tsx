import { useLayoutEffect, useRef, useState, type CSSProperties, type ComponentType } from "react";
import { showsPointer, topScreen } from "../flow/engine";
import type { OverlayKind } from "../flow/types";
import { screens, Toast as CustomToast } from "../screens";
import { SurfaceCtx, useFlow } from "./FlowContext";
import { navStyles, overlayStyles } from "./transitions";

const layer: CSSProperties = { position: "absolute", inset: 0, overflow: "hidden" };

function Surface(props: { id: string; style?: CSSProperties; active: boolean; z: number }) {
  const C = screens[props.id] as ComponentType | undefined;
  return (
    <SurfaceCtx.Provider value={props.id}>
      <div
        data-screen={props.id}
        data-active={props.active ? "true" : "false"}
        aria-hidden={!props.active}
        style={{ ...layer, zIndex: props.z, background: "var(--screen-bg, #fff)", ...props.style, pointerEvents: props.active ? "auto" : "none" }}
      >
        {C ? <C /> : <Missing id={props.id} />}
      </div>
    </SurfaceCtx.Provider>
  );
}

function Missing({ id }: { id: string }) {
  return (
    <div style={{ display: "grid", placeItems: "center", height: "100%", font: "14px system-ui", color: "#b00" }}>
      Missing screen component: {id}
    </div>
  );
}

/** Renders the navigation stack, transitions, overlays, toast and pointer. */
export function ScreenStack() {
  const { state, manifest } = useFlow();
  const kindOf = (id: string) => (manifest.screens.find((s) => s.id === id)?.kind ?? "modal") as OverlayKind;
  const top = topScreen(state);
  const nav = state.nav;
  const overlayActive = state.overlays.length > 0;

  let base;
  if (nav) {
    const st = navStyles(nav.kind, nav.dir, nav.p);
    base = (
      <>
        <Surface id={nav.from} style={st.from} active={false} z={st.toOnTop ? 1 : 2} />
        <Surface id={nav.to} style={st.to} active={false} z={st.toOnTop ? 2 : 1} />
      </>
    );
  } else {
    base = <Surface id={top} active={!overlayActive} z={1} />;
  }

  return (
    <div data-flow-root data-active-screen={top} style={{ ...layer, isolation: "isolate" }}>
      {base}
      {state.overlays.map((o, i) => {
        const kind = kindOf(o.id);
        const st = overlayStyles(kind, o.p);
        const isTop = i === state.overlays.length - 1;
        return (
          <div key={o.id} style={{ ...layer, zIndex: 10 + i, display: "flex", ...st.align, pointerEvents: isTop ? "auto" : "none" }}>
            <ScrimTap overlay={o.id} style={st.scrim} />
            <SurfaceCtx.Provider value={o.id}>
              <div data-screen={o.id} data-overlay={kind} data-active={isTop ? "true" : "false"} style={{ position: "relative", ...st.panel }}>
                <OverlayBody id={o.id} />
              </div>
            </SurfaceCtx.Provider>
          </div>
        );
      })}
      {state.toast ? <ToastLayer text={state.toast.text} p={state.toast.p} /> : null}
      <Pointer />
    </div>
  );
}

function OverlayBody({ id }: { id: string }) {
  const C = screens[id] as ComponentType | undefined;
  return C ? <C /> : <Missing id={id} />;
}

/** Scrim behind overlays. Tapping it closes the overlay unless flow.json wires "scrim" differently. */
function ScrimTap({ overlay, style }: { overlay: string; style: CSSProperties }) {
  const f = useFlow();
  const onClick = () => {
    if (f.mode !== "interactive" || f.busy) return;
    const wired = f.manifest.interactions.find((i) => i.screen === overlay && i.element === "scrim");
    if (wired) f.tap("scrim", overlay);
    else void f.run([{ type: "close", overlay }]);
  };
  return <div data-flow-id="scrim" onClick={onClick} style={{ ...layer, background: "var(--scrim, rgba(0,0,0,.4))", ...style }} />;
}

function ToastLayer({ text, p }: { text: string; p: number }) {
  if (CustomToast) return <CustomToast text={text} p={p} />;
  return (
    <div style={{ ...layer, zIndex: 50, pointerEvents: "none", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 56 }}>
      <div
        role="status"
        style={{
          opacity: p,
          transform: `translate3d(0,${-12 * (1 - p)}px,0)`,
          background: "rgba(20,20,22,.92)",
          color: "#fff",
          font: "500 14px/20px var(--font-sans, system-ui)",
          padding: "10px 16px",
          borderRadius: 12,
          boxShadow: "0 8px 24px rgba(0,0,0,.18)",
          maxWidth: "80%",
        }}
      >
        {text}
      </div>
    </div>
  );
}

/** Video-only cursor / touch indicator, positioned on the real target element. */
function Pointer() {
  const { mode, state, manifest, presentation } = useFlow();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const kind = showsPointer(manifest, presentation);
  const target = state.pressed ?? state.pointer?.target;

  useLayoutEffect(() => {
    if (mode !== "playback" || kind === "none" || !target || !ref.current) {
      if (pos) setPos(null);
      return;
    }
    const root = ref.current.parentElement!;
    const el = root.querySelector<HTMLElement>(`[data-active="true"] [data-flow-id="${target}"]`) ??
      root.querySelector<HTMLElement>(`[data-flow-id="${target}"]`);
    if (!el) return;
    // measure in unscaled layout px so scaled stages still line up
    let x = el.offsetWidth / 2, y = el.offsetHeight / 2;
    let n: HTMLElement | null = el;
    while (n && n !== root) {
      x += n.offsetLeft;
      y += n.offsetTop;
      n = n.offsetParent as HTMLElement | null;
    }
    if (!pos || Math.abs(pos.x - x) > 0.5 || Math.abs(pos.y - y) > 0.5) setPos({ x, y });
  });

  if (mode !== "playback" || kind === "none") return <div ref={ref} style={{ display: "none" }} />;
  const approach = state.pointer?.p ?? (state.pressed ? 1 : 0);
  const pressK = state.pressP ?? 0;
  const visible = !!target && !!pos;
  const e = 1 - Math.pow(1 - approach, 3);
  const dx = kind === "pointer" ? 70 * (1 - e) : 0;
  const dy = kind === "pointer" ? 46 * (1 - e) : 0;
  return (
    <div ref={ref} style={{ ...layer, zIndex: 100, pointerEvents: "none", overflow: "visible" }}>
      {visible && kind === "pointer" ? (
        <svg
          width="22" height="22" viewBox="0 0 22 22"
          style={{ position: "absolute", left: pos!.x + dx - 3, top: pos!.y + dy - 2, opacity: Math.min(1, approach * 2), transform: `scale(${1 - 0.12 * pressK})`, transformOrigin: "3px 2px" }}
        >
          <path d="M3 2l14 8.2-6.1 1.4L8 18z" fill="#111" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      ) : null}
      {visible && kind === "touch" ? (
        <div
          style={{
            position: "absolute", left: pos!.x - 22, top: pos!.y - 22, width: 44, height: 44, borderRadius: 22,
            background: "rgba(120,120,128,.28)", border: "1px solid rgba(255,255,255,.5)",
            opacity: approach * (0.6 + 0.4 * pressK), transform: `scale(${0.85 + 0.15 * approach - 0.1 * pressK})`,
          }}
        />
      ) : null}
    </div>
  );
}

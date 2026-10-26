// Building blocks every screen uses. Each one behaves natively in the prototype
// and is driven by UiState in the video, so screens are written exactly once.

import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { motion } from "motion/react";
import { easeScroll } from "../flow/engine";
import { useFlow, useSurface } from "./FlowContext";

type Press = "scale" | "opacity" | "none";

/**
 * Anything the user can tap: buttons, list rows, cards, tabs, icons.
 * `id` must match an interaction's `element` in flow.json.
 * Renders a real <button> so it is keyboard accessible and Playwright-clickable.
 */
export function Tap(props: {
  id: string;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  press?: Press;
  label?: string; // aria-label for icon-only buttons
  onTap?: () => void; // optional local effect (e.g. toggling a checkbox flag) in addition to the manifest
}) {
  const f = useFlow();
  const surface = useSurface();
  const press = props.press ?? "scale";
  const base: CSSProperties = {
    all: "unset",
    boxSizing: "border-box",
    cursor: props.disabled ? "default" : "pointer",
    WebkitTapHighlightColor: "transparent",
    display: "block",
    ...props.style,
  };

  if (f.mode === "playback") {
    const k = f.state.pressed === props.id ? f.state.pressP ?? 0 : 0;
    const fx: CSSProperties =
      press === "scale" ? { transform: `scale(${1 - 0.035 * k})` } : press === "opacity" ? { opacity: 1 - 0.35 * k } : {};
    return (
      <div data-flow-id={props.id} className={props.className} style={{ ...base, ...fx, transition: "none" }}>
        {props.children}
      </div>
    );
  }

  const tapFx = press === "scale" ? { scale: 0.965 } : press === "opacity" ? { opacity: 0.65 } : undefined;
  const fire = () => {
    if (props.disabled) return;
    props.onTap?.();
    f.tap(props.id, surface);
  };
  // A div with button semantics (not <button>) so layout is identical to the video replica.
  return (
    <motion.div
      role="button"
      tabIndex={props.disabled ? -1 : 0}
      data-flow-id={props.id}
      aria-label={props.label}
      aria-disabled={props.disabled || undefined}
      className={props.className}
      style={base}
      whileTap={props.disabled ? undefined : tapFx}
      transition={{ duration: 0.12 }}
      onClick={fire}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          fire();
        }
      }}
    >
      {props.children}
    </motion.div>
  );
}

/**
 * Text input bound to state.values[id]. In the video it renders a static replica
 * with a drawn caret so typing looks real and frames are deterministic.
 * Style it with className/style exactly as the Figma input; the placeholder colour
 * comes from `placeholderColor`.
 */
export function Field(props: {
  id: string;
  placeholder?: string;
  type?: "text" | "tel" | "email" | "password" | "number";
  inputMode?: "text" | "numeric" | "tel" | "email" | "decimal";
  maxLength?: number;
  className?: string;
  style?: CSSProperties;
  placeholderColor?: string;
  caretColor?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
}) {
  const f = useFlow();
  const value = f.state.values[props.id] ?? "";
  const shown = props.type === "password" ? "•".repeat(value.length) : value;
  const focused = f.state.focus === props.id;

  if (f.mode === "playback") {
    return (
      <div
        data-field-id={props.id}
        className={props.className}
        style={{ whiteSpace: "pre", overflow: "hidden", display: "flex", alignItems: "center", minWidth: 0, ...props.style }}
      >
        {shown ? <span>{shown}</span> : null}
        {focused ? (
          <span
            style={{
              display: "inline-block",
              width: 2,
              height: "1.15em",
              marginLeft: 1,
              background: props.caretColor ?? "currentColor",
              borderRadius: 1,
              flex: "none",
            }}
          />
        ) : null}
        {!shown ? <span style={{ color: props.placeholderColor ?? "rgba(0,0,0,.4)" }}>{props.placeholder}</span> : null}
      </div>
    );
  }

  return (
    <input
      data-field-id={props.id}
      className={props.className}
      style={{ all: "unset", boxSizing: "border-box", minWidth: 0, caretColor: props.caretColor, ...props.style, ["--ph" as string]: props.placeholderColor }}
      value={value}
      placeholder={props.placeholder}
      type={props.type ?? "text"}
      inputMode={props.inputMode}
      maxLength={props.maxLength}
      autoFocus={props.autoFocus}
      onFocus={() => f.setFocus(props.id)}
      onBlur={() => f.setFocus(undefined)}
      onChange={(e) => f.setValue(props.id, e.target.value)}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") props.onEnter?.();
      }}
    />
  );
}

/**
 * Scrollable region of a screen. Native scrolling in the prototype; in the video
 * the offset comes from `scroll` demo steps (number | "end" | "top").
 */
export function Scroll(props: { children: ReactNode; className?: string; style?: CSSProperties; horizontal?: boolean; id?: string }) {
  const f = useFlow();
  const surface = useSurface();
  const key = props.id ?? surface;
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [max, setMax] = useState(0);
  const sc = f.state.scroll[key];

  useLayoutEffect(() => {
    if (f.mode !== "playback" || !outer.current || !inner.current) return;
    const m = props.horizontal
      ? inner.current.scrollWidth - outer.current.clientWidth
      : inner.current.scrollHeight - outer.current.clientHeight;
    if (m !== max) setMax(Math.max(0, m));
  });

  const axis: CSSProperties = props.horizontal
    ? { overflowX: "auto", overflowY: "hidden" }
    : { overflowY: "auto", overflowX: "hidden" };

  if (f.mode !== "playback") {
    return (
      <div data-scroll-id={key} className={props.className} style={{ ...axis, overscrollBehavior: "contain", scrollbarWidth: "none", ...props.style }}>
        {props.children}
      </div>
    );
  }

  const resolve = (v: number | "end" | "top") => Math.min(max, Math.max(0, v === "end" ? max : v === "top" ? 0 : v));
  const off = sc ? resolve(sc.from) + (resolve(sc.to) - resolve(sc.from)) * easeScroll(sc.p) : 0;
  return (
    <div ref={outer} data-scroll-id={key} className={props.className} style={{ overflow: "hidden", ...props.style }}>
      <div
        ref={inner}
        style={{
          transform: props.horizontal ? `translate3d(${-off}px,0,0)` : `translate3d(0,${-off}px,0)`,
          display: props.horizontal ? "inline-flex" : "block",
          minWidth: props.horizontal ? "100%" : undefined,
        }}
      >
        {props.children}
      </div>
    </div>
  );
}

/** Simple spinner that is deterministic in the video (driven by a frame-safe CSS var). */
export function Spinner(props: { size?: number; color?: string; track?: string }) {
  const s = props.size ?? 20;
  return (
    <span
      className="flow-spinner"
      style={{
        width: s,
        height: s,
        borderRadius: "50%",
        border: `${Math.max(2, s / 9)}px solid ${props.track ?? "rgba(0,0,0,.12)"}`,
        borderTopColor: props.color ?? "currentColor",
        display: "inline-block",
        boxSizing: "border-box",
      }}
    />
  );
}

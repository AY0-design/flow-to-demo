import type { CSSProperties, ReactNode } from "react";
import type { FlowManifest, Presentation } from "../flow/types";

/**
 * The UI viewport at its exact Figma size, optionally framed.
 * Used by the prototype page and the video so both present identically.
 */
export function Device(props: { manifest: FlowManifest; presentation: Presentation; children: ReactNode; flat?: boolean; timeMs?: number }) {
  const { width, height } = props.manifest.meta.viewport;
  const p = props.presentation;
  const frame = props.flat ? "none" : p.frame;
  const radius = frame === "rounded" ? p.cornerRadius : frame === "device" ? p.cornerRadius : 0;
  const screen: CSSProperties = {
    position: "relative",
    width,
    height,
    overflow: "hidden",
    borderRadius: radius,
    background: "var(--screen-bg, #fff)",
    boxShadow: frame === "rounded" && p.shadow ? "0 1px 2px rgba(0,0,0,.06), 0 24px 60px -12px rgba(16,24,40,.22)" : undefined,
    // clip children (including transformed layers) to the rounded corners
    WebkitMaskImage: radius ? "-webkit-radial-gradient(white, black)" : undefined,
    ["--flow-t" as string]: props.timeMs ?? 0,
  };
  const inner = (
    <div className="flow-screen" style={screen}>
      {props.children}
    </div>
  );
  if (frame !== "device") return inner;
  return (
    <div
      style={{
        padding: 14,
        borderRadius: radius + 14,
        background: "linear-gradient(145deg,#1d1d1f,#0b0b0c)",
        boxShadow: p.shadow ? "0 0 0 1px #333 inset, 0 30px 70px -15px rgba(0,0,0,.45)" : "0 0 0 1px #333 inset",
      }}
    >
      {inner}
    </div>
  );
}

/** Full stage: background colour + centred device. */
export function Stage(props: { manifest: FlowManifest; presentation: Presentation; children: ReactNode; timeMs?: number; style?: CSSProperties }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: props.presentation.background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...props.style,
      }}
    >
      <Device manifest={props.manifest} presentation={props.presentation} timeMs={props.timeMs}>
        {props.children}
      </Device>
    </div>
  );
}

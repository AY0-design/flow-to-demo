import type { CSSProperties } from "react";
import { easeNav, easeOverlay } from "../flow/engine";
import type { OverlayKind, TransitionKind } from "../flow/types";

/** Styles for the outgoing ("from") and incoming ("to") screens at linear progress p. */
export function navStyles(kind: TransitionKind, dir: 1 | -1, p: number): { from: CSSProperties; to: CSSProperties; toOnTop: boolean } {
  const e = easeNav(p);
  switch (kind) {
    case "push":
      if (dir === 1)
        return {
          from: { transform: `translate3d(${-28 * e}%,0,0)`, filter: `brightness(${1 - 0.08 * e})` },
          to: { transform: `translate3d(${100 * (1 - e)}%,0,0)`, boxShadow: `0 0 24px rgba(0,0,0,${0.12 * (1 - e)})` },
          toOnTop: true,
        };
      return {
        from: { transform: `translate3d(${100 * e}%,0,0)`, boxShadow: `0 0 24px rgba(0,0,0,${0.12 * e})` },
        to: { transform: `translate3d(${-28 * (1 - e)}%,0,0)`, filter: `brightness(${0.92 + 0.08 * e})` },
        toOnTop: false,
      };
    case "rise":
      if (dir === 1)
        return {
          from: { filter: `brightness(${1 - 0.1 * e})` },
          to: { transform: `translate3d(0,${100 * (1 - e)}%,0)` },
          toOnTop: true,
        };
      return {
        from: { transform: `translate3d(0,${100 * e}%,0)` },
        to: { filter: `brightness(${0.9 + 0.1 * e})` },
        toOnTop: false,
      };
    case "fade":
      return { from: { opacity: 1 - e }, to: { opacity: e }, toOnTop: true };
    case "none":
    default:
      return { from: { opacity: 0 }, to: {}, toOnTop: true };
  }
}

/** Panel + scrim styles for an overlay at linear progress p (0 closed, 1 open). */
export function overlayStyles(kind: OverlayKind, p: number): { scrim: CSSProperties; panel: CSSProperties; align: CSSProperties } {
  const e = easeOverlay(p);
  const scrim: CSSProperties = { opacity: e };
  switch (kind) {
    case "sheet":
      return {
        scrim,
        panel: { transform: `translate3d(0,${100 * (1 - e)}%,0)`, width: "100%" },
        align: { alignItems: "flex-end", justifyContent: "center" },
      };
    case "drawer":
      return {
        scrim,
        panel: { transform: `translate3d(${-100 * (1 - e)}%,0,0)`, height: "100%" },
        align: { alignItems: "stretch", justifyContent: "flex-start" },
      };
    case "dropdown":
      return {
        scrim: { opacity: 0 },
        panel: { opacity: e, transform: `translate3d(0,${-6 * (1 - e)}px,0)`, width: "100%", height: "100%" },
        align: { alignItems: "stretch", justifyContent: "stretch" },
      };
    case "modal":
    default:
      return {
        scrim,
        panel: { opacity: e, transform: `scale(${0.95 + 0.05 * e})` },
        align: { alignItems: "center", justifyContent: "center" },
      };
  }
}

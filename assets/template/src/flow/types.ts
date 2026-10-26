// Flow manifest types. flow.json (project root) is the single source of truth
// for both the interactive prototype and the walkthrough video.

export type Evidence = "confirmed" | "inferred" | "assumed";
export type Platform = "mobile" | "tablet" | "web";
export type TransitionKind =
  | "push" // iOS/Android-style horizontal slide (back = reverse)
  | "fade" // cross-fade, good for web routes and tab-level swaps
  | "rise" // new screen slides up from bottom (full-screen modal)
  | "none"; // instant swap (tabs, same-layout state changes)

export type OverlayKind = "modal" | "sheet" | "drawer" | "dropdown";

export interface ScreenDef {
  id: string; // kebab-case, used in code + data-screen attributes
  name: string; // human name from Figma
  figmaNodeId?: string; // e.g. "12:345" — keep a link back to the source frame
  kind?: "screen" | OverlayKind; // overlays render above the current screen
  status: Evidence;
  notes?: string;
}

export type Action =
  | { type: "navigate"; to: string; transition?: TransitionKind }
  | { type: "back"; transition?: TransitionKind }
  | { type: "reset"; to: string; transition?: TransitionKind } // replace whole stack (e.g. after onboarding)
  | { type: "open"; overlay: string }
  | { type: "close"; overlay?: string } // default: top-most overlay
  | { type: "set"; key: string; value: string | boolean | number } // tabs, toggles, selections
  | { type: "toast"; text: string; ms?: number }
  | { type: "loading"; ms: number; key?: string } // simulated async work
  | { type: "wait"; ms: number };

export interface Interaction {
  id: string; // "<screen>.<element>"
  screen: string; // screen or overlay id where the element lives
  element: string; // matches <Tap id="..."> / data-flow-id in the screen code
  trigger?: "tap" | "submit" | "longpress" | "swipe";
  actions: Action[]; // executed in order
  status: Evidence;
  source?: string; // e.g. "figma prototype reaction", "button label 'Continue'", "user answer"
  notes?: string;
}

export type DemoStep =
  | { do: "wait"; ms: number; caption?: string }
  | { do: "tap"; target: string; holdAfter?: number; caption?: string }
  | { do: "type"; target: string; text: string; charMs?: number; holdAfter?: number; caption?: string }
  | { do: "scroll"; screen?: string; to: number | "end" | "top"; ms?: number; holdAfter?: number; caption?: string }
  | { do: "set"; key: string; value: string | boolean | number; caption?: string }
  | { do: "action"; actions: Action[]; holdAfter?: number; caption?: string }; // direct actions, e.g. an auto-advance

export interface FlowManifest {
  version: 1;
  meta: {
    name: string;
    slug: string;
    figma?: { url?: string; fileKey?: string; nodeId?: string };
    platform: Platform;
    viewport: { width: number; height: number };
    start: string; // first screen id
    approval?: { approved: boolean; at?: string; assumptions?: string[] };
  };
  screens: ScreenDef[];
  interactions: Interaction[];
  initialState?: { values?: Record<string, string>; flags?: Record<string, string | boolean | number> };
  branches?: { id: string; from: string; description: string; paths: string[][]; inDemo?: string[] }[];
  gaps?: { id: string; severity: "critical" | "optional"; description: string; resolution?: string }[];
  demo: { steps: DemoStep[] };
}

export interface Presentation {
  background: string; // stage colour behind the UI
  frame: "rounded" | "device" | "none"; // rounded = Mobbin-style screen card
  cornerRadius: number; // px at 1x, used by "rounded"
  padding: number; // px of stage around the UI (each side)
  shadow: boolean;
  fps: number;
  scale: number; // render multiplier for crisp text (2 = retina)
  speed: number; // 1 = normal, 0.8 = slower, 1.25 = faster
  loop: boolean; // append a short return-to-start so the clip loops cleanly
  cursor: "auto" | "none" | "touch" | "pointer"; // auto: none on mobile/tablet, pointer on web
  output: { width: number | null; height: number | null }; // null = derive from viewport + padding
  timing: {
    leadInMs: number; // hold on first screen before the first action
    holdAfterTransitionMs: number; // let the viewer read a new screen
    pressMs: number; // tap feedback duration
    typingCharMs: number;
    scrollMs: number;
    outroMs: number;
  };
  transitions: { push: number; fade: number; rise: number; overlay: number }; // ms
  poster: { step: number | "auto" }; // which demo step's settled frame becomes the poster
}

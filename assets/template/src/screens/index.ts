// Screen registry: flow.json screen/overlay id -> React component.
// One component per Figma frame (overlays included). Screens read state with
// useValue/useFlag/useLoading and make things interactive with <Tap>, <Field>, <Scroll>.
import type { ComponentType } from "react";

export const screens: Record<string, ComponentType> = {
  // "welcome": Welcome,
};

/** Optional: replace the default toast with the design's own. */
export const Toast: ComponentType<{ text: string; p: number }> | null = null;

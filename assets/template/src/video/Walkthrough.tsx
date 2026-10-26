import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, useCurrentFrame } from "remotion";
import "../runtime/base.css";
import "../tokens.css";
import { compileTimeline, stateAt } from "../flow/engine";
import { flow, presentation } from "../flow/load";
import { PlaybackProvider } from "../runtime/FlowContext";
import { ScreenStack } from "../runtime/ScreenStack";
import { Stage } from "../present/Stage";
import { FONT_CSS_URLS } from "./fonts";

const timeline = compileTimeline(flow, presentation);

function useFontsReady() {
  const [handle] = useState(() => delayRender("Loading fonts"));
  useEffect(() => {
    for (const href of FONT_CSS_URLS) {
      if (document.querySelector(`link[href="${href}"]`)) continue;
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = href;
      document.head.appendChild(l);
    }
    const t = setTimeout(() => cancelRender(new Error("Fonts did not load within 25s — check src/video/fonts.ts")), 25000);
    // wait for stylesheet + faces, then a frame so layout settles
    const wait = async () => {
      await new Promise((r) => setTimeout(r, FONT_CSS_URLS.length ? 300 : 0));
      await document.fonts.ready;
      requestAnimationFrame(() => {
        clearTimeout(t);
        continueRender(handle);
      });
    };
    void wait();
    return () => clearTimeout(t);
  }, [handle]);
}

export function Walkthrough(props: { frame?: number }) {
  useFontsReady();
  const current = useCurrentFrame();
  // Use the presentation fps, not useVideoConfig(): the Poster <Still> runs at 1 fps.
  const fps = presentation.fps;
  const frame = props.frame ?? current;
  const timeMs = (frame / fps) * 1000;
  const state = stateAt(flow, timeline, timeMs);
  return (
    <div data-mode="playback" style={{ position: "absolute", inset: 0 }}>
      <PlaybackProvider manifest={flow} presentation={presentation} state={state}>
        <Stage manifest={flow} presentation={presentation} timeMs={timeMs}>
          <ScreenStack />
        </Stage>
      </PlaybackProvider>
    </div>
  );
}

import { Composition, Still } from "remotion";
import { compileTimeline } from "../flow/engine";
import { flow, presentation, stageSize } from "../flow/load";
import { Walkthrough } from "./Walkthrough";

const tl = compileTimeline(flow, presentation);
const fps = presentation.fps;
const { width, height } = stageSize();
export const durationInFrames = Math.max(1, Math.ceil((tl.totalMs / 1000) * fps));

export function RemotionRoot() {
  return (
    <>
      <Composition id="Walkthrough" component={Walkthrough} durationInFrames={durationInFrames} fps={fps} width={width} height={height} />
      {/* Poster uses the same component; tools/render.ts picks the frame. */}
      <Still id="Poster" component={Walkthrough} width={width} height={height} />
    </>
  );
}

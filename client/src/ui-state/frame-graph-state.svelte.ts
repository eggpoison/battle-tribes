import { FrameInfo } from "../game/rendering/webgl/frame-graph-rendering";

let trackedFramesState = $state(new Array<FrameInfo>());

export const frameGraphState = {
   get trackedFrames() {
      return trackedFramesState;
   }
};
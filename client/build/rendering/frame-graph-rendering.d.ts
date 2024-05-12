import { FrameInfo } from "../components/game/dev/FrameGraph";
/** Time that frames are recorded for */
export declare const FRAME_GRAPH_RECORD_TIME = 1;
export declare function setupFrameGraph(): void;
export declare function renderFrameGraph(renderTime: number, frames: ReadonlyArray<FrameInfo>): void;

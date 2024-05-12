export interface FrameInfo {
    readonly startTime: number;
    readonly endTime: number;
}
/** Registers that a frame has occured for use in showing the fps counter */
export declare function registerFrame(frameStartTime: number, frameEndTime: number): void;
export declare let updateFrameGraph: () => void;
export declare let showFrameGraph: () => void;
export declare let hideFrameGraph: () => void;
declare const FrameGraph: () => JSX.Element;
export default FrameGraph;

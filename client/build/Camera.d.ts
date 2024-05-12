import { Point } from "webgl-test-shared/dist/utils";
import { VisibleChunkBounds } from "webgl-test-shared/dist/client-server-types";
export type VisiblePositionBounds = [minX: number, maxX: number, minY: number, maxY: number];
declare abstract class Camera {
    /** Larger = zoomed in, smaller = zoomed out */
    static zoom: number;
    static trackedEntityID: number;
    static position: Point;
    static isFree: boolean;
    static minVisibleChunkX: number;
    static maxVisibleChunkX: number;
    static minVisibleChunkY: number;
    static maxVisibleChunkY: number;
    static minVisibleRenderChunkX: number;
    static maxVisibleRenderChunkX: number;
    static minVisibleRenderChunkY: number;
    static maxVisibleRenderChunkY: number;
    static updateVisibleChunkBounds(): void;
    static getVisibleChunkBounds(): VisibleChunkBounds;
    static updateVisibleRenderChunkBounds(): void;
    static setTrackedEntityID(entityID: number): void;
    static setPosition(x: number, y: number): void;
    static updatePosition(): void;
    /** X position in the screen (0 = left, windowWidth = right) */
    static calculateXScreenPos(x: number): number;
    /** Y position in the screen (0 = bottom, windowHeight = top) */
    static calculateYScreenPos(y: number): number;
}
export default Camera;

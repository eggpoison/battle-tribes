import { RiverSteppingStoneData, WaterRockData } from "webgl-test-shared/dist/client-server-types";
import { RenderChunkRiverInfo } from "./render-chunks";
export declare function createRiverSteppingStoneData(riverSteppingStones: ReadonlyArray<RiverSteppingStoneData>): void;
export declare function createRiverShaders(): void;
export declare function calculateRiverRenderChunkData(renderChunkX: number, renderChunkY: number, waterRocks: ReadonlyArray<WaterRockData>, edgeSteppingStones: ReadonlyArray<RiverSteppingStoneData>): RenderChunkRiverInfo | null;
export declare function renderRivers(): void;

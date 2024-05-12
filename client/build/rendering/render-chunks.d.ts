import { DecorationInfo, RiverSteppingStoneData, ServerTileUpdateData, WaterRockData } from "webgl-test-shared/dist/client-server-types";
/** Width and height of a render chunk in tiles */
export declare const RENDER_CHUNK_SIZE = 8;
export declare const RENDER_CHUNK_UNITS: number;
export declare const WORLD_RENDER_CHUNK_SIZE: number;
export declare const RENDER_CHUNK_EDGE_GENERATION: number;
export interface RenderChunkSolidTileInfo {
    readonly buffer: WebGLBuffer;
    vao: WebGLVertexArrayObject;
    vertexCount: number;
}
export interface RenderChunkRiverInfo {
    readonly baseVAO: WebGLVertexArrayObject;
    readonly baseVertexCount: number;
    readonly rockVAO: WebGLVertexArrayObject;
    readonly rockVertexCount: number;
    readonly highlightsVAO: WebGLVertexArrayObject;
    readonly highlightsVertexCount: number;
    readonly noiseVAO: WebGLVertexArrayObject;
    readonly noiseVertexCount: number;
    readonly transitionVAO: WebGLVertexArrayObject;
    readonly transitionVertexCount: number;
    /** IDs of all stepping stone groups resent in the render chunk */
    readonly riverSteppingStoneGroupIDs: ReadonlyArray<number>;
    readonly waterRocks: Array<WaterRockData>;
}
export interface RenderChunkAmbientOcclusionInfo {
    readonly vao: WebGLVertexArrayObject;
    readonly vertexCount: number;
}
export interface RenderChunkWallBorderInfo {
    readonly vao: WebGLVertexArrayObject;
    readonly vertexCount: number;
}
export interface RenderChunkDecorationInfo {
    readonly decorations: Array<DecorationInfo>;
}
export declare function getRenderChunkIndex(renderChunkX: number, renderChunkY: number): number;
export declare function getRenderChunkDecorationInfo(renderChunkX: number, renderChunkY: number): RenderChunkDecorationInfo;
export declare function getRenderChunkRiverInfo(renderChunkX: number, renderChunkY: number): RenderChunkRiverInfo | null;
export declare function getRenderChunkWallBorderInfo(renderChunkX: number, renderChunkY: number): RenderChunkWallBorderInfo;
export declare function getRenderChunkAmbientOcclusionInfo(renderChunkX: number, renderChunkY: number): RenderChunkAmbientOcclusionInfo | null;
export declare function createRenderChunks(decorations: ReadonlyArray<DecorationInfo>, waterRocks: ReadonlyArray<WaterRockData>, edgeRiverSteppingStones: ReadonlyArray<RiverSteppingStoneData>): void;
export declare function updateRenderChunkFromTileUpdate(tileUpdate: ServerTileUpdateData): void;
export declare function getRenderChunkMinTileX(renderChunkX: number): number;
export declare function getRenderChunkMaxTileX(renderChunkX: number): number;
export declare function getRenderChunkMinTileY(renderChunkY: number): number;
export declare function getRenderChunkMaxTileY(renderChunkY: number): number;

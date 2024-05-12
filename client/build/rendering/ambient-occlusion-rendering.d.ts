import { RenderChunkAmbientOcclusionInfo } from "./render-chunks";
export declare function createAmbientOcclusionShaders(): void;
export declare function calculateAmbientOcclusionInfo(renderChunkX: number, renderChunkY: number): RenderChunkAmbientOcclusionInfo | null;
export declare function renderAmbientOcclusion(): void;

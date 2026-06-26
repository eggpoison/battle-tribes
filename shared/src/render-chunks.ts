import { Settings } from "./settings.js";
import { assert } from "./utils.js";

export const enum RenderChunkVars {
   /** Width and height of a render chunk in tiles */
   RENDER_CHUNK_SIZE = 8,
   RENDER_CHUNK_UNITS = RENDER_CHUNK_SIZE * Settings.TILE_SIZE,
   WORLD_RENDER_CHUNK_SIZE = Settings.WORLD_SIZE_TILES / RENDER_CHUNK_SIZE,
   FULL_WORLD_RENDER_CHUNK_SIZE = Settings.FULL_WORLD_SIZE_TILES / RENDER_CHUNK_SIZE,
   RENDER_CHUNK_EDGE_GENERATION = ((Settings.EDGE_GENERATION_DISTANCE / RENDER_CHUNK_SIZE) + 0.99999) | 0
}

export function getRenderChunkX(renderChunkIdx: number): number {
   const renderChunkX = renderChunkIdx % (RenderChunkVars.WORLD_RENDER_CHUNK_SIZE + RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION * 2) - RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION;
   assert(renderChunkX >= -RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION && renderChunkX < RenderChunkVars.WORLD_RENDER_CHUNK_SIZE + RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION);
   return renderChunkX;
}

export function getRenderChunkY(renderChunkIdx: number): number {
   const renderChunkY = Math.floor(renderChunkIdx / (RenderChunkVars.WORLD_RENDER_CHUNK_SIZE + RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION * 2)) - RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION;
   assert(renderChunkY >= -RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION && renderChunkY < RenderChunkVars.WORLD_RENDER_CHUNK_SIZE + RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION);
   return renderChunkY;
}

export function getRenderChunkIndex(renderChunkX: number, renderChunkY: number): number {
   return (renderChunkY + RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION) * (RenderChunkVars.WORLD_RENDER_CHUNK_SIZE + RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION * 2) + renderChunkX + RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION;
}
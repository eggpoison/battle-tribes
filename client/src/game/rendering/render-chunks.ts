import { WaterRockData } from "battletribes-shared/client-server-types";
import { Settings } from "battletribes-shared/settings";
import { createTileRenderChunks, recalculateSolidTileRenderChunkData } from "./webgl/solid-tile-rendering";
import { calculateRiverRenderChunkData } from "./webgl/river-rendering";
import { calculateShadowInfo, TileShadowType } from "./webgl/tile-shadow-rendering";
import { calculateWallBorderInfo } from "./webgl/wall-border-rendering";
import Layer from "../Layer";
import { layers } from "../world";

/** Width and height of a render chunk in tiles */
export const RENDER_CHUNK_SIZE = 8;
export const RENDER_CHUNK_UNITS = RENDER_CHUNK_SIZE * Settings.TILE_SIZE;

export const WORLD_RENDER_CHUNK_SIZE = Settings.WORLD_SIZE_TILES / RENDER_CHUNK_SIZE;

export const RENDER_CHUNK_EDGE_GENERATION = Math.ceil(Settings.EDGE_GENERATION_DISTANCE / RENDER_CHUNK_SIZE);

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
   // @SQUEAM
   /** IDs of all stepping stone groups resent in the render chunk */
   // readonly riverSteppingStoneGroupIDs: ReadonlyArray<number>;
   readonly waterRocks: Array<WaterRockData>;
}

export interface RenderChunkTileShadowInfo {
   readonly vao: WebGLVertexArrayObject;
   readonly buffer: WebGLBuffer;
   // @Hack: make readonly
   vertexData: Float32Array;
}

export interface RenderChunkWallBorderInfo {
   readonly vao: WebGLVertexArrayObject;
   readonly buffer: WebGLBuffer;
   // @Hack: make readonly
   vertexData: Float32Array;
}

// @Hack
// @Speed: Polymorphism
let tileShadowInfoArrays = new Array<Record<TileShadowType, Array<RenderChunkTileShadowInfo | null>>>();
let wallBorderInfoArrays = new Array<Array<RenderChunkWallBorderInfo>>();

export function getRenderChunkIndex(renderChunkX: number, renderChunkY: number): number {
   const x = renderChunkX + RENDER_CHUNK_EDGE_GENERATION;
   const y = renderChunkY + RENDER_CHUNK_EDGE_GENERATION;
   return y * (WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION * 2) + x;
}

export function getRenderChunkRiverInfo(layer: Layer, renderChunkX: number, renderChunkY: number): RenderChunkRiverInfo | null {
   return layer.riverInfoArray[getRenderChunkIndex(renderChunkX, renderChunkY)];
}

export function getRenderChunkWallBorderInfo(layer: Layer, renderChunkX: number, renderChunkY: number): RenderChunkWallBorderInfo {
   // @Hack
   const layerIdx = layers.indexOf(layer);
   return wallBorderInfoArrays[layerIdx][getRenderChunkIndex(renderChunkX, renderChunkY)];
}

export function getRenderChunkTileShadowInfo(layer: Layer, renderChunkX: number, renderChunkY: number, tileShadowType: TileShadowType): RenderChunkTileShadowInfo | null {
   // @Hack
   const layerIdx = layers.indexOf(layer);
   return tileShadowInfoArrays[layerIdx][tileShadowType][getRenderChunkIndex(renderChunkX, renderChunkY)];
}

export function createRenderChunks(layer: Layer, waterRocks: ReadonlyArray<WaterRockData>): void {
   // @hack
   const layerIdx = layers.indexOf(layer);
   
   // Group water rocks
   // @Speed: Garbage collection
   let waterRocksChunked: Record<number, Record<number, Array<WaterRockData>>> = {};
   for (const waterRock of waterRocks) {
      const renderChunkX = Math.floor(waterRock.position[0] / RENDER_CHUNK_UNITS);
      const renderChunkY = Math.floor(waterRock.position[1] / RENDER_CHUNK_UNITS);
      if (!waterRocksChunked.hasOwnProperty(renderChunkX)) {
         waterRocksChunked[renderChunkX] = {};
      }
      if (!waterRocksChunked[renderChunkX].hasOwnProperty(renderChunkY)) {
         waterRocksChunked[renderChunkX][renderChunkY] = [];
      }
      waterRocksChunked[renderChunkX][renderChunkY].push(waterRock);
   }

   // @SQUEAM
   // // Group edge stepping stones
   // let edgeSteppingStonesChunked: Record<number, Record<number, Array<RiverSteppingStoneData>>> = {};
   // for (const steppingStone of riverSteppingStones) {
   //    if (positionIsInWorld(steppingStone.positionX, steppingStone.positionY)) {
   //       continue;
   //    }
      
   //    const size = RIVER_STEPPING_STONE_SIZES[steppingStone.size];
      
   //    const minRenderChunkX = Math.max(Math.min(Math.floor((steppingStone.positionX - size/2) / RENDER_CHUNK_UNITS), WORLD_RENDER_CHUNK_SIZE - 1), 0);
   //    const maxRenderChunkX = Math.max(Math.min(Math.floor((steppingStone.positionX + size/2) / RENDER_CHUNK_UNITS), WORLD_RENDER_CHUNK_SIZE - 1), 0);
   //    const minRenderChunkY = Math.max(Math.min(Math.floor((steppingStone.positionY - size/2) / RENDER_CHUNK_UNITS), WORLD_RENDER_CHUNK_SIZE - 1), 0);
   //    const maxRenderChunkY = Math.max(Math.min(Math.floor((steppingStone.positionY + size/2) / RENDER_CHUNK_UNITS), WORLD_RENDER_CHUNK_SIZE - 1), 0);
      
   //    for (let renderChunkX = minRenderChunkX; renderChunkX <= maxRenderChunkX; renderChunkX++) {
   //       for (let renderChunkY = minRenderChunkY; renderChunkY <= maxRenderChunkY; renderChunkY++) {
   //          if (!edgeSteppingStonesChunked.hasOwnProperty(renderChunkX)) {
   //             edgeSteppingStonesChunked[renderChunkX] = {};
   //          }
   //          if (!edgeSteppingStonesChunked[renderChunkX].hasOwnProperty(renderChunkY)) {
   //             edgeSteppingStonesChunked[renderChunkX][renderChunkY] = [];
   //          }
   //          if (!edgeSteppingStonesChunked[renderChunkX][renderChunkY].includes(steppingStone)) {
   //             edgeSteppingStonesChunked[renderChunkX][renderChunkY].push(steppingStone);
   //          }
   //       }
   //    }
   // }

   createTileRenderChunks(layer);

   // River info
   layer.riverInfoArray = [];
   for (let renderChunkY = -RENDER_CHUNK_EDGE_GENERATION; renderChunkY < WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION; renderChunkY++) {
      for (let renderChunkX = -RENDER_CHUNK_EDGE_GENERATION; renderChunkX < WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION; renderChunkX++) {
         const waterRocks = (waterRocksChunked.hasOwnProperty(renderChunkX) && waterRocksChunked[renderChunkX].hasOwnProperty(renderChunkY)) ? waterRocksChunked[renderChunkX][renderChunkY] : [];

         const data = calculateRiverRenderChunkData(layer, renderChunkX, renderChunkY, waterRocks);
         layer.riverInfoArray.push(data);
      }
   }

   // Tile shadow info
   const tileShadowInfoArray: Record<TileShadowType, Array<RenderChunkTileShadowInfo | null>> = {
      [TileShadowType.dropdownShadow]: [],
      [TileShadowType.wallShadow]: []
   };
   for (let renderChunkY = -RENDER_CHUNK_EDGE_GENERATION; renderChunkY < WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION; renderChunkY++) {
      for (let renderChunkX = -RENDER_CHUNK_EDGE_GENERATION; renderChunkX < WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION; renderChunkX++) {
         tileShadowInfoArray[TileShadowType.dropdownShadow].push(calculateShadowInfo(layer, renderChunkX, renderChunkY, TileShadowType.dropdownShadow));
         tileShadowInfoArray[TileShadowType.wallShadow].push(calculateShadowInfo(layer, renderChunkX, renderChunkY, TileShadowType.wallShadow));
      }
   }
   // @Speed: makes it unpacked
   tileShadowInfoArrays[layerIdx] = tileShadowInfoArray;

   // Wall border info
   const wallBorderInfoArray = [];
   for (let renderChunkY = -RENDER_CHUNK_EDGE_GENERATION; renderChunkY < WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION; renderChunkY++) {
      for (let renderChunkX = -RENDER_CHUNK_EDGE_GENERATION; renderChunkX < WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION; renderChunkX++) {
         const data = calculateWallBorderInfo(layer, renderChunkX, renderChunkY);
         wallBorderInfoArray.push(data);
      }
   }
   // @Speed: makes it unpacked
   wallBorderInfoArrays[layerIdx] = wallBorderInfoArray;
}

export function updateRenderChunkFromTileUpdate(tileIndex: number, layer: Layer): void {
   const tileX = tileIndex % Settings.WORLD_SIZE_TILES;
   const tileY = Math.floor(tileIndex / Settings.WORLD_SIZE_TILES);
   
   const renderChunkX = Math.floor(tileX / RENDER_CHUNK_SIZE);
   const renderChunkY = Math.floor(tileY / RENDER_CHUNK_SIZE);

   recalculateSolidTileRenderChunkData(layer, renderChunkX, renderChunkY);
}

export function getRenderChunkMinTileX(renderChunkX: number): number {
   let tileMinX = renderChunkX * RENDER_CHUNK_SIZE;
   if (tileMinX < -Settings.EDGE_GENERATION_DISTANCE) {
      tileMinX = Settings.EDGE_GENERATION_DISTANCE;
   }
   return tileMinX;
}

export function getRenderChunkMaxTileX(renderChunkX: number): number {
   let tileMaxX = (renderChunkX + 1) * RENDER_CHUNK_SIZE - 1;
   if (tileMaxX > Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) {
      tileMaxX = Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE;
   }
   return tileMaxX;
}

export function getRenderChunkMinTileY(renderChunkY: number): number {
   let tileMinY = renderChunkY * RENDER_CHUNK_SIZE;
   if (tileMinY < -Settings.EDGE_GENERATION_DISTANCE) {
      tileMinY = Settings.EDGE_GENERATION_DISTANCE;
   }
   return tileMinY;
}

export function getRenderChunkMaxTileY(renderChunkY: number): number {
   let tileMaxY = (renderChunkY + 1) * RENDER_CHUNK_SIZE - 1;
   if (tileMaxY > Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) {
      tileMaxY = Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE;
   }
   return tileMaxY;
}
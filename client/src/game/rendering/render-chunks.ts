import { Settings } from "../../../../shared/src/settings";
import { WaterRockData } from "../../../../shared/src/client-server-types";
import { assert, getTileX, getTileY } from "../../../../shared/src/utils";
import { createTileRenderChunks, updateRenderChunkTileData } from "./webgl/solid-tile-rendering";
import { calculateRiverRenderChunkData } from "./webgl/river-rendering";
import { calculateShadowInfo, recalculateTileShadows, TileShadowType } from "./webgl/tile-shadow-rendering";
import { calculateWallBorderInfo, recalculateWallBorders } from "./webgl/wall-border-rendering";
import Layer from "../Layer";
import { layers } from "../world";
import { TickSnapshot } from "../networking/snapshot-processing";
import { getSubtileX, getSubtileY } from "../../../../shared/src/subtiles";
import { PacketReader } from "../../../../shared/src/packets";
import { SubtileType, TileType } from "../../../../shared/src/tiles";
import { gl } from "../webgl";
import { Tile } from "../Tile";

export const enum RenderChunkVars {
   /** Width and height of a render chunk in tiles */
   RENDER_CHUNK_SIZE = 8,
   RENDER_CHUNK_UNITS = RENDER_CHUNK_SIZE * Settings.TILE_SIZE,
   WORLD_RENDER_CHUNK_SIZE = Settings.WORLD_SIZE_TILES / RENDER_CHUNK_SIZE,
   FULL_WORLD_RENDER_CHUNK_SIZE = Settings.FULL_WORLD_SIZE_TILES / RENDER_CHUNK_SIZE,
   RENDER_CHUNK_EDGE_GENERATION = ((Settings.EDGE_GENERATION_DISTANCE / RENDER_CHUNK_SIZE) + 0.99999) | 0
}

export const enum EdgeMarkerBit {
   top = 1,
   bottom = 2,
   left = 4,
   right = 8,
   topLeft = 16,
   topRight = 32,
   bottomLeft = 64,
   bottomRight = 128
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

export const enum EdgeType {
   floor,
   wall,
   dropdown
}

export type RenderChunkEdgeInfo = Array<number>;

export interface RenderChunkShadowInfo {
   readonly vao: WebGLVertexArrayObject;
   readonly buffer: WebGLBuffer;
   // @Hack: make readonly
   vertexData: Uint32Array;
   numElements: number;
}

export interface RenderChunkWallBorderInfo {
   readonly vao: WebGLVertexArrayObject;
   readonly buffer: WebGLBuffer;
   // @Hack: make readonly
   vertexData: Float32Array;
}

export type EdgeInfoArrays = Array<Record<EdgeType, ReadonlyArray<RenderChunkEdgeInfo>>>;

// @Hack
// @Speed: Polymorphism
const tileShadowInfoArrays: Array<Record<TileShadowType, Array<RenderChunkShadowInfo | null>>> = [];
let edgeInfoArrays: EdgeInfoArrays;

const wallBorderInfoArrays: Array<Array<RenderChunkWallBorderInfo | null>> = [];

export function getRenderChunkIndex(renderChunkX: number, renderChunkY: number): number {
   return (renderChunkY + RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION) * (RenderChunkVars.WORLD_RENDER_CHUNK_SIZE + RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION * 2) + renderChunkX + RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION;
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

export function getRenderChunkRiverInfo(layer: Layer, renderChunkX: number, renderChunkY: number): RenderChunkRiverInfo | null {
   return layer.riverInfoArray[getRenderChunkIndex(renderChunkX, renderChunkY)];
}

export function getRenderChunkWallBorderInfo(layer: Layer, renderChunkIdx: number): RenderChunkWallBorderInfo | null {
   // @Hack
   const layerIdx = layers.indexOf(layer);
   return wallBorderInfoArrays[layerIdx][renderChunkIdx];
}

export function setRenderChunkWallBorderInfo(layer: Layer, renderChunkIdx: number, data: RenderChunkWallBorderInfo): void {
   // @Hack
   const layerIdx = layers.indexOf(layer);
   assert(wallBorderInfoArrays[layerIdx][renderChunkIdx] === null);
   wallBorderInfoArrays[layerIdx][renderChunkIdx] = data;
}

export function getRenderChunkTileShadowInfo(layer: Layer, renderChunkIdx: number, tileShadowType: TileShadowType): RenderChunkShadowInfo | null {
   // @HACk not rly necessary only for finding 1 bug
   assert(renderChunkIdx >= 0 && renderChunkIdx < RenderChunkVars.FULL_WORLD_RENDER_CHUNK_SIZE * RenderChunkVars.FULL_WORLD_RENDER_CHUNK_SIZE);
   return tileShadowInfoArrays[layer.idx][tileShadowType][renderChunkIdx];
}

export function setRenderChunkTileShadowInfo(layer: Layer, renderChunkIdx: number, tileShadowType: TileShadowType, newInfo: RenderChunkShadowInfo | null): void {
   assert(getRenderChunkTileShadowInfo(layer, renderChunkIdx, tileShadowType) === null);
   tileShadowInfoArrays[layer.idx][tileShadowType][renderChunkIdx] = newInfo;
}

export function createRenderChunks(layer: Layer, waterRocks: ReadonlyArray<WaterRockData>, infoArrays: EdgeInfoArrays): void {
   edgeInfoArrays = infoArrays;
   const floorEdgeInfos = infoArrays[layer.idx][EdgeType.floor];
   const wallEdgeInfos = infoArrays[layer.idx][EdgeType.wall];
   const dropdownEdgeInfos = infoArrays[layer.idx][EdgeType.dropdown];
   
   // @hack
   const layerIdx = layers.indexOf(layer);
   
   // Group water rocks
   // @Speed: Garbage collection
   const waterRocksChunked = new Map<number, Array<WaterRockData>>();
   for (const waterRock of waterRocks) {
      const renderChunkX = Math.floor(waterRock.position[0] / RenderChunkVars.RENDER_CHUNK_UNITS);
      const renderChunkY = Math.floor(waterRock.position[1] / RenderChunkVars.RENDER_CHUNK_UNITS);
      const renderChunkIndex = getRenderChunkIndex(renderChunkX, renderChunkY);

      const waterRocks = waterRocksChunked.get(renderChunkIndex);
      if (waterRocks === undefined) {
         waterRocksChunked.set(renderChunkIndex, [waterRock]);
      } else {
         waterRocks.push(waterRock);
      }
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
   for (let renderChunkY = -RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION; renderChunkY < RenderChunkVars.WORLD_RENDER_CHUNK_SIZE + RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION; renderChunkY++) {
      for (let renderChunkX = -RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION; renderChunkX < RenderChunkVars.WORLD_RENDER_CHUNK_SIZE + RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION; renderChunkX++) {
         const renderChunkIndex = getRenderChunkIndex(renderChunkX, renderChunkY);
         const waterRocks = waterRocksChunked.get(renderChunkIndex);
         const data = waterRocks !== undefined ? calculateRiverRenderChunkData(layer, renderChunkX, renderChunkY, waterRocks) : null;
         layer.riverInfoArray.push(data);
      }
   }

   // Tile shadow info
   const dropdownShadowArray: Array<RenderChunkShadowInfo | null> = [];
   const wallShadowArray: Array<RenderChunkShadowInfo | null> = [];
   for (let idx = 0; idx < RenderChunkVars.FULL_WORLD_RENDER_CHUNK_SIZE * RenderChunkVars.FULL_WORLD_RENDER_CHUNK_SIZE; idx++) {
      wallShadowArray.push(calculateShadowInfo(floorEdgeInfos[idx]));
      dropdownShadowArray.push(calculateShadowInfo(dropdownEdgeInfos[idx]));
   }
   
   const tileShadowInfoArray: Record<TileShadowType, Array<RenderChunkShadowInfo | null>> = {
      [TileShadowType.dropdownShadow]: dropdownShadowArray,
      [TileShadowType.wallShadow]: wallShadowArray
   };

   assert(layerIdx === tileShadowInfoArrays.length);
   tileShadowInfoArrays.push(tileShadowInfoArray);

   // Wall border info
   const wallBorderInfoArray: Array<RenderChunkWallBorderInfo | null> = [];
   for (let idx = 0; idx < RenderChunkVars.FULL_WORLD_RENDER_CHUNK_SIZE * RenderChunkVars.FULL_WORLD_RENDER_CHUNK_SIZE; idx++) {
      wallBorderInfoArray.push(calculateWallBorderInfo(wallEdgeInfos[idx]));
   }

   assert(layerIdx === wallBorderInfoArrays.length);
   wallBorderInfoArrays.push(wallBorderInfoArray);
}

const getSubtileEdgeInfo = (edgeInfos: ReadonlyArray<RenderChunkEdgeInfo>, subtileIndex: number): RenderChunkEdgeInfo => {
   const subtileX = getSubtileX(subtileIndex);
   const subtileY = getSubtileY(subtileIndex);
   const renderChunkX = Math.floor(subtileX / 4 / RenderChunkVars.RENDER_CHUNK_SIZE);
   const renderChunkY = Math.floor(subtileY / 4 / RenderChunkVars.RENDER_CHUNK_SIZE);
   const idx = getRenderChunkIndex(renderChunkX, renderChunkY);
   return edgeInfos[idx];
}

const getTileEdgeInfo = (edgeInfos: ReadonlyArray<RenderChunkEdgeInfo>, tileIndex: number): RenderChunkEdgeInfo => {
   const tileX = getTileX(tileIndex);
   const tileY = getTileY(tileIndex);
   const renderChunkX = Math.floor(tileX / RenderChunkVars.RENDER_CHUNK_SIZE);
   const renderChunkY = Math.floor(tileY / RenderChunkVars.RENDER_CHUNK_SIZE);
   const idx = getRenderChunkIndex(renderChunkX, renderChunkY);
   return edgeInfos[idx];
}

const addEdge = (edgeInfo: RenderChunkEdgeInfo, index: number, marker: EdgeMarkerBit) => {
   for (let i = 0; i < edgeInfo.length; i++) {
      const data = edgeInfo[i];
      const currentIndex = data >> 8;
      if (currentIndex === index) {
         edgeInfo[i] |= marker;
         return;
      }
   }
   
   edgeInfo.push(index << 8 | marker);
}

const clearEdges = (edgeInfo: RenderChunkEdgeInfo, index: number) => {
   for (let i = 0; i < edgeInfo.length; i++) {
      const data = edgeInfo[i];
      const currentIndex = data >> 8;
      if (currentIndex === index) {
         edgeInfo.splice(i, 1);
         return;
      }
   }
}

const removeEdge = (edgeInfo: RenderChunkEdgeInfo, index: number, marker: EdgeMarkerBit) => {
   for (let i = 0; i < edgeInfo.length; i++) {
      const data = edgeInfo[i];
      const currentIndex = data >> 8;
      if (currentIndex === index) {
         edgeInfo[i] &= ~marker;
         return;
      }
   }

   throw new Error();
}

const addSubtileToEdgeInfosPartial = (wallSubtileTypes: Uint8Array, floorEdgeInfos: ReadonlyArray<RenderChunkEdgeInfo>, wallEdgeInfos: ReadonlyArray<RenderChunkEdgeInfo>, subtileIndex: number, subtileType: SubtileType): void => {
   const rowIdx = subtileIndex % Settings.FULL_WORLD_SIZE_SUBTILES;
   const hasLeft = rowIdx > 0; 
   const hasRight = rowIdx < Settings.FULL_WORLD_SIZE_SUBTILES - 1;
   const hasBottom = subtileIndex >= Settings.FULL_WORLD_SIZE_SUBTILES;

   // Left
   if (hasLeft) {
      const leftSubtileIndex = subtileIndex - 1;
      const leftSubtileType = wallSubtileTypes[leftSubtileIndex];
      if ((leftSubtileType === 0) !== (subtileType === 0)) {
         addEdge(getSubtileEdgeInfo(subtileType === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex), subtileIndex, EdgeMarkerBit.left);
         addEdge(getSubtileEdgeInfo(leftSubtileType === 0 ? floorEdgeInfos : wallEdgeInfos, leftSubtileIndex), leftSubtileIndex, EdgeMarkerBit.right);
      }
   }

   // Bottom
   if (hasBottom) {
      const bottomSubtileIndex = subtileIndex - Settings.FULL_WORLD_SIZE_SUBTILES;
      const bottomSubtileType = wallSubtileTypes[bottomSubtileIndex];
      if ((bottomSubtileType === 0) !== (subtileType === 0)) {
         addEdge(getSubtileEdgeInfo(subtileType === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex), subtileIndex, EdgeMarkerBit.bottom);
         addEdge(getSubtileEdgeInfo(bottomSubtileType === 0 ? floorEdgeInfos : wallEdgeInfos, bottomSubtileIndex), bottomSubtileIndex, EdgeMarkerBit.top);
      }
   }

   // Bottom left
   if (hasBottom && hasLeft) {
      const bottomLeftSubtileIndex = subtileIndex - Settings.FULL_WORLD_SIZE_SUBTILES - 1;
      const bottomLeftSubtileType = wallSubtileTypes[bottomLeftSubtileIndex];
      if ((bottomLeftSubtileType === 0) !== (subtileType === 0)) {
         addEdge(getSubtileEdgeInfo(subtileType === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex), subtileIndex, EdgeMarkerBit.bottomLeft);
         addEdge(getSubtileEdgeInfo(bottomLeftSubtileType === 0 ? floorEdgeInfos : wallEdgeInfos, bottomLeftSubtileIndex), bottomLeftSubtileIndex, EdgeMarkerBit.topRight);
      }
   }

   // Bottom right
   if (hasBottom && hasRight) {
      const bottomRightSubtileIndex = subtileIndex - Settings.FULL_WORLD_SIZE_SUBTILES + 1;
      const bottomRightSubtileType = wallSubtileTypes[bottomRightSubtileIndex];
      if ((bottomRightSubtileType === 0) !== (subtileType === 0)) {
         addEdge(getSubtileEdgeInfo(subtileType === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex), subtileIndex, EdgeMarkerBit.bottomRight);
         addEdge(getSubtileEdgeInfo(bottomRightSubtileType === 0 ? floorEdgeInfos : wallEdgeInfos, bottomRightSubtileIndex), bottomRightSubtileIndex, EdgeMarkerBit.topLeft);
      }
   }
}

const addSubtileToEdgeInfosComplete = (wallSubtileTypes: Uint8Array, floorEdgeInfos: ReadonlyArray<RenderChunkEdgeInfo>, wallEdgeInfos: ReadonlyArray<RenderChunkEdgeInfo>, subtileIndex: number, subtileType: SubtileType): void => {
   const rowIdx = subtileIndex % Settings.FULL_WORLD_SIZE_SUBTILES;

   const hasLeft = rowIdx > 0; 
   const hasRight = rowIdx < Settings.FULL_WORLD_SIZE_SUBTILES - 1;
   const hasBottom = subtileIndex >= Settings.FULL_WORLD_SIZE_SUBTILES;
   const hasTop = subtileIndex < Settings.FULL_WORLD_SIZE_SUBTILES * (Settings.FULL_WORLD_SIZE_SUBTILES - 1);

   // Left
   if (hasLeft) {
      const leftSubtileIndex = subtileIndex - 1;
      const leftSubtileType = wallSubtileTypes[leftSubtileIndex];
      if ((leftSubtileType === 0) !== (subtileType === 0)) {
         addEdge(getSubtileEdgeInfo(subtileType === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex), subtileIndex, EdgeMarkerBit.left);
         addEdge(getSubtileEdgeInfo(leftSubtileType === 0 ? floorEdgeInfos : wallEdgeInfos, leftSubtileIndex), leftSubtileIndex, EdgeMarkerBit.right);
      } else if (subtileType !== 0) {
         removeEdge(getSubtileEdgeInfo(floorEdgeInfos, subtileIndex), subtileIndex, EdgeMarkerBit.left);
         removeEdge(getSubtileEdgeInfo(wallEdgeInfos, leftSubtileIndex), leftSubtileIndex, EdgeMarkerBit.right);
      }
   }

   // Right
   if (hasRight) {
      const rightSubtileIndex = subtileIndex + 1;
      const rightSubtileType = wallSubtileTypes[rightSubtileIndex];
      if ((rightSubtileType === 0) !== (subtileType === 0)) {
         addEdge(getSubtileEdgeInfo(subtileType === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex), subtileIndex, EdgeMarkerBit.right);
         addEdge(getSubtileEdgeInfo(rightSubtileType === 0 ? floorEdgeInfos : wallEdgeInfos, rightSubtileIndex), rightSubtileIndex, EdgeMarkerBit.left);
      } else if (subtileType !== 0) {
         removeEdge(getSubtileEdgeInfo(floorEdgeInfos, subtileIndex), subtileIndex, EdgeMarkerBit.right);
         removeEdge(getSubtileEdgeInfo(wallEdgeInfos, rightSubtileIndex), rightSubtileIndex, EdgeMarkerBit.left);
      }
   }

   // Bottom
   if (hasBottom) {
      const bottomSubtileIndex = subtileIndex - Settings.FULL_WORLD_SIZE_SUBTILES;
      const bottomSubtileType = wallSubtileTypes[bottomSubtileIndex];
      if ((bottomSubtileType === 0) !== (subtileType === 0)) {
         addEdge(getSubtileEdgeInfo(subtileType === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex), subtileIndex, EdgeMarkerBit.bottom);
         addEdge(getSubtileEdgeInfo(bottomSubtileType === 0 ? floorEdgeInfos : wallEdgeInfos, bottomSubtileIndex), bottomSubtileIndex, EdgeMarkerBit.top);
      } else if (subtileType !== 0) {
         removeEdge(getSubtileEdgeInfo(floorEdgeInfos, subtileIndex), subtileIndex, EdgeMarkerBit.bottom);
         removeEdge(getSubtileEdgeInfo(wallEdgeInfos, bottomSubtileIndex), bottomSubtileIndex, EdgeMarkerBit.top);
      }
   }

   // Top
   if (hasTop) {
      const topSubtileIndex = subtileIndex + Settings.FULL_WORLD_SIZE_SUBTILES;
      const topSubtileType = wallSubtileTypes[topSubtileIndex];
      if ((topSubtileType === 0) !== (subtileType === 0)) {
         addEdge(getSubtileEdgeInfo(subtileType === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex), subtileIndex, EdgeMarkerBit.top);
         addEdge(getSubtileEdgeInfo(topSubtileType === 0 ? floorEdgeInfos : wallEdgeInfos, topSubtileIndex), topSubtileIndex, EdgeMarkerBit.bottom);
      } else if (subtileType !== 0) {
         removeEdge(getSubtileEdgeInfo(floorEdgeInfos, subtileIndex), subtileIndex, EdgeMarkerBit.top);
         removeEdge(getSubtileEdgeInfo(wallEdgeInfos, topSubtileIndex), topSubtileIndex, EdgeMarkerBit.bottom);
      }
   }

   // Bottom left
   if (hasBottom && hasLeft) {
      const bottomLeftSubtileIndex = subtileIndex - Settings.FULL_WORLD_SIZE_SUBTILES - 1;
      const bottomLeftSubtileType = wallSubtileTypes[bottomLeftSubtileIndex];
      if ((bottomLeftSubtileType === 0) !== (subtileType === 0)) {
         addEdge(getSubtileEdgeInfo(subtileType === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex), subtileIndex, EdgeMarkerBit.bottomLeft);
         addEdge(getSubtileEdgeInfo(bottomLeftSubtileType === 0 ? floorEdgeInfos : wallEdgeInfos, bottomLeftSubtileIndex), bottomLeftSubtileIndex, EdgeMarkerBit.topRight);
      } else if (subtileType !== 0) {
         removeEdge(getSubtileEdgeInfo(floorEdgeInfos, subtileIndex), subtileIndex, EdgeMarkerBit.bottomLeft);
         removeEdge(getSubtileEdgeInfo(wallEdgeInfos, bottomLeftSubtileIndex), bottomLeftSubtileIndex, EdgeMarkerBit.topRight);
      }
   }

   // Bottom right
   if (hasBottom && hasRight) {
      const bottomRightSubtileIndex = subtileIndex - Settings.FULL_WORLD_SIZE_SUBTILES + 1;
      const bottomRightSubtileType = wallSubtileTypes[bottomRightSubtileIndex];
      if ((bottomRightSubtileType === 0) !== (subtileType === 0)) {
         addEdge(getSubtileEdgeInfo(subtileType === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex), subtileIndex, EdgeMarkerBit.bottomRight);
         addEdge(getSubtileEdgeInfo(bottomRightSubtileType === 0 ? floorEdgeInfos : wallEdgeInfos, bottomRightSubtileIndex), bottomRightSubtileIndex, EdgeMarkerBit.topLeft);
      } else if (subtileType !== 0) {
         removeEdge(getSubtileEdgeInfo(floorEdgeInfos, subtileIndex), subtileIndex, EdgeMarkerBit.bottomRight);
         removeEdge(getSubtileEdgeInfo(wallEdgeInfos, bottomRightSubtileIndex), bottomRightSubtileIndex, EdgeMarkerBit.topLeft);
      }
   }

   // Top left
   if (hasTop && hasLeft) {
      const topLeftSubtileIndex = subtileIndex + Settings.FULL_WORLD_SIZE_SUBTILES - 1;
      const topLeftSubtileType = wallSubtileTypes[topLeftSubtileIndex];
      if ((topLeftSubtileType === 0) !== (subtileType === 0)) {
         addEdge(getSubtileEdgeInfo(subtileType === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex), subtileIndex, EdgeMarkerBit.topLeft);
         addEdge(getSubtileEdgeInfo(topLeftSubtileType === 0 ? floorEdgeInfos : wallEdgeInfos, topLeftSubtileIndex), topLeftSubtileIndex, EdgeMarkerBit.bottomRight);
      } else if (subtileType !== 0) {
         removeEdge(getSubtileEdgeInfo(floorEdgeInfos, subtileIndex), subtileIndex, EdgeMarkerBit.topLeft);
         removeEdge(getSubtileEdgeInfo(wallEdgeInfos, topLeftSubtileIndex), topLeftSubtileIndex, EdgeMarkerBit.bottomRight);
      }
   }

   // Topr gith
   if (hasTop && hasRight) {
      const topRightSubtileIndex = subtileIndex + Settings.FULL_WORLD_SIZE_SUBTILES + 1;
      const topRightSubtileType = wallSubtileTypes[topRightSubtileIndex];
      if ((topRightSubtileType === 0) !== (subtileType === 0)) {
         addEdge(getSubtileEdgeInfo(subtileType === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex), subtileIndex, EdgeMarkerBit.topRight);
         addEdge(getSubtileEdgeInfo(topRightSubtileType === 0 ? floorEdgeInfos : wallEdgeInfos, topRightSubtileIndex), topRightSubtileIndex, EdgeMarkerBit.bottomLeft);
      } else if (subtileType !== 0) {
         removeEdge(getSubtileEdgeInfo(floorEdgeInfos, subtileIndex), subtileIndex, EdgeMarkerBit.topRight);
         removeEdge(getSubtileEdgeInfo(wallEdgeInfos, topRightSubtileIndex), topRightSubtileIndex, EdgeMarkerBit.bottomLeft);
      }
   }
}

const removeSubtileFromEdgeInfos = (wallSubtileTypes: Uint8Array, floorEdgeInfos: ReadonlyArray<RenderChunkEdgeInfo>, wallEdgeInfos: ReadonlyArray<RenderChunkEdgeInfo>, subtileIndex: number): void => {
   const rowIdx = subtileIndex % Settings.FULL_WORLD_SIZE_SUBTILES;

   const hasLeft = rowIdx > 0;
   const hasRight = rowIdx < Settings.FULL_WORLD_SIZE_SUBTILES - 1;
   const hasBottom = subtileIndex >= Settings.FULL_WORLD_SIZE_SUBTILES;
   const hasTop = subtileIndex < Settings.FULL_WORLD_SIZE_SUBTILES * (Settings.FULL_WORLD_SIZE_SUBTILES - 1);

   clearEdges(getSubtileEdgeInfo(wallEdgeInfos, subtileIndex), subtileIndex);

   // Left
   if (hasLeft) {
      const leftSubtileIndex = subtileIndex - 1;
      const leftSubtileType = wallSubtileTypes[leftSubtileIndex];
      if (leftSubtileType === 0) {
         removeEdge(getSubtileEdgeInfo(floorEdgeInfos, leftSubtileIndex), leftSubtileIndex, EdgeMarkerBit.right);
      }
   }

   // Right
   if (hasRight) {
      const rightSubtileIndex = subtileIndex + 1;
      const rightSubtileType = wallSubtileTypes[rightSubtileIndex];
      if (rightSubtileType === 0) {
         removeEdge(getSubtileEdgeInfo(floorEdgeInfos, rightSubtileIndex), rightSubtileIndex, EdgeMarkerBit.left);
      }
   }

   // Top
   if (hasTop) {
      const topSubtileIndex = subtileIndex + Settings.FULL_WORLD_SIZE_SUBTILES;
      const topSubtileType = wallSubtileTypes[topSubtileIndex];
      if (topSubtileType === 0) {
         removeEdge(getSubtileEdgeInfo(floorEdgeInfos, topSubtileIndex), topSubtileIndex, EdgeMarkerBit.bottom);
      }
   }

   // Bottom
   if (hasBottom) {
      const bottomSubtileIndex = subtileIndex - Settings.FULL_WORLD_SIZE_SUBTILES;
      const bottomSubtileType = wallSubtileTypes[bottomSubtileIndex];
      if (bottomSubtileType === 0) {
         removeEdge(getSubtileEdgeInfo(floorEdgeInfos, bottomSubtileIndex), bottomSubtileIndex, EdgeMarkerBit.top);
      }
   }

   // Bottom left
   if (hasBottom && hasLeft) {
      const bottomLeftSubtileIndex = subtileIndex - Settings.FULL_WORLD_SIZE_SUBTILES - 1;
      const bottomLeftSubtileType = wallSubtileTypes[bottomLeftSubtileIndex];
      if (bottomLeftSubtileType === 0) {
         removeEdge(getSubtileEdgeInfo(floorEdgeInfos, bottomLeftSubtileIndex), bottomLeftSubtileIndex, EdgeMarkerBit.topRight);
      }
   }

   // Bottom right
   if (hasBottom && hasRight) {
      const bottomRightSubtileIndex = subtileIndex - Settings.FULL_WORLD_SIZE_SUBTILES + 1;
      const bottomRightSubtileType = wallSubtileTypes[bottomRightSubtileIndex];
      if (bottomRightSubtileType === 0) {
         removeEdge(getSubtileEdgeInfo(floorEdgeInfos, bottomRightSubtileIndex), bottomRightSubtileIndex, EdgeMarkerBit.topLeft);
      }
   }

   // Top left
   if (hasTop && hasLeft) {
      const topLeftSubtileIndex = subtileIndex + Settings.FULL_WORLD_SIZE_SUBTILES - 1;
      const topLeftSubtileType = wallSubtileTypes[topLeftSubtileIndex];
      if (topLeftSubtileType === 0) {
         removeEdge(getSubtileEdgeInfo(floorEdgeInfos, topLeftSubtileIndex), topLeftSubtileIndex, EdgeMarkerBit.bottomRight);
      }
   }

   // Top right
   if (hasTop && hasRight) {
      const topRightSubtileIndex = subtileIndex + Settings.FULL_WORLD_SIZE_SUBTILES + 1;
      const topRightSubtileType = wallSubtileTypes[topRightSubtileIndex];
      if (topRightSubtileType === 0) {
         removeEdge(getSubtileEdgeInfo(floorEdgeInfos, topRightSubtileIndex), topRightSubtileIndex, EdgeMarkerBit.bottomLeft);
      }
   }
}

export function addTileToEdgeInfos(tiles: Array<Tile>, dropdownEdgeInfos: ReadonlyArray<RenderChunkEdgeInfo>, tileIndex: number, tileType: TileType): void {
   const rowIdx = tileIndex % Settings.FULL_WORLD_SIZE_TILES;
   const hasLeft = rowIdx > 0;
   const hasRight = rowIdx < Settings.FULL_WORLD_SIZE_TILES - 1;
   const hasBottom = tileIndex >= Settings.FULL_WORLD_SIZE_TILES;

   // Left
   if (hasLeft) {
      const leftTileIndex = tileIndex - 1;
      const leftTileType = tiles[leftTileIndex].type;
      if ((leftTileType === TileType.dropdown) !== (tileType === TileType.dropdown)) {
         if (tileType === TileType.dropdown) {
            addEdge(getTileEdgeInfo(dropdownEdgeInfos, tileIndex), tileIndex, EdgeMarkerBit.left);
         } else {
            addEdge(getTileEdgeInfo(dropdownEdgeInfos, leftTileIndex), leftTileIndex, EdgeMarkerBit.right);
         }
      }
   }

   // Bottom
   if (hasBottom) {
      const bottomTileIndex = tileIndex - Settings.FULL_WORLD_SIZE_TILES;
      const bottomTileType = tiles[bottomTileIndex].type;
      if ((bottomTileType === TileType.dropdown) !== (tileType === TileType.dropdown)) {
         if (tileType === TileType.dropdown) {
            addEdge(getTileEdgeInfo(dropdownEdgeInfos, tileIndex), tileIndex, EdgeMarkerBit.bottom);
         } else {
            addEdge(getTileEdgeInfo(dropdownEdgeInfos, bottomTileIndex), bottomTileIndex, EdgeMarkerBit.top);
         }
      }
   }

   // Bottom left
   if (hasBottom && hasLeft) {
      const bottomLeftTileIndex = tileIndex - Settings.FULL_WORLD_SIZE_TILES - 1;
      const bottomLeftTileType = tiles[bottomLeftTileIndex].type;
      if ((bottomLeftTileType === TileType.dropdown) !== (tileType === TileType.dropdown)) {
         if (tileType === TileType.dropdown) {
            addEdge(getTileEdgeInfo(dropdownEdgeInfos, tileIndex), tileIndex, EdgeMarkerBit.bottomLeft);
         } else {
            addEdge(getTileEdgeInfo(dropdownEdgeInfos, bottomLeftTileIndex), bottomLeftTileIndex, EdgeMarkerBit.topRight);
         }
      }
   }

   // Bottom right
   if (hasBottom && hasRight) {
      const bottomRightTileIndex = tileIndex - Settings.FULL_WORLD_SIZE_TILES + 1;
      const bottomRightTileType = tiles[bottomRightTileIndex].type;
      if ((bottomRightTileType === TileType.dropdown) !== (tileType === TileType.dropdown)) {
         if (tileType === TileType.dropdown) {
            addEdge(getTileEdgeInfo(dropdownEdgeInfos, tileIndex), tileIndex, EdgeMarkerBit.bottomRight);
         } else {
            addEdge(getTileEdgeInfo(dropdownEdgeInfos, bottomRightTileIndex), bottomRightTileIndex, EdgeMarkerBit.topLeft);
         }
      }
   }
}

export function readInitialSubtileData(reader: PacketReader, wallSubtileTypes: Uint8Array, floorEdgeInfos: ReadonlyArray<RenderChunkEdgeInfo>, wallEdgeInfos: ReadonlyArray<RenderChunkEdgeInfo>): void {
   for (let subtileIndex = 0; subtileIndex < Settings.FULL_WORLD_SIZE_SUBTILES * Settings.FULL_WORLD_SIZE_SUBTILES; subtileIndex++) {
      const subtileType = reader.readNumber();
      wallSubtileTypes[subtileIndex] = subtileType;

      addSubtileToEdgeInfosPartial(wallSubtileTypes, floorEdgeInfos, wallEdgeInfos, subtileIndex, subtileType);
   }
}

export function processRenderChunkSubtileUpdates(snapshot: TickSnapshot): void {
   for (const layer of layers) {
      const dirtiedEdgeRenderChunks = new Set<number>();
      const dirtiedSubtileRenderChunks = new Set<number>();
      
      const floorEdgeInfos = edgeInfoArrays[layer.idx][EdgeType.floor];
      const wallEdgeInfos = edgeInfoArrays[layer.idx][EdgeType.wall];

      const layerSubtileUpdates = snapshot.wallSubtileUpdates.get(layer)!;
      for (const subtileUpdateData of layerSubtileUpdates) {
         const subtileIndex = subtileUpdateData.subtileIndex;
         const subtileType = subtileUpdateData.subtileType;

         layer.setSubtile(subtileIndex, subtileType, subtileUpdateData.damageTaken);

         const subtileX = getSubtileX(subtileIndex);
         const subtileY = getSubtileY(subtileIndex);

         const renderChunkX = Math.floor(subtileX / 4 / RenderChunkVars.RENDER_CHUNK_SIZE);
         const renderChunkY = Math.floor(subtileY / 4 / RenderChunkVars.RENDER_CHUNK_SIZE);
         const renderChunkIdx = getRenderChunkIndex(renderChunkX, renderChunkY);
         dirtiedSubtileRenderChunks.add(renderChunkIdx);

         if (subtileType === 0) {
            removeSubtileFromEdgeInfos(layer.wallSubtileTypes, floorEdgeInfos, wallEdgeInfos, subtileIndex);
         }
         addSubtileToEdgeInfosComplete(layer.wallSubtileTypes, floorEdgeInfos, wallEdgeInfos, subtileIndex, subtileType);
   
         const minRenderChunkX = Math.max(Math.floor((subtileX - 1) / 4 / RenderChunkVars.RENDER_CHUNK_SIZE), 0);
         const maxRenderChunkX = Math.min(Math.floor((subtileX + 1) / 4 / RenderChunkVars.RENDER_CHUNK_SIZE), RenderChunkVars.WORLD_RENDER_CHUNK_SIZE - 1);
         const minRenderChunkY = Math.max(Math.floor((subtileY - 1) / 4 / RenderChunkVars.RENDER_CHUNK_SIZE), 0);
         const maxRenderChunkY = Math.min(Math.floor((subtileY + 1) / 4 / RenderChunkVars.RENDER_CHUNK_SIZE), RenderChunkVars.WORLD_RENDER_CHUNK_SIZE - 1);
   
         // @Speed: We can probably batch these together
         for (let renderChunkY = minRenderChunkY; renderChunkY <= maxRenderChunkY; renderChunkY++) {
            for (let renderChunkX = minRenderChunkX; renderChunkX <= maxRenderChunkX; renderChunkX++) {
               const renderChunkIdx = getRenderChunkIndex(renderChunkX, renderChunkY);
               dirtiedEdgeRenderChunks.add(renderChunkIdx);
            }
         }
      }

      // Recalculate solid tile rendering
      for (const renderChunkIdx of dirtiedSubtileRenderChunks) {
         updateRenderChunkTileData(layer, renderChunkIdx, true);
      }

      // Recalculate render chunks
      for (const renderChunkIdx of dirtiedEdgeRenderChunks) {
         const floorEdgeInfo = floorEdgeInfos[renderChunkIdx];
         const wallEdgeInfo = wallEdgeInfos[renderChunkIdx];
         
         // @hack??1? because updateRenderChunkTileData requires it
         gl.bindVertexArray(null);

         recalculateTileShadows(layer, renderChunkIdx, floorEdgeInfo, TileShadowType.wallShadow);
         recalculateWallBorders(layer, renderChunkIdx, wallEdgeInfo);
      }
   }
}

export function getRenderChunkMinTileX(renderChunkX: number): number {
   let tileMinX = renderChunkX * RenderChunkVars.RENDER_CHUNK_SIZE;
   if (tileMinX < -Settings.EDGE_GENERATION_DISTANCE) {
      tileMinX = Settings.EDGE_GENERATION_DISTANCE;
   }
   return tileMinX;
}

export function getRenderChunkMaxTileX(renderChunkX: number): number {
   let tileMaxX = (renderChunkX + 1) * RenderChunkVars.RENDER_CHUNK_SIZE - 1;
   if (tileMaxX >= Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) {
      tileMaxX = Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE - 1;
   }
   return tileMaxX;
}

export function getRenderChunkMinTileY(renderChunkY: number): number {
   let tileMinY = renderChunkY * RenderChunkVars.RENDER_CHUNK_SIZE;
   if (tileMinY < -Settings.EDGE_GENERATION_DISTANCE) {
      tileMinY = Settings.EDGE_GENERATION_DISTANCE;
   }
   return tileMinY;
}

export function getRenderChunkMaxTileY(renderChunkY: number): number {
   let tileMaxY = (renderChunkY + 1) * RenderChunkVars.RENDER_CHUNK_SIZE - 1;
   if (tileMaxY >= Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) {
      tileMaxY = Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE - 1;
   }
   return tileMaxY;
}
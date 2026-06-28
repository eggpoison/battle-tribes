import { Settings } from "../../../../shared/src/settings";
import { WaterRockData } from "../../../../shared/src/client-server-types";
import { getTileX, getTileY, TileIndex, TileType } from "../../../../shared/src/tiles";
import { assert } from "../../../../shared/src/utils";
import { createSolidTileRenderChunkData, destroySolidTileRenderChunkData, updateRenderChunkTileData } from "./webgl/solid-tile-rendering";
import { createRiverRenderChunkData, destroyRiverRenderChunkData } from "./webgl/river-rendering";
import { createShadowInfo, destroyShadowInfo, recalculateTileShadows, TileShadowType } from "./webgl/tile-shadow-rendering";
import { createWallBorderInfo, destroyWallBorderInfo, recalculateWallBorders } from "./webgl/wall-border-rendering";
import Layer from "../Layer";
import { layers } from "../world";
import { TickSnapshot } from "../networking/snapshot-processing";
import { getSubtileX, getSubtileY, SubtileIndex } from "../../../../shared/src/subtiles";
import { Tile } from "../Tile";
import { IntermediateInitialisationInfo } from "../networking/packet-receiving";
import { getRenderChunkIndex, getRenderChunkX, getRenderChunkY, RenderChunkVars } from "../../../../shared/src/render-chunks";
import { addRenderChunkToVisibleArray } from "../camera";

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
   readonly baseBuffer: WebGLBuffer;
   readonly baseVertexCount: number;
   readonly rockVAO: WebGLVertexArrayObject;
   readonly rockBuffer: WebGLBuffer;
   readonly rockVertexCount: number;
   readonly highlightsVAO: WebGLVertexArrayObject;
   readonly highlightsBuffer: WebGLBuffer;
   readonly highlightsVertexCount: number;
   readonly noiseVAO: WebGLVertexArrayObject;
   readonly noiseBuffer: WebGLBuffer;
   readonly noiseVertexCount: number;
   readonly transitionVAO: WebGLVertexArrayObject;
   readonly transitionBuffer: WebGLBuffer;
   readonly transitionVertexCount: number;
}

export const enum EdgeType {
   floor,
   wall,
   dropdown
}

export type RenderChunkEdgeInfo = number[];

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

export function getRenderChunkRiverInfo(layer: Layer, renderChunkIdx: number): RenderChunkRiverInfo | undefined {
   return layer.riverInfoMap.get(renderChunkIdx);
}

export function getRenderChunkWallBorderInfo(layer: Layer, renderChunkIdx: number): RenderChunkWallBorderInfo | undefined {
   return layer.wallBorderInfoMap.get(renderChunkIdx);
}

export function setRenderChunkWallBorderInfo(layer: Layer, renderChunkIdx: number, data: RenderChunkWallBorderInfo): void {
   assert(!layer.wallBorderInfoMap.has(renderChunkIdx));
   layer.wallBorderInfoMap.set(renderChunkIdx, data);
}

export function getRenderChunkTileShadowInfo(layer: Layer, renderChunkIdx: number, tileShadowType: TileShadowType): RenderChunkShadowInfo | undefined {
   return layer.tileShadowInfoArrays[tileShadowType].get(renderChunkIdx);
}

export function setRenderChunkTileShadowInfo(layer: Layer, renderChunkIdx: number, tileShadowType: TileShadowType, newInfo: RenderChunkShadowInfo): void {
   assert(getRenderChunkTileShadowInfo(layer, renderChunkIdx, tileShadowType) === undefined);
   layer.tileShadowInfoArrays[tileShadowType].set(renderChunkIdx, newInfo);
}

export function clearRenderChunks(): void {
   for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      layer.riverInfoMap.clear();
      layer.groundTileInfoMap.clear();
      layer.wallTileInfoMap.clear();
      layer.edgeInfoMaps[EdgeType.floor].clear();
      layer.edgeInfoMaps[EdgeType.wall].clear();
      layer.edgeInfoMaps[EdgeType.dropdown].clear();
      layer.tileShadowInfoArrays[TileShadowType.dropdown].clear();
      layer.tileShadowInfoArrays[TileShadowType.wall].clear();
      layer.wallBorderInfoMap.clear();
   }
}

export function createLayerRenderChunks(layer: Layer, intermediateInfo: IntermediateInitialisationInfo): void {
   // @Hack
   const waterRockRenderChunks = layer.idx === 0 ? intermediateInfo.surfaceWaterRockRenderChunks : new Map<number, WaterRockData[]>();

   const minRenderChunkX = intermediateInfo.minRenderChunkX;
   const maxRenderChunkX = intermediateInfo.maxRenderChunkX;
   const minRenderChunkY = intermediateInfo.minRenderChunkY;
   const maxRenderChunkY = intermediateInfo.maxRenderChunkY;
   
   for (let renderChunkY = minRenderChunkY; renderChunkY <= maxRenderChunkY; renderChunkY++) {
      for (let renderChunkX = minRenderChunkX; renderChunkX <= maxRenderChunkX; renderChunkX++) {
         const renderChunkIndex = getRenderChunkIndex(renderChunkX, renderChunkY);
         
         const waterRocks = waterRockRenderChunks.get(renderChunkIndex);
         createRenderChunk(layer, renderChunkIndex, waterRocks);

         // @Hack! so its only added once
         if (layer.idx === 0) {
            addRenderChunkToVisibleArray(renderChunkIndex);
         }
      }
   }
}

export function createRenderChunk(layer: Layer, renderChunkIndex: number, waterRocks: readonly WaterRockData[] | undefined): void {
   const renderChunkX = getRenderChunkX(renderChunkIndex);
   const renderChunkY = getRenderChunkY(renderChunkIndex);
   
   // Solid tile info
   layer.groundTileInfoMap.set(renderChunkIndex, createSolidTileRenderChunkData(layer, renderChunkX, renderChunkY, false));
   layer.wallTileInfoMap.set(renderChunkIndex, createSolidTileRenderChunkData(layer, renderChunkX, renderChunkY, true));

   // River info
   if (waterRocks !== undefined) {
      const riverInfo = createRiverRenderChunkData(layer, renderChunkX, renderChunkY, waterRocks);
      if (riverInfo !== null) {
         layer.riverInfoMap.set(renderChunkIndex, riverInfo);
      }
   }

   const edgeInfoMaps = layer.edgeInfoMaps;

   // Wall border info
   const wallEdgeInfo = edgeInfoMaps[EdgeType.wall].get(renderChunkIndex);
   if (wallEdgeInfo !== undefined) {
      const wallBorderInfo = createWallBorderInfo(wallEdgeInfo);
      if (wallBorderInfo !== null) {
         layer.wallBorderInfoMap.set(renderChunkIndex, wallBorderInfo);
      }
   }

   // Tile shadow info
   const floorEdgeInfo = edgeInfoMaps[EdgeType.floor].get(renderChunkIndex);
   if (floorEdgeInfo !== undefined) {
      const shadowInfo = createShadowInfo(floorEdgeInfo);
      if (shadowInfo !== null) {
         const wallShadowInfoMap = layer.tileShadowInfoArrays[TileShadowType.wall];
         wallShadowInfoMap.set(renderChunkIndex, shadowInfo);
      }
   }
   const dropdownEdgeInfo = edgeInfoMaps[EdgeType.dropdown].get(renderChunkIndex);
   if (dropdownEdgeInfo !== undefined) {
      const shadowInfo = createShadowInfo(dropdownEdgeInfo);
      if (shadowInfo !== null) {
         const dropdownShadowInfoMap = layer.tileShadowInfoArrays[TileShadowType.dropdown];
         dropdownShadowInfoMap.set(renderChunkIndex, shadowInfo);
      }
   }
}

export function destroyRenderChunk(layer: Layer, renderChunkIndex: number): void {
   // Solid tile info
   destroySolidTileRenderChunkData(layer.groundTileInfoMap.get(renderChunkIndex)!);
   layer.groundTileInfoMap.delete(renderChunkIndex);
   destroySolidTileRenderChunkData(layer.wallTileInfoMap.get(renderChunkIndex)!);
   layer.wallTileInfoMap.delete(renderChunkIndex);

   // River info
   const riverInfo = layer.riverInfoMap.get(renderChunkIndex);
   if (riverInfo !== undefined) {
      destroyRiverRenderChunkData(riverInfo);
      layer.riverInfoMap.delete(renderChunkIndex);
   }

   // Wall border info
   const wallBorderInfo = layer.wallBorderInfoMap.get(renderChunkIndex);
   if (wallBorderInfo !== undefined) {
      destroyWallBorderInfo(wallBorderInfo);
      layer.wallBorderInfoMap.delete(renderChunkIndex);
   }

   // Floor shadow info
   const wallShadowInfoMap = layer.tileShadowInfoArrays[TileShadowType.wall];
   const floorShadowInfo = wallShadowInfoMap.get(renderChunkIndex);
   if (floorShadowInfo !== undefined) {
      destroyShadowInfo(floorShadowInfo);
      wallShadowInfoMap.delete(renderChunkIndex);
   }

   // Dropdown shadow info
   const dropdownShadowInfoMap = layer.tileShadowInfoArrays[TileShadowType.dropdown];
   const dropdownShadowInfo = dropdownShadowInfoMap.get(renderChunkIndex);
   if (dropdownShadowInfo !== undefined) {
      destroyShadowInfo(dropdownShadowInfo);
      dropdownShadowInfoMap.delete(renderChunkIndex);
   }
}

const getTileEdgeInfo = (edgeInfos: Map<TileIndex, RenderChunkEdgeInfo>, index: TileIndex): RenderChunkEdgeInfo | undefined => {
   const tileX = getTileX(index);
   const tileY = getTileY(index);
   const renderChunkX = Math.floor(tileX / RenderChunkVars.RENDER_CHUNK_SIZE);
   const renderChunkY = Math.floor(tileY / RenderChunkVars.RENDER_CHUNK_SIZE);
   const idx = getRenderChunkIndex(renderChunkX, renderChunkY);
   return edgeInfos.get(idx);
}

const getSubtileEdgeInfo = (edgeInfos: Map<SubtileIndex, RenderChunkEdgeInfo>, subtileIndex: SubtileIndex): RenderChunkEdgeInfo | undefined => {
   const subtileX = getSubtileX(subtileIndex);
   const subtileY = getSubtileY(subtileIndex);
   const renderChunkX = Math.floor(subtileX / 4 / RenderChunkVars.RENDER_CHUNK_SIZE);
   const renderChunkY = Math.floor(subtileY / 4 / RenderChunkVars.RENDER_CHUNK_SIZE);
   const idx = getRenderChunkIndex(renderChunkX, renderChunkY);
   return edgeInfos.get(idx);
}

const addTileEdge = (edgeInfos: Map<TileIndex, RenderChunkEdgeInfo>, tileIndex: TileIndex, marker: EdgeMarkerBit) => {
   let edgeInfo = getTileEdgeInfo(edgeInfos, tileIndex);

   // If the edge info hasn't been created yet, create it
   if (edgeInfo === undefined) {
      edgeInfo = [];
      edgeInfos.set(tileIndex, edgeInfo);
   }
   
   for (let i = 0; i < edgeInfo.length; i++) {
      const data = edgeInfo[i];
      const currentIndex = data >> 8;
      if (currentIndex === tileIndex) {
         // @TEMPORARY
         // assert((data & marker) === 0);
         edgeInfo[i] |= marker;
         return;
      }
   }
   
   edgeInfo.push(tileIndex << 8 | marker);
}

const addSubtileEdge = (edgeInfos: Map<SubtileIndex, RenderChunkEdgeInfo>, subtileIndex: SubtileIndex, marker: EdgeMarkerBit) => {
   let edgeInfo = getSubtileEdgeInfo(edgeInfos, subtileIndex);

   // If the edge info hasn't been created yet, create it
   if (edgeInfo === undefined) {
      edgeInfo = [];
      edgeInfos.set(subtileIndex, edgeInfo);
   }
   
   for (let i = 0; i < edgeInfo.length; i++) {
      const data = edgeInfo[i];
      const currentIndex = data >> 8;
      if (currentIndex === subtileIndex) {
         // @TEMPORARY
         // assert((data & marker) === 0);
         edgeInfo[i] |= marker;
         return;
      }
   }
   
   edgeInfo.push(subtileIndex << 8 | marker);
}

const clearSubtileEdges = (edgeInfos: Map<SubtileIndex, RenderChunkEdgeInfo>, subtileIndex: SubtileIndex) => {
   const edgeInfo = getSubtileEdgeInfo(edgeInfos, subtileIndex)!;
   for (let i = 0; i < edgeInfo.length; i++) {
      const data = edgeInfo[i];
      const currentIndex = data >> 8;
      if (currentIndex === subtileIndex) {
         // assert((data & 0xFF) !== 0);
         edgeInfo.splice(i, 1);
         return;
      }
   }

   // Ok to not find any edges to clear, as if this is called in the middle of a clump of walls then that will be the case.
}

const removeSubtileEdge = (edgeInfos: Map<SubtileIndex, RenderChunkEdgeInfo>, subtileIndex: SubtileIndex, marker: EdgeMarkerBit) => {
   const edgeInfo = getSubtileEdgeInfo(edgeInfos, subtileIndex)!;
   for (let i = 0; i < edgeInfo.length; i++) {
      const data = edgeInfo[i];
      const currentIndex = data >> 8;
      if (currentIndex === subtileIndex) {
         // assert((data & marker) !== 0);
         if ((data & 0xFF) === marker) {
            edgeInfo.splice(i, 1);
         } else {
            edgeInfo[i] &= ~marker;
         }
         return;
      }
   }

   // assert(false);
}

export function addSubtileToEdgeInfosPartial(wallSubtileDatas: Map<SubtileIndex, number>, floorEdgeInfos: Map<number, RenderChunkEdgeInfo>, wallEdgeInfos: Map<number, RenderChunkEdgeInfo>, subtileIndex: number, subtileData: number): void {
   const rowIdx = subtileIndex % Settings.FULL_WORLD_SIZE_SUBTILES;

   const hasLeft = rowIdx > 0;
   const hasRight = rowIdx < Settings.FULL_WORLD_SIZE_SUBTILES - 1;
   const hasBottom = subtileIndex >= Settings.FULL_WORLD_SIZE_SUBTILES;

   // Left
   if (hasLeft) {
      const leftSubtileIndex = subtileIndex - 1;
      const leftSubtileData = wallSubtileDatas.get(leftSubtileIndex);
      if (leftSubtileData !== undefined && (leftSubtileData === 0) !== (subtileData === 0)) {
         addSubtileEdge(subtileData === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex, EdgeMarkerBit.left);
         addSubtileEdge(leftSubtileData === 0 ? floorEdgeInfos : wallEdgeInfos, leftSubtileIndex, EdgeMarkerBit.right);
      }
   }

   // Bottom
   if (hasBottom) {
      const bottomSubtileIndex = subtileIndex - Settings.FULL_WORLD_SIZE_SUBTILES;
      const bottomSubtileData = wallSubtileDatas.get(bottomSubtileIndex);
      if (bottomSubtileData !== undefined && (bottomSubtileData === 0) !== (subtileData === 0)) {
         addSubtileEdge(subtileData === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex, EdgeMarkerBit.bottom);
         addSubtileEdge(bottomSubtileData === 0 ? floorEdgeInfos : wallEdgeInfos, bottomSubtileIndex, EdgeMarkerBit.top);
      }
   }

   // Bottom left
   if (hasBottom && hasLeft) {
      const bottomLeftSubtileIndex = subtileIndex - Settings.FULL_WORLD_SIZE_SUBTILES - 1;
      const bottomLeftSubtileData = wallSubtileDatas.get(bottomLeftSubtileIndex);
      if (bottomLeftSubtileData !== undefined && (bottomLeftSubtileData === 0) !== (subtileData === 0)) {
         addSubtileEdge(subtileData === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex, EdgeMarkerBit.bottomLeft);
         addSubtileEdge(bottomLeftSubtileData === 0 ? floorEdgeInfos : wallEdgeInfos, bottomLeftSubtileIndex, EdgeMarkerBit.topRight);
      }
   }

   // Bottom right
   if (hasBottom && hasRight) {
      const bottomRightSubtileIndex = subtileIndex - Settings.FULL_WORLD_SIZE_SUBTILES + 1;
      const bottomRightSubtileData = wallSubtileDatas.get(bottomRightSubtileIndex);
      if (bottomRightSubtileData !== undefined && (bottomRightSubtileData === 0) !== (subtileData === 0)) {
         addSubtileEdge(subtileData === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex, EdgeMarkerBit.bottomRight);
         addSubtileEdge(bottomRightSubtileData === 0 ? floorEdgeInfos : wallEdgeInfos, bottomRightSubtileIndex, EdgeMarkerBit.topLeft);
      }
   }
}

const addSubtileToEdgeInfos = (wallSubtileDatas: Map<SubtileIndex, number>, floorEdgeInfos: Map<number, RenderChunkEdgeInfo>, wallEdgeInfos: Map<number, RenderChunkEdgeInfo>, subtileIndex: number, subtileData: number): void => {
   const rowIdx = subtileIndex % Settings.FULL_WORLD_SIZE_SUBTILES;

   const hasLeft = rowIdx > 0;
   const hasRight = rowIdx < Settings.FULL_WORLD_SIZE_SUBTILES - 1;
   const hasBottom = subtileIndex >= Settings.FULL_WORLD_SIZE_SUBTILES;
   const hasTop = subtileIndex < Settings.FULL_WORLD_SIZE_SUBTILES * (Settings.FULL_WORLD_SIZE_SUBTILES - 1);

   // Left
   if (hasLeft) {
      const leftSubtileIndex = subtileIndex - 1;
      const leftSubtileData = wallSubtileDatas.get(leftSubtileIndex);
      if (leftSubtileData !== undefined) {
         if ((leftSubtileData === 0) !== (subtileData === 0)) {
            addSubtileEdge(subtileData === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex, EdgeMarkerBit.left);
            addSubtileEdge(leftSubtileData === 0 ? floorEdgeInfos : wallEdgeInfos, leftSubtileIndex, EdgeMarkerBit.right);
         } else if (subtileData !== 0) {
            removeSubtileEdge(floorEdgeInfos, subtileIndex, EdgeMarkerBit.left);
            removeSubtileEdge(wallEdgeInfos, leftSubtileIndex, EdgeMarkerBit.right);
         }
      }
   }

   // Right
   if (hasRight) {
      const rightSubtileIndex = subtileIndex + 1;
      const rightSubtileData = wallSubtileDatas.get(rightSubtileIndex);
      if (rightSubtileData !== undefined) {
         if ((rightSubtileData === 0) !== (subtileData === 0)) {
            addSubtileEdge(subtileData === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex, EdgeMarkerBit.right);
            addSubtileEdge(rightSubtileData === 0 ? floorEdgeInfos : wallEdgeInfos, rightSubtileIndex, EdgeMarkerBit.left);
         } else if (subtileData !== 0) {
            removeSubtileEdge(floorEdgeInfos, subtileIndex, EdgeMarkerBit.right);
            removeSubtileEdge(wallEdgeInfos, rightSubtileIndex, EdgeMarkerBit.left);
         }
      }
   }

   // Bottom
   if (hasBottom) {
      const bottomSubtileIndex = subtileIndex - Settings.FULL_WORLD_SIZE_SUBTILES;
      const bottomSubtileData = wallSubtileDatas.get(bottomSubtileIndex);
      if (bottomSubtileData !== undefined) {
         if ((bottomSubtileData === 0) !== (subtileData === 0)) {
            addSubtileEdge(subtileData === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex, EdgeMarkerBit.bottom);
            addSubtileEdge(bottomSubtileData === 0 ? floorEdgeInfos : wallEdgeInfos, bottomSubtileIndex, EdgeMarkerBit.top);
         } else if (subtileData !== 0) {
            removeSubtileEdge(floorEdgeInfos, subtileIndex, EdgeMarkerBit.bottom);
            removeSubtileEdge(wallEdgeInfos, bottomSubtileIndex, EdgeMarkerBit.top);
         }
      }
   }

   // Top
   if (hasTop) {
      const topSubtileIndex = subtileIndex + Settings.FULL_WORLD_SIZE_SUBTILES;
      const topSubtileData = wallSubtileDatas.get(topSubtileIndex);
      if (topSubtileData !== undefined) {
         if ((topSubtileData === 0) !== (subtileData === 0)) {
            addSubtileEdge(subtileData === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex, EdgeMarkerBit.top);
            addSubtileEdge(topSubtileData === 0 ? floorEdgeInfos : wallEdgeInfos, topSubtileIndex, EdgeMarkerBit.bottom);
         } else if (subtileData !== 0) {
            removeSubtileEdge(floorEdgeInfos, subtileIndex, EdgeMarkerBit.top);
            removeSubtileEdge(wallEdgeInfos, topSubtileIndex, EdgeMarkerBit.bottom);
         }
      }
   }

   // Bottom left
   if (hasBottom && hasLeft) {
      const bottomLeftSubtileIndex = subtileIndex - Settings.FULL_WORLD_SIZE_SUBTILES - 1;
      const bottomLeftSubtileData = wallSubtileDatas.get(bottomLeftSubtileIndex);
      if (bottomLeftSubtileData !== undefined) {
         if ((bottomLeftSubtileData === 0) !== (subtileData === 0)) {
            addSubtileEdge(subtileData === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex, EdgeMarkerBit.bottomLeft);
            addSubtileEdge(bottomLeftSubtileData === 0 ? floorEdgeInfos : wallEdgeInfos, bottomLeftSubtileIndex, EdgeMarkerBit.topRight);
         } else if (subtileData !== 0) {
            removeSubtileEdge(floorEdgeInfos, subtileIndex, EdgeMarkerBit.bottomLeft);
            removeSubtileEdge(wallEdgeInfos, bottomLeftSubtileIndex, EdgeMarkerBit.topRight);
         }
      }
   }

   // Bottom right
   if (hasBottom && hasRight) {
      const bottomRightSubtileIndex = subtileIndex - Settings.FULL_WORLD_SIZE_SUBTILES + 1;
      const bottomRightSubtileData = wallSubtileDatas.get(bottomRightSubtileIndex);
      if (bottomRightSubtileData !== undefined) {
         if ((bottomRightSubtileData === 0) !== (subtileData === 0)) {
            addSubtileEdge(subtileData === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex, EdgeMarkerBit.bottomRight);
            addSubtileEdge(bottomRightSubtileData === 0 ? floorEdgeInfos : wallEdgeInfos, bottomRightSubtileIndex, EdgeMarkerBit.topLeft);
         } else if (subtileData !== 0) {
            removeSubtileEdge(floorEdgeInfos, subtileIndex, EdgeMarkerBit.bottomRight);
            removeSubtileEdge(wallEdgeInfos, bottomRightSubtileIndex, EdgeMarkerBit.topLeft);
         }
      }
   }

   // Top left
   if (hasTop && hasLeft) {
      const topLeftSubtileIndex = subtileIndex + Settings.FULL_WORLD_SIZE_SUBTILES - 1;
      const topLeftSubtileData = wallSubtileDatas.get(topLeftSubtileIndex);
      if (topLeftSubtileData !== undefined) {
         if ((topLeftSubtileData === 0) !== (subtileData === 0)) {
            addSubtileEdge(subtileData === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex, EdgeMarkerBit.topLeft);
            addSubtileEdge(topLeftSubtileData === 0 ? floorEdgeInfos : wallEdgeInfos, topLeftSubtileIndex, EdgeMarkerBit.bottomRight);
         } else if (subtileData !== 0) {
            removeSubtileEdge(floorEdgeInfos, subtileIndex, EdgeMarkerBit.topLeft);
            removeSubtileEdge(wallEdgeInfos, topLeftSubtileIndex, EdgeMarkerBit.bottomRight);
         }
      }
   }

   // Top right
   if (hasTop && hasRight) {
      const topRightSubtileIndex = subtileIndex + Settings.FULL_WORLD_SIZE_SUBTILES + 1;
      const topRightSubtileData = wallSubtileDatas.get(topRightSubtileIndex);
      if (topRightSubtileData !== undefined) {
         if ((topRightSubtileData === 0) !== (subtileData === 0)) {
            addSubtileEdge(subtileData === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex, EdgeMarkerBit.topRight);
            addSubtileEdge(topRightSubtileData === 0 ? floorEdgeInfos : wallEdgeInfos, topRightSubtileIndex, EdgeMarkerBit.bottomLeft);
         } else if (subtileData !== 0) {
            removeSubtileEdge(floorEdgeInfos, subtileIndex, EdgeMarkerBit.topRight);
            removeSubtileEdge(wallEdgeInfos, topRightSubtileIndex, EdgeMarkerBit.bottomLeft);
         }
      }
   }
}

const removeSubtileFromEdgeInfos = (wallSubtileDatas: Map<SubtileIndex, number>, floorEdgeInfos: Map<number, RenderChunkEdgeInfo>, wallEdgeInfos: Map<number, RenderChunkEdgeInfo>, subtileIndex: number): void => {
   const rowIdx = subtileIndex % Settings.FULL_WORLD_SIZE_SUBTILES;

   const hasLeft = rowIdx > 0 && wallSubtileDatas.has(subtileIndex - 1);
   const hasRight = rowIdx < Settings.FULL_WORLD_SIZE_SUBTILES - 1 && wallSubtileDatas.has(subtileIndex + 1);
   const hasBottom = subtileIndex >= Settings.FULL_WORLD_SIZE_SUBTILES && wallSubtileDatas.has(subtileIndex - Settings.FULL_WORLD_SIZE_SUBTILES);
   const hasTop = subtileIndex < Settings.FULL_WORLD_SIZE_SUBTILES * (Settings.FULL_WORLD_SIZE_SUBTILES - 1) && wallSubtileDatas.has(subtileIndex + Settings.FULL_WORLD_SIZE_SUBTILES);

   clearSubtileEdges(wallEdgeInfos, subtileIndex);

   // Left
   if (hasLeft) {
      const leftSubtileIndex = subtileIndex - 1;
      const leftSubtileData = wallSubtileDatas.get(leftSubtileIndex)!;
      if (leftSubtileData === 0) {
         removeSubtileEdge(floorEdgeInfos, leftSubtileIndex, EdgeMarkerBit.right);
      }
   }

   // Right
   if (hasRight) {
      const rightSubtileIndex = subtileIndex + 1;
      const rightSubtileData = wallSubtileDatas.get(rightSubtileIndex)!;
      if (rightSubtileData === 0) {
         removeSubtileEdge(floorEdgeInfos, rightSubtileIndex, EdgeMarkerBit.left);
      }
   }

   // Top
   if (hasTop) {
      const topSubtileIndex = subtileIndex + Settings.FULL_WORLD_SIZE_SUBTILES;
      const topSubtileData = wallSubtileDatas.get(topSubtileIndex)!;
      if (topSubtileData === 0) {
         removeSubtileEdge(floorEdgeInfos, topSubtileIndex, EdgeMarkerBit.bottom);
      }
   }

   // Bottom
   if (hasBottom) {
      const bottomSubtileIndex = subtileIndex - Settings.FULL_WORLD_SIZE_SUBTILES;
      const bottomSubtileData = wallSubtileDatas.get(bottomSubtileIndex)!;
      if (bottomSubtileData === 0) {
         removeSubtileEdge(floorEdgeInfos, bottomSubtileIndex, EdgeMarkerBit.top);
      }
   }

   // Bottom left
   if (hasBottom && hasLeft) {
      const bottomLeftSubtileIndex = subtileIndex - Settings.FULL_WORLD_SIZE_SUBTILES - 1;
      const bottomLeftSubtileData = wallSubtileDatas.get(bottomLeftSubtileIndex)!;
      if (bottomLeftSubtileData === 0) {
         removeSubtileEdge(floorEdgeInfos, bottomLeftSubtileIndex, EdgeMarkerBit.topRight);
      }
   }

   // Bottom right
   if (hasBottom && hasRight) {
      const bottomRightSubtileIndex = subtileIndex - Settings.FULL_WORLD_SIZE_SUBTILES + 1;
      const bottomRightSubtileData = wallSubtileDatas.get(bottomRightSubtileIndex)!;
      if (bottomRightSubtileData === 0) {
         removeSubtileEdge(floorEdgeInfos, bottomRightSubtileIndex, EdgeMarkerBit.topLeft);
      }
   }

   // Top left
   if (hasTop && hasLeft) {
      const topLeftSubtileIndex = subtileIndex + Settings.FULL_WORLD_SIZE_SUBTILES - 1;
      const topLeftSubtileData = wallSubtileDatas.get(topLeftSubtileIndex)!;
      if (topLeftSubtileData === 0) {
         removeSubtileEdge(floorEdgeInfos, topLeftSubtileIndex, EdgeMarkerBit.bottomRight);
      }
   }

   // Top right
   if (hasTop && hasRight) {
      const topRightSubtileIndex = subtileIndex + Settings.FULL_WORLD_SIZE_SUBTILES + 1;
      const topRightSubtileData = wallSubtileDatas.get(topRightSubtileIndex)!;
      if (topRightSubtileData === 0) {
         removeSubtileEdge(floorEdgeInfos, topRightSubtileIndex, EdgeMarkerBit.bottomLeft);
      }
   }
}

export function addTileToEdgeInfos(tiles: Map<TileIndex, Tile>, dropdownEdgeInfos: Map<number, RenderChunkEdgeInfo>, tileIndex: number, tileType: TileType): void {
   const rowIdx = tileIndex % Settings.FULL_WORLD_SIZE_TILES;

   const hasLeft = rowIdx > 0;
   const hasRight = rowIdx < Settings.FULL_WORLD_SIZE_TILES - 1;
   const hasBottom = tileIndex >= Settings.FULL_WORLD_SIZE_TILES;

   // Left
   if (hasLeft) {
      const leftTileIndex = tileIndex - 1;
      const leftTile = tiles.get(leftTileIndex);
      if (leftTile !== undefined) {
         const leftTileType = leftTile.type;
         if ((leftTileType === TileType.dropdown) !== (tileType === TileType.dropdown)) {
            if (tileType === TileType.dropdown) {
               addTileEdge(dropdownEdgeInfos, tileIndex, EdgeMarkerBit.left);
            } else {
               addTileEdge(dropdownEdgeInfos, leftTileIndex, EdgeMarkerBit.right);
            }
         }
      }
   }

   // Bottom
   if (hasBottom) {
      const bottomTileIndex = tileIndex - Settings.FULL_WORLD_SIZE_TILES;
      const bottomTile = tiles.get(bottomTileIndex);
      if (bottomTile !== undefined) {
         const bottomTileType = bottomTile.type;
         if ((bottomTileType === TileType.dropdown) !== (tileType === TileType.dropdown)) {
            if (tileType === TileType.dropdown) {
               addTileEdge(dropdownEdgeInfos, tileIndex, EdgeMarkerBit.bottom);
            } else {
               addTileEdge(dropdownEdgeInfos, bottomTileIndex, EdgeMarkerBit.top);
            }
         }
      }
   }

   // Bottom left
   if (hasBottom && hasLeft) {
      const bottomLeftTileIndex = tileIndex - Settings.FULL_WORLD_SIZE_TILES - 1;
      const bottomLeftTile = tiles.get(bottomLeftTileIndex);
      if (bottomLeftTile !== undefined) {
         const bottomLeftTileType = bottomLeftTile.type;
         if ((bottomLeftTileType === TileType.dropdown) !== (tileType === TileType.dropdown)) {
            if (tileType === TileType.dropdown) {
               addTileEdge(dropdownEdgeInfos, tileIndex, EdgeMarkerBit.bottomLeft);
            } else {
               addTileEdge(dropdownEdgeInfos, bottomLeftTileIndex, EdgeMarkerBit.topRight);
            }
         }
      }
   }

   // Bottom right
   if (hasBottom && hasRight) {
      const bottomRightTileIndex = tileIndex - Settings.FULL_WORLD_SIZE_TILES + 1;
      const bottomRightTile = tiles.get(bottomRightTileIndex);
      if (bottomRightTile !== undefined) {
         const bottomRightTileType = bottomRightTile.type;
         if ((bottomRightTileType === TileType.dropdown) !== (tileType === TileType.dropdown)) {
            if (tileType === TileType.dropdown) {
               addTileEdge(dropdownEdgeInfos, tileIndex, EdgeMarkerBit.bottomRight);
            } else {
               addTileEdge(dropdownEdgeInfos, bottomRightTileIndex, EdgeMarkerBit.topLeft);
            }
         }
      }
   }
}

export function processRenderChunkSubtileUpdates(snapshot: TickSnapshot): void {
   for (const layer of layers) {
      const dirtiedEdgeRenderChunks = new Set<number>();
      const dirtiedSubtileRenderChunks = new Set<number>();
      
      const floorEdgeInfos = layer.edgeInfoMaps[EdgeType.floor];
      const wallEdgeInfos = layer.edgeInfoMaps[EdgeType.wall];

      const layerSubtileUpdates = snapshot.wallSubtileUpdates.get(layer)!;
      for (const subtileUpdateData of layerSubtileUpdates) {
         const subtileIndex = subtileUpdateData.subtileIndex;
         const data = subtileUpdateData.data;

         layer.setSubtileData(subtileIndex, data);

         const subtileX = getSubtileX(subtileIndex);
         const subtileY = getSubtileY(subtileIndex);

         const renderChunkX = Math.floor(subtileX / 4 / RenderChunkVars.RENDER_CHUNK_SIZE);
         const renderChunkY = Math.floor(subtileY / 4 / RenderChunkVars.RENDER_CHUNK_SIZE);
         const renderChunkIdx = getRenderChunkIndex(renderChunkX, renderChunkY);
         dirtiedSubtileRenderChunks.add(renderChunkIdx);

         const subtileData = layer.getSubtileData(subtileIndex);
         if (subtileData === 0) {
            removeSubtileFromEdgeInfos(layer.wallSubtileDatas, floorEdgeInfos, wallEdgeInfos, subtileIndex);
         }
         addSubtileToEdgeInfos(layer.wallSubtileDatas, floorEdgeInfos, wallEdgeInfos, subtileIndex, subtileData);
         
         const minRenderChunkX = Math.max(Math.floor((subtileX - 1) / 4 / RenderChunkVars.RENDER_CHUNK_SIZE), -RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION);
         const maxRenderChunkX = Math.min(Math.floor((subtileX + 1) / 4 / RenderChunkVars.RENDER_CHUNK_SIZE), RenderChunkVars.WORLD_RENDER_CHUNK_SIZE + RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION - 1);
         const minRenderChunkY = Math.max(Math.floor((subtileY - 1) / 4 / RenderChunkVars.RENDER_CHUNK_SIZE), -RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION);
         const maxRenderChunkY = Math.min(Math.floor((subtileY + 1) / 4 / RenderChunkVars.RENDER_CHUNK_SIZE), RenderChunkVars.WORLD_RENDER_CHUNK_SIZE + RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION - 1);
   
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
         const floorEdgeInfo = floorEdgeInfos.get(renderChunkIdx)!;
         const wallEdgeInfo = wallEdgeInfos.get(renderChunkIdx)!;
         
         recalculateTileShadows(layer, renderChunkIdx, floorEdgeInfo, TileShadowType.wall);
         recalculateWallBorders(layer, renderChunkIdx, wallEdgeInfo);
      }
   }
}

export function getRenderChunkMinTileX(renderChunkX: number): number {
   let tileMinX = renderChunkX * RenderChunkVars.RENDER_CHUNK_SIZE;
   if (tileMinX < -Settings.EDGE_GENERATION_DISTANCE) {
      tileMinX = -Settings.EDGE_GENERATION_DISTANCE;
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
      tileMinY = -Settings.EDGE_GENERATION_DISTANCE;
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
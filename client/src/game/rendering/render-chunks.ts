import { Settings } from "../../../../shared/src/settings";
import { WaterRockData } from "../../../../shared/src/client-server-types";
import { getTileIndexIncludingEdges, TileIndex, tileIsInWorldIncludingEdges, TileType } from "../../../../shared/src/tiles";
import { assert } from "../../../../shared/src/utils";
import { createSolidTileRenderChunkData, destroySolidTileRenderChunkData, updateRenderChunkTileData } from "./webgl/solid-tile-rendering";
import { createRiverRenderChunkData, destroyRiverRenderChunkData } from "./webgl/river-rendering";
import { createShadowInfo, destroyShadowInfo, TileShadowType } from "./webgl/tile-shadow-rendering";
import { createWallBorderInfo, destroyWallBorderInfo } from "./webgl/wall-border-rendering";
import Layer from "../Layer";
import { layers } from "../world";
import { addDirtiedRenderChunks, TickSnapshot } from "../networking/snapshot-processing";
import { getSubtileIndex, getSubtileX, getSubtileY, SubtileIndex, subtileIsInWorldIncludingEdges } from "../../../../shared/src/subtiles";
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

// @Location should be global
const NEIGHBOUR_X_OFFSETS = [-1, 0, 1, -1, 1, 0, -1, 1];
const NEIGHBOUR_Y_OFFSETS = [-1, -1, -1, 0, 1, 1, 1, 0];

const NEIGHBOUR_EDGE_DIRECTIONS = [EdgeMarkerBit.bottomLeft, EdgeMarkerBit.bottom, EdgeMarkerBit.bottomRight, EdgeMarkerBit.left, EdgeMarkerBit.topRight, EdgeMarkerBit.top, EdgeMarkerBit.topLeft, EdgeMarkerBit.right];

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

const getTileRenderChunkIndex = (tileX: number, tileY: number): number => {
   const renderChunkX = Math.floor(tileX / RenderChunkVars.RENDER_CHUNK_SIZE);
   const renderChunkY = Math.floor(tileY / RenderChunkVars.RENDER_CHUNK_SIZE);
   return getRenderChunkIndex(renderChunkX, renderChunkY);
}

const getSubtileRenderChunkIndex = (subtileX: number, subtileY: number): number => {
   const renderChunkX = Math.floor(subtileX / 4 / RenderChunkVars.RENDER_CHUNK_SIZE);
   const renderChunkY = Math.floor(subtileY / 4 / RenderChunkVars.RENDER_CHUNK_SIZE);
   return getRenderChunkIndex(renderChunkX, renderChunkY);
}

const getOrCreateEdgeInfo = (edgeInfos: Map<TileIndex, RenderChunkEdgeInfo>, renderChunkIdx: number): RenderChunkEdgeInfo => {
   const edgeInfo = edgeInfos.get(renderChunkIdx);
   if (edgeInfo !== undefined) {
      return edgeInfo;
   } else {
      // If the edge info hasn't been created yet, create it
      const edgeInfo: RenderChunkEdgeInfo = [];
      edgeInfos.set(renderChunkIdx, edgeInfo);
      return edgeInfo;
   }
}

const addTileEdge = (edgeInfos: Map<TileIndex, RenderChunkEdgeInfo>, tileIndex: TileIndex, tileX: number, tileY: number, marker: EdgeMarkerBit) => {
   const idx = getTileRenderChunkIndex(tileX, tileY);
   const edgeInfo = getOrCreateEdgeInfo(edgeInfos, idx);
   
   for (let i = 0; i < edgeInfo.length; i++) {
      const data = edgeInfo[i];
      const currentIndex = data >> 8;
      if (currentIndex === tileIndex) {
         assert((data & marker) === 0);
         edgeInfo[i] |= marker;
         return;
      }
   }
   
   edgeInfo.push(tileIndex << 8 | marker);
}

const addSubtileEdge = (edgeInfos: Map<SubtileIndex, RenderChunkEdgeInfo>, subtileIndex: SubtileIndex, subtileX: number, subtileY: number, marker: EdgeMarkerBit) => {
   const idx = getSubtileRenderChunkIndex(subtileX, subtileY);
   const edgeInfo = getOrCreateEdgeInfo(edgeInfos, idx);
   
   for (let i = 0; i < edgeInfo.length; i++) {
      const data = edgeInfo[i];
      const currentIndex = data >> 8;
      if (currentIndex === subtileIndex) {
         assert((data & marker) === 0);
         edgeInfo[i] |= marker;
         return;
      }
   }
   
   edgeInfo.push(subtileIndex << 8 | marker);
}

const clearSubtileEdges = (edgeInfos: Map<SubtileIndex, RenderChunkEdgeInfo>, subtileIndex: SubtileIndex, subtileX: number, subtileY: number) => {
   const idx = getSubtileRenderChunkIndex(subtileX, subtileY);
   const edgeInfo = edgeInfos.get(idx);
   
   if (edgeInfo !== undefined) {
      for (let i = 0; i < edgeInfo.length; i++) {
         const data = edgeInfo[i];
         const currentIndex = data >> 8;
         if (currentIndex === subtileIndex) {
            assert((data & 0xFF) !== 0);
            edgeInfo.splice(i, 1);
            return;
         }
      }
   }

   // Ok to not find any edges to clear, as if this is called in the middle of a clump of walls then that will be the case.
}

const removeSubtileEdge = (edgeInfos: Map<SubtileIndex, RenderChunkEdgeInfo>, subtileIndex: SubtileIndex, subtileX: number, subtileY: number, marker: EdgeMarkerBit) => {
   const idx = getSubtileRenderChunkIndex(subtileX, subtileY);
   const edgeInfo = edgeInfos.get(idx)!;

   for (let i = 0; i < edgeInfo.length; i++) {
      const data = edgeInfo[i];
      const currentIndex = data >> 8;
      if (currentIndex === subtileIndex) {
         assert((data & marker) !== 0);
         if ((data & 0xFF) === marker) {
            edgeInfo.splice(i, 1);
         } else {
            edgeInfo[i] &= ~marker;
         }
         return;
      }
   }

   // Couldn't find the subtile edge to remove
   assert(false);
}

export function addSubtileToEdgeInfosPartial(wallSubtileDatas: Map<SubtileIndex, number>, floorEdgeInfos: Map<number, RenderChunkEdgeInfo>, wallEdgeInfos: Map<number, RenderChunkEdgeInfo>, subtileIndex: number, subtileX: number, subtileY: number, subtileData: number): void {
   for (let i = 0; i < 4; i++) {
      const xOffset = NEIGHBOUR_X_OFFSETS[i];
      const yOffset = NEIGHBOUR_Y_OFFSETS[i];

      if (subtileIsInWorldIncludingEdges(subtileX + xOffset, subtileY + yOffset)) {
         const neighbourSubtileIndex = getSubtileIndex(subtileX + xOffset, subtileY + yOffset);
         const neighbourSubtileData = wallSubtileDatas.get(neighbourSubtileIndex);
         if (neighbourSubtileData !== undefined && (neighbourSubtileData === 0) !== (subtileData === 0)) {
            addSubtileEdge(subtileData === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex, subtileX, subtileY, NEIGHBOUR_EDGE_DIRECTIONS[i]);
            addSubtileEdge(neighbourSubtileData === 0 ? floorEdgeInfos : wallEdgeInfos, neighbourSubtileIndex, subtileX + xOffset, subtileY + yOffset, NEIGHBOUR_EDGE_DIRECTIONS[i + 4]);
         }
      }
   }
}

/** Adds a subtile which currently has zero presence to the edge infos. */
export function addSubtileToEdgeInfos(wallSubtileDatas: Map<SubtileIndex, number>, floorEdgeInfos: Map<number, RenderChunkEdgeInfo>, wallEdgeInfos: Map<number, RenderChunkEdgeInfo>, subtileIndex: number, subtileX: number, subtileY: number, subtileData: number): void {
   for (let i = 0; i < 8; i++) {
      const xOffset = NEIGHBOUR_X_OFFSETS[i];
      const yOffset = NEIGHBOUR_Y_OFFSETS[i];

      if (subtileIsInWorldIncludingEdges(subtileX + xOffset, subtileY + yOffset)) {
         const neighbourSubtileIndex = getSubtileIndex(subtileX + xOffset, subtileY + yOffset);
         const neighbourSubtileData = wallSubtileDatas.get(neighbourSubtileIndex);
         if (neighbourSubtileData !== undefined && (neighbourSubtileData === 0) !== (subtileData === 0)) {
            // Adds for both the wall tile AND its neighbour, so that already existing tiles get added to
            addSubtileEdge(subtileData === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex, subtileX, subtileY, NEIGHBOUR_EDGE_DIRECTIONS[i]);
            addSubtileEdge(neighbourSubtileData === 0 ? floorEdgeInfos : wallEdgeInfos, neighbourSubtileIndex, subtileX + xOffset, subtileY + yOffset, NEIGHBOUR_EDGE_DIRECTIONS[(i + 4) % 8]);
         }
      }
   }
}

// Removes a subtile, which might be a wall or not, from the edge infos.
export function removeSubtileFromEdgeInfos(wallSubtileDatas: Map<SubtileIndex, number>, floorEdgeInfos: Map<number, RenderChunkEdgeInfo>, wallEdgeInfos: Map<number, RenderChunkEdgeInfo>, subtileIndex: number, subtileX: number, subtileY: number, subtileData: number): void {
   // IMPORTANT: subtileData has to be the data currently represented in the edge infos.'
   
   clearSubtileEdges(floorEdgeInfos, subtileIndex, subtileX, subtileY);
   clearSubtileEdges(wallEdgeInfos, subtileIndex, subtileX, subtileY);

   for (let i = 0; i < 8; i++) {
      const xOffset = NEIGHBOUR_X_OFFSETS[i];
      const yOffset = NEIGHBOUR_Y_OFFSETS[i];

      if (subtileIsInWorldIncludingEdges(subtileX + xOffset, subtileY + yOffset)) {
         const neighbourSubtileIndex = getSubtileIndex(subtileX + xOffset, subtileY + yOffset);
         const neighbourSubtileData = wallSubtileDatas.get(neighbourSubtileIndex);
         if (neighbourSubtileData !== undefined && (neighbourSubtileData === 0) !== (subtileData === 0)) {
            removeSubtileEdge(neighbourSubtileData === 0 ? floorEdgeInfos : wallEdgeInfos, neighbourSubtileIndex, subtileX + xOffset, subtileY + yOffset, NEIGHBOUR_EDGE_DIRECTIONS[(i + 4) % 8]);
         }
      }
   }
}

export function addTileToEdgeInfos(tiles: Map<TileIndex, Tile>, dropdownEdgeInfos: Map<number, RenderChunkEdgeInfo>, tileIndex: number, tileX: number, tileY: number, tileType: TileType): void {
   for (let i = 0; i < 4; i++) {
      const xOffset = NEIGHBOUR_X_OFFSETS[i];
      const yOffset = NEIGHBOUR_Y_OFFSETS[i];

      if (tileIsInWorldIncludingEdges(tileX + xOffset, tileY + yOffset)) {
         const neighbourTileIndex = getTileIndexIncludingEdges(tileX + xOffset, tileY + yOffset);
         const neighbourTile = tiles.get(neighbourTileIndex);
         if (neighbourTile !== undefined && (neighbourTile.type === TileType.dropdown) !== (tileType === TileType.dropdown)) {
            if (tileType === TileType.dropdown) {
               addTileEdge(dropdownEdgeInfos, tileIndex, tileX, tileY, NEIGHBOUR_EDGE_DIRECTIONS[i]);
            } else {
               addTileEdge(dropdownEdgeInfos, neighbourTileIndex, tileX + xOffset, tileY + yOffset, NEIGHBOUR_EDGE_DIRECTIONS[(i + 4) % 8]);
            }
         }
      }
   }
}

export function processRenderChunkSubtileUpdates(snapshot: TickSnapshot, layerDirtiedEdgeRenderChunks: Set<number>[]): void {
   for (const layer of layers) {
      const dirtiedEdgeRenderChunks = layerDirtiedEdgeRenderChunks[layer.idx];
      const dirtiedSolidTileRenderChunks = new Set<number>();
      
      const floorEdgeInfos = layer.edgeInfoMaps[EdgeType.floor];
      const wallEdgeInfos = layer.edgeInfoMaps[EdgeType.wall];

      const layerSubtileUpdates = snapshot.wallSubtileUpdates.get(layer)!;
      for (const subtileUpdateData of layerSubtileUpdates) {
         const subtileIndex = subtileUpdateData.subtileIndex;
         const data = subtileUpdateData.data;

         const previousSubtileData = layer.getSubtileData(subtileIndex);

         layer.setSubtileData(subtileIndex, data);

         const subtileX = getSubtileX(subtileIndex);
         const subtileY = getSubtileY(subtileIndex);

         const renderChunkIdx = getSubtileRenderChunkIndex(subtileX, subtileY);
         dirtiedSolidTileRenderChunks.add(renderChunkIdx);

         removeSubtileFromEdgeInfos(layer.wallSubtileDatas, floorEdgeInfos, wallEdgeInfos, subtileIndex, subtileX, subtileY, previousSubtileData);
         addSubtileToEdgeInfos(layer.wallSubtileDatas, floorEdgeInfos, wallEdgeInfos, subtileIndex, subtileX, subtileY, data);
         
         addDirtiedRenderChunks(dirtiedEdgeRenderChunks, floorEdgeInfos, wallEdgeInfos, subtileX, subtileY);
      }

      // Recalculate solid tile rendering
      for (const renderChunkIdx of dirtiedSolidTileRenderChunks) {
         updateRenderChunkTileData(layer, renderChunkIdx, true);
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
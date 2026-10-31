import { Settings } from "../../../../shared/src/settings";
import { WaterRockData } from "../../../../shared/src/client-server-types";
import { getTileX, getTileY, TileIndex, TileType } from "../../../../shared/src/tiles";
import { assert } from "../../../../shared/src/utils";
import { createSolidTileRenderChunkData, destroySolidTileRenderChunkData, updateRenderChunkTileData } from "./webgl/solid-tile-rendering";
import { createRiverRenderChunkData, destroyRiverRenderChunkData } from "./webgl/river-rendering";
import { createShadowInfo, destroyShadowInfo, TileShadowType } from "./webgl/tile-shadow-rendering";
import { createWallBorderInfo, destroyWallBorderInfo } from "./webgl/wall-border-rendering";
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

// @Speed: could turn this into a Uint8Array...
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

const NEIGHBOUR_TILE_OFFSETS = [
   -Settings.FULL_WORLD_SIZE_TILES - 1, // Bottom left
   -Settings.FULL_WORLD_SIZE_TILES, // Bottom
   -Settings.FULL_WORLD_SIZE_TILES + 1, // Bottom right
   -1, // Left
   Settings.FULL_WORLD_SIZE_TILES + 1, // Top right
   Settings.FULL_WORLD_SIZE_TILES, // Top
   Settings.FULL_WORLD_SIZE_TILES - 1, // Top left
   1, // Right
];
const NEIGHBOUR_SUBTILE_OFFSETS = [
   -Settings.FULL_WORLD_SIZE_SUBTILES - 1, // Bottom left
   -Settings.FULL_WORLD_SIZE_SUBTILES, // Bottom
   -Settings.FULL_WORLD_SIZE_SUBTILES + 1, // Bottom right
   -1, // Left
   Settings.FULL_WORLD_SIZE_SUBTILES + 1, // Top right
   Settings.FULL_WORLD_SIZE_SUBTILES, // Top
   Settings.FULL_WORLD_SIZE_SUBTILES - 1, // Top left
   1, // Right
];
// (n and n+4 have to be opposite directions)
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
         createRenderChunk(layer, renderChunkIndex, waterRocks || []);

         // @Hack! so its only added once
         if (layer.idx === 0) {
            // @Speed: this shouldn't be wrapped in a layers loop
            addRenderChunkToVisibleArray(renderChunkIndex);
         }
      }
   }
}

export function createRenderChunk(layer: Layer, renderChunkIndex: number, waterRocks: readonly WaterRockData[]): void {
   const renderChunkX = getRenderChunkX(renderChunkIndex);
   const renderChunkY = getRenderChunkY(renderChunkIndex);
   
   // Solid tile info
   layer.groundTileInfoMap.set(renderChunkIndex, createSolidTileRenderChunkData(layer, renderChunkX, renderChunkY, false));
   layer.wallTileInfoMap.set(renderChunkIndex, createSolidTileRenderChunkData(layer, renderChunkX, renderChunkY, true));

   // River info
   const riverInfo = createRiverRenderChunkData(layer, renderChunkX, renderChunkY, waterRocks);
   if (riverInfo !== null) {
      layer.riverInfoMap.set(renderChunkIndex, riverInfo);
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
   const wallShadowInfo = wallShadowInfoMap.get(renderChunkIndex);
   if (wallShadowInfo !== undefined) {
      destroyShadowInfo(wallShadowInfo);
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

const getOrCreateEdgeInfo = (edgeInfos: Map<number, RenderChunkEdgeInfo>, renderChunkIdx: number): RenderChunkEdgeInfo => {
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

const addTileEdge = (edgeInfos: Map<number, RenderChunkEdgeInfo>, tileIndex: TileIndex, marker: EdgeMarkerBit, dirtyRenderChunks: Set<number>) => {
   const tileX = getTileX(tileIndex);
   const tileY = getTileY(tileIndex);
   
   const idx = getTileRenderChunkIndex(tileX, tileY);
   const edgeInfo = getOrCreateEdgeInfo(edgeInfos, idx);

   dirtyRenderChunks.add(idx);
   
   for (let i = 0; i < edgeInfo.length; i++) {
      const edgeData = edgeInfo[i];
      const currentIndex = edgeData >> 8;
      if (currentIndex === tileIndex) {
         assert((edgeData & marker) === 0);
         edgeInfo[i] |= marker;
         return;
      }
   }
   
   edgeInfo.push(tileIndex << 8 | marker);
}

const removeTileEdge = (edgeInfos: Map<number, RenderChunkEdgeInfo>, tileIndex: TileIndex, marker: EdgeMarkerBit, dirtyRenderChunks: Set<number>) => {
   const tileX = getTileX(tileIndex);
   const tileY = getTileY(tileIndex);
   
   const idx = getTileRenderChunkIndex(tileX, tileY);
   const edgeInfo = edgeInfos.get(idx)!;
   
   dirtyRenderChunks.add(idx);
   
   for (let i = 0; i < edgeInfo.length; i++) {
      const edgeData = edgeInfo[i];
      const currentIndex = edgeData >> 8;
      if (currentIndex === tileIndex) {
         assert((edgeData & marker) !== 0);
         if ((edgeData & 0xFF) === marker) {
            edgeInfo.splice(i, 1);
         } else {
            edgeInfo[i] &= ~marker;
         }
         return;
      }
   }

   // Couldn't find the tile edge to remove
   assert(false);
}

const clearTileEdges = (edgeInfos: Map<number, RenderChunkEdgeInfo>, tileIndex: TileIndex, tileX: number, tileY: number, dirtyRenderChunks: Set<number>) => {
   const idx = getTileRenderChunkIndex(tileX, tileY);
   // Specifically for the TILE clearing function, it doesn't use the edge info. So this is ok to skip
   const edgeInfo = edgeInfos.get(idx);
   
   if (edgeInfo !== undefined) {
      for (let i = 0; i < edgeInfo.length; i++) {
         const edgeData = edgeInfo[i];
         const currentIndex = edgeData >> 8;
         if (currentIndex === tileIndex) {
            assert((edgeData & 0xFF) !== 0);
            edgeInfo.splice(i, 1);

            dirtyRenderChunks.add(idx);
            return;
         }
      }
   }

   // Ok to not find any edges to clear, as if this is called in the middle of a clump of walls then that will be the case.
}

const addSubtileEdge = (edgeInfos: Map<number, RenderChunkEdgeInfo>, subtileIndex: SubtileIndex, marker: EdgeMarkerBit, dirtyRenderChunks: Set<number>) => {
   const subtileX = getSubtileX(subtileIndex);
   const subtileY = getSubtileY(subtileIndex);
   
   const idx = getSubtileRenderChunkIndex(subtileX, subtileY);
   const edgeInfo = getOrCreateEdgeInfo(edgeInfos, idx);

   dirtyRenderChunks.add(idx);
   
   for (let i = 0; i < edgeInfo.length; i++) {
      const edgeData = edgeInfo[i];
      const currentIndex = edgeData >> 8;
      if (currentIndex === subtileIndex) {
         assert((edgeData & marker) === 0);
         edgeInfo[i] |= marker;
         return;
      }
   }
   
   edgeInfo.push(subtileIndex << 8 | marker);
}

const removeSubtileEdge = (edgeInfos: Map<number, RenderChunkEdgeInfo>, subtileIndex: SubtileIndex, marker: EdgeMarkerBit, dirtyRenderChunks: Set<number>) => {
   const subtileX = getSubtileX(subtileIndex);
   const subtileY = getSubtileY(subtileIndex);
   
   const idx = getSubtileRenderChunkIndex(subtileX, subtileY);
   const edgeInfo = edgeInfos.get(idx)!;

   dirtyRenderChunks.add(idx);

   for (let i = 0; i < edgeInfo.length; i++) {
      const edgeData = edgeInfo[i];
      const currentIndex = edgeData >> 8;
      if (currentIndex === subtileIndex) {
         assert((edgeData & marker) !== 0);
         if ((edgeData & 0xFF) === marker) {
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

const clearSubtileEdges = (edgeInfos: Map<number, RenderChunkEdgeInfo>, subtileIndex: SubtileIndex, subtileX: number, subtileY: number, dirtyRenderChunks: Set<number>) => {
   const idx = getSubtileRenderChunkIndex(subtileX, subtileY);
   const edgeInfo = edgeInfos.get(idx);
   
   if (edgeInfo !== undefined) {
      for (let i = 0; i < edgeInfo.length; i++) {
         const edgeData = edgeInfo[i];
         const currentIndex = edgeData >> 8;
         if (currentIndex === subtileIndex) {
            assert((edgeData & 0xFF) !== 0);
            edgeInfo.splice(i, 1);

            dirtyRenderChunks.add(idx);
            return;
         }
      }
   }

   // Ok to not find any edges to clear, as if this is called in the middle of a clump of walls then that will be the case.
}

const getSubtileEdgeData = (edgeInfos: Map<number, RenderChunkEdgeInfo>, subtileIndex: SubtileIndex): number | null => {
   const subtileX = getSubtileX(subtileIndex);
   const subtileY = getSubtileY(subtileIndex);
   
   const idx = getSubtileRenderChunkIndex(subtileX, subtileY);
   const edgeInfo = edgeInfos.get(idx);
   if (edgeInfo === undefined) {
      return null;
   }

   for (let i = 0; i < edgeInfo.length; i++) {
      const edgeData = edgeInfo[i];
      assert((edgeData & 0xFF) !== 0);

      const currentIndex = edgeData >> 8;
      if (currentIndex === subtileIndex) {
         return edgeData;
      }
   }

   return null;
}

export function addSubtileToEdgeInfosPartial(wallSubtileDatas: Map<SubtileIndex, number>, floorEdgeInfos: Map<number, RenderChunkEdgeInfo>, wallEdgeInfos: Map<number, RenderChunkEdgeInfo>, subtileIndex: number, subtileData: number, dirtyRenderChunks: Set<number>): void {
   for (let i = 0; i < 4; i++) {
      const offset = NEIGHBOUR_SUBTILE_OFFSETS[i];
      // Ok to not check if the subtile is in the world, as wrapping around isn't harmful
      const neighbourSubtileIndex = subtileIndex + offset;

      const neighbourSubtileData = wallSubtileDatas.get(neighbourSubtileIndex);
      if (neighbourSubtileData !== undefined && (neighbourSubtileData === 0) !== (subtileData === 0)) {
         addSubtileEdge(subtileData === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex, NEIGHBOUR_EDGE_DIRECTIONS[i], dirtyRenderChunks);
         addSubtileEdge(neighbourSubtileData === 0 ? floorEdgeInfos : wallEdgeInfos, neighbourSubtileIndex, NEIGHBOUR_EDGE_DIRECTIONS[i + 4], dirtyRenderChunks);
      }
   }
}

/** Adds a subtile which currently has zero presence to the edge infos. */
export function addSubtileToEdgeInfos(wallSubtileDatas: Map<SubtileIndex, number>, floorEdgeInfos: Map<number, RenderChunkEdgeInfo>, wallEdgeInfos: Map<number, RenderChunkEdgeInfo>, subtileIndex: number, subtileData: number, dirtyRenderChunks: Set<number>): void {
   for (let i = 0; i < 8; i++) {
      const offset = NEIGHBOUR_SUBTILE_OFFSETS[i];
      // Ok to not check if the subtile is in the world, as wrapping around isn't harmful
      const neighbourSubtileIndex = subtileIndex + offset;

      const neighbourSubtileData = wallSubtileDatas.get(neighbourSubtileIndex);
      if (neighbourSubtileData !== undefined && (neighbourSubtileData === 0) !== (subtileData === 0)) {
         // Adds for both the wall tile AND its neighbour, so that already existing tiles get added to
         addSubtileEdge(subtileData === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex, NEIGHBOUR_EDGE_DIRECTIONS[i], dirtyRenderChunks);
         addSubtileEdge(neighbourSubtileData === 0 ? floorEdgeInfos : wallEdgeInfos, neighbourSubtileIndex, NEIGHBOUR_EDGE_DIRECTIONS[(i + 4) & 7], dirtyRenderChunks);
      }
   }
}

// Removes a subtile, which might be a wall or not, from the edge infos.
export function removeSubtileFromEdgeInfos(floorEdgeInfos: Map<number, RenderChunkEdgeInfo>, wallEdgeInfos: Map<number, RenderChunkEdgeInfo>, subtileIndex: number, subtileData: number, dirtyRenderChunks: Set<number>): void {
   // IMPORTANT: subtileData has to be the data currently represented in the edge infos.

   const edgeData = getSubtileEdgeData(subtileData === 0 ? floorEdgeInfos : wallEdgeInfos, subtileIndex);
   if (edgeData === null) {
      return;
   }
   
   // Use the subtile's edge data to figure out which neighbours to remove from
   for (let i = 0; i < 8; i++) {
      const dir = NEIGHBOUR_EDGE_DIRECTIONS[i];
      if ((edgeData & dir) !== 0) {
         const offset = NEIGHBOUR_SUBTILE_OFFSETS[i];
         // Ok to not check if the subtile is in the world, as wrapping around isn't harmful
         const neighbourSubtileIndex = subtileIndex + offset;

         const neighbourDir = NEIGHBOUR_EDGE_DIRECTIONS[(i + 4) & 7];
         removeSubtileEdge(subtileData !== 0 ? floorEdgeInfos : wallEdgeInfos, neighbourSubtileIndex, neighbourDir, dirtyRenderChunks);
      }
   }
   
   // Clear the subtile once we've used its data
   const subtileX = getSubtileX(subtileIndex);
   const subtileY = getSubtileY(subtileIndex);
   clearSubtileEdges(floorEdgeInfos, subtileIndex, subtileX, subtileY, dirtyRenderChunks);
   clearSubtileEdges(wallEdgeInfos, subtileIndex, subtileX, subtileY, dirtyRenderChunks);
}

export function addTileToEdgeInfosPartial(tiles: Map<TileIndex, Tile>, dropdownEdgeInfos: Map<number, RenderChunkEdgeInfo>, tileIndex: number, tileType: TileType, dirtyRenderChunks: Set<number>): void {
   for (let i = 0; i < 4; i++) {
      const offset = NEIGHBOUR_TILE_OFFSETS[i];
      // Ok to not check if the subtile is in the world, as wrapping around isn't harmful
      const neighbourTileIndex = tileIndex + offset;

      const neighbourTile = tiles.get(neighbourTileIndex);
      if (neighbourTile !== undefined && (neighbourTile.type === TileType.dropdown) !== (tileType === TileType.dropdown)) {
         if (tileType === TileType.dropdown) {
            addTileEdge(dropdownEdgeInfos, tileIndex, NEIGHBOUR_EDGE_DIRECTIONS[i], dirtyRenderChunks);
         } else {
            addTileEdge(dropdownEdgeInfos, neighbourTileIndex, NEIGHBOUR_EDGE_DIRECTIONS[i + 4], dirtyRenderChunks);
         }
      }
   }
}

export function addTileToEdgeInfos(tiles: Map<TileIndex, Tile>, dropdownEdgeInfos: Map<number, RenderChunkEdgeInfo>, tileIndex: number, tileType: TileType, dirtyRenderChunks: Set<number>): void {
   for (let i = 0; i < 8; i++) {
      const offset = NEIGHBOUR_TILE_OFFSETS[i];
      // Ok to not check if the subtile is in the world, as wrapping around isn't harmful
      const neighbourTileIndex = tileIndex + offset;

      const neighbourTile = tiles.get(neighbourTileIndex);
      if (neighbourTile !== undefined && (neighbourTile.type === TileType.dropdown) !== (tileType === TileType.dropdown)) {
         if (tileType === TileType.dropdown) {
            addTileEdge(dropdownEdgeInfos, tileIndex, NEIGHBOUR_EDGE_DIRECTIONS[i], dirtyRenderChunks);
         } else {
            addTileEdge(dropdownEdgeInfos, neighbourTileIndex, NEIGHBOUR_EDGE_DIRECTIONS[(i + 4) & 7], dirtyRenderChunks);
         }
      }
   }
}

export function removeTileFromEdgeInfos(tiles: Map<TileIndex, Tile>, dropdownEdgeInfos: Map<number, RenderChunkEdgeInfo>, tileIndex: number, tileType: TileType, dirtyRenderChunks: Set<number>): void {
   // IMPORTANT: tileType has to be the data currently represented in the edge infos.

   const tileX = getTileX(tileIndex);
   const tileY = getTileY(tileIndex);
   clearTileEdges(dropdownEdgeInfos, tileIndex, tileX, tileY, dirtyRenderChunks);
   if (tileType !== TileType.dropdown) {

      for (let i = 0; i < 8; i++) {
         const offset = NEIGHBOUR_TILE_OFFSETS[i];
         // Ok to not check if the subtile is in the world, as wrapping around isn't harmful
         const neighbourTileIndex = tileIndex + offset;
         
         const neighbourTile = tiles.get(neighbourTileIndex);
         if (neighbourTile !== undefined && neighbourTile.type === TileType.dropdown) {
            removeTileEdge(dropdownEdgeInfos, neighbourTileIndex, NEIGHBOUR_EDGE_DIRECTIONS[(i + 4) & 7], dirtyRenderChunks);
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

         removeSubtileFromEdgeInfos(floorEdgeInfos, wallEdgeInfos, subtileIndex, previousSubtileData, dirtiedEdgeRenderChunks);
         addSubtileToEdgeInfos(layer.wallSubtileDatas, floorEdgeInfos, wallEdgeInfos, subtileIndex, data, dirtiedEdgeRenderChunks);
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
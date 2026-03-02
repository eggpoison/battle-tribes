import { SubtileType, TileType } from "battletribes-shared/tiles";
import { getSubtileIndex } from "../../../shared/src/subtiles";
import { Biome } from "../../../shared/src/biomes";
import { assert, getTileIndexIncludingEdges, getTileX, getTileY, TileIndex, tileIsInWorld } from "../../../shared/src/utils";
import Layer from "../Layer";
import { Settings } from "../../../shared/src/settings";
import { EntityType } from "../../../shared/src/entities";

export interface LocalBiome {
   readonly id: number;
   readonly biome: Biome;
   readonly layer: Layer;
   readonly tiles: ReadonlyArray<TileIndex>;
   /** All tiles which aren't outside the border, which AREN'T WALLS. */
   readonly tilesInBorder: ReadonlyArray<TileIndex>;
   /** Stores how many tiles of each type there are in the local chunk */
   readonly tileCensus: Partial<Record<TileType, number>>;
   readonly minTileX: number;
   readonly maxTileX: number;
   readonly minTileY: number;
   readonly maxTileY: number;
   /** Stores how many entities of each type there are in the local chunk.
    * IMPORTANT: Only stores entities which can drop loot. */
   readonly entityCensus: Map<EntityType, number>;
   // @Incomplete: This would be more accurate if we stored the index of the tile in the tiles array with the smallest average distance from the other tiles.
   //   e.g. think about a crescent shaped local biome, if we use the center pos then that won't even be in the biome!
   // The following 2 variables store the average position of the biome
   centerX: number;
   centerY: number;
}

let idCounter = 0;

// @Cleanup: location? should these be in the layer file as it might be used outside of terrain generation (during the game loop)?

export function setWallInSubtiles(subtileTypes: Float32Array, tileX: number, tileY: number, subtileType: SubtileType): void {
   const startSubtileX = tileX * 4;
   const startSubtileY = tileY * 4;
   
   for (let subtileX = startSubtileX; subtileX < startSubtileX + 4; subtileX++) {
      for (let subtileY = startSubtileY; subtileY < startSubtileY + 4; subtileY++) {
         const idx = getSubtileIndex(subtileX, subtileY);
         subtileTypes[idx] = subtileType;
      }
   }
}

export function tileHasWallSubtile(subtileTypes: Float32Array, tileX: number, tileY: number): boolean {
   const startSubtileX = tileX * 4;
   const startSubtileY = tileY * 4;
   
   for (let subtileX = startSubtileX; subtileX < startSubtileX + 4; subtileX++) {
      for (let subtileY = startSubtileY; subtileY < startSubtileY + 4; subtileY++) {
         const idx = getSubtileIndex(subtileX, subtileY);
         if (subtileTypes[idx] !== SubtileType.none) {
            return true;
         }
      }
   }

   return false;
}

const getConnectedBiomeTiles = (layer: Layer, processedTiles: Set<TileIndex>, tileX: number, tileY: number): ReadonlyArray<TileIndex> => {
   const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
   const targetBiome = layer.getTileBiome(tileIndex);

   processedTiles.add(tileIndex);
   
   /** Tiles to expand from, not tiles to check whether they belong in connectedTiles */
   const tilesToCheck = [tileIndex];
   const connectedTiles = [tileIndex];
   while (tilesToCheck.length > 0) {
      const currentTile = tilesToCheck.shift()!;
      const currentTileX = getTileX(currentTile);
      const currentTileY = getTileY(currentTile);

      // Top
      if (currentTileY < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE - 1) {
         // @Speed: can calculate this directly by offsetting the currentTile
         const tileIndex = getTileIndexIncludingEdges(currentTileX, currentTileY + 1);
         if (!processedTiles.has(tileIndex)) {
            const biome = layer.getTileBiome(tileIndex);
            if (biome === targetBiome && !layer.tileHasWallSubtile(tileIndex)) {
               tilesToCheck.push(tileIndex);
               connectedTiles.push(tileIndex);
               processedTiles.add(tileIndex);
            }
         }
      }
      // Right
      if (currentTileX < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE - 1) {
         // @Speed: can calculate this directly by offsetting the currentTile
         const tileIndex = getTileIndexIncludingEdges(currentTileX + 1, currentTileY);
         if (!processedTiles.has(tileIndex)) {
            const biome = layer.getTileBiome(tileIndex);
            if (biome === targetBiome && !layer.tileHasWallSubtile(tileIndex)) {
               tilesToCheck.push(tileIndex);
               connectedTiles.push(tileIndex);
               processedTiles.add(tileIndex);
            }
         }
      }
      // Bottom
      if (currentTileY > -Settings.EDGE_GENERATION_DISTANCE + 1) {
         // @Speed: can calculate this directly by offsetting the currentTile
         const tileIndex = getTileIndexIncludingEdges(currentTileX, currentTileY - 1);
         if (!processedTiles.has(tileIndex)) {
            const biome = layer.getTileBiome(tileIndex);
            if (biome === targetBiome && !layer.tileHasWallSubtile(tileIndex)) {
               tilesToCheck.push(tileIndex);
               connectedTiles.push(tileIndex);
               processedTiles.add(tileIndex);
            }
         }
      }
      // Left
      if (currentTileX > -Settings.EDGE_GENERATION_DISTANCE + 1) {
         // @Speed: can calculate this directly by offsetting the currentTile
         const tileIndex = getTileIndexIncludingEdges(currentTileX - 1, currentTileY);
         if (!processedTiles.has(tileIndex)) {
            const biome = layer.getTileBiome(tileIndex);
            if (biome === targetBiome && !layer.tileHasWallSubtile(tileIndex)) {
               tilesToCheck.push(tileIndex);
               connectedTiles.push(tileIndex);
               processedTiles.add(tileIndex);
            }
         }
      }
   }

   return connectedTiles;
}

/** Must be called for each layer. Should be called before any entities in that layer are spawned, as components can rely on knowing the local biome of the entity. */
export function groupLocalBiomes(layer: Layer): void {
   const tileBiomes = layer.tileBiomes;
   
   const processedTiles = new Set<TileIndex>();
   
   for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
      for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         if (processedTiles.has(tileIndex)) {
            continue;
         }

         // New tile! Make a local biome out of it
         const connectedTiles = getConnectedBiomeTiles(layer, processedTiles, tileX, tileY);

         let totalTileX = 0;
         let totalTileY = 0;
         for (const tile of connectedTiles) {
            totalTileX += getTileX(tile);
            totalTileY += getTileY(tile);
         }
         const centerX = totalTileX * Settings.TILE_SIZE / connectedTiles.length + Settings.TILE_SIZE * 0.5;
         const centerY = totalTileY * Settings.TILE_SIZE / connectedTiles.length + Settings.TILE_SIZE * 0.5;

         let minTileX = Number.MAX_SAFE_INTEGER;
         let maxTileX = Number.MIN_SAFE_INTEGER;
         let minTileY = Number.MAX_SAFE_INTEGER;
         let maxTileY = Number.MIN_SAFE_INTEGER;
         const tileCensus: Partial<Record<TileType, number>> = {};

         for (const tile of connectedTiles) {
            const tileType = layer.getTileType(tile);
            if (typeof tileCensus[tileType] === "undefined") {
               tileCensus[tileType] = 1;
            } else {
               // @Hack: '!'
               tileCensus[tileType]!++;
            }

            const tileX = getTileX(tile);
            if (tileX < minTileX) {
               minTileX = tileX;
            }
            if (tileX > maxTileX) {
               maxTileX = tileX;
            }
            const tileY = getTileY(tile);
            if (tileY < minTileY) {
               minTileY = tileY;
            }
            if (tileY > maxTileY) {
               maxTileY = tileY;
            }
         }
         
         const localBiome: LocalBiome = {
            id: idCounter++,
            biome: tileBiomes[tileIndex],
            layer: layer,
            tiles: connectedTiles,
            tilesInBorder: connectedTiles.filter(tileIndex => tileIsInWorld(getTileX(tileIndex), getTileY(tileIndex))),
            tileCensus: tileCensus,
            minTileX: minTileX,
            maxTileX: maxTileX,
            minTileY: minTileY,
            maxTileY: maxTileY,
            entityCensus: new Map(),
            centerX: centerX,
            centerY: centerY
         };
         layer.localBiomes.push(localBiome);

         for (const tile of connectedTiles) {
            layer.tileToLocalBiomeRecord[tile] = localBiome;
         }
      }
   }
}
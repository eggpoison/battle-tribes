import { EntityType, NUM_ENTITY_TYPES } from "webgl-test-shared/dist/entities";
import { TileType, Biome } from "webgl-test-shared/dist/tiles";
import Tile from "./Tile";
import Entity from "./Entity";

const entityCounts = new Array<EntityType>();
for (let i = 0; i < NUM_ENTITY_TYPES; i++) {
   entityCounts.push(0);
}

interface TileCensus {
   // @Cleanup: remove the partial. Have them always be defined
   types: Partial<Record<TileType, Array<Tile>>>;
   biomes: Partial<Record<Biome, Array<Tile>>>;
}

const tileCensus: TileCensus = {
   types: {},
   biomes: {}
};

/** Stores the IDs of all entities that are being tracked in the census */
const trackedEntityIDs = new Set<number>();

export function addEntityToCensus(entity: Entity): void {
   entityCounts[entity.type]++;
   trackedEntityIDs.add(entity.id);
}

export function removeEntityFromCensus(entity: Entity): void {
   if (!trackedEntityIDs.has(entity.id)) return;
   
   if (entityCounts[entity.type] <= 0) {
      console.log(entityCounts);
      console.warn(`Entity type "${entity.type}" is not in the census.`);
      console.trace();
      throw new Error();
   }

   entityCounts[entity.type]--;
   trackedEntityIDs.delete(entity.id);
}

export function getEntityCount(entityType: EntityType): number {
   return entityCounts[entityType];
}

export function addTileToCensus(tile: Tile): void {
   if (!tileCensus.types.hasOwnProperty(tile.type)) {
      tileCensus.types[tile.type] = [tile];
   } else {
      tileCensus.types[tile.type]!.push(tile);
   }

   if (!tileCensus.biomes.hasOwnProperty(tile.biome)) {
      tileCensus.biomes[tile.biome] = [tile];
   } else {
      tileCensus.biomes[tile.biome]!.push(tile);
   }
}

export function removeTileFromCensus(tile: Tile): void {
   if (!tileCensus.types.hasOwnProperty(tile.type)) {
      throw new Error("Tile type is not in the census.")
   }

   tileCensus.types[tile.type]!.splice(tileCensus.types[tile.type]!.indexOf(tile), 1);
   if (tileCensus.types[tile.type]!.length === 0) {
      delete tileCensus.types[tile.type];
   }

   tileCensus.biomes[tile.biome]!.splice(tileCensus.biomes[tile.biome]!.indexOf(tile), 1);
   if (tileCensus.biomes[tile.biome]!.length === 0) {
      delete tileCensus.biomes[tile.biome];
   }
}

export function getTileTypeCount(tileType: TileType): number {
   const tiles = tileCensus.types[tileType];
   return typeof tiles !== "undefined" ? tiles.length : 0;
}

export function getTilesOfBiome(biomeName: Biome): ReadonlyArray<Tile> {
   const tiles = tileCensus.biomes[biomeName];
   return typeof tiles !== "undefined" ? tiles : [];
}

export function getTilesOfType(type: TileType): ReadonlyArray<Tile> {
   const tiles = tileCensus.types[type];
   return typeof tiles !== "undefined" ? tiles : [];
}

export function resetCensus(): void {
   for (let i = 0; i < NUM_ENTITY_TYPES; i++) {
      entityCounts[i] = 0;
   }

   tileCensus.types = {};
   tileCensus.biomes = {};
}
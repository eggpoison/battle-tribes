import { EntityID, EntityType, NUM_ENTITY_TYPES } from "battletribes-shared/entities";
import { TileType, Biome, NUM_TILE_TYPES, NUM_BIOMES } from "battletribes-shared/tiles";
import Board from "./Board";
import { TileIndex } from "battletribes-shared/utils";

const entityCounts = new Array<EntityType>();
for (let i = 0; i < NUM_ENTITY_TYPES; i++) {
   entityCounts.push(0);
}

interface TileCensus {
   readonly types: Record<TileType, Array<TileIndex>>;
   biomes: Record<Biome, Array<TileIndex>>;
}

const tileCensus: TileCensus = {
   types: (() => {
      const types: Partial<Record<TileType, Array<TileIndex>>> = {};
      for (let tileType: TileType = 0; tileType < NUM_TILE_TYPES; tileType++) {
         types[tileType] = [];
      }
      return types as Record<TileType, Array<TileIndex>>;
   })(),
   biomes: (() => {
      const biomes: Partial<Record<Biome, Array<TileIndex>>> = {};
      for (let biome: Biome = 0; biome < NUM_BIOMES; biome++) {
         biomes[biome] = [];
      }
      return biomes as Record<Biome, Array<TileIndex>>;
   })()
};

/** Stores the IDs of all entities that are being tracked in the census */
const trackedEntityIDs = new Set<number>();

export function addEntityToCensus(entity: EntityID, entityType: EntityType): void {
   entityCounts[entityType]++;
   trackedEntityIDs.add(entity);
}

export function removeEntityFromCensus(entity: EntityID): void {
   if (!trackedEntityIDs.has(entity)) return;
   
   const entityType = Board.getEntityType(entity)!;
   
   if (entityCounts[entityType] <= 0) {
      console.log(entityCounts);
      console.warn(`Entity type "${entityType}" is not in the census.`);
      console.trace();
      throw new Error();
   }

   entityCounts[entityType]--;
   trackedEntityIDs.delete(entity);
}

export function getEntityCount(entityType: EntityType): number {
   return entityCounts[entityType];
}

export function addTileToCensus(tileIndex: TileIndex): void {
   const tileType = Board.tileTypes[tileIndex] as TileType;
   tileCensus.types[tileType].push(tileIndex);

   const biome = Board.tileBiomes[tileIndex] as Biome;
   tileCensus.biomes[biome].push(tileIndex);
}

export function removeTileFromCensus(tileIndex: TileIndex): void {
   const tileType = Board.tileTypes[tileIndex] as TileType;
   tileCensus.types[tileType].splice(tileCensus.types[tileType].indexOf(tileIndex), 1);

   const biome = Board.tileBiomes[tileIndex] as Biome;
   tileCensus.biomes[biome].splice(tileCensus.biomes[biome].indexOf(tileIndex), 1);
}

export function getTileTypeCount(tileType: TileType): number {
   const tiles = tileCensus.types[tileType];
   return typeof tiles !== "undefined" ? tiles.length : 0;
}

export function getTilesOfBiome(biomeName: Biome): ReadonlyArray<TileIndex> {
   return tileCensus.biomes[biomeName];
}
import { Entity, EntityType, NUM_ENTITY_TYPES } from "battletribes-shared/entities";
import { TileType } from "battletribes-shared/tiles";
import { Biome } from "../../shared/src/biomes";
import Layer from "./Layer";
import { getTileX, getTileY, TileIndex, tileIsInWorldIncludingEdges } from "battletribes-shared/utils";
import { getEntityType } from "./world";
import { layers } from "./layers";
import { Settings } from "../../shared/src/settings";

const entityCounts = new Array<EntityType>();
for (let i = 0; i < NUM_ENTITY_TYPES; i++) {
   entityCounts.push(0);
}

/** Stores the IDs of all entities that are being tracked in the census */
const trackedEntityIDs = new Set<number>();

export function addEntityToCensus(entity: Entity, entityType: EntityType): void {
   entityCounts[entityType]++;
   trackedEntityIDs.add(entity);
}

export function removeEntityFromCensus(entity: Entity): void {
   if (!trackedEntityIDs.has(entity)) return;
   
   const entityType = getEntityType(entity);
   
   if (entityCounts[entityType] <= 0) {
      // console.log(entityCounts);
      // console.warn(`Entity type "${entityType}" is not in the census.`);
      // console.trace();
      // throw new Error();
   }

   entityCounts[entityType]--;
   trackedEntityIDs.delete(entity);
}

export function getEntityCount(entityType: EntityType): number {
   return entityCounts[entityType];
}

export function addTileToCensus(layer: Layer, tileIndex: TileIndex): void {
   const tileType = layer.tileTypes[tileIndex] as TileType;
   layer.tileCensus.types[tileType].push(tileIndex);

   const biome = layer.tileBiomes[tileIndex] as Biome;
   layer.tileCensus.biomes[biome].push(tileIndex);
}

export function runTileCensuses(): void {
   for (const layer of layers) {
      for (let tileIndex = 0; tileIndex < Settings.FULL_WORLD_SIZE_TILES * Settings.FULL_WORLD_SIZE_TILES; tileIndex++) {
         const tileX = getTileX(tileIndex);
         const tileY = getTileY(tileIndex);
         if (tileIsInWorldIncludingEdges(tileX, tileY)) {
            addTileToCensus(layer, tileIndex);
         }
      }
   }
}

export function removeTileFromCensus(layer: Layer, tileIndex: TileIndex): void {
   const tileType = layer.tileTypes[tileIndex] as TileType;
   layer.tileCensus.types[tileType].splice(layer.tileCensus.types[tileType].indexOf(tileIndex), 1);

   const biome = layer.tileBiomes[tileIndex] as Biome;
   layer.tileCensus.biomes[biome].splice(layer.tileCensus.biomes[biome].indexOf(tileIndex), 1);
}

export function getTilesOfType(layer: Layer, tileType: TileType): ReadonlyArray<TileIndex> {
   return layer.tileCensus.types[tileType];
}

export function getTilesOfBiome(layer: Layer, biomeName: Biome): ReadonlyArray<TileIndex> {
   return layer.tileCensus.biomes[biomeName];
}
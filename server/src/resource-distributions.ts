import { EntityType, NUM_ENTITY_TYPES } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Point, TileIndex } from "battletribes-shared/utils";
import Layer, { getTileIndexIncludingEdges, getTileX, getTileY } from "./Layer";
import { TransformComponentArray } from "./components/TransformComponent";
import { getEntityType, surfaceLayer, undergroundLayer } from "./world";
import { getEntitySpawnableTiles, getEntitySpawnInfo, SpawningEntityType } from "./entity-spawning";

const enum Vars {
   /** Size of each sample in tiles */
   SAMPLE_SIZE = 4,
   SAMPLE_UNITS = Vars.SAMPLE_SIZE * Settings.TILE_SIZE,
   SAMPLES_IN_WORLD_SIZE = Settings.TILES_IN_WORLD_WIDTH / Vars.SAMPLE_SIZE
}

/** How dense the sample is. The higher the number, the lower the chance of a position being generated there. */
type SampleDensity = number;

const distributions: Record<number, Array<SampleDensity>> = {};
const totalSampleDensities: Record<number, number> = {};

for (let entityType: EntityType = 0; entityType < NUM_ENTITY_TYPES; entityType++) {
   const samples = new Array<number>();
   for (let i = 0; i < Vars.SAMPLES_IN_WORLD_SIZE * Vars.SAMPLES_IN_WORLD_SIZE; i++) {
      samples.push(-1);
   }
   distributions[entityType] = samples;
}

const resetDistributions = (entityType: EntityType): void => {
   const samples = distributions[entityType];
   for (let i = 0; i < Vars.SAMPLES_IN_WORLD_SIZE * Vars.SAMPLES_IN_WORLD_SIZE; i++) {
      samples[i] = 0;
   }
}

const countNumSpawnableTiles = (layer: Layer, sampleX: number, sampleY: number, spawnableTiles: ReadonlySet<TileIndex>): number => {
   const originTileX = sampleX * Vars.SAMPLE_SIZE;
   const originTileY = sampleY * Vars.SAMPLE_SIZE;
   
   // @Incomplete: doesn't account for layer
   let count = 0;
   for (let tileX = originTileX; tileX < originTileX + Vars.SAMPLE_SIZE; tileX++) {
      for (let tileY = originTileY; tileY < originTileY + Vars.SAMPLE_SIZE; tileY++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         if (spawnableTiles.has(tileIndex)) {
            count++;
         }
      }
   }

   return count;
}

export function updateResourceDistributions(): void {
   // Reset distributions
   for (let entityType: EntityType = 0; entityType < NUM_ENTITY_TYPES; entityType++) {
      resetDistributions(entityType);
   }

   for (let i = 0; i < TransformComponentArray.activeEntities.length; i++) {
      const entity = TransformComponentArray.activeEntities[i];

      const transformComponent = TransformComponentArray.getComponent(entity);
      const sampleX = Math.floor(transformComponent.position.x / Vars.SAMPLE_UNITS);
      const sampleY = Math.floor(transformComponent.position.y / Vars.SAMPLE_UNITS);

      const sampleIdx = sampleY * Vars.SAMPLES_IN_WORLD_SIZE + sampleX;
      distributions[getEntityType(entity)!][sampleIdx]++;
   }

   // Weight the distributions to the amount of tiles
   for (let entityType: EntityType = 0; entityType < NUM_ENTITY_TYPES; entityType++) {
      const spawnInfo = getEntitySpawnInfo(entityType);
      if (spawnInfo === null) {
         continue;
      }
      
      const samples = distributions[entityType];
      const spawnableTiles = getEntitySpawnableTiles(spawnInfo.entityType as SpawningEntityType);

      let totalDensity = 0;
      
      for (let sampleX = 0; sampleX < Vars.SAMPLES_IN_WORLD_SIZE; sampleX++) {
         for (let sampleY = 0; sampleY < Vars.SAMPLES_IN_WORLD_SIZE; sampleY++) {
            const sampleIndex = sampleY * Vars.SAMPLES_IN_WORLD_SIZE + sampleX;

            const entityCount = samples[sampleIndex];
            let numSpawnableTiles = countNumSpawnableTiles(surfaceLayer, sampleX, sampleY, spawnableTiles);
            numSpawnableTiles += countNumSpawnableTiles(undergroundLayer, sampleX, sampleY, spawnableTiles);

            if (numSpawnableTiles === 0) {
               samples[sampleIndex] = -1;
            } else {
               const density = (entityCount + 0.15) / numSpawnableTiles;
               
               samples[sampleIndex] = 1 / density;
               totalDensity += 1 / density;
            }
         }
      }

      totalSampleDensities[entityType] = totalDensity;
   }
}

const getDistributionWeightedSampleIndex = (entityType: EntityType): number => {
   // @Incomplete: investigate inverse
   
   const totalDensity = totalSampleDensities[entityType];
   const samples = distributions[entityType];

   const targetDensity = totalDensity * Math.random();

   let currentDensity = 0;
   for (let i = 0; i < Vars.SAMPLES_IN_WORLD_SIZE * Vars.SAMPLES_IN_WORLD_SIZE; i++) {
      const density = samples[i];
      if (density === -1) {
         continue;
      }

      currentDensity += density;
      if (currentDensity >= targetDensity) {
         return i;
      }
   }

   throw new Error();
}

const getRandomSpawnableTileIndex = (sampleIdx: number, spawnableTiles: ReadonlySet<TileIndex>): number => {
   const sampleX = sampleIdx % Vars.SAMPLES_IN_WORLD_SIZE;
   const sampleY = Math.floor(sampleIdx / Vars.SAMPLES_IN_WORLD_SIZE);
   
   const originTileX = sampleX * Vars.SAMPLE_SIZE;
   const originTileY = sampleY * Vars.SAMPLE_SIZE;
   
   const spawnableTileIndexes = new Array<number>();
   for (let xOffset = 0; xOffset < Vars.SAMPLE_SIZE; xOffset++) {
      for (let yOffset = 0; yOffset < Vars.SAMPLE_SIZE; yOffset++) {
         const tileX = originTileX + xOffset;
         const tileY = originTileY + yOffset;

         // @Hack
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         if (spawnableTiles.has(tileIndex)) {
            spawnableTileIndexes.push(tileIndex);
         }
      }
   }

   return spawnableTileIndexes[Math.floor(spawnableTileIndexes.length * Math.random())];
}

export function getDistributionWeightedSpawnPosition(entityType: SpawningEntityType): Point {
   const sampleIdx = getDistributionWeightedSampleIndex(entityType);

   const spawnableTiles = getEntitySpawnableTiles(entityType)
   const tileIndex = getRandomSpawnableTileIndex(sampleIdx, spawnableTiles);

   const tileX = getTileX(tileIndex);
   const tileY = getTileY(tileIndex);
   
   const x = (tileX + Math.random()) * Settings.TILE_SIZE;
   const y = (tileY + Math.random()) * Settings.TILE_SIZE;
   return new Point(x, y);
}
import { EntityType, NUM_ENTITY_TYPES } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { TileType } from "webgl-test-shared/dist/tiles";
import { Point } from "webgl-test-shared/dist/utils";
import Board from "./Board";
import { SPAWNABLE_TILE_RECORD } from "./entity-spawning";
import { TransformComponentArray } from "./components/TransformComponent";

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

const countNumSpawnableTiles = (sampleX: number, sampleY: number, spawnableTiles: ReadonlyArray<TileType>): number => {
   const originTileX = sampleX * Vars.SAMPLE_SIZE;
   const originTileY = sampleY * Vars.SAMPLE_SIZE;
   
   let count = 0;
   for (let xOffset = 0; xOffset < Vars.SAMPLE_SIZE; xOffset++) {
      for (let yOffset = 0; yOffset < Vars.SAMPLE_SIZE; yOffset++) {
         const tileX = originTileX + xOffset;
         const tileY = originTileY + yOffset;

         if (spawnableTiles.includes(Board.getTileType(tileX, tileY))) {
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

   for (let i = 0; i < Board.entities.length; i++) {
      const entity = Board.entities[i];

      const transformComponent = TransformComponentArray.getComponent(entity);
      const sampleX = Math.floor(transformComponent.position.x / Vars.SAMPLE_UNITS);
      const sampleY = Math.floor(transformComponent.position.y / Vars.SAMPLE_UNITS);

      const sampleIdx = sampleY * Vars.SAMPLES_IN_WORLD_SIZE + sampleX;
      distributions[Board.getEntityType(entity)!][sampleIdx]++;
   }

   // Weight the distributions to the amount of tiles
   for (let entityType: EntityType = 0; entityType < NUM_ENTITY_TYPES; entityType++) {
      if (SPAWNABLE_TILE_RECORD[entityType] === undefined) {
         continue;
      }
      
      const samples = distributions[entityType];
      const spawnableTiles = SPAWNABLE_TILE_RECORD[entityType]!;

      let totalDensity = 0;
      
      for (let sampleX = 0; sampleX < Vars.SAMPLES_IN_WORLD_SIZE; sampleX++) {
         for (let sampleY = 0; sampleY < Vars.SAMPLES_IN_WORLD_SIZE; sampleY++) {
            const sampleIndex = sampleY * Vars.SAMPLES_IN_WORLD_SIZE + sampleX;

            const entityCount = samples[sampleIndex];
            const numSpawnableTiles = countNumSpawnableTiles(sampleX, sampleY, spawnableTiles);

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

const getRandomSpawnableTileIndex = (sampleIdx: number, spawnableTiles: ReadonlyArray<TileType>): number => {
   const sampleX = sampleIdx % Vars.SAMPLES_IN_WORLD_SIZE;
   const sampleY = Math.floor(sampleIdx / Vars.SAMPLES_IN_WORLD_SIZE);
   
   const originTileX = sampleX * Vars.SAMPLE_SIZE;
   const originTileY = sampleY * Vars.SAMPLE_SIZE;
   
   const spawnableTileIndexes = new Array<number>();
   for (let xOffset = 0; xOffset < Vars.SAMPLE_SIZE; xOffset++) {
      for (let yOffset = 0; yOffset < Vars.SAMPLE_SIZE; yOffset++) {
         const tileX = originTileX + xOffset;
         const tileY = originTileY + yOffset;

         if (spawnableTiles.includes(Board.getTileType(tileX, tileY))) {
            const tileIndex = tileY * Settings.TILES_IN_WORLD_WIDTH + tileX;
            spawnableTileIndexes.push(tileIndex);
         }
      }
   }

   return spawnableTileIndexes[Math.floor(spawnableTileIndexes.length * Math.random())];
}

export function getDistributionWeightedSpawnPosition(entityType: EntityType): Point {
   const sampleIdx = getDistributionWeightedSampleIndex(entityType);

   const tileIdx = getRandomSpawnableTileIndex(sampleIdx, SPAWNABLE_TILE_RECORD[entityType]!);

   const tileX = tileIdx % Settings.TILES_IN_WORLD_WIDTH;
   const tileY = Math.floor(tileIdx / Settings.TILES_IN_WORLD_WIDTH);
   
   const x = (tileX + Math.random()) * Settings.TILE_SIZE;
   const y = (tileY + Math.random()) * Settings.TILE_SIZE;
   return new Point(x, y);
}
import { Biome } from "../../shared/src/biomes";
import { Entity, EntityType } from "../../shared/src/entities";
import { Settings } from "../../shared/src/settings";
import { TileType } from "../../shared/src/tiles";
import { assert, getTileIndexIncludingEdges, Point } from "../../shared/src/utils";
import { EntityConfig } from "./components";
import { AutoSpawnedComponent } from "./components/AutoSpawnedComponent";
import Layer from "./Layer";

// @Cleanup: should probably combine this file with entity-spawning...

export interface PackSpawningInfo {
   getPackSize(pos: Readonly<Point>): number;
   /** Distance from the original spawn that pack spawns can be made in */
   readonly spawnRange: number;
}

interface EntityBlockDensityInfo {
   readonly blockIdx: number;
   readonly density: number;
}

export interface SpawnDistribution {
   readonly currentDensities: Float32Array;
   readonly targetDensities: Float32Array;
   readonly blockSize: number;
   readonly entityDensityMap: Map<Entity, Array<EntityBlockDensityInfo>>;
}

export interface EntitySpawnEvent {
   /** All the types of entities which are spawned by the spawn event */
   readonly entityTypes: ReadonlyArray<EntityType>;
   readonly layer: Layer;
   /** Average number of spawn attempts that happen each second per chunk. */
   readonly spawnRate: number;
   readonly biome: Biome;
   readonly tileTypes: ReadonlyArray<TileType>;
   readonly onlySpawnsInNight: boolean;
   /** Minimum distance a spawn event can occur from another entity */
   readonly minSpawnDistance: number;
   readonly packSpawning?: PackSpawningInfo;
   readonly spawnDistribution: SpawnDistribution;
   readonly balanceSpawnDistribution: boolean;
   /** If true, all tiles that the entity's hitboxes are overlapping with must match the spawnable entity types. */
   readonly doStrictTileTypeCheck: boolean;
   /** If true, the entity must not be overlapping with any other collideable entities. */
   readonly doStrictCollisionCheck?: boolean;
   readonly createEntity: (pos: Readonly<Point>, angle: number, firstEntityConfig: ReadonlyArray<EntityConfig> | null, layer: Layer) => ReadonlyArray<EntityConfig> | null;
   readonly customSpawnIsValidFunc?: (spawnInfo: EntitySpawnEvent, spawnOriginX: number, spawnOriginY: number) => boolean;
}

// @Incomplete!
   // {
   //    entityType: EntityType.fibrePlant,
   //    spawnRate: 0.001,
   //    maxDensity: 0.0015,
   //    minPackSize: 1,
   //    maxPackSize: 1,
   //    onlySpawnsInNight: false,
   //    minSpawnDistance: 45,
   //    usesSpawnDistribution: true
   // },
   
export const SPAWN_INFOS = new Array<EntitySpawnEvent>();

const countNumSpawnableTiles = (spawnInfo: EntitySpawnEvent, blockX: number, blockY: number): number => {
   const blockSize = spawnInfo.spawnDistribution.blockSize;

   const originTileX = blockX * blockSize;
   const originTileY = blockY * blockSize;
   
   // @Incomplete: doesn't account for layer
   let count = 0;
   for (let tileX = originTileX; tileX < originTileX + blockSize; tileX++) {
      for (let tileY = originTileY; tileY < originTileY + blockSize; tileY++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         const tileType = spawnInfo.layer.getTileType(tileIndex);
         if (spawnInfo.tileTypes.includes(tileType)) {
            count++;
         }
      }
   }

   return count;
}

/** Max density is the target number of entities per tile */
export function createRawSpawnDistribution(blockSize: number, maxDensity: number): SpawnDistribution {
   // @Copynpaste
   const BLOCKS_IN_BOARD_DIMENSIONS = Settings.WORLD_SIZE_TILES / blockSize;
   assert(Math.floor(BLOCKS_IN_BOARD_DIMENSIONS) === BLOCKS_IN_BOARD_DIMENSIONS);

   const densityPerBlock = maxDensity * blockSize * blockSize;

   const currentDensities = new Float32Array(BLOCKS_IN_BOARD_DIMENSIONS * BLOCKS_IN_BOARD_DIMENSIONS);
   const targetDensities = new Float32Array(BLOCKS_IN_BOARD_DIMENSIONS * BLOCKS_IN_BOARD_DIMENSIONS);

   for (let i = 0; i < targetDensities.length; i++) {
      targetDensities[i] = densityPerBlock;
   }
   
   return {
      currentDensities: currentDensities,
      targetDensities: targetDensities,
      blockSize: blockSize,
      entityDensityMap: new Map()
   };
}

/** Takes into account the spawnable tiles into the raw spawn distribution */
const createBaseSpawnDistribution = (spawnInfo: EntitySpawnEvent): void => {
   const blockSize = spawnInfo.spawnDistribution.blockSize;
   
   const BLOCKS_IN_BOARD_DIMENSIONS = Settings.WORLD_SIZE_TILES / blockSize;
   assert(Math.floor(BLOCKS_IN_BOARD_DIMENSIONS) === BLOCKS_IN_BOARD_DIMENSIONS);
   
   const targetDensities = new Float32Array(BLOCKS_IN_BOARD_DIMENSIONS * BLOCKS_IN_BOARD_DIMENSIONS);
   let i = 0;
   for (let blockY = 0; blockY < BLOCKS_IN_BOARD_DIMENSIONS; blockY++) {
      for (let blockX = 0; blockX < BLOCKS_IN_BOARD_DIMENSIONS; blockX++) {
         const numSpawnableTiles = countNumSpawnableTiles(spawnInfo, blockX, blockY);

         const targetDensity = numSpawnableTiles / (blockSize * blockSize);
         targetDensities[i] = targetDensity;
         i++;
      }
   }

   for (let i = 0; i < spawnInfo.spawnDistribution.targetDensities.length; i++) {
      spawnInfo.spawnDistribution.targetDensities[i] *= targetDensities[i];
   }
}

export function addEntityToSpawnDistribution(spawnDistribution: SpawnDistribution, entity: Entity, x: number, y: number): void {
   // Distribute a density of 1 amongst the blocks in a diamond-shaped expansion
   // @Correctness: Instead of adding from just the position of the entity, it should add from all blocks in the bounding area
   
   const blockSize = spawnDistribution.blockSize;
   // @Copynpaste
   const BLOCKS_IN_BOARD_DIMENSIONS = Settings.WORLD_SIZE_TILES / blockSize;
   
   const blockX = Math.floor(x / Settings.TILE_SIZE / blockSize);
   const blockY = Math.floor(y / Settings.TILE_SIZE / blockSize);
   
   let remainingDensity = 1;
   const densityInfos = new Array<EntityBlockDensityInfo>();
   
   const blockIdx = blockY * BLOCKS_IN_BOARD_DIMENSIONS + blockX;
   const blockTargetDensity = spawnDistribution.targetDensities[blockIdx];

   const usedDensity = Math.min(remainingDensity, blockTargetDensity);

   // This can sometimes not be the case due to pack spawning causing an entity to spawn in a block with 0 target density
   if (usedDensity > 0) {
      remainingDensity -= usedDensity;
      densityInfos.push({
         blockIdx: blockIdx,
         density: usedDensity
      });
   }

   for (let dist = 1; remainingDensity > 0; dist++) {
      // Count the total density in the pass
      let totalPassDensity = 0;
      for (let i = 0; i <= dist; i++) {
         // Top right
         if (blockX + i >= 0 && blockX + i < BLOCKS_IN_BOARD_DIMENSIONS && blockY - dist + i >= 0 && blockY - dist + i < BLOCKS_IN_BOARD_DIMENSIONS) {
            const blockIdx = (blockY - dist + i) * BLOCKS_IN_BOARD_DIMENSIONS + blockX + i;
            const blockTargetDensity = spawnDistribution.targetDensities[blockIdx];
            totalPassDensity += blockTargetDensity;
         }
         // Bottom right
         if (blockX + dist - i >= 0 && blockX + dist - i < BLOCKS_IN_BOARD_DIMENSIONS && blockY + i >= 0 && blockY + i < BLOCKS_IN_BOARD_DIMENSIONS) {
            const blockIdx = (blockY + i) * BLOCKS_IN_BOARD_DIMENSIONS + blockX + dist - i;
            const blockTargetDensity = spawnDistribution.targetDensities[blockIdx];
            totalPassDensity += blockTargetDensity;
         }
         // Bottom left
         if (blockX - dist + i >= 0 && blockX - dist + i < BLOCKS_IN_BOARD_DIMENSIONS && blockY + i >= 0 && blockY + i < BLOCKS_IN_BOARD_DIMENSIONS) {
            const blockIdx = (blockY + i) * BLOCKS_IN_BOARD_DIMENSIONS + blockX - dist + i;
            const blockTargetDensity = spawnDistribution.targetDensities[blockIdx];
            totalPassDensity += blockTargetDensity;
         }
         // Top left
         if (blockX - i >= 0 && blockX - i < BLOCKS_IN_BOARD_DIMENSIONS && blockY - dist + i >= 0 && blockY - dist + i < BLOCKS_IN_BOARD_DIMENSIONS) {
            const blockIdx = (blockY - dist + i) * BLOCKS_IN_BOARD_DIMENSIONS + blockX - i;
            const blockTargetDensity = spawnDistribution.targetDensities[blockIdx];
            totalPassDensity += blockTargetDensity;
         }
      }

      const totalUsedDensity = Math.min(remainingDensity, totalPassDensity);
      if (totalUsedDensity === 0) {
         // Empty passes should stop the search
         break;
      }

      for (let i = 0; i <= dist; i++) {
         // Top right
         if (blockX + i >= 0 && blockX + i < BLOCKS_IN_BOARD_DIMENSIONS && blockY - dist + i >= 0 && blockY - dist + i < BLOCKS_IN_BOARD_DIMENSIONS) {
            const blockIdx = (blockY - dist + i) * BLOCKS_IN_BOARD_DIMENSIONS + blockX + i;
            const blockTargetDensity = spawnDistribution.targetDensities[blockIdx];
            const usedDensity = totalUsedDensity * blockTargetDensity / totalPassDensity;
            densityInfos.push({
               blockIdx: blockIdx,
               density: usedDensity
            });
         }
         // Bottom right
         if (blockX + dist - i >= 0 && blockX + dist - i < BLOCKS_IN_BOARD_DIMENSIONS && blockY + i >= 0 && blockY + i < BLOCKS_IN_BOARD_DIMENSIONS) {
            const blockIdx = (blockY + i) * BLOCKS_IN_BOARD_DIMENSIONS + blockX + dist - i;
            const blockTargetDensity = spawnDistribution.targetDensities[blockIdx];
            const usedDensity = totalUsedDensity * blockTargetDensity / totalPassDensity;
            densityInfos.push({
               blockIdx: blockIdx,
               density: usedDensity
            });
         }
         // Bottom left
         if (blockX - dist + i >= 0 && blockX - dist + i < BLOCKS_IN_BOARD_DIMENSIONS && blockY + i >= 0 && blockY + i < BLOCKS_IN_BOARD_DIMENSIONS) {
            const blockIdx = (blockY + i) * BLOCKS_IN_BOARD_DIMENSIONS + blockX - dist + i;
            const blockTargetDensity = spawnDistribution.targetDensities[blockIdx];
            const usedDensity = totalUsedDensity * blockTargetDensity / totalPassDensity;
            densityInfos.push({
               blockIdx: blockIdx,
               density: usedDensity
            });
         }
         // Top left
         if (blockX - i >= 0 && blockX - i < BLOCKS_IN_BOARD_DIMENSIONS && blockY - dist + i >= 0 && blockY - dist + i < BLOCKS_IN_BOARD_DIMENSIONS) {
            const blockIdx = (blockY - dist + i) * BLOCKS_IN_BOARD_DIMENSIONS + blockX - i;
            const blockTargetDensity = spawnDistribution.targetDensities[blockIdx];
            const usedDensity = totalUsedDensity * blockTargetDensity / totalPassDensity;
            densityInfos.push({
               blockIdx: blockIdx,
               density: usedDensity
            });
         }
      }

      remainingDensity -= totalUsedDensity;
   }

   spawnDistribution.entityDensityMap.set(entity, densityInfos);

   // Affect the current densities
   for (const densityInfo of densityInfos) {
      spawnDistribution.currentDensities[densityInfo.blockIdx] += densityInfo.density;
   }
}

export function removeEntityFromSpawnDistributions(entity: Entity, autoSpawnedComponent: AutoSpawnedComponent): void {
   const spawnInfo = autoSpawnedComponent.spawnInfo;
   const spawnDistribution = spawnInfo.spawnDistribution;
   
   const densityInfos = spawnDistribution.entityDensityMap.get(entity);
   if (typeof densityInfos !== "undefined") {
      // Remove from the current densities
      // (Note: this will accumulate floating point errors, but that's what the regular distribution updates are for)
      for (const densityInfo of densityInfos) {
         spawnDistribution.currentDensities[densityInfo.blockIdx] -= densityInfo.density;
      }
      spawnInfo.spawnDistribution.entityDensityMap.delete(entity);
   }
}

export function registerNewSpawnInfo(spawnInfo: EntitySpawnEvent): void {
   createBaseSpawnDistribution(spawnInfo);
   SPAWN_INFOS.push(spawnInfo);
}

// @HACK: there are sometimes multiple spawn infos per entity... this is ass
export function getSpawnInfoForEntityType(entityType: EntityType): EntitySpawnEvent | null {
   for (const spawnInfo of SPAWN_INFOS) {
      if (spawnInfo.entityTypes.includes(entityType)) {
         return spawnInfo;
      }
   }

   return null;
}

export function spawnPositionLacksDensity(spawnInfo: EntitySpawnEvent, x: number, y: number): boolean {
   const spawnDistribution = spawnInfo.spawnDistribution;
   const blockSize = spawnDistribution.blockSize;
   
   // @Copynpaste
   const BLOCKS_IN_BOARD_DIMENSIONS = Settings.WORLD_SIZE_TILES / blockSize;

   const blockX = Math.floor(x / Settings.TILE_SIZE / blockSize);
   const blockY = Math.floor(y / Settings.TILE_SIZE / blockSize);
   const blockIdx = blockY * BLOCKS_IN_BOARD_DIMENSIONS + blockX;

   const currentDensity = spawnDistribution.currentDensities[blockIdx];
   const targetDensity = spawnDistribution.targetDensities[blockIdx];
   return currentDensity < targetDensity;
}
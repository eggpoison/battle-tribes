import { EntityType, EntityTypeString } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { STRUCTURE_TYPES, StructureType } from "webgl-test-shared/dist/structures";
import { TileType } from "webgl-test-shared/dist/tiles";
import { Point, randInt, randFloat } from "webgl-test-shared/dist/utils";
import Board from "./Board";
import { addEntityToCensus, getEntityCount, getTileTypeCount } from "./census";
import OPTIONS from "./options";
import SRandom from "./SRandom";
import { NUM_ENTITY_TYPES } from "./Entity";
import { createEntity } from "./entity-creation";
import { yetiSpawnPositionIsValid } from "./entities/mobs/yeti";
import { SERVER } from "./server";
import { getDistributionWeightedSpawnPosition } from "./resource-distributions";

const PACK_SPAWN_RANGE = 200;

const enum Vars {
   TRIBESMAN_SPAWN_EXCLUSION_RANGE = 2000
}

/** Record of entity types -> arrays of all tile types in which the entity is able to be spawned in */
export const SPAWNABLE_TILE_RECORD: Partial<Record<EntityType, ReadonlyArray<TileType>>> = {
   [EntityType.cow]: [TileType.grass],
   [EntityType.berryBush]: [TileType.grass],
   [EntityType.tree]: [TileType.grass],
   [EntityType.tombstone]: [TileType.grass],
   [EntityType.boulder]: [TileType.rock],
   [EntityType.cactus]: [TileType.sand],
   [EntityType.yeti]: [TileType.snow],
   [EntityType.iceSpikes]: [TileType.ice, TileType.permafrost],
   [EntityType.slimewisp]: [TileType.slime],
   [EntityType.krumblid]: [TileType.sand],
   [EntityType.frozenYeti]: [TileType.fimbultur],
   [EntityType.fish]: [TileType.water],
   [EntityType.golem]: [TileType.rock],
   [EntityType.tribeWorker]: [TileType.grass, TileType.rock, TileType.sand, TileType.snow, TileType.ice]
};

export interface EntitySpawnInfo {
   /** The type of entity to spawn */
   readonly entityType: EntityType;
   /** Average number of spawn attempts that happen each second per chunk. */
   readonly spawnRate: number;
   /** Maximum global density per tile the entity type can have. */
   readonly maxDensity: number;
   readonly minPackSize: number;
   readonly maxPackSize: number;
   readonly onlySpawnsInNight: boolean;
   /** Minimum distance a spawn event can occur from another entity */
   readonly minSpawnDistance: number;
   readonly usesSpawnDistribution: boolean;
}

const SPAWN_INFOS: ReadonlyArray<EntitySpawnInfo> = [
   {
      entityType: EntityType.cow,
      spawnRate: 0.01,
      maxDensity: 0.004,
      minPackSize: 2,
      maxPackSize: 5,
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      usesSpawnDistribution: false
   },
   {
      entityType: EntityType.berryBush,
      spawnRate: 0.001,
      maxDensity: 0.0025,
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      usesSpawnDistribution: true
   },
   {
      entityType: EntityType.tree,
      spawnRate: 0.013,
      maxDensity: 0.02,
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 75,
      usesSpawnDistribution: true
   },
   {
      entityType: EntityType.tombstone,
      spawnRate: 0.01,
      maxDensity: 0.003,
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: true,
      minSpawnDistance: 150,
      usesSpawnDistribution: false
   },
   {
      entityType: EntityType.boulder,
      spawnRate: 0.005,
      maxDensity: 0.025,
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 60,
      usesSpawnDistribution: true
   },
   {
      entityType: EntityType.cactus,
      spawnRate: 0.005,
      maxDensity: 0.03,
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 75,
      usesSpawnDistribution: true
   },
   {
      entityType: EntityType.yeti,
      spawnRate: 0.004,
      maxDensity: 0.008,
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      usesSpawnDistribution: false
   },
   {
      entityType: EntityType.iceSpikes,
      spawnRate: 0.015,
      maxDensity: 0.06,
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      usesSpawnDistribution: false
   },
   {
      entityType: EntityType.slimewisp,
      spawnRate: 0.2,
      maxDensity: 0.3,
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 50,
      usesSpawnDistribution: false
   },
   {
      entityType: EntityType.krumblid,
      spawnRate: 0.005,
      maxDensity: 0.015,
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      usesSpawnDistribution: false
   },
   {
      entityType: EntityType.frozenYeti,
      spawnRate: 0.004,
      maxDensity: 0.008,
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      usesSpawnDistribution: false
   },
   {
      entityType: EntityType.fish,
      spawnRate: 0.015,
      maxDensity: 0.03,
      minPackSize: 3,
      maxPackSize: 4,
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      usesSpawnDistribution: false
   },
   {
      entityType: EntityType.golem,
      spawnRate: 0.002,
      maxDensity: 0.004,
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      usesSpawnDistribution: true
   },
   {
      entityType: EntityType.tribeWorker,
      spawnRate: 0.002,
      maxDensity: 0.002,
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 100,
      usesSpawnDistribution: false
   }
];

const tribesmanSpawnPositionIsValid = (x: number, y: number): boolean => {
   if (!OPTIONS.spawnTribes) {
      return false;
   }
   
   // @Cleanup: copy and paste
   
   const minChunkX = Math.max(Math.min(Math.floor((x - Vars.TRIBESMAN_SPAWN_EXCLUSION_RANGE) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((x + Vars.TRIBESMAN_SPAWN_EXCLUSION_RANGE) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((y - Vars.TRIBESMAN_SPAWN_EXCLUSION_RANGE) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((y + Vars.TRIBESMAN_SPAWN_EXCLUSION_RANGE) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);

   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            if (!STRUCTURE_TYPES.includes(entity.type as StructureType)
               && entity.type !== EntityType.tribeWorker
               && entity.type !== EntityType.tribeWarrior) {
               continue;
            }
            
            const distanceSquared = Math.pow(x - entity.position.x, 2) + Math.pow(y - entity.position.y, 2);
            if (distanceSquared <= Vars.TRIBESMAN_SPAWN_EXCLUSION_RANGE * Vars.TRIBESMAN_SPAWN_EXCLUSION_RANGE) {
               return false;
            }
         }
      }
   }

   return true;
}

const customSpawnConditionsAreMet = (spawnInfo: EntitySpawnInfo, spawnOriginX: number, spawnOriginY: number) => {
   switch (spawnInfo.entityType) {
      case EntityType.yeti: {
         return yetiSpawnPositionIsValid(spawnOriginX, spawnOriginY);
      }
      case EntityType.tribeWorker: {
         return tribesmanSpawnPositionIsValid(spawnOriginX, spawnOriginY);
      }
   }

   return true;
}

const spawnConditionsAreMet = (spawnInfo: EntitySpawnInfo): boolean => {
   let numEligibleTiles = 0;
   for (const tileType of SPAWNABLE_TILE_RECORD[spawnInfo.entityType]!) {
      numEligibleTiles += getTileTypeCount(tileType);
   }
   
   // If there are no tiles upon which the entity is able to be spawned, the spawn conditions aren't valid
   if (numEligibleTiles === 0) return false;
   
   // Check if the entity density is right
   const entityCount = getEntityCount(spawnInfo.entityType);
   const density = entityCount / numEligibleTiles;
   if (density > spawnInfo.maxDensity) {
      return false;
   }

   // Make sure the spawn time is right
   if (spawnInfo.onlySpawnsInNight && !Board.isNight()) {
      return false;
   }
   
   return true;
}

const spawnEntities = (spawnInfo: EntitySpawnInfo, spawnOriginX: number, spawnOriginY: number): void => {
   // @Incomplete @Cleanup: Make all cows spawn with the same type,
   // and make fish spawn with the same colour
   
   // const cowSpecies = randInt(0, 1);
   
   const entity = createEntity(new Point(spawnOriginX, spawnOriginY), spawnInfo.entityType);
   addEntityToCensus(entity);
   if (!SERVER.isRunning) {
      Board.pushJoinBuffer();
   }

   // Pack spawning
 
   const minX = Math.max(spawnOriginX - PACK_SPAWN_RANGE, 0);
   const maxX = Math.min(spawnOriginX + PACK_SPAWN_RANGE, Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - 1);
   const minY = Math.max(spawnOriginY - PACK_SPAWN_RANGE, 0);
   const maxY = Math.min(spawnOriginY + PACK_SPAWN_RANGE, Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - 1);

   let totalSpawnAttempts = 0;

   let spawnCount: number;
   if (OPTIONS.inBenchmarkMode) {
      spawnCount = SRandom.randInt(spawnInfo.minPackSize, spawnInfo.maxPackSize) - 1;
   } else {
      spawnCount = randInt(spawnInfo.minPackSize, spawnInfo.maxPackSize) - 1;
   }

   for (let i = 0; i < spawnCount - 1;) {
      if (++totalSpawnAttempts === 100) {
         break;
      }

      // @Speed: Garbage collection, and doing a whole bunch of unnecessary continues here
      
      // Generate a spawn position near the spawn origin
      let spawnPositionX: number;
      let spawnPositionY: number;
      if (OPTIONS.inBenchmarkMode) {
         spawnPositionX = SRandom.randFloat(minX, maxX);
         spawnPositionY = SRandom.randFloat(minY, maxY);
      } else {
         spawnPositionX = randFloat(minX, maxX);
         spawnPositionY = randFloat(minY, maxY);
      }

      const tile = Board.getTile(Math.floor(spawnPositionX / Settings.TILE_SIZE), Math.floor(spawnPositionY / Settings.TILE_SIZE));
      if (!SPAWNABLE_TILE_RECORD[spawnInfo.entityType]!.includes(tile.type)) {
         continue;
      }

      if (spawnPositionIsValid(spawnInfo, spawnPositionX, spawnPositionY)) {
         const spawnPosition = new Point(randInt(minX, maxX), randInt(minY, maxY));
         const entity = createEntity(spawnPosition, spawnInfo.entityType);
         addEntityToCensus(entity);
         if (!SERVER.isRunning) {
            Board.pushJoinBuffer();
         }
         i++;
      }
   }
}

export function spawnPositionIsValid(spawnInfo: EntitySpawnInfo, positionX: number, positionY: number): boolean {
   const minChunkX = Math.max(Math.min(Math.floor((positionX - spawnInfo.minSpawnDistance) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((positionX + spawnInfo.minSpawnDistance) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((positionY - spawnInfo.minSpawnDistance) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((positionY + spawnInfo.minSpawnDistance) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);

   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            const distanceSquared = Math.pow(positionX - entity.position.x, 2) + Math.pow(positionY - entity.position.y, 2);
            if (distanceSquared <= spawnInfo.minSpawnDistance * spawnInfo.minSpawnDistance) {
               return false;
            }
         }
      }
   }

   return true;
}

const runSpawnEvent = (spawnInfo: EntitySpawnInfo): void => {
   // Pick a random tile to spawn at
   // @Speed: Instead of randomly picking a tile until it matches the spawnable, pick a random tile from the spawnable tiles
   const tileX = randInt(0, Settings.BOARD_SIZE * Settings.CHUNK_SIZE - 1);
   const tileY = randInt(0, Settings.BOARD_SIZE * Settings.CHUNK_SIZE - 1);
   const tile = Board.getTile(tileX, tileY);

   // If the tile is a valid tile for the spawn info, continue with the spawn event
   if (SPAWNABLE_TILE_RECORD[spawnInfo.entityType]!.includes(tile.type)) {
      // Calculate a random position in that tile to run the spawn at
      let x: number;
      let y: number;
      if (spawnInfo.usesSpawnDistribution) {
         const position = getDistributionWeightedSpawnPosition(spawnInfo.entityType);
         x = position.x;
         y = position.y;
      } else {
         x = (tileX + Math.random()) * Settings.TILE_SIZE;
         y = (tileY + Math.random()) * Settings.TILE_SIZE;
      }
      
      if (spawnPositionIsValid(spawnInfo, x, y) && customSpawnConditionsAreMet(spawnInfo, x, y)) {
         spawnEntities(spawnInfo, x, y);
      }
   }
}

export function runSpawnAttempt(): void {
   if (!OPTIONS.spawnEntities) {
      return;
   }

   for (let i = 0; i < SPAWN_INFOS.length; i++) {
      const spawnInfo = SPAWN_INFOS[i];
      if (!spawnConditionsAreMet(spawnInfo)) {
         continue;
      }

      let numSpawnEvents = Settings.BOARD_SIZE * Settings.BOARD_SIZE * spawnInfo.spawnRate / Settings.TPS;
      const rand = OPTIONS.inBenchmarkMode ? SRandom.next() : Math.random();
      if (rand < numSpawnEvents % 1) {
         numSpawnEvents = Math.ceil(numSpawnEvents);
      } else {
         numSpawnEvents = Math.floor(numSpawnEvents);
      }
      for (let j = 0; j < numSpawnEvents; j++) {
         runSpawnEvent(spawnInfo);
         if (!spawnConditionsAreMet(spawnInfo)) {
            break;
         }
      }
   }
}

export function spawnInitialEntities(): void {
   if (!OPTIONS.spawnEntities) {
      return;
   }

   let numSpawnAttempts: number;

   // For each spawn info object, spawn entities until no more can be spawned
   for (const spawnInfo of SPAWN_INFOS) {
      if (spawnInfo.entityType >= NUM_ENTITY_TYPES) {
         throw new Error("NUM_ENTITY_TYPES too small (need at least" + (spawnInfo.entityType + 1) + ")");
      }
      
      numSpawnAttempts = 0;
      while (spawnConditionsAreMet(spawnInfo)) {
         runSpawnEvent(spawnInfo);

         if (++numSpawnAttempts >= 9999) {
               console.warn("Exceeded maximum number of spawn attempts for " + EntityTypeString[spawnInfo.entityType] + " with " + getEntityCount(spawnInfo.entityType) + " entities.");
            break;
         }
      }
   }
}
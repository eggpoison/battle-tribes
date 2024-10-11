import { EntityType, EntityTypeString, NUM_ENTITY_TYPES } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { TileType, TileTypeString } from "battletribes-shared/tiles";
import { Point, randInt, randFloat, TileIndex } from "battletribes-shared/utils";
import Layer, { getTileIndexIncludingEdges } from "./Layer";
import { addEntityToCensus, getEntityCount, getTilesOfType } from "./census";
import OPTIONS from "./options";
import SRandom from "./SRandom";
import { createEntityFromConfig, entityIsStructure } from "./Entity";
import { SERVER } from "./server/server";
import { getDistributionWeightedSpawnPosition } from "./resource-distributions";
import { entityIsTribesman } from "./entities/tribes/tribe-member";
import { TransformComponentArray } from "./components/TransformComponent";
import { yetiSpawnPositionIsValid } from "./components/YetiComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { getEntityType, getLayerByType, isNight, LayerType, pushJoinBuffer } from "./world";
import { EntityConfig } from "./components";
import { createCowConfig } from "./entities/mobs/cow";
import { createBerryBushConfig } from "./entities/resources/berry-bush";
import { createTombstoneConfig } from "./entities/tombstone";
import { createBoulderConfig } from "./entities/resources/boulder";
import { createCactusConfig } from "./entities/resources/cactus";
import { createYetiConfig } from "./entities/mobs/yeti";
import { createIceSpikesConfig } from "./entities/resources/ice-spikes";
import { createSlimewispConfig } from "./entities/mobs/slimewisp";
import { createKrumblidConfig } from "./entities/mobs/krumblid";
import { createFrozenYetiConfig } from "./entities/mobs/frozen-yeti";
import { createFishConfig } from "./entities/mobs/fish";
import { createLilypadConfig } from "./entities/lilypad";
import { createGolemConfig } from "./entities/mobs/golem";
import { createTribeWorkerConfig } from "./entities/tribes/tribe-worker";
import { TribeType } from "battletribes-shared/tribes";
import Tribe from "./Tribe";
import { createTreeConfig } from "./entities/resources/tree";

const PACK_SPAWN_RANGE = 200;

const enum Vars {
   TRIBESMAN_SPAWN_EXCLUSION_RANGE = 2000
}

export interface EntitySpawnInfo {
   readonly layerType: LayerType;
   /** The type of entity to spawn */
   readonly entityType: EntityType;
   /** Average number of spawn attempts that happen each second per chunk. */
   readonly spawnRate: number;
   /** Maximum global density per tile the entity type can have. */
   readonly maxDensity: number;
   readonly spawnableTileTypes: ReadonlyArray<TileType>;
   readonly minPackSize: number;
   readonly maxPackSize: number;
   readonly onlySpawnsInNight: boolean;
   /** Minimum distance a spawn event can occur from another entity */
   readonly minSpawnDistance: number;
   readonly usesSpawnDistribution: boolean;
}

const unspawnableTiles = new Set<TileIndex>();
const SPAWN_INFOS = [
   {
      layerType: LayerType.surface,
      entityType: EntityType.cow,
      spawnRate: 0.01,
      maxDensity: 0.004,
      spawnableTileTypes: [TileType.grass],
      minPackSize: 2,
      maxPackSize: 5,
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      usesSpawnDistribution: false
   },
   {
      layerType: LayerType.surface,
      entityType: EntityType.berryBush,
      spawnRate: 0.001,
      maxDensity: 0.0025,
      spawnableTileTypes: [TileType.grass],
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      usesSpawnDistribution: true
   },
   {
      layerType: LayerType.surface,
      entityType: EntityType.tree,
      spawnRate: 0.013,
      maxDensity: 0.02,
      spawnableTileTypes: [TileType.grass],
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 75,
      usesSpawnDistribution: true
   },
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
   // @Temporary
   {
      layerType: LayerType.surface,
      entityType: EntityType.tombstone,
      spawnRate: 0.01,
      maxDensity: 0.003,
      spawnableTileTypes: [TileType.grass],
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: true,
      minSpawnDistance: 150,
      usesSpawnDistribution: false
   },
   {
      layerType: LayerType.surface,
      entityType: EntityType.boulder,
      spawnRate: 0.005,
      maxDensity: 0.025,
      spawnableTileTypes: [TileType.rock],
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 60,
      usesSpawnDistribution: true
   },
   {
      layerType: LayerType.surface,
      entityType: EntityType.cactus,
      spawnRate: 0.005,
      maxDensity: 0.03,
      spawnableTileTypes: [TileType.sand],
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 75,
      usesSpawnDistribution: true
   },
   {
      layerType: LayerType.surface,
      entityType: EntityType.yeti,
      spawnRate: 0.004,
      maxDensity: 0.008,
      spawnableTileTypes: [TileType.snow],
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      usesSpawnDistribution: false
   },
   {
      layerType: LayerType.surface,
      entityType: EntityType.iceSpikes,
      spawnRate: 0.015,
      maxDensity: 0.06,
      spawnableTileTypes: [TileType.ice, TileType.permafrost],
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      usesSpawnDistribution: false
   },
   {
      layerType: LayerType.surface,
      entityType: EntityType.slimewisp,
      spawnRate: 0.2,
      maxDensity: 0.3,
      spawnableTileTypes: [TileType.slime],
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 50,
      usesSpawnDistribution: false
   },
   {
      layerType: LayerType.surface,
      entityType: EntityType.krumblid,
      spawnRate: 0.005,
      maxDensity: 0.015,
      spawnableTileTypes: [TileType.sand],
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      usesSpawnDistribution: false
   },
   // @Temporary
   {
      layerType: LayerType.surface,
      entityType: EntityType.frozenYeti,
      spawnRate: 0.004,
      maxDensity: 0.008,
      spawnableTileTypes: [TileType.fimbultur],
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      usesSpawnDistribution: false
   },
   {
      layerType: LayerType.surface,
      entityType: EntityType.fish,
      spawnRate: 0.015,
      maxDensity: 0.03,
      spawnableTileTypes: [TileType.water],
      minPackSize: 3,
      maxPackSize: 4,
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      usesSpawnDistribution: false
   },
   {
      layerType: LayerType.surface,
      entityType: EntityType.lilypad,
      spawnRate: 0,
      maxDensity: 0.03,
      spawnableTileTypes: [TileType.water],
      minPackSize: 2,
      maxPackSize: 3,
      onlySpawnsInNight: false,
      minSpawnDistance: 0,
      usesSpawnDistribution: false
   },
   {
      layerType: LayerType.surface,
      entityType: EntityType.golem,
      spawnRate: 0.002,
      maxDensity: 0.004,
      spawnableTileTypes: [TileType.rock],
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 150,
      usesSpawnDistribution: true
   },
   {
      layerType: LayerType.surface,
      entityType: EntityType.tribeWorker,
      spawnRate: 0.002,
      maxDensity: 0.002,
      spawnableTileTypes: [TileType.grass, TileType.rock, TileType.sand, TileType.snow, TileType.ice],
      minPackSize: 1,
      maxPackSize: 1,
      onlySpawnsInNight: false,
      minSpawnDistance: 100,
      usesSpawnDistribution: false
   }
] satisfies ReadonlyArray<EntitySpawnInfo>;

export type SpawningEntityType = (typeof SPAWN_INFOS)[number]["entityType"];

let entitySpawnableTiles: Record<SpawningEntityType, ReadonlySet<TileIndex>>;

/** Prevents entities from spawning on the specified tile. */
export function markTileAsUnspawnable(tile: TileIndex): void {
   unspawnableTiles.add(tile);
}

const findSpawnableTiles = (spawnableTileTypes: ReadonlyArray<TileType>): ReadonlySet<TileIndex> => {
   const spawnableTiles = new Set<TileIndex>();
   
   // @Incomplete: accounts for tiles of all layers instead of just the ones from the layer the spawninfo is in
   for (const tileType of spawnableTileTypes) {
      const tileIndexes = getTilesOfType(tileType);
      for (const tileIndex of tileIndexes) {
         if (!unspawnableTiles.has(tileIndex)) {
            spawnableTiles.add(tileIndex);
         }
      }
   }

   return spawnableTiles;
}

/** Creates the spawn info array and fills their spawnable tiles */
export function noteSpawnableTiles(): void {
   const tempEntitySpawnableTiles: Partial<Record<SpawningEntityType, ReadonlySet<TileIndex>>> = {};
   for (let i = 0; i < SPAWN_INFOS.length; i++) {
      const spawnInfo = SPAWN_INFOS[i];
      tempEntitySpawnableTiles[spawnInfo.entityType] = findSpawnableTiles(spawnInfo.spawnableTileTypes);
   }
   entitySpawnableTiles = tempEntitySpawnableTiles as Record<SpawningEntityType, ReadonlySet<TileIndex>>;
}

export function getEntitySpawnableTiles(entityType: SpawningEntityType): ReadonlySet<TileIndex> {
   return entitySpawnableTiles[entityType];
}

export function getEntitySpawnInfo(entityType: EntityType): EntitySpawnInfo | null {
   for (let i = 0; i < SPAWN_INFOS.length; i++) {
      const spawnInfo = SPAWN_INFOS[i];
      if (spawnInfo.entityType === entityType) {
         return spawnInfo;
      }
   }

   return null;
}

const tribesmanSpawnPositionIsValid = (layer: Layer, x: number, y: number): boolean => {
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
         const chunk = layer.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            if (!entityIsStructure(entity) && !entityIsTribesman(getEntityType(entity)!)) {
               continue;
            }

            const transformComponent = TransformComponentArray.getComponent(entity);
            
            const distanceSquared = Math.pow(x - transformComponent.position.x, 2) + Math.pow(y - transformComponent.position.y, 2);
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
         const layer = getLayerByType(spawnInfo.layerType);
         return tribesmanSpawnPositionIsValid(layer, spawnOriginX, spawnOriginY);
      }
   }

   return true;
}

const spawnConditionsAreMet = (spawnInfo: EntitySpawnInfo): boolean => {
   // If there are no tiles upon which the entity is able to be spawned, the spawn conditions aren't valid
   const spawnableTiles = getEntitySpawnableTiles(spawnInfo.entityType as SpawningEntityType);
   const numEligibleTiles = spawnableTiles.size;
   if (numEligibleTiles === 0) return false;
   
   // Check if the entity density is right
   const entityCount = getEntityCount(spawnInfo.entityType);
   const density = entityCount / numEligibleTiles;
   if (density > spawnInfo.maxDensity) {
      return false;
   }

   // Make sure the spawn time is right
   if (spawnInfo.onlySpawnsInNight && !isNight()) {
      return false;
   }
   
   return true;
}

const getTribeType = (layer: Layer, x: number, y: number): TribeType => {
   if (Math.random() < 0.2) {
      return TribeType.goblins;
   }
   
   const tileX = Math.floor(x / Settings.TILE_SIZE);
   const tileY = Math.floor(y / Settings.TILE_SIZE);
   const tileType = layer.getTileXYType(tileX, tileY);
   switch (tileType) {
      case TileType.grass: {
         return TribeType.plainspeople;
      }
      case TileType.sand: {
         return TribeType.barbarians;
      }
      case TileType.snow:
      case TileType.ice: {
         return TribeType.frostlings;
      }
      case TileType.rock: {
         return TribeType.goblins;
      }
      default: {
         return randInt(0, 3);
      }
   }
}

const spawnEntity = (entityType: SpawningEntityType, layer: Layer, x: number, y: number): void => {
   let config: EntityConfig<ServerComponentType.transform>;
   switch (entityType) {
      case EntityType.cow: config = createCowConfig(); break;
      case EntityType.tree: config = createTreeConfig(); break;
      case EntityType.berryBush: config = createBerryBushConfig(); break;
      case EntityType.tombstone: config = createTombstoneConfig(); break;
      case EntityType.boulder: config = createBoulderConfig(); break;
      case EntityType.cactus: config = createCactusConfig(); break;
      case EntityType.yeti: config = createYetiConfig(); break;
      case EntityType.iceSpikes: config = createIceSpikesConfig(0); break;
      case EntityType.slimewisp: config = createSlimewispConfig(); break;
      case EntityType.krumblid: config = createKrumblidConfig(); break;
      case EntityType.frozenYeti: config = createFrozenYetiConfig(); break;
      case EntityType.fish: config = createFishConfig(); break;
      case EntityType.lilypad: config = createLilypadConfig(); break;
      case EntityType.golem: config = createGolemConfig(); break;
      case EntityType.tribeWorker: config = createTribeWorkerConfig(new Tribe(getTribeType(layer, x, y), true)); break;
      // @Robustness
      default: {
         console.log(EntityTypeString[entityType])
         throw new Error();
      }
   }

   config.components[ServerComponentType.transform].position.x = x;
   config.components[ServerComponentType.transform].position.y = y;
   config.components[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
   const entity = createEntityFromConfig(config, layer, 0);

   addEntityToCensus(entity, entityType);
   if (!SERVER.isRunning) {
      pushJoinBuffer(false);
   }
}

const spawnEntities = (spawnInfo: EntitySpawnInfo, spawnOriginX: number, spawnOriginY: number): void => {
   // @Incomplete @Cleanup: Make all cows spawn with the same type,
   // and make fish spawn with the same colour
   
   // const cowSpecies = randInt(0, 1);
   const layer = getLayerByType(spawnInfo.layerType);
   
   spawnEntity(spawnInfo.entityType as SpawningEntityType, layer, spawnOriginX, spawnOriginY);

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

   const spawnableTiles = getEntitySpawnableTiles(spawnInfo.entityType as SpawningEntityType);
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

      const tileX = Math.floor(spawnPositionX / Settings.TILE_SIZE);
      const tileY = Math.floor(spawnPositionY / Settings.TILE_SIZE);
      const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
      if (!spawnableTiles.has(tileIndex)) {
         continue;
      }

      if (spawnPositionIsValid(spawnInfo, spawnPositionX, spawnPositionY)) {
         const x = randInt(minX, maxX);
         const y = randInt(minY, maxY);

         spawnEntity(spawnInfo.entityType as SpawningEntityType, layer, x, y);
         
         i++;
      }
   }
}

export function spawnPositionIsValid(spawnInfo: EntitySpawnInfo, positionX: number, positionY: number): boolean {
   const layer = getLayerByType(spawnInfo.layerType);

   const minChunkX = Math.max(Math.min(Math.floor((positionX - spawnInfo.minSpawnDistance) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((positionX + spawnInfo.minSpawnDistance) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((positionY - spawnInfo.minSpawnDistance) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((positionY + spawnInfo.minSpawnDistance) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.BOARD_SIZE - 1), 0);

   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            const transformComponent = TransformComponentArray.getComponent(entity);
            
            const distanceSquared = Math.pow(positionX - transformComponent.position.x, 2) + Math.pow(positionY - transformComponent.position.y, 2);
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
   const tileIndex = getTileIndexIncludingEdges(tileX, tileY);

   // If the tile is a valid tile for the spawn info, continue with the spawn event
   const spawnableTiles = getEntitySpawnableTiles(spawnInfo.entityType as SpawningEntityType);
   if (spawnableTiles.has(tileIndex)) {
      // Calculate a random position in that tile to run the spawn at
      let x: number;
      let y: number;
      if (spawnInfo.usesSpawnDistribution) {
         const position = getDistributionWeightedSpawnPosition(spawnInfo.entityType as SpawningEntityType);
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
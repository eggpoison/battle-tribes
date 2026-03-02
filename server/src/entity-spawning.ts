import { EntityTypeString } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { randFloat, getTileIndexIncludingEdges, distance, assert, randAngle, Point } from "battletribes-shared/utils";
import Layer from "./Layer";
import { addEntityToCensus, getEntityCount } from "./census";
import OPTIONS from "./options";
import { TransformComponent, TransformComponentArray } from "./components/TransformComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { createEntityImmediate, getEntityType, isNight } from "./world";
import { EntityConfig } from "./components";
import { EntitySpawnEvent, SPAWN_INFOS } from "./entity-spawn-info";
import { HitboxFlag } from "../../shared/src/boxes/boxes";
import { getSubtileIndex } from "../../shared/src/subtiles";
import { undergroundLayer } from "./layers";
import { generateMithrilOre } from "./world-generation/mithril-ore-generation";
import { boxIsCollidingWithSubtile, boxIsCollidingWithTile } from "../../shared/src/collision";
import { CollisionGroup, getEntityCollisionGroup } from "../../shared/src/collision-groups";
import { Hitbox } from "./hitboxes";
import { AutoSpawnedComponent } from "./components/AutoSpawnedComponent";
import { getHitboxesCollidingEntities } from "./collision-detection";

const spawnConditionsAreMet = (spawnInfo: EntitySpawnEvent): boolean => {
   // Make sure there is a block which lacks density
   let isFullyDense = true;
   for (let i = 0; i < spawnInfo.spawnDistribution.targetDensities.length; i++) {
      if (spawnInfo.spawnDistribution.currentDensities[i] < spawnInfo.spawnDistribution.targetDensities[i]) {
         isFullyDense = false;
         break;
      }
   }
   if (isFullyDense) {
      return false;
   }

   // Make sure the spawn time is right
   if (spawnInfo.onlySpawnsInNight && !isNight()) {
      return false;
   }
   
   return true;
}

const tileIsSpawnable = (tileIndex: number, spawnInfo: EntitySpawnEvent): boolean => {
   return spawnInfo.tileTypes.includes(spawnInfo.layer.getTileType(tileIndex)) && spawnInfo.layer.getTileBiome(tileIndex) === spawnInfo.biome && !spawnInfo.layer.unspawnableTiles.has(tileIndex);
}

const hitboxIncludingChildrenWouldSpawnInWall = (layer: Layer, hitbox: Hitbox): boolean => {
   if (hitbox.flags.includes(HitboxFlag.IGNORES_WALL_COLLISIONS)) {
      return false;
   }

   // @Copynpaste from transform component resolveWallCollisions

   const box = hitbox.box;

   const boundsMinX = box.calculateBoundsMinX();
   const boundsMaxX = box.calculateBoundsMaxX();
   const boundsMinY = box.calculateBoundsMinY();
   const boundsMaxY = box.calculateBoundsMaxY();

   const minSubtileX = Math.max(Math.floor(boundsMinX / Settings.SUBTILE_SIZE), -Settings.EDGE_GENERATION_DISTANCE * 4);
   const maxSubtileX = Math.min(Math.floor(boundsMaxX / Settings.SUBTILE_SIZE), (Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) * 4 - 1);
   const minSubtileY = Math.max(Math.floor(boundsMinY / Settings.SUBTILE_SIZE), -Settings.EDGE_GENERATION_DISTANCE * 4);
   const maxSubtileY = Math.min(Math.floor(boundsMaxY / Settings.SUBTILE_SIZE), (Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) * 4 - 1);

   for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
      for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
         const subtileIndex = getSubtileIndex(subtileX, subtileY);
         if (layer.subtileIsWall(subtileIndex) && boxIsCollidingWithSubtile(box, subtileX, subtileY)) {
            return true;
         }
      }
   }

   for (const childHitbox of hitbox.children) {
      if (childHitbox.isPartOfParent && hitboxIncludingChildrenWouldSpawnInWall(layer, childHitbox)) {
         return true;
      }
   }

   return false;
}

const entityWouldSpawnInWall = (layer: Layer, transformComponent: TransformComponent): boolean => {
   for (const rootHitbox of transformComponent.rootHitboxes) {
      if (hitboxIncludingChildrenWouldSpawnInWall(layer, rootHitbox)) {
         return true;
      }
   }

   return false;
}

const hitboxIncludingChildrenTileTypesAreValid = (hitbox: Hitbox, spawnInfo: EntitySpawnEvent): boolean => {
   const minX = hitbox.box.calculateBoundsMinX();
   const maxX = hitbox.box.calculateBoundsMaxX();
   const minY = hitbox.box.calculateBoundsMinY();
   const maxY = hitbox.box.calculateBoundsMaxY();

   const minTileX = Math.floor(minX / Settings.TILE_SIZE);
   const maxTileX = Math.floor(maxX / Settings.TILE_SIZE);
   const minTileY = Math.floor(minY / Settings.TILE_SIZE);
   const maxTileY = Math.floor(maxY / Settings.TILE_SIZE);
   for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         if (!tileIsSpawnable(tileIndex, spawnInfo) && boxIsCollidingWithTile(hitbox.box, tileX, tileY)) {
            return false;
         }
      }
   }

   for (const childHitbox of hitbox.children) {
      if (childHitbox.isPartOfParent && !hitboxIncludingChildrenTileTypesAreValid(childHitbox, spawnInfo)) {
         return false;
      }
   }

   return true;
}

const entityTileTypesAreValid = (entityConfig: EntityConfig, spawnInfo: EntitySpawnEvent): boolean => {
   const transformComponent = entityConfig.components[ServerComponentType.transform]!;
   for (const rootHitbox of transformComponent.rootHitboxes) {
      if (!hitboxIncludingChildrenTileTypesAreValid(rootHitbox, spawnInfo)) {
         return false;
      }
   }
   return true;
}

const attemptToSpawnEntity = (spawnInfo: EntitySpawnEvent, pos: Point, firstEntity: ReadonlyArray<EntityConfig> | null): ReadonlyArray<EntityConfig> | null => {
   // @Bug: If two yetis spawn at once after the server is running, they could potentially have overlapping territories

   const configs = spawnInfo.createEntity(pos, randAngle(), firstEntity, spawnInfo.layer);
   if (configs === null) {
      return null;
   }

   // First make sure the entity wouldn't violate any rules
   for (const config of configs) {
      assert(typeof config.components[ServerComponentType.autoSpawned] === "undefined");
      const autoSpawnedComponent = new AutoSpawnedComponent(spawnInfo);
      config.components[ServerComponentType.autoSpawned] = autoSpawnedComponent;

      const transformComponent = config.components[ServerComponentType.transform];
      if (typeof transformComponent === "undefined" || entityWouldSpawnInWall(spawnInfo.layer, transformComponent)) {
         return null;
      }

      for (const hitbox of transformComponent.hitboxes) {
         if (hitbox.box.calculateBoundsMinX() < 0 || hitbox.box.calculateBoundsMaxX() >= Settings.WORLD_UNITS || hitbox.box.calculateBoundsMinY() < 0 || hitbox.box.calculateBoundsMaxY() >= Settings.WORLD_UNITS) {
            return null;
         }
      }

      // If there is strict tile type checking, make sure all tiles the entity is overlapping with match the spawn info's spawnable tile types
      // @Bug: this seems to be a bit brokey... if enabled with cactus sandy dirt, almost no cacti spawn, which should not be the case.
      // - this may be crippling entity counts that i jhust haven't noticed... or will cripple them in the future. @Investigate
      if (spawnInfo.doStrictTileTypeCheck && !entityTileTypesAreValid(config, spawnInfo)) {
         return null;
      }

      if (spawnInfo.doStrictCollisionCheck) {
         const collidingEntities = getHitboxesCollidingEntities(spawnInfo.layer, transformComponent.hitboxes);
         if (collidingEntities.length > 0) {
            return null;
         }
      }
   }

   // Create the entity
   for (const config of configs) {
      const entity = createEntityImmediate(config, spawnInfo.layer);
      addEntityToCensus(entity, config.entityType);
   }

   return configs;
}

const spawnEntities = (spawnInfo: EntitySpawnEvent, spawnOrigin: Point): void => {
   const firstEntityConfig = attemptToSpawnEntity(spawnInfo, spawnOrigin, null);
   if (firstEntityConfig === null) {
      return;
   }

   // Pack spawning

   if (typeof spawnInfo.packSpawning !== "undefined") {
      const minX = Math.max(spawnOrigin.x - spawnInfo.packSpawning.spawnRange, 0);
      const maxX = Math.min(spawnOrigin.x + spawnInfo.packSpawning.spawnRange, Settings.WORLD_SIZE_TILES * Settings.TILE_SIZE - 1);
      const minY = Math.max(spawnOrigin.y - spawnInfo.packSpawning.spawnRange, 0);
      const maxY = Math.min(spawnOrigin.y + spawnInfo.packSpawning.spawnRange, Settings.WORLD_SIZE_TILES * Settings.TILE_SIZE - 1);
   
      const packSize = spawnInfo.packSpawning.getPackSize(spawnOrigin);
      const additionalSpawnCount = packSize - 1;
   
      for (let numSpawned = 0, totalSpawnAttempts = 0; numSpawned < additionalSpawnCount && totalSpawnAttempts < 100; totalSpawnAttempts++) {
         const x = randFloat(minX, maxX);
         const y = randFloat(minY, maxY);
         const dist = distance(x, y, spawnOrigin.x, spawnOrigin.y);
         if (dist > spawnInfo.packSpawning.spawnRange) {
            continue;
         }
   
         const tileX = Math.floor(x / Settings.TILE_SIZE);
         const tileY = Math.floor(y / Settings.TILE_SIZE);
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         if (!tileIsSpawnable(tileIndex, spawnInfo)) {
            continue;
         }

         if (spawnPositionIsClear(spawnInfo, x, y)) {
            const pos = new Point(x, y);
            attemptToSpawnEntity(spawnInfo, pos, firstEntityConfig);
            numSpawned++;
         }
      }
   }
}

export function spawnPositionIsClear(spawnInfo: EntitySpawnEvent, positionX: number, positionY: number): boolean {
   const minChunkX = Math.max(Math.min(Math.floor((positionX - spawnInfo.minSpawnDistance) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((positionX + spawnInfo.minSpawnDistance) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((positionY - spawnInfo.minSpawnDistance) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((positionY + spawnInfo.minSpawnDistance) / Settings.TILE_SIZE / Settings.CHUNK_SIZE), Settings.WORLD_SIZE_CHUNKS - 1), 0);

   // @Incomplete: does this include grass and reeds??
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = spawnInfo.layer.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            // @Hack
            // @Speed: should be skipped entirely
            const entityType = getEntityType(entity);
            const collisionGroup = getEntityCollisionGroup(entityType);
            if (collisionGroup === CollisionGroup.decoration) {
               continue;
            }
            
            const transformComponent = TransformComponentArray.getComponent(entity);
            // @Hack
            const entityHitbox = transformComponent.hitboxes[0];
            
            const distanceSquared = Math.pow(positionX - entityHitbox.box.position.x, 2) + Math.pow(positionY - entityHitbox.box.position.y, 2);
            if (distanceSquared <= spawnInfo.minSpawnDistance * spawnInfo.minSpawnDistance) {
               return false;
            }
         }
      }
   }

   return true;
}

const runSpawnEvent = (spawnInfo: EntitySpawnEvent): void => {
   const x = Settings.WORLD_UNITS * Math.random();
   const y = Settings.WORLD_UNITS * Math.random();

   // @Copynpaste
   const BLOCKS_IN_BOARD_DIMENSIONS = Settings.WORLD_SIZE_TILES / spawnInfo.spawnDistribution.blockSize;

   const blockX = Math.floor(x / Settings.TILE_SIZE / spawnInfo.spawnDistribution.blockSize);
   const blockY = Math.floor(y / Settings.TILE_SIZE / spawnInfo.spawnDistribution.blockSize);
   const blockIdx = blockY * BLOCKS_IN_BOARD_DIMENSIONS + blockX;

   // Don't spawn entities in places which already have the target density
   if (spawnInfo.spawnDistribution.currentDensities[blockIdx] >= spawnInfo.spawnDistribution.targetDensities[blockIdx]) {
      return;
   }
   
   const tileX = Math.floor(x / Settings.TILE_SIZE);
   const tileY = Math.floor(y / Settings.TILE_SIZE);
   const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
   if (!tileIsSpawnable(tileIndex, spawnInfo)) {
      return;
   }

   if (spawnPositionIsClear(spawnInfo, x, y) && (typeof spawnInfo.customSpawnIsValidFunc === "undefined" || spawnInfo.customSpawnIsValidFunc(spawnInfo, x, y))) {
      const pos = new Point(x, y);
      spawnEntities(spawnInfo, pos);
   }
}

export function runSpawnAttempt(): void {
   if (!OPTIONS.spawnEntities) {
      return;
   }

   // @SQUEAM for horse archer shot
   return;

   // Regular spawning
   for (let i = 0; i < SPAWN_INFOS.length; i++) {
      const spawnInfo = SPAWN_INFOS[i];
      if (!spawnConditionsAreMet(spawnInfo)) {
         continue;
      }

      let numSpawnEvents = Settings.WORLD_SIZE_CHUNKS * Settings.WORLD_SIZE_CHUNKS * spawnInfo.spawnRate * Settings.DT_S;
      if (Math.random() < numSpawnEvents % 1) {
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

   generateMithrilOre(undergroundLayer, false);
}

export function spawnInitialEntities(): void {
   if (!OPTIONS.spawnEntities) {
      return;
   }

   let numSpawnAttempts: number;

   // For each spawn info object, spawn entities until no more can be spawned
   for (let i = 0; i < SPAWN_INFOS.length; i++) {
      const spawnInfo = SPAWN_INFOS[i];
      
      numSpawnAttempts = 0;
      while (spawnConditionsAreMet(spawnInfo)) {
         runSpawnEvent(spawnInfo);

         if (++numSpawnAttempts >= 39999) {
            console.warn("Exceeded maximum number of spawn attempts for " + spawnInfo.entityTypes.map(entityType => EntityTypeString[entityType]).join(", ") + " spawn event with " + spawnInfo.entityTypes.reduce((prev, entityType) => prev + getEntityCount(entityType), 0) + " entities.");
            break;
         }
      }
   }
}
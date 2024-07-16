import { WaterRockData, RiverSteppingStoneData, GrassTileInfo, DecorationInfo, RIVER_STEPPING_STONE_SIZES, ServerTileUpdateData, RiverFlowDirections } from "webgl-test-shared/dist/client-server-types";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { TileType } from "webgl-test-shared/dist/tiles";
import { Point } from "webgl-test-shared/dist/utils";
import { circlesDoIntersect, circleAndRectangleDoIntersect } from "webgl-test-shared/dist/collision";
import Chunk from "./Chunk";
import Tile from "./Tile";
import { removeEntityFromCensus } from "./census";
import Tribe from "./Tribe";
import generateTerrain from "./world-generation/terrain-generation";
import { ComponentArrays } from "./components/ComponentArray";
import { InventoryUseComponentArray, tickInventoryUseComponent } from "./components/InventoryUseComponent";
import { tickPlayer } from "./entities/tribes/player";
import { HealthComponentArray, tickHealthComponent } from "./components/HealthComponent";
import { tickBerryBush } from "./entities/resources/berry-bush";
import { tickIceShard } from "./entities/projectiles/ice-shard";
import { onCowDeath, tickCow } from "./entities/mobs/cow";
import { onKrumblidDeath, tickKrumblid } from "./entities/mobs/krumblid";
import { ItemComponentArray, tickItemComponent } from "./components/ItemComponent";
import { onTribeWorkerDeath, tickTribeWorker } from "./entities/tribes/tribe-worker";
import { tickTombstone } from "./entities/tombstone";
import { tickZombie } from "./entities/mobs/zombie";
import { tickSlimewisp } from "./entities/mobs/slimewisp";
import { tickSlime } from "./entities/mobs/slime";
import { onYetiDeath, tickYeti } from "./entities/mobs/yeti";
import { tickSnowball } from "./entities/snowball";
import { onFishDeath, tickFish } from "./entities/mobs/fish";
import { tickStatusEffectComponents } from "./components/StatusEffectComponent";
import { tickIceSpikes } from "./entities/resources/ice-spikes";
import { tickItemEntity } from "./entities/item-entity";
import { tickFrozenYeti } from "./entities/mobs/frozen-yeti";
import { tickRockSpikeProjectile } from "./entities/projectiles/rock-spike";
import { AIHelperComponentArray, tickAIHelperComponent } from "./components/AIHelperComponent";
import {  tickCampfire } from "./entities/structures/cooking-entities/campfire";
import {  tickFurnace } from "./entities/structures/cooking-entities/furnace";
import { tickSpearProjectile } from "./entities/projectiles/spear-projectile";
import { onTribeWarriorDeath, tickTribeWarrior } from "./entities/tribes/tribe-warrior";
import { onSlimeSpitDeath, tickSlimeSpit } from "./entities/projectiles/slime-spit";
import { tickSpitPoison } from "./entities/projectiles/spit-poison";
import { DoorComponentArray, tickDoorComponent } from "./components/DoorComponent";
import { tickGolem } from "./entities/mobs/golem";
import { tickPebblum } from "./entities/mobs/pebblum";
import { tickPhysicsComponents } from "./components/PhysicsComponent";
import { tickBallista } from "./entities/structures/ballista";
import { tickSlingTurret } from "./entities/structures/sling-turret";
import { ResearchBenchComponentArray, tickResearchBenchComponent } from "./components/ResearchBenchComponent";
import { markWallTileInPathfinding } from "./pathfinding";
import OPTIONS from "./options";
import { CollisionVars, collide, entitiesAreColliding } from "./collision";
import { TunnelComponentArray, tickTunnelComponent } from "./components/TunnelComponent";
import { tickTribes } from "./ai-tribe-building/ai-building";
import { HealingTotemComponentArray, tickHealingTotemComponent } from "./components/HealingTotemComponent";
import { PlantComponentArray, tickPlantComponent } from "./components/PlantComponent";
import { FenceGateComponentArray, tickFenceGateComponent } from "./components/FenceGateComponent";
import { PlanterBoxComponentArray, tickPlanterBoxComponent } from "./components/PlanterBoxComponent";
import { Hitbox, hitboxIsCircular } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { TransformComponentArray } from "./components/TransformComponent";
import { onCactusDeath } from "./entities/resources/cactus";
import { onTreeDeath } from "./entities/resources/tree";
import { tickBattleaxeProjectile } from "./entities/projectiles/battleaxe-projectile";
import { WorldInfo } from "webgl-test-shared/dist/structures";
import { EntityInfo } from "webgl-test-shared/dist/board-interface";

const START_TIME = 6;

interface CollisionPair {
   readonly entity1: EntityID;
   readonly entity2: EntityID;
   readonly collisionNum: number;
}

interface EntityJoinInfo {
   readonly id: number;
   readonly entityType: EntityType;
}

abstract class Board {
   public static ticks = 0;

   /** The time of day the server is currently in (from 0 to 23) */
   public static time = START_TIME;

   public static entities = new Array<EntityID>();
   public static entityTypes: Partial<Record<EntityID, EntityType>> = {};

   public static tiles: Array<Tile>;
   public static chunks = new Array<Chunk>();

   private static riverFlowDirections: RiverFlowDirections;
   public static waterRocks: ReadonlyArray<WaterRockData>;
   public static riverSteppingStones: ReadonlyArray<RiverSteppingStoneData>;

   private static tileUpdateCoordinates: Set<number>;

   private static entityJoinBuffer = new Array<EntityJoinInfo>();
   private static entityRemoveBuffer = new Array<EntityID>();

   public static tribes = new Array<Tribe>();

   // @Incomplete @Bug: These shouldn't be tiles but instead serverdata, so that they aren't counted in the census
   public static edgeTiles = new Array<Tile>();
   public static edgeRiverFlowDirections: RiverFlowDirections;
   public static edgeRiverSteppingStones: ReadonlyArray<RiverSteppingStoneData>;

   public static grassInfo: Record<number, Record<number, GrassTileInfo>>;

   public static decorations: ReadonlyArray<DecorationInfo>;

   public static globalCollisionData: Partial<Record<number, ReadonlyArray<number>>> = {}

   public static setup(): void {
      this.initialiseChunks();

      const generationInfo = generateTerrain();
      this.tiles = generationInfo.tiles;
      this.riverFlowDirections = generationInfo.riverFlowDirections;
      this.waterRocks = generationInfo.waterRocks;
      this.riverSteppingStones = generationInfo.riverSteppingStones;
      this.edgeTiles = generationInfo.edgeTiles;
      this.edgeRiverFlowDirections = generationInfo.edgeRiverFlowDirections;
      this.edgeRiverSteppingStones = generationInfo.edgeRiverSteppingStones;
      this.grassInfo = generationInfo.grassInfo;
      this.decorations = generationInfo.decorations;

      if (OPTIONS.generateWalls) {
         for (let i = 0; i < generationInfo.tiles.length; i++) {
            const tile = generationInfo.tiles[i];

            if (tile.isWall) {
               // Mark which chunks have wall tiles
               const chunkX = Math.floor(tile.x / Settings.CHUNK_SIZE);
               const chunkY = Math.floor(tile.y / Settings.CHUNK_SIZE);
               const chunk = this.getChunk(chunkX, chunkY);
               chunk.hasWallTiles = true;
               
               // Mark inaccessible pathfinding nodes
               markWallTileInPathfinding(tile.x, tile.y);
            }
         }
      }

      this.tileUpdateCoordinates = new Set<number>();

      // Add river stepping stones to chunks
      for (const steppingStoneData of generationInfo.riverSteppingStones) {
         const size = RIVER_STEPPING_STONE_SIZES[steppingStoneData.size];
         const minChunkX = Math.max(Math.min(Math.floor((steppingStoneData.positionX - size/2) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         const maxChunkX = Math.max(Math.min(Math.floor((steppingStoneData.positionX + size/2) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         const minChunkY = Math.max(Math.min(Math.floor((steppingStoneData.positionY - size/2) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         const maxChunkY = Math.max(Math.min(Math.floor((steppingStoneData.positionY + size/2) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         
         for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
            for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
               const chunk = this.getChunk(chunkX, chunkY);
               chunk.riverSteppingStones.push(steppingStoneData);
            }
         }
      }
   }

   // @Cleanup: why does this have to be called from the board? And is kind of weird
   public static getEntityType(entityID: EntityID): EntityType | undefined {
      return this.entityTypes[entityID];
   }

   public static validateEntity(entityID: EntityID): EntityID | 0 {
      return typeof this.entityTypes[entityID] !== "undefined" ? entityID : 0;
   }

   public static hasEntity(entityID: EntityID): boolean {
      return typeof this.entityTypes[entityID] !== "undefined";
   }

   // @Cleanup: remove
   public static reset(): void {
      this.time = START_TIME;
      this.ticks = 0;
      this.chunks = [];
      this.entities = [];
      this.entityTypes = {};
      this.entityJoinBuffer = [];
      this.entityRemoveBuffer = [];
      this.tribes = [];
      this.edgeTiles = [];
   }

   public static isNight(): boolean {
      return Board.time < 6 || Board.time >= 18;
   }

   public static getTribeExpected(tribeID: number): Tribe | null {
      for (let i = 0; i < this.tribes.length; i++) {
         const tribe = this.tribes[i];
         if (tribe.id === tribeID) {
            return tribe;
         }
      }

      console.warn("No tribe with id " + tribeID);
      return null;
   }

   private static initialiseChunks(): void {
      for (let i = 0; i < Settings.BOARD_SIZE * Settings.BOARD_SIZE; i++) {
         const chunk = new Chunk();
         this.chunks.push(chunk);
      }
   }

   public static tickIntervalHasPassed(intervalSeconds: number): boolean {
      const ticksPerInterval = intervalSeconds * Settings.TPS;
      
      const previousCheck = (this.ticks - 1) / ticksPerInterval;
      const check = this.ticks / ticksPerInterval;
      return Math.floor(previousCheck) !== Math.floor(check);
   }

   public static getRiverFlowDirections(): RiverFlowDirections {
      return this.riverFlowDirections;
   }

   public static getTile(tileX: number, tileY: number): Tile {
      const tileIndex = tileY * Settings.BOARD_DIMENSIONS + tileX;
      return this.tiles[tileIndex];
   }

   public static getChunk(chunkX: number, chunkY: number): Chunk {
      const chunkIndex = chunkY * Settings.BOARD_SIZE + chunkX;
      return this.chunks[chunkIndex];
   }

   public static addTribe(tribe: Tribe): void {
      this.tribes.push(tribe);
   }

   public static removeTribe(tribe: Tribe): void {
      const idx = this.tribes.indexOf(tribe);
      if (idx !== -1) {
         this.tribes.splice(idx, 1);
      }
   }

   public static updateTribes(): void {
      // @Cleanup: why do we have two different ones??
      
      for (const tribe of this.tribes) {
         tribe.tick();
      }
      // @Cleanup: Maybe move to server tick function
      tickTribes();
   }

   public static entityIsFlaggedForDestruction(entity: EntityID): boolean {
      return this.entityRemoveBuffer.indexOf(entity) !== -1;
   }

   public static destroyEntity(entity: EntityID): void {
      // @Temporary
      const entityType = this.getEntityType(entity);
      if (typeof entityType === "undefined") {
         throw new Error("Tried to remove an entity before it was added to the board.");
      }
      
      // Don't try to remove if already being removed
      if (Board.entityIsFlaggedForDestruction(entity)) {
         return;
      }

      Board.addEntityToRemoveBuffer(entity);
      Board.removeEntityFromJoinBuffer(entity);

      // @Cleanup: do these functions actually need to be called here? why not in the proper remove flagged function?
      switch (entityType) {
         case EntityType.cow: onCowDeath(entity); break;
         case EntityType.tree: onTreeDeath(entity); break;
         case EntityType.krumblid: onKrumblidDeath(entity); break;
         case EntityType.cactus: onCactusDeath(entity); break;
         case EntityType.tribeWorker: onTribeWorkerDeath(entity); break;
         case EntityType.tribeWarrior: onTribeWarriorDeath(entity); break;
         case EntityType.yeti: onYetiDeath(entity); break;
         case EntityType.fish: onFishDeath(entity); break;
         case EntityType.slimeSpit: onSlimeSpitDeath(entity); break;
      }
   }

   /** Removes game objects flagged for deletion */
   public static destroyFlaggedEntities(): void {
      for (const entity of this.entityRemoveBuffer) {
         const idx = this.entities.indexOf(entity);
         if (idx === -1) {
            throw new Error("Tried to remove a game object which doesn't exist or was already removed.");
         }
   
         // @Speed: don't do per entity, do per component array
         // Call remove functions
         for (let i = 0; i < ComponentArrays.length; i++) {
            const componentArray = ComponentArrays[i];
            if (componentArray.hasComponent(entity) && typeof componentArray.onRemove !== "undefined") {
               componentArray.onRemove(entity);
            }
         }

         // @Speed: don't do per entity, do per component array
         // Remove components
         for (let i = 0; i < ComponentArrays.length; i++) {
            const componentArray = ComponentArrays[i];
            if (componentArray.hasComponent(entity)) {
               componentArray.removeComponent(entity);
            }
         }

         removeEntityFromCensus(entity);
         this.entities.splice(idx, 1);
         delete this.entityTypes[entity];
      }

      this.entityRemoveBuffer = [];
   }

   public static updateEntities(): void {
      if (Board.ticks % 3 === 0) {
         for (let i = 0; i < AIHelperComponentArray.components.length; i++) {
            const entity = AIHelperComponentArray.getEntityFromArrayIdx(i);
            tickAIHelperComponent(entity);
         }
      }

      // @Speed: Ideally we should remove this as there are many entities which the switch won't fire for at all
      for (let i = 0; i < this.entities.length; i++) {
         const entity = this.entities[i];

         // @Hack
         switch (Board.getEntityType(entity)) {
            case EntityType.player: tickPlayer(entity); break;
            case EntityType.tribeWorker: tickTribeWorker(entity); break;
            case EntityType.tribeWarrior: tickTribeWarrior(entity); break;
            case EntityType.berryBush: tickBerryBush(entity); break;
            case EntityType.iceShardProjectile: tickIceShard(entity); break;
            case EntityType.cow: tickCow(entity); break;
            case EntityType.krumblid: tickKrumblid(entity); break;
            case EntityType.tombstone: tickTombstone(entity); break;
            case EntityType.zombie: tickZombie(entity); break;
            case EntityType.slimewisp: tickSlimewisp(entity); break;
            case EntityType.slime: tickSlime(entity); break;
            case EntityType.yeti: tickYeti(entity); break;
            case EntityType.snowball: tickSnowball(entity); break;
            case EntityType.fish: tickFish(entity); break;
            case EntityType.itemEntity: tickItemEntity(entity); break;
            case EntityType.frozenYeti: tickFrozenYeti(entity); break;
            case EntityType.rockSpikeProjectile: tickRockSpikeProjectile(entity); break;
            case EntityType.campfire: tickCampfire(entity); break;
            case EntityType.furnace: tickFurnace(entity); break;
            case EntityType.spearProjectile: tickSpearProjectile(entity); break;
            case EntityType.slimeSpit: tickSlimeSpit(entity); break;
            case EntityType.spitPoison: tickSpitPoison(entity); break;
            case EntityType.battleaxeProjectile: tickBattleaxeProjectile(entity); break;
            case EntityType.golem: tickGolem(entity); break;
            case EntityType.iceSpikes: tickIceSpikes(entity); break;
            case EntityType.pebblum: tickPebblum(entity); break;
            case EntityType.ballista: tickBallista(entity); break;
            case EntityType.slingTurret: tickSlingTurret(entity); break;
         }

         // @Hack: should be in tick transform component
         const transformComponent = TransformComponentArray.getComponent(entity);
         transformComponent.ageTicks++;
      }

      for (let i = 0; i < InventoryUseComponentArray.components.length; i++) {
         const inventoryUseComponent = InventoryUseComponentArray.components[i];
         const entity = InventoryUseComponentArray.getEntityFromArrayIdx(i);
         tickInventoryUseComponent(entity, inventoryUseComponent);
      }

      for (let i = 0; i < HealthComponentArray.components.length; i++) {
         const healthComponent = HealthComponentArray.components[i];
         tickHealthComponent(healthComponent);
      }

      for (let i = 0; i < ItemComponentArray.components.length; i++) {
         const itemComponent = ItemComponentArray.components[i];
         tickItemComponent(itemComponent);
      }

      for (let i = 0; i < PlantComponentArray.components.length; i++) {
         const plantComponent = PlantComponentArray.components[i];
         tickPlantComponent(plantComponent);
      }

      for (let i = 0; i < FenceGateComponentArray.components.length; i++) {
         const entity = FenceGateComponentArray.getEntityFromArrayIdx(i);
         tickFenceGateComponent(entity);
      }

      for (let i = 0; i < PlanterBoxComponentArray.components.length; i++) {
         const planterBoxComponent = PlanterBoxComponentArray.components[i];
         tickPlanterBoxComponent(planterBoxComponent);
      }

      tickStatusEffectComponents();

      for (let i = 0; i < DoorComponentArray.components.length; i++) {
         const door = DoorComponentArray.getEntityFromArrayIdx(i);
         tickDoorComponent(door);
      }

      for (let i = 0; i < TunnelComponentArray.components.length; i++) {
         const tunnel = TunnelComponentArray.getEntityFromArrayIdx(i);
         tickTunnelComponent(tunnel);
      }

      for (let i = 0; i < ResearchBenchComponentArray.components.length; i++) {
         const entity = ResearchBenchComponentArray.getEntityFromArrayIdx(i);
         tickResearchBenchComponent(entity);
      }

      for (let i = 0; i < HealingTotemComponentArray.components.length; i++) {
         const entity = HealingTotemComponentArray.getEntityFromArrayIdx(i);
         const healingTotemComponent = HealingTotemComponentArray.components[i];
         tickHealingTotemComponent(entity, healingTotemComponent);
      }

      // The physics component ticking must be done at the end so there is time for the positionIsDirty and hitboxesAreDirty flags to collect
      tickPhysicsComponents();
   }

   public static getEntityCollisions(entityID: number): ReadonlyArray<number> {
      const collidingEntityIDs = this.globalCollisionData[entityID];
      return typeof collidingEntityIDs !== "undefined" ? collidingEntityIDs : [];
   }

   // @Cleanup: Split into collision detection and resolution
   public static resolveEntityCollisions(): void {
      const collisionPairs = new Array<CollisionPair>();

      const globalCollisionData: Partial<Record<number, Array<number>>> = {};
      
      const numChunks = Settings.BOARD_SIZE * Settings.BOARD_SIZE;
      for (let i = 0; i < numChunks; i++) {
         const chunk = this.chunks[i];
         for (let j = 0; j <= chunk.entities.length - 2; j++) {
            const entity1 = chunk.entities[j];
            for (let k = j + 1; k <= chunk.entities.length - 1; k++) {
               const entity2 = chunk.entities[k];

               const collisionNum = entitiesAreColliding(entity1, entity2);
               if (collisionNum !== CollisionVars.NO_COLLISION) {
                  collisionPairs.push({
                     entity1: entity1,
                     entity2: entity2,
                     collisionNum: collisionNum
                  });
               }
            }
         }
      }

      for (let i = 0; i < collisionPairs.length; i++) {
         const test = collisionPairs[i];

         // Check for duplicates
         // @Speed O(n^2)
         let isDupe = false;
         for (let j = 0; j < i; j++) {
            const test2 = collisionPairs[j];
            if (test.entity1 === test2.entity1 && test.entity2 === test2.entity2 && test.collisionNum === test2.collisionNum) {
               isDupe = true;
               break;
            }
         }
         if (isDupe) {
            continue;
         }
         
         const entity1Collisions = globalCollisionData[test.entity1];
         if (typeof entity1Collisions !== "undefined") {
            entity1Collisions.push(test.entity2);
         } else {
            globalCollisionData[test.entity1] = [test.entity2];
         }
         
         const entity2Collisions = globalCollisionData[test.entity2];
         if (typeof entity2Collisions !== "undefined") {
            entity2Collisions.push(test.entity1);
         } else {
            globalCollisionData[test.entity2] = [test.entity1];
         }
         
         const entity1HitboxIndex = test.collisionNum & 0xFF;
         const entity2HitboxIndex = (test.collisionNum & 0xFF00) >> 8;
         
         collide(test.entity1, test.entity2, entity1HitboxIndex, entity2HitboxIndex);
         collide(test.entity2, test.entity1, entity2HitboxIndex, entity1HitboxIndex);
      }

      this.globalCollisionData = globalCollisionData;
   }

   /** Registers a tile update to be sent to the clients */
   public static registerNewTileUpdate(x: number, y: number): void {
      const tileIndex = y * Settings.BOARD_DIMENSIONS + x;
      this.tileUpdateCoordinates.add(tileIndex);
   }

   /** Get all tile updates and reset them */
   public static popTileUpdates(): ReadonlyArray<ServerTileUpdateData> {
      // Generate the tile updates array
      const tileUpdates = new Array<ServerTileUpdateData>();
      for (const tileIndex of this.tileUpdateCoordinates) {
         const tileX = tileIndex % Settings.BOARD_DIMENSIONS;
         const tileY = Math.floor(tileIndex / Settings.BOARD_DIMENSIONS);
         
         const tile = this.getTile(tileX, tileY);
         tileUpdates.push({
            tileIndex: tileIndex,
            type: tile.type,
            isWall: tile.isWall
         });
      }

      // reset the tile update coordiantes
      this.tileUpdateCoordinates.clear();

      return tileUpdates;
   }

   public static addEntityToJoinBuffer(entity: EntityID, entityType: EntityType): void {
      this.entityJoinBuffer.push({
         id: entity,
         entityType: entityType
      });
   }

   public static removeEntityFromJoinBuffer(entity: EntityID): void {
      for (let i = 0; i < this.entityJoinBuffer.length; i++) {
         const joinInfo = this.entityJoinBuffer[i];

         if (joinInfo.id === entity) {
            this.entityJoinBuffer.splice(i, 1);
            break;
         }
      }
   }

   public static addEntityToRemoveBuffer(entity: EntityID): void {
      this.entityRemoveBuffer.push(entity);
   }

   public static pushJoinBuffer(): void {
      // Push components
      for (let i = 0; i < ComponentArrays.length; i++) {
         const componentArray = ComponentArrays[i];
         componentArray.pushComponentsFromBuffer();
      }

      // Push entities
      for (const joinInfo of this.entityJoinBuffer) {
         this.entities.push(joinInfo.id);
         this.entityTypes[joinInfo.id] = joinInfo.entityType;
      }

      // Call on join functions and clear buffers
      for (let i = 0; i < ComponentArrays.length; i++) {
         const componentArray = ComponentArrays[i];

         const onJoin = componentArray.onJoin;
         if (typeof onJoin !== "undefined") {
            const componentBufferIDs = componentArray.getComponentBufferIDs();

            for (let j = 0; j < componentBufferIDs.length; j++) {
               const entityID = componentBufferIDs[j];
               onJoin(entityID);
            }
         }

         componentArray.clearBuffer();
      }

      this.entityJoinBuffer = [];
   }

   public static isInBoard(position: Point): boolean {
      return position.x >= 0 && position.x <= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - 1 && position.y >= 0 && position.y <= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - 1;
   }

   public static distanceToClosestEntity(position: Point): number {
      let minDistance = 2000;

      const minChunkX = Math.max(Math.min(Math.floor((position.x - 2000) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkX = Math.max(Math.min(Math.floor((position.x + 2000) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const minChunkY = Math.max(Math.min(Math.floor((position.y - 2000) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkY = Math.max(Math.min(Math.floor((position.y + 2000) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);

      const checkedEntities = new Set<EntityID>();
      
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const chunk = Board.getChunk(chunkX, chunkY);
            for (const entity of chunk.entities) {
               if (checkedEntities.has(entity)) continue;
               
               const transformComponent = TransformComponentArray.getComponent(entity);
               const distance = position.calculateDistanceBetween(transformComponent.position);
               if (distance <= minDistance) {
                  minDistance = distance;
               }

               checkedEntities.add(entity);
            }
         }
      }

      return minDistance;
   }

   // @Cleanup: Shouldn't be in the Board file
   public static getEntitiesAtPosition(x: number, y: number): Array<EntityID> {
      if (!this.positionIsInBoard(x, y)) {
         throw new Error("Position isn't in the board");
      }
      
      // @Speed: Garbage collection
      const testPosition = new Point(x, y);

      const chunkX = Math.floor(x / Settings.CHUNK_UNITS);
      const chunkY = Math.floor(y / Settings.CHUNK_UNITS);

      const entities = new Array<EntityID>();
      
      const chunk = this.getChunk(chunkX, chunkY);
      for (const entity of chunk.entities) {
         const transformComponent = TransformComponentArray.getComponent(entity);
         for (const hitbox of transformComponent.hitboxes) {
            if (this.hitboxIsInRange(testPosition, hitbox, 1)) {
               entities.push(entity);
               break;
            }
         }
      }

      return entities;
   }

   // @Cleanup: Move this into ai-shared
   public static hitboxIsInRange(testPosition: Point, hitbox: Hitbox, range: number): boolean {
      if (hitboxIsCircular(hitbox)) {
         // Circular hitbox
         return circlesDoIntersect(testPosition, range, hitbox.position, hitbox.radius);
      } else {
         // Rectangular hitbox
         return circleAndRectangleDoIntersect(testPosition, range, hitbox.position, hitbox.width, hitbox.height, hitbox.relativeRotation);
      }
   }

   public static tileIsInBoard(tileX: number, tileY: number): boolean {
      return tileX >= 0 && tileX < Settings.BOARD_DIMENSIONS && tileY >= 0 && tileY < Settings.BOARD_DIMENSIONS;
   }

   public static positionIsInBoard(x: number, y: number): boolean {
      return x >= 0 && x < Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE && y >= 0 && y < Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE;
   }

   public static getTileAtPosition(position: Point): Tile {
      const tileX = Math.floor(position.x / Settings.TILE_SIZE);
      const tileY = Math.floor(position.y / Settings.TILE_SIZE);
      return this.getTile(tileX, tileY);
   }

   public static getEntitiesInRange(position: Point, range: number): Array<EntityID> {
      const minChunkX = Math.max(Math.min(Math.floor((position.x - range) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkX = Math.max(Math.min(Math.floor((position.x + range) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const minChunkY = Math.max(Math.min(Math.floor((position.y - range) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkY = Math.max(Math.min(Math.floor((position.y + range) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);

      const checkedEntities = new Set<EntityID>();
      const entities = new Array<EntityID>();
      
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const chunk = Board.getChunk(chunkX, chunkY);
            for (const entity of chunk.entities) {
               if (checkedEntities.has(entity)) continue;
               
               const transformComponent = TransformComponentArray.getComponent(entity);
               const distance = position.calculateDistanceBetween(transformComponent.position);
               if (distance <= range) {
                  entities.push(entity);
               }

               checkedEntities.add(entity);
            }
         }
      }

      return entities;
   }

   public static getWorldInfo(): WorldInfo {
      return {
         chunks: Board.chunks,
         getEntityCallback: (entity: EntityID): EntityInfo => {
            const transformComponent = TransformComponentArray.getComponent(entity);

            return {
               type: Board.getEntityType(entity)!,
               position: transformComponent.position,
               rotation: transformComponent.rotation,
               id: entity,
               hitboxes: transformComponent.hitboxes
            };
         }
      }
   }
}

export default Board;

/** Returns false if any of the tiles in the raycast don't match the inputted tile types. */
export function tileRaytraceMatchesTileTypes(startX: number, startY: number, endX: number, endY: number, tileTypes: ReadonlyArray<TileType>): boolean {
   /*
   Kindly yoinked from https://playtechs.blogspot.com/2007/03/raytracing-on-grid.html
   */
   
   // Convert to tile coordinates
   const x0 = startX / Settings.TILE_SIZE;
   const x1 = endX / Settings.TILE_SIZE;
   const y0 = startY / Settings.TILE_SIZE;
   const y1 = endY / Settings.TILE_SIZE;
   
   const dx = Math.abs(x0 - x1);
   const dy = Math.abs(y0 - y1);

   // Starting tile coordinates
   let x = Math.floor(x0);
   let y = Math.floor(y0);

   const dt_dx = 1 / dx;
   const dt_dy = 1 / dy;

   let n = 1;
   let x_inc, y_inc;
   let t_next_vertical, t_next_horizontal;

   if (dx === 0) {
      x_inc = 0;
      t_next_horizontal = dt_dx; // Infinity
   } else if (x1 > x0) {
      x_inc = 1;
      n += Math.floor(x1) - x;
      t_next_horizontal = (Math.floor(x0) + 1 - x0) * dt_dx;
   } else {
      x_inc = -1;
      n += x - Math.floor(x1);
      t_next_horizontal = (x0 - Math.floor(x0)) * dt_dx;
   }

   if (dy === 0) {
      y_inc = 0;
      t_next_vertical = dt_dy; // Infinity
   } else if (y1 > y0) {
      y_inc = 1;
      n += Math.floor(y1) - y;
      t_next_vertical = (Math.floor(y0) + 1 - y0) * dt_dy;
   } else {
      y_inc = -1;
      n += y - Math.floor(y1);
      t_next_vertical = (y0 - Math.floor(y0)) * dt_dy;
   }

   for (; n > 0; n--) {
      const tile = Board.getTile(x, y);
      if (!tileTypes.includes(tile.type)) {
         return false;
      }

      if (t_next_vertical < t_next_horizontal) {
         y += y_inc;
         t_next_vertical += dt_dy;
      } else {
         x += x_inc;
         t_next_horizontal += dt_dx;
      }
   }

   return true;
}

// @Cleanup: Copy and paste
export function raytraceHasWallTile(startX: number, startY: number, endX: number, endY: number): boolean {
   /*
   Kindly yoinked from https://playtechs.blogspot.com/2007/03/raytracing-on-grid.html
   */
   
   // Convert to tile coordinates
   const x0 = startX / Settings.TILE_SIZE;
   const x1 = endX / Settings.TILE_SIZE;
   const y0 = startY / Settings.TILE_SIZE;
   const y1 = endY / Settings.TILE_SIZE;
   
   const dx = Math.abs(x0 - x1);
   const dy = Math.abs(y0 - y1);

   // Starting tile coordinates
   let x = Math.floor(x0);
   let y = Math.floor(y0);

   const dt_dx = 1 / dx;
   const dt_dy = 1 / dy;

   let n = 1;
   let x_inc, y_inc;
   let t_next_vertical, t_next_horizontal;

   if (dx === 0) {
      x_inc = 0;
      t_next_horizontal = dt_dx; // Infinity
   } else if (x1 > x0) {
      x_inc = 1;
      n += Math.floor(x1) - x;
      t_next_horizontal = (Math.floor(x0) + 1 - x0) * dt_dx;
   } else {
      x_inc = -1;
      n += x - Math.floor(x1);
      t_next_horizontal = (x0 - Math.floor(x0)) * dt_dx;
   }

   if (dy === 0) {
      y_inc = 0;
      t_next_vertical = dt_dy; // Infinity
   } else if (y1 > y0) {
      y_inc = 1;
      n += Math.floor(y1) - y;
      t_next_vertical = (Math.floor(y0) + 1 - y0) * dt_dy;
   } else {
      y_inc = -1;
      n += y - Math.floor(y1);
      t_next_vertical = (y0 - Math.floor(y0)) * dt_dy;
   }

   for (; n > 0; n--) {
      const tile = Board.getTile(x, y);
      if (tile.isWall) {
         return true;
      }

      if (t_next_vertical < t_next_horizontal) {
         y += y_inc;
         t_next_vertical += dt_dy;
      } else {
         x += x_inc;
         t_next_horizontal += dt_dx;
      }
   }

   return false;
}

export function getChunksInBounds(minX: number, maxX: number, minY: number, maxY: number): ReadonlyArray<Chunk> {
   const minChunkX = Math.max(Math.min(Math.floor(minX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor(maxX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor(minY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor(maxY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);

   const chunks = new Array<Chunk>();
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         chunks.push(chunk);
      }
   }

   return chunks;
}
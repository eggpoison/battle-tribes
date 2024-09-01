import { WaterRockData, RiverSteppingStoneData, RIVER_STEPPING_STONE_SIZES, ServerTileUpdateData } from "webgl-test-shared/dist/client-server-types";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { Biome, TileType } from "webgl-test-shared/dist/tiles";
import { distance, Point, TileIndex } from "webgl-test-shared/dist/utils";
import { circlesDoIntersect, circleAndRectangleDoIntersect } from "webgl-test-shared/dist/collision";
import Chunk from "./Chunk";
import { addTileToCensus, removeEntityFromCensus } from "./census";
import Tribe from "./Tribe";
import { TerrainGenerationInfo } from "./world-generation/terrain-generation";
import { ComponentArrays } from "./components/ComponentArray";
import { onKrumblidDeath } from "./entities/mobs/krumblid";
import { onTribeWorkerDeath } from "./entities/tribes/tribe-worker";
import { onYetiDeath } from "./entities/mobs/yeti";
import { onFishDeath } from "./entities/mobs/fish";
import { onTribeWarriorDeath } from "./entities/tribes/tribe-warrior";
import { onSlimeSpitDeath } from "./entities/projectiles/slime-spit";
import { markWallTileInPathfinding } from "./pathfinding";
import OPTIONS from "./options";
import { CollisionVars, collide, entitiesAreColliding } from "./collision";
import { tickTribes } from "./ai-tribe-building/ai-building";
import { Hitbox, hitboxIsCircular } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { TransformComponentArray } from "./components/TransformComponent";
import { onCactusDeath } from "./entities/resources/cactus";
import { WorldInfo } from "webgl-test-shared/dist/structures";
import { EntityInfo } from "webgl-test-shared/dist/board-interface";
import { onCowDeath } from "./entities/mobs/cow";
import { registerEntityRemoval } from "./server/player-clients";

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

// @Cleanup: same as WaterTileGenerationInfo
export interface RiverFlowDirection {
   readonly tileX: number;
   readonly tileY: number;
   readonly flowDirection: number;
}

abstract class Board {
   public static ticks = 0;

   /** The time of day the server is currently in (from 0 to 23) */
   public static time = START_TIME;

   public static entities = new Array<EntityID>();
   public static entityTypes: Partial<Record<EntityID, EntityType>> = {};

   public static tileTypes: Float32Array;
   public static tileBiomes: Float32Array;
   public static tileIsWalls: Float32Array;
   public static riverFlowDirections: Float32Array;
   public static tileTemperatures: Float32Array;
   public static tileHumidities: Float32Array;

   public static waterRocks: ReadonlyArray<WaterRockData>;
   public static riverSteppingStones: ReadonlyArray<RiverSteppingStoneData>;

   private static tileUpdateCoordinates: Set<number>;

   public static chunks = new Array<Chunk>();

   private static entityJoinBuffer = new Array<EntityJoinInfo>();
   private static entityRemoveBuffer = new Array<EntityID>();

   public static tribes = new Array<Tribe>();

   public static globalCollisionData: Partial<Record<number, ReadonlyArray<number>>> = {};

   public static setup(generationInfo: TerrainGenerationInfo): void {
      this.initialiseChunks();

      this.tileTypes = generationInfo.tileTypes;
      this.tileBiomes = generationInfo.tileBiomes;
      this.tileIsWalls = generationInfo.tileIsWalls;
      this.riverFlowDirections = generationInfo.riverFlowDirections;
      this.tileTemperatures = generationInfo.tileTemperatures;
      this.tileHumidities = generationInfo.tileHumidities;
      this.waterRocks = generationInfo.waterRocks;
      this.riverSteppingStones = generationInfo.riverSteppingStones;

      for (let tileIndex = 0; tileIndex < Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS; tileIndex++) {
         const tileX = Board.getTileX(tileIndex);
         const tileY = Board.getTileY(tileIndex);
         if (Board.tileIsInBoardIncludingEdges(tileX, tileY)) {
            addTileToCensus(tileIndex);
         }
      }

      if (OPTIONS.generateWalls) {
         for (let tileY = 0; tileY < Settings.BOARD_DIMENSIONS; tileY++) {
            for (let tileX = 0; tileX < Settings.BOARD_DIMENSIONS; tileX++) {
               const tileIndex = Board.getTileIndexIncludingEdges(tileX, tileY);

               const isWall = this.tileIsWalls[tileIndex];
               if (isWall) {
                  // Mark which chunks have wall tiles
                  const chunkX = Math.floor(tileX / Settings.CHUNK_SIZE);
                  const chunkY = Math.floor(tileY / Settings.CHUNK_SIZE);
                  const chunk = this.getChunk(chunkX, chunkY);
                  chunk.hasWallTiles = true;
                  
                  // Mark inaccessible pathfinding nodes
                  markWallTileInPathfinding(tileX, tileY);
               }
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
   public static getEntityType(entity: EntityID): EntityType | undefined {
      return this.entityTypes[entity];
   }

   public static validateEntity(entity: EntityID): EntityID | 0 {
      return typeof this.entityTypes[entity] !== "undefined" ? entity : 0;
   }

   public static hasEntity(entity: EntityID): boolean {
      return typeof this.entityTypes[entity] !== "undefined";
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

   public static getTileType(tileX: number, tileY: number): TileType {
      const tileIndex = this.getTileIndexIncludingEdges(tileX, tileY);
      return this.tileTypes[tileIndex];
   }

   public static getTileIsWall(tileX: number, tileY: number): boolean {
      const tileIndex = this.getTileIndexIncludingEdges(tileX, tileY);
      return this.tileIsWalls[tileIndex] === 1 ? true : false;
   }

   public static getTileBiome(tileX: number, tileY: number): Biome {
      const tileIndex = this.getTileIndexIncludingEdges(tileX, tileY);
      return this.tileBiomes[tileIndex];
   }

   public static getTileIndexIncludingEdges(tileX: number, tileY: number): TileIndex {
      return (tileY + Settings.EDGE_GENERATION_DISTANCE) * Settings.FULL_BOARD_DIMENSIONS + tileX + Settings.EDGE_GENERATION_DISTANCE;
   }

   public static getTileX(tileIndex: TileIndex): number {
      return tileIndex % Settings.FULL_BOARD_DIMENSIONS - Settings.EDGE_GENERATION_DISTANCE;
   }

   public static getTileY(tileIndex: TileIndex): number {
      return Math.floor(tileIndex / Settings.FULL_BOARD_DIMENSIONS) - Settings.EDGE_GENERATION_DISTANCE;
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
         // @Temporary
         // case EntityType.tree: onTreeDeath(entity); break;
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
         
         registerEntityRemoval(entity);
   
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
      for (const componentArray of ComponentArrays) {
         if (typeof componentArray.onTick !== "undefined" && Board.ticks % componentArray.onTick.tickInterval === 0) {
            const func = componentArray.onTick.func;
            for (let i = 0; i < componentArray.activeComponents.length; i++) {
               const entity = componentArray.activeEntities[i];
               const component = componentArray.activeComponents[i];
               func(component, entity);
            }
         }

         componentArray.deactivateQueue();
      }
   }

   public static getEntityCollisions(entityID: number): ReadonlyArray<number> {
      const collidingEntityIDs = this.globalCollisionData[entityID];
      return typeof collidingEntityIDs !== "undefined" ? collidingEntityIDs : [];
   }

   // @Cleanup: Split into collision detection and resolution
   public static resolveEntityCollisions(): void {
      // @Incomplete: allow multiple collisions between entities for different render parts

      const collisionPairs = new Array<CollisionPair>();

      const globalCollisionData: Partial<Record<number, Array<number>>> = {};
      
      const numChunks = Settings.BOARD_SIZE * Settings.BOARD_SIZE;
      for (let i = 0; i < numChunks; i++) {
         const chunk = this.chunks[i];

         // @Speed: physics-physics comparisons happen twice
         // For all physics entities, check for collisions with all other entities in the chunk
         for (let j = 0; j < chunk.collisionRelevantPhysicsEntities.length; j++) {
            const entity1 = chunk.collisionRelevantPhysicsEntities[j];
            
            for (let k = 0; k < chunk.collisionRelevantEntities.length; k++) {
               const entity2 = chunk.collisionRelevantEntities[k];

               // @Speed
               if (entity1 === entity2) {
                  continue;
               }

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
            if (((test.entity1 === test2.entity1 && test.entity2 === test2.entity2) || (test.entity1 === test2.entity2 && test.entity2 === test2.entity1)) && test.collisionNum === test2.collisionNum) {
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
         
         tileUpdates.push({
            tileIndex: tileIndex,
            type: this.getTileType(tileX, tileY),
            isWall: this.getTileIsWall(tileX, tileY)
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

   public static tileIsInBoardIncludingEdges(tileX: number, tileY: number): boolean {
      return tileX >= -Settings.EDGE_GENERATION_DISTANCE && tileX < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE && tileY >= -Settings.EDGE_GENERATION_DISTANCE && tileY < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE;
   }

   public static positionIsInBoard(x: number, y: number): boolean {
      return x >= 0 && x < Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE && y >= 0 && y < Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE;
   }

   public static getEntitiesInRange(x: number, y: number, range: number): Array<EntityID> {
      const minChunkX = Math.max(Math.min(Math.floor((x - range) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkX = Math.max(Math.min(Math.floor((x + range) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const minChunkY = Math.max(Math.min(Math.floor((y - range) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkY = Math.max(Math.min(Math.floor((y + range) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);

      // @Speed: garbage collection
      const position = new Point(x, y);
      
      // @Speed: garbage collection
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
      const tileType = Board.getTileType(x, y);
      if (!tileTypes.includes(tileType)) {
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
      const tileIsWall = Board.getTileIsWall(x, y);
      if (tileIsWall) {
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

const tileIsInRange = (x: number, y: number, range: number, tileX: number, tileY: number): boolean => {
   const blX = tileX * Settings.TILE_SIZE;
   const blY = tileY * Settings.TILE_SIZE;
   if (distance(x, y, blX, blY) <= range) {
      return true;
   }
   
   const brX = (tileX + 1) * Settings.TILE_SIZE;
   const brY = tileY * Settings.TILE_SIZE;
   if (distance(x, y, brX, brY) <= range) {
      return true;
   }

   const tlX = tileX * Settings.TILE_SIZE;
   const tlY = (tileY + 1) * Settings.TILE_SIZE;
   if (distance(x, y, tlX, tlY) <= range) {
      return true;
   }

   const trX = (tileX + 1) * Settings.TILE_SIZE;
   const trY = (tileY + 1) * Settings.TILE_SIZE;
   if (distance(x, y, trX, trY) <= range) {
      return true;
   }

   return false;
}

export function getTilesInRange(x: number, y: number, range: number): ReadonlyArray<TileIndex> {
   const minTileX = Math.floor((x - range) / Settings.TILE_SIZE);
   const maxTileX = Math.floor((x + range) / Settings.TILE_SIZE);
   const minTileY = Math.floor((y - range) / Settings.TILE_SIZE);
   const maxTileY = Math.floor((y + range) / Settings.TILE_SIZE);

   const tiles = new Array<TileIndex>();
   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         if (tileIsInRange(x, y, range, tileX, tileY)) {
            const tileIndex = Board.getTileIndexIncludingEdges(tileX, tileY);
            tiles.push(tileIndex);
         }
      }
   }
   return tiles;
}
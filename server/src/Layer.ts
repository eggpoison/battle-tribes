import { WaterRockData, RiverSteppingStoneData, RIVER_STEPPING_STONE_SIZES, ServerTileUpdateData } from "battletribes-shared/client-server-types";
import { EntityID } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Biome, SubtileType, TileType } from "battletribes-shared/tiles";
import { distance, Point, TileIndex } from "battletribes-shared/utils";
import Chunk from "./Chunk";
import { addTileToCensus } from "./census";
import { TerrainGenerationInfo } from "./world-generation/surface-terrain-generation";
import { markWallTileInPathfinding } from "./pathfinding";
import OPTIONS from "./options";
import { TransformComponentArray } from "./components/TransformComponent";
import { WorldInfo } from "battletribes-shared/structures";
import { EntityInfo } from "battletribes-shared/board-interface";
import { boxIsWithinRange } from "battletribes-shared/boxes/boxes";
import { getEntityType, getGameTicks, layers } from "./world";
import { CollisionGroup } from "battletribes-shared/collision-groups";
import CollisionChunk from "./CollisionChunk";
import { EntityPairCollisionInfo, GlobalCollisionInfo } from "./collision-detection";
import { getSubtileIndex, getSubtileX, getSubtileY, tileHasWallSubtile } from "./world-generation/terrain-generation-utils";

// @Cleanup: same as WaterTileGenerationInfo
export interface RiverFlowDirection {
   readonly tileX: number;
   readonly tileY: number;
   readonly flowDirection: number;
}

interface WallSubtileUpdate {
   readonly subtileIndex: number;
   readonly subtileType: SubtileType;
   readonly damageTaken: number;
}

export function getTileIndexIncludingEdges(tileX: number, tileY: number): TileIndex {
   return (tileY + Settings.EDGE_GENERATION_DISTANCE) * Settings.FULL_BOARD_DIMENSIONS + tileX + Settings.EDGE_GENERATION_DISTANCE;
}

export function getTileX(tileIndex: TileIndex): number {
   return tileIndex % Settings.FULL_BOARD_DIMENSIONS - Settings.EDGE_GENERATION_DISTANCE;
}

export function getTileY(tileIndex: TileIndex): number {
   return Math.floor(tileIndex / Settings.FULL_BOARD_DIMENSIONS) - Settings.EDGE_GENERATION_DISTANCE;
}

export function tileIsInWorld(tileX: number, tileY: number): boolean {
   return tileX >= 0 && tileX < Settings.BOARD_DIMENSIONS && tileY >= 0 && tileY < Settings.BOARD_DIMENSIONS;
}

export function tileIsInWorldIncludingEdges(tileX: number, tileY: number): boolean {
   return tileX >= -Settings.EDGE_GENERATION_DISTANCE && tileX < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE && tileY >= -Settings.EDGE_GENERATION_DISTANCE && tileY < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE;
}

export function positionIsInWorld(x: number, y: number): boolean {
   return x >= 0 && x < Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE && y >= 0 && y < Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE;
}

export function getTileIndexFromPos(x: number, y: number): TileIndex {
   const tileX = Math.floor(x / Settings.TILE_SIZE);
   const tileY = Math.floor(y / Settings.TILE_SIZE);
   return getTileIndexIncludingEdges(tileX, tileY);
}

export function getChunkIndex(chunkX: number, chunkY: number): number {
   return chunkY * Settings.BOARD_SIZE + chunkX;
}

const createCollisionGroupChunks = (): Record<CollisionGroup, ReadonlyArray<CollisionChunk>> => {
   const collisionGroupChunks: Partial<Record<CollisionGroup, ReadonlyArray<CollisionChunk>>>= {};

   for (let collisionGroup: CollisionGroup = 0; collisionGroup < CollisionGroup._LENGTH_; collisionGroup++) {
      const chunks = new Array<CollisionChunk>();
      for (let i = 0; i < Settings.BOARD_SIZE * Settings.BOARD_SIZE; i++) {
         const chunk = new CollisionChunk();
         chunks.push(chunk);
      }
      collisionGroupChunks[collisionGroup] = chunks;
   }

   return collisionGroupChunks as Record<CollisionGroup, ReadonlyArray<CollisionChunk>>;
}

export default class Layer {
   public readonly tileTypes: Float32Array;
   public readonly tileBiomes: Float32Array;
   private readonly subtileTypes: Float32Array;
   public readonly riverFlowDirections: Float32Array;
   public readonly tileTemperatures: Float32Array;
   public readonly tileHumidities: Float32Array;

   public readonly wallSubtileDamageTakenMap = new Map<number, number>();

   public waterRocks: ReadonlyArray<WaterRockData>;
   public riverSteppingStones: ReadonlyArray<RiverSteppingStoneData>;

   private tileUpdateCoordinates: Set<number>;
   public wallSubtileUpdates = new Array<WallSubtileUpdate>();

   /** Stores all entities collectively in each chunk */
   private chunks = new Array<Chunk>();

   public readonly collisionGroupChunks = createCollisionGroupChunks();

   public globalCollisionInfo: GlobalCollisionInfo = {};

   constructor(generationInfo: TerrainGenerationInfo) {
      this.tileTypes = generationInfo.tileTypes;
      this.tileBiomes = generationInfo.tileBiomes;
      this.subtileTypes = generationInfo.subtileTypes;
      this.riverFlowDirections = generationInfo.riverFlowDirections;
      this.tileTemperatures = generationInfo.tileTemperatures;
      this.tileHumidities = generationInfo.tileHumidities;
      this.waterRocks = generationInfo.waterRocks;
      this.riverSteppingStones = generationInfo.riverSteppingStones;

      // Initialise chunks
      for (let i = 0; i < Settings.BOARD_SIZE * Settings.BOARD_SIZE; i++) {
         const chunk = new Chunk();
         this.chunks.push(chunk);
      }

      for (let tileIndex = 0; tileIndex < Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS; tileIndex++) {
         const tileX = getTileX(tileIndex);
         const tileY = getTileY(tileIndex);
         if (tileIsInWorldIncludingEdges(tileX, tileY)) {
            addTileToCensus(this, tileIndex);
         }
      }

      if (OPTIONS.generateWalls) {
         for (let tileY = 0; tileY < Settings.BOARD_DIMENSIONS; tileY++) {
            for (let tileX = 0; tileX < Settings.BOARD_DIMENSIONS; tileX++) {
               if (tileHasWallSubtile(this.subtileTypes, tileX, tileY)) {
                  // Mark which chunks have wall tiles
                  const chunkX = Math.floor(tileX / Settings.CHUNK_SIZE);
                  const chunkY = Math.floor(tileY / Settings.CHUNK_SIZE);
                  const chunk = this.getChunk(chunkX, chunkY);
                  chunk.hasWallTiles = true;
                  
                  // @Incomplete: This system is outdated! Should account for wall subtiles
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

   public getSubtileTypes(): Readonly<Float32Array> {
      return this.subtileTypes;
   }

   public damageWallSubtitle(subtileIndex: number, damage: number): number {
      let damageDealt: number;
      if (!this.wallSubtileDamageTakenMap.has(subtileIndex)) {
         damageDealt = Math.min(damage, 3);
         this.wallSubtileDamageTakenMap.set(subtileIndex, damageDealt);
      } else {
         const previousDamageTaken = this.wallSubtileDamageTakenMap.get(subtileIndex)!;
         damageDealt = Math.min(damage, 3 - previousDamageTaken);
         this.wallSubtileDamageTakenMap.set(subtileIndex, previousDamageTaken + damageDealt);
      }

      if (this.wallSubtileDamageTakenMap.get(subtileIndex)! >= 3) {
         this.subtileTypes[subtileIndex] = SubtileType.none;
         
         this.wallSubtileDamageTakenMap.delete(subtileIndex);

         this.wallSubtileUpdates.push({
            subtileIndex: subtileIndex,
            subtileType: SubtileType.none,
            damageTaken: 0
         });
      } else {
         this.wallSubtileUpdates.push({
            subtileIndex: subtileIndex,
            subtileType: this.subtileTypes[subtileIndex],
            damageTaken: this.wallSubtileDamageTakenMap.get(subtileIndex)!
         });
      }

      return damageDealt;
   }

   public static tickIntervalHasPassed(intervalSeconds: number): boolean {
      const ticksPerInterval = intervalSeconds * Settings.TPS;
      
      const gameTicks = getGameTicks();
      const previousCheck = (gameTicks - 1) / ticksPerInterval;
      const check = gameTicks / ticksPerInterval;
      return Math.floor(previousCheck) !== Math.floor(check);
   }

   public getTileType(tileIndex: number): TileType {
      return this.tileTypes[tileIndex];
   }
   
   public getTileXYType(tileX: number, tileY: number): TileType {
      const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
      return this.tileTypes[tileIndex];
   }
   
   public getTileTypeAtPosition(x: number, y: number): TileType {
      const tileX = Math.floor(x / Settings.TILE_SIZE);
      const tileY = Math.floor(y / Settings.TILE_SIZE);
      return this.getTileXYType(tileX, tileY);
   }

   public subtileIsWall(subtileX: number, subtileY: number): boolean {
      const subtileIndex = getSubtileIndex(subtileX, subtileY);
      return this.subtileTypes[subtileIndex] !== SubtileType.none;
   }

   public positionHasWall(x: number, y: number): boolean {
      const subtileX = Math.floor(x / Settings.SUBTILE_SIZE);
      const subtileY = Math.floor(y / Settings.SUBTILE_SIZE);
      return this.subtileIsWall(subtileX, subtileY);
   }

   public getTileBiome(tileIndex: TileIndex): Biome {
      return this.tileBiomes[tileIndex];
   }

   public getTileXYBiome(tileX: number, tileY: number): Biome {
      const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
      return this.tileBiomes[tileIndex];
   }

   public getBiomeAtPosition(x: number, y: number): Biome {
      const tileX = Math.floor(x / Settings.TILE_SIZE);
      const tileY = Math.floor(y / Settings.TILE_SIZE);

      return this.getTileXYBiome(tileX, tileY);
   }

   public getChunk(chunkX: number, chunkY: number): Chunk {
      const chunkIndex = chunkY * Settings.BOARD_SIZE + chunkX;
      return this.chunks[chunkIndex];
   }

   // @Temporary
   public getChunkIndex(chunk: Chunk): number {
      const idx = this.chunks.indexOf(chunk);
      if (idx === -1) {
         throw new Error();
      }
      return idx;
   }

   public getChunkByIndex(chunkIndex: number): Chunk {
      return this.chunks[chunkIndex];
   }

   public getCollisionChunkByIndex(collisionGroup: CollisionGroup, chunkIndex: number): CollisionChunk {
      return this.collisionGroupChunks[collisionGroup][chunkIndex];
   }

   public getEntityCollisionPairs(entity: EntityID): ReadonlyArray<EntityPairCollisionInfo> {
      return this.globalCollisionInfo[entity] || [];
   }

   /** Registers a tile update to be sent to the clients */
   public registerNewTileUpdate(x: number, y: number): void {
      const tileIndex = y * Settings.BOARD_DIMENSIONS + x;
      this.tileUpdateCoordinates.add(tileIndex);
   }

   /** Get all tile updates and reset them */
   public popTileUpdates(): ReadonlyArray<ServerTileUpdateData> {
      // Generate the tile updates array
      const tileUpdates = new Array<ServerTileUpdateData>();
      for (const tileIndex of this.tileUpdateCoordinates) {
         const tileX = tileIndex % Settings.BOARD_DIMENSIONS;
         const tileY = Math.floor(tileIndex / Settings.BOARD_DIMENSIONS);
         
         tileUpdates.push({
            layerIdx: layers.indexOf(this),
            tileIndex: tileIndex,
            type: this.getTileXYType(tileX, tileY)
         });
      }

      // reset the tile update coordiantes
      this.tileUpdateCoordinates.clear();

      return tileUpdates;
   }

   public static isInBoard(position: Point): boolean {
      return position.x >= 0 && position.x <= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - 1 && position.y >= 0 && position.y <= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - 1;
   }

   public getDistanceToClosestEntity(position: Point): number {
      let minDistance = 2000;

      const minChunkX = Math.max(Math.min(Math.floor((position.x - 2000) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkX = Math.max(Math.min(Math.floor((position.x + 2000) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const minChunkY = Math.max(Math.min(Math.floor((position.y - 2000) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkY = Math.max(Math.min(Math.floor((position.y + 2000) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);

      const checkedEntities = new Set<EntityID>();
      
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const chunk = this.getChunk(chunkX, chunkY);
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

   public getEntitiesAtPosition(x: number, y: number): Array<EntityID> {
      if (!positionIsInWorld(x, y)) {
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
            if (boxIsWithinRange(hitbox.box, testPosition, 1)) {
               entities.push(entity);
               break;
            }
         }
      }

      return entities;
   }

   public getEntitiesInRange(x: number, y: number, range: number): Array<EntityID> {
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
            const chunk = this.getChunk(chunkX, chunkY);
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

   public getWorldInfo(): WorldInfo {
      return {
         chunks: this.chunks,
         getEntityCallback: (entity: EntityID): EntityInfo => {
            const transformComponent = TransformComponentArray.getComponent(entity);

            return {
               type: getEntityType(entity)!,
               position: transformComponent.position,
               rotation: transformComponent.rotation,
               id: entity,
               hitboxes: transformComponent.hitboxes
            };
         }
      }
   }

   public getChunksInBounds(minX: number, maxX: number, minY: number, maxY: number): ReadonlyArray<Chunk> {
      const minChunkX = Math.max(Math.min(Math.floor(minX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkX = Math.max(Math.min(Math.floor(maxX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const minChunkY = Math.max(Math.min(Math.floor(minY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkY = Math.max(Math.min(Math.floor(maxY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   
      const chunks = new Array<Chunk>();
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const chunk = this.getChunk(chunkX, chunkY);
            chunks.push(chunk);
         }
      }
   
      return chunks;
   }

   /** Returns false if any of the tiles in the raycast don't match the inputted tile types. */
   public tileRaytraceMatchesTileTypes(startX: number, startY: number, endX: number, endY: number, tileTypes: ReadonlyArray<TileType>): boolean {
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
         const tileType = this.getTileXYType(x, y);
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
   public raytraceHasWallSubtile(startX: number, startY: number, endX: number, endY: number): boolean {
      /*
      Kindly yoinked from https://playtechs.blogspot.com/2007/03/raytracing-on-grid.html
      */
      
      // Convert to subtile coordinates
      const x0 = startX / Settings.SUBTILE_SIZE;
      const y0 = startY / Settings.SUBTILE_SIZE;
      const x1 = endX / Settings.SUBTILE_SIZE;
      const y1 = endY / Settings.SUBTILE_SIZE;
      
      const dx = Math.abs(x0 - x1);
      const dy = Math.abs(y0 - y1);
   
      // Starting subtile coordinates
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
         if (this.subtileIsWall(x, y)) {
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
            const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
            tiles.push(tileIndex);
         }
      }
   }
   return tiles;
}
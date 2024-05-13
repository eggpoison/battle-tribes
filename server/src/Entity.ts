import { Point, clampToBoardDimensions } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import { EntityComponents } from "webgl-test-shared/dist/components";
import { Settings } from "webgl-test-shared/dist/settings";
import { EntityDebugData, HitboxCollisionType, PathfindingNodeIndex, RIVER_STEPPING_STONE_SIZES } from "webgl-test-shared/dist/client-server-types";
import { TileType } from "webgl-test-shared/dist/tiles";
import Tile from "./Tile";
import Chunk from "./Chunk";
import RectangularHitbox from "./hitboxes/RectangularHitbox";
import Board from "./Board";
import CircularHitbox from "./hitboxes/CircularHitbox";
import { onCowDeath } from "./entities/mobs/cow";
import { onTreeDeath } from "./entities/resources/tree";
import { onPlayerDeath } from "./entities/tribes/player";
import { onIceSpikesDeath } from "./entities/resources/ice-spikes";
import { onKrumblidDeath } from "./entities/mobs/krumblid";
import { onTribeWorkerDeath } from "./entities/tribes/tribe-worker";
import { onYetiDeath } from "./entities/mobs/yeti";
import { onFishDeath } from "./entities/mobs/fish";
import { cleanAngle } from "./ai-shared";
import { onTribeWarriorDeath } from "./entities/tribes/tribe-warrior";
import { onSlimeSpitDeath } from "./entities/projectiles/slime-spit";
import { AIHelperComponentArray } from "./components/AIHelperComponent";
import { PhysicsComponentArray } from "./components/PhysicsComponent";
import { onCactusDeath } from "./entities/resources/cactus";

let idCounter = 1;

/** Finds a unique available ID for an entity */
export function findAvailableEntityID(): number {
   return idCounter++;
}

// @Cleanup: Remove this and just do all collision stuff in one function
enum TileCollisionAxis {
   none = 0,
   x = 1,
   y = 2,
   diagonal = 3
}

export const RESOURCE_ENTITY_TYPES: ReadonlyArray<EntityType> = [EntityType.krumblid, EntityType.fish, EntityType.cow, EntityType.tree, EntityType.boulder, EntityType.cactus, EntityType.iceSpikes, EntityType.berryBush];

export const NUM_ENTITY_TYPES = Object.keys(EntityComponents).length;

// @Cleanup: Copy and pasted from shared repo

const findMinWithOffset = (vertices: ReadonlyArray<Point>, offsetX: number, offsetY: number, axis: Point): number => {
   const firstVertex = vertices[0];
   let min = axis.x * (firstVertex.x + offsetX) + axis.y * (firstVertex.y + offsetY);

   for (let i = 1; i < 4; i++) {
      const vertex = vertices[i];
      const dotProduct = axis.x * (vertex.x + offsetX) + axis.y * (vertex.y + offsetY);
      if (dotProduct < min) {
         min = dotProduct;
      }
   }

   return min;
}

const findMaxWithOffset = (vertices: ReadonlyArray<Point>, offsetX: number, offsetY: number, axis: Point): number => {
   const firstVertex = vertices[0];
   let max = axis.x * (firstVertex.x + offsetX) + axis.y * (firstVertex.y + offsetY);

   for (let i = 1; i < 4; i++) {
      const vertex = vertices[i];
      const dotProduct = axis.x * (vertex.x + offsetX) + axis.y * (vertex.y + offsetY);
      if (dotProduct > max) {
         max = dotProduct;
      }
   }

   return max;
}

/** A generic class for any object in the world */
class Entity<T extends EntityType = EntityType> {
   // @Cleanup: Remove
   private static readonly rectangularTestHitbox = new RectangularHitbox(0, 0, 1, 0, 0, HitboxCollisionType.soft, 1, 0, 0.1, 0.1, 0);
   
   /** Unique identifier for each entity */
   public readonly id: number;

   public readonly type: T;

   /** Combined mass of all the entity's hitboxes */
   public totalMass = Number.EPSILON;

   public ageTicks = 0;

   /** Position of the entity in the world */
   public position: Point;

   // @Cleanup @Memory: Do we really need this??
   /** Last position when the entities' hitboxes were clean */
   private lastCleanedPosition: Point;

   /** Direction the entity is facing in radians */
   public rotation: number;

   public collisionPushForceMultiplier = 1;

   /** Set of all chunks the entity is contained in */
   public chunks = new Array<Chunk>();

   /** The tile the entity is currently standing on. */
   public tile!: Tile;

   /** All hitboxes attached to the entity */
   public hitboxes = new Array<RectangularHitbox | CircularHitbox>();

   public isInRiver!: boolean;
   
   public boundingAreaMinX = Number.MAX_SAFE_INTEGER;
   public boundingAreaMaxX = Number.MIN_SAFE_INTEGER;
   public boundingAreaMinY = Number.MAX_SAFE_INTEGER;
   public boundingAreaMaxY = Number.MIN_SAFE_INTEGER;

   public readonly collisionBit: number;
   public collisionMask: number;

   public occupiedPathfindingNodes = new Set<PathfindingNodeIndex>();

   private nextHitboxLocalID = 1;

   constructor(position: Point, rotation: number, type: T, collisionBit: number, collisionMask: number) {
      this.position = position;
      this.rotation = rotation;
      this.lastCleanedPosition = new Point(position.x, position.y);
      this.type = type;
      this.collisionBit = collisionBit;
      this.collisionMask = collisionMask;

      this.id = findAvailableEntityID();

      // Clamp the game object's position to within the world
      if (this.position.x < 0) this.position.x = 0;
      if (this.position.x >= Settings.BOARD_UNITS) this.position.x = Settings.BOARD_UNITS - 1;
      if (this.position.y < 0) this.position.y = 0;
      if (this.position.y >= Settings.BOARD_UNITS) this.position.y = Settings.BOARD_UNITS - 1;

      this.updateTile();
      this.strictCheckIsInRiver();

      Board.addEntityToJoinBuffer(this);
   }

   public getNextHitboxLocalID(): number {
      return this.nextHitboxLocalID++;
   }

   public addHitbox(hitbox: RectangularHitbox | CircularHitbox): void {
      this.hitboxes.push(hitbox);
      this.totalMass += hitbox.mass;

      const boundsMinX = hitbox.calculateHitboxBoundsMinX();
      const boundsMaxX = hitbox.calculateHitboxBoundsMaxX();
      const boundsMinY = hitbox.calculateHitboxBoundsMinY();
      const boundsMaxY = hitbox.calculateHitboxBoundsMaxY();

      // Update bounding area
      if (boundsMinX < this.boundingAreaMinX) {
         this.boundingAreaMinX = boundsMinX;
      }
      if (boundsMaxX > this.boundingAreaMaxX) {
         this.boundingAreaMaxX = boundsMaxX;
      }
      if (boundsMinY < this.boundingAreaMinY) {
         this.boundingAreaMinY = boundsMinY;
      }
      if (boundsMaxY > this.boundingAreaMaxY) {
         this.boundingAreaMaxY = boundsMaxY;
      }

      hitbox.chunkBounds[0] = Math.floor(boundsMinX / Settings.CHUNK_UNITS);
      hitbox.chunkBounds[1] = Math.floor(boundsMaxX / Settings.CHUNK_UNITS);
      hitbox.chunkBounds[2] = Math.floor(boundsMinY / Settings.CHUNK_UNITS);
      hitbox.chunkBounds[3] = Math.floor(boundsMaxY / Settings.CHUNK_UNITS);

      // If the hitbox is clipping into a border, clean the entities' position so that it doesn't clip
      if (boundsMinX < 0 || boundsMaxX >= Settings.BOARD_UNITS || boundsMinY < 0 || boundsMaxY >= Settings.BOARD_UNITS) {
         this.cleanHitboxes();
      }
   }

   /** Recalculates the game objects' bounding area, hitbox positions and bounds, and the hasPotentialWallTileCollisions flag */
   public cleanHitboxes(): void {
      this.boundingAreaMinX = Number.MAX_SAFE_INTEGER;
      this.boundingAreaMaxX = Number.MIN_SAFE_INTEGER;
      this.boundingAreaMinY = Number.MAX_SAFE_INTEGER;
      this.boundingAreaMaxY = Number.MIN_SAFE_INTEGER;

      // An object only changes their chunks if a hitboxes' bounds change chunks.
      let hitboxChunkBoundsHaveChanged = false;
      const numHitboxes = this.hitboxes.length;
      for (let i = 0; i < numHitboxes; i++) {
         const hitbox = this.hitboxes[i];

         hitbox.updatePosition(this.position.x, this.position.y, this.rotation);
         // @Speed: This check is slow
         if (!hitbox.hasOwnProperty("radius")) {
            (hitbox as RectangularHitbox).updateRotationAndVertexPositionsAndSideAxes(this.rotation);
         }

         const boundsMinX = hitbox.calculateHitboxBoundsMinX();
         const boundsMaxX = hitbox.calculateHitboxBoundsMaxX();
         const boundsMinY = hitbox.calculateHitboxBoundsMinY();
         const boundsMaxY = hitbox.calculateHitboxBoundsMaxY();

         // Update bounding area
         if (boundsMinX < this.boundingAreaMinX) {
            this.boundingAreaMinX = boundsMinX;
         }
         if (boundsMaxX > this.boundingAreaMaxX) {
            this.boundingAreaMaxX = boundsMaxX;
         }
         if (boundsMinY < this.boundingAreaMinY) {
            this.boundingAreaMinY = boundsMinY;
         }
         if (boundsMaxY > this.boundingAreaMaxY) {
            this.boundingAreaMaxY = boundsMaxY;
         }

         // Check if the hitboxes' chunk bounds have changed
         // @Speed
         // @Speed
         // @Speed
         if (!hitboxChunkBoundsHaveChanged) {
            const minChunkX = Math.floor(boundsMinX / Settings.CHUNK_UNITS);
            const maxChunkX = Math.floor(boundsMaxX / Settings.CHUNK_UNITS);
            const minChunkY = Math.floor(boundsMinY / Settings.CHUNK_UNITS);
            const maxChunkY = Math.floor(boundsMaxY / Settings.CHUNK_UNITS);

            if (minChunkX !== hitbox.chunkBounds[0] ||
                maxChunkX !== hitbox.chunkBounds[1] ||
                minChunkY !== hitbox.chunkBounds[2] ||
                maxChunkY !== hitbox.chunkBounds[3]) {
               hitboxChunkBoundsHaveChanged = true;

               hitbox.chunkBounds[0] = minChunkX;
               hitbox.chunkBounds[1] = maxChunkX;
               hitbox.chunkBounds[2] = minChunkY;
               hitbox.chunkBounds[3] = maxChunkY;
            }
         }
      }

      this.lastCleanedPosition.x = this.position.x;
      this.lastCleanedPosition.y = this.position.y;

      if (hitboxChunkBoundsHaveChanged) {
         this.updateContainingChunks();
      }
   }

   public updateHitboxes(): void {
      const shiftX = this.position.x - this.lastCleanedPosition.x;
      const shiftY = this.position.y - this.lastCleanedPosition.y;
      
      this.boundingAreaMinX += shiftX;
      this.boundingAreaMaxX += shiftX;
      this.boundingAreaMinY += shiftY;
      this.boundingAreaMaxY += shiftY;

      this.lastCleanedPosition.x = this.position.x;
      this.lastCleanedPosition.y = this.position.y;

      // @Speed
      // @Speed
      // @Speed

      let hitboxChunkBoundsHaveChanged = false;
      const numHitboxes = this.hitboxes.length;
      for (let i = 0; i < numHitboxes; i++) {
         const hitbox = this.hitboxes[i];

         hitbox.updatePosition(this.position.x, this.position.y, this.rotation);

         const boundsMinX = hitbox.calculateHitboxBoundsMinX();
         const boundsMaxX = hitbox.calculateHitboxBoundsMaxX();
         const boundsMinY = hitbox.calculateHitboxBoundsMinY();
         const boundsMaxY = hitbox.calculateHitboxBoundsMaxY();

         // Check if the hitboxes' chunk bounds have changed
         if (!hitboxChunkBoundsHaveChanged) {
            const minChunkX = Math.floor(boundsMinX / Settings.CHUNK_UNITS);
            const maxChunkX = Math.floor(boundsMaxX / Settings.CHUNK_UNITS);
            const minChunkY = Math.floor(boundsMinY / Settings.CHUNK_UNITS);
            const maxChunkY = Math.floor(boundsMaxY / Settings.CHUNK_UNITS);

            if (minChunkX !== hitbox.chunkBounds[0] ||
                maxChunkX !== hitbox.chunkBounds[1] ||
                minChunkY !== hitbox.chunkBounds[2] ||
                maxChunkY !== hitbox.chunkBounds[3]) {
               hitboxChunkBoundsHaveChanged = true;

               hitbox.chunkBounds[0] = minChunkX;
               hitbox.chunkBounds[1] = maxChunkX;
               hitbox.chunkBounds[2] = minChunkY;
               hitbox.chunkBounds[3] = maxChunkY;
            }
         }
      }

      if (hitboxChunkBoundsHaveChanged) {
         this.updateContainingChunks();
      }
   }

   public tick(): void {
      this.ageTicks++;
   }

   /** Updates the tile the object is on. */
   public updateTile(): void {
      const tileX = Math.floor(this.position.x / Settings.TILE_SIZE);
      const tileY = Math.floor(this.position.y / Settings.TILE_SIZE);
      
      this.tile = Board.getTile(tileX, tileY);
   }

   public strictCheckIsInRiver(): void {
      if (this.tile.type !== TileType.water) {
         this.isInRiver = false;
         return;
      }

      if (PhysicsComponentArray.hasComponent(this.id)) {
         const physicsComponent = PhysicsComponentArray.getComponent(this.id);
         if (!physicsComponent.isAffectedByFriction) {
            this.isInRiver = false;
            return;
         }
      }

      // If the game object is standing on a stepping stone they aren't in a river
      for (const chunk of this.chunks) {
         for (const steppingStone of chunk.riverSteppingStones) {
            const size = RIVER_STEPPING_STONE_SIZES[steppingStone.size];
            
            const distX = this.position.x - steppingStone.positionX;
            const distY = this.position.y - steppingStone.positionY;
            if (distX * distX + distY * distY <= size * size / 4) {
               this.isInRiver = false;
               return;
            }
         }
      }

      this.isInRiver = true;
   }

   public checkIsInRiver(): void {
      if (typeof this.tile === "undefined") {
         console.log("tile undefined???");
      }
      
      if (this.tile.type !== TileType.water) {
         this.isInRiver = false;
         return;
      }

      const physicsComponent = PhysicsComponentArray.getComponent(this.id);
      if (!physicsComponent.isAffectedByFriction) {
         this.isInRiver = false;
         return;
      }

      // If the game object is standing on a stepping stone they aren't in a river
      for (const chunk of this.chunks) {
         for (const steppingStone of chunk.riverSteppingStones) {
            const size = RIVER_STEPPING_STONE_SIZES[steppingStone.size];
            
            const distX = this.position.x - steppingStone.positionX;
            const distY = this.position.y - steppingStone.positionY;
            if (distX * distX + distY * distY <= size * size / 4) {
               this.isInRiver = false;
               return;
            }
         }
      }

      this.isInRiver = true;
   }

   public updateContainingChunks(): void {
      // Calculate containing chunks
      const containingChunks = new Array<Chunk>();
      for (let i = 0; i < this.hitboxes.length; i++) {
         const hitbox = this.hitboxes[i];

         const boundsMinX = hitbox.calculateHitboxBoundsMinX();
         const boundsMaxX = hitbox.calculateHitboxBoundsMaxX();
         const boundsMinY = hitbox.calculateHitboxBoundsMinY();
         const boundsMaxY = hitbox.calculateHitboxBoundsMaxY();

         const minChunkX = Math.max(Math.min(Math.floor(boundsMinX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         const maxChunkX = Math.max(Math.min(Math.floor(boundsMaxX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         const minChunkY = Math.max(Math.min(Math.floor(boundsMinY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         const maxChunkY = Math.max(Math.min(Math.floor(boundsMaxY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);

         for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
            for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
               const chunk = Board.getChunk(chunkX, chunkY);
               if (containingChunks.indexOf(chunk) === -1) {
                  containingChunks.push(chunk);
               }
            }
         }
      }

      // Add all new chunks
      for (let i = 0; i < containingChunks.length; i++) {
         const chunk = containingChunks[i];
         if (this.chunks.indexOf(chunk) === -1) {
            this.addToChunk(chunk);
            this.chunks.push(chunk);
         }
      }

      // Find all chunks which aren't present in the new chunks and remove them
      for (let i = 0; i < this.chunks.length; i++) {
         const chunk = this.chunks[i]
         if (containingChunks.indexOf(chunk) === -1) {
            this.removeFromChunk(chunk);
            this.chunks.splice(i, 1);
            i--;
         }
      }
   }

   protected addToChunk(chunk: Chunk): void {
      chunk.entities.push(this);

      const numViewingMobs = chunk.viewingEntities.length;
      for (let i = 0; i < numViewingMobs; i++) {
         const viewingEntity = chunk.viewingEntities[i];
         const aiHelperComponent = AIHelperComponentArray.getComponent(viewingEntity.id);

         const idx = aiHelperComponent.potentialVisibleEntities.indexOf(this);
         if (idx === -1 && viewingEntity.id !== this.id) {
            aiHelperComponent.potentialVisibleEntities.push(this);
            aiHelperComponent.potentialVisibleEntityAppearances.push(1);
         } else {
            aiHelperComponent.potentialVisibleEntityAppearances[idx]++;
         }
      }
   }

   public removeFromChunk(chunk: Chunk): void {
      const idx = chunk.entities.indexOf(this);
      if (idx !== -1) {
         chunk.entities.splice(idx, 1);
      }

      // @Incomplete
      // Remove the entity from the potential visible entities of all entities viewing the chunk
      const numViewingMobs = chunk.viewingEntities.length;
      for (let i = 0; i < numViewingMobs; i++) {
         const viewingEntity = chunk.viewingEntities[i];
         if (viewingEntity.id === this.id) {
            continue;
         }

         const aiHelperComponent = AIHelperComponentArray.getComponent(viewingEntity.id);

         const idx = aiHelperComponent.potentialVisibleEntities.indexOf(this);
         if (idx === -1) {
            throw new Error("Tried to remove entity from visible entities when it wasn't in it");
         }
         aiHelperComponent.potentialVisibleEntityAppearances[idx]--;
         if (aiHelperComponent.potentialVisibleEntityAppearances[idx] === 0) {
            aiHelperComponent.potentialVisibleEntities.splice(idx, 1);
            aiHelperComponent.potentialVisibleEntityAppearances.splice(idx, 1);

            const idx2 = aiHelperComponent.visibleEntities.indexOf(this);
            if (idx2 !== -1) {
               aiHelperComponent.visibleEntities.splice(idx2, 1);
            }
         }
      }
   }

   private checkForCircularTileCollision(tile: Tile, hitbox: CircularHitbox): TileCollisionAxis {
      // Get the distance between the player's position and the center of the tile
      const xDist = Math.abs(this.position.x - (tile.x + 0.5) * Settings.TILE_SIZE);
      const yDist = Math.abs(this.position.y - (tile.y + 0.5) * Settings.TILE_SIZE);

      if (xDist <= hitbox.radius) {
         return TileCollisionAxis.y;
      }
      if (yDist <= hitbox.radius) {
         return TileCollisionAxis.x;
      }

      const cornerDistance = Math.sqrt(Math.pow(xDist, 2) + Math.pow(yDist, 2));

      if (cornerDistance <= Math.sqrt(Math.pow(Settings.TILE_SIZE, 2) / 2) + hitbox.radius) {
         return TileCollisionAxis.diagonal;
      }

      return TileCollisionAxis.none;
   }

   private resolveXAxisCircularTileCollision(tile: Tile, hitbox: CircularHitbox): void {
      const xDist = this.position.x - tile.x * Settings.TILE_SIZE;
      const xDir = xDist >= 0 ? 1 : -1;
      // The 0.0001 epsilon value is used so that the game object isn't put exactly on the border between tiles
      // We don't use Number.EPSILON because it doesn't work in some cases
      this.position.x = tile.x * Settings.TILE_SIZE + (0.5 + 0.5 * xDir) * Settings.TILE_SIZE + (hitbox.radius + 0.0001) * xDir;

      const physicsComponent = PhysicsComponentArray.getComponent(this.id);
      physicsComponent.velocity.x = 0;
   }

   private resolveYAxisCircularTileCollision(tile: Tile, hitbox: CircularHitbox): void {
      const yDist = this.position.y - tile.y * Settings.TILE_SIZE;
      const yDir = yDist >= 0 ? 1 : -1;
      // The 0.0001 epsilon value is used so that the game object isn't put exactly on the border between tiles
      // We don't use Number.EPSILON because it doesn't work in some cases
      this.position.y = tile.y * Settings.TILE_SIZE + (0.5 + 0.5 * yDir) * Settings.TILE_SIZE + (hitbox.radius + 0.0001) * yDir;
      
      const physicsComponent = PhysicsComponentArray.getComponent(this.id);
      physicsComponent.velocity.y = 0;
   }

   private resolveDiagonalCircularTileCollision(tile: Tile, hitbox: CircularHitbox): void {
      const xDist = this.position.x - tile.x * Settings.TILE_SIZE;
      const yDist = this.position.y - tile.y * Settings.TILE_SIZE;

      const xDir = xDist >= 0 ? 1 : -1;
      const yDir = yDist >= 0 ? 1 : -1;

      const xDistFromEdge = Math.abs(xDist - Settings.TILE_SIZE/2);
      const yDistFromEdge = Math.abs(yDist - Settings.TILE_SIZE/2);

      // The 0.0001 epsilon value is used so that the game object isn't put exactly on the border between tiles
      // We don't use Number.EPSILON because it doesn't work in some cases
      const physicsComponent = PhysicsComponentArray.getComponent(this.id);
      if (yDistFromEdge < xDistFromEdge) {
         this.position.x = (tile.x + 0.5 + 0.5 * xDir) * Settings.TILE_SIZE + (hitbox.radius + 0.0001) * xDir;
         physicsComponent.velocity.x = 0;
      } else {
         this.position.y = (tile.y + 0.5 + 0.5 * yDir) * Settings.TILE_SIZE + (hitbox.radius + 0.0001) * yDir;
         physicsComponent.velocity.y = 0;
      }
   }

   private checkForRectangularTileCollision(tile: Tile, hitbox: RectangularHitbox): TileCollisionAxis {
      // 
      // Check if any of the hitboxes' vertices are inside the tile
      // 

      const tileMinX = tile.x * Settings.TILE_SIZE;
      const tileMaxX = (tile.x + 1) * Settings.TILE_SIZE;
      const tileMinY = tile.y * Settings.TILE_SIZE;
      const tileMaxY = (tile.y + 1) * Settings.TILE_SIZE;

      for (let i = 0; i < 4; i++) {
         const vertex = hitbox.vertexOffsets[i];
         if (vertex.x >= tileMinX && vertex.x <= tileMaxX && vertex.y >= tileMinY && vertex.y <= tileMaxY) {
            const distX = Math.abs(this.position.x - (tile.x + 0.5) * Settings.TILE_SIZE);
            const distY = Math.abs(this.position.y - (tile.y + 0.5) * Settings.TILE_SIZE);

            if (distX >= distY) {
               return TileCollisionAxis.x;
            } else {
               return TileCollisionAxis.y;
            }
         }
      }

      // 
      // Check for diagonal collisions
      // 
      
      Entity.rectangularTestHitbox.width = Settings.TILE_SIZE;
      Entity.rectangularTestHitbox.height = Settings.TILE_SIZE;
      // @Incomplete(?): Do we need to update vertices and axes?
      Entity.rectangularTestHitbox.updatePosition((tile.x + 0.5) * Settings.TILE_SIZE, (tile.y + 0.5) * Settings.TILE_SIZE, 0);

      if (Entity.rectangularTestHitbox.isColliding(hitbox)) {
         return TileCollisionAxis.diagonal;
      }

      return TileCollisionAxis.none;
   }

   private resolveXAxisRectangularTileCollision(tile: Tile, hitbox: RectangularHitbox): void {
      const tileMinX = tile.x * Settings.TILE_SIZE;
      const tileMaxX = (tile.x + 1) * Settings.TILE_SIZE;
      const tileMinY = tile.y * Settings.TILE_SIZE;
      const tileMaxY = (tile.y + 1) * Settings.TILE_SIZE;

      let vertexPositionX = -99999;
      for (let i = 0; i < 4; i++) {
         const vertexOffset = hitbox.vertexOffsets[i];
         const vertexPosX = this.position.x + vertexOffset.x;
         const vertexPosY = this.position.y + vertexOffset.y;
         if (vertexPosX >= tileMinX && vertexPosX <= tileMaxX && vertexPosY >= tileMinY && vertexPosY <= tileMaxY) {
            vertexPositionX = vertexPosX;
            break;
         }
      }
      if (vertexPositionX === -99999) {
         throw new Error();
      }

      const startXDist = vertexPositionX - tile.x * Settings.TILE_SIZE;
      const xDist = vertexPositionX - (tile.x + 0.5) * Settings.TILE_SIZE;

      // Push left
      if (xDist < 0) {
         this.position.x -= startXDist;
      } else {
         // Push right
         this.position.x += Settings.TILE_SIZE - startXDist;
      }
   }

   private resolveYAxisRectangularTileCollision(tile: Tile, hitbox: RectangularHitbox): void {
      const tileMinX = tile.x * Settings.TILE_SIZE;
      const tileMaxX = (tile.x + 1) * Settings.TILE_SIZE;
      const tileMinY = tile.y * Settings.TILE_SIZE;
      const tileMaxY = (tile.y + 1) * Settings.TILE_SIZE;

      let vertexPositionY = -99999;
      for (let i = 0; i < 4; i++) {
         const vertexOffset = hitbox.vertexOffsets[i];
         const vertexPosX = this.position.x + vertexOffset.x;
         const vertexPosY = this.position.y + vertexOffset.y;
         if (vertexPosX >= tileMinX && vertexPosX <= tileMaxX && vertexPosY >= tileMinY && vertexPosY <= tileMaxY) {
            vertexPositionY = vertexPosY;
            break;
         }
      }
      if (vertexPositionY === -99999) {
         throw new Error();
      }

      const startYDist = vertexPositionY - tile.y * Settings.TILE_SIZE;
      const yDist = vertexPositionY - (tile.y + 0.5) * Settings.TILE_SIZE;

      // Push left
      if (yDist < 0) {
         this.position.y -= startYDist;
      } else {
         // Push right
         this.position.y += Settings.TILE_SIZE - startYDist;
      }
   }

   // private resolveDiagonalRectangularTileCollision(tile: Tile, hitbox: RectangularHitbox): void {
   //    const vertexOffsetPairs: ReadonlyArray<[Point, Point]> = [
   //       [hitbox.vertexOffsets[0], hitbox.vertexOffsets[1]],
   //       [hitbox.vertexOffsets[1], hitbox.vertexOffsets[3]],
   //       [hitbox.vertexOffsets[3], hitbox.vertexOffsets[2]],
   //       [hitbox.vertexOffsets[2], hitbox.vertexOffsets[0]]
   //    ];

   //    const tileX1 = tile.x * Settings.TILE_SIZE;
   //    const tileX2 = (tile.x + 1) * Settings.TILE_SIZE;
   //    const tileY1 = tile.y * Settings.TILE_SIZE;
   //    const tileY2 = (tile.y + 1) * Settings.TILE_SIZE;

   //    let collidingVertex1!: Point;
   //    let collidingVertex2!: Point;
      
   //    for (const offsetPair of vertexOffsetPairs) {
   //       const leftPoint =   offsetPair[0].x < offsetPair[1].x ? offsetPair[0] : offsetPair[1];
   //       const rightPoint =  offsetPair[0].x < offsetPair[1].x ? offsetPair[1] : offsetPair[0];
   //       const bottomPoint = offsetPair[0].y < offsetPair[1].y ? offsetPair[0] : offsetPair[1];
   //       const topPoint =    offsetPair[0].y < offsetPair[1].y ? offsetPair[1] : offsetPair[0];

   //       if (offsetPair[0].x === offsetPair[1].x) {
   //          // Division by 0 error
   //          // @Incomplete: Do stuff
   //          return;
   //       }

   //       const leftPointX = leftPoint.x + this.position.x;
   //       const leftPointY = leftPoint.y + this.position.y;
   //       const rightPointX = rightPoint.x + this.position.x;
   //       const rightPointY = rightPoint.y + this.position.y;

   //       const slope = (rightPointY - leftPointY) / (rightPointX - leftPointX);

   //       // Check left projection
   //       if (leftPointX < tileX1) {
   //          const leftProjectionY = leftPointY + slope * (tileX1 - leftPointX);
   //          if (leftProjectionY >= tileY1 && leftProjectionY <= tileY2) {
   //             collidingVertex1 = offsetPair[0];
   //             collidingVertex2 = offsetPair[1];
   //             break;
   //          }
   //       }

   //       // Check right projection
   //       if (rightPointX > tileX2) {
   //          const rightProjectionY = rightPointY - slope * (rightPointX - tileX2);
   //          if (rightProjectionY >= tileY1 && rightProjectionY <= tileY2) {
   //             collidingVertex1 = offsetPair[0];
   //             collidingVertex2 = offsetPair[1];
   //             break;
   //          }
   //       }

   //       const topPointX = topPoint.x + this.position.x;
   //       const topPointY = topPoint.y + this.position.y;

   //       // Check top projection
   //       if (topPointY > tileY2) {
   //          const topProjectionX = topPointX + (topPointY - tileY2) / slope;
   //          if (topProjectionX >= tileX1 && topProjectionX <= tileX2) {
   //             collidingVertex1 = offsetPair[0];
   //             collidingVertex2 = offsetPair[1];
   //             break;
   //          }
   //       }

   //       const bottomPointX = bottomPoint.x + this.position.x;
   //       const bottomPointY = bottomPoint.y + this.position.y;

   //       // Check bottom projection
   //       if (bottomPointY < tileY1) {
   //          const bottomProjectionX = bottomPointX - (tileY2 - topPointY) / slope;
   //          if (bottomProjectionX >= tileX1 && bottomProjectionX <= tileX2) {
   //             collidingVertex1 = offsetPair[0];
   //             collidingVertex2 = offsetPair[1];
   //             break;
   //          }
   //       }
   //    }

   //    if (typeof collidingVertex1 === "undefined" || typeof collidingVertex2 === "undefined") {
   //       // @Incomplete: Couldn't find colliding vertex pair
   //       return;
   //    }

   //    const pairs2: ReadonlyArray<[number, number]> = [
   //       [tileX1, tileY1],
   //       [tileX2, tileY1],
   //       [tileX1, tileY2],
   //       [tileX2, tileY2]
   //    ];

   //    // Find point of tile in collision
   //    let tileVertexX!: number;
   //    let tileVertexY!: number;
   //    for (const pair of pairs2) {
   //       const tilePosX = hitbox.x;
   //       const tilePosY = hitbox.y;
   //       if (pointIsInRectangle(pair[0], pair[1], tilePosX, tilePosY, hitbox.width, hitbox.height, this.rotation + hitbox.relativeRotation)) {
   //          tileVertexX = pair[0];
   //          tileVertexY = pair[1];
   //          break;
   //       }
   //    }
   //    if (typeof tileVertexX === "undefined") {
   //       // @Temporary
   //       // console.warn("Couldn't find vertex");
   //       return;
   //    }

   //    // @Speed: Garbage collection
   //    const distance = distToSegment(new Point(tileVertexX, tileVertexY), collidingVertex1, collidingVertex2);

   //    const pushDirection = collidingVertex1.calculateAngleBetween(collidingVertex2) + Math.PI / 2;

   //    console.log(distance);
   //    this.position.x += distance * Math.sin(pushDirection);
   //    this.position.y += distance * Math.cos(pushDirection);
   // }

   public resolveWallTileCollisions(): void {
      // Looser check that there are any wall tiles in any of the entities' chunks
      let hasWallTiles = false;
      for (let i = 0; i < this.chunks.length; i++) {
         const chunk = this.chunks[i];
         if (chunk.hasWallTiles) {
            hasWallTiles = true;
         }
      }
      if (!hasWallTiles) {
         return;
      }
      
      for (let i = 0; i < this.hitboxes.length; i++) {
         const hitbox = this.hitboxes[i];

         const boundsMinX = hitbox.calculateHitboxBoundsMinX();
         const boundsMaxX = hitbox.calculateHitboxBoundsMaxX();
         const boundsMinY = hitbox.calculateHitboxBoundsMinY();
         const boundsMaxY = hitbox.calculateHitboxBoundsMaxY();

         const minTileX = clampToBoardDimensions(Math.floor(boundsMinX / Settings.TILE_SIZE));
         const maxTileX = clampToBoardDimensions(Math.floor(boundsMaxX / Settings.TILE_SIZE));
         const minTileY = clampToBoardDimensions(Math.floor(boundsMinY / Settings.TILE_SIZE));
         const maxTileY = clampToBoardDimensions(Math.floor(boundsMaxY / Settings.TILE_SIZE));

         // @Cleanup: Combine the check and resolve functions into one

         // @Cleanup: bad, and a slow check
         if (hitbox.hasOwnProperty("radius")) {
            for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
               for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
                  const tile = Board.getTile(tileX, tileY);
                  if (tile.isWall) {
                     const physicsComponent = PhysicsComponentArray.getComponent(this.id);
                     const collisionAxis = this.checkForCircularTileCollision(tile, hitbox as CircularHitbox);
                     switch (collisionAxis) {
                        case TileCollisionAxis.x: {
                           this.resolveXAxisCircularTileCollision(tile, hitbox as CircularHitbox);
                           break;
                        }
                        case TileCollisionAxis.y: {
                           this.resolveYAxisCircularTileCollision(tile, hitbox as CircularHitbox);
                           break;
                        }
                        case TileCollisionAxis.diagonal: {
                           this.resolveDiagonalCircularTileCollision(tile, hitbox as CircularHitbox);
                           break;
                        }
                     }
                     physicsComponent.positionIsDirty = true;
                  }
               }
            }
         } else {
            for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
               for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
                  const tile = Board.getTile(tileX, tileY);
                  if (tile.isWall) {
                     const physicsComponent = PhysicsComponentArray.getComponent(this.id);
                     const collisionAxis = this.checkForRectangularTileCollision(tile, hitbox as RectangularHitbox);
                     switch (collisionAxis) {
                        case TileCollisionAxis.x: {
                           this.resolveXAxisRectangularTileCollision(tile, hitbox as RectangularHitbox);
                           break;
                        }
                        case TileCollisionAxis.y: {
                           this.resolveYAxisRectangularTileCollision(tile, hitbox as RectangularHitbox);
                           break;
                        }
                        case TileCollisionAxis.diagonal: {
                           // @Incomplete
                           // this.resolveDiagonalRectangularTileCollision(tile, hitbox as RectangularHitbox);
                           break;
                        }
                     }
                     physicsComponent.positionIsDirty = true;
                  }
               }
            }
         }
      }
   }
   
   public resolveBorderCollisions(): void {
      // Left border
      if (this.boundingAreaMinX < 0) {
         const physicsComponent = PhysicsComponentArray.getComponent(this.id);
         this.position.x -= this.boundingAreaMinX;
         physicsComponent.velocity.x = 0;
         physicsComponent.positionIsDirty = true;
         // Right border
      } else if (this.boundingAreaMaxX > Settings.BOARD_UNITS) {
         const physicsComponent = PhysicsComponentArray.getComponent(this.id);
         this.position.x -= this.boundingAreaMaxX - Settings.BOARD_UNITS;
         physicsComponent.velocity.x = 0;
         physicsComponent.positionIsDirty = true;
      }

      // Bottom border
      if (this.boundingAreaMinY < 0) {
         const physicsComponent = PhysicsComponentArray.getComponent(this.id);
         this.position.y -= this.boundingAreaMinY;
         physicsComponent.velocity.y = 0;
         physicsComponent.positionIsDirty = true;
         // Top border
      } else if (this.boundingAreaMaxY > Settings.BOARD_UNITS) {
         const physicsComponent = PhysicsComponentArray.getComponent(this.id);
         this.position.y -= this.boundingAreaMaxY - Settings.BOARD_UNITS;
         physicsComponent.velocity.y = 0;
         physicsComponent.positionIsDirty = true;
      }

      // @Temporary
      if (this.position.x < 0 || this.position.x >= Settings.BOARD_UNITS || this.position.y < 0 || this.position.y >= Settings.BOARD_UNITS) {
         console.log(this);
         throw new Error("Unable to properly resolve border collisions.");
      }
   }

   public destroy(): void {
      // @Temporary
      if (!Board.entityRecord.hasOwnProperty(this.id)) {
         throw new Error("Tried to remove an entity before it was added to the board.");
      }
      
      // Don't try to remove if already being removed
      if (Board.entityIsFlaggedForDestruction(this)) {
         return;
      }

      Board.addEntityToRemoveBuffer(this);
      Board.removeEntityFromJoinBuffer(this);

      // @Cleanup: do these functions actually need to be called here? why not in the proper remove flagged function?
      switch (this.type) {
         case EntityType.cow: onCowDeath(this); break;
         case EntityType.tree: onTreeDeath(this); break;
         case EntityType.krumblid: onKrumblidDeath(this); break;
         case EntityType.iceSpikes: onIceSpikesDeath(this); break;
         case EntityType.cactus: onCactusDeath(this); break;
         case EntityType.tribeWorker: onTribeWorkerDeath(this); break;
         case EntityType.tribeWarrior: onTribeWarriorDeath(this); break;
         case EntityType.yeti: onYetiDeath(this); break;
         case EntityType.fish: onFishDeath(this); break;
         case EntityType.player: onPlayerDeath(this); break;
         case EntityType.slimeSpit: onSlimeSpitDeath(this); break;
      }
   }

   public getDebugData(): EntityDebugData {
      return {
         entityID: this.id,
         lines: [],
         circles: [],
         tileHighlights: [],
         debugEntries: []
      };
   }
}

export default Entity;
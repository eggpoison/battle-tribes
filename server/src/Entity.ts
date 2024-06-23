import { Point, clampToBoardDimensions, randFloat, randInt, rotateXAroundOrigin, rotateYAroundOrigin } from "webgl-test-shared/dist/utils";
import { EntityType, EntityTypeString } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { EntityDebugData, PathfindingNodeIndex, RIVER_STEPPING_STONE_SIZES } from "webgl-test-shared/dist/client-server-types";
import { TileType } from "webgl-test-shared/dist/tiles";
import Tile from "./Tile";
import Chunk from "./Chunk";
import Board from "./Board";
import { onCowDeath } from "./entities/mobs/cow";
import { onTreeDeath } from "./entities/resources/tree";
import { onIceSpikesDeath } from "./entities/resources/ice-spikes";
import { onKrumblidDeath } from "./entities/mobs/krumblid";
import { onTribeWorkerDeath } from "./entities/tribes/tribe-worker";
import { onYetiDeath } from "./entities/mobs/yeti";
import { onFishDeath } from "./entities/mobs/fish";
import { onTribeWarriorDeath } from "./entities/tribes/tribe-warrior";
import { onSlimeSpitDeath } from "./entities/projectiles/slime-spit";
import { AIHelperComponentArray } from "./components/AIHelperComponent";
import { PhysicsComponentArray } from "./components/PhysicsComponent";
import { onCactusDeath } from "./entities/resources/cactus";
import { resolveEntityTileCollision } from "./collision";
import { STRUCTURE_TYPES, StructureType } from "webgl-test-shared/dist/structures";
import { EntityEvent } from "webgl-test-shared/dist/entity-events";
import { Hitbox, updateHitbox, hitboxIsCircular } from "webgl-test-shared/dist/hitboxes/hitboxes";

let idCounter = 1;

/** Finds a unique available ID for an entity */
const findAvailableEntityID = (): number => {
   return idCounter++;
}

/** A generic class for any object in the world */
class Entity<T extends EntityType = EntityType> {
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
   public isInRiver!: boolean;

   /** All hitboxes attached to the entity */
   public hitboxes = new Array<Hitbox>();
   public hitboxLocalIDs = new Array<number>();
   
   public boundingAreaMinX = Number.MAX_SAFE_INTEGER;
   public boundingAreaMaxX = Number.MIN_SAFE_INTEGER;
   public boundingAreaMinY = Number.MAX_SAFE_INTEGER;
   public boundingAreaMaxY = Number.MIN_SAFE_INTEGER;

   public readonly collisionBit: number;
   public collisionMask: number;

   public occupiedPathfindingNodes = new Set<PathfindingNodeIndex>();

   private nextHitboxLocalID = 1;

   public tickEvents = new Array<EntityEvent>();

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

   public addHitbox(hitbox: Hitbox): void {
      updateHitbox(hitbox, this.position.x, this.position.y, this.rotation);

      const localID = this.nextHitboxLocalID++;
      this.hitboxLocalIDs.push(localID);
      
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

         const previousBoundsMinX = hitbox.calculateHitboxBoundsMinX();
         const previousBoundsMaxX = hitbox.calculateHitboxBoundsMaxX();
         const previousBoundsMinY = hitbox.calculateHitboxBoundsMinY();
         const previousBoundsMaxY = hitbox.calculateHitboxBoundsMaxY();

         updateHitbox(hitbox, this.position.x, this.position.y, this.rotation);

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
            if (Math.floor(boundsMinX / Settings.CHUNK_UNITS) !== Math.floor(previousBoundsMinX / Settings.CHUNK_UNITS) ||
                Math.floor(boundsMaxX / Settings.CHUNK_UNITS) !== Math.floor(previousBoundsMaxX / Settings.CHUNK_UNITS) ||
                Math.floor(boundsMinY / Settings.CHUNK_UNITS) !== Math.floor(previousBoundsMinY / Settings.CHUNK_UNITS) ||
                Math.floor(boundsMaxY / Settings.CHUNK_UNITS) !== Math.floor(previousBoundsMaxY / Settings.CHUNK_UNITS)) {
               hitboxChunkBoundsHaveChanged = true;
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

         const previousBoundsMinX = hitbox.calculateHitboxBoundsMinX();
         const previousBoundsMaxX = hitbox.calculateHitboxBoundsMaxX();
         const previousBoundsMinY = hitbox.calculateHitboxBoundsMinY();
         const previousBoundsMaxY = hitbox.calculateHitboxBoundsMaxY();

         updateHitbox(hitbox, this.position.x, this.position.y, this.rotation);

         const boundsMinX = hitbox.calculateHitboxBoundsMinX();
         const boundsMaxX = hitbox.calculateHitboxBoundsMaxX();
         const boundsMinY = hitbox.calculateHitboxBoundsMinY();
         const boundsMaxY = hitbox.calculateHitboxBoundsMaxY();

         // Check if the hitboxes' chunk bounds have changed
         if (!hitboxChunkBoundsHaveChanged) {
            if (Math.floor(boundsMinX / Settings.CHUNK_UNITS) !== Math.floor(previousBoundsMinX / Settings.CHUNK_UNITS) ||
                Math.floor(boundsMaxX / Settings.CHUNK_UNITS) !== Math.floor(previousBoundsMaxX / Settings.CHUNK_UNITS) ||
                Math.floor(boundsMinY / Settings.CHUNK_UNITS) !== Math.floor(previousBoundsMinY / Settings.CHUNK_UNITS) ||
                Math.floor(boundsMaxY / Settings.CHUNK_UNITS) !== Math.floor(previousBoundsMaxY / Settings.CHUNK_UNITS)) {
               hitboxChunkBoundsHaveChanged = true;
            }
         }
      }

      if (hitboxChunkBoundsHaveChanged) {
         this.updateContainingChunks();
      }
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

         for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
            for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
               const tile = Board.getTile(tileX, tileY);
               if (tile.isWall) {
                  resolveEntityTileCollision(this, hitbox, tileX, tileY);
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
         throw new Error("Unable to properly resolve border collisions for " + EntityTypeString[this.type] + ".");
      }
   }

   public destroy(): void {
      // @Temporary
      if (typeof Board.entityRecord[this.id] === "undefined") {
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

export function entityIsStructure(entity: Entity): entity is Entity<StructureType> {
   return STRUCTURE_TYPES.indexOf(entity.type as StructureType) !== -1;
}

export function getRandomPositionInEntity(entity: Entity): Point {
   const hitbox = entity.hitboxes[randInt(0, entity.hitboxes.length - 1)];

   if (hitboxIsCircular(hitbox)) {
      return hitbox.position.offset(hitbox.radius * Math.random(), 2 * Math.PI * Math.random());
   } else {
      const halfWidth = hitbox.width / 2;
      const halfHeight = hitbox.height / 2;
      
      const xOffset = randFloat(-halfWidth, halfWidth);
      const yOffset = randFloat(-halfHeight, halfHeight);

      const x = entity.position.x + rotateXAroundOrigin(xOffset, yOffset, entity.rotation + hitbox.rotation);
      const y = entity.position.y + rotateYAroundOrigin(xOffset, yOffset, entity.rotation + hitbox.rotation);
      return new Point(x, y);
   }
}
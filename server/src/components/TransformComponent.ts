import { PathfindingNodeIndex, RIVER_STEPPING_STONE_SIZES } from "battletribes-shared/client-server-types";
import { Settings } from "battletribes-shared/settings";
import { clampToBoardDimensions, Point, TileIndex } from "battletribes-shared/utils";
import { getTileIndexIncludingEdges } from "../Layer";
import Chunk, { entityIsCollisionRelevant } from "../Chunk";
import { EntityID, EntityTypeString } from "battletribes-shared/entities";
import { ComponentArray } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";
import { AIHelperComponentArray, entityIsNoticedByAI } from "./AIHelperComponent";
import { TileType } from "battletribes-shared/tiles";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { clearEntityPathfindingNodes, entityCanBlockPathfinding, updateEntityPathfindingNodeOccupance } from "../pathfinding";
import { resolveEntityTileCollision } from "../collision";
import { Packet } from "battletribes-shared/packets";
import { boxIsCircular, Hitbox, updateBox } from "battletribes-shared/boxes/boxes";
import { getEntityAgeTicks, getEntityLayer, getEntityType } from "../world";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "../../../shared/src/collision";

// @Cleanup: move mass/hitbox related stuff out? (Are there any entities which would make use of that?)

export class TransformComponent {
   /** Combined mass of all the entity's hitboxes */
   public totalMass = 0;

   /** Position of the entity in the world */
   public position = new Point(0, 0);

   /** Direction the entity is facing in radians */
   public rotation = 0;

   // @Cleanup: unused?
   public collisionPushForceMultiplier = 1;

   /** Set of all chunks the entity is contained in */
   public chunks = new Array<Chunk>();

   public isInRiver = false;

   /** All hitboxes attached to the entity */
   public hitboxes = new Array<Hitbox>();
   public hitboxLocalIDs = new Array<number>();
   
   public boundingAreaMinX = Number.MAX_SAFE_INTEGER;
   public boundingAreaMaxX = Number.MIN_SAFE_INTEGER;
   public boundingAreaMinY = Number.MAX_SAFE_INTEGER;
   public boundingAreaMaxY = Number.MIN_SAFE_INTEGER;

   public collisionBit = COLLISION_BITS.default;
   public collisionMask = DEFAULT_COLLISION_MASK;

   public occupiedPathfindingNodes = new Set<PathfindingNodeIndex>();

   public nextHitboxLocalID = 1;

   constructor() {
      
   }

   public updateIsInRiver(entity: EntityID): void {
      const tileIndex = getEntityTile(this);
      const layer = getEntityLayer(entity);
      
      const tileType = layer.tileTypes[tileIndex];
      if (tileType !== TileType.water) {
         this.isInRiver = false;
         return;
      }

      if (PhysicsComponentArray.hasComponent(entity)) {
         const physicsComponent = PhysicsComponentArray.getComponent(entity);
         if (!physicsComponent.isAffectedByGroundFriction) {
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

   // @Cleanup: is there a way to avoid having this be optionally null? Or having the entity parameter here entirely?
   // Note: entity is null if the hitbox hasn't been created yet
   public addHitbox(hitbox: Hitbox, entity: EntityID | null): void {
      const box = hitbox.box;
      
      updateBox(box, this.position.x, this.position.y, this.rotation);
   
      const localID = this.nextHitboxLocalID++;
      this.hitboxLocalIDs.push(localID);
      
      this.hitboxes.push(hitbox);
      this.totalMass += hitbox.mass;
   
      const boundsMinX = box.calculateBoundsMinX();
      const boundsMaxX = box.calculateBoundsMaxX();
      const boundsMinY = box.calculateBoundsMinY();
      const boundsMaxY = box.calculateBoundsMaxY();
   
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
         this.cleanHitboxes(entity);
      }
   }

   public addHitboxes(hitboxes: ReadonlyArray<Hitbox>, entity: EntityID | null): void {
      for (let i = 0; i < hitboxes.length; i++) {
         const hitbox = hitboxes[i];
         this.addHitbox(hitbox, entity);
      }
   }

   /** Recalculates the game objects' bounding area, hitbox positions and bounds, and the hasPotentialWallTileCollisions flag */
   public cleanHitboxes(entity: EntityID | null): void {
      this.boundingAreaMinX = Number.MAX_SAFE_INTEGER;
      this.boundingAreaMaxX = Number.MIN_SAFE_INTEGER;
      this.boundingAreaMinY = Number.MAX_SAFE_INTEGER;
      this.boundingAreaMaxY = Number.MIN_SAFE_INTEGER;

      // An object only changes their chunks if a hitboxes' bounds change chunks.
      let hitboxChunkBoundsHaveChanged = false;
      const numHitboxes = this.hitboxes.length;
      for (let i = 0; i < numHitboxes; i++) {
         const hitbox = this.hitboxes[i];
         const box = hitbox.box;

         const previousBoundsMinX = box.calculateBoundsMinX();
         const previousBoundsMaxX = box.calculateBoundsMaxX();
         const previousBoundsMinY = box.calculateBoundsMinY();
         const previousBoundsMaxY = box.calculateBoundsMaxY();

         updateBox(box, this.position.x, this.position.y, this.rotation);

         const boundsMinX = box.calculateBoundsMinX();
         const boundsMaxX = box.calculateBoundsMaxX();
         const boundsMinY = box.calculateBoundsMinY();
         const boundsMaxY = box.calculateBoundsMaxY();

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

      if (entity !== null && hitboxChunkBoundsHaveChanged) {
         this.updateContainingChunks(entity);
      }
   }

   public updateContainingChunks(entity: EntityID): void {
      const layer = getEntityLayer(entity);
      
      // Calculate containing chunks
      const containingChunks = new Array<Chunk>();
      for (let i = 0; i < this.hitboxes.length; i++) {
         const hitbox = this.hitboxes[i];
         const box = hitbox.box;
   
         const boundsMinX = box.calculateBoundsMinX();
         const boundsMaxX = box.calculateBoundsMaxX();
         const boundsMinY = box.calculateBoundsMinY();
         const boundsMaxY = box.calculateBoundsMaxY();
   
         const minChunkX = Math.max(Math.min(Math.floor(boundsMinX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         const maxChunkX = Math.max(Math.min(Math.floor(boundsMaxX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         const minChunkY = Math.max(Math.min(Math.floor(boundsMinY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         const maxChunkY = Math.max(Math.min(Math.floor(boundsMaxY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   
         for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
            for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
               const chunk = layer.getChunk(chunkX, chunkY);
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
            this.addToChunk(entity, chunk);
            this.chunks.push(chunk);
         }
      }
   
      // Find all chunks which aren't present in the new chunks and remove them
      for (let i = 0; i < this.chunks.length; i++) {
         const chunk = this.chunks[i]
         if (containingChunks.indexOf(chunk) === -1) {
            this.removeFromChunk(entity, chunk);
            this.chunks.splice(i, 1);
            i--;
         }
      }
   }

   public addToChunk(entity: EntityID, chunk: Chunk): void {
      chunk.entities.push(entity);
      if (entityIsCollisionRelevant(entity)) {
         chunk.collisionRelevantEntities.push(entity);
         if (PhysicsComponentArray.hasComponent(entity)) {
            chunk.collisionRelevantPhysicsEntities.push(entity);
         }
      }
   
      const numViewingMobs = chunk.viewingEntities.length;
      for (let i = 0; i < numViewingMobs; i++) {
         const viewingEntity = chunk.viewingEntities[i];
         const aiHelperComponent = AIHelperComponentArray.getComponent(viewingEntity);
   
         if (entityIsNoticedByAI(aiHelperComponent, entity)) {
            const idx = aiHelperComponent.potentialVisibleEntities.indexOf(entity);
            if (idx === -1 && viewingEntity !== entity) {
               aiHelperComponent.potentialVisibleEntities.push(entity);
               aiHelperComponent.potentialVisibleEntityAppearances.push(1);
            } else {
               aiHelperComponent.potentialVisibleEntityAppearances[idx]++;
            }
         }
      }
   }
   
   public removeFromChunk(entity: EntityID, chunk: Chunk): void {
      let idx = chunk.entities.indexOf(entity);
      if (idx !== -1) {
         chunk.entities.splice(idx, 1);
      }
      idx = chunk.collisionRelevantEntities.indexOf(entity);
      if (idx !== -1) {
         chunk.collisionRelevantEntities.splice(idx, 1);
      }
      idx = chunk.collisionRelevantPhysicsEntities.indexOf(entity);
      if (idx !== -1) {
         chunk.collisionRelevantPhysicsEntities.splice(idx, 1);
      }
   
      // @Incomplete
      // Remove the entity from the potential visible entities of all entities viewing the chunk
      const numViewingMobs = chunk.viewingEntities.length;
      for (let i = 0; i < numViewingMobs; i++) {
         const viewingEntity = chunk.viewingEntities[i];
         if (viewingEntity === entity) {
            continue;
         }
   
         const aiHelperComponent = AIHelperComponentArray.getComponent(viewingEntity);
   
         const idx = aiHelperComponent.potentialVisibleEntities.indexOf(entity);
         // We do this check as decorative entities are sometimes not in the potential visible entities array
         if (idx !== -1) {
            aiHelperComponent.potentialVisibleEntityAppearances[idx]--;
            if (aiHelperComponent.potentialVisibleEntityAppearances[idx] === 0) {
               aiHelperComponent.potentialVisibleEntities.splice(idx, 1);
               aiHelperComponent.potentialVisibleEntityAppearances.splice(idx, 1);
      
               const idx2 = aiHelperComponent.visibleEntities.indexOf(entity);
               if (idx2 !== -1) {
                  aiHelperComponent.visibleEntities.splice(idx2, 1);
               }
            }
         }
      }
   }

   public resolveWallTileCollisions(entity: EntityID): void {
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
      
      const layer = getEntityLayer(entity);
      
      for (let i = 0; i < this.hitboxes.length; i++) {
         const hitbox = this.hitboxes[i];
         const box = hitbox.box;

         const boundsMinX = box.calculateBoundsMinX();
         const boundsMaxX = box.calculateBoundsMaxX();
         const boundsMinY = box.calculateBoundsMinY();
         const boundsMaxY = box.calculateBoundsMaxY();

         const minTileX = clampToBoardDimensions(Math.floor(boundsMinX / Settings.TILE_SIZE));
         const maxTileX = clampToBoardDimensions(Math.floor(boundsMaxX / Settings.TILE_SIZE));
         const minTileY = clampToBoardDimensions(Math.floor(boundsMinY / Settings.TILE_SIZE));
         const maxTileY = clampToBoardDimensions(Math.floor(boundsMaxY / Settings.TILE_SIZE));

         for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
            for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
               const isWall = layer.tileXYIsWall(tileX, tileY);
               if (isWall) {
                  resolveEntityTileCollision(entity, hitbox, tileX, tileY);
               }
            }
         }
      }
   }
   
   public resolveBorderCollisions(entity: EntityID): void {
      // Left border
      if (this.boundingAreaMinX < 0) {
         const physicsComponent = PhysicsComponentArray.getComponent(entity);
         this.position.x -= this.boundingAreaMinX;
         physicsComponent.selfVelocity.x = 0;
         physicsComponent.externalVelocity.x = 0;
         physicsComponent.positionIsDirty = true;
         // Right border
      } else if (this.boundingAreaMaxX > Settings.BOARD_UNITS) {
         const physicsComponent = PhysicsComponentArray.getComponent(entity);
         this.position.x -= this.boundingAreaMaxX - Settings.BOARD_UNITS;
         physicsComponent.selfVelocity.x = 0;
         physicsComponent.externalVelocity.x = 0;
         physicsComponent.positionIsDirty = true;
      }

      // Bottom border
      if (this.boundingAreaMinY < 0) {
         const physicsComponent = PhysicsComponentArray.getComponent(entity);
         this.position.y -= this.boundingAreaMinY;
         physicsComponent.selfVelocity.y = 0;
         physicsComponent.externalVelocity.y = 0;
         physicsComponent.positionIsDirty = true;
         // Top border
      } else if (this.boundingAreaMaxY > Settings.BOARD_UNITS) {
         const physicsComponent = PhysicsComponentArray.getComponent(entity);
         this.position.y -= this.boundingAreaMaxY - Settings.BOARD_UNITS;
         physicsComponent.selfVelocity.y = 0;
         physicsComponent.externalVelocity.y = 0;
         physicsComponent.positionIsDirty = true;
      }

      // @Temporary
      if (this.position.x < 0 || this.position.x >= Settings.BOARD_UNITS || this.position.y < 0 || this.position.y >= Settings.BOARD_UNITS) {
         console.log(this);
         throw new Error("Unable to properly resolve border collisions for " + EntityTypeString[getEntityType(entity)!] + ".");
      }
   }
}

export const TransformComponentArray = new ComponentArray<TransformComponent>(ServerComponentType.transform, true, {
   onJoin: onJoin,
   onRemove: onRemove,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

export function getEntityTile(transformComponent: TransformComponent): TileIndex {
   const tileX = Math.floor(transformComponent.position.x / Settings.TILE_SIZE);
   const tileY = Math.floor(transformComponent.position.y / Settings.TILE_SIZE);
   return getTileIndexIncludingEdges(tileX, tileY);
}

function onJoin(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   transformComponent.updateIsInRiver(entity);
   
   // Add to chunks
   transformComponent.updateContainingChunks(entity);

   // @Cleanup: should we make a separate PathfindingOccupancyComponent?
   if (entityCanBlockPathfinding(entity)) {
      updateEntityPathfindingNodeOccupance(entity);
   }
}

function onRemove(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   // Remove from chunks
   for (let i = 0; i < transformComponent.chunks.length; i++) {
      const chunk = transformComponent.chunks[i];
      transformComponent.removeFromChunk(entity, chunk);
   }

   // @Cleanup: Same as above. should we make a separate PathfindingOccupancyComponent?
   if (entityCanBlockPathfinding(entity)) {
      clearEntityPathfindingNodes(entity);
   }
}

function getDataLength(entity: EntityID): number {
   const transformComponent = TransformComponentArray.getComponent(entity);

   let lengthBytes = 9 * Float32Array.BYTES_PER_ELEMENT;
   
   for (const hitbox of transformComponent.hitboxes) {
      if (boxIsCircular(hitbox.box)) {
         lengthBytes += 10 * Float32Array.BYTES_PER_ELEMENT;
      } else {
         lengthBytes += 12 * Float32Array.BYTES_PER_ELEMENT;
      }
      lengthBytes += hitbox.flags.length * Float32Array.BYTES_PER_ELEMENT;
   }

   return lengthBytes;
}

// @Speed
function addDataToPacket(packet: Packet, entity: EntityID): void {
   // @Speed: can be made faster if we pre-filter which hitboxes are circular and rectangular

   const transformComponent = TransformComponentArray.getComponent(entity);

   packet.addNumber(transformComponent.position.x);
   packet.addNumber(transformComponent.position.y);
   packet.addNumber(transformComponent.rotation);
   // @Hack
   packet.addNumber(getEntityAgeTicks(entity));
   packet.addNumber(transformComponent.collisionBit);
   packet.addNumber(transformComponent.collisionMask);
   
   // @Speed
   let numCircularHitboxes = 0;
   for (const hitbox of transformComponent.hitboxes) {
      if (boxIsCircular(hitbox.box)) {
         numCircularHitboxes++;
      }
   }
   const numRectangularHitboxes = transformComponent.hitboxes.length - numCircularHitboxes;
   
   // Circular
   packet.addNumber(numCircularHitboxes);
   for (const hitbox of transformComponent.hitboxes) {
      const box = hitbox.box;
      // @Speed
      if (!boxIsCircular(box)) {
         continue;
      }

      const localID = transformComponent.hitboxLocalIDs[transformComponent.hitboxes.indexOf(hitbox)];
      
      packet.addNumber(hitbox.mass);
      packet.addNumber(box.offset.x);
      packet.addNumber(box.offset.y);
      packet.addNumber(box.scale);
      packet.addNumber(hitbox.collisionType);
      packet.addNumber(hitbox.collisionBit);
      packet.addNumber(hitbox.collisionMask);
      packet.addNumber(localID);
      // Flags
      packet.addNumber(hitbox.flags.length);
      for (const flag of hitbox.flags) {
         packet.addNumber(flag);
      }
      packet.addNumber(box.radius);
   }
   
   // Rectangular
   packet.addNumber(numRectangularHitboxes);
   for (const hitbox of transformComponent.hitboxes) {
      const box = hitbox.box;
      // @Speed
      if (boxIsCircular(box)) {
         continue;
      }

      const localID = transformComponent.hitboxLocalIDs[transformComponent.hitboxes.indexOf(hitbox)];

      packet.addNumber(hitbox.mass);
      packet.addNumber(box.offset.x);
      packet.addNumber(box.offset.y);
      packet.addNumber(box.scale);
      packet.addNumber(hitbox.collisionType);
      packet.addNumber(hitbox.collisionBit);
      packet.addNumber(hitbox.collisionMask);
      packet.addNumber(localID);
      // Flags
      packet.addNumber(hitbox.flags.length);
      for (const flag of hitbox.flags) {
         packet.addNumber(flag);
      }
      packet.addNumber(box.width);
      packet.addNumber(box.height);
      packet.addNumber(box.relativeRotation);
   }
}
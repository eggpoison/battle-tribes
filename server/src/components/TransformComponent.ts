import { CircularHitboxData, PathfindingNodeIndex, RectangularHitboxData } from "webgl-test-shared/dist/client-server-types";
import { CircularHitbox, Hitbox, RectangularHitbox, hitboxIsCircular, updateHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { Settings } from "webgl-test-shared/dist/settings";
import { Point } from "webgl-test-shared/dist/utils";
import Board from "../Board";
import Chunk from "../Chunk";
import Tile from "../Tile";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { ComponentArray } from "./ComponentArray";
import { ServerComponentType, TransformComponentData } from "webgl-test-shared/dist/components";
import { AIHelperComponentArray } from "./AIHelperComponent";

// @Cleanup: move mass/hitbox related stuff out? (Are there any entities which would make use of that?)

export interface TransformComponentParams {
   readonly position: Point;
   rotation: number;
   readonly type: EntityType;
   readonly collisionBit: number;
   readonly collisionMask: number;
   // @Cleanup: should this instead be hitbox info?
   hitboxes: ReadonlyArray<Hitbox>;
}

export class TransformComponent {
   /** Combined mass of all the entity's hitboxes */
   public totalMass = Number.EPSILON;

   // @Cleanup: should this be here? (Do all entities need this property regardless)
   public ageTicks = 0;

   /** Position of the entity in the world */
   public position: Point;

   // @Cleanup @Memory: Do we really need this??
   /** Last position when the entities' hitboxes were clean */
   public lastCleanedPosition: Point;

   /** Direction the entity is facing in radians */
   public rotation: number;

   // @Cleanup: unused?
   public collisionPushForceMultiplier = 1;

   /** Set of all chunks the entity is contained in */
   public chunks = new Array<Chunk>();

   /** The tile the entity is currently standing on. */
   public tile: Tile;
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

   public nextHitboxLocalID = 1;
   
   constructor(params: TransformComponentParams) {
      this.position = params.position;
      this.rotation = params.rotation;
      this.lastCleanedPosition = new Point(params.position.x, params.position.y);
      this.collisionBit = params.collisionBit;
      this.collisionMask = params.collisionMask;

      for (let i = 0; i < params.hitboxes.length; i++) {
         const hitbox = params.hitboxes[i];
         this.addHitbox(hitbox);
      }

      // Clamp the game object's position to within the world
      if (this.position.x < 0) this.position.x = 0;
      if (this.position.x >= Settings.BOARD_UNITS) this.position.x = Settings.BOARD_UNITS - 1;
      if (this.position.y < 0) this.position.y = 0;
      if (this.position.y >= Settings.BOARD_UNITS) this.position.y = Settings.BOARD_UNITS - 1;

      this.tile = getTile(this);
      this.strictCheckIsInRiver();

      // @Hack @Incomplete
      Board.addEntityToJoinBuffer(this, type);
   }

   // @Cleanup: privatise?
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
}

export const TransformComponentArray = new ComponentArray<ServerComponentType.transform, TransformComponent>(true, {
   serialise: serialise
});

const getTile = (transformComponent: TransformComponent): Tile => {
   const tileX = Math.floor(transformComponent.position.x / Settings.TILE_SIZE);
   const tileY = Math.floor(transformComponent.position.y / Settings.TILE_SIZE);
   return Board.getTile(tileX, tileY);
}

function onJoin(entityID: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entityID);

   updateContainingChunks(transformComponent);

   // @Cleanup: should we make a separate PathfindingOccupancyComponent?
   const entityType = Board.entityTypes[entityID]!;
   if (entityCanBlockPathfinding(entityType)) {
      updateEntityPathfindingNodeOccupance(entity);
   }
}

const addToChunk = (transformComponent: TransformComponent, chunk: Chunk): void => {
   chunk.entities.push(this);

   const numViewingMobs = chunk.viewingEntities.length;
   for (let i = 0; i < numViewingMobs; i++) {
      const viewingEntity = chunk.viewingEntities[i];
      const aiHelperComponent = AIHelperComponentArray.getComponent(viewingEntity);

      const idx = aiHelperComponent.potentialVisibleEntities.indexOf(this);
      if (idx === -1 && viewingEntity !== this.id) {
         aiHelperComponent.potentialVisibleEntities.push(this);
         aiHelperComponent.potentialVisibleEntityAppearances.push(1);
      } else {
         aiHelperComponent.potentialVisibleEntityAppearances[idx]++;
      }
   }
}

const removeFromChunk = (transformComponent: TransformComponent, chunk: Chunk): void => {
   const idx = chunk.entities.indexOf(this);
   if (idx !== -1) {
      chunk.entities.splice(idx, 1);
   }

   // @Incomplete
   // Remove the entity from the potential visible entities of all entities viewing the chunk
   const numViewingMobs = chunk.viewingEntities.length;
   for (let i = 0; i < numViewingMobs; i++) {
      const viewingEntity = chunk.viewingEntities[i];
      if (viewingEntity === this.id) {
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

const bundleRectangularHitboxData = (hitbox: RectangularHitbox, localID: number): RectangularHitboxData => {
   return {
      mass: hitbox.mass,
      offsetX: hitbox.offset.x,
      offsetY: hitbox.offset.y,
      collisionType: hitbox.collisionType,
      collisionBit: hitbox.collisionBit,
      collisionMask: hitbox.collisionMask,
      localID: localID,
      flags: hitbox.flags,
      width: hitbox.width,
      height: hitbox.height,
      rotation: hitbox.relativeRotation
   };
}

const bundleCircularHitboxData = (hitbox: CircularHitbox, localID: number): CircularHitboxData => {
   return {
      mass: hitbox.mass,
      offsetX: hitbox.offset.x,
      offsetY: hitbox.offset.y,
      collisionType: hitbox.collisionType,
      collisionBit: hitbox.collisionBit,
      collisionMask: hitbox.collisionMask,
      localID: localID,
      flags: hitbox.flags,
      radius: hitbox.radius
   };
}

function serialise(entityID: EntityID): TransformComponentData {
   const transformComponent = TransformComponentArray.getComponent(entityID);
   
   const circularHitboxes = new Array<CircularHitboxData>();
   const rectangularHitboxes = new Array<RectangularHitboxData>();

   for (let i = 0; i < transformComponent.hitboxes.length; i++) {
      const hitbox = transformComponent.hitboxes[i];
      const localID = transformComponent.hitboxLocalIDs[i];
      
      if (hitboxIsCircular(hitbox)) {
         circularHitboxes.push(bundleCircularHitboxData(hitbox, localID));
      } else {
         rectangularHitboxes.push(bundleRectangularHitboxData(hitbox, localID));
      }
   }

   return {
      componentType: ServerComponentType.transform,
      position: transformComponent.position.package(),
      rotation: transformComponent.rotation,
      circularHitboxes: circularHitboxes,
      rectangularHitboxes: rectangularHitboxes,
      ageTicks: transformComponent.ageTicks,
      collisionBit: transformComponent.collisionBit,
      collisionMask: transformComponent.collisionMask,
   };
}
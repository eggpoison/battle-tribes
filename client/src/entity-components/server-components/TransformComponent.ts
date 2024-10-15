import ServerComponent from "../ServerComponent";
import Entity from "../../Entity";
import { distance, Point, rotateXAroundOrigin, rotateYAroundOrigin } from "battletribes-shared/utils";
import { Tile } from "../../Tile";
import { Settings } from "battletribes-shared/settings";
import { TileType } from "battletribes-shared/tiles";
import { RIVER_STEPPING_STONE_SIZES } from "battletribes-shared/client-server-types";
import Chunk from "../../Chunk";
import { randInt } from "battletribes-shared/utils";
import { randFloat } from "battletribes-shared/utils";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { boxIsCircular, hitboxIsCircular, updateBox, HitboxFlag } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import Layer, { getTileIndexIncludingEdges } from "../../Layer";
import { getEntityLayer, getEntityRenderInfo } from "../../world";
import { ClientHitbox } from "../../boxes";
import Board from "../../Board";
import { EntityID } from "../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";
import Player from "../../entities/Player";

export function getEntityTile(layer: Layer, transformComponent: TransformComponent): Tile {
   const tileX = Math.floor(transformComponent.position.x / Settings.TILE_SIZE);
   const tileY = Math.floor(transformComponent.position.y / Settings.TILE_SIZE);
   
   const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
   return layer.getTile(tileIndex);
}

// @Memory: grass strands don't need a lot of this
class TransformComponent extends ServerComponent {
   public totalMass = 0;
   
   public readonly position = new Point(-1, -1);

   /** Angle the object is facing, taken counterclockwise from the positive x axis (radians) */
   public rotation = 0;

   public readonly chunks = new Set<Chunk>();

   public hitboxes = new Array<ClientHitbox>();
   public readonly hitboxMap = new Map<number, ClientHitbox>();

   public collisionBit = 0;
   public collisionMask = 0;

   public collidingEntities = new Array<Entity>();
   
   public boundingAreaMinX = Number.MAX_SAFE_INTEGER;
   public boundingAreaMaxX = Number.MIN_SAFE_INTEGER;
   public boundingAreaMinY = Number.MAX_SAFE_INTEGER;
   public boundingAreaMaxY = Number.MIN_SAFE_INTEGER;

   // constructor(position: Point, rotation: number, collisionBit: HitboxCollisionBit, collisionMask: number): void {
   //    super();
      
   //    this.position = position;
   //    this.rotation = rotation;
   //    this.collisionBit = collisionBit;
   //    this.collisionMask = collisionMask;
   // }

   public isInRiver(entity: EntityID): boolean {
      const layer = getEntityLayer(entity);
      const tile = getEntityTile(layer, this);
      if (tile.type !== TileType.water) {
         return false;
      }

      // If the game object is standing on a stepping stone they aren't in a river
      for (const chunk of this.chunks) {
         for (const steppingStone of chunk.riverSteppingStones) {
            const size = RIVER_STEPPING_STONE_SIZES[steppingStone.size];
            
            const dist = distance(this.position.x, this.position.y, steppingStone.positionX, steppingStone.positionY);
            if (dist <= size/2) {
               return false;
            }
         }
      }

      return true;
   }

   public addHitbox(hitbox: ClientHitbox, localID: number): void {
      updateBox(hitbox.box, this.position.x, this.position.y, this.rotation);
      this.hitboxes.push(hitbox);
      this.hitboxMap.set(localID, hitbox);
   }

   public updateHitboxes(): void {
      this.boundingAreaMinX = Number.MAX_SAFE_INTEGER;
      this.boundingAreaMaxX = Number.MIN_SAFE_INTEGER;
      this.boundingAreaMinY = Number.MAX_SAFE_INTEGER;
      this.boundingAreaMaxY = Number.MIN_SAFE_INTEGER;

      for (const hitbox of this.hitboxes) {
         const box = hitbox.box;
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
      }
   }

   /** Recalculates which chunks the game object is contained in */
   private updateContainingChunks(entity: EntityID): void {
      const layer = getEntityLayer(entity);
      const containingChunks = new Set<Chunk>();
      
      // Find containing chunks
      for (const hitbox of this.hitboxes) {
         const box = hitbox.box;

         const minX = box.calculateBoundsMinX();
         const maxX = box.calculateBoundsMaxX();
         const minY = box.calculateBoundsMinY();
         const maxY = box.calculateBoundsMaxY();

         const minChunkX = Math.max(Math.min(Math.floor(minX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         const maxChunkX = Math.max(Math.min(Math.floor(maxX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         const minChunkY = Math.max(Math.min(Math.floor(minY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         const maxChunkY = Math.max(Math.min(Math.floor(maxY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
         
         for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
            for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
               const chunk = layer.getChunk(chunkX, chunkY);
               containingChunks.add(chunk);
            }
         }
      }

      // Find all chunks which aren't present in the new chunks and remove them
      for (const chunk of this.chunks) {
         if (!containingChunks.has(chunk)) {
            chunk.removeEntity(entity);
            this.chunks.delete(chunk);
         }
      }

      // Add all new chunks
      for (const chunk of containingChunks) {
         if (!this.chunks.has(chunk)) {
            chunk.addEntity(entity);
            this.chunks.add(chunk);
         }
      }
   }

   private getHitboxLocalID(hitbox: ClientHitbox): number {
      for (const pair of this.hitboxMap) {
         if (pair[1] === hitbox) {
            return pair[0];
         }
      }

      throw new Error();
   }

   public updatePosition(entity: EntityID): void {
      this.updateHitboxes();
      this.updateContainingChunks(entity);
   }
   
   public removeHitbox(hitbox: ClientHitbox, idx: number): void {
      this.hitboxes.splice(idx, 1);
      const localID = this.getHitboxLocalID(hitbox);
      this.hitboxMap.delete(localID);
   }
}

export default TransformComponent;

export const TransformComponentArray = new ServerComponentArray<TransformComponent>(ServerComponentType.transform, true, {
   onLoad: onLoad,
   onRemove: onRemove,
   padData: padData,
   updateFromData: updateFromData,
   updatePlayerFromData: updatePlayerFromData
});

function onLoad(transformComponent: TransformComponent, entity: EntityID): void {
   // @Hack?
   transformComponent.updatePosition(entity);
}

function onRemove(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   for (const chunk of transformComponent.chunks) {
      chunk.removeEntity(entity);
   }
}

// @Cleanup: copy and paste from server
export function getRandomPointInEntity(transformComponent: TransformComponent): Point {
   const hitbox = transformComponent.hitboxes[randInt(0, transformComponent.hitboxes.length - 1)];
   const box = hitbox.box;

   if (boxIsCircular(box)) {
      const offsetMagnitude = box.radius * Math.random();
      const offsetDirection = 2 * Math.PI * Math.random();
      return new Point(transformComponent.position.x + offsetMagnitude * Math.sin(offsetDirection), transformComponent.position.y + offsetMagnitude * Math.cos(offsetDirection));
   } else {
      const halfWidth = box.width / 2;
      const halfHeight = box.height / 2;
      
      const xOffset = randFloat(-halfWidth, halfWidth);
      const yOffset = randFloat(-halfHeight, halfHeight);

      const x = transformComponent.position.x + rotateXAroundOrigin(xOffset, yOffset, box.rotation);
      const y = transformComponent.position.y + rotateYAroundOrigin(xOffset, yOffset, box.rotation);
      return new Point(x, y);
   }
}

function padData(reader: PacketReader): void {
   // @Bug: This should be 7...? Length of entity data is wrong then?
   reader.padOffset(5 * Float32Array.BYTES_PER_ELEMENT);

   const numCircularHitboxes = reader.readNumber();
   reader.padOffset(10 * Float32Array.BYTES_PER_ELEMENT * numCircularHitboxes);

   const numRectangularHitboxes = reader.readNumber();
   reader.padOffset(12 * Float32Array.BYTES_PER_ELEMENT * numRectangularHitboxes);
}
   
function updateFromData(reader: PacketReader, entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   const positionX = reader.readNumber();
   const positionY = reader.readNumber();
   const rotation = reader.readNumber();

   if (positionX !== transformComponent.position.x || positionY !== transformComponent.position.y || rotation !== transformComponent.rotation) {
      transformComponent.position.x = positionX;
      transformComponent.position.y = positionY;
      transformComponent.rotation = rotation;
      
      transformComponent.updatePosition(entity);

      const renderInfo = getEntityRenderInfo(entity);
      renderInfo.dirty();
   }
   
   transformComponent.collisionBit = reader.readNumber();
   transformComponent.collisionMask = reader.readNumber();

   // @Speed: would be faster if we split the hitboxes array
   let numExistingCircular = 0;
   let numExistingRectangular = 0;
   for (let i = 0; i < transformComponent.hitboxes.length; i++) {
      const hitbox = transformComponent.hitboxes[i];
      if (hitboxIsCircular(hitbox)) {
         numExistingCircular++;
      } else {
         numExistingRectangular++;
      }
   }

   // Update circular hitboxes
   const numCircularHitboxes = reader.readNumber();
   let couldBeRemovedCircularHitboxes = numCircularHitboxes !== numExistingCircular;
   for (let i = 0; i < numCircularHitboxes; i++) {
      const mass = reader.readNumber();
      const offsetX = reader.readNumber();
      const offsetY = reader.readNumber();
      const scale = reader.readNumber();
      const collisionType = reader.readNumber();
      const collisionBit = reader.readNumber();
      const collisionMask = reader.readNumber();
      const localID = reader.readNumber();
      const numFlags = reader.readNumber();
      // @Speed @Garbage
      const flags = new Array<HitboxFlag>();
      for (let i = 0; i < numFlags; i++) {
         flags.push(reader.readNumber());
      }
      const radius = reader.readNumber();

      // If the hitbox is new, create it
      const hitbox = transformComponent.hitboxMap.get(localID);
      if (typeof hitbox === "undefined") {
         const offset = new Point(offsetX, offsetY);
         const box = new CircularBox(offset, 0, radius);
         box.scale = scale;
         const hitbox = new ClientHitbox(box, mass, collisionType, collisionBit, collisionMask, flags);
         transformComponent.addHitbox(hitbox, localID);

         couldBeRemovedCircularHitboxes = true;

      // Otherwise, update it
      } else {
         const box = hitbox.box as CircularBox;
         
         // Update the existing hitbox
         box.radius = radius;
         box.offset.x = offsetX;
         box.offset.y = offsetY;
         box.scale = scale;
         hitbox.collisionType = collisionType;
         hitbox.lastUpdateTicks = Board.serverTicks;
         updateBox(box, transformComponent.position.x, transformComponent.position.y, transformComponent.rotation);
      }
   }

   // Update rectangular hitboxes
   const numRectangularHitboxes = reader.readNumber();
   let couldBeRemovedRectangularHitboxes = numRectangularHitboxes !== numExistingRectangular;
   for (let i = 0; i < numRectangularHitboxes; i++) {
      const mass = reader.readNumber();
      const offsetX = reader.readNumber();
      const offsetY = reader.readNumber();
      const scale = reader.readNumber();
      const collisionType = reader.readNumber();
      const collisionBit = reader.readNumber();
      const collisionMask = reader.readNumber();
      const localID = reader.readNumber();
      const numFlags = reader.readNumber();
      // @Speed @Garbage
      const flags = new Array<HitboxFlag>();
      for (let i = 0; i < numFlags; i++) {
         flags.push(reader.readNumber());
      }
      const width = reader.readNumber();
      const height = reader.readNumber();
      const rotation = reader.readNumber();

      // If the hitbox is new, create it
      const hitbox = transformComponent.hitboxMap.get(localID);
      if (typeof hitbox === "undefined") {
         const offset = new Point(offsetX, offsetY);
         const box = new RectangularBox(offset, width, height, rotation);
         box.scale = scale;
         const hitbox = new ClientHitbox(box, mass, collisionType, collisionBit, collisionMask, flags);
         transformComponent.addHitbox(hitbox, localID);

         couldBeRemovedRectangularHitboxes = true;

      // Otherwise, update it
      } else {
         const box = hitbox.box as RectangularBox;
         
         // Update the existing hitbox
         box.width = width;
         box.height = height;
         box.relativeRotation = rotation;
         box.offset.x = offsetX;
         box.offset.y = offsetY;
         box.scale = scale;
         hitbox.collisionType = collisionType;
         hitbox.lastUpdateTicks = Board.serverTicks;
         updateBox(box, transformComponent.position.x, transformComponent.position.y, transformComponent.rotation);
      }
   }

   // Remove hitboxes which no longer exist
   if (couldBeRemovedCircularHitboxes || couldBeRemovedRectangularHitboxes) {
      for (let i = 0; i < transformComponent.hitboxes.length; i++) {
         const hitbox = transformComponent.hitboxes[i];
         if (hitbox.lastUpdateTicks !== Board.serverTicks) {
            // Hitbox is removed!
            transformComponent.removeHitbox(hitbox, i);
            i--;
         }
      }
   }

   // @Speed
   transformComponent.totalMass = 0;
   for (const hitbox of transformComponent.hitboxes) {
      transformComponent.totalMass += hitbox.mass;
   }

   // Update containing chunks

   // @Speed
   // @Speed
   // @Speed

   const containingChunks = new Set<Chunk>();

   const layer = getEntityLayer(entity);
   for (const hitbox of transformComponent.hitboxes) {
      const box = hitbox.box;

      const minX = box.calculateBoundsMinX();
      const maxX = box.calculateBoundsMaxX();
      const minY = box.calculateBoundsMinY();
      const maxY = box.calculateBoundsMaxY();

      // Recalculate the game object's containing chunks based on the new hitbox bounds
      const minChunkX = Math.max(Math.min(Math.floor(minX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkX = Math.max(Math.min(Math.floor(maxX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const minChunkY = Math.max(Math.min(Math.floor(minY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkY = Math.max(Math.min(Math.floor(maxY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const chunk = layer.getChunk(chunkX, chunkY);
            containingChunks.add(chunk);
         }
      }
   }

   // Find all chunks which aren't present in the new chunks and remove them
   for (const chunk of transformComponent.chunks) {
      if (!containingChunks.has(chunk)) {
         chunk.removeEntity(entity);
         transformComponent.chunks.delete(chunk);
      }
   }

   // Add all new chunks
   for (const chunk of containingChunks) {
      if (!transformComponent.chunks.has(chunk)) {
         chunk.addEntity(entity);
         transformComponent.chunks.add(chunk);
      }
   }
}

function updatePlayerFromData(reader: PacketReader, isInitialData: boolean): void {
   if (isInitialData) {
      updateFromData(reader, Player.instance!.id);
   } else {
      padData(reader);
   }
}
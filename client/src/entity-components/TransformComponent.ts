import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { distance, Point, rotateXAroundOrigin, rotateYAroundOrigin } from "webgl-test-shared/dist/utils";
import Board from "../Board";
import { Tile } from "../Tile";
import { Settings } from "webgl-test-shared/dist/settings";
import { TileType } from "webgl-test-shared/dist/tiles";
import { CircularHitboxData, RectangularHitboxData, RIVER_STEPPING_STONE_SIZES } from "webgl-test-shared/dist/client-server-types";
import Chunk from "../Chunk";
import { randInt } from "webgl-test-shared/dist/utils";
import { randFloat } from "webgl-test-shared/dist/utils";
import { createCircularHitboxFromData, createRectangularHitboxFromData } from "../client/Client";
import { PacketReader } from "webgl-test-shared/dist/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { boxIsCircular, createHitbox, hitboxIsCircular, HitboxWrapper, updateBox } from "webgl-test-shared/dist/boxes/boxes";
import CircularBox from "webgl-test-shared/dist/boxes/CircularBox";
import RectangularBox from "webgl-test-shared/dist/boxes/RectangularBox";

const getTile = (position: Point): Tile => {
   const tileX = Math.floor(position.x / Settings.TILE_SIZE);
   const tileY = Math.floor(position.y / Settings.TILE_SIZE);

   if (tileX < 0 || tileX >= Settings.TILES_IN_WORLD_WIDTH || tileY < 0 || tileY >= Settings.TILES_IN_WORLD_WIDTH) {
      throw new Error();
   }
   
   return Board.getTile(tileX, tileY);
}

class TransformComponent extends ServerComponent {
   public ageTicks: number;
   public totalMass: number;
   
   public readonly position: Point;

   /** Angle the object is facing, taken counterclockwise from the positive x axis (radians) */
   public rotation = 0;

   public tile: Tile;
   
   public chunks = new Set<Chunk>();

   public hitboxes = new Array<HitboxWrapper>();
   public readonly hitboxLocalIDs = new Array<number>();

   public collisionBit: number;
   public collisionMask: number;

   public collidingEntities = new Array<Entity>();
   
   public boundingAreaMinX = Number.MAX_SAFE_INTEGER;
   public boundingAreaMaxX = Number.MIN_SAFE_INTEGER;
   public boundingAreaMinY = Number.MAX_SAFE_INTEGER;
   public boundingAreaMaxY = Number.MIN_SAFE_INTEGER;
   
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.position = new Point(reader.readNumber(), reader.readNumber());
      this.rotation = reader.readNumber();
      this.ageTicks = reader.readNumber();
      this.collisionBit = reader.readNumber();
      this.collisionMask = reader.readNumber();
      
      this.tile = getTile(this.position);

      this.totalMass = 0;

      const numCircularHitboxes = reader.readNumber();
      for (let i = 0; i < numCircularHitboxes; i++) {
         const mass = reader.readNumber();
         const offsetX = reader.readNumber();
         const offsetY = reader.readNumber();
         const collisionType = reader.readNumber();
         const collisionBit = reader.readNumber();
         const collisionMask = reader.readNumber();
         const localID = reader.readNumber();
         const flags = reader.readNumber();
         const radius = reader.readNumber();

         const box = new CircularBox(new Point(offsetX, offsetY), radius);
         const hitbox = createHitbox(box, mass, collisionType, collisionBit, collisionMask, flags);
         this.addHitbox(hitbox, localID);

         this.totalMass += mass;
      }

      const numRectangularHitboxes = reader.readNumber();
      for (let i = 0; i < numRectangularHitboxes; i++) {
         const mass = reader.readNumber();
         const offsetX = reader.readNumber();
         const offsetY = reader.readNumber();
         const collisionType = reader.readNumber();
         const collisionBit = reader.readNumber();
         const collisionMask = reader.readNumber();
         const localID = reader.readNumber();
         const flags = reader.readNumber();
         const width = reader.readNumber();
         const height = reader.readNumber();
         const rotation = reader.readNumber();

         const box = new RectangularBox(new Point(offsetX, offsetY), width, height, rotation);
         const hitbox = createHitbox(box, mass, collisionType, collisionBit, collisionMask, flags);
         this.addHitbox(hitbox, localID);

         this.totalMass += mass;
      }
   }

   public onLoad(): void {
      this.updatePosition();
   }

   public isInRiver(): boolean {
      if (this.tile.type !== TileType.water) {
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

   public addHitbox(hitbox: HitboxWrapper, localID: number): void {
      updateBox(hitbox.box, this.position.x, this.position.y, this.rotation);
      this.hitboxes.push(hitbox);
      this.hitboxLocalIDs.push(localID);
   }

   private updateHitboxes(): void {
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
   private updateContainingChunks(): void {
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
               const chunk = Board.getChunk(chunkX, chunkY);
               containingChunks.add(chunk);
            }
         }
      }

      // Find all chunks which aren't present in the new chunks and remove them
      for (const chunk of this.chunks) {
         if (!containingChunks.has(chunk)) {
            chunk.removeEntity(this.entity);
            this.chunks.delete(chunk);
         }
      }

      // Add all new chunks
      for (const chunk of containingChunks) {
         if (!this.chunks.has(chunk)) {
            chunk.addEntity(this.entity);
            this.chunks.add(chunk);
         }
      }
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(6 * Float32Array.BYTES_PER_ELEMENT);

      const numCircularHitboxes = reader.readNumber();
      reader.padOffset(9 * Float32Array.BYTES_PER_ELEMENT * numCircularHitboxes);

      const numRectangularHitboxes = reader.readNumber();
      reader.padOffset(11 * Float32Array.BYTES_PER_ELEMENT * numRectangularHitboxes);
   }

   public updatePosition(): void {
      this.tile = getTile(this.position);
      this.updateHitboxes();
      this.updateContainingChunks();
   }
   
   public updateFromData(reader: PacketReader): void {
      const positionX = reader.readNumber();
      const positionY = reader.readNumber();
      const rotation = reader.readNumber();

      if (positionX !== this.position.x || positionY !== this.position.y || rotation !== this.rotation) {
         this.updatePosition();
         this.entity.dirty();
      }
      
      this.position.x = positionX;
      this.position.y = positionY;
      this.rotation = rotation;
      this.ageTicks = reader.readNumber();
      this.collisionBit = reader.readNumber();
      this.collisionMask = reader.readNumber();

      // @Hack
      // @Hack
      // @Hack
      
      const circularHitboxes = new Array<CircularHitboxData>();
      const numCircularHitboxes = reader.readNumber();
      for (let i = 0; i < numCircularHitboxes; i++) {
         const mass = reader.readNumber();
         const offsetX = reader.readNumber();
         const offsetY = reader.readNumber();
         const collisionType = reader.readNumber();
         const collisionBit = reader.readNumber();
         const collisionMask = reader.readNumber();
         const localID = reader.readNumber();
         const flags = reader.readNumber();
         const radius = reader.readNumber();

         const data: CircularHitboxData = {
            mass: mass,
            offsetX: offsetX,
            offsetY: offsetY,
            collisionType: collisionType,
            collisionBit: collisionBit,
            collisionMask: collisionMask,
            localID: localID,
            flags: flags,
            radius: radius
         };
         circularHitboxes.push(data);
      }

      const rectangularHitboxes = new Array<RectangularHitboxData>();
      const numRectangularHitboxes = reader.readNumber();
      for (let i = 0; i < numRectangularHitboxes; i++) {
         const mass = reader.readNumber();
         const offsetX = reader.readNumber();
         const offsetY = reader.readNumber();
         const collisionType = reader.readNumber();
         const collisionBit = reader.readNumber();
         const collisionMask = reader.readNumber();
         const localID = reader.readNumber();
         const flags = reader.readNumber();
         const width = reader.readNumber();
         const height = reader.readNumber();
         const rotation = reader.readNumber();

         const data: RectangularHitboxData = {
            mass: mass,
            offsetX: offsetX,
            offsetY: offsetY,
            collisionType: collisionType,
            collisionBit: collisionBit,
            collisionMask: collisionMask,
            localID: localID,
            flags: flags,
            width: width,
            height: height,
            rotation: rotation
         };
         rectangularHitboxes.push(data);
      }
      
      // 
      // Update hitboxes
      // 

      // Remove hitboxes which are no longer exist
      for (let i = 0; i < this.hitboxes.length; i++) {
         const hitbox = this.hitboxes[i];
         const localID = this.hitboxLocalIDs[i];

         // @Speed
         let localIDExists = false;
         for (let j = 0; j < circularHitboxes.length; j++) {
            const hitboxData = circularHitboxes[j];
            if (hitboxData.localID === localID) {
               localIDExists = true;
               break;
            }
         }
         for (let j = 0; j < rectangularHitboxes.length; j++) {
            const hitboxData = rectangularHitboxes[j];
            if (hitboxData.localID === localID) {
               localIDExists = true;
               break;
            }
         }

         if (!localIDExists) {
            this.hitboxes.splice(i, 1);
            this.hitboxLocalIDs.splice(i, 1);
            i--;
         }
      }

      for (let i = 0; i < circularHitboxes.length; i++) {
         const hitboxData = circularHitboxes[i];

         // Check for an existing hitbox
         // @Speed
         let existingHitboxIdx = 99999;
         for (let j = 0; j < this.hitboxes.length; j++) {
            const hitbox = this.hitboxes[j];
            if (!hitboxIsCircular(hitbox)) {
               continue;
            }

            const localID = this.hitboxLocalIDs[j];
            if (localID === hitboxData.localID) {
               existingHitboxIdx = j;
               break;
            }
         }
         
         if (existingHitboxIdx !== 99999) {
            const hitbox = this.hitboxes[existingHitboxIdx];
            const box = hitbox.box as CircularBox;
            
            // Update the existing hitbox
            box.radius = hitboxData.radius;
            box.offset.x = hitboxData.offsetX;
            box.offset.y = hitboxData.offsetY;
            hitbox.collisionType = hitboxData.collisionType;
            updateBox(box, this.position.x, this.position.y, this.rotation);
         } else {
            // Create new hitbox
            const hitbox = createCircularHitboxFromData(hitboxData);
            this.addHitbox(hitbox, hitboxData.localID);
         }
      }
      // @Cleanup: Copy and paste
      for (let i = 0; i < rectangularHitboxes.length; i++) {
         const hitboxData = rectangularHitboxes[i];

         // Check for an existing hitbox
         // @Speed
         let existingHitboxIdx = 99999;
         for (let j = 0; j < this.hitboxes.length; j++) {
            const hitbox = this.hitboxes[j];
            if (hitboxIsCircular(hitbox)) {
               continue;
            }
            
            const localID = this.hitboxLocalIDs[j];
            if (localID === hitboxData.localID) {
               existingHitboxIdx = j;
               break;
            }
         }
         
         if (existingHitboxIdx !== 99999) {
            // Update the existing hitbox
            const hitbox = this.hitboxes[existingHitboxIdx];
            const box = hitbox.box as RectangularBox;

            box.width = hitboxData.width;
            box.height = hitboxData.height;
            box.relativeRotation = hitboxData.rotation;
            box.offset.x = hitboxData.offsetX;
            box.offset.y = hitboxData.offsetY;
            hitbox.collisionType = hitboxData.collisionType;
            updateBox(box, this.position.x, this.position.y, this.rotation);
         } else {
            // Create new hitbox
            const hitbox = createRectangularHitboxFromData(hitboxData);
            this.addHitbox(hitbox, hitboxData.localID);
         }
      }

      // @Speed
      this.totalMass = 0;
      for (const hitbox of this.hitboxes) {
         this.totalMass += hitbox.mass;
      }

      // Update containing chunks

      // @Speed
      // @Speed
      // @Speed

      const containingChunks = new Set<Chunk>();

      for (const hitbox of this.hitboxes) {
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
               const chunk = Board.getChunk(chunkX, chunkY);
               containingChunks.add(chunk);
            }
         }
      }

      // Find all chunks which aren't present in the new chunks and remove them
      for (const chunk of this.chunks) {
         if (!containingChunks.has(chunk)) {
            chunk.removeEntity(this.entity);
            this.chunks.delete(chunk);
         }
      }

      // Add all new chunks
      for (const chunk of containingChunks) {
         if (!this.chunks.has(chunk)) {
            chunk.addEntity(this.entity);
            this.chunks.add(chunk);
         }
      }
   }

   public onRemove(): void {
      for (const chunk of this.chunks) {
         chunk.removeEntity(this.entity);
      }
   }
}

export default TransformComponent;

export const TransformComponentArray = new ComponentArray<TransformComponent>(ComponentArrayType.server, ServerComponentType.transform, true, {
   onUpdate: onUpdate
});

// @Speed
function onUpdate(transformComponent: TransformComponent): void {
   transformComponent.ageTicks++;
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
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { distance, Point, rotateXAroundOrigin, rotateYAroundOrigin } from "battletribes-shared/utils";
import { Tile } from "../Tile";
import { Settings } from "battletribes-shared/settings";
import { TileType } from "battletribes-shared/tiles";
import { CircularHitboxData, RectangularHitboxData, RIVER_STEPPING_STONE_SIZES } from "battletribes-shared/client-server-types";
import Chunk from "../Chunk";
import { randInt } from "battletribes-shared/utils";
import { randFloat } from "battletribes-shared/utils";
import { createCircularHitboxFromData, createRectangularHitboxFromData } from "../client/Client";
import { PacketReader } from "battletribes-shared/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";
import { boxIsCircular, hitboxIsCircular, Hitbox, updateBox, HitboxFlag } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import Layer, { getTileIndexIncludingEdges } from "../Layer";
import { getEntityLayer } from "../world";

const getTile = (layer: Layer, position: Point): Tile => {
   const tileX = Math.floor(position.x / Settings.TILE_SIZE);
   const tileY = Math.floor(position.y / Settings.TILE_SIZE);

   if (tileX < 0 || tileX >= Settings.TILES_IN_WORLD_WIDTH || tileY < 0 || tileY >= Settings.TILES_IN_WORLD_WIDTH) {
      console.log(position.x, position.y);
      throw new Error();
   }
   
   const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
   return layer.getTile(tileIndex);
}

class TransformComponent extends ServerComponent {
   // @Hack
   public ageTicks = 0;
   public totalMass = 0;
   
   public readonly position = new Point(-1, -1);

   /** Angle the object is facing, taken counterclockwise from the positive x axis (radians) */
   public rotation = 0;

   // @Memory: Shouldn't even store this
   // @Cleanup: Shouldn't be undefined at first!
   public tile!: Tile;
   
   public chunks = new Set<Chunk>();

   public hitboxes = new Array<Hitbox>();
   public readonly hitboxLocalIDs = new Array<number>();

   public collisionBit = 0;
   public collisionMask = 0;

   public collidingEntities = new Array<Entity>();
   
   public boundingAreaMinX = Number.MAX_SAFE_INTEGER;
   public boundingAreaMaxX = Number.MIN_SAFE_INTEGER;
   public boundingAreaMinY = Number.MAX_SAFE_INTEGER;
   public boundingAreaMaxY = Number.MIN_SAFE_INTEGER;

   public onLoad(): void {
      const layer = getEntityLayer(this.entity.id);
      this.tile = getTile(layer, this.position);

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

   public addHitbox(hitbox: Hitbox, localID: number): void {
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
      const layer = getEntityLayer(this.entity.id);
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
      reader.padOffset(10 * Float32Array.BYTES_PER_ELEMENT * numCircularHitboxes);

      const numRectangularHitboxes = reader.readNumber();
      reader.padOffset(12 * Float32Array.BYTES_PER_ELEMENT * numRectangularHitboxes);
   }

   public updatePosition(): void {
      const layer = getEntityLayer(this.entity.id);
      this.tile = getTile(layer, this.position);
      this.updateHitboxes();
      this.updateContainingChunks();
   }
   
   public updateFromData(reader: PacketReader): void {
      const positionX = reader.readNumber();
      const positionY = reader.readNumber();
      const rotation = reader.readNumber();

      if (positionX !== this.position.x || positionY !== this.position.y || rotation !== this.rotation) {
         this.position.x = positionX;
         this.position.y = positionY;
         this.rotation = rotation;
         
         this.updatePosition();
         this.entity.dirty();
      }
      
      this.ageTicks = reader.readNumber();
      this.collisionBit = reader.readNumber();
      this.collisionMask = reader.readNumber();

      // @Hack
      // @Hack
      // @Hack

      // @Speed: Garbage collection
      
      // @Garbage
      const circularHitboxes = new Array<CircularHitboxData>();
      const numCircularHitboxes = reader.readNumber();
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
         const flags = new Array<HitboxFlag>();
         for (let i = 0; i < numFlags; i++) {
            flags.push(reader.readNumber());
         }
         const radius = reader.readNumber();

         const data: CircularHitboxData = {
            mass: mass,
            offsetX: offsetX,
            offsetY: offsetY,
            scale: scale,
            collisionType: collisionType,
            collisionBit: collisionBit,
            collisionMask: collisionMask,
            localID: localID,
            flags: flags,
            radius: radius
         };
         circularHitboxes.push(data);
      }

      // @Garbage
      const rectangularHitboxes = new Array<RectangularHitboxData>();
      const numRectangularHitboxes = reader.readNumber();
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
         const flags = new Array<HitboxFlag>();
         for (let i = 0; i < numFlags; i++) {
            flags.push(reader.readNumber());
         }
         const width = reader.readNumber();
         const height = reader.readNumber();
         const rotation = reader.readNumber();

         const data: RectangularHitboxData = {
            mass: mass,
            offsetX: offsetX,
            offsetY: offsetY,
            scale: scale,
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
            box.scale = hitboxData.scale;
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
            box.scale = hitboxData.scale;
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

      const layer = getEntityLayer(this.entity.id);
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
               const chunk = layer.getChunk(chunkX, chunkY);
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
import { ServerComponentType, TransformComponentData } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { distance, Point, rotateXAroundOrigin, rotateYAroundOrigin } from "webgl-test-shared/dist/utils";
import { CircularHitbox, Hitbox, hitboxIsCircular, RectangularHitbox, updateHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";
import Board from "../Board";
import { EntityType } from "webgl-test-shared/dist/entities";
import { createWaterSplashParticle } from "../particles";
import { Tile } from "../Tile";
import { Settings } from "webgl-test-shared/dist/settings";
import { TileType } from "webgl-test-shared/dist/tiles";
import { RIVER_STEPPING_STONE_SIZES } from "webgl-test-shared/dist/client-server-types";
import Chunk from "../Chunk";
import { randInt } from "webgl-test-shared/dist/utils";
import { randFloat } from "webgl-test-shared/dist/utils";
import { createCircularHitboxFromData, createRectangularHitboxFromData } from "../client/Client";

const getTile = (position: Point): Tile => {
   const tileX = Math.floor(position.x / Settings.TILE_SIZE);
   const tileY = Math.floor(position.y / Settings.TILE_SIZE);

   if (tileX < 0 || tileX >= Settings.TILES_IN_WORLD_WIDTH || tileY < 0 || tileY >= Settings.TILES_IN_WORLD_WIDTH) {
      throw new Error();
   }
   
   return Board.getTile(tileX, tileY);
}

class TransformComponent extends ServerComponent<ServerComponentType.transform> {
   public ageTicks: number;
   
   public readonly position: Point;

   /** Angle the object is facing, taken counterclockwise from the positive x axis (radians) */
   public rotation = 0;

   public tile: Tile;
   
   public chunks = new Set<Chunk>();

   public hitboxes = new Array<Hitbox>();
   public readonly hitboxLocalIDs = new Array<number>();

   public collisionBit: number;
   public collisionMask: number;

   public collidingEntities = new Array<Entity>();
   
   constructor(entity: Entity, data: TransformComponentData) {
      super(entity);

      this.ageTicks = data.ageTicks;
      
      this.position = Point.unpackage(data.position);
      this.rotation = data.rotation;

      this.collisionBit = data.collisionBit;
      this.collisionMask = data.collisionMask;
      
      this.tile = getTile(this.position);

      // Add hitboxes
      for (let i = 0; i < data.circularHitboxes.length; i++) {
         const hitboxData = data.circularHitboxes[i];

         const hitbox = createCircularHitboxFromData(hitboxData);
         this.addHitbox(hitbox, hitboxData.localID);
      }

      for (let i = 0; i < data.rectangularHitboxes.length; i++) {
         const hitboxData = data.rectangularHitboxes[i];

         const hitbox = createRectangularHitboxFromData(hitboxData);
         this.addHitbox(hitbox, hitboxData.localID);
      }
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

   public tick(): void {
      // Water droplet particles
      // @Cleanup: Don't hardcode fish condition
      if (this.isInRiver() && Board.tickIntervalHasPassed(0.05) && (this.entity.type !== EntityType.fish)) {
         createWaterSplashParticle(this.position.x, this.position.y);
      }
   }

   public update(): void {
      this.ageTicks++;
      
      this.tile = getTile(this.position);
      this.updateHitboxes();
      this.updateContainingChunks();
   }

   public addHitbox(hitbox: Hitbox, localID: number): void {
      updateHitbox(hitbox, this.position.x, this.position.y, this.rotation);
      this.hitboxes.push(hitbox);
      this.hitboxLocalIDs.push(localID);
   }

   private updateHitboxes(): void {
      for (const hitbox of this.hitboxes) {
         updateHitbox(hitbox, this.position.x, this.position.y, this.rotation);
      }
   }

   /** Recalculates which chunks the game object is contained in */
   private updateContainingChunks(): void {
      const containingChunks = new Set<Chunk>();
      
      // Find containing chunks
      for (const hitbox of this.hitboxes) {
         const minX = hitbox.calculateHitboxBoundsMinX();
         const maxX = hitbox.calculateHitboxBoundsMaxX();
         const minY = hitbox.calculateHitboxBoundsMinY();
         const maxY = hitbox.calculateHitboxBoundsMaxY();

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
            chunk.removeEntity(this.entity.id);
            this.chunks.delete(chunk);
         }
      }

      // Add all new chunks
      for (const chunk of containingChunks) {
         if (!this.chunks.has(chunk)) {
            chunk.addEntity(this.entity.id);
            this.chunks.add(chunk);
         }
      }
   }

   public updateFromData(data: TransformComponentData): void {
      this.ageTicks = data.ageTicks;
      
      this.position.x = data.position[0];
      this.position.y = data.position[1];
      this.rotation = data.rotation;

      
      // 
      // Update hitboxes
      // 

      // Remove hitboxes which are no longer exist
      for (let i = 0; i < this.hitboxes.length; i++) {
         const hitbox = this.hitboxes[i];
         const localID = this.hitboxLocalIDs[i];

         // @Speed
         let localIDExists = false;
         for (let j = 0; j < data.circularHitboxes.length; j++) {
            const hitboxData = data.circularHitboxes[j];
            if (hitboxData.localID === localID) {
               localIDExists = true;
               break;
            }
         }
         for (let j = 0; j < data.rectangularHitboxes.length; j++) {
            const hitboxData = data.rectangularHitboxes[j];
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

      for (let i = 0; i < data.circularHitboxes.length; i++) {
         const hitboxData = data.circularHitboxes[i];

         // Check for an existing hitbox
         // @Speed
         let existingHitboxIdx = 99999;
         for (let j = 0; j < this.hitboxes.length; j++) {
            const hitbox = this.hitboxes[j];
            if (!hitbox.hasOwnProperty("radius")) {
               continue;
            }

            const localID = this.hitboxLocalIDs[j];
            if (localID === hitboxData.localID) {
               existingHitboxIdx = j;
               break;
            }
         }
         
         let hitbox: CircularHitbox;
         if (existingHitboxIdx !== 99999) {
            // Update the existing hitbox
            hitbox = this.hitboxes[existingHitboxIdx] as CircularHitbox;
            hitbox.radius = hitboxData.radius;
            hitbox.offset.x = hitboxData.offsetX;
            hitbox.offset.y = hitboxData.offsetY;
            hitbox.collisionType = hitboxData.collisionType;
            updateHitbox(hitbox, this.position.x, this.position.y, this.rotation);
         } else {
            // Create new hitbox
            hitbox = createCircularHitboxFromData(hitboxData);
            this.addHitbox(hitbox, hitboxData.localID);
         }
      }
      // @Cleanup: Copy and paste
      for (let i = 0; i < data.rectangularHitboxes.length; i++) {
         const hitboxData = data.rectangularHitboxes[i];

         // Check for an existing hitbox
         // @Speed
         let existingHitboxIdx = 99999;
         for (let j = 0; j < this.hitboxes.length; j++) {
            const hitbox = this.hitboxes[j];
            if (hitbox.hasOwnProperty("radius")) {
               continue;
            }
            
            const localID = this.hitboxLocalIDs[j];
            if (localID === hitboxData.localID) {
               existingHitboxIdx = j;
               break;
            }
         }
         
         let hitbox: RectangularHitbox;
         if (existingHitboxIdx !== 99999) {
            // Update the existing hitbox
            hitbox = this.hitboxes[existingHitboxIdx] as RectangularHitbox;
            hitbox.width = hitboxData.width;
            hitbox.height = hitboxData.height;
            hitbox.relativeRotation = hitboxData.rotation;
            hitbox.offset.x = hitboxData.offsetX;
            hitbox.offset.y = hitboxData.offsetY;
            hitbox.collisionType = hitboxData.collisionType;
            updateHitbox(hitbox, this.position.x, this.position.y, this.rotation);
         } else {
            // Create new hitbox
            hitbox = createRectangularHitboxFromData(hitboxData);
            this.addHitbox(hitbox, hitboxData.localID);
         }
      }

      // Update containing chunks

      // @Speed
      // @Speed
      // @Speed

      const containingChunks = new Set<Chunk>();

      for (const hitbox of this.hitboxes) {
         const minX = hitbox.calculateHitboxBoundsMinX();
         const maxX = hitbox.calculateHitboxBoundsMaxX();
         const minY = hitbox.calculateHitboxBoundsMinY();
         const maxY = hitbox.calculateHitboxBoundsMaxY();

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
            chunk.removeEntity(this.entity.id);
            this.chunks.delete(chunk);
         }
      }

      // Add all new chunks
      for (const chunk of containingChunks) {
         if (!this.chunks.has(chunk)) {
            chunk.addEntity(this.entity.id);
            this.chunks.add(chunk);
         }
      }
   }

   public onRemove(): void {
      for (const chunk of this.chunks) {
         chunk.removeEntity(this.entity.id);
      }
   }
}

export default TransformComponent;

// @Cleanup: copy and paste from server
export function getRandomPointInEntity(transformComponent: TransformComponent): Point {
   const hitbox = transformComponent.hitboxes[randInt(0, transformComponent.hitboxes.length - 1)];

   if (hitboxIsCircular(hitbox)) {
      const offsetMagnitude = hitbox.radius * Math.random();
      const offsetDirection = 2 * Math.PI * Math.random();
      return new Point(transformComponent.position.x + offsetMagnitude * Math.sin(offsetDirection), transformComponent.position.y + offsetMagnitude * Math.cos(offsetDirection));
   } else {
      const halfWidth = hitbox.width / 2;
      const halfHeight = hitbox.height / 2;
      
      const xOffset = randFloat(-halfWidth, halfWidth);
      const yOffset = randFloat(-halfHeight, halfHeight);

      const x = transformComponent.position.x + rotateXAroundOrigin(xOffset, yOffset, hitbox.rotation);
      const y = transformComponent.position.y + rotateYAroundOrigin(xOffset, yOffset, hitbox.rotation);
      return new Point(x, y);
   }
}
import { Point } from "webgl-test-shared/dist/utils";
import { VisibleChunkBounds } from "webgl-test-shared/dist/client-server-types";
import { Settings } from "webgl-test-shared/dist/settings";
import { halfWindowHeight, halfWindowWidth } from "./webgl";
import { RENDER_CHUNK_EDGE_GENERATION, RENDER_CHUNK_SIZE, WORLD_RENDER_CHUNK_SIZE } from "./rendering/render-chunks";
import Board from "./Board";
import Chunk from "./Chunk";

export type VisiblePositionBounds = [minX: number, maxX: number, minY: number, maxY: number];

const registerVisibleChunk = (chunk: Chunk): void => {
   // for (let i = 0; i < chunk.grassStrands.length; i++) {
   //    const grassStrandData = chunk.grassStrands[i];
      
   //    const entity = new GrassStrand(grassStrandData);
   //    Board.addEntity(entity);
   // }
}

const deregisterVisibleChunk = (chunk: Chunk): void => {

}

const getChunksFromRange = (minChunkX: number, maxChunkX: number, minChunkY: number, maxChunkY: number): ReadonlyArray<Chunk> => {
   const chunks = new Array<Chunk>();
   
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         chunks.push(chunk);
      }
   }

   return chunks;
}

/** Gets all the chunks in chunks B missing from chunks A */
const getMissingChunks = (chunksA: ReadonlyArray<Chunk>, chunksB: ReadonlyArray<Chunk>): ReadonlyArray<Chunk> => {
   const missing = new Array<Chunk>();
   for (const chunk of chunksB) {
      if (!chunksA.includes(chunk)) {
         missing.push(chunk);
      }
   }
   return missing;
}

abstract class Camera {
   /** Larger = zoomed in, smaller = zoomed out */
   // @Temporary
   public static zoom: number = 1.4;
   // public static zoom: number = 0.8;
   // public static zoom: number = 1;

   public static trackedEntityID = 0;

   public static position = new Point(0, 0);
   
   public static isFree = false;
   
   public static minVisibleChunkX = -1;
   public static maxVisibleChunkX = -1;
   public static minVisibleChunkY = -1;
   public static maxVisibleChunkY = -1;

   public static minVisibleRenderChunkX = -1;
   public static maxVisibleRenderChunkX = -1;
   public static minVisibleRenderChunkY = -1;
   public static maxVisibleRenderChunkY = -1;

   public static updateVisibleChunkBounds(): void {
      const previousChunks = getChunksFromRange(this.minVisibleChunkX, this.maxVisibleChunkX, this.minVisibleChunkY, this.maxVisibleChunkY);
      
      this.minVisibleChunkX = Math.max(Math.floor((this.position.x - halfWindowWidth / this.zoom) / Settings.CHUNK_UNITS), 0);
      this.maxVisibleChunkX = Math.min(Math.floor((this.position.x + halfWindowWidth / this.zoom) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
      this.minVisibleChunkY = Math.max(Math.floor((this.position.y - halfWindowHeight / this.zoom) / Settings.CHUNK_UNITS), 0);
      this.maxVisibleChunkY = Math.min(Math.floor((this.position.y + halfWindowHeight / this.zoom) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);

      const newChunks = getChunksFromRange(this.minVisibleChunkX, this.maxVisibleChunkX, this.minVisibleChunkY, this.maxVisibleChunkY);

      const removedChunks = getMissingChunks(newChunks, previousChunks);
      for (const chunk of removedChunks) {
         deregisterVisibleChunk(chunk);
      }

      const addedChunks = getMissingChunks(previousChunks, newChunks);
      for (const chunk of addedChunks) {
         registerVisibleChunk(chunk);
      }
   }

   public static getVisibleChunkBounds(): VisibleChunkBounds {
      return [this.minVisibleChunkX, this.maxVisibleChunkX, this.minVisibleChunkY, this.maxVisibleChunkY];
   }

   public static updateVisibleRenderChunkBounds(): void {
      const unitsInChunk = Settings.TILE_SIZE * RENDER_CHUNK_SIZE;
      
      this.minVisibleRenderChunkX = Math.max(Math.floor((this.position.x - halfWindowWidth / this.zoom) / unitsInChunk), -RENDER_CHUNK_EDGE_GENERATION);
      this.maxVisibleRenderChunkX = Math.min(Math.floor((this.position.x + halfWindowWidth / this.zoom) / unitsInChunk), WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION - 1);
      this.minVisibleRenderChunkY = Math.max(Math.floor((this.position.y - halfWindowHeight / this.zoom) / unitsInChunk), -RENDER_CHUNK_EDGE_GENERATION);
      this.maxVisibleRenderChunkY = Math.min(Math.floor((this.position.y + halfWindowHeight / this.zoom) / unitsInChunk), WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION - 1);
   }

   public static setTrackedEntityID(entityID: number): void {
      this.trackedEntityID = entityID;
      this.isFree = entityID === 0;
   }

   public static setPosition(x: number, y: number): void {
      this.position.x = x;
      this.position.y = y;
   }

   public static updatePosition(): void {
      if (this.isFree) {
         return;
      }
      
      const entity = Board.entityRecord[this.trackedEntityID];
      if (typeof entity !== "undefined") {
         this.position.x = entity.renderPosition.x;
         this.position.y = entity.renderPosition.y;
      }
   }

   /** X position in the screen (0 = left, windowWidth = right) */
   public static calculateXScreenPos(x: number): number {
      // Account for the player position
      const playerRelativePosition = x - this.position.x;
      
      // Account for zoom
      return playerRelativePosition * this.zoom + halfWindowWidth;
   }

   /** Y position in the screen (0 = bottom, windowHeight = top) */
   public static calculateYScreenPos(y: number): number {
      // Account for the player position
      const playerRelativePosition = y - this.position.y;
      
      // Account for zoom
      return playerRelativePosition * this.zoom + halfWindowHeight;
   }
}

export default Camera;
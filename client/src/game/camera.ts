import { Point } from "webgl-test-shared/src/utils";
import { Settings } from "webgl-test-shared/src/settings";
import { halfWindowHeight, halfWindowWidth } from "./webgl";
import { RENDER_CHUNK_EDGE_GENERATION, RENDER_CHUNK_SIZE, WORLD_RENDER_CHUNK_SIZE } from "./rendering/render-chunks";
import Chunk from "./Chunk";
import Layer from "./Layer";
import { entityExists } from "./world";
import { Entity } from "../../../shared/src/entities";
import { calculateHitboxRenderPosition, getEntityTickInterp } from "./rendering/render-part-matrices";
import { Hitbox } from "./hitboxes";
import { TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { isSpectating } from "./player";
import { debugDisplayState } from "../ui-state/debug-display-state.svelte";

let cameraSubjectHitbox: Hitbox | null = null;

export const cameraPosition = new Point(0, 0);

/** Larger = zoomed in, smaller = zoomed out */
// @INCOMPLETE @HACK rn i have to fiddle around with this manually, make it be calcualted automatically before public testing
// export let cameraZoom = 1.4;
export let cameraZoom = 1;

export let minVisibleX = 0;
export let maxVisibleX = 0;
export let minVisibleY = 0;
export let maxVisibleY = 0;

export let minVisibleChunkX = 0;
export let maxVisibleChunkX = 0;
export let minVisibleChunkY = 0;
export let maxVisibleChunkY = 0;

export let minVisibleRenderChunkX = -1;
export let maxVisibleRenderChunkX = -1;
export let minVisibleRenderChunkY = -1;
export let maxVisibleRenderChunkY = -1;

// @Incomplete?
// const registerVisibleChunk = (chunk: Chunk): void => {
//    // createEntityRenderedChunkData(chunk.x, chunk.y);
// }

// // @Incomplete?
// const deregisterVisibleChunk = (chunk: Chunk): void => {
//    // removeEntityRenderedChunkData(chunk.x, chunk.y);
// }

// @Incomplete: unused
const getChunksFromRange = (layer: Layer, minChunkX: number, maxChunkX: number, minChunkY: number, maxChunkY: number): ReadonlyArray<Chunk> => {
   const chunks = new Array<Chunk>();
   
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         chunks.push(chunk);
      }
   }

   return chunks;
}

// @Incomplete: unused
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

export function setCameraZoom(zoom: number): void {
   cameraZoom = zoom;
   debugDisplayState.setCameraZoom(zoom);
}

export function setCameraSubject(cameraSubject: Entity): void {
   // @Hack? done for both playerInstance and cameraSubject
   // If the player is spectating with a client-only entity, don't kill them!
   if (isSpectating && !entityExists(cameraSubject)) {
      return;
   }
   
   const transformComponent = TransformComponentArray.getComponent(cameraSubject);
   if (transformComponent !== null) {
      const hitbox = transformComponent.hitboxes[0];
      cameraSubjectHitbox = hitbox;
      return;
   }

   cameraSubjectHitbox = null;
}

export function getCameraSubject(): Entity | null {
   if (cameraSubjectHitbox === null || !entityExists(cameraSubjectHitbox.entity)) {
      return null;
   }
   return cameraSubjectHitbox.entity;
}

export function setCameraPosition(x: number, y: number): void {
   cameraPosition.x = x;
   cameraPosition.y = y;
}

export function refreshCameraPosition(clientTickInterp: number, serverTickInterp: number): void {
   if (cameraSubjectHitbox === null) {
      return;
   }

   const tickInterp = getEntityTickInterp(cameraSubjectHitbox.entity, clientTickInterp, serverTickInterp);
   const pos = calculateHitboxRenderPosition(cameraSubjectHitbox, tickInterp);
   cameraPosition.set(pos);
}

export function refreshCameraView(): void {
   // const previousChunks = getChunksFromRange(layer, this.minVisibleChunkX, this.maxVisibleChunkX, this.minVisibleChunkY, this.maxVisibleChunkY);
   
   minVisibleX = cameraPosition.x - halfWindowWidth / cameraZoom;
   maxVisibleX = cameraPosition.x + halfWindowWidth / cameraZoom;
   minVisibleY = cameraPosition.y - halfWindowHeight / cameraZoom;
   maxVisibleY = cameraPosition.y + halfWindowHeight / cameraZoom;
   
   minVisibleChunkX = Math.max(Math.floor(minVisibleX / Settings.CHUNK_UNITS), 0);
   maxVisibleChunkX = Math.min(Math.floor(maxVisibleX / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);
   minVisibleChunkY = Math.max(Math.floor(minVisibleY / Settings.CHUNK_UNITS), 0);
   maxVisibleChunkY = Math.min(Math.floor(maxVisibleY / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);

   // const newChunks = getChunksFromRange(layer, this.minVisibleChunkX, this.maxVisibleChunkX, this.minVisibleChunkY, this.maxVisibleChunkY);

   // const removedChunks = getMissingChunks(newChunks, previousChunks);
   // for (const chunk of removedChunks) {
   //    deregisterVisibleChunk(chunk);
   // }

   // const addedChunks = getMissingChunks(previousChunks, newChunks);
   // for (const chunk of addedChunks) {
   //    registerVisibleChunk(chunk);
   // }

   // Update visible render chunk bounds
   const RENDER_CHUNK_UNITS = Settings.TILE_SIZE * RENDER_CHUNK_SIZE;
   minVisibleRenderChunkX = Math.max(Math.floor((cameraPosition.x - halfWindowWidth / cameraZoom) / RENDER_CHUNK_UNITS), -RENDER_CHUNK_EDGE_GENERATION);
   maxVisibleRenderChunkX = Math.min(Math.floor((cameraPosition.x + halfWindowWidth / cameraZoom) / RENDER_CHUNK_UNITS), WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION - 1);
   minVisibleRenderChunkY = Math.max(Math.floor((cameraPosition.y - halfWindowHeight / cameraZoom) / RENDER_CHUNK_UNITS), -RENDER_CHUNK_EDGE_GENERATION);
   maxVisibleRenderChunkY = Math.min(Math.floor((cameraPosition.y + halfWindowHeight / cameraZoom) / RENDER_CHUNK_UNITS), WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION - 1);
}

/** X position in the screen (0, 0) = bottom left, (windowWidth, windowHeight) = top right) */
export function worldToScreenPos(worldPos: Point): Point {
   // Account for the player position
   const playerRelativePositionX = worldPos.x - cameraPosition.x;
   const playerRelativePositionY = worldPos.y - cameraPosition.y;
   
   // Account for zoom
   return new Point(
      playerRelativePositionX * cameraZoom + halfWindowWidth,
      playerRelativePositionY * cameraZoom + halfWindowHeight
   );
}

export function screenToWorldPos(screenPos: Point): Point {
   const worldX = (screenPos.x - halfWindowWidth) / cameraZoom + cameraPosition.x;
   const worldY = -(screenPos.y - halfWindowHeight) / cameraZoom + cameraPosition.y;
   return new Point(worldX, worldY);
}
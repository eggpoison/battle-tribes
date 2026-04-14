import { Point, Settings, Entity, getTileIndexIncludingEdges, tileIsInWorld } from "webgl-test-shared";
import { halfWindowHeight, halfWindowWidth } from "./webgl";
import { RENDER_CHUNK_EDGE_GENERATION, RENDER_CHUNK_SIZE, WORLD_RENDER_CHUNK_SIZE } from "./rendering/render-chunks";
import Chunk from "./Chunk";
import Layer from "./Layer";
import { entityExists, getCurrentLayer } from "./world";
import { calculateHitboxRenderPosition } from "./rendering/render-part-matrices";
import { Hitbox } from "./hitboxes";
import { TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { debugDisplayState } from "../ui-state/debug-display-state";
import { hoverDebugState } from "../ui-state/hover-debug-state";
import { Tile } from "./Tile";

let cameraSubjectHitbox: Hitbox | null = null;

export const cameraPosition = new Point(0, 0);
/** Used when the player is spectating, for smooth camera movement */
const cameraVelocity = new Point(0, 0);

/** Larger = zoomed in, smaller = zoomed out */
// @INCOMPLETE @HACK rn i have to fiddle around with this manually, make it be calcualted automatically before public testing
// export let cameraZoom = 1.4;
export let cameraZoom = 1;

export let minVisibleX = 0;
export let maxVisibleX = 0;
export let minVisibleY = 0;
export let maxVisibleY = 0;

export let minVisibleTileX = 0;
export let maxVisibleTileX = 0;
export let minVisibleTileY = 0;
export let maxVisibleTileY = 0;

export let minVisibleChunkX = 0;
export let maxVisibleChunkX = 0;
export let minVisibleChunkY = 0;
export let maxVisibleChunkY = 0;

export let minVisibleRenderChunkX = -1;
export let maxVisibleRenderChunkX = -1;
export let minVisibleRenderChunkY = -1;
export let maxVisibleRenderChunkY = -1;

export const cursorScreenPos = new Point(0, 0);
export const cursorWorldPos = new Point(0, 0);

// @Incomplete?
// const registerVisibleChunk = (chunk: Chunk): void => {
//    // createEntityRenderedChunkData(chunk.x, chunk.y);
// }

// // @Incomplete?
// const deregisterVisibleChunk = (chunk: Chunk): void => {
//    // removeEntityRenderedChunkData(chunk.x, chunk.y);
// }

function registerVisibleRenderChunk(renderChunkX: number, renderChunkY: number): void {

}

// @Incomplete: unused
const getChunksFromRange = (layer: Layer, minChunkX: number, maxChunkX: number, minChunkY: number, maxChunkY: number): ReadonlyArray<Chunk> => {
   const chunks: Array<Chunk> = [];
   
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
   const missing: Array<Chunk> = [];
   for (const chunk of chunksB) {
      if (!chunksA.includes(chunk)) {
         missing.push(chunk);
      }
   }
   return missing;
}

export function setCameraZoom(zoom: number): void {
   cameraZoom = zoom;
   debugDisplayState.cameraZoom = zoom;
}

export function setCameraSubject(cameraSubject: Entity | 0): void {
   const transformComponent = TransformComponentArray.tryGetComponent(cameraSubject);
   if (transformComponent !== null) {
      cameraSubjectHitbox = transformComponent.hitboxes[0];
   } else {
      cameraSubjectHitbox = null;
   }
}

export function getCameraSubject(): Entity | null {
   if (cameraSubjectHitbox === null || !entityExists(cameraSubjectHitbox.entity)) {
      return null;
   }
   return cameraSubjectHitbox.entity;
}

const updateCursorWorldPos = (): void => {
   cursorWorldPos.set(screenToWorldPos(cursorScreenPos));

   const layer = getCurrentLayer();
   // @Hack? @Cleanup If the player moves their mouse before the layers are initialised, this function is called with currentLayer as undefined.
   if (layer !== undefined) {
      const tileX = Math.floor(cursorWorldPos.x / Settings.TILE_SIZE);
      const tileY = Math.floor(cursorWorldPos.y / Settings.TILE_SIZE);

      let cursorTargetTile: Tile | null;
      if (tileIsInWorld(tileX, tileY)) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         cursorTargetTile = layer.getTile(tileIndex);
      } else {
         cursorTargetTile = null;
      }

      hoverDebugState.setTile(cursorTargetTile);
   }
}

// Important: This should be the ONLY place that modifies the camera position.
export function setCameraPosition(pos: Point): void {
   cameraPosition.set(pos);
   updateCursorWorldPos(); // (because the cursor world pos depends on the camera position)
}

export function setCameraVelocity(velocity: Point): void {
   cameraVelocity.set(velocity);
}

export function updateCursorScreenPos(e: MouseEvent): void {
   cursorScreenPos.x = e.clientX;
   cursorScreenPos.y = e.clientY;
   updateCursorWorldPos();
}

export function refreshCameraPosition(clientInterp: number, serverInterp: number): void {
   if (cameraSubjectHitbox === null) {
      return;
   }

   const pos = calculateHitboxRenderPosition(cameraSubjectHitbox, clientInterp, serverInterp);
   setCameraPosition(pos);
}

export function refreshCameraView(): void {
   // const previousChunks = getChunksFromRange(layer, this.minVisibleChunkX, this.maxVisibleChunkX, this.minVisibleChunkY, this.maxVisibleChunkY);
   
   minVisibleX = cameraPosition.x - halfWindowWidth / cameraZoom;
   maxVisibleX = cameraPosition.x + halfWindowWidth / cameraZoom;
   minVisibleY = cameraPosition.y - halfWindowHeight / cameraZoom;
   maxVisibleY = cameraPosition.y + halfWindowHeight / cameraZoom;

   minVisibleTileX = Math.floor(minVisibleX / Settings.TILE_SIZE);
   maxVisibleTileX = Math.floor(maxVisibleX / Settings.TILE_SIZE);
   minVisibleTileY = Math.floor(minVisibleY / Settings.TILE_SIZE);
   maxVisibleTileY = Math.floor(maxVisibleY / Settings.TILE_SIZE);
   
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
   minVisibleRenderChunkX = Math.max(Math.floor(minVisibleX / RENDER_CHUNK_UNITS), -RENDER_CHUNK_EDGE_GENERATION);
   maxVisibleRenderChunkX = Math.min(Math.floor(maxVisibleX / RENDER_CHUNK_UNITS), WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION - 1);
   minVisibleRenderChunkY = Math.max(Math.floor(minVisibleY / RENDER_CHUNK_UNITS), -RENDER_CHUNK_EDGE_GENERATION);
   maxVisibleRenderChunkY = Math.min(Math.floor(maxVisibleY / RENDER_CHUNK_UNITS), WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION - 1);
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
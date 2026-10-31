import { _point, assert, Point } from "../../../shared/src/utils";
import { halfWindowHeight, halfWindowWidth } from "./webgl";
import Layer from "./Layer";
import { entityExists, getCurrentLayer } from "./world";
import { getHitboxRenderPart, getMatrixPosition } from "./rendering/render-part-matrices";
import { Hitbox } from "./hitboxes";
import { TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { debugDisplayState } from "../ui-state/debug-display-state";
import { Entity } from "../../../shared/src/entities";
import { Settings } from "../../../shared/src/settings";
import { getTileIndexIncludingEdges } from "../../../shared/src/tiles";
import { RenderChunkVars } from "../../../shared/src/render-chunks";
import { EntityDebugData } from "../../../shared/src/client-server-types";
import { updateDebugInspectorTile } from "../ui/game/dev/tabs/TileInspector";
import { updateDebugInspectorCursor } from "../ui/game/dev/DebugInspector";

let cameraSubjectHitbox: Hitbox | null = null;

export const cameraPosition = new Point(0, 0);
/** Used when the player is spectating, for smooth camera movement */
const cameraVelocity = new Point(0, 0);

/** Larger = zoomed in, smaller = zoomed out */
// @INCOMPLETE @HACK rn i have to fiddle around with this manually, make it be calcualted automatically before public testing
export let cameraZoom = 1.4;
// export let cameraZoom = 1;

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

// @SPEED @Cleanup cursorScreenPos is never used?
export const cursorScreenPos = new Point(0, 0);
export const cursorWorldPos = new Point(0, 0);

// @Locations
// DEV ONLY
export const cursorEntity = 0;
export let entityDebugData: EntityDebugData | null = null;

const visibleRenderChunks: number[] = [];

export function setEntityDebugData(data: EntityDebugData | null): void {
   entityDebugData = data;
}

// @Incomplete?
// const registerVisibleChunk = (chunk: Chunk): void => {
//    // createEntityRenderedChunkData(chunk.x, chunk.y);
// }

// // @Incomplete?
// const deregisterVisibleChunk = (chunk: Chunk): void => {
//    // removeEntityRenderedChunkData(chunk.x, chunk.y);
// }

// function registerVisibleRenderChunk(renderChunkX: number, renderChunkY: number): void {

// }

// @Incomplete: unused
// const getChunksFromRange = (layer: Layer, minChunkX: number, maxChunkX: number, minChunkY: number, maxChunkY: number): readonly Chunk[] => {
//    const chunks: Chunk[] = [];
   
//    for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
//       for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
//          const chunk = layer.getChunk(chunkX, chunkY);
//          chunks.push(chunk);
//       }
//    }

//    return chunks;
// }

// @Incomplete: unused
/** Gets all the chunks in chunks B missing from chunks A */
// const getMissingChunks = (chunksA: readonly Chunk[], chunksB: readonly Chunk[]): readonly Chunk[] => {
//    const missing: Chunk[] = [];
//    for (const chunk of chunksB) {
//       if (!chunksA.includes(chunk)) {
//          missing.push(chunk);
//       }
//    }
//    return missing;
// }

export function addRenderChunkToVisibleArray(renderChunkIndex: number): void {
   assert(visibleRenderChunks.indexOf(renderChunkIndex) === -1);
   visibleRenderChunks.push(renderChunkIndex);
}

export function removeRenderChunkFromVisibleArray(renderChunkIndex: number): void {
   const idx = visibleRenderChunks.indexOf(renderChunkIndex);
   assert(idx !== -1);
   visibleRenderChunks.splice(idx, 1);
}

export function getVisibleRenderChunks(): readonly number[] {
   return visibleRenderChunks;
}

export function setCameraZoom(zoom: number): void {
   cameraZoom = zoom;
   debugDisplayState.cameraZoom = zoom;
}

export function setCameraSubject(cameraSubject: Entity): void {
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
   const previousX = cursorWorldPos.x;
   const previousY = cursorWorldPos.y;
   
   const previousTileX = Math.floor(cursorWorldPos.x / Settings.TILE_SIZE);
   const previousTileY = Math.floor(cursorWorldPos.y / Settings.TILE_SIZE);

   cursorWorldPos.set(screenToWorldPos(cursorScreenPos));

   if (previousX !== cursorWorldPos.x || previousY !== cursorWorldPos.y) {
      updateDebugInspectorCursor(cursorWorldPos.x, cursorWorldPos.y);
   }
   
   const layer = getCurrentLayer();
   // @Hack? @Cleanup If the player moves their mouse before the layers are initialised, this function is called with currentLayer as undefined.
   if ((layer as Layer | undefined) !== undefined) {
      const tileX = Math.floor(cursorWorldPos.x / Settings.TILE_SIZE);
      const tileY = Math.floor(cursorWorldPos.y / Settings.TILE_SIZE);

      if ((tileX !== previousTileX || tileY !== previousTileY) && layer.hasTileXY(tileX, tileY)) {
         const tile = layer.getTileXY(tileX, tileY);
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         updateDebugInspectorTile(layer, tile, tileX, tileY, tileIndex);
      }
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

export function refreshCameraPosition(): void {
   if (cameraSubjectHitbox === null) {
      return;
   }

   const subjectRenderPart = getHitboxRenderPart(cameraSubjectHitbox);
   getMatrixPosition(subjectRenderPart.modelMatrix)
   setCameraPosition(_point);
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
   minVisibleRenderChunkX = Math.max(Math.floor(minVisibleX / RenderChunkVars.RENDER_CHUNK_UNITS), -RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION);
   maxVisibleRenderChunkX = Math.min(Math.floor(maxVisibleX / RenderChunkVars.RENDER_CHUNK_UNITS), RenderChunkVars.WORLD_RENDER_CHUNK_SIZE + RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION - 1);
   minVisibleRenderChunkY = Math.max(Math.floor(minVisibleY / RenderChunkVars.RENDER_CHUNK_UNITS), -RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION);
   maxVisibleRenderChunkY = Math.min(Math.floor(maxVisibleY / RenderChunkVars.RENDER_CHUNK_UNITS), RenderChunkVars.WORLD_RENDER_CHUNK_SIZE + RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION - 1);
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
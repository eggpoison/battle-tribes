import { _point, assert, Point } from "../../../shared/src/utils";
import { halfWindowHeight, halfWindowWidth } from "./webgl";
import Layer from "./Layer";
import { entityExists, getCurrentLayer, layers } from "./world";
import { calculateHitboxRenderPosition } from "./rendering/render-part-matrices";
import { Hitbox } from "./hitboxes";
import { TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { debugDisplayState } from "../ui-state/debug-display-state";
import { hoverDebugState } from "../ui-state/hover-debug-state";
import { Tile } from "./Tile";
import { Entity } from "../../../shared/src/entities";
import { Settings } from "../../../shared/src/settings";
import { tileIsInWorld, getTileIndexIncludingEdges } from "../../../shared/src/tiles";
import { getRenderChunkX, getRenderChunkY, RenderChunkVars } from "../../../shared/src/render-chunks";
import { destroyRenderChunk, getRenderChunkMaxTileX, getRenderChunkMaxTileY, getRenderChunkMinTileX, getRenderChunkMinTileY } from "./rendering/render-chunks";
import { removeTileFromWorld } from "./networking/packet-receiving";

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

const visibleRenderChunks: number[] = [];

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
   cursorWorldPos.set(screenToWorldPos(cursorScreenPos));

   const layer = getCurrentLayer();
   // @Hack? @Cleanup If the player moves their mouse before the layers are initialised, this function is called with currentLayer as undefined.
   if ((layer as Layer | undefined) !== undefined) {
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

   calculateHitboxRenderPosition(cameraSubjectHitbox, clientInterp, serverInterp);
   setCameraPosition(_point);
}

const renderChunkHasEntities = (layer: Layer, renderChunkX: number, renderChunkY: number): boolean => {
   const minTileX = getRenderChunkMinTileX(renderChunkX);
   const maxTileX = getRenderChunkMaxTileX(renderChunkX);
   const minTileY = getRenderChunkMinTileY(renderChunkY);
   const maxTileY = getRenderChunkMaxTileY(renderChunkY);
   
   const minChunkX = Math.floor(minTileX / Settings.CHUNK_SIZE);
   const maxChunkX = Math.floor(maxTileX / Settings.CHUNK_SIZE);
   const minChunkY = Math.floor(minTileY / Settings.CHUNK_SIZE);
   const maxChunkY = Math.floor(maxTileY / Settings.CHUNK_SIZE);
   for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         if (chunk.entities.length > 0) {
            return true;
         }
      }
   }

   return false;
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

   const displayAspectRatio = screen.width / screen.height;

   const viewWidth = Settings.MAX_VIEW_HEIGHT * displayAspectRatio;
   const viewHeight = Settings.MAX_VIEW_HEIGHT;
   
   // Look for render chunks far away enough to remove
   const minNearbyRenderChunkX = Math.max(Math.floor((cameraPosition.x - viewWidth * 0.5 - Settings.PLAYER_VIEW_PADDING) / RenderChunkVars.RENDER_CHUNK_UNITS), -RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION);
   const maxNearbyRenderChunkX = Math.min(Math.floor((cameraPosition.x + viewWidth * 0.5 + Settings.PLAYER_VIEW_PADDING) / RenderChunkVars.RENDER_CHUNK_UNITS), RenderChunkVars.WORLD_RENDER_CHUNK_SIZE + RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION - 1);
   const minNearbyRenderChunkY = Math.max(Math.floor((cameraPosition.y - viewHeight * 0.5 - Settings.PLAYER_VIEW_PADDING) / RenderChunkVars.RENDER_CHUNK_UNITS), -RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION);
   const maxNearbyRenderChunkY = Math.min(Math.floor((cameraPosition.y + viewHeight * 0.5 + Settings.PLAYER_VIEW_PADDING) / RenderChunkVars.RENDER_CHUNK_UNITS), RenderChunkVars.WORLD_RENDER_CHUNK_SIZE + RenderChunkVars.RENDER_CHUNK_EDGE_GENERATION - 1);
   outer:
   for (let i = 0; i < visibleRenderChunks.length; i++) {
      const renderChunkIndex = visibleRenderChunks[i];
      const renderChunkX = getRenderChunkX(renderChunkIndex);
      const renderChunkY = getRenderChunkY(renderChunkIndex);

      // Important that this check is always less strict than the one which removes entities, otherwise entities will be sitting on tile-less chunks and the game will crash.
      if (renderChunkX < minNearbyRenderChunkX || renderChunkX > maxNearbyRenderChunkX || renderChunkY < minNearbyRenderChunkY || renderChunkY > maxNearbyRenderChunkY) {
         // @HACK the entity removal process is sent by the server, and so lags behind this client-led render chunk removal. Since they both operate on the same bounds naturally there will be times where the player unloads a render chunk while there are still entities there, so this is here to fix
         for (const layer of layers) {
            if (renderChunkHasEntities(layer, renderChunkX, renderChunkY)) {
               continue outer;
            }
         }

         console.log("delete",renderChunkX,renderChunkY);
         
         for (const layer of layers) {
            destroyRenderChunk(layer, renderChunkIndex);

            const minTileX = getRenderChunkMinTileX(renderChunkX);
            const maxTileX = getRenderChunkMaxTileX(renderChunkX);
            const minTileY = getRenderChunkMinTileY(renderChunkY);
            const maxTileY = getRenderChunkMaxTileY(renderChunkY);
            for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
               for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
                  const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
                  removeTileFromWorld(layer, tileIndex);
               }
            }
         }

         visibleRenderChunks.splice(i, 1);
         i--;
      }
   }
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
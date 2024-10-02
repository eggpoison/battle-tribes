import { Settings } from "battletribes-shared/settings";
import { halfWindowHeight, halfWindowWidth } from "./webgl";
import CLIENT_SETTINGS from "./client-settings";
import Game from "./Game";
import Camera from "./Camera";
import { updateDebugInfoEntity, updateDebugInfoTile } from "./components/game/dev/DebugInfo";
import { isDev } from "./utils";
import { Tile } from "./Tile";
import Entity from "./Entity";
import { updateCursorTooltip } from "./components/game/dev/CursorTooltip";
import { TransformComponentArray } from "./entity-components/TransformComponent";
import Player from "./entities/Player";
import { getTileIndexIncludingEdges, tileIsInWorld } from "./Layer";
import { getEntityByID, getEntityLayer } from "./world";

export let cursorX: number | null = null;
export let cursorY: number | null = null;

export function calculateCursorWorldPositionX(cursorX: number): number | null {
   if (cursorX === null) return null;
   
   const worldX = (cursorX - halfWindowWidth) / Camera.zoom + Camera.position.x;
   if (worldX < 0 || worldX >= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE) {
      return null;
   }
   return worldX;
}

export function calculateCursorWorldPositionY(cursorY: number): number | null {
   if (cursorY === null) return null;
   
   const worldY = (-cursorY + halfWindowHeight) / Camera.zoom + Camera.position.y;
   if (worldY < 0 || worldY >= Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE) {
      return null;
   }
   return worldY;
}

export function handleMouseMovement(e: MouseEvent): void {
   cursorX = e.clientX;
   cursorY = e.clientY;
}

/**
 * Finds the entity the user is hovering over.
 */
export function getMouseTargetTile(): Tile | null {
   if (Game.cursorPositionX === null || Game.cursorPositionY === null) return null;

   const tileX = Math.floor(Game.cursorPositionX / Settings.TILE_SIZE);
   const tileY = Math.floor(Game.cursorPositionY / Settings.TILE_SIZE);

   if (tileIsInWorld(tileX, tileY)) {
      const playerLayer = getEntityLayer(Player.instance!.id);
      const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
      return playerLayer.getTile(tileIndex);
   }
   return null;
}

/**
 * Finds the entity the user is hovering over.
 */
// @Speed
// @Cleanup: Use the highlighted entity system instead of having this custom function
export function getMouseTargetEntity(): Entity | null {
   if (Game.cursorPositionX === null || Game.cursorPositionY === null) return null;

   const playerLayer = getEntityLayer(Player.instance!.id);
   
   const minChunkX = Math.max(Math.min(Math.floor((Game.cursorPositionX - CLIENT_SETTINGS.CURSOR_TOOLTIP_HOVER_RANGE / Camera.zoom) / Settings.CHUNK_SIZE / Settings.TILE_SIZE), Settings.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((Game.cursorPositionX + CLIENT_SETTINGS.CURSOR_TOOLTIP_HOVER_RANGE / Camera.zoom) / Settings.CHUNK_SIZE / Settings.TILE_SIZE), Settings.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((Game.cursorPositionY - CLIENT_SETTINGS.CURSOR_TOOLTIP_HOVER_RANGE / Camera.zoom) / Settings.CHUNK_SIZE / Settings.TILE_SIZE), Settings.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((Game.cursorPositionY + CLIENT_SETTINGS.CURSOR_TOOLTIP_HOVER_RANGE / Camera.zoom) / Settings.CHUNK_SIZE / Settings.TILE_SIZE), Settings.BOARD_SIZE - 1), 0);

   let closestEntity: Entity | null = null;
   let minDistance = Number.MAX_SAFE_INTEGER;
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = playerLayer.getChunk(chunkX, chunkY);
         for (const entityID of chunk.nonGrassEntities) {
            const entity = getEntityByID(entityID)!;

            const transformComponent = TransformComponentArray.getComponent(entity.id);
            
            const distanceFromCursor = Math.sqrt(Math.pow(Game.cursorPositionX - transformComponent.position.x, 2) + Math.pow(Game.cursorPositionY - transformComponent.position.y, 2))
            if (distanceFromCursor <= CLIENT_SETTINGS.CURSOR_TOOLTIP_HOVER_RANGE && distanceFromCursor < minDistance) {
               closestEntity = entity;
               minDistance = distanceFromCursor;
            }
         }
      }
   }

   return closestEntity;
}

// @Cleanup: Function name. This doesn't just render the cursor tooltip, it updates debug info.
// Maybe seperate this into two functions?
export function renderCursorTooltip(): void {
   if (Game.cursorPositionX === null || Game.cursorPositionY === null) {
      if (isDev()) {
         updateDebugInfoEntity(null);
      }
      return;
   }

   const targetTile = getMouseTargetTile();
   updateDebugInfoTile(targetTile);
 
   const targetEntity = getMouseTargetEntity();

   // If there is no target, hide the tooltip
   if (targetEntity === null) {
      if (isDev()) {
         updateDebugInfoEntity(null);
      }
      return;
   } else {
      updateDebugInfoEntity(targetEntity);
   }

   // Update the cursor tooltip
   const entityScreenPositionX = Camera.calculateXScreenPos(targetEntity.renderPosition.x);
   const entityScreenPositionY = Camera.calculateYScreenPos(targetEntity.renderPosition.y);

   const debugData = Game.getEntityDebugData();
   if (debugData === null || targetEntity.id === debugData.entityID) {
      updateCursorTooltip(debugData, entityScreenPositionX, entityScreenPositionY);
   }
}
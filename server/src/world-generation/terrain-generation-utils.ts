import { Settings } from "battletribes-shared/settings";
import { SubtileType } from "battletribes-shared/tiles";

// @Cleanup: location? should this be in the layer file as it might be used outside of terrain generation (during the game loop)?
export function getSubtileIndex(subtileX: number, subtileY: number): number {
   return (subtileY + Settings.EDGE_GENERATION_DISTANCE * 4) * Settings.FULL_BOARD_DIMENSIONS * 4 + subtileX + Settings.EDGE_GENERATION_DISTANCE * 4;
}

export function getSubtileX(subtileIndex: number): number {
   return subtileIndex % (Settings.FULL_BOARD_DIMENSIONS * 4) - Settings.EDGE_GENERATION_DISTANCE * 4;
}

export function getSubtileY(subtileIndex: number): number {
   return Math.floor(subtileIndex / (Settings.FULL_BOARD_DIMENSIONS * 4)) - Settings.EDGE_GENERATION_DISTANCE * 4;
}

export function setWallInSubtiles(subtileTypes: Float32Array, tileX: number, tileY: number, subtileType: SubtileType): void {
   const startSubtileX = tileX * 4;
   const startSubtileY = tileY * 4;
   
   for (let subtileX = startSubtileX; subtileX < startSubtileX + 4; subtileX++) {
      for (let subtileY = startSubtileY; subtileY < startSubtileY + 4; subtileY++) {
         const idx = getSubtileIndex(subtileX, subtileY);
         subtileTypes[idx] = subtileType;
      }
   }
}

export function tileHasWallSubtile(subtileTypes: Float32Array, tileX: number, tileY: number): boolean {
   const startSubtileX = tileX * 4;
   const startSubtileY = tileY * 4;
   
   for (let subtileX = startSubtileX; subtileX < startSubtileX + 4; subtileX++) {
      for (let subtileY = startSubtileY; subtileY < startSubtileY + 4; subtileY++) {
         const idx = getSubtileIndex(subtileX, subtileY);
         if (subtileTypes[idx] !== SubtileType.none) {
            return true;
         }
      }
   }

   return false;
}
import Layer from "./Layer";
import { Settings } from "../../shared/src/settings";
import { TileType } from "../../shared/src/tiles";
import { getTileIndexIncludingEdges, getTileX, getTileY, tileIsInWorld } from "../../shared/src/utils";

export const surfaceLayer = new Layer(0);
export const undergroundLayer = new Layer(1);
export const layers = [surfaceLayer, undergroundLayer];

// @Location
export function addLayerBuildingBlockingTiles(layer: Layer): void {
   // Initially find all tiles below a dropdown tile
   for (let tileX = 0; tileX < Settings.WORLD_SIZE_TILES; tileX++) {
      for (let tileY = 0; tileY < Settings.WORLD_SIZE_TILES; tileY++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         if (surfaceLayer.getTileType(tileIndex) === TileType.dropdown) {
            layer.buildingBlockingTiles.add(tileIndex);
         }
      }
   }

   // Expand the tiles to their neighbours
   for (let i = 0; i < 2; i++) {
      const tilesToExpand = Array.from(layer.buildingBlockingTiles);

      for (const tileIndex of tilesToExpand) {
         const tileX = getTileX(tileIndex);
         const tileY = getTileY(tileIndex);
         
         if (tileIsInWorld(tileX + 1, tileY)) {
            layer.buildingBlockingTiles.add(getTileIndexIncludingEdges(tileX + 1, tileY));
         }
         if (tileIsInWorld(tileX, tileY + 1)) {
            layer.buildingBlockingTiles.add(getTileIndexIncludingEdges(tileX, tileY + 1));
         }
         if (tileIsInWorld(tileX - 1, tileY)) {
            layer.buildingBlockingTiles.add(getTileIndexIncludingEdges(tileX - 1, tileY));
         }
         if (tileIsInWorld(tileX, tileY - 1)) {
            layer.buildingBlockingTiles.add(getTileIndexIncludingEdges(tileX, tileY - 1));
         }
      }
   }
}
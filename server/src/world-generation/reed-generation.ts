import { Settings } from "webgl-test-shared/dist/settings";
import { TileType } from "webgl-test-shared/dist/tiles";
import Board from "../Board";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { createReedConfig } from "../entities/reed";
import { createEntityFromConfig } from "../Entity";
import { WaterTileGenerationInfo } from "./river-generation";
import { distance } from "webgl-test-shared/dist/utils";

const enum Vars {
   MAX_DENSITY_PER_TILE = 5
}

// @Speed
const getClosestRiverMainTile = (x: number, y: number, riverMainTiles: ReadonlyArray<WaterTileGenerationInfo>): WaterTileGenerationInfo => {
   const tileX = x / Settings.TILE_SIZE;
   const tileY = y / Settings.TILE_SIZE;
   
   let minDistanceTiles = 999;
   let closestTile!: WaterTileGenerationInfo;
   for (const tileGenerationInfo of riverMainTiles) {
      const distanceTiles = distance(tileX, tileY, tileGenerationInfo.tileX, tileGenerationInfo.tileY);

      if (distanceTiles < minDistanceTiles) {
         minDistanceTiles = distanceTiles;
         closestTile = tileGenerationInfo;
      }
   }
   return closestTile;
}

export function generateReeds(riverMainTiles: ReadonlyArray<WaterTileGenerationInfo>): void {
   // @Incomplete: generate in edges
   for (let tileX = 0; tileX < Settings.BOARD_DIMENSIONS; tileX++) {
      for (let tileY = 0; tileY < Settings.BOARD_DIMENSIONS; tileY++) {
         const tile = Board.getTile(tileX, tileY);
         if (tile.type !== TileType.water) {
            continue;
         }

         for (let i = 0; i < Vars.MAX_DENSITY_PER_TILE; i++) {
            const x = (tile.x + Math.random()) * Settings.TILE_SIZE;
            const y = (tile.y + Math.random()) * Settings.TILE_SIZE;

            const closestMainTile = getClosestRiverMainTile(x, y, riverMainTiles);

            // @Speed @Copynpaste
            const distanceTiles = distance(x / Settings.TILE_SIZE, y / Settings.TILE_SIZE, closestMainTile.tileX, closestMainTile.tileY);
            if (Math.random() >= distanceTiles / Math.SQRT2) {
               continue;
            }

            const config = createReedConfig();
            config[ServerComponentType.transform].position.x = x;
            config[ServerComponentType.transform].position.y = y;
            createEntityFromConfig(config);
         }
      }
   }
}
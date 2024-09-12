import { Settings } from "battletribes-shared/settings";
import { TileType } from "battletribes-shared/tiles";
import Board from "../Board";
import { createGrassStrandConfig } from "../entities/grass-strand";
import { ServerComponentType } from "battletribes-shared/components";
import { createEntityFromConfig } from "../Entity";
import { distance, TileIndex } from "battletribes-shared/utils";

const enum Vars {
   /** Average number of grass strands per tile in a fully humidified area. */
   MAX_STRAND_DENSITY = 25
}

const getGrassDensityMultiplier = (tileIndex: TileIndex): number => {
   const humidity = Board.tileHumidities[tileIndex];
   return humidity * 0.7 + 0.3;
}

/** Calculates the distance in tiles of a position from a water tile */
const getAdjacentWaterDist = (tileX: number, tileY: number, grassTileX: number, grassTileY: number): number => {
   if (!Board.tileIsInBoardIncludingEdges(tileX, tileY)) {
      return 1;
   }
   
   if (Board.getTileType(tileX, tileY) !== TileType.water) {
      return 1;
   }

   const xDistMin = Math.abs(tileX - grassTileX);
   const xDistMax = Math.abs(tileX + 1 - grassTileX);
   const yDistMin = Math.abs(tileY - grassTileY);
   const yDistMax = Math.abs(tileY + 1 - grassTileY);

   return Math.min(xDistMin, xDistMax, yDistMin, yDistMax);
}

const getDiagonalWaterDist = (tileX: number, tileY: number, grassTileX: number, grassTileY: number): number => {
   if (!Board.tileIsInBoardIncludingEdges(tileX, tileY)) {
      return 1;
   }
   
   if (Board.getTileType(tileX, tileY) !== TileType.water) {
      return 1;
   }

   const xDistMin = distance(tileX, tileY, grassTileX, grassTileY);
   const xDistMax = distance(tileX + 1, tileY, grassTileX, grassTileY);
   const yDistMin = distance(tileX, tileY + 1, grassTileX, grassTileY);
   const yDistMax = distance(tileX + 1, tileY + 1, grassTileX, grassTileY);

   return Math.min(xDistMin, xDistMax, yDistMin, yDistMax);
}

const isValidGrassPosition = (x: number, y: number): boolean => {
   const grassTileX = x / Settings.TILE_SIZE;
   const grassTileY = y / Settings.TILE_SIZE;

   const flooredGrassTileX = Math.floor(grassTileX);
   const flooredGrassTileY = Math.floor(grassTileY);
   
   // Don't generate on river gravel
   const topDist = getAdjacentWaterDist(flooredGrassTileX, flooredGrassTileY + 1, grassTileX, grassTileY);
   const rightDist = getAdjacentWaterDist(flooredGrassTileX + 1, flooredGrassTileY, grassTileX, grassTileY);
   const bottomDist = getAdjacentWaterDist(flooredGrassTileX, flooredGrassTileY - 1, grassTileX, grassTileY);
   const leftDist = getAdjacentWaterDist(flooredGrassTileX - 1, flooredGrassTileY, grassTileX, grassTileY);

   const topRightDist = getDiagonalWaterDist(flooredGrassTileX + 1, flooredGrassTileY + 1, grassTileX, grassTileY);
   const bottomRightDist = getDiagonalWaterDist(flooredGrassTileX + 1, flooredGrassTileY - 1, grassTileX, grassTileY);
   const topLeftDist = getDiagonalWaterDist(flooredGrassTileX - 1, flooredGrassTileY + 1, grassTileX, grassTileY);
   const bottomLeftDist = getDiagonalWaterDist(flooredGrassTileX - 1, flooredGrassTileY - 1, grassTileX, grassTileY);

   const dist = Math.min(topDist, rightDist, bottomDist, leftDist, topRightDist, bottomRightDist, topLeftDist, bottomLeftDist);
   return dist > 0.25;
}

export function generateGrassStrands(): void {
   // @Incomplete: generate in edges
   for (let tileX = 0; tileX < Settings.BOARD_DIMENSIONS; tileX++) {
      for (let tileY = 0; tileY < Settings.BOARD_DIMENSIONS; tileY++) {
         const tileIndex = Board.getTileIndexIncludingEdges(tileX, tileY);
         if (Board.tileTypes[tileIndex] !== TileType.grass) {
            continue;
         }

         let density = Vars.MAX_STRAND_DENSITY * getGrassDensityMultiplier(tileIndex);
         if (Math.random() < density % 1) {
            density = Math.ceil(density);
         } else {
            density = Math.floor(density);
         }

         for (let i = 0; i < density; i++) {
            const x = (tileX + Math.random()) * Settings.TILE_SIZE;
            const y = (tileY + Math.random()) * Settings.TILE_SIZE;

            if (!isValidGrassPosition(x, y)) {
               continue;
            }

            const config = createGrassStrandConfig();
            config[ServerComponentType.transform].position.x = x;
            config[ServerComponentType.transform].position.y = y;
            createEntityFromConfig(config);
         }
      }
   }
}
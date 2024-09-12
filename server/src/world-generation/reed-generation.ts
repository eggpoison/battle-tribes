import { Settings } from "battletribes-shared/settings";
import { TileType } from "battletribes-shared/tiles";
import Board from "../Board";
import { ServerComponentType } from "battletribes-shared/components";
import { createReedConfig } from "../entities/reed";
import { createEntityFromConfig } from "../Entity";
import { WaterTileGenerationInfo } from "./river-generation";
import { distance } from "battletribes-shared/utils";
import { generateOctavePerlinNoise, generatePerlinNoise } from "../perlin-noise";
import { isTooCloseToSteppingStone } from "../Chunk";

const enum Vars {
   MAX_DENSITY_PER_TILE = 35
}

// @Speed
const getClosestRiverMainTile = (x: number, y: number, riverMainTiles: ReadonlyArray<WaterTileGenerationInfo>): WaterTileGenerationInfo => {
   const tileX = x / Settings.TILE_SIZE;
   const tileY = y / Settings.TILE_SIZE;
   
   let minDistanceTiles = 999;
   let closestTile!: WaterTileGenerationInfo;
   for (const tileGenerationInfo of riverMainTiles) {
      const distanceTiles = distance(tileX, tileY, tileGenerationInfo.tileX + 0.5, tileGenerationInfo.tileY + 0.5);

      if (distanceTiles < minDistanceTiles) {
         minDistanceTiles = distanceTiles;
         closestTile = tileGenerationInfo;
      }
   }
   return closestTile;
}

export function generateReeds(riverMainTiles: ReadonlyArray<WaterTileGenerationInfo>): void {
   const probabilityWeightMap1 = generateOctavePerlinNoise(Settings.FULL_BOARD_DIMENSIONS, Settings.FULL_BOARD_DIMENSIONS, 5, 3, 1.5, 0.75);
   
   // @Incomplete: generate in edges
   for (let tileX = 0; tileX < Settings.BOARD_DIMENSIONS; tileX++) {
      for (let tileY = 0; tileY < Settings.BOARD_DIMENSIONS; tileY++) {
         if (Board.getTileType(tileX, tileY) !== TileType.water) {
            continue;
         }

         for (let i = 0; i < Vars.MAX_DENSITY_PER_TILE; i++) {
            const x = (tileX + Math.random()) * Settings.TILE_SIZE;
            const y = (tileY + Math.random()) * Settings.TILE_SIZE;

            if (isTooCloseToSteppingStone(x, y, 13)) {
               continue;
            }

            const closestMainTile = getClosestRiverMainTile(x, y, riverMainTiles);

            // @Speed @Copynpaste
            const distanceTiles = distance(x / Settings.TILE_SIZE, y / Settings.TILE_SIZE, closestMainTile.tileX + 0.5, closestMainTile.tileY + 0.5);
            let successProbability = (distanceTiles - 0.3) * 1;
            successProbability = successProbability * successProbability * successProbability;

            let weight = probabilityWeightMap1[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];
            weight = weight * 2 - 1;
            if (weight <= 0) {
               continue;
            }
            successProbability *= weight * weight;

            if (Math.random() >= successProbability) {
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
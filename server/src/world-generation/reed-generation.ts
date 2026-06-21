import { Biome } from "../../../shared/dist/biomes.js";
import { EntityType } from "../../../shared/dist/entities.js";
import { Settings } from "../../../shared/dist/settings.js";
import { TileType } from "../../../shared/dist/tiles.js";
import { distance, getTileIndexIncludingEdges } from "../../../shared/dist/utils.js";
import { createReedConfig } from "../entities/reed.js";
import { WaterTileGenerationInfo } from "./river-generation.js";
import { generateOctavePerlinNoise } from "../perlin-noise.js";
import Layer from "../Layer.js";
import { createEntityImmediate, getEntityType } from "../world.js";
import { getEntitiesInRange } from "../ai-shared.js";

const enum Vars {
   MAX_DENSITY_PER_TILE = 35
}

// @Speed
const getClosestRiverMainTile = (x: number, y: number, riverMainTiles: readonly WaterTileGenerationInfo[]): WaterTileGenerationInfo => {
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

export function generateReeds(surfaceLayer: Layer, riverMainTiles: readonly WaterTileGenerationInfo[]): void {
   const probabilityWeightMap1 = generateOctavePerlinNoise(Settings.FULL_WORLD_SIZE_TILES, Settings.FULL_WORLD_SIZE_TILES, 5, 3, 1.5, 0.75);
   
   // @Incomplete: generate in edges
   for (let tileY = 0; tileY < Settings.WORLD_SIZE_TILES; tileY++) {
      for (let tileX = 0; tileX < Settings.WORLD_SIZE_TILES; tileX++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         if (surfaceLayer.getTileType(tileIndex) !== TileType.water || surfaceLayer.getTileBiome(tileIndex) !== Biome.river) {
            continue;
         }

         for (let i = 0; i < Vars.MAX_DENSITY_PER_TILE; i++) {
            const x = (tileX + Math.random()) * Settings.TILE_SIZE;
            const y = (tileY + Math.random()) * Settings.TILE_SIZE;

            const testEntities = getEntitiesInRange(surfaceLayer, x, y, 13);

            let isTooCloseToSteppingStone = false;
            for (const entity of testEntities) {
               if (getEntityType(entity) === EntityType.riverSteppingStone) {
                  isTooCloseToSteppingStone = true;
                  break;
               }
            }
            if (isTooCloseToSteppingStone) {
               continue;
            }

            const closestMainTile = getClosestRiverMainTile(x, y, riverMainTiles);

            // @Speed @Copynpaste
            const distanceTiles = distance(x / Settings.TILE_SIZE, y / Settings.TILE_SIZE, closestMainTile.tileX + 0.5, closestMainTile.tileY + 0.5);
            let successProbability = (distanceTiles - 0.3) * 1;
            successProbability = successProbability * successProbability * successProbability;

            let weight = probabilityWeightMap1[tileIndex];
            weight = weight * 2 - 1;
            if (weight <= 0) {
               continue;
            }
            successProbability *= weight * weight;

            if (Math.random() >= successProbability) {
               continue;
            }
            const config = createReedConfig(x, y, 0);
            createEntityImmediate(config, surfaceLayer);
         }
      }
   }
}
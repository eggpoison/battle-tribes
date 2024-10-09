import { RiverSteppingStoneData, WaterRockData } from "../../../shared/src/client-server-types";
import { Settings } from "../../../shared/src/settings";
import { Biome, TileType } from "../../../shared/src/tiles";
import { distance, smoothstep } from "../../../shared/src/utils";
import { getTileIndexIncludingEdges } from "../Layer";
import { generateOctavePerlinNoise } from "../perlin-noise";
import { WaterTileGenerationInfo } from "./river-generation";
import { TerrainGenerationInfo } from "./surface-terrain-generation";

const enum Vars {
   DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE = 9
}

const spreadDropdownCloseness = (dropdownTileX: number, dropdownTileY: number, closenessArray: Float32Array): void => {
   const minTileX = Math.max(dropdownTileX - Vars.DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE, -Settings.EDGE_GENERATION_DISTANCE);
   const maxTileX = Math.min(dropdownTileX + Vars.DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE, Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE - 1);
   const minTileY = Math.max(dropdownTileY - Vars.DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE, -Settings.EDGE_GENERATION_DISTANCE);
   const maxTileY = Math.min(dropdownTileY + Vars.DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE, Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE - 1);
   
   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         let distTiles = distance(tileX, tileY, dropdownTileX, dropdownTileY);
         if (distTiles > Vars.DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE) {
            distTiles = Vars.DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE;
         }

         let closeness = Vars.DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE - distTiles;
         closeness /= Vars.DROPDOWN_TILE_WEIGHT_REDUCTION_RANGE;
         closeness = smoothstep(closeness);

         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         if (closeness > closenessArray[tileIndex]) {
            closenessArray[tileIndex] = closeness;
         }
      }
   }
}

const generateDropdownClosenessArray = (surfaceTerrainGenerationInfo: TerrainGenerationInfo): Float32Array => {
   const closenessArray = new Float32Array(Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS);
   
   for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
      for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         const tileType = surfaceTerrainGenerationInfo.tileTypes[tileIndex];
         if (tileType === TileType.dropdown) {
            spreadDropdownCloseness(tileX, tileY, closenessArray);
         }
      }
   }

   return closenessArray;
}

export function generateUndergroundTerrain(surfaceTerrainGenerationInfo: TerrainGenerationInfo): TerrainGenerationInfo {
   const tileBiomes = new Float32Array(Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS);
   const tileTypes = new Float32Array(Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS);
   const tileIsWalls = new Float32Array(Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS);
   const riverFlowDirections = new Float32Array(Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS);
   const tileTemperatures = new Float32Array(Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS);
   const tileHumidities = new Float32Array(Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS);

   const weightMap = generateOctavePerlinNoise(Settings.FULL_BOARD_DIMENSIONS, Settings.FULL_BOARD_DIMENSIONS, 20, 12, 1.75, 0.6);
   const dropdownClosenessArray = generateDropdownClosenessArray(surfaceTerrainGenerationInfo);
   
   for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
      for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         
         let weight = weightMap[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];

         const dropdownCloseness = dropdownClosenessArray[tileIndex];
         weight *= 1 - dropdownCloseness;
         
         tileBiomes[tileIndex] = Biome.mountains;

         if (weight > 0.55) {
            tileTypes[tileIndex] = TileType.stoneWall;
            tileIsWalls[tileIndex] = 1;
         } else {
            tileTypes[tileIndex] = TileType.stone;
            tileIsWalls[tileIndex] = 0;
         }
      }
   }
   
   const riverMainTiles = new Array<WaterTileGenerationInfo>();
   const waterRocks = new Array<WaterRockData>();
   const riverSteppingStones = new Array<RiverSteppingStoneData>();
   
   return {
      tileTypes: tileTypes,
      tileBiomes: tileBiomes,
      tileIsWalls: tileIsWalls,
      riverFlowDirections: riverFlowDirections,
      tileTemperatures: tileTemperatures,
      tileHumidities: tileHumidities,
      riverMainTiles: riverMainTiles,
      waterRocks: waterRocks,
      riverSteppingStones: riverSteppingStones,
   };
}
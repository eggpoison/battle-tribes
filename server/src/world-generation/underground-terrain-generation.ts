import { RiverSteppingStoneData, WaterRockData } from "../../../shared/src/client-server-types";
import { Settings } from "../../../shared/src/settings";
import { Biome, TileType } from "../../../shared/src/tiles";
import { WaterTileGenerationInfo } from "./river-generation";
import { TerrainGenerationInfo } from "./surface-terrain-generation";

export function generateUndergroundTerrain(): TerrainGenerationInfo {
   const tileBiomes = new Float32Array(Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS);
   const tileTypes = new Float32Array(Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS);
   const tileIsWalls = new Float32Array(Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS);
   const riverFlowDirections = new Float32Array(Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS);
   const tileTemperatures = new Float32Array(Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS);
   const tileHumidities = new Float32Array(Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS);

   for (let i = 0; i < Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS; i++) {
      tileBiomes[i] = Biome.mountains;
      tileTypes[i] = TileType.stone;
      tileIsWalls[i] = 0;
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
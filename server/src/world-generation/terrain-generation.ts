import { WaterRockData, RiverSteppingStoneData, GrassTileInfo, DecorationInfo, RiverFlowDirections } from "webgl-test-shared/dist/client-server-types";
import { Biome, TileInfo, TileType } from "webgl-test-shared/dist/tiles";
import { smoothstep } from "webgl-test-shared/dist/utils";
import { Settings } from "webgl-test-shared/dist/settings";
import { generateOctavePerlinNoise, generatePerlinNoise, generatePointPerlinNoise } from "../perlin-noise";
import BIOME_GENERATION_INFO, { BIOME_GENERATION_PRIORITY, BiomeSpawnRequirements, TileGenerationInfo } from "./terrain-generation-info";
import Tile from "../Tile";
import { WaterTileGenerationInfo, generateRiverFeatures, generateRiverTiles } from "./river-generation";
import OPTIONS from "../options";
import { generateDecorations } from "./decoration-generation";

const HEIGHT_NOISE_SCALE = 50;
const TEMPERATURE_NOISE_SCALE = 120;
const HUMIDITY_NOISE_SCALE = 30;

const matchesBiomeRequirements = (generationInfo: BiomeSpawnRequirements, height: number, temperature: number, humidity: number): boolean => {
   // Height
   if (typeof generationInfo.minHeight !== "undefined" && height < generationInfo.minHeight) return false;
   if (typeof generationInfo.maxHeight !== "undefined" && height > generationInfo.maxHeight) return false;
   
   // Temperature
   if (typeof generationInfo.minTemperature !== "undefined" && temperature < generationInfo.minTemperature) return false;
   if (typeof generationInfo.maxTemperature !== "undefined" && temperature > generationInfo.maxTemperature) return false;
   
   // Humidity
   if (typeof generationInfo.minHumidity !== "undefined" && humidity < generationInfo.minHumidity) return false;
   if (typeof generationInfo.maxHumidity !== "undefined" && humidity > generationInfo.maxHumidity) return false;

   return true;
}

const getBiome = (height: number, temperature: number, humidity: number): Biome => {
   // @Temporary
   // if(1+1===2)return Biome.grasslands;
   // @Speed
   const numBiomes = Object.keys(BIOME_GENERATION_INFO).length;

   for (let i = 0; i < numBiomes; i++) {
      const biome = BIOME_GENERATION_PRIORITY[i];
      
      const generationInfo = BIOME_GENERATION_INFO[biome];
      if (generationInfo.spawnRequirements !== null && matchesBiomeRequirements(generationInfo.spawnRequirements, height, temperature, humidity)) {
         return biome;
      }
   }
   
   throw new Error(`Couldn't find a valid biome! Height: ${height}, temperature: ${temperature}, humidity: ${humidity}`);
}

const matchesTileRequirements = (generationInfo: TileGenerationInfo, weight: number, dist: number): boolean => {
   if (typeof generationInfo.noiseRequirements !== "undefined") {
      if (typeof generationInfo.noiseRequirements.minWeight !== "undefined" && weight < generationInfo.noiseRequirements.minWeight) return false;
      if (typeof generationInfo.noiseRequirements.maxWeight !== "undefined" && weight > generationInfo.noiseRequirements.maxWeight) return false;
   }

   if (typeof generationInfo.minDist !== "undefined" && dist < generationInfo.minDist) return false;
   if (typeof generationInfo.maxDist !== "undefined" && dist > generationInfo.maxDist) return false;

   return true;
}

const getTileInfo = (biomeName: Biome, dist: number, x: number, y: number): Omit<TileInfo, "biome"> => {
   const biomeGenerationInfo = BIOME_GENERATION_INFO[biomeName];
   for (const tileGenerationInfo of biomeGenerationInfo.tiles) {
      let weight = 0;
      if (typeof tileGenerationInfo.noiseRequirements !== "undefined") {
         weight = generatePointPerlinNoise(x, y, tileGenerationInfo.noiseRequirements.scale, tileGenerationInfo.tileType + "-" + tileGenerationInfo.noiseRequirements.scale);
      }
      
      if (matchesTileRequirements(tileGenerationInfo, weight, dist)) {
         return {
            type: tileGenerationInfo.tileType,
            isWall: OPTIONS.generateWalls ? tileGenerationInfo.isWall : false
         };
      }
   }

   throw new Error(`Couldn't find a valid tile info! Biome: ${biomeName}`);
}

const getTileDist = (biomeNames: Array<Array<Biome>>, tileX: number, tileY: number): number => {
   /** The maximum distance that the algorithm will search for */
   const MAX_SEARCH_DIST = 10;

   const tileBiome = biomeNames[tileX + Settings.EDGE_GENERATION_DISTANCE][tileY + Settings.EDGE_GENERATION_DISTANCE];

   for (let dist = 1; dist <= MAX_SEARCH_DIST; dist++) {
      for (let i = 0; i <= dist; i++) {
         // Top right
         if (tileX + i >= -Settings.EDGE_GENERATION_DISTANCE && tileX + i < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE && tileY - dist + i >= -Settings.EDGE_GENERATION_DISTANCE && tileY - dist + i < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) {
            const topRightBiome = biomeNames[tileX + i + Settings.EDGE_GENERATION_DISTANCE][tileY - dist + i + Settings.EDGE_GENERATION_DISTANCE];
            if (topRightBiome !== tileBiome) {
               return dist - 1;
            }
         }
         // Bottom right
         if (tileX + dist - i >= -Settings.EDGE_GENERATION_DISTANCE && tileX + dist - i < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE && tileY + i >= -Settings.EDGE_GENERATION_DISTANCE && tileY + i < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) {
            const bottomRightBiome = biomeNames[tileX + dist - i + Settings.EDGE_GENERATION_DISTANCE][tileY + i + Settings.EDGE_GENERATION_DISTANCE];
            if (bottomRightBiome !== tileBiome) {
               return dist - 1;
            }
         }
         // Bottom left
         if (tileX - dist + i >= -Settings.EDGE_GENERATION_DISTANCE && tileX - dist + i < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE && tileY + i >= -Settings.EDGE_GENERATION_DISTANCE && tileY + i < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) {
            const bottomLeftBiome = biomeNames[tileX - dist + i + Settings.EDGE_GENERATION_DISTANCE][tileY + i + Settings.EDGE_GENERATION_DISTANCE];
            if (bottomLeftBiome !== tileBiome) {
               return dist - 1;
            }
         }
         // Top left
         if (tileX - i >= -Settings.EDGE_GENERATION_DISTANCE && tileX - i < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE && tileY - dist + i >= -Settings.EDGE_GENERATION_DISTANCE && tileY - dist + i < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) {
            const topLeftBiome = biomeNames[tileX - i + Settings.EDGE_GENERATION_DISTANCE][tileY - dist + i + Settings.EDGE_GENERATION_DISTANCE];
            if (topLeftBiome !== tileBiome) {
               return dist - 1;
            }
         }
      }
   }

   return MAX_SEARCH_DIST;
}

/** Generate the tile array's tile types based on their biomes */
export function generateTileInfo(biomeNames: Array<Array<Biome>>, tileTypeArray: Array<Array<TileType>>, tileIsWallArray: Array<Array<boolean>>): void {
   for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
      for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
         const dist = getTileDist(biomeNames, tileX, tileY);

         const biomeName = biomeNames[tileX + Settings.EDGE_GENERATION_DISTANCE][tileY + Settings.EDGE_GENERATION_DISTANCE];
         // @Speed: Garbage collection
         const tileInfo = getTileInfo(biomeName, dist, tileX, tileY);
         tileTypeArray[tileX + Settings.EDGE_GENERATION_DISTANCE][tileY + Settings.EDGE_GENERATION_DISTANCE] = tileInfo.type;
         tileIsWallArray[tileX + Settings.EDGE_GENERATION_DISTANCE][tileY + Settings.EDGE_GENERATION_DISTANCE] = tileInfo.isWall;
      }
   }
}

export interface TerrainGenerationInfo {
   readonly tiles: Array<Tile>;
   readonly riverFlowDirections: RiverFlowDirections;
   readonly waterRocks: ReadonlyArray<WaterRockData>;
   readonly riverSteppingStones: ReadonlyArray<RiverSteppingStoneData>;
   readonly edgeTiles: Array<Tile>;
   readonly edgeRiverFlowDirections: RiverFlowDirections;
   readonly edgeRiverSteppingStones: ReadonlyArray<RiverSteppingStoneData>;
   readonly grassInfo: Record<number, Record<number, GrassTileInfo>>;
   readonly decorations: ReadonlyArray<DecorationInfo>;
}

function generateTerrain(): TerrainGenerationInfo {
   const biomeNameArray = new Array<Array<Biome>>();
   const tileTypeArray = new Array<Array<TileType>>();
   const tileIsWallArray = new Array<Array<boolean>>();

   const getTileBiome = (tileX: number, tileY: number): Biome => {
      return biomeNameArray[tileX + Settings.EDGE_GENERATION_DISTANCE][tileY + Settings.EDGE_GENERATION_DISTANCE];
   }

   const setTileBiome = (tileX: number, tileY: number, biomeName: Biome): void => {
      biomeNameArray[tileX + Settings.EDGE_GENERATION_DISTANCE][tileY + Settings.EDGE_GENERATION_DISTANCE] = biomeName;
   }

   const setTileType = (tileX: number, tileY: number, tileType: TileType): void => {
      tileTypeArray[tileX + Settings.EDGE_GENERATION_DISTANCE][tileY + Settings.EDGE_GENERATION_DISTANCE] = tileType;
   }

   const setIsWall = (tileX: number, tileY: number, isWall: boolean): void => {
      tileIsWallArray[tileX + Settings.EDGE_GENERATION_DISTANCE][tileY + Settings.EDGE_GENERATION_DISTANCE] = isWall;
   }

   const tileIsInBoard = (tileX: number, tileY: number): boolean => {
      return tileX >= 0 && tileX < Settings.BOARD_DIMENSIONS && tileY >= 0 && tileY < Settings.BOARD_DIMENSIONS;
   }

   // Generate the noise
   const heightMap = generateOctavePerlinNoise(Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE * 2, Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE * 2, HEIGHT_NOISE_SCALE, 3, 1.5, 0.75);
   const temperatureMap = generatePerlinNoise(Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE * 2, Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE * 2, TEMPERATURE_NOISE_SCALE);
   const humidityMap = generatePerlinNoise(Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE * 2, Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE * 2, HUMIDITY_NOISE_SCALE);

   // Push humidity and temperature towards the extremes
   for (let i = 0; i < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE * 2; i++) {
      // Fill the tile array using the noise
      for (let j = -Settings.EDGE_GENERATION_DISTANCE; j < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; j++) {
         const humidity = humidityMap[i][j];
         humidityMap[i][j] = smoothstep(humidity);

         const temperature = temperatureMap[i][j];
         temperatureMap[i][j] = smoothstep(temperature);
      }
   }
   
   // Generate biome info using the noise
   for (let i = 0; i < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE * 2; i++) {
      biomeNameArray.push([]);
      tileTypeArray.push([]);
      tileIsWallArray.push([]);
      for (let j = 0; j < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE * 2; j++) {
         const height = heightMap[i][j];
         const temperature = temperatureMap[i][j];
         const humidity = humidityMap[i][j];

         const biome = getBiome(height, temperature, humidity);
         biomeNameArray[i].push(biome);
         tileTypeArray[i].push(0);
         tileIsWallArray[i].push(false);
      }
   }

   // Generate rivers
   let riverTiles: ReadonlyArray<WaterTileGenerationInfo>;
   if (OPTIONS.generateRivers) {
      riverTiles = generateRiverTiles();
   } else {
      riverTiles = [];
   }

   generateTileInfo(biomeNameArray, tileTypeArray, tileIsWallArray);

   const riverFlowDirections: RiverFlowDirections = {};
   const edgeRiverFlowDirections: RiverFlowDirections = {};
   for (const tileInfo of riverTiles) {
      // @Cleanup @Speed: Do we have to hardcode this here?
      // Make ice rivers
      if (getTileBiome(tileInfo.tileX, tileInfo.tileY) === Biome.tundra) {
         setTileType(tileInfo.tileX, tileInfo.tileY, TileType.ice);
      } else {
         setTileBiome(tileInfo.tileX, tileInfo.tileY, Biome.river);
         setTileType(tileInfo.tileX, tileInfo.tileY, TileType.water);
      }
      setIsWall(tileInfo.tileX, tileInfo.tileY, false);

      // Set river flow directions
      if (tileIsInBoard(tileInfo.tileX, tileInfo.tileY)) {
         const row = riverFlowDirections[tileInfo.tileX];
         if (typeof row === "undefined") {
            riverFlowDirections[tileInfo.tileX] = {
               [tileInfo.tileY]: tileInfo.flowDirection
            };
         } else {
            row[tileInfo.tileY] = tileInfo.flowDirection;
         }
      } else {
         const rowDirections = edgeRiverFlowDirections[tileInfo.tileX];
         if (typeof rowDirections === "undefined") {
            edgeRiverFlowDirections[tileInfo.tileX] = {
               [tileInfo.tileY]: tileInfo.flowDirection
            };
         } else {
            rowDirections[tileInfo.tileY] = tileInfo.flowDirection;
         }
      }
   }

   const waterRocks = new Array<WaterRockData>();
   const riverSteppingStones = new Array<RiverSteppingStoneData>();
   const edgeRiverSteppingStones = new Array<RiverSteppingStoneData>();
   generateRiverFeatures(riverTiles, waterRocks, riverSteppingStones, edgeRiverSteppingStones);

   // Make an array of tiles from the tile info array
   // The outer loop has to be tileY so that the tiles array is filled properly
   const tiles = new Array<Tile>();
   const edgeTiles = new Array<Tile>();
   const grassInfo: Record<number, Record<number, GrassTileInfo>> = {};
   for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
      for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
         const tileType = tileTypeArray[tileX + Settings.EDGE_GENERATION_DISTANCE][tileY + Settings.EDGE_GENERATION_DISTANCE];

         let riverFlowDirection = 0; 
         
         // @Cleanup: This seems awful
         const rowDirections = riverFlowDirections[tileX];
         if (typeof rowDirections !== "undefined") {
            let desired = rowDirections[tileY];
            if (typeof desired !== "undefined") {
               if (desired >= 2 * Math.PI) {
                  desired -= 2 * Math.PI;
               } else if (desired < 0) {
                  desired += 2 * Math.PI;
               }

               for (let i = 0; i < 8; i++) {
                  const angle = i / 4 * Math.PI;
                  if (Math.abs(angle - desired) < 0.01) {
                     riverFlowDirection = i;
                     break;
                  }
               }
            }
         }
         
         // Create the tile
         const biomeName = biomeNameArray[tileX + Settings.EDGE_GENERATION_DISTANCE][tileY + Settings.EDGE_GENERATION_DISTANCE];
         const isWall = tileIsWallArray[tileX + Settings.EDGE_GENERATION_DISTANCE][tileY + Settings.EDGE_GENERATION_DISTANCE];
         const tile = new Tile(tileX, tileY, tileType, biomeName, isWall, riverFlowDirection);
         if (tileIsInBoard(tileX, tileY)) {
            tiles.push(tile);
         } else {
            edgeTiles.push(tile);
         }
         
         if (tileType === TileType.grass) {
            if (typeof grassInfo[tileX] === "undefined") {
               grassInfo[tileX] = {};
            }
            
            // @Cleanup: Repeated code
            const temperature = temperatureMap[tileX + Settings.EDGE_GENERATION_DISTANCE][tileY + Settings.EDGE_GENERATION_DISTANCE];
            const humidity = humidityMap[tileX + Settings.EDGE_GENERATION_DISTANCE][tileY + Settings.EDGE_GENERATION_DISTANCE];
            grassInfo[tileX][tileY] = {
               temperature: temperature,
               humidity: humidity
            };
         }
      }
   }

   return {
      tiles: tiles,
      waterRocks: waterRocks,
      riverSteppingStones: riverSteppingStones,
      riverFlowDirections: riverFlowDirections,
      edgeTiles: edgeTiles,
      edgeRiverFlowDirections: edgeRiverFlowDirections,
      edgeRiverSteppingStones: edgeRiverSteppingStones,
      grassInfo: grassInfo,
      decorations: generateDecorations(tileTypeArray, temperatureMap)
   };
}

export default generateTerrain;
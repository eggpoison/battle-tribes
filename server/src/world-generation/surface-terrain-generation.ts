import { WaterRockData, RiverSteppingStoneData } from "battletribes-shared/client-server-types";
import { Biome, TileType } from "battletribes-shared/tiles";
import { smoothstep, TileIndex } from "battletribes-shared/utils";
import { Settings } from "battletribes-shared/settings";
import { generateOctavePerlinNoise, generatePerlinNoise, generatePointPerlinNoise } from "../perlin-noise";
import BIOME_GENERATION_INFO, { BIOME_GENERATION_PRIORITY, BiomeSpawnRequirements, TileGenerationInfo } from "./terrain-generation-info";
import { WaterTileGenerationInfo, generateRiverFeatures, generateRiverTiles } from "./river-generation";
import OPTIONS from "../options";
import { getTileIndexIncludingEdges, getTileX, getTileY } from "../Layer";
import { generateCaveEntrances } from "./cave-entrance-generation";

export interface TerrainGenerationInfo {
   readonly tileTypes: Float32Array;
   readonly tileBiomes: Float32Array;
   readonly tileIsWalls: Float32Array;
   readonly riverFlowDirections: Float32Array;
   readonly tileTemperatures: Float32Array;
   readonly tileHumidities: Float32Array;
   readonly riverMainTiles: ReadonlyArray<WaterTileGenerationInfo>;
   readonly waterRocks: ReadonlyArray<WaterRockData>;
   readonly riverSteppingStones: ReadonlyArray<RiverSteppingStoneData>;
}

export interface LocalBiomeInfo {
   readonly biome: Biome;
   readonly tileIndexes: ReadonlyArray<TileIndex>;
}

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
   if(1+1===2)return Biome.mountains;
   
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

const getTileGenerationInfo = (biomeName: Biome, dist: number, x: number, y: number): TileGenerationInfo => {
   const biomeGenerationInfo = BIOME_GENERATION_INFO[biomeName];
   for (const tileGenerationInfo of biomeGenerationInfo.tiles) {
      let weight = 0;
      if (typeof tileGenerationInfo.noiseRequirements !== "undefined") {
         weight = generatePointPerlinNoise(x, y, tileGenerationInfo.noiseRequirements.scale, tileGenerationInfo.tileType + "-" + tileGenerationInfo.noiseRequirements.scale);
      }
      
      if (matchesTileRequirements(tileGenerationInfo, weight, dist)) {
         return tileGenerationInfo;
      }
   }

   throw new Error(`Couldn't find a valid tile info! Biome: ${biomeName}`);
}

export function getTileDist(tileBiomes: Float32Array, tileX: number, tileY: number, maxSearchDist: number): number {
   const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
   const tileBiome = tileBiomes[tileIndex] as Biome;

   for (let dist = 1; dist <= maxSearchDist; dist++) {
      for (let i = 0; i <= dist; i++) {
         // Top right
         if (tileX + i >= -Settings.EDGE_GENERATION_DISTANCE && tileX + i < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE && tileY - dist + i >= -Settings.EDGE_GENERATION_DISTANCE && tileY - dist + i < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) {
            const topRightBiome = tileBiomes[getTileIndexIncludingEdges(tileX + i, tileY - dist + i)];
            if (topRightBiome !== tileBiome) {
               return dist - 1;
            }
         }
         // Bottom right
         if (tileX + dist - i >= -Settings.EDGE_GENERATION_DISTANCE && tileX + dist - i < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE && tileY + i >= -Settings.EDGE_GENERATION_DISTANCE && tileY + i < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) {
            const bottomRightBiome = tileBiomes[getTileIndexIncludingEdges(tileX + dist - i, tileY + i)];
            if (bottomRightBiome !== tileBiome) {
               return dist - 1;
            }
         }
         // Bottom left
         if (tileX - dist + i >= -Settings.EDGE_GENERATION_DISTANCE && tileX - dist + i < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE && tileY + i >= -Settings.EDGE_GENERATION_DISTANCE && tileY + i < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) {
            const bottomLeftBiome = tileBiomes[getTileIndexIncludingEdges(tileX - dist + i, tileY + i)];
            if (bottomLeftBiome !== tileBiome) {
               return dist - 1;
            }
         }
         // Top left
         if (tileX - i >= -Settings.EDGE_GENERATION_DISTANCE && tileX - i < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE && tileY - dist + i >= -Settings.EDGE_GENERATION_DISTANCE && tileY - dist + i < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE) {
            const topLeftBiome = tileBiomes[getTileIndexIncludingEdges(tileX - i, tileY - dist + i)];
            if (topLeftBiome !== tileBiome) {
               return dist - 1;
            }
         }
      }
   }

   return maxSearchDist;
}

/** Generate the tile array's tile types based on their biomes */
export function generateTileInfo(tileBiomes: Float32Array, tileTypes: Float32Array, tileIsWalls: Float32Array): void {
   for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
      for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         
         const biome = tileBiomes[tileIndex] as Biome;
         
         /** The maximum distance that the algorithm will search for */
         let maxSearchDist = 0;
         
         // @Speed: Pre-calculate this for each biome
         const biomeGenerationInfo = BIOME_GENERATION_INFO[biome];
         for (let i = 0; i < biomeGenerationInfo.tiles.length; i++) {
            const tileGenerationInfo = biomeGenerationInfo.tiles[i];
            if (typeof tileGenerationInfo.minDist !== "undefined" && tileGenerationInfo.minDist > maxSearchDist) {
               maxSearchDist = tileGenerationInfo.minDist;
            }
            if (typeof tileGenerationInfo.maxDist !== "undefined" && tileGenerationInfo.maxDist >= maxSearchDist) {
               maxSearchDist = tileGenerationInfo.maxDist + 1;
            }
         }
         
         // @Speed: There are many tiles which don't need this information
         const dist = getTileDist(tileBiomes, tileX, tileY, maxSearchDist);

         const generationInfo = getTileGenerationInfo(biome, dist, tileX, tileY);

         tileTypes[tileIndex] = generationInfo.tileType;
         tileIsWalls[tileIndex] = OPTIONS.generateWalls && generationInfo.isWall ? 1 : 0;
      }
   }
}

// @Incomplete: unused?
const createNoiseMapData = (noise: ReadonlyArray<ReadonlyArray<number>>): Float32Array => {
   const data = new Float32Array(Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS)
   let idx = 0;
   for (let tileY = 0; tileY < Settings.FULL_BOARD_DIMENSIONS; tileY++) {
      for (let tileX = 0; tileX < Settings.FULL_BOARD_DIMENSIONS; tileX++) {
         const val = noise[tileX][tileY];
         data[idx] = val;
         
         idx++;
      }
   }
   return data;
}

const getConnectedBiomeTiles = (tileBiomes: Readonly<Float32Array>, processedTiles: Set<TileIndex>, tileX: number, tileY: number): ReadonlyArray<TileIndex> => {
   const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
   const targetBiome = tileBiomes[tileIndex];

   processedTiles.add(tileIndex);
   
   /** Tiles to expand from, not tiles to check whether they belong in connectedTiles */
   const tilesToCheck = [tileIndex];
   const connectedTiles = [tileIndex];
   while (tilesToCheck.length > 0) {
      const currentTile = tilesToCheck.shift()!;
      const currentTileX = getTileX(currentTile);
      const currentTileY = getTileY(currentTile);

      // Top
      if (currentTileY < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE - 1) {
         // @Speed: can calculate this directly by offsetting the currentTile
         const tileIndex = getTileIndexIncludingEdges(currentTileX, currentTileY + 1);
         if (!processedTiles.has(tileIndex)) {
            const biome = tileBiomes[tileIndex];
            if (biome === targetBiome) {
               tilesToCheck.push(tileIndex);
               connectedTiles.push(tileIndex);
               processedTiles.add(tileIndex);
            }
         }
      }
      // Right
      if (currentTileX < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE - 1) {
         // @Speed: can calculate this directly by offsetting the currentTile
         const tileIndex = getTileIndexIncludingEdges(currentTileX + 1, currentTileY);
         if (!processedTiles.has(tileIndex)) {
            const biome = tileBiomes[tileIndex];
            if (biome === targetBiome) {
               tilesToCheck.push(tileIndex);
               connectedTiles.push(tileIndex);
               processedTiles.add(tileIndex);
            }
         }
      }
      // Bottom
      if (currentTileY > -Settings.EDGE_GENERATION_DISTANCE + 1) {
         // @Speed: can calculate this directly by offsetting the currentTile
         const tileIndex = getTileIndexIncludingEdges(currentTileX, currentTileY - 1);
         if (!processedTiles.has(tileIndex)) {
            const biome = tileBiomes[tileIndex];
            if (biome === targetBiome) {
               tilesToCheck.push(tileIndex);
               connectedTiles.push(tileIndex);
               processedTiles.add(tileIndex);
            }
         }
      }
      // Left
      if (currentTileX > -Settings.EDGE_GENERATION_DISTANCE + 1) {
         // @Speed: can calculate this directly by offsetting the currentTile
         const tileIndex = getTileIndexIncludingEdges(currentTileX - 1, currentTileY);
         if (!processedTiles.has(tileIndex)) {
            const biome = tileBiomes[tileIndex];
            if (biome === targetBiome) {
               tilesToCheck.push(tileIndex);
               connectedTiles.push(tileIndex);
               processedTiles.add(tileIndex);
            }
         }
      }
   }

   return connectedTiles;
}

const groupLocalBiomes = (tileBiomes: Readonly<Float32Array>): ReadonlyArray<LocalBiomeInfo> => {
   const processedTiles = new Set<TileIndex>();
   
   const localBiomes = new Array<LocalBiomeInfo>();
   for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
      for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         if (processedTiles.has(tileIndex)) {
            continue;
         }

         // New tile! Make a local biome out of it
         const connectedTiles = getConnectedBiomeTiles(tileBiomes, processedTiles, tileX, tileY);
         const localBiome: LocalBiomeInfo = {
            biome: tileBiomes[tileIndex],
            tileIndexes: connectedTiles
         };
         localBiomes.push(localBiome);
      }
   }

   return localBiomes;
}

function generateSurfaceTerrain(): TerrainGenerationInfo {
   const tileBiomes = new Float32Array(Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS);
   const tileTypes = new Float32Array(Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS);
   const tileIsWalls = new Float32Array(Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS);
   const riverFlowDirections = new Float32Array(Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS);
   const tileTemperatures = new Float32Array(Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS);
   const tileHumidities = new Float32Array(Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS);

   // Generate the noise
   const heightMap = generateOctavePerlinNoise(Settings.FULL_BOARD_DIMENSIONS, Settings.FULL_BOARD_DIMENSIONS, HEIGHT_NOISE_SCALE, 3, 1.5, 0.75);
   const temperatureMap = generatePerlinNoise(Settings.FULL_BOARD_DIMENSIONS, Settings.FULL_BOARD_DIMENSIONS, TEMPERATURE_NOISE_SCALE);
   const humidityMap = generatePerlinNoise(Settings.FULL_BOARD_DIMENSIONS, Settings.FULL_BOARD_DIMENSIONS, HUMIDITY_NOISE_SCALE);

   // Create temperature and humidity arrays
   for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
      for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         
         const rawTemperature = temperatureMap[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];
         tileTemperatures[tileIndex] = smoothstep(rawTemperature);
         
         const rawHumidity = humidityMap[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];
         tileHumidities[tileIndex] = smoothstep(rawHumidity);
      }
   }
   
   // Create tile biomes
   for (let tileY = -Settings.EDGE_GENERATION_DISTANCE; tileY < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileY++) {
      for (let tileX = -Settings.EDGE_GENERATION_DISTANCE; tileX < Settings.BOARD_DIMENSIONS + Settings.EDGE_GENERATION_DISTANCE; tileX++) {
         const height = heightMap[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];
         const temperature = temperatureMap[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];
         const humidity = humidityMap[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];

         const biome = getBiome(height, temperature, humidity);
         
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         tileBiomes[tileIndex] = biome;
      }
   }

   // Generate rivers
   let riverTiles: ReadonlyArray<WaterTileGenerationInfo>;
   let riverMainTiles: ReadonlyArray<WaterTileGenerationInfo>;
   if (OPTIONS.generateRivers) {
      const riverGenerationInfo = generateRiverTiles();
      riverTiles = riverGenerationInfo.waterTiles;
      riverMainTiles = riverGenerationInfo.riverMainTiles;
   } else {
      riverTiles = [];
      riverMainTiles = [];
   }

   // Generate tiles
   generateTileInfo(tileBiomes, tileTypes, tileIsWalls);

   // Create flow directions array and create ice rivers
   for (const tileInfo of riverTiles) {
      const tileIndex = getTileIndexIncludingEdges(tileInfo.tileX, tileInfo.tileY);
      
      // @Cleanup @Speed: Do we have to hardcode this here?
      // Make ice rivers
      if (tileBiomes[tileIndex] === Biome.tundra) {
         tileTypes[tileIndex] = TileType.ice;
      } else {
         tileBiomes[tileIndex] = Biome.river;
         tileTypes[tileIndex] = TileType.water;
      }
      tileIsWalls[tileIndex] = 0;

      riverFlowDirections[tileIndex] = tileInfo.flowDirectionIdx;
   }

   const waterRocks = new Array<WaterRockData>();
   const riverSteppingStones = new Array<RiverSteppingStoneData>();
   generateRiverFeatures(riverTiles, waterRocks, riverSteppingStones);

   const localBiomes = groupLocalBiomes(tileBiomes);

   if (OPTIONS.generateCaves) {
      generateCaveEntrances(tileTypes, tileBiomes, tileIsWalls, localBiomes);
   }

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

export default generateSurfaceTerrain;
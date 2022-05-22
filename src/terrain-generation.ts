import Board, { Coordinates } from "./Board";
import { generateOctavePerlinNoise, generatePerlinNoise } from "./perlin-noise";
import { TileKind } from "./tile-types";

export type TileType = {
   kind: TileKind,
   biome: Biome;
   isWall: boolean;
}

const HEIGHT_NOISE_SCALE = 25;
const TEMPERATURE_NOISE_SCALE = 30;
const HUMIDITY_NOISE_SCALE = 15;

const TILE_TYPE_NOISE_SCALE = 5;

type TileGenerationInfo = {
   readonly info: Omit<TileType, "biome">;
   readonly minWeight?: number;
   readonly maxWeight?: number;
   /** The minimum number of tiles from the end of the biome */
   readonly minDist?: number;
   /** The maximum number of tiles from the end of the biome */
   readonly maxDist?: number;
}

type BiomeGenerationInfo = {
   readonly minHeight?: number;
   readonly maxHeight?: number;
   readonly minTemperature?: number;
   readonly maxTemperature?: number;
   readonly minHumidity?: number;
   readonly maxHumidity?: number;
}

export type BiomeName = "Mountains" | "Tundra" | "Desert" | "Swamp" | "Grasslands";

type Biome = {
   readonly name: BiomeName;
   readonly generationInfo: Readonly<BiomeGenerationInfo>;
   readonly tiles: ReadonlyArray<TileGenerationInfo>;
}

const BIOMES: ReadonlyArray<Biome> = [
   {
      name: "Mountains",
      generationInfo: {
         minHeight: 0.8
      },
      tiles: [
         {
            info: {
               kind: TileKind.rock,
               isWall: true
            },
            minWeight: 0.8,
            minDist: 2
         },
         {
            info: {
               kind: TileKind.rock,
               isWall: false
            }
         }
      ]
   },
   {
      name: "Tundra",
      generationInfo: {
         maxTemperature: 0.3,
         maxHumidity: 0.5
      },
      tiles: [
         {
            info: {
               kind: TileKind.ice,
               isWall: false
            },
            minWeight: 0.6,
            minDist: 3
         },
         {
            info: {
               kind: TileKind.snow,
               isWall: false
            }
         }
      ]
   },
   {
      name: "Desert",
      generationInfo: {
         minTemperature: 0.7,
         maxHumidity: 0.5
      },
      tiles: [
         {
            info: {
               kind: TileKind.sandstone,
               isWall: true
            },
            minWeight: 0.6,
            minDist: 2
         },
         {
            info: {
               kind: TileKind.sandstone,
               isWall: false
            },
            minWeight: 0.5,
            minDist: 1
         },
         {
            info: {
               kind: TileKind.sand,
               isWall: false
            }
         }
      ]
   },
   {
      name: "Swamp",
      generationInfo: {
         minTemperature: 0.7,
         minHumidity: 0.7
      },
      tiles: [
         {
            info: {
               kind: TileKind.dirt,
               isWall: false
            },
            minWeight: 0.5,
            minDist: 2
         },
         {
            info: {
               kind: TileKind.sludge,
               isWall: false
            }
         }
      ]
   },
   {
      name: "Grasslands",
      generationInfo: {},
      tiles: [
         {
            info: {
               kind: TileKind.grass,
               isWall: false
            }
         }
      ]
   }
];

const matchesBiomeRequirements = (generationInfo: BiomeGenerationInfo, height: number, temperature: number, humidity: number): boolean => {
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
   for (const biome of BIOMES) {
      if (matchesBiomeRequirements(biome.generationInfo, height, temperature, humidity)) {
         return biome;
      }
   }

   throw new Error(`Couldn't find a valid biome! Height: ${height}, temperature: ${temperature}, humidity: ${humidity}`);
}

const matchesTileRequirements = (generationInfo: TileGenerationInfo, weight: number, dist: number): boolean => {
   if (typeof generationInfo.minWeight !== "undefined" && weight < generationInfo.minWeight) return false;
   if (typeof generationInfo.maxWeight !== "undefined" && weight > generationInfo.maxWeight) return false;

   if (typeof generationInfo.minDist !== "undefined" && dist < generationInfo.minDist) return false;
   if (typeof generationInfo.maxDist !== "undefined" && dist > generationInfo.maxDist) return false;

   return true;
}

const getTileInfo = (biome: Biome, weight: number, dist: number): Omit<TileType, "biome"> => {
   for (const generationInfo of biome.tiles) {
      if (matchesTileRequirements(generationInfo, weight, dist)) {
         return generationInfo.info;
      }
   }

   throw new Error(`Couldn't find a valid tile info! Biome: ${biome}, weight: ${weight}`);
}

const generateTileArrayBiomes = (tileArray: Array<Array<TileType>>): void => {
   // Generate the noise
   const heightMap = generateOctavePerlinNoise(Board.dimensions, Board.dimensions, HEIGHT_NOISE_SCALE, 3, 1.5, 0.75);
   const temperatureMap = generatePerlinNoise(Board.dimensions, Board.dimensions, TEMPERATURE_NOISE_SCALE);
   const humidityMap = generatePerlinNoise(Board.dimensions, Board.dimensions, HUMIDITY_NOISE_SCALE);
   
   for (let y = 0; y < Board.dimensions; y++) {
      // Fill the tile array using the noise
      for (let x = 0; x < Board.dimensions; x++) {
         const height = heightMap[x][y];
         const temperature = temperatureMap[x][y];
         const humidity = humidityMap[x][y];

         const biome = getBiome(height, temperature, humidity);
         tileArray[x][y].biome = biome;
      }
   }
}

const getTileDist = (tileArray: Array<Array<TileType>>, tileX: number, tileY: number): number => {
   /** The maximum distance that the algorithm will search for */
   const MAX_SEARCH_DIST = 10;

   const tileBiome = tileArray[tileX][tileY].biome;

   for (let dist = 1; dist <= MAX_SEARCH_DIST; dist++) {
      for (let i = 0; i <= dist; i++) {
         const tileCoords = new Array<Coordinates>();

         tileCoords.push([tileX + i, tileY - dist + i]); // Top right
         tileCoords.push([tileX + dist - i, tileY + i]); // Bottom right
         tileCoords.push([tileX - dist + i, tileY + i]); // Bottom left
         tileCoords.push([tileX - i, tileY - dist + i]); // Top left

         for (const [x, y] of tileCoords) {
            if (x < 0 || x >= Board.dimensions || y <= 0 || y >= Board.dimensions) continue;

            const tile = tileArray[x][y];

            if (tile.biome !== tileBiome) return dist - 1;
         }
      }
   }

   return MAX_SEARCH_DIST;
}

/** Generate the tile array's tile types based on their biomes */
const generateTileArrayInfo = (tileArray: Array<Array<TileType>>): void => {
   // Generate the noise
   const noise = generatePerlinNoise(Board.dimensions, Board.dimensions, TILE_TYPE_NOISE_SCALE);

   for (let y = 0; y < Board.dimensions; y++) {
      for (let x = 0; x < Board.dimensions; x++) {
         const tile = tileArray[x][y];
         const weight = noise[x][y];

         const dist = getTileDist(tileArray, x, y);

         Object.assign(tile, getTileInfo(tile.biome, weight, dist));
      }
   }
}

export function generateTerrain(): Array<Array<TileType>> {
   // Initialise the tile array
   const tiles = new Array<Array<TileType>>(Board.dimensions);
   for (let x = 0; x < Board.dimensions; x++) {
      tiles[x] = new Array<TileType>(Board.dimensions);

      for (let y = 0; y < Board.dimensions; y++) {
         tiles[x][y] = {
            kind: undefined as unknown as TileKind,
            biome: undefined as unknown as Biome,
            isWall: undefined as unknown as boolean
         };
      }
   }

   generateTileArrayBiomes(tiles);

   generateTileArrayInfo(tiles);

   return tiles;
}
import Board, { Coordinates } from "./Board";
import { generateOctavePerlinNoise, generatePerlinNoise } from "./perlin-noise";
import { TileKind } from "./tile-types";
import { randInt, randItem } from "./utils";

export type TileType = {
   kind: TileKind,
   biome: Biome;
   isWall: boolean;
   fogAmount: number;
}

const HEIGHT_NOISE_SCALE = 25;
const TEMPERATURE_NOISE_SCALE = 30;
const HUMIDITY_NOISE_SCALE = 15;

const TILE_TYPE_NOISE_SCALE = 5;

type TileGenerationInfo = {
   readonly info: Omit<TileType, "biome" | "fogAmount">;
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

export type BiomeName = "Magma Fields" | "Mountains" | "Tundra" | "Desert" | "Swamp" | "Grasslands";

type Biome = {
   readonly name: BiomeName;
   readonly generationInfo?: Readonly<BiomeGenerationInfo>;
   readonly tiles: ReadonlyArray<TileGenerationInfo>;
}

const BIOMES: ReadonlyArray<Biome> = [
   {
      name: "Magma Fields",
      tiles: [
         {
            info: {
               kind: TileKind.lava,
               isWall: false
            },
            minWeight: 0.2,
            minDist: 3
         },
         {
            info: {
               kind: TileKind.magma,
               isWall: false
            }
         }
      ]
   },
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
               kind: TileKind.rock,
               isWall: true
            },
            minWeight: 0.8,
            minDist: 4
         },
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
      if (typeof biome.generationInfo !== "undefined" && matchesBiomeRequirements(biome.generationInfo, height, temperature, humidity)) {
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

const getTileInfo = (biome: Biome, weight: number, dist: number): Omit<TileType, "biome" | "fogAmount"> => {
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

const ADJACENT_TILE_DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;

const generateMagmaFields = (tileArray: Array<Array<TileType>>): void => {
   // Located randomly in one of the four corners

   // Pre-find the magma biome
   let magmaBiome!: Biome;
   for (const biome of BIOMES) {
      if (biome.name === "Magma Fields") {
         magmaBiome = biome;
      }
   }

   /** How far away the center of the biome is from the edge, in percentage of the total board */
   const PADDING = 0.1;

   const MIN_TILES = 200;
   const MAX_TILES = 250;

   // Generate the position for the center of the biome.
   const xSide = randInt(0, 1);
   const xDir = xSide === 1 ? 1 : -1;
   const ySide = randInt(0, 1);
   const yDir = ySide === 1 ? 1 : -1;

   const centerX = Math.round(Board.dimensions * (xSide + PADDING * -xDir));
   const centerY = Math.round(Board.dimensions * (ySide + PADDING * -yDir));

   // Make the starting tile magma
   tileArray[centerX][centerY].biome = magmaBiome;

   // The number of magma tiles
   const tileCount = randInt(MIN_TILES, MAX_TILES);

   const outerTilePositions: Array<Coordinates> = [[centerX, centerY]];

   for (let i = 0; i < tileCount; i++) {
      // Pick a random tile from the outer tiles to expand
      const [originTileX, originTileY] = randItem(outerTilePositions);

      // Pick a random adjacent tile position to expand to
      let newTileCoords!: Coordinates;
      let dirs = ADJACENT_TILE_DIRS.slice();
      for (let k = 0; k < 4; k++) {
         const idx = randInt(0, dirs.length - 1);
         const dir = dirs[idx];

         // If the adjacent tile is available, choose it
         const tile = tileArray[originTileX + dir[0]][originTileY + dir[1]];
         if (tile.biome.name !== "Magma Fields") {
            newTileCoords = [originTileX + dir[0], originTileY + dir[1]];
            break;
         }

         dirs.splice(idx, 1);
      }
      if (typeof newTileCoords === "undefined") {
         i--;
         continue;
      }

      // Convert the new tile into magma
      const tile = tileArray[newTileCoords[0]][newTileCoords[1]];
      tile.biome = magmaBiome;

      // Add it to the list of outer tiles
      outerTilePositions.push(newTileCoords);

      // Remove any tiles from the outer tiles array that have been obscured by the new tile
      mainLoop: for (const dir of ADJACENT_TILE_DIRS) {
         const tileX = newTileCoords[0] + dir[0];
         const tileY = newTileCoords[1] + dir[1];
         
         // Check if the tile is in the outer tile array
         let tileIdx!: number;
         for (let i = 0; i < outerTilePositions.length; i++) {
            const coords = outerTilePositions[i];
            if (tileX === coords[0] && tileY === coords[1]) {
               tileIdx = i;
               break;
            }
         }
         // If it isn't, skip it
         if (typeof tileIdx === "undefined") continue;

         // Check if the four surrounding tiles are all magma
         for (const dir of ADJACENT_TILE_DIRS) {
            const checkTile = tileArray[tileX + dir[0]][tileY + dir[1]];
            if (checkTile.biome.name !== "Magma Fields") continue mainLoop;
         }
         // If all four surrounding tiles are magma, remove it from the outer tiles array
         outerTilePositions.splice(tileIdx, 1);
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
            isWall: undefined as unknown as boolean,
            fogAmount: 1
         };
      }
   }

   generateTileArrayBiomes(tiles);

   generateMagmaFields(tiles);

   generateTileArrayInfo(tiles);

   return tiles;
}
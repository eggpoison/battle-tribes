import Board from "./Board";
import { generatePerlinNoise, getOctavePerlinNoise } from "./perlin-noise";
import SETTINGS from "./settings";
import { getTileDistFromCenter, getTileType, TileType } from "./tiles";
import { ease, lerp } from "./utils";

export type MapType = "normal" | "valley";

export type TileGenerationInfo = {
   readonly tileType: TileType;
   readonly minHeight?: number;
   readonly maxHeight?: number;
   readonly minTemperature?: number;
   readonly maxTemperature?: number;
   readonly minHumidity?: number;
   readonly maxHumidity?: number;
}

type MapInfo = {
   readonly heightScale: number;
   readonly temperatureScale: number;
   readonly humidityScale: number;
   readonly tileGeneration: ReadonlyArray<TileGenerationInfo>;
   generate(height: number, temperature: number, humidity: number, dist?: number): number;
}
export const MAPS: Record<MapType, MapInfo> = {
   normal: {
      heightScale: 15,
      temperatureScale: 20,
      humidityScale: 20,
      tileGeneration: [
         {
            tileType: TileType.desert,
            minTemperature: 0.8,
            maxHumidity: 0.6
         },
         {
            tileType: TileType.snow,
            maxTemperature: 0.2,
            maxHumidity: 0.6
         },
         {
            tileType: TileType.mud,
            minHumidity: 0.7,
            minTemperature: 0.7
         },
         {
            tileType: TileType.sludge,
            minHumidity: 0.8
         },
         {
            tileType: TileType.mountain,
            minHeight: 0.75
         },
         {
            tileType: TileType.grass
         }
      ],
      generate(height: number, temperature: number, humidity: number): number {
         return getTileType("normal", height, temperature, humidity);
      }
   },
   valley: {
      heightScale: 5,
      temperatureScale: 35,
      humidityScale: 10,
      tileGeneration: [
         {
            tileType: TileType.mountain,
            minHeight: 0.8
         },
         {
            tileType: TileType.desert,
            minTemperature: 0.7,
            minHeight: 0.3
         },
         {
            tileType: TileType.snow,
            maxTemperature: 0.3,
         },
         {
            tileType: TileType.sludge,
            maxHeight: 0.4,
            minHumidity: 0.1
         },
         {
            tileType: TileType.mud,
            minHumidity: 0.5,
            maxHeight: 0.8,
         },
         {
            tileType: TileType.grass
         }
      ],
      generate(height: number, temperature: number, humidity: number, dist: number): number {
         // return getTileType("normal", height, temperature, humidity);
         // Height: 0-0.5 at middle, 0.7-1 at edges
         const heightDist = ease(dist, 1.5);
         height = height * lerp(0.5, 0.3, heightDist) + lerp(0, 0.7, heightDist);

         // Temperature: 0.5 at middle, 0-1 at edges
         temperature = 0.5 + (dist > 0.5 ? ease(temperature, 1.5) - 0.5 : 0);

         // Humidity: 0 at middle, 0-1 at edges
         humidity = humidity * dist;

         return getTileType("valley", height, temperature, humidity);
      }
   }
};

const generateTileType = (height: number, temperature: number, humidity: number, dist: number): number => {
   return MAPS[SETTINGS.mapGenerationType].generate(height, temperature, humidity, dist);
}

export function generateTerrain(): Array<Array<TileType>> {
   // Generate the noise
   // const heightMap = generatePerlinNoise(Board.dimensions, Board.dimensions, MAPS[SETTINGS.mapGenerationType].heightScale);
   const heightMap = getOctavePerlinNoise(Board.dimensions, Board.dimensions, MAPS[SETTINGS.mapGenerationType].heightScale, 3, 1.5, 0.75);
   const temperatureMap = generatePerlinNoise(Board.dimensions, Board.dimensions, MAPS[SETTINGS.mapGenerationType].temperatureScale);
   const humidityMap = generatePerlinNoise(Board.dimensions, Board.dimensions, MAPS[SETTINGS.mapGenerationType].humidityScale);
   
   // Initialise the tiles array
   const tiles = new Array<Array<TileType>>(Board.dimensions);
   for (let x = 0; x < Board.dimensions; x++) {
      tiles[x] = new Array<TileType>(Board.dimensions);

      // Fill the tile array using the noise
      for (let y = 0; y < Board.dimensions; y++) {
         const height = heightMap[x][y];
         const temperature = temperatureMap[x][y];
         const humidity = humidityMap[x][y];

         const dist = getTileDistFromCenter(x, y);

         const tileType = generateTileType(height, temperature, humidity, dist);
         tiles[x][y] = tileType;
      }
   }

   return tiles;
}
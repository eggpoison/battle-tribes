import Board from "./Board";
import { generatePerlinNoise } from "./perlin-noise";
import { getTileDistFromCenter, getTileType, TileType } from "./tiles";
import { ease, lerp } from "./utils";

export function generateTerrain(): Array<Array<TileType>> {
   const HEIGHT_SCALE = 5;
   const TEMPERATURE_SCALE = 35;
   const HUMIDITY_SCALE = 10;

   // Generate the noise
   const heightMap = generatePerlinNoise(Board.dimensions, Board.dimensions, HEIGHT_SCALE);
   const temperatureMap = generatePerlinNoise(Board.dimensions, Board.dimensions, TEMPERATURE_SCALE);
   const humidityMap = generatePerlinNoise(Board.dimensions, Board.dimensions, HUMIDITY_SCALE);
   
   // Initialise the tiles array
   const tiles = new Array<Array<TileType>>(Board.dimensions);
   for (let x = 0; x < Board.dimensions; x++) {
      tiles[x] = new Array<TileType>(Board.dimensions);

      // Fill the tile array using the noise
      for (let y = 0; y < Board.dimensions; y++) {
         const dist = getTileDistFromCenter(x, y);

         let height = heightMap[x][y];
         let temperature = temperatureMap[x][y];
         let humidity = humidityMap[x][y];

         // Height: 0-0.5 at middle, 0.7-1 at edges
         const heightDist = ease(dist, 1.5);
         height = height * lerp(0.5, 0.3, heightDist) + lerp(0, 0.7, heightDist);

         // Temperature: 0.5 at middle, 0-1 at edges
         temperature = 0.5 + (dist > 0.5 ? ease(temperature, 1.5) - 0.5 : 0);

         // Humidity: 0 at middle, 0-1 at edges
         humidity = humidity * dist;

         const tileType = getTileType(height, temperature, humidity);
         tiles[x][y] = tileType;
      }
   }

   return tiles;
}
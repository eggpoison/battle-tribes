import { Settings } from "../../../shared/src/settings";
import { Biome, TileType } from "../../../shared/src/tiles";
import { lerp, TileIndex } from "../../../shared/src/utils";
import Board from "../Board";
import { getTileDist, LocalBiomeInfo } from "./terrain-generation";

const enum Vars {
   /** Minimum number of tiles in a mountain biome that will allow a cave to be generated */
   MIN_TILES_FOR_CAVE = 80,
   CAVE_ORIGIN_DIST = 5
}

export function generateCaveEntrances(tileTypes: Float32Array, tileBiomes: Float32Array, tileIsWalls: Float32Array, localBiomes: ReadonlyArray<LocalBiomeInfo>): void {
   for (let i = 0; i < localBiomes.length; i++) {
      const localBiome = localBiomes[i];
      if (localBiome.biome !== Biome.mountains || localBiome.tileIndexes.length < Vars.MIN_TILES_FOR_CAVE) {
         continue;
      }

      for (let T = 0; T < 250; T++) {


      // Pick a random tile some distance away from other biomes to generate the cave
      let originTile: TileIndex | undefined;
      for (let attempts = 0; attempts < 200; attempts++) {
         const idx = Math.floor(Math.random() * localBiome.tileIndexes.length);
         const tileIndex = localBiome.tileIndexes[idx];

         const tileX = Board.getTileX(tileIndex);
         const tileY = Board.getTileY(tileIndex);
         const tileDist = getTileDist(tileBiomes, tileX, tileY, Vars.CAVE_ORIGIN_DIST);
         if (tileDist >= Vars.CAVE_ORIGIN_DIST) {
            originTile = tileIndex;
            break;
         }
      }
      // Couldn't find a good spot for it!
      if (typeof originTile === "undefined") {
         continue;
      }

      const originTileX = Board.getTileX(originTile);
      const originTileY = Board.getTileY(originTile);
      const originX = (originTileX + Math.random()) * Settings.TILE_SIZE;
      const originY = (originTileY + Math.random()) * Settings.TILE_SIZE;

      const caveDirection = 2 * Math.PI * Math.random();

      // Clear any existing dark rocks in the cave generation area
      for (let xOffset = -4; xOffset <= 4; xOffset++) {
         for (let yOffset = -4; yOffset <= 20; yOffset++) {
            let x = originX;
            let y = originY;
            // X offset
            x += xOffset * 0.5 * Settings.TILE_SIZE * Math.sin(caveDirection + Math.PI * 0.5);
            y += xOffset * 0.5 * Settings.TILE_SIZE * Math.cos(caveDirection + Math.PI * 0.5);
            // Y offset
            x += yOffset * 0.5 * Settings.TILE_SIZE * Math.sin(caveDirection);
            y += yOffset * 0.5 * Settings.TILE_SIZE * Math.cos(caveDirection);

            const tileX = Math.floor(x / Settings.TILE_SIZE);
            const tileY = Math.floor(y / Settings.TILE_SIZE);
            const tileIndex = Board.getTileIndexIncludingEdges(tileX, tileY);
            if (tileTypes[tileIndex] === TileType.darkRock) {
               tileTypes[tileIndex] = TileType.rock;
               tileIsWalls[tileIndex] = 0;
            }
         }
      }

      // Create a rectangle of drop-down tiles
      for (let xOffset = -2.5; xOffset <= 2.5; xOffset++) {
         for (let yOffset = -4; yOffset <= -1; yOffset++) {
            let x = originX;
            let y = originY;
            // X offset
            x += xOffset * 0.5 * Settings.TILE_SIZE * Math.sin(caveDirection + Math.PI * 0.5);
            y += xOffset * 0.5 * Settings.TILE_SIZE * Math.cos(caveDirection + Math.PI * 0.5);
            // Y offset
            x += yOffset * 0.5 * Settings.TILE_SIZE * Math.sin(caveDirection);
            y += yOffset * 0.5 * Settings.TILE_SIZE * Math.cos(caveDirection);

            const tileX = Math.floor(x / Settings.TILE_SIZE);
            const tileY = Math.floor(y / Settings.TILE_SIZE);
            const tileIndex = Board.getTileIndexIncludingEdges(tileX, tileY);
            tileTypes[tileIndex] = TileType.dropdown;
         }
      }

      // Generate the back arc

      const BACK_OFFSET = 2;
      const backOriginX = originX + BACK_OFFSET * Math.sin(caveDirection);
      const backOriginY = originY + BACK_OFFSET * Math.cos(caveDirection);

      const START_OFFSET_TILES = 3;
      const END_OFFSET_TILES = 5.5;
      const SAMPLES_OF_DIRECTION = 15;
      const SAMPLES_OF_MAGNITUDE = 5;
      const ARC_SIZE = Math.PI * 1.6;
      for (let i = 0; i < SAMPLES_OF_DIRECTION; i++) {
         const direction = caveDirection + Math.PI + (i - (SAMPLES_OF_DIRECTION - 1) * 0.5) / (SAMPLES_OF_DIRECTION - 1) * 0.5 * ARC_SIZE * 0.5;

         for (let j = 0; j < SAMPLES_OF_MAGNITUDE; j++) {
            const magnitude = lerp(START_OFFSET_TILES, END_OFFSET_TILES, j / (SAMPLES_OF_MAGNITUDE - 1)) * Settings.TILE_SIZE;

            const x = backOriginX + magnitude * Math.sin(direction);
            const y = backOriginY + magnitude * Math.cos(direction);

            const tileX = Math.floor(x / Settings.TILE_SIZE);
            const tileY = Math.floor(y / Settings.TILE_SIZE);
            const tileIndex = Board.getTileIndexIncludingEdges(tileX, tileY);
            tileTypes[tileIndex] = TileType.darkRock;
            tileIsWalls[tileIndex] = 1;
         }
      }

      // Create the two sides
      for (let j = 0; j < 2; j++) {
         // j=0: left, j=1: right
         const sideOffsetDirection = caveDirection + (j === 0 ? Math.PI * -0.5 : Math.PI * 0.5);

         const sideDirection = caveDirection;

         const NUM_SAMPLES = 20;
         const OFFSET_PER_SAMPLE = Settings.TILE_SIZE * 0.5;
         for (let k = 0; k < NUM_SAMPLES; k++) {
            for (let l = 0; l < 4; l++) {
               const widthMultiplier = 0.45 + (NUM_SAMPLES - 1 - k) / (NUM_SAMPLES - 1) * 0.4;
               let sideOffset = (2 + l * widthMultiplier) * Settings.TILE_SIZE;
               // The further out the sides go, the more open they are
               sideOffset += k * 0.1 * Settings.TILE_SIZE;

               // Towards the end of the sides, they go in again
               sideOffset -= 2 * Settings.TILE_SIZE * Math.pow(k / (NUM_SAMPLES - 1), 3);
               
               const sideOriginX = originX + sideOffset * Math.sin(sideOffsetDirection) - 3 * Settings.TILE_SIZE * Math.sin(caveDirection);
               const sideOriginY = originY + sideOffset * Math.cos(sideOffsetDirection) - 3 * Settings.TILE_SIZE * Math.cos(caveDirection);
               const x = sideOriginX + k * OFFSET_PER_SAMPLE * Math.sin(sideDirection);
               const y = sideOriginY + k * OFFSET_PER_SAMPLE * Math.cos(sideDirection);
   
               const tileX = Math.floor(x / Settings.TILE_SIZE);
               const tileY = Math.floor(y / Settings.TILE_SIZE);
               const tileIndex = Board.getTileIndexIncludingEdges(tileX, tileY);
               tileTypes[tileIndex] = TileType.darkRock;
               tileIsWalls[tileIndex] = 1;
            }
         }
      }
      
      }
   }
}
import { Settings } from "../../shared/src/settings";
import { Point } from "../../shared/src/utils";
import { generatePointPerlinNoise } from "./perlin-noise";
import { getGameTicks } from "./world";

const enum Vars {
   MAX_WIND_SPEED = 240,
   NOISE_SIZE = 100,
   /** Size of each cell in tiles */
   CELL_SIZE = 4,
   CELLS_IN_WORLD_WIDTH = Settings.WORLD_SIZE_TILES / CELL_SIZE
}

const windVectors = new Array<Point>();
for (let i = 0; i < Vars.CELLS_IN_WORLD_WIDTH * Vars.CELLS_IN_WORLD_WIDTH; i++) {
   windVectors.push(new Point(0, 0));
}

export function getWindVector(x: number, y: number): Readonly<Point> {
   const cellX = Math.floor(x / Settings.TILE_SIZE / Vars.CELL_SIZE);
   const cellY = Math.floor(y / Settings.TILE_SIZE / Vars.CELL_SIZE);
   const idx = cellY * Vars.CELLS_IN_WORLD_WIDTH + cellX;
   return windVectors[idx];
}

export function updateWind(): void {
   const gameTicks = getGameTicks();
   if (gameTicks % 4 !== 0) {
      return;
   }

   for (let cellY = 0; cellY < Vars.CELLS_IN_WORLD_WIDTH; cellY++) {
      for (let cellX = 0; cellX < Vars.CELLS_IN_WORLD_WIDTH; cellX++) {
         const x = cellX + gameTicks * Settings.DT_S * 1.16345983;
         const y = cellY + gameTicks * Settings.DT_S * 1.16345983;
         
         const noiseX = generatePointPerlinNoise(x, y, 8, "wind");
         const noiseY = generatePointPerlinNoise(x + 50, y + 100, 8, "wind");

         const i = cellY * Vars.CELLS_IN_WORLD_WIDTH + cellX;
         const windVector = windVectors[i];
         windVector.x = (noiseX - 0.5) * 2 * Vars.MAX_WIND_SPEED;
         windVector.y = (noiseY - 0.5) * 2 * Vars.MAX_WIND_SPEED;
      }
   }
}
import { Settings } from "webgl-test-shared/dist/settings";
import Board from "../Board";
import { TileType } from "webgl-test-shared/dist/tiles";
import { isTooCloseToSteppingStone } from "../Chunk";
import { createLilypadConfig } from "../entities/lilypad";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { createEntityFromConfig } from "../Entity";

const enum Vars {
   DENSITY_PER_TILE = 0.025
}

export function generateLilypads(): void {
   // @Incomplete: generate in edges
   for (let tileX = 0; tileX < Settings.BOARD_DIMENSIONS; tileX++) {
      for (let tileY = 0; tileY < Settings.BOARD_DIMENSIONS; tileY++) {
         const tile = Board.getTile(tileX, tileY);
         if (tile.type !== TileType.water) {
            continue;
         }

         if (Math.random() > Vars.DENSITY_PER_TILE) {
            continue;
         }

         const x = (tile.x + Math.random()) * Settings.TILE_SIZE;
         const y = (tile.y + Math.random()) * Settings.TILE_SIZE;

         if (isTooCloseToSteppingStone(x, y, 50)) {
            continue;
         }

         const config = createLilypadConfig();
         config[ServerComponentType.transform].position.x = x;
         config[ServerComponentType.transform].position.y = y;
         config[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
         createEntityFromConfig(config);
      }
   }
}
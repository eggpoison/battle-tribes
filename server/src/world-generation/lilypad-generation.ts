import { Settings } from "webgl-test-shared/dist/settings";
import Board from "../Board";
import { TileType } from "webgl-test-shared/dist/tiles";
import { isTooCloseToSteppingStone } from "../Chunk";
import { createLilypadConfig } from "../entities/lilypad";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { createEntityFromConfig } from "../Entity";
import { randInt } from "webgl-test-shared/dist/utils";

const enum Vars {
   GROUP_DENSITY_PER_TILE = 0.03
}

export function generateLilypads(): void {
   // @Incomplete: generate in edges
   for (let tileX = 0; tileX < Settings.BOARD_DIMENSIONS; tileX++) {
      for (let tileY = 0; tileY < Settings.BOARD_DIMENSIONS; tileY++) {
         if (Board.getTileType(tileX, tileY) !== TileType.water) {
            continue;
         }

         if (Math.random() > Vars.GROUP_DENSITY_PER_TILE) {
            continue;
         }

         const numLilypads = randInt(1, 3);
         for (let i = 0; i < numLilypads; i++) {
         
            const x = (tileX + Math.random()) * Settings.TILE_SIZE;
            const y = (tileY + Math.random()) * Settings.TILE_SIZE;
   
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
}
import { Settings } from "webgl-test-shared/dist/settings";
import { TileType } from "webgl-test-shared/dist/tiles";
import Board from "../Board";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { createReedConfig } from "../entities/reed";
import { createEntityFromConfig } from "../Entity";

export function generateReeds(): void {
   // @Incomplete: generate in edges
   for (let tileX = 0; tileX < Settings.BOARD_DIMENSIONS; tileX++) {
      for (let tileY = 0; tileY < Settings.BOARD_DIMENSIONS; tileY++) {
         const tile = Board.getTile(tileX, tileY);
         if (tile.type !== TileType.water) {
            continue;
         }

         const x = (tile.x + Math.random()) * Settings.TILE_SIZE;
         const y = (tile.y + Math.random()) * Settings.TILE_SIZE;

         const config = createReedConfig();
         config[ServerComponentType.transform].position.x = x;
         config[ServerComponentType.transform].position.y = y;
         createEntityFromConfig(config);
      }
   }
}
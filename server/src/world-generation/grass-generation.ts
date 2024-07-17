import { Settings } from "webgl-test-shared/dist/settings";
import { TileType } from "webgl-test-shared/dist/tiles";
import Board from "../Board";
import { createGrassStrandConfig } from "../entities/grass-strand";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { createEntityFromConfig } from "../Entity";

const enum Vars {
   NUM_STRANDS = 2000
   // NUM_STRANDS = 250000
   // @Temporary: return to once optimised
   // NUM_STRANDS = 750000
}

export function createGrassStrands(): void {
   for (let i = 0; i < Vars.NUM_STRANDS; i++) {
      const x = Settings.BOARD_UNITS * Math.random();
      const y = Settings.BOARD_UNITS * Math.random();

      const tileX = Math.floor(x / Settings.TILE_SIZE);
      const tileY = Math.floor(y / Settings.TILE_SIZE);

      const tile = Board.getTile(tileX, tileY);
      if (tile.type !== TileType.grass) {
         continue;
      }

      const config = createGrassStrandConfig();
      config[ServerComponentType.transform].position.x = x;
      config[ServerComponentType.transform].position.y = y;
      // config[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
      createEntityFromConfig(config);
   }
}
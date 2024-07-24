import { Settings } from "webgl-test-shared/dist/settings";
import { TileType } from "webgl-test-shared/dist/tiles";
import Board from "../Board";
import { createGrassStrandConfig } from "../entities/grass-strand";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { createEntityFromConfig } from "../Entity";
import Tile from "../Tile";
import { Colour, randFloat } from "webgl-test-shared/dist/utils";

const enum Vars {
   /** Average number of grass strands per tile in a fully humidified area. */
   MAX_STRAND_DENSITY = 25
}

const getGrassDensityMultiplier = (tile: Tile): number => {
   const idx = Board.getTileIndexIncludingEdges(tile.x, tile.y);
   const humidity = Board.tileHumidities[idx];

   return humidity * 0.7 + 0.3;
}

export function generateGrassStrands(): void {
   // @Incomplete: generate in edges
   for (let tileX = 0; tileX < Settings.BOARD_DIMENSIONS; tileX++) {
      for (let tileY = 0; tileY < Settings.BOARD_DIMENSIONS; tileY++) {
         const tile = Board.getTile(tileX, tileY);
         if (tile.type !== TileType.grass) {
            continue;
         }

         let density = Vars.MAX_STRAND_DENSITY * getGrassDensityMultiplier(tile);
         if (Math.random() < density % 1) {
            density = Math.ceil(density);
         } else {
            density = Math.floor(density);
         }

         for (let i = 0; i < density; i++) {
            const x = (tileX + Math.random()) * Settings.TILE_SIZE;
            const y = (tileY + Math.random()) * Settings.TILE_SIZE;

            const config = createGrassStrandConfig();
            config[ServerComponentType.transform].position.x = x;
            config[ServerComponentType.transform].position.y = y;
            createEntityFromConfig(config);
         }
      }
   }
}
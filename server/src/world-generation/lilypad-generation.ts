import { Settings } from "battletribes-shared/settings";
import { TileType } from "battletribes-shared/tiles";
import { isTooCloseToSteppingStone } from "../Chunk";
import { createLilypadConfig } from "../entities/lilypad";
import { ServerComponentType } from "battletribes-shared/components";
import { createEntityFromConfig } from "../Entity";
import { randInt } from "battletribes-shared/utils";
import { getEntitiesInRange } from "../ai-shared";
import { EntityType } from "battletribes-shared/entities";
import { getEntityType, pushJoinBuffer, surfaceLayer } from "../world";
import Layer from "../Layer";

const enum Vars {
   GROUP_DENSITY_PER_TILE = 0.03
}

const isTooCloseToReedOrLilypad = (layer: Layer, x: number, y: number): boolean => {
   // Don't overlap with reeds at all
   let entities = getEntitiesInRange(layer, x, y, 24);
   for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (getEntityType(entity) === EntityType.reed) {
         return true;
      }
   }

   // Only allow overlapping slightly with other lilypads
   entities = getEntitiesInRange(layer, x, y, 24 - 6);
   for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (getEntityType(entity) === EntityType.lilypad) {
         return true;
      }
   }

   return false;
}

export function generateLilypads(): void {
   // @Incomplete: generate in edges
   for (let tileX = 0; tileX < Settings.BOARD_DIMENSIONS; tileX++) {
      for (let tileY = 0; tileY < Settings.BOARD_DIMENSIONS; tileY++) {
         if (surfaceLayer.getTileXYType(tileX, tileY) !== TileType.water) {
            continue;
         }

         if (Math.random() > Vars.GROUP_DENSITY_PER_TILE) {
            continue;
         }

         const numLilypads = randInt(1, 3);
         for (let i = 0; i < numLilypads; i++) {
            const x = (tileX + Math.random()) * Settings.TILE_SIZE;
            const y = (tileY + Math.random()) * Settings.TILE_SIZE;
   
            if (isTooCloseToSteppingStone(x, y, 50) || isTooCloseToReedOrLilypad(surfaceLayer, x, y)) {
               continue;
            }
   
            const config = createLilypadConfig();
            config[ServerComponentType.transform].position.x = x;
            config[ServerComponentType.transform].position.y = y;
            config[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
            createEntityFromConfig(config, surfaceLayer, 0);

            // Immediately add the entity so that distance checks work
            pushJoinBuffer();
         }
      }
   }
}
import { Settings } from "../../../shared/src/settings";
import { getSubtileIndex, subtileIsInWorld } from "../../../shared/src/subtiles";
import { SubtileType } from "../../../shared/src/tiles";
import { angle, Point, randSign } from "../../../shared/src/utils";
import { createSpikyBastardConfig } from "../entities/spiky-bastard";
import Layer from "../Layer";
import { generatePerlinNoise } from "../perlin-noise";
import { createEntityImmediate } from "../world";

const enum Vars {
   /** Number of spiky bastards attempted to be generated per tile */
   GENERATION_DENSITY = 9
}

export function generateSpikyBastards(undergroundLayer: Layer): void {
   // @Incomplete: generate in edges

   const numBastards = Math.ceil(Settings.WORLD_SIZE_TILES * Settings.WORLD_SIZE_TILES * Vars.GENERATION_DENSITY);
   const noise = generatePerlinNoise(Settings.FULL_WORLD_SIZE_TILES, Settings.FULL_WORLD_SIZE_TILES, 8);
   
   for (let i = 0; i < numBastards; i++) {
      const attachedSubtileX = Math.floor(Settings.WORLD_SIZE_TILES * 4 * Math.random());
      const attachedSubtileY = Math.floor(Settings.WORLD_SIZE_TILES * 4 * Math.random());

      // Make sure the bastard will be attached to a wall
      const attachedSubtileIndex = getSubtileIndex(attachedSubtileX, attachedSubtileY);
      const attachedSubtileType = undergroundLayer.getSubtileType(attachedSubtileIndex);
      if (attachedSubtileType === SubtileType.none) {
         continue;
      }

      const tileX = Math.floor(attachedSubtileX / 4);
      const tileY = Math.floor(attachedSubtileY / 4);

      // Don't spawn bastards on mithril rich subtiles
      if (undergroundLayer.getTileMithrilRichness(tileX, tileY) > 0) {
         continue;
      }

      // Factor in the noise spawn chance
      let spawnChance = noise[tileY + Settings.EDGE_GENERATION_DISTANCE][tileX + Settings.EDGE_GENERATION_DISTANCE];
      spawnChance *= spawnChance;
      if (Math.random() >= spawnChance) {
         continue;
      }

      let moveDirX: number;
      let moveDirY: number;
      if (Math.random() < 0.5) {
         moveDirX = randSign();
         moveDirY = 0;
      } else {
         moveDirX = 0;
         moveDirY = randSign();
      }

      // Make sure the bastard wouldn't go out of the world
      const finalSubtileX = attachedSubtileX + moveDirX * 2;
      const finalSubtileY = attachedSubtileY + moveDirY * 2;
      if (!subtileIsInWorld(finalSubtileX, finalSubtileY)) {
         continue;
      }

      // @Incomplete: Make sure it wouldn't intersect with any other bastards

      // Make sure the space is free
      if (undergroundLayer.getSubtileXYType(attachedSubtileX + moveDirX, attachedSubtileY + moveDirY) === SubtileType.none &&
          undergroundLayer.getSubtileXYType(attachedSubtileX + moveDirX * 2, attachedSubtileY + moveDirY * 2) === SubtileType.none) {
         const x = (attachedSubtileX + 0.5 + moveDirX * 1.5) * Settings.SUBTILE_SIZE;
         const y = (attachedSubtileY + 0.5 + moveDirY * 1.5) * Settings.SUBTILE_SIZE;

         const config = createSpikyBastardConfig(new Point(x, y), angle(moveDirX, moveDirY));
         createEntityImmediate(config, undergroundLayer);
      }
   }
}
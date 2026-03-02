import { Entity, EntityType } from "../../../shared/src/entities";
import { Settings } from "../../../shared/src/settings";
import { getSubtileIndex, subtileIsInWorld } from "../../../shared/src/subtiles";
import { SubtileType } from "../../../shared/src/tiles";
import { angle, Point, randFloat, randInt, randSign } from "../../../shared/src/utils";
import { getEntitiesInRange } from "../ai-shared";
import { createMithrilOreNodeConfig } from "../entities/resources/mithril-ore-node";
import Layer from "../Layer";
import { createEntityImmediate, getEntityType } from "../world";

const enum Vars {
   /** Number of spiky bastards attempted to be generated per subtile */
   INITIAL_SPAWN_ATTEMPT_DENSITY = 0.5625,
   /** Average number of times that a subtile will have a spawn attempt on it per second */
   SUBTILE_SPAWN_ATTEMPTS_PER_SECOND = 0.015
}

const getNumChildren = (currentDepth: number): number => {
   if (currentDepth === 0) {
      return randInt(2, 3);
   }
   if (currentDepth === 1) {
      return Math.random() < 0.6 ? 2 : 0;
   }
   return 0;
}

const spawnMithrilOre = (layer: Layer, x: number, y: number, direction: number, currentDepth: number): Entity => {
   const children = new Array<Entity>();
   
   const numChildren = getNumChildren(currentDepth);

   let size: number;
   let variant: number;
   let minOffsetMagnitude: number;
   let maxOffsetMagnitude: number;
   if (currentDepth === 0) {
      // Large
      size = 0;
      variant = randInt(0, 0);
      minOffsetMagnitude = 18;
      maxOffsetMagnitude = 22;
   } else if (numChildren > 0) {
      // Medium
      size = 1;
      variant = randInt(0, 1);
      minOffsetMagnitude = 14;
      maxOffsetMagnitude = 17;
   } else {
      // Small
      size = 2;
      variant = randInt(0, 1);
      minOffsetMagnitude = 0;
      maxOffsetMagnitude = 0;
   }
   
   for (let i = 0; i < numChildren; i++) {
      const offsetMagnitude = randFloat(minOffsetMagnitude, maxOffsetMagnitude);
      const offsetDirection = direction + (i - (numChildren - 1) * 0.5) * 1.35 + randFloat(-0.15, 0.15);

      const childX = x + offsetMagnitude * Math.sin(offsetDirection);
      const childY = y + offsetMagnitude * Math.cos(offsetDirection);

      const child = spawnMithrilOre(layer, childX, childY, offsetDirection, currentDepth + 1);
      children.push(child);
   }
   
   const renderHeight = (2 - currentDepth) * 0.5 + Math.random() * 0.1;

   const config = createMithrilOreNodeConfig(new Point(x, y), direction + randFloat(-0.1, 0.1), size, variant, children, renderHeight);
   const oreNode = createEntityImmediate(config, layer);
   
   return oreNode;
}

const canSpawnMithrilOre = (layer: Layer, subtileX: number, subtileY: number, moveDirX: number, moveDirY: number): boolean => {
   // Don't spawn on air
   const attachedSubtileIndex = getSubtileIndex(subtileX, subtileY);
   const attachedSubtileType = layer.getSubtileType(attachedSubtileIndex);
   if (attachedSubtileType === SubtileType.none) {
      return false;
   }

   const tileX = Math.floor(subtileX / 4);
   const tileY = Math.floor(subtileY / 4);
   if (layer.getTileMithrilRichness(tileX, tileY) === 0) {
      return false;
   }

   // Make sure the space is free
   if (layer.getSubtileXYType(subtileX + moveDirX, subtileY + moveDirY) !== SubtileType.none) {
      return false;
   }

   // Check right subtile
   if (subtileIsInWorld(subtileX + moveDirY, subtileY + moveDirX)) {
      const subtileIndex = getSubtileIndex(subtileX + moveDirY, subtileY + moveDirX);
      if (layer.getSubtileType(subtileIndex) === SubtileType.none) {
         return false;
      }
   }

   // Check left subtile
   if (subtileIsInWorld(subtileX - moveDirY, subtileY - moveDirX)) {
      const subtileIndex = getSubtileIndex(subtileX - moveDirY, subtileY - moveDirX);
      if (layer.getSubtileType(subtileIndex) === SubtileType.none) {
         return false;
      }
   }

   const x = (subtileX + 0.5 + moveDirX * 1.2) * Settings.SUBTILE_SIZE;
   const y = (subtileY + 0.5 + moveDirY * 1.2) * Settings.SUBTILE_SIZE;

   // Don't spawn mithril too close together
   const entities = getEntitiesInRange(layer, x, y, 42);
   for (const entity of entities) {
      if (getEntityType(entity) === EntityType.mithrilOreNode) {
         return false;
      }
   }

   return true;
}

// @Hack @Cleanup: shouldn't have to use underground layer as parameter
export function generateMithrilOre(undergroundLayer: Layer, isInitialGeneration: boolean): void {
   // @Incomplete: generate in edges

   const density = isInitialGeneration ? Vars.INITIAL_SPAWN_ATTEMPT_DENSITY : Vars.SUBTILE_SPAWN_ATTEMPTS_PER_SECOND;
   const numOres = Math.ceil(16 * Settings.WORLD_SIZE_TILES * Settings.WORLD_SIZE_TILES * density);
   
   for (let i = 0; i < numOres; i++) {
      const subtileX = Math.floor(Settings.WORLD_SIZE_TILES * 4 * Math.random());
      const subtileY = Math.floor(Settings.WORLD_SIZE_TILES * 4 * Math.random());

      let moveDirX: number;
      let moveDirY: number;
      if (Math.random() < 0.5) {
         moveDirX = randSign();
         moveDirY = 0;
      } else {
         moveDirX = 0;
         moveDirY = randSign();
      }

      if (!canSpawnMithrilOre(undergroundLayer, subtileX, subtileY, moveDirX, moveDirY)) {
         continue;
      }

      const x = (subtileX + 0.5 + moveDirX * 1.2) * Settings.SUBTILE_SIZE;
      const y = (subtileY + 0.5 + moveDirY * 1.2) * Settings.SUBTILE_SIZE;
      const direction = angle(moveDirX, moveDirY) + randFloat(-0.3, 0.3);
      spawnMithrilOre(undergroundLayer, x, y, direction, 0);
   }
}
import { EntityType } from "webgl-test-shared/dist/entities";
import { lerp, randFloat } from "webgl-test-shared/dist/utils";

const MIN_RENDER_DEPTH = -0.95;
const MAX_RENDER_DEPTH = 0.95;

enum RenderLayer {
   // @Temporary?
   lowestEntities,
   droppedItems,
   lowEntities,
   defaultEntities,
   projectiles,
   highEntities,
   blueprints
}
const NUM_RENDER_LAYERS = Object.keys(RenderLayer).length / 2;

/*
 * Each render layer is split into a distinct chunk of the -1 -> 1 period of render depths.
*/

// @Incomplete: there needs to be some padding between render layers so render parts don't leak into higher render layers

const calculateRenderDepthFromLayer = (renderLayer: RenderLayer): number => {
   let min = lerp(-1, 1, renderLayer / NUM_RENDER_LAYERS);
   let max = min + 1 / NUM_RENDER_LAYERS;

   // Account for the bounds
   min = lerp(MAX_RENDER_DEPTH, MIN_RENDER_DEPTH, (min + 1) / 2);
   max = lerp(MAX_RENDER_DEPTH, MIN_RENDER_DEPTH, (max + 1) / 2);

   return randFloat(min, max);
}

const getEntityRenderLayer = (entityType: EntityType): RenderLayer => {
   // @Incomplete: Make 
   
   switch (entityType) {
      // Item entities
      case EntityType.itemEntity: {
         return RenderLayer.droppedItems;
      }
      // @Incomplete: Only blueprints which go on existing buildings should be here, all others should be low entities
      // Blueprints
      case EntityType.blueprintEntity: {
         return RenderLayer.blueprints;
      }
      // Floor spikes render below player and wall spikes render above
      case EntityType.floorSpikes:
      case EntityType.floorPunjiSticks: {
         return RenderLayer.lowEntities;
      }
      case EntityType.wallSpikes:
      case EntityType.wallPunjiSticks: {
         return RenderLayer.highEntities;
      }
      // High entities
      case EntityType.fenceGate:
      case EntityType.cactus:
      case EntityType.berryBush:
      case EntityType.tree:
      case EntityType.tunnel:
      case EntityType.workerHut:
      case EntityType.warriorHut:
      case EntityType.wall:
      case EntityType.healingTotem:
      case EntityType.door: {
         return RenderLayer.highEntities;
      }
      // Projectiles
      case EntityType.woodenArrow:
      case EntityType.ballistaFrostcicle:
      case EntityType.ballistaRock:
      case EntityType.ballistaSlimeball:
      case EntityType.ballistaWoodenBolt:
      case EntityType.slingTurretRock: {  
         return RenderLayer.projectiles;
      }
      // Low entities
      case EntityType.researchBench: {
         return RenderLayer.lowEntities;
      }
      // @Temporary?
      case EntityType.planterBox: {
         return RenderLayer.lowestEntities;
      }
      // (default)
      default: {
         return RenderLayer.defaultEntities;
      }
   }
}

export function calculateEntityRenderDepth(entityType: EntityType): number {
   return calculateRenderDepthFromLayer(getEntityRenderLayer(entityType));
}
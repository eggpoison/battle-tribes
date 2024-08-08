import { EntityType } from "webgl-test-shared/dist/entities";
import Entity from "./Entity";
import { DecorationType, ServerComponentType } from "webgl-test-shared/dist/components";

export enum RenderLayer {
   lowDecorations,
   grass,
   highDecorations,
   // @Temporary?
   lowestEntities,
   fish,
   // Everything before this will render under water, everything after will render above
   droppedItems,
   lilypads,
   reeds,
   lowEntities,
   defaultEntities,
   projectiles,
   highEntities,
   blueprints
}
const NUM_RENDER_LAYERS = Object.keys(RenderLayer).length / 2;

const MAX_RENDER_HEIGHT = NUM_RENDER_LAYERS;

/*
 * Each render layer is split into a distinct chunk of the -1 -> 1 period of render depths.
*/

// @Incomplete: there needs to be some padding between render layers so render parts don't leak into higher render layers

export function getMaxRenderHeightForRenderLayer(renderLayer: RenderLayer): number {
   const rawRenderHeight = renderLayer + 0.9999;
   return rawRenderHeight / MAX_RENDER_HEIGHT * 2 - 1;
}

const calculateRenderDepthFromLayer = (renderLayer: RenderLayer): number => {
   const rawRenderHeight = renderLayer + Math.random() * 0.9;
   // Convert from [0, 1] to [-1, 1];
   return rawRenderHeight / MAX_RENDER_HEIGHT * 2 - 1;
}

const decorationIsHigh = (decorationType: DecorationType): boolean => {
   return decorationType === DecorationType.flower1
       || decorationType === DecorationType.flower2
       || decorationType === DecorationType.flower3
       || decorationType === DecorationType.flower4;
}

const getEntityRenderLayer = (entity: Entity): RenderLayer => {
   // @Incomplete: Make 
   
   switch (entity.type) {
      // Grass
      case EntityType.grassStrand: {
         return RenderLayer.grass;
      }
      // Decorations
      case EntityType.decoration: {
         const decorationComponent = entity.getServerComponent(ServerComponentType.decoration) 
         return decorationIsHigh(decorationComponent.decorationType) ? RenderLayer.highDecorations : RenderLayer.lowDecorations;
      }
      // Item entities
      case EntityType.itemEntity: {
         return RenderLayer.droppedItems;
      }
      case EntityType.lilypad: {
         return RenderLayer.lilypads;
      }
      case EntityType.reed: {
         return RenderLayer.reeds;
      }
      case EntityType.fish: {
         return RenderLayer.fish;
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

export function calculateEntityRenderHeight(entity: Entity): number {
   const renderLayer = getEntityRenderLayer(entity);
   return calculateRenderDepthFromLayer(renderLayer);
}
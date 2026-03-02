import { assert, BlueprintType, DecorationType, ServerComponentType, EntityType } from "webgl-test-shared";
import { EntityComponentData } from "./world";

export enum RenderLayer {
   lowDecorations,
   grass,
   highDecorations,
   quakes,
   // Projectiles which need to be rendered below all things which they can be embedded in
   embeddedProjectiles,
   lowBlueprints,
   // @Temporary?
   lowestEntities,
   fish,
   // Everything before this will render under water, everything after will render above
   droppedItems,
   desertLowestPlants,
   lilypads,
   reeds,
   lowEntities,
   // So that mound is below the snobe
   snobeMound,
   // So that the tongue is rendfered below okrens
   okrenTongue,
   // so that the limbs are rendered below okrens
   okrenClaw,
   // so that the tail is rendered below tukmoks
   tukmokTailClub,
   // so that the trunk is rendered below tukmoks
   tukmokTrunk,
   defaultEntities,
   // so that the spurs are rendered above tukmoks
   tukmokSpur,
   // so that the trunk is rendered below tukmoks
   // @Hack So that these will be shown above the default entities which they are carried on
   ridingEntities,
   // so they are rendered above players
   dustfleas,
   highBlueprints,
   mithril,
   projectiles,
   highEntities,
   treeRootBase,
   /* --------------- */
   WALL_SEPARATOR,
   /* --------------- */
   bracings
}
export const NUM_RENDER_LAYERS = Object.keys(RenderLayer).length / 2;
export const MAX_RENDER_LAYER = NUM_RENDER_LAYERS - 1;

const MAX_RENDER_HEIGHT = NUM_RENDER_LAYERS;

/*
 * Each render layer is split into a distinct chunk of the -1 -> 1 period of render depths.
*/

// @Incomplete: there needs to be some padding between render layers so render parts don't leak into higher render layers

export function getMaxRenderHeightForRenderLayer(renderLayer: RenderLayer): number {
   const rawRenderHeight = renderLayer + 0.9999;
   return rawRenderHeight / MAX_RENDER_HEIGHT * 2 - 1;
}

const decorationIsHigh = (decorationType: DecorationType): boolean => {
   return decorationType === DecorationType.flower1
       || decorationType === DecorationType.flower2
       || decorationType === DecorationType.flower3
       || decorationType === DecorationType.flower4
       || decorationType === DecorationType.sandstoneRock
       || decorationType === DecorationType.sandstoneRockBig1
       || decorationType === DecorationType.sandstoneRockBig2
       || decorationType === DecorationType.sandstoneRockDark
       || decorationType === DecorationType.sandstoneRockDarkBig1
       || decorationType === DecorationType.sandstoneRockDarkBig2;
}

export function getEntityRenderLayer(entityType: EntityType, entityComponentData: EntityComponentData): RenderLayer {
   // Crafting stations render below tribesmen so they can see the limbs
   // @SQUEAM disabled so that workbenches can render on top of cows
   // if (typeof entityComponentData.serverComponentData[ServerComponentType.craftingStation] !== "undefined") {
   //    return RenderLayer.lowEntities;
   // }
   
   switch (entityType) {
      case EntityType.bracings: {
         return RenderLayer.bracings;
      }
      // Grass
      case EntityType.grassStrand: {
         return RenderLayer.grass;
      }
      case EntityType.mithrilOreNode: {
         return RenderLayer.mithril;
      }
      // Decorations
      case EntityType.decoration: {
         const decorationComponentData = entityComponentData.serverComponentData[ServerComponentType.decoration];
         assert(typeof decorationComponentData !== "undefined");
         return decorationIsHigh(decorationComponentData.decorationType) ? RenderLayer.highDecorations : RenderLayer.lowDecorations;
      }
      case EntityType.moss: {
         return RenderLayer.lowDecorations;
      }
      case EntityType.guardianGemQuake: {
         return RenderLayer.quakes;
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
         const blueprintComponentData = entityComponentData.serverComponentData[ServerComponentType.blueprint]!;
         switch (blueprintComponentData.blueprintType) {
            case BlueprintType.stoneWall:
            case BlueprintType.stoneDoorUpgrade: {
               return RenderLayer.highBlueprints;
            }
            default: {
               return RenderLayer.lowBlueprints;
            }
         }
      }
      // Floor spikes render below player and wall spikes render above
      case EntityType.floorSpikes:
      case EntityType.floorPunjiSticks: {
         return RenderLayer.lowEntities;
      }
      // Sand balls are rendered below krumblids so that their mandables wriggle about them when balling them up
      case EntityType.sandBall: {
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
      case EntityType.door:
      // @HACK: just slapped workbench in here so it goes on top of cows
      case EntityType.workbench: {
         return RenderLayer.highEntities;
      }
      case EntityType.woodenArrow: {
         return RenderLayer.embeddedProjectiles;
      }
      // Projectiles
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
      case EntityType.treeRootBase: {
         return RenderLayer.treeRootBase;
      }
      case EntityType.player:
      case EntityType.tribeWorker:
      case EntityType.tribeWarrior:
      // @Incomplete: barrel should be shown below player (so that their limbs can go over it)
      case EntityType.barrel: {
         return RenderLayer.ridingEntities;
      }
      case EntityType.dustflea: {
         return RenderLayer.dustfleas;
      }
      case EntityType.desertSmallWeed: {
         return RenderLayer.desertLowestPlants;
      }
      case EntityType.snobeMound: {
         return RenderLayer.snobeMound;
      }
      case EntityType.okrenTongue: {
         return RenderLayer.okrenTongue;
      }
      case EntityType.okrenClaw: {
         return RenderLayer.okrenClaw;
      }
      case EntityType.tukmokTailClub: {
         return RenderLayer.tukmokTailClub;
      }
      case EntityType.tukmokTrunk: {
         return RenderLayer.tukmokTrunk;
      }
      case EntityType.tukmokSpur: {
         return RenderLayer.tukmokSpur;
      }
      // (default)
      default: {
         return RenderLayer.defaultEntities;
      }
   }
}

export function calculateRenderDepthFromLayer(renderLayer: RenderLayer, entityComponentData: EntityComponentData): number {
   /** Variation between 0 and 1 */
   let variation: number;
   if (renderLayer === RenderLayer.mithril) {
      const mithrilOreNodeComponentData = entityComponentData.serverComponentData[ServerComponentType.mithrilOreNode]!;
      variation = mithrilOreNodeComponentData.renderHeight;
   } else {
      variation = Math.random();
   }
   
   const rawRenderHeight = renderLayer + variation * 0.9;
   // Convert from [0, NUM_RENDER_LAYERS] to [-1, 1];
   return rawRenderHeight / NUM_RENDER_LAYERS * 2 - 1;
}
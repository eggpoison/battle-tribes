import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID, EntityType, SlimeSize } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { TileType } from "battletribes-shared/tiles";
import { UtilVars } from "battletribes-shared/utils";
import { moveEntityToPosition } from "../ai-shared";
import { entitiesAreColliding, CollisionVars } from "../collision";
import { createSlimeConfig } from "../entities/mobs/slime";
import { createEntityFromConfig } from "../Entity";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { TransformComponentArray, getEntityTile } from "./TransformComponent";
import { destroyEntity, entityIsFlaggedForDestruction, getEntityLayer, getEntityType } from "../world";

const enum Vars {
   ACCELERATION = 100,
   TURN_SPEED = UtilVars.PI,
   SLIMEWISP_MERGE_TIME = 2
}

export class SlimewispComponent {
   public mergeTimer = Vars.SLIMEWISP_MERGE_TIME;
}

export const SlimewispComponentArray = new ComponentArray<SlimewispComponent>(ServerComponentType.slimewisp, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onTick(slimewispComponent: SlimewispComponent, slimewisp: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(slimewisp);

   const tileIndex = getEntityTile(transformComponent);
   const layer = getEntityLayer(slimewisp);
   const tileType = layer.tileTypes[tileIndex];
   
   // Slimewisps move at normal speed on slime blocks
   const physicsComponent = PhysicsComponentArray.getComponent(slimewisp);
   physicsComponent.overrideMoveSpeedMultiplier = tileType === TileType.slime || tileType === TileType.sludge;

   const aiHelperComponent = AIHelperComponentArray.getComponent(slimewisp);
   
   // Merge with other slimewisps
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const mergingSlimewisp = aiHelperComponent.visibleEntities[i];
      if (getEntityType(mergingSlimewisp) === EntityType.slimewisp) {
         const mergingSlimewispTransformComponent = TransformComponentArray.getComponent(mergingSlimewisp);
         
         moveEntityToPosition(slimewisp, mergingSlimewispTransformComponent.position.x, mergingSlimewispTransformComponent.position.y, Vars.ACCELERATION, Vars.TURN_SPEED);
   
         // Continue merge
         if (entitiesAreColliding(slimewisp, mergingSlimewisp) !== CollisionVars.NO_COLLISION) {
            slimewispComponent.mergeTimer -= Settings.I_TPS;
            if (slimewispComponent.mergeTimer <= 0 && !entityIsFlaggedForDestruction(mergingSlimewisp)) {
               // Create a slime between the two wisps
               const config = createSlimeConfig(SlimeSize.small);
               config.components[ServerComponentType.transform].position.x = (transformComponent.position.x + mergingSlimewispTransformComponent.position.x) / 2;
               config.components[ServerComponentType.transform].position.y = (transformComponent.position.y + mergingSlimewispTransformComponent.position.y) / 2;
               config.components[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
               createEntityFromConfig(config, layer, 0);
            
               destroyEntity(slimewisp);
               destroyEntity(mergingSlimewisp);
            }
         }
         return;
      }
   }
   
   // Wander AI
   const wanderAI = aiHelperComponent.getWanderAI();
   wanderAI.run(slimewisp);
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}
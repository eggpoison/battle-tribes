import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Entity, EntityType, SlimeSize } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { TileType } from "battletribes-shared/tiles";
import { Point, randAngle, UtilVars } from "battletribes-shared/utils";
import { moveEntityToPosition } from "../ai-shared";
import { createSlimeConfig } from "../entities/mobs/slime";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { TransformComponentArray } from "./TransformComponent";
import { createEntity, destroyEntity, entityIsFlaggedForDestruction, getEntityLayer, getEntityType } from "../world";
import { CollisionVars, entitiesAreColliding } from "../collision-detection";
import { getHitboxTile } from "../hitboxes";

const enum Vars {
   ACCELERATION = 100,
   TURN_SPEED = UtilVars.PI,
   SLIMEWISP_MERGE_TIME = 2
}

export class SlimewispComponent {
   public mergeTimer = Vars.SLIMEWISP_MERGE_TIME;
}

export const SlimewispComponentArray = new ComponentArray<SlimewispComponent>(ServerComponentType.slimewisp, true, getDataLength, addDataToPacket);
SlimewispComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

function onTick(slimewisp: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(slimewisp);
   const slimewispHitbox = transformComponent.hitboxes[0];

   const tileIndex = getHitboxTile(slimewispHitbox);
   const layer = getEntityLayer(slimewisp);
   const tileType = layer.tileTypes[tileIndex];
   
   // Slimewisps move at normal speed on slime blocks
   transformComponent.overrideMoveSpeedMultiplier = tileType === TileType.slime || tileType === TileType.sludge;

   const aiHelperComponent = AIHelperComponentArray.getComponent(slimewisp);
   const slimewispComponent = SlimewispComponentArray.getComponent(slimewisp);
   
   // Merge with other slimewisps
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const mergingSlimewisp = aiHelperComponent.visibleEntities[i];
      if (getEntityType(mergingSlimewisp) === EntityType.slimewisp) {
         const mergingSlimewispTransformComponent = TransformComponentArray.getComponent(mergingSlimewisp);
         const mergingSlimewispHitbox = mergingSlimewispTransformComponent.hitboxes[0];
         
         moveEntityToPosition(slimewisp, mergingSlimewispHitbox.box.position.x, mergingSlimewispHitbox.box.position.y, Vars.ACCELERATION, Vars.TURN_SPEED, 1);
   
         // Continue merge
         if (entitiesAreColliding(slimewisp, mergingSlimewisp) !== CollisionVars.NO_COLLISION) {
            slimewispComponent.mergeTimer -= Settings.DT_S;
            if (slimewispComponent.mergeTimer <= 0 && !entityIsFlaggedForDestruction(mergingSlimewisp)) {
               const x = (slimewispHitbox.box.position.x + mergingSlimewispHitbox.box.position.x) / 2;
               const y = (slimewispHitbox.box.position.y + mergingSlimewispHitbox.box.position.y) / 2;
               
               // Create a slime between the two wisps
               const config = createSlimeConfig(new Point(x, y), randAngle(), SlimeSize.small);
               createEntity(config, layer, 0);
            
               destroyEntity(slimewisp);
               destroyEntity(mergingSlimewisp);
            }
         }
         return;
      }
   }
   
   // Wander AI
   const wanderAI = aiHelperComponent.getWanderAI();
   wanderAI.update(slimewisp);
   if (wanderAI.targetPosition !== null) {
      moveEntityToPosition(slimewisp, wanderAI.targetPosition.x, wanderAI.targetPosition.y, 100, Math.PI, 1);
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}
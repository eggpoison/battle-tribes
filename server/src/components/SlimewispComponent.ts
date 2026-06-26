import { ServerComponentType } from "../../../shared/dist/components.js";
import { Entity, EntityType, SlimeSize } from "../../../shared/dist/entities.js";
import { Settings } from "../../../shared/dist/settings.js";
import { TileType } from "../../../shared/dist/tiles.js";
import { UtilVar, randAngle } from "../../../shared/dist/utils.js";
import { ComponentArray } from "./ComponentArray.js";
import { moveEntityToPosition } from "../ai-shared.js";
import { createSlimeConfig } from "../entities/mobs/slime.js";
import { AIHelperComponentArray } from "./AIHelperComponent.js";
import { TransformComponentArray } from "./TransformComponent.js";
import { createEntity, destroyEntity, entityIsFlaggedForDestruction, getEntityLayer, getEntityType } from "../world.js";
import { CollisionVars, entitiesAreColliding } from "../collision-detection.js";
import { getBoxTile } from "../hitboxes.js";

const enum Vars {
   ACCELERATION = 100,
   TURN_SPEED = UtilVar.PI,
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

   const tileIndex = getBoxTile(slimewispHitbox.box);
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
         
         moveEntityToPosition(slimewisp, mergingSlimewispHitbox.box.posX, mergingSlimewispHitbox.box.posY, Vars.ACCELERATION, Vars.TURN_SPEED, 1);
   
         // Continue merge
         if (entitiesAreColliding(slimewisp, mergingSlimewisp) !== CollisionVars.NO_COLLISION) {
            slimewispComponent.mergeTimer -= Settings.DT_S;
            if (slimewispComponent.mergeTimer <= 0 && !entityIsFlaggedForDestruction(mergingSlimewisp)) {
               const x = (slimewispHitbox.box.posX + mergingSlimewispHitbox.box.posX) / 2;
               const y = (slimewispHitbox.box.posY + mergingSlimewispHitbox.box.posY) / 2;
               
               // Create a slime between the two wisps
               const config = createSlimeConfig(x, y, randAngle(), SlimeSize.small);
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
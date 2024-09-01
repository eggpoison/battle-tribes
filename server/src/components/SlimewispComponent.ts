import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID, EntityType, SlimeSize } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { TileType, Biome } from "webgl-test-shared/dist/tiles";
import { TileIndex, UtilVars } from "webgl-test-shared/dist/utils";
import { moveEntityToPosition, entityHasReachedPosition, stopEntity } from "../ai-shared";
import { shouldWander, getWanderTargetTile, wander } from "../ai/wander-ai";
import Board from "../Board";
import { entitiesAreColliding, CollisionVars } from "../collision";
import { createSlimeConfig } from "../entities/mobs/slime";
import { createEntityFromConfig } from "../Entity";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { TransformComponentArray, getEntityTile } from "./TransformComponent";
import { WanderAIComponentArray } from "./WanderAIComponent";
import { SlimewispVars } from "../entities/mobs/slimewisp";

const enum Vars {
   ACCELERATION = 100,
   TURN_SPEED = UtilVars.PI,
   SLIMEWISP_MERGE_TIME = 2
}

export interface SlimewispComponentParams {}

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
   const tileType = Board.tileTypes[tileIndex];
   
   // Slimewisps move at normal speed on slime blocks
   const physicsComponent = PhysicsComponentArray.getComponent(slimewisp);
   physicsComponent.overrideMoveSpeedMultiplier = tileType === TileType.slime || tileType === TileType.sludge;

   const aiHelperComponent = AIHelperComponentArray.getComponent(slimewisp);
   
   // Merge with other slimewisps
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const mergingSlimewisp = aiHelperComponent.visibleEntities[i];
      if (Board.getEntityType(mergingSlimewisp) === EntityType.slimewisp) {
         const mergingSlimewispTransformComponent = TransformComponentArray.getComponent(mergingSlimewisp);
         
         moveEntityToPosition(slimewisp, mergingSlimewispTransformComponent.position.x, mergingSlimewispTransformComponent.position.y, Vars.ACCELERATION, Vars.TURN_SPEED);
   
         // Continue merge
         if (entitiesAreColliding(slimewisp, mergingSlimewisp) !== CollisionVars.NO_COLLISION) {
            slimewispComponent.mergeTimer -= Settings.I_TPS;
            if (slimewispComponent.mergeTimer <= 0 && !Board.entityIsFlaggedForDestruction(mergingSlimewisp)) {
               // Create a slime between the two wisps
               const config = createSlimeConfig();
               config[ServerComponentType.transform].position.x = (transformComponent.position.x + mergingSlimewispTransformComponent.position.x) / 2;
               config[ServerComponentType.transform].position.y = (transformComponent.position.y + mergingSlimewispTransformComponent.position.y) / 2;
               config[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
               config[ServerComponentType.slime].size = SlimeSize.small;
               createEntityFromConfig(config);
            
               Board.destroyEntity(slimewisp);
               Board.destroyEntity(mergingSlimewisp);
            }
         }
         return;
      }
   }
   
   // Wander AI
   const wanderAIComponent = WanderAIComponentArray.getComponent(slimewisp);
   if (wanderAIComponent.targetPositionX !== -1) {
      if (entityHasReachedPosition(slimewisp, wanderAIComponent.targetPositionX, wanderAIComponent.targetPositionY)) {
         wanderAIComponent.targetPositionX = -1;
         stopEntity(physicsComponent);
      }
   } else if (shouldWander(physicsComponent, 99999)) {
      let attempts = 0;
      let targetTile: TileIndex;
      do {
         targetTile = getWanderTargetTile(slimewisp, SlimewispVars.VISION_RANGE);
      } while (++attempts <= 50 && (Board.tileIsWalls[targetTile] === 1 || Board.tileBiomes[targetTile] !== Biome.swamp));

      const tileX = Board.getTileX(targetTile);
      const tileY = Board.getTileY(targetTile);
      const x = (tileX + Math.random()) * Settings.TILE_SIZE;
      const y = (tileY + Math.random()) * Settings.TILE_SIZE;
      wander(slimewisp, x, y, Vars.ACCELERATION, Vars.TURN_SPEED);
   } else {
      stopEntity(physicsComponent);
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}
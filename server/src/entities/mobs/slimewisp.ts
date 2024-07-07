import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityID, EntityType, SlimeSize } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Biome, TileType } from "webgl-test-shared/dist/tiles";
import { Point } from "webgl-test-shared/dist/utils";
import { createEntityFromConfig } from "../../Entity";
import { WanderAIComponentArray } from "../../components/WanderAIComponent";
import { entityHasReachedPosition, moveEntityToPosition, stopEntity } from "../../ai-shared";
import { shouldWander, getWanderTargetTile, wander } from "../../ai/wander-ai";
import Tile from "../../Tile";
import { SlimewispComponentArray } from "../../components/SlimewispComponent";
import { AIHelperComponentArray } from "../../components/AIHelperComponent";
import { PhysicsComponentArray } from "../../components/PhysicsComponent";
import Board from "../../Board";
import { CollisionVars, entitiesAreColliding } from "../../collision";
import { CircularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentConfig } from "../../components";
import { TransformComponentArray } from "../../components/TransformComponent";
import { createSlimeConfig } from "./slime";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.wanderAI
   | ServerComponentType.aiHelper
   | ServerComponentType.slimewisp;

const MAX_HEALTH = 3;
const RADIUS = 16;

const VISION_RANGE = 100;

const ACCELERATION = 100;

const TURN_SPEED = Math.PI;

export const SLIMEWISP_MERGE_TIME = 2;

export function createSlimewispConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.slimewisp,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [new CircularHitbox(0.5, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, RADIUS)]
      },
      [ServerComponentType.physics]: {
         velocityX: 0,
         velocityY: 0,
         accelerationX: 0,
         accelerationY: 0,
         isAffectedByFriction: true,
         isImmovable: false
      },
      [ServerComponentType.health]: {
         maxHealth: 0
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: 0
      },
      [ServerComponentType.wanderAI]: {},
      [ServerComponentType.aiHelper]: {
         visionRange: StatusEffect.poisoned
      },
      [ServerComponentType.slimewisp]: {}
   };
}

export function tickSlimewisp(slimewisp: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(slimewisp);
   
   // Slimewisps move at normal speed on slime blocks
   const physicsComponent = PhysicsComponentArray.getComponent(slimewisp);
   physicsComponent.overrideMoveSpeedMultiplier = transformComponent.tile.type === TileType.slime || transformComponent.tile.type === TileType.sludge;

   const aiHelperComponent = AIHelperComponentArray.getComponent(slimewisp);
   
   // Merge with other slimewisps
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const mergingSlimewisp = aiHelperComponent.visibleEntities[i];
      if (Board.getEntityType(mergingSlimewisp) === EntityType.slimewisp) {
         const mergingSlimewispTransformComponent = TransformComponentArray.getComponent(mergingSlimewisp);
         
         moveEntityToPosition(slimewisp, mergingSlimewispTransformComponent.position.x, mergingSlimewispTransformComponent.position.y, ACCELERATION, TURN_SPEED);
   
         // Continue merge
         if (entitiesAreColliding(slimewisp, mergingSlimewisp) !== CollisionVars.NO_COLLISION) {
            const slimewispComponent = SlimewispComponentArray.getComponent(slimewisp);
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
      let targetTile: Tile;
      do {
         targetTile = getWanderTargetTile(slimewisp, VISION_RANGE);
      } while (++attempts <= 50 && (targetTile.isWall || targetTile.biome !== Biome.swamp));

      const x = (targetTile.x + Math.random()) * Settings.TILE_SIZE;
      const y = (targetTile.y + Math.random()) * Settings.TILE_SIZE;
      wander(slimewisp, x, y, ACCELERATION, TURN_SPEED);
   } else {
      stopEntity(physicsComponent);
   }
}
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType, SlimeSize } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Biome, TileType } from "webgl-test-shared/dist/tiles";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { WanderAIComponent, WanderAIComponentArray } from "../../components/WanderAIComponent";
import { entityHasReachedPosition, moveEntityToPosition, stopEntity } from "../../ai-shared";
import { shouldWander, getWanderTargetTile, wander } from "../../ai/wander-ai";
import Tile from "../../Tile";
import { SlimewispComponent, SlimewispComponentArray } from "../../components/SlimewispComponent";
import { createSlime } from "./slime";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { AIHelperComponent, AIHelperComponentArray } from "../../components/AIHelperComponent";
import { PhysicsComponent, PhysicsComponentArray } from "../../components/PhysicsComponent";
import Board from "../../Board";
import { CollisionVars, entitiesAreColliding } from "../../collision";
import { CircularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";

const MAX_HEALTH = 3;
const RADIUS = 16;

const VISION_RANGE = 100;

const ACCELERATION = 100;

const TURN_SPEED = Math.PI;

export const SLIMEWISP_MERGE_TIME = 2;

export function createSlimewisp(position: Point): Entity {
   const slimewisp = new Entity(position, 2 * Math.PI * Math.random(), EntityType.slimewisp, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);
   slimewisp.collisionPushForceMultiplier = 0.3;

   const hitbox = new CircularHitbox(0.5, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, RADIUS);
   slimewisp.addHitbox(hitbox);

   PhysicsComponentArray.addComponent(slimewisp.id, new PhysicsComponent(0, 0, 0, 0, true, false));
   HealthComponentArray.addComponent(slimewisp.id, new HealthComponent(MAX_HEALTH));
   StatusEffectComponentArray.addComponent(slimewisp.id, new StatusEffectComponent(StatusEffect.poisoned));
   SlimewispComponentArray.addComponent(slimewisp.id, new SlimewispComponent());
   WanderAIComponentArray.addComponent(slimewisp.id, new WanderAIComponent());
   AIHelperComponentArray.addComponent(slimewisp.id, new AIHelperComponent(VISION_RANGE));

   return slimewisp;
}

export function tickSlimewisp(slimewisp: Entity): void {
   // Slimewisps move at normal speed on slime blocks
   const physicsComponent = PhysicsComponentArray.getComponent(slimewisp.id);
   physicsComponent.overrideMoveSpeedMultiplier = slimewisp.tile.type === TileType.slime || slimewisp.tile.type === TileType.sludge;

   const aiHelperComponent = AIHelperComponentArray.getComponent(slimewisp.id);
   
   // Merge with other slimewisps
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const mergingSlimewisp = aiHelperComponent.visibleEntities[i];
      if (mergingSlimewisp.type === EntityType.slimewisp) {
         moveEntityToPosition(slimewisp, mergingSlimewisp.position.x, mergingSlimewisp.position.y, ACCELERATION, TURN_SPEED);
   
         // Continue merge
         if (entitiesAreColliding(slimewisp, mergingSlimewisp) !== CollisionVars.NO_COLLISION) {
            const slimewispComponent = SlimewispComponentArray.getComponent(slimewisp.id);
            slimewispComponent.mergeTimer -= Settings.I_TPS;
            if (slimewispComponent.mergeTimer <= 0 && !Board.entityIsFlaggedForDestruction(mergingSlimewisp)) {
               // Create a slime between the two wisps
               const slimeSpawnPosition = new Point((slimewisp.position.x + mergingSlimewisp.position.x) / 2, (slimewisp.position.y + mergingSlimewisp.position.y) / 2);
               createSlime(slimeSpawnPosition, SlimeSize.small, []);
            
               slimewisp.destroy();
               mergingSlimewisp.destroy();
            }
         }
         return;
      }
   }
   
   // Wander AI
   const wanderAIComponent = WanderAIComponentArray.getComponent(slimewisp.id);
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
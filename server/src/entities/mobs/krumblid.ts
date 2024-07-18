import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { Point, randInt } from "webgl-test-shared/dist/utils";
import { createItemsOverEntity } from "../../entity-shared";
import { WanderAIComponentArray } from "../../components/WanderAIComponent";
import { entityHasReachedPosition, moveEntityToPosition, stopEntity } from "../../ai-shared";
import { shouldWander, getWanderTargetTile, wander } from "../../ai/wander-ai";
import Tile from "../../Tile";
import { FollowAIComponentArray, entityWantsToFollow, startFollowingEntity, updateFollowAIComponent } from "../../components/FollowAIComponent";
import Board from "../../Board";
import { chooseEscapeEntity, registerAttackingEntity, runFromAttackingEntity } from "../../ai/escape-ai";
import { EscapeAIComponentArray, updateEscapeAIComponent } from "../../components/EscapeAIComponent";
import { AIHelperComponentArray } from "../../components/AIHelperComponent";
import { PhysicsComponentArray } from "../../components/PhysicsComponent";
import { Biome } from "webgl-test-shared/dist/tiles";
import { CircularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { ItemType } from "webgl-test-shared/dist/items/items";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentConfig } from "../../components";
import { TransformComponentArray } from "../../components/TransformComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.aiHelper
   | ServerComponentType.wanderAI
   | ServerComponentType.escapeAI
   | ServerComponentType.followAI;

const MAX_HEALTH = 15;
const KRUMBLID_SIZE = 48;
const VISION_RANGE = 224;

const MIN_FOLLOW_COOLDOWN = 7;
const MAX_FOLLOW_COOLDOWN = 9;
const FOLLOW_CHANCE_PER_SECOND = 0.3;

const TURN_SPEED = Math.PI * 2;

export function createKrumblidConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.krumblid,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [new CircularHitbox(0.75, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, KRUMBLID_SIZE / 2)]
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
         maxHealth: MAX_HEALTH
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: 0
      },
      [ServerComponentType.aiHelper]: {
         visionRange: VISION_RANGE
      },
      [ServerComponentType.wanderAI]: {},
      [ServerComponentType.escapeAI]: {},
      [ServerComponentType.followAI]: {
         followCooldownTicks: randInt(MIN_FOLLOW_COOLDOWN, MAX_FOLLOW_COOLDOWN),
         followChancePerSecond: FOLLOW_CHANCE_PER_SECOND,
         followDistance: 50
      }
   };
}

export function tickKrumblid(krumblid: EntityID): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(krumblid);
   
   // Escape AI
   const escapeAIComponent = EscapeAIComponentArray.getComponent(krumblid);
   updateEscapeAIComponent(escapeAIComponent, 5 * Settings.TPS);
   if (escapeAIComponent.attackingEntities.length > 0) {
      const escapeEntity = chooseEscapeEntity(krumblid, aiHelperComponent.visibleEntities);
      if (escapeEntity !== null) {
         runFromAttackingEntity(krumblid, escapeEntity, 500, TURN_SPEED);
         return;
      }
   }
   
   // Follow AI: Make the krumblid like to hide in cacti
   const followAIComponent = FollowAIComponentArray.getComponent(krumblid);
   updateFollowAIComponent(krumblid, aiHelperComponent.visibleEntities, 5);

   const followedEntity = followAIComponent.followTargetID;
   if (Board.hasEntity(followedEntity)) {
      const followedEntityTransformComponent = TransformComponentArray.getComponent(followedEntity);
      // Continue following the entity
      moveEntityToPosition(krumblid, followedEntityTransformComponent.position.x, followedEntityTransformComponent.position.y, 200, TURN_SPEED);
      return;
   } else if (entityWantsToFollow(followAIComponent)) {
      for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
         const entity = aiHelperComponent.visibleEntities[i];
         if (Board.getEntityType(entity) === EntityType.player) {
            // Follow the entity
            startFollowingEntity(krumblid, entity, 200, TURN_SPEED, randInt(MIN_FOLLOW_COOLDOWN, MAX_FOLLOW_COOLDOWN));
            return;
         }
      }
   }

   const physicsComponent = PhysicsComponentArray.getComponent(krumblid);

   // Wander AI
   const wanderAIComponent = WanderAIComponentArray.getComponent(krumblid);
   if (wanderAIComponent.targetPositionX !== -1) {
      if (entityHasReachedPosition(krumblid, wanderAIComponent.targetPositionX, wanderAIComponent.targetPositionY)) {
         wanderAIComponent.targetPositionX = -1;
         stopEntity(physicsComponent);
      }
   } else if (shouldWander(physicsComponent, 0.25)) {
      let attempts = 0;
      let targetTile: Tile;
      do {
         targetTile = getWanderTargetTile(krumblid, VISION_RANGE);
      } while (++attempts <= 50 && (targetTile.isWall || targetTile.biome !== Biome.desert));

      const x = (targetTile.x + Math.random()) * Settings.TILE_SIZE;
      const y = (targetTile.y + Math.random()) * Settings.TILE_SIZE;
      wander(krumblid, x, y, 200, TURN_SPEED);
   } else {
      stopEntity(physicsComponent);
   }
}

export function onKrumblidHurt(cow: EntityID, attackingEntity: EntityID): void {
   registerAttackingEntity(cow, attackingEntity);
}

export function onKrumblidDeath(krumblid: EntityID): void {
   createItemsOverEntity(krumblid, ItemType.leather, randInt(2, 3), 30);
}
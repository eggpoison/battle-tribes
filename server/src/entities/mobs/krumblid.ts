import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { ItemType } from "webgl-test-shared/dist/items";
import { Settings } from "webgl-test-shared/dist/settings";
import { Point, randInt } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import CircularHitbox from "../../hitboxes/CircularHitbox";
import { EscapeAIComponentArray, FollowAIComponentArray, HealthComponentArray, WanderAIComponentArray } from "../../components/ComponentArray";
import { HealthComponent } from "../../components/HealthComponent";
import { createItemsOverEntity } from "../../entity-shared";
import { WanderAIComponent } from "../../components/WanderAIComponent";
import { entityHasReachedPosition, moveEntityToPosition, stopEntity } from "../../ai-shared";
import { shouldWander, getWanderTargetTile, wander } from "../../ai/wander-ai";
import Tile from "../../Tile";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { FollowAIComponent, canFollow, followEntity, updateFollowAIComponent } from "../../components/FollowAIComponent";
import Board from "../../Board";
import { chooseEscapeEntity, registerAttackingEntity, runFromAttackingEntity } from "../../ai/escape-ai";
import { EscapeAIComponent, updateEscapeAIComponent } from "../../components/EscapeAIComponent";
import { AIHelperComponent, AIHelperComponentArray } from "../../components/AIHelperComponent";
import { PhysicsComponent, PhysicsComponentArray } from "../../components/PhysicsComponent";
import { Biome } from "webgl-test-shared/dist/tiles";

const MAX_HEALTH = 15;
const KRUMBLID_SIZE = 48;
const VISION_RANGE = 224;

const MIN_FOLLOW_COOLDOWN = 7;
const MAX_FOLLOW_COOLDOWN = 9;

const TURN_SPEED = Math.PI * 2;

export function createKrumblid(position: Point): Entity {
   const krumblid = new Entity(position, 2 * Math.PI * Math.random(), EntityType.krumblid, COLLISION_BITS.default, DEFAULT_COLLISION_MASK & ~COLLISION_BITS.cactus);

   const hitbox = new CircularHitbox(krumblid.position, 0.75, 0, 0, HitboxCollisionType.soft, KRUMBLID_SIZE / 2, krumblid.getNextHitboxLocalID(), krumblid.rotation, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK);
   krumblid.addHitbox(hitbox);

   PhysicsComponentArray.addComponent(krumblid.id, new PhysicsComponent(0, 0, 0, 0, true, false));
   HealthComponentArray.addComponent(krumblid.id, new HealthComponent(MAX_HEALTH));
   StatusEffectComponentArray.addComponent(krumblid.id, new StatusEffectComponent(0));
   WanderAIComponentArray.addComponent(krumblid.id, new WanderAIComponent());
   FollowAIComponentArray.addComponent(krumblid.id, new FollowAIComponent(randInt(MIN_FOLLOW_COOLDOWN, MAX_FOLLOW_COOLDOWN)));
   EscapeAIComponentArray.addComponent(krumblid.id, new EscapeAIComponent());
   AIHelperComponentArray.addComponent(krumblid.id, new AIHelperComponent(VISION_RANGE));

   return krumblid;
}

export function tickKrumblid(krumblid: Entity): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(krumblid.id);
   
   // Escape AI
   const escapeAIComponent = EscapeAIComponentArray.getComponent(krumblid.id);
   updateEscapeAIComponent(escapeAIComponent, 5 * Settings.TPS);
   if (escapeAIComponent.attackingEntityIDs.length > 0) {
      const escapeEntity = chooseEscapeEntity(krumblid, aiHelperComponent.visibleEntities);
      if (escapeEntity !== null) {
         runFromAttackingEntity(krumblid, escapeEntity, 500, TURN_SPEED);
         return;
      }
   }
   
   // Follow AI: Make the krumblid like to hide in cacti
   const followAIComponent = FollowAIComponentArray.getComponent(krumblid.id);
   updateFollowAIComponent(krumblid, aiHelperComponent.visibleEntities, 5);
   if (followAIComponent.followTargetID !== 0) {
      // Continue following the entity
      const followedEntity = Board.entityRecord[followAIComponent.followTargetID]!;
      moveEntityToPosition(krumblid, followedEntity.position.x, followedEntity.position.y, 200, TURN_SPEED);
      return;
   } else if (canFollow(followAIComponent)) {
      for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
         const entity = aiHelperComponent.visibleEntities[i];
         if (entity.type === EntityType.player) {
            // Follow the entity
            followEntity(krumblid, entity, 200, TURN_SPEED, randInt(MIN_FOLLOW_COOLDOWN, MAX_FOLLOW_COOLDOWN));
            return;
         }
      }
   }

   const physicsComponent = PhysicsComponentArray.getComponent(krumblid.id);

   // Wander AI
   const wanderAIComponent = WanderAIComponentArray.getComponent(krumblid.id);
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

export function onKrumblidHurt(cow: Entity, attackingEntity: Entity): void {
   registerAttackingEntity(cow, attackingEntity);
}

export function onKrumblidDeath(krumblid: Entity): void {
   createItemsOverEntity(krumblid, ItemType.leather, randInt(2, 3), 30);
}
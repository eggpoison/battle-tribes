import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityType, PlayerCauseOfDeath, EntityID } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point, randInt } from "battletribes-shared/utils";
import { Settings } from "battletribes-shared/settings";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { YetiComponentArray } from "../../components/YetiComponent";
import Layer from "../../Layer";
import { createItemsOverEntity } from "../../entity-shared";
import { applyKnockback } from "../../components/PhysicsComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { SnowballComponentArray } from "../../components/SnowballComponent";
import { ItemType } from "battletribes-shared/items/items";
import { ComponentConfig } from "../../components";
import { TransformComponentArray } from "../../components/TransformComponent";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { getEntityType } from "../../world";

export const enum YetiVars {
   VISION_RANGE = 500
}

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.wanderAI
   | ServerComponentType.aiHelper
   | ServerComponentType.yeti;

const YETI_SIZE = 128;

const ATTACK_PURSUE_TIME_TICKS = 5 * Settings.TPS;

export const YETI_SNOW_THROW_COOLDOWN = 7;

export enum SnowThrowStage {
   windup,
   hold,
   return
}

export function createYetiConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.yeti,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [createHitbox(new CircularBox(new Point(0, 0), 0, YETI_SIZE / 2), 3, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0)]
      },
      [ServerComponentType.physics]: {
         velocityX: 0,
         velocityY: 0,
         accelerationX: 0,
         accelerationY: 0,
         traction: 1,
         isAffectedByFriction: true,
         isImmovable: false
      },
      [ServerComponentType.health]: {
         maxHealth: 100
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: StatusEffect.freezing
      },
      [ServerComponentType.wanderAI]: {},
      [ServerComponentType.aiHelper]: {
         ignoreDecorativeEntities: true,
         visionRange: YetiVars.VISION_RANGE
      },
      [ServerComponentType.yeti]: {
         territory: []
      }
   };
}

export function onYetiCollision(yeti: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   const collidingEntityType = getEntityType(collidingEntity);
   
   // Don't damage ice spikes
   if (collidingEntityType === EntityType.iceSpikes) return;

   // Don't damage snowballs thrown by the yeti
   if (collidingEntityType === EntityType.snowball) {
      const snowballComponent = SnowballComponentArray.getComponent(collidingEntity);
      if (snowballComponent.yetiID === yeti) {
         return;
      }
   }
   
   // Don't damage yetis which haven't damaged it
   const yetiComponent = YetiComponentArray.getComponent(yeti);
   if ((collidingEntityType === EntityType.yeti || collidingEntityType === EntityType.frozenYeti) && !yetiComponent.attackingEntities.hasOwnProperty(collidingEntity)) {
      return;
   }
   
   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (!canDamageEntity(healthComponent, "yeti")) {
         return;
      }

      const transformComponent = TransformComponentArray.getComponent(yeti);
      const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
      
      const hitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);
      
      damageEntity(collidingEntity, yeti, 2, PlayerCauseOfDeath.yeti, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingEntity, 200, hitDirection);
      addLocalInvulnerabilityHash(healthComponent, "yeti", 0.3);
   }
}

export function onYetiHurt(yeti: EntityID, attackingEntity: EntityID, damage: number): void {
   const yetiComponent = YetiComponentArray.getComponent(yeti);

   const attackingEntityInfo = yetiComponent.attackingEntities[attackingEntity];
   if (typeof attackingEntityInfo !== "undefined") {
      attackingEntityInfo.remainingPursueTicks += ATTACK_PURSUE_TIME_TICKS;
      attackingEntityInfo.totalDamageDealt += damage;
   } else {
      yetiComponent.attackingEntities[attackingEntity] = {
         remainingPursueTicks: ATTACK_PURSUE_TIME_TICKS,
         totalDamageDealt: damage
      };
   }
}

export function onYetiDeath(yeti: EntityID): void {
   createItemsOverEntity(yeti, ItemType.raw_beef, randInt(4, 7), 80);
   createItemsOverEntity(yeti, ItemType.yeti_hide, randInt(2, 3), 80);
}
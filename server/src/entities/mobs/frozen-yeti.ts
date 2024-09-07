import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType, PlayerCauseOfDeath, EntityID } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point, randInt } from "webgl-test-shared/dist/utils";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { createItemsOverEntity } from "../../entity-shared";
import { FrozenYetiComponentArray } from "../../components/FrozenYetiComponent";
import Board from "../../Board";
import { applyKnockback } from "../../components/PhysicsComponent";
import { wasTribeMemberKill } from "../tribes/tribe-member";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { ItemType } from "webgl-test-shared/dist/items/items";
import { ComponentConfig } from "../../components";
import { TransformComponentArray } from "../../components/TransformComponent";
import { createHitbox, HitboxCollisionType, HitboxWrapper } from "webgl-test-shared/dist/boxes/boxes";
import CircularBox from "webgl-test-shared/dist/boxes/CircularBox";

export const enum FrozenYetiVars {
   VISION_RANGE = 350,
   FROZEN_YETI_SIZE = 144
}

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.aiHelper
   | ServerComponentType.wanderAI
   | ServerComponentType.frozenYeti;

const HEAD_HITBOX_SIZE = 72;
const HEAD_DISTANCE = 60;
const PAW_SIZE = 32;
const PAW_OFFSET = 80;
const PAW_RESTING_ANGLE = Math.PI / 3.5;


export const FROZEN_YETI_GLOBAL_ATTACK_COOLDOWN = 1.25;
export const FROZEN_YETI_BITE_COOLDOWN = 5;
export const FROZEN_YETI_SNOWBALL_THROW_COOLDOWN = 10;
export const FROZEN_YETI_ROAR_COOLDOWN = 10;
export const FROZEN_YETI_STOMP_COOLDOWN = 10;

export interface FrozenYetiTargetInfo {
   damageDealtToSelf: number;
   timeSinceLastAggro: number;
}

export interface FrozenYetiRockSpikeInfo {
   readonly positionX: number;
   readonly positionY: number;
   readonly size: number;
}

export function createFrozenYetiConfig(): ComponentConfig<ComponentTypes> {
   const hitboxes = new Array<HitboxWrapper>();

   const bodyHitbox = createHitbox(new CircularBox(new Point(0, 0), FrozenYetiVars.FROZEN_YETI_SIZE / 2), 4, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0);
   hitboxes.push(bodyHitbox);

   const headHitbox = createHitbox(new CircularBox(new Point(0, HEAD_DISTANCE), HEAD_HITBOX_SIZE / 2), 0.8, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0);
   hitboxes.push(headHitbox);

   // Paw hitboxes
   for (let i = 0; i < 2; i++) {
      const pawDirection = PAW_RESTING_ANGLE * (i === 0 ? -1 : 1);
      const hitbox = createHitbox(new CircularBox(Point.fromVectorForm(PAW_OFFSET, pawDirection), PAW_SIZE / 2), 0.6, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0);
      hitboxes.push(hitbox);
   }
   
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.frozenYeti,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: hitboxes
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
         maxHealth: 250
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: StatusEffect.freezing
      },
      [ServerComponentType.aiHelper]: {
         ignoreDecorativeEntities: true,
         visionRange: FrozenYetiVars.VISION_RANGE
      },
      [ServerComponentType.wanderAI]: {},
      [ServerComponentType.frozenYeti]: {}
   };
}

export function onFrozenYetiCollision(frozenYeti: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   const collidingEntityType = Board.getEntityType(collidingEntity);
   
   if (collidingEntity === null || collidingEntityType === EntityType.iceSpikes) {
      return;
   }

   // Don't deal collision damage to frozen yetis which aren't attacking them
   if (collidingEntityType === EntityType.frozenYeti) {
      const yetiComponent = FrozenYetiComponentArray.getComponent(frozenYeti);
      if (!yetiComponent.attackingEntities.hasOwnProperty(collidingEntity)) {
         return;
      }
   }

   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (!canDamageEntity(healthComponent, "frozen_yeti")) {
         return;
      }
      
      const transformComponent = TransformComponentArray.getComponent(frozenYeti);
      const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
      const hitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);

      damageEntity(collidingEntity, frozenYeti, 5, PlayerCauseOfDeath.yeti, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingEntity, 250, hitDirection);

      addLocalInvulnerabilityHash(healthComponent, "frozen_yeti", 0.3);
   }
}

export function onFrozenYetiHurt(frozenYeti: EntityID, attackingEntity: EntityID, damage: number): void {
   const frozenYetiComponent = FrozenYetiComponentArray.getComponent(frozenYeti);

   // Update/create the entity's targetInfo record
   const attackingInfo = frozenYetiComponent.attackingEntities[attackingEntity];
   if (typeof attackingInfo !== "undefined") {
      attackingInfo.damageDealtToSelf += damage;
      attackingInfo.timeSinceLastAggro = 0;
   } else {
      frozenYetiComponent.attackingEntities[attackingEntity] = {
         damageDealtToSelf: damage,
         timeSinceLastAggro: 0
      };
   }
}

export function onFrozenYetiDeath(frozenYeti: EntityID, attackingEntity: EntityID | null): void {
   createItemsOverEntity(frozenYeti, ItemType.raw_beef, randInt(13, 18), 90);

   if (wasTribeMemberKill(attackingEntity)) {
      createItemsOverEntity(frozenYeti, ItemType.deepfrost_heart, randInt(2, 3), 30);
      createItemsOverEntity(frozenYeti, ItemType.yeti_hide, randInt(5, 7), 90);
   }
}
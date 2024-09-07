import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityID, EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import { SlimeSpitComponentArray } from "../../components/SlimeSpitComponent";
import { HealthComponentArray, damageEntity } from "../../components/HealthComponent";
import { StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { applyKnockback } from "../../components/PhysicsComponent";
import { ComponentConfig } from "../../components";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import Board from "../../Board";
import { TransformComponentArray } from "../../components/TransformComponent";
import { createSpitPoisonAreaConfig } from "./spit-poison-area";
import { createEntityFromConfig } from "../../Entity";
import { createHitbox, HitboxCollisionType } from "webgl-test-shared/dist/boxes/boxes";
import RectangularBox from "webgl-test-shared/dist/boxes/RectangularBox";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.slimeSpit;

export function createSlimeSpitConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.slimeSpit,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [createHitbox(new RectangularBox(new Point(0, 0), 0, 0, 0), 0.2, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0)]
      },
      [ServerComponentType.physics]: {
         velocityX: 0,
         velocityY: 0,
         accelerationX: 0,
         accelerationY: 0,
         isAffectedByFriction: true,
         isImmovable: false
      },
      [ServerComponentType.slimeSpit]: {
         size: 0
      }
   };
}

export function onSlimeSpitCollision(spit: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   const collidingEntityType = Board.getEntityType(collidingEntity);
   if (collidingEntityType === EntityType.slime || collidingEntityType === EntityType.slimewisp || !HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   const transformComponent = TransformComponentArray.getComponent(spit);
   const spitComponent = SlimeSpitComponentArray.getComponent(spit);

   const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);

   const damage = spitComponent.size === 0 ? 2 : 3;
   const hitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);

   damageEntity(collidingEntity, spit, damage, PlayerCauseOfDeath.poison, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingEntity, 150, hitDirection);
   
   if (StatusEffectComponentArray.hasComponent(collidingEntity)) {
      applyStatusEffect(collidingEntity, StatusEffect.poisoned, 2 * Settings.TPS);
   }

   Board.destroyEntity(spit);
}

export function onSlimeSpitDeath(spit: EntityID): void {
   const spitComponent = SlimeSpitComponentArray.getComponent(spit);
   if (spitComponent.size === 1) {
      const transformComponent = TransformComponentArray.getComponent(spit);

      const config = createSpitPoisonAreaConfig();
      config[ServerComponentType.transform].position.x = transformComponent.position.x;
      config[ServerComponentType.transform].position.y = transformComponent.position.y;
      config[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
      createEntityFromConfig(config);
   }
}
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityID, EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { CircularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentConfig } from "../../components";
import { TransformComponentArray } from "../../components/TransformComponent";
import Board from "../../Board";

type ComponentTypes = ServerComponentType.transform;

const RADIUS = 55;

export function createSpitPoisonConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.spitPoison,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         // @Hack mass
         hitboxes: [new CircularHitbox(Number.EPSILON, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, RADIUS)]
      },
   }
}

export function tickSpitPoison(spit: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(spit);
   
   const hitbox = transformComponent.hitboxes[0] as CircularHitbox;
   hitbox.radius -= 5 / Settings.TPS;
   if (hitbox.radius <= 0) {
      Board.destroyEntity(spit);
   }
   
   // @Incomplete: Shrinking the hitbox should make the hitboxes dirty, but hitboxes being dirty only has an impact on entities with a physics component.
   // Fundamental problem with the hitbox/dirty system.
}

export function onSpitPoisonCollision(spit: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   const collidingEntityType = Board.getEntityType(collidingEntity);
   if (collidingEntityType === EntityType.slime || collidingEntityType === EntityType.slimewisp || !HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "spitPoison")) {
      return;
   }

   damageEntity(collidingEntity, spit, 1, PlayerCauseOfDeath.poison, AttackEffectiveness.effective, collisionPoint, 0);
   addLocalInvulnerabilityHash(healthComponent, "spitPoison", 0.35);

   if (StatusEffectComponentArray.hasComponent(collidingEntity)) {
      applyStatusEffect(collidingEntity, StatusEffect.poisoned, 3 * Settings.TPS);
   }
}
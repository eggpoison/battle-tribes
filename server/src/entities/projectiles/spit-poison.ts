import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { HealthComponentArray } from "../../components/ComponentArray";
import { addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import CircularHitbox from "../../hitboxes/CircularHitbox";
import { StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { SERVER } from "../../server";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";

const RADIUS = 55;

export function createSpitPoison(position: Point, rotation: number): Entity {
   const poison = new Entity(position, rotation, EntityType.spitPoison, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);
   
   // @Hack mass
   const hitbox = new CircularHitbox(position, Number.EPSILON, 0, 0, HitboxCollisionType.soft, RADIUS, poison.getNextHitboxLocalID(), poison.rotation, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK);
   poison.addHitbox(hitbox);
   
   return poison;
}

export function tickSpitPoison(spit: Entity): void {
   const hitbox = spit.hitboxes[0] as CircularHitbox;
   hitbox.radius -= 5 / Settings.TPS;
   if (hitbox.radius <= 0) {
      spit.destroy();
   }
   
   // @Incomplete: Shrinking the hitbox should make the hitboxes dirty, but hitboxes being dirty only has an impact on entities with a physics component.
   // Fundamental problem with the hitbox/dirty system.
}

export function onSpitPoisonCollision(spit: Entity, collidingEntity: Entity, collisionPoint: Point): void {
   if (collidingEntity.type === EntityType.slime || collidingEntity.type === EntityType.slimewisp || !HealthComponentArray.hasComponent(collidingEntity.id)) {
      return;
   }

   const healthComponent = HealthComponentArray.getComponent(collidingEntity.id);
   if (!canDamageEntity(healthComponent, "spitPoison")) {
      return;
   }

   damageEntity(collidingEntity, spit, 1, PlayerCauseOfDeath.poison, AttackEffectiveness.effective, collisionPoint, 0);
   addLocalInvulnerabilityHash(healthComponent, "spitPoison", 0.35);

   if (StatusEffectComponentArray.hasComponent(collidingEntity.id)) {
      applyStatusEffect(collidingEntity.id, StatusEffect.poisoned, 3 * Settings.TPS);
   }
}
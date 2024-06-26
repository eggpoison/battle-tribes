import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { Point, randFloat } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { RockSpikeProjectileComponent, RockSpikeProjectileComponentArray } from "../../components/RockSpikeProjectileComponent";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { applyKnockback } from "../../components/PhysicsComponent";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { CircularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";

// @Cleanup: why do we have to export these?
export const ROCK_SPIKE_HITBOX_SIZES = [12 * 2, 16 * 2, 20 * 2];
export const ROCK_SPIKE_MASSES = [1, 1.75, 2.5];

export function createRockSpikeProjectile(position: Point, rotation: number, size: number, frozenYetiID: number): Entity {
   const rockSpikeProjectile = new Entity(position, rotation, EntityType.rockSpikeProjectile, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitbox = new CircularHitbox(ROCK_SPIKE_MASSES[size], new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, ROCK_SPIKE_HITBOX_SIZES[size]);
   rockSpikeProjectile.addHitbox(hitbox);

   const lifetimeTicks = Math.floor(randFloat(3.5, 4.5) * Settings.TPS);
   RockSpikeProjectileComponentArray.addComponent(rockSpikeProjectile.id, new RockSpikeProjectileComponent(size, lifetimeTicks, frozenYetiID));

   return rockSpikeProjectile;
}

export function tickRockSpikeProjectile(rockSpikeProjectile: Entity): void {
   // Remove if past lifetime
   const rockSpikeProjectileComponent = RockSpikeProjectileComponentArray.getComponent(rockSpikeProjectile.id);
   if (rockSpikeProjectile.ageTicks >= rockSpikeProjectileComponent.lifetimeTicks) {
      rockSpikeProjectile.destroy();
   }
}

export function onRockSpikeProjectileCollision(rockSpikeProjectile: Entity, collidingEntity: Entity, collisionPoint: Point): void {
   const rockSpikeProjectileComponent = RockSpikeProjectileComponentArray.getComponent(rockSpikeProjectile.id);

   // Don't hurt the yeti which created the spike
   if (collidingEntity.id === rockSpikeProjectileComponent.frozenYetiID) {
      return;
   }
   
   // Damage the entity
   if (HealthComponentArray.hasComponent(collidingEntity.id)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity.id);
      if (!canDamageEntity(healthComponent, "rock_spike")) {
         return;
      }
      
      const hitDirection = rockSpikeProjectile.position.calculateAngleBetween(collidingEntity.position);
      
      damageEntity(collidingEntity, null, 5, PlayerCauseOfDeath.rock_spike, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingEntity, 200, hitDirection);
      addLocalInvulnerabilityHash(healthComponent, "rock_spike", 0.3);
   }
}
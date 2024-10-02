import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityID, EntityType, PlayerCauseOfDeath } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Point, randFloat } from "battletribes-shared/utils";
import { RockSpikeComponentArray } from "../../components/RockSpikeComponent";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { applyKnockback } from "../../components/PhysicsComponent";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { ServerComponentType } from "battletribes-shared/components";
import { ComponentConfig } from "../../components";
import { TransformComponentArray } from "../../components/TransformComponent";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.rockSpike;

export function createRockSpikeConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.rockSpikeProjectile,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [createHitbox(new CircularBox(new Point(0, 0), 0, 0), 0, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [])]
      },
      [ServerComponentType.rockSpike]: {
         size: 0,
         lifetimeTicks: Math.floor(randFloat(3.5, 4.5) * Settings.TPS),
         frozenYetiID: 0
      }
   };
}

export function onRockSpikeProjectileCollision(rockSpikeProjectile: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   const rockSpikeProjectileComponent = RockSpikeComponentArray.getComponent(rockSpikeProjectile);

   // Don't hurt the yeti which created the spike
   if (collidingEntity === rockSpikeProjectileComponent.frozenYeti) {
      return;
   }
   
   // Damage the entity
   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (!canDamageEntity(healthComponent, "rock_spike")) {
         return;
      }
      
      const transformComponent = TransformComponentArray.getComponent(rockSpikeProjectile);
      const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);

      const hitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);
      
      damageEntity(collidingEntity, null, 5, PlayerCauseOfDeath.rock_spike, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingEntity, 200, hitDirection);
      addLocalInvulnerabilityHash(healthComponent, "rock_spike", 0.3);
   }
}
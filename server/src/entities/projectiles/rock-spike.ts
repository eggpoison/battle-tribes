import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityID, EntityType, PlayerCauseOfDeath } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { RockSpikeComponent, RockSpikeComponentArray } from "../../components/RockSpikeComponent";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { applyKnockback } from "../../components/PhysicsComponent";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { CollisionGroup } from "../../../../shared/src/collision-groups";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.rockSpike;

const MASSES = [1, 1.75, 2.5];
export const ROCK_SPIKE_HITBOX_SIZES = [12 * 2, 16 * 2, 20 * 2];

export function createRockSpikeConfig(size: number, frozenYeti: EntityID): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(CollisionGroup.default);
   const hitbox = createHitbox(new CircularBox(new Point(0, 0), 0, ROCK_SPIKE_HITBOX_SIZES[size]), MASSES[size], HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const rockSpikeComponent = new RockSpikeComponent(size, frozenYeti);
   
   return {
      entityType: EntityType.rockSpikeProjectile,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.rockSpike]: rockSpikeComponent
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
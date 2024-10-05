import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { PlanterBoxPlant, ServerComponentType } from "battletribes-shared/components";
import { EntityID, EntityType, PlayerCauseOfDeath } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { applyKnockback, PhysicsComponent } from "../../components/PhysicsComponent";
import { EntityConfig } from "../../components";
import { PlantComponentArray } from "../../components/PlantComponent";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { destroyEntity, getEntityType } from "../../world";
import { IceShardComponent } from "../../components/IceShardComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.iceShard;

export function createIceShardConfig(): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   transformComponent.collisionMask = DEFAULT_COLLISION_MASK & ~COLLISION_BITS.planterBox;
   const hitbox = createHitbox(new RectangularBox(new Point(0, 0), 24, 24, 0), 0.4, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const physicsComponent = new PhysicsComponent();
   physicsComponent.isAffectedByGroundFriction = false;

   const iceShardComponent = new IceShardComponent();
   
   return {
      entityType: EntityType.iceShardProjectile,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.iceShard]: iceShardComponent
      }
   };
}

const entityIsIceSpikes = (entity: EntityID): boolean => {
   switch (getEntityType(entity)) {
      case EntityType.iceSpikes: {
         return true;
      }
      case EntityType.plant: {
         const plantComponent = PlantComponentArray.getComponent(entity);
         return plantComponent.plantType === PlanterBoxPlant.iceSpikes;
      }
      default: {
         return false;
      }
   }
}

export function onIceShardCollision(iceShard: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   // Shatter the ice spike
   destroyEntity(iceShard);

   if (entityIsIceSpikes(collidingEntity)) {
      // Instantly destroy ice spikes
      damageEntity(collidingEntity, null, 99999, PlayerCauseOfDeath.ice_spikes, AttackEffectiveness.effective, collisionPoint, 0);
   } else {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (!canDamageEntity(healthComponent, "ice_shards")) {
         return;
      }

      const transformComponent = TransformComponentArray.getComponent(iceShard);
      const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
      
      const hitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);

      damageEntity(collidingEntity, null, 2, PlayerCauseOfDeath.ice_shards, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingEntity, 150, hitDirection);
      addLocalInvulnerabilityHash(healthComponent, "ice_shards", 0.3);

      if (StatusEffectComponentArray.hasComponent(collidingEntity)) {
         applyStatusEffect(collidingEntity, StatusEffect.freezing, 3 * Settings.TPS);
      }
   }
}
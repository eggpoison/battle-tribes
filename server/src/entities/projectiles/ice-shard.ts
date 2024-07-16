import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { PlanterBoxPlant, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityID, EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { applyKnockback } from "../../components/PhysicsComponent";
import { ComponentConfig } from "../../components";
import { PlantComponentArray } from "../../components/PlantComponent";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { IceShardComponentArray } from "../../components/IceShardComponent";
import { HitboxCollisionType, RectangularHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { TransformComponentArray } from "../../components/TransformComponent";
import Board from "../../Board";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.iceShard;

export function createIceShardConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.iceShardProjectile,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK & ~COLLISION_BITS.planterBox,
         hitboxes: [new RectangularHitbox(0.4, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 24, 24, 0)]
      },
      [ServerComponentType.physics]: {
         velocityX: 0,
         velocityY: 0,
         accelerationX: 0,
         accelerationY: 0,
         isAffectedByFriction: true,
         isImmovable: false
      },
      [ServerComponentType.iceShard]: {}
   };
}

export function tickIceShard(iceShard: EntityID): void {
   // @Cleanup @Speed: Don't even need a component for this, just do it based on age with a random chance
   const iceShardComponent = IceShardComponentArray.getComponent(iceShard);
   const transformComponent = TransformComponentArray.getComponent(iceShard);
   if (transformComponent.ageTicks / Settings.TPS >= iceShardComponent.lifetime) {
      Board.destroyEntity(iceShard);
   }
}

const entityIsIceSpikes = (entity: EntityID): boolean => {
   switch (Board.getEntityType(entity)) {
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
   Board.destroyEntity(iceShard);

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
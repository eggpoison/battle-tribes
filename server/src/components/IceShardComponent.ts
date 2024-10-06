import { PlanterBoxPlant, ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Point, randFloat } from "battletribes-shared/utils";
import { EntityID, EntityType, PlayerCauseOfDeath } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { destroyEntity, getEntityAgeTicks, getEntityType } from "../world";
import { Hitbox } from "../../../shared/src/boxes/boxes";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { StatusEffect } from "../../../shared/src/status-effects";
import { HealthComponentArray, damageEntity, canDamageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { applyKnockback } from "./PhysicsComponent";
import { PlantComponentArray } from "./PlantComponent";
import { StatusEffectComponentArray, applyStatusEffect } from "./StatusEffectComponent";
import { TransformComponentArray } from "./TransformComponent";

export class IceShardComponent {
   public readonly lifetime = randFloat(0.1, 0.2);
}

export const IceShardComponentArray = new ComponentArray<IceShardComponent>(ServerComponentType.iceShard, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   onHitboxCollision: onHitboxCollision,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onTick(iceShardComponent: IceShardComponent, iceShard: EntityID): void {
   const ageTicks = getEntityAgeTicks(iceShard);
   
   // @Cleanup @Speed: Don't even need a component for this, just do it based on age with a random chance
   if (ageTicks / Settings.TPS >= iceShardComponent.lifetime) {
      destroyEntity(iceShard);
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}

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

function onHitboxCollision(iceShard: EntityID, collidingEntity: EntityID, _pushedHitbox: Hitbox, _pushingHitbox: Hitbox, collisionPoint: Point): void {
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
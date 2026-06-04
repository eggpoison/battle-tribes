import { ServerComponentType } from "../../../shared/dist/components.js";
import { Entity, EntityType, DamageSource } from "../../../shared/dist/entities.js";
import { AttackEffectiveness } from "../../../shared/dist/entity-damage-types.js";
import { Settings } from "../../../shared/dist/settings.js";
import { StatusEffect } from "../../../shared/dist/status-effects.js";
import { randFloat, Point, angle, polarVec2 } from "../../../shared/dist/utils.js";
import { ComponentArray } from "./ComponentArray.js";
import { destroyEntity, getEntityAgeTicks, getEntityType } from "../world.js";
import { HealthComponentArray, damageEntity, canDamageEntity, addLocalInvulnerabilityHash } from "./HealthComponent.js";
import { StatusEffectComponentArray, applyStatusEffect } from "./StatusEffectComponent.js";
import { applyKnockback, Hitbox } from "../hitboxes.js";

export class IceShardComponent {
   public readonly lifetime = randFloat(0.1, 0.2);
}

export const IceShardComponentArray = new ComponentArray<IceShardComponent>(ServerComponentType.iceShard, true, getDataLength, addDataToPacket);
IceShardComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
IceShardComponentArray.onHitboxCollision = onHitboxCollision;

function onTick(iceShard: Entity): void {
   const iceShardComponent = IceShardComponentArray.getComponent(iceShard);
   
   // @Cleanup @Speed: Don't even need a component for this, just do it based on age with a random chance
   const ageTicks = getEntityAgeTicks(iceShard);
   if (ageTicks * Settings.DT_S >= iceShardComponent.lifetime) {
      destroyEntity(iceShard);
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const collidingEntity = collidingHitbox.entity;
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   // Shatter the ice spike
   destroyEntity(hitbox.entity);

   const collidingEntityType = getEntityType(collidingEntity);
   if (collidingEntityType === EntityType.iceSpikes || collidingEntityType === EntityType.iceSpikesPlanted) {
      // Instantly destroy ice spikes
      damageEntity(collidingHitbox, null, 99999, DamageSource.iceShards, AttackEffectiveness.effective, collisionPoint, 0);
   } else {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (!canDamageEntity(healthComponent, "ice_shards")) {
         return;
      }

      const hitDirection = angle(collidingHitbox.box.posX - hitbox.box.posX, collidingHitbox.box.posY - hitbox.box.posY);

      damageEntity(collidingHitbox, null, 2, DamageSource.iceShards, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingHitbox, polarVec2(150, hitDirection));
      addLocalInvulnerabilityHash(collidingEntity, "ice_shards", 0.3);

      if (StatusEffectComponentArray.hasComponent(collidingEntity)) {
         applyStatusEffect(collidingEntity, StatusEffect.freezing, 3 * Settings.TICK_RATE);
      }
   }
}
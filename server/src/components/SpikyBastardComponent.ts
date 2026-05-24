import { ServerComponentType, DamageSource, AttackEffectiveness, Point, polarVec2, angle } from "battletribes-shared";
import { applyKnockback, Hitbox } from "../hitboxes.js";
import { ComponentArray } from "./ComponentArray.js";
import { GlurbSegmentComponentArray } from "./GlurbSegmentComponent.js";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent.js";

export class SpikyBastardComponent {}

export const SpikyBastardComponentArray = new ComponentArray<SpikyBastardComponent>(ServerComponentType.spikyBastard, true, getDataLength, addDataToPacket,);
SpikyBastardComponentArray.onHitboxCollision = onHitboxCollision;

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const collidingEntity = collidingHitbox.entity;
   
   if (GlurbSegmentComponentArray.hasComponent(collidingEntity)) {
      return;
   }
   
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "spikyBastard")) {
      return;
   }

   const hitDirection = angle(collidingHitbox.box.posX - hitbox.box.posX, collidingHitbox.box.posY - hitbox.box.posY);

   damageEntity(collidingHitbox, hitbox.entity, 1, DamageSource.cactus, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingHitbox, polarVec2(100, hitDirection));
   addLocalInvulnerabilityHash(collidingEntity, "spikyBastard", 0.3);
}
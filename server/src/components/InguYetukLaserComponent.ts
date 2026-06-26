import { ServerComponentType } from "../../../shared/dist/components.js";
import { Entity, EntityType, DamageSource } from "../../../shared/dist/entities.js";
import { AttackEffectiveness } from "../../../shared/dist/entity-damage-types.js";
import { Point, angle, polarVec2 } from "../../../shared/dist/utils.js";
import { applyAbsoluteKnockback, getHitboxVelocity, Hitbox } from "../hitboxes.js";
import { destroyEntity, getEntityType } from "../world.js";
import { ComponentArray } from "./ComponentArray.js";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent.js";
import { TransformComponentArray } from "./TransformComponent.js";

export class InguYetukLaserComponent {}

export const InguYetukLaserComponentArray = new ComponentArray<InguYetukLaserComponent>(ServerComponentType.inguYetukLaser, true, getDataLength, addDataToPacket);
InguYetukLaserComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
};
InguYetukLaserComponentArray.onHitboxCollision = onHitboxCollision;

function onTick(laser: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(laser);
   const hitbox = transformComponent.hitboxes[0];
   if (getHitboxVelocity(hitbox).magnitude() < 150) {
      destroyEntity(laser);
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const collidingEntity = collidingHitbox.entity;

   if (getEntityType(collidingEntity) === EntityType.inguYetuksnoglurblidokowflea || getEntityType(collidingEntity) === EntityType.inguYetuksnoglurblidokowfleaSeekerHead) {
      return;
   }
   
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }
   
   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "yetukshit")) {
      return;
   }

   const hitDir = angle(collidingHitbox.box.posX - hitbox.box.posX, collidingHitbox.box.posY - hitbox.box.posY);

   damageEntity(collidingHitbox, hitbox.entity, 2, DamageSource.cactus, AttackEffectiveness.effective, collisionPoint, 0);
   const knockbackX = 400 * Math.sin(hitDir);
   const knockbackY = 400 * Math.cos(hitDir);
   applyAbsoluteKnockback(collidingHitbox, knockbackX, knockbackY);
   addLocalInvulnerabilityHash(collidingEntity, "yetukshit", 0.25);
}
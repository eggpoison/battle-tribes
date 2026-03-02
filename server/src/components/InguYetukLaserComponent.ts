import { ServerComponentType } from "../../../shared/src/components";
import { DamageSource, Entity, EntityType } from "../../../shared/src/entities";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { Point, polarVec2 } from "../../../shared/src/utils";
import { applyAbsoluteKnockback, getHitboxVelocity, Hitbox } from "../hitboxes";
import { destroyEntity, getEntityType } from "../world";
import { ComponentArray } from "./ComponentArray";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { TransformComponentArray } from "./TransformComponent";

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

   const hitDir = hitbox.box.position.angleTo(collidingHitbox.box.position);

   damageEntity(collidingHitbox, hitbox.entity, 2, DamageSource.cactus, AttackEffectiveness.effective, collisionPoint, 0);
   applyAbsoluteKnockback(collidingHitbox, polarVec2(400, hitDir));
   addLocalInvulnerabilityHash(collidingEntity, "yetukshit", 0.25);
}
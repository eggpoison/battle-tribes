import { ServerComponentType } from "../../../shared/dist/components.js";
import { Entity, DamageSource } from "../../../shared/dist/entities.js";
import { AttackEffectiveness } from "../../../shared/dist/entity-damage-types.js";
import { Point, angle, polarVec2 } from "../../../shared/dist/utils.js";
import { ComponentArray } from "./ComponentArray.js";
import { applyKnockback, getHitboxVelocity, Hitbox } from "../hitboxes.js";
import { entityExists, destroyEntity } from "../world.js";
import { HealthComponentArray, damageEntity } from "./HealthComponent.js";
import { ThrowingProjectileComponentArray } from "./ThrowingProjectileComponent.js";
import { getEntityRelationship, EntityRelationship } from "./TribeComponent.js";

const enum Vars {
   DROP_VELOCITY = 300
}

export class SpearProjectileComponent {}

export const SpearProjectileComponentArray = new ComponentArray<SpearProjectileComponent>(ServerComponentType.spearProjectile, true, getDataLength, addDataToPacket);
SpearProjectileComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
SpearProjectileComponentArray.onHitboxCollision = onHitboxCollision;

function onTick(spear: Entity): void {
   
   // @Incomplete
   // if (velocitySquared <= Vars.DROP_VELOCITY * Vars.DROP_VELOCITY) {
   //    const transformComponent = TransformComponentArray.getComponent(spear);

   //    const config = createItemEntityConfig(transformComponent.position.copy(), randAngle(), ItemType.spear, 1, null);
   //    createEntity(config, getEntityLayer(spear), 0);
      
   //    destroyEntity(spear);
   // }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const spear = hitbox.entity;
   const collidingEntity = collidingHitbox.entity;
   
   // Don't hurt friendlies
   const spearComponent = ThrowingProjectileComponentArray.getComponent(spear);
   if (entityExists(spearComponent.tribeMember) && getEntityRelationship(spearComponent.tribeMember, collidingEntity) === EntityRelationship.friendly) {
      return;
   }
   
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   const tribeMember = entityExists(spearComponent.tribeMember) ? spearComponent.tribeMember : null;

   const spearVelocity = getHitboxVelocity(hitbox);
   const damage = Math.floor(spearVelocity.magnitude() / 140);
   
   // Damage the entity
   // @Temporary
   const hitDirection = angle(collidingHitbox.box.posX - hitbox.box.posX, collidingHitbox.box.posY - hitbox.box.posY);
   damageEntity(collidingHitbox, tribeMember, damage, DamageSource.spear, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingHitbox, polarVec2(200, hitDirection));
   
   destroyEntity(spear);
}
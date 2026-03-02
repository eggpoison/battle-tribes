import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { DamageSource, Entity } from "battletribes-shared/entities";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { Point, polarVec2 } from "../../../shared/src/utils";
import { applyKnockback, getHitboxVelocity, Hitbox } from "../hitboxes";
import { entityExists, destroyEntity } from "../world";
import { HealthComponentArray, damageEntity } from "./HealthComponent";
import { ThrowingProjectileComponentArray } from "./ThrowingProjectileComponent";
import { getEntityRelationship, EntityRelationship } from "./TribeComponent";

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
   const hitDirection = hitbox.box.position.angleTo(collidingHitbox.box.position);
   damageEntity(collidingHitbox, tribeMember, damage, DamageSource.spear, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingHitbox, polarVec2(200, hitDirection));
   
   destroyEntity(spear);
}
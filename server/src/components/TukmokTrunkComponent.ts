import { ServerComponentType, EntityType, DamageSource, AttackEffectiveness, Point, polarVec2 } from "battletribes-shared";
import { Hitbox, applyAbsoluteKnockback } from "../hitboxes.js";
import { getEntityType } from "../world.js";
import { ComponentArray } from "./ComponentArray.js";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent.js";

export class TukmokTrunkComponent {}

export const TukmokTrunkComponentArray = new ComponentArray<TukmokTrunkComponent>(ServerComponentType.tukmokTrunk, true, getDataLength, addDataToPacket);
TukmokTrunkComponentArray.onHitboxCollision = onHitboxCollision;

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const collidingEntity = collidingHitbox.entity;

   // @HACK so that the tukmok doesn't kill itself. but this inadvertently means tukmoks can't damage each other
   const entityType = getEntityType(collidingEntity);
   if (entityType === EntityType.tukmok || entityType === EntityType.tukmokSpur || entityType === EntityType.tukmokTrunk || entityType === EntityType.tukmokTailClub || entityType === EntityType.spruceTree || entityType === EntityType.yeti) {
      return;
   }

   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }
   
   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "tukmok-trunk")) {
      return;
   }

   const hitDir = hitbox.box.position.angleTo(collidingHitbox.box.position);

   damageEntity(collidingHitbox, hitbox.entity, 3, DamageSource.cactus, AttackEffectiveness.effective, collisionPoint, 0);
   applyAbsoluteKnockback(collidingHitbox, polarVec2(200, hitDir));
   addLocalInvulnerabilityHash(collidingEntity, "tukmok-trunk", 0.3);
}
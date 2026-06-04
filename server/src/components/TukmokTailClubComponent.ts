import { ServerComponentType } from "../../../shared/dist/components.js";
import { EntityType, DamageSource } from "../../../shared/dist/entities.js";
import { AttackEffectiveness } from "../../../shared/dist/entity-damage-types.js";
import { Point, angle, polarVec2 } from "../../../shared/dist/utils.js";
import { Hitbox, applyAbsoluteKnockback } from "../hitboxes.js";
import { getEntityType } from "../world.js";
import { ComponentArray } from "./ComponentArray.js";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent.js";

export class TukmokTailClubComponent {}

export const TukmokTailClubComponentArray = new ComponentArray<TukmokTailClubComponent>(ServerComponentType.tukmokTailClub, true, getDataLength, addDataToPacket);
TukmokTailClubComponentArray.onHitboxCollision = onHitboxCollision;

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const collidingEntity = collidingHitbox.entity;
   
   // @HACK so that the tukmok doesn't kill itself. but this inadvertently means tukmoks can't damage each other
   const entityType = getEntityType(collidingEntity);
   if (entityType === EntityType.tukmok || entityType === EntityType.tukmokSpur || entityType === EntityType.tukmokTrunk || entityType === EntityType.tukmokTailClub) {
      return;
   }

   // @SQUEAM
   if (entityType === EntityType.inguYetuksnoglurblidokowflea || entityType === EntityType.inguYetuksnoglurblidokowfleaSeekerHead) {
      return;
   }
   
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }
   
   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "tukmok-tail-club")) {
      return;
   }

   const hitDir = angle(collidingHitbox.box.posX - hitbox.box.posX, collidingHitbox.box.posY - hitbox.box.posY);

   damageEntity(collidingHitbox, hitbox.entity, 3, DamageSource.cactus, AttackEffectiveness.effective, collisionPoint, 0);
   applyAbsoluteKnockback(collidingHitbox, polarVec2(400, hitDir));
   addLocalInvulnerabilityHash(collidingEntity, "tukmok-tail-club", 0.3);
}
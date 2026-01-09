import { ServerComponentType } from "../../../shared/src/components";
import { EntityType, DamageSource } from "../../../shared/src/entities";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { Point, polarVec2 } from "../../../shared/src/utils";
import { applyKnockback, Hitbox } from "../hitboxes";
import { getEntityType, validateEntity, destroyEntity } from "../world";
import { ComponentArray } from "./ComponentArray";
import { HealthComponentArray, damageEntity } from "./HealthComponent";
import { ProjectileComponentArray } from "./ProjectileComponent";
import { getEntityRelationship, EntityRelationship, TribeComponentArray } from "./TribeComponent";

export class SlingTurretRockComponent {}

export const SlingTurretRockComponentArray = new ComponentArray<SlingTurretRockComponent>(ServerComponentType.slingTurretRock, true, getDataLength, addDataToPacket);
SlingTurretRockComponentArray.onHitboxCollision = onHitboxCollision;

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

// @Cleanup: Copy and paste
function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const slingTurretRock = hitbox.entity;
   const collidingEntity = collidingHitbox.entity;
   
   // Ignore friendlies, and friendly buildings if the ignoreFriendlyBuildings flag is set
   const relationship = getEntityRelationship(slingTurretRock, collidingEntity);
   if (relationship === EntityRelationship.friendly) {
      return;
   }

   const projectileComponent = ProjectileComponentArray.getComponent(slingTurretRock);
   if (collidingEntity === projectileComponent.creator) {
      return;
   }
   
   const tribeComponent = TribeComponentArray.getComponent(slingTurretRock);
   const collidingEntityType = getEntityType(collidingEntity);

   // Collisions with embrasures are handled in the embrasures collision function
   if (collidingEntityType === EntityType.embrasure) {
      const collidingEntityTribeComponent = TribeComponentArray.getComponent(collidingEntity);
      if (tribeComponent.tribe === collidingEntityTribeComponent.tribe) {
         return;
      }
   }

   // @Hack: do with collision bits
   // Pass over friendly spikes
   if (collidingEntityType === EntityType.floorSpikes || collidingEntityType === EntityType.wallSpikes || collidingEntityType === EntityType.floorPunjiSticks || collidingEntityType === EntityType.wallPunjiSticks) {
      const collidingEntityTribeComponent = TribeComponentArray.getComponent(collidingEntity);
      if (tribeComponent.tribe === collidingEntityTribeComponent.tribe) {
         return;
      }
   }

   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const projectileComponent = ProjectileComponentArray.getComponent(slingTurretRock);

      const owner = validateEntity(projectileComponent.creator);
      const hitDirection = hitbox.box.position.angleTo(collidingHitbox.box.position);
      
      damageEntity(collidingHitbox, owner, 2, DamageSource.arrow, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingHitbox, polarVec2(75, hitDirection));

      destroyEntity(slingTurretRock);
   }
}
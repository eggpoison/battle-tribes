import { ServerComponentType } from "../../../shared/dist/components.js";
import { EntityType, DamageSource } from "../../../shared/dist/entities.js";
import { AttackEffectiveness } from "../../../shared/dist/entity-damage-types.js";
import { Point, angle, polarVec2 } from "../../../shared/dist/utils.js";
import { applyKnockback, Hitbox } from "../hitboxes.js";
import { getEntityType, validateEntity, destroyEntity } from "../world.js";
import { ComponentArray } from "./ComponentArray.js";
import { HealthComponentArray, damageEntity } from "./HealthComponent.js";
import { ProjectileComponentArray } from "./ProjectileComponent.js";
import { getEntityRelationship, EntityRelationship, TribeComponentArray } from "./TribeComponent.js";

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
      const hitDirection = angle(collidingHitbox.box.posX - hitbox.box.posX, collidingHitbox.box.posY - hitbox.box.posY);
      
      damageEntity(collidingHitbox, owner, 2, DamageSource.arrow, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingHitbox, polarVec2(75, hitDirection));

      destroyEntity(slingTurretRock);
   }
}
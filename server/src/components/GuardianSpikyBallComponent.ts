import { ServerComponentType } from "../../../shared/dist/components.js";
import { Entity, EntityType, DamageSource } from "../../../shared/dist/entities.js";
import { AttackEffectiveness } from "../../../shared/dist/entity-damage-types.js";
import { Packet } from "../../../shared/dist/packets.js";
import { Settings } from "../../../shared/dist/settings.js";
import { randFloat, Point, angle, polarVec2 } from "../../../shared/dist/utils.js";
import { ComponentArray } from "./ComponentArray.js";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent.js";
import { destroyEntity, getEntityAgeTicks, getEntityType } from "../world.js";
import { applyKnockback, Hitbox } from "../hitboxes.js";

export class GuardianSpikyBallComponent {
   public lifetime = Math.floor(Settings.TICK_RATE * randFloat(6.5, 8));
}

export const GuardianSpikyBallComponentArray = new ComponentArray<GuardianSpikyBallComponent>(ServerComponentType.guardianSpikyBall, true, getDataLength, addDataToPacket);
GuardianSpikyBallComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
GuardianSpikyBallComponentArray.onWallCollision = onWallCollision;
GuardianSpikyBallComponentArray.onHitboxCollision = onHitboxCollision;

function onTick(spikyBall: Entity): void {
   const guardianSpikyBallComponent = GuardianSpikyBallComponentArray.getComponent(spikyBall);

   const ageTicks = getEntityAgeTicks(spikyBall);
   if (ageTicks >= guardianSpikyBallComponent.lifetime) {
      destroyEntity(spikyBall);
   }
}

function onWallCollision(spikyBall: Entity): void {
   const spikyBallComponent = GuardianSpikyBallComponentArray.getComponent(spikyBall);
   spikyBallComponent.lifetime -= Math.floor(Settings.TICK_RATE * randFloat(0.2, 0.4));
}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const collidingEntity = collidingHitbox.entity;
   
   const entityType = getEntityType(collidingEntity);
   if (entityType === EntityType.guardianSpikyBall || entityType === EntityType.guardian) {
      return;
   }

   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (!canDamageEntity(healthComponent, "gemSpikyBall")) {
         return;
      }

      const hitDirection = angle(collidingHitbox.box.posX - hitbox.box.posX, collidingHitbox.box.posY - hitbox.box.posY);

      damageEntity(collidingHitbox, hitbox.entity, 2, DamageSource.yeti, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingHitbox, polarVec2(100, hitDirection));
      addLocalInvulnerabilityHash(collidingEntity, "gemSpikyBall", 0.5);
   }
}
function getDataLength(): number {
   return 0;
}

function addDataToPacket(packet: Packet, entity: Entity): void {}
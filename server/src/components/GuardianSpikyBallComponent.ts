import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID, EntityType, PlayerCauseOfDeath } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";
import { Hitbox } from "battletribes-shared/boxes/boxes";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { Point, randFloat } from "battletribes-shared/utils";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { applyKnockback } from "./PhysicsComponent";
import { TransformComponentArray } from "./TransformComponent";
import { destroyEntity, getEntityAgeTicks, getEntityType } from "../world";
import { Settings } from "battletribes-shared/settings";

export class GuardianSpikyBallComponent {
   public lifetime = Math.floor(Settings.TPS * randFloat(5, 6.5));
}

export const GuardianSpikyBallComponentArray = new ComponentArray<GuardianSpikyBallComponent>(ServerComponentType.guardianSpikyBall, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   onWallCollision: onWallCollision,
   onHitboxCollision: onHitboxCollision,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onTick(guardianSpikyBallComponent: GuardianSpikyBallComponent, spikyBall: EntityID): void {
   const ageTicks = getEntityAgeTicks(spikyBall);
   if (ageTicks >= guardianSpikyBallComponent.lifetime) {
      destroyEntity(spikyBall);
   }
}

function onWallCollision(spikyBall: EntityID): void {
   const spikyBallComponent = GuardianSpikyBallComponentArray.getComponent(spikyBall);
   spikyBallComponent.lifetime -= Math.floor(Settings.TPS * randFloat(0.2, 0.4));
}

function onHitboxCollision(spikyBall: EntityID, collidingEntity: EntityID, _pushedHitbox: Hitbox, _pushingHitbox: Hitbox, collisionPoint: Point): void {
   const entityType = getEntityType(collidingEntity);
   if (entityType === EntityType.guardianSpikyBall || entityType === EntityType.guardian) {
      return;
   }

   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (!canDamageEntity(healthComponent, "gemSpikyBall")) {
         return;
      }

      const transformComponent = TransformComponentArray.getComponent(spikyBall);
      const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
      
      const hitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);

      damageEntity(collidingEntity, spikyBall, 2, PlayerCauseOfDeath.yeti, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingEntity, 100, hitDirection);
      addLocalInvulnerabilityHash(healthComponent, "gemSpikyBall", 0.5);
   }
}
function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {}
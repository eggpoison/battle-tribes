import { Entity, EntityType, DamageSource } from "battletribes-shared/entities";
import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Point, polarVec2, randFloat, secondsToTicks } from "battletribes-shared/utils";
import { Packet } from "battletribes-shared/packets";
import { destroyEntity, getEntityAgeTicks, getEntityType } from "../world";
import { Settings } from "battletribes-shared/settings";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { applyKnockback, getHitboxVelocity, Hitbox } from "../hitboxes";

export class SnowballComponent {
   public readonly yeti: Entity;
   public readonly size: number;
   public readonly lifetimeTicks = secondsToTicks(randFloat(10, 15));

   constructor(yeti: Entity, size: number) {

      this.yeti = yeti;
      this.size = size;
   }
}

const DAMAGE_VELOCITY_THRESHOLD = 100;

export const SnowballComponentArray = new ComponentArray<SnowballComponent>(ServerComponentType.snowball, true, getDataLength, addDataToPacket);
SnowballComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
SnowballComponentArray.onHitboxCollision = onHitboxCollision;

function onTick(snowball: Entity): void {
   // Decrease angular velocity over time
   // @INCOMPLETE!
   // const transformComponent = TransformComponentArray.getComponent(snowball);
   // const hitbox = transformComponent.hitboxes[0];
   // if (hitbox.angleTurnSpeed !== 0) {
   //    const beforeSign = Math.sign(hitbox.angleTurnSpeed);
   //    hitbox.angleTurnSpeed -= Math.PI * Settings.DT_S * beforeSign;
   //    if (beforeSign !== Math.sign(hitbox.angleTurnSpeed)) {
   //       hitbox.angleTurnSpeed = 0;
   //    }
   // }
         
   const snowballComponent = SnowballComponentArray.getComponent(snowball);
   const ageTicks = getEntityAgeTicks(snowball);
   if (ageTicks >= snowballComponent.lifetimeTicks) {
      destroyEntity(snowball);
   }
}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const snowball = hitbox.entity;
   const collidingEntity = collidingHitbox.entity;
   
   const collidingEntityType = getEntityType(collidingEntity);
   if (collidingEntityType === EntityType.snowball || collidingEntityType === EntityType.iceSpikes) {
      return;
   }

   // Don't let the snowball damage the yeti which threw it
   if (collidingEntityType === EntityType.yeti) {
      const snowballComponent = SnowballComponentArray.getComponent(snowball);
      if (collidingEntity === snowballComponent.yeti) {
         return;
      }
   }

   // @Hack so that snobes don't kill themselves when digging
   if (getEntityType(collidingEntity) === EntityType.snobe || getEntityType(collidingEntity) === EntityType.snobeMound) {
      return;
   }

   // @Hack so that ingu serpen'ts also don't get killed
   if (getEntityType(collidingEntity) === EntityType.inguSerpent) {
      return;
   }
   
   const velocity = getHitboxVelocity(hitbox).magnitude();

   const ageTicks = getEntityAgeTicks(snowball);
   if (velocity < DAMAGE_VELOCITY_THRESHOLD || ageTicks >= 2 * Settings.TICK_RATE) {
      return;
   }

   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (canDamageEntity(healthComponent, "snowball")) {
         const hitDirection = hitbox.box.position.angleTo(collidingHitbox.box.position);

         damageEntity(collidingHitbox, null, 4, DamageSource.snowball, AttackEffectiveness.effective, collisionPoint, 0);
         applyKnockback(collidingHitbox, polarVec2(100, hitDirection));
         addLocalInvulnerabilityHash(collidingEntity, "snowball", 0.3);
      }
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const snowballComponent = SnowballComponentArray.getComponent(entity);
   packet.writeNumber(snowballComponent.size);
}
import { ServerComponentType } from "../../../shared/src/components";
import { Entity, DamageSource } from "../../../shared/src/entities";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { Packet } from "../../../shared/src/packets";
import { Point, polarVec2, randInt } from "../../../shared/src/utils";
import { Hitbox, applyKnockback, getHitboxVelocity } from "../hitboxes";
import { destroyEntity } from "../world";
import { ComponentArray } from "./ComponentArray";
import { addLocalInvulnerabilityHash, canDamageEntity, HealthComponentArray, damageEntity } from "./HealthComponent";
import { TransformComponentArray } from "./TransformComponent";

export class PricklyPearFragmentProjectileComponent {
   public readonly variant = randInt(0, 1);
   public readonly parentCactus: Entity;
   
   constructor(parentCactus: Entity) {
      this.parentCactus = parentCactus;
   }
}

export const PricklyPearFragmentProjectileComponentArray = new ComponentArray<PricklyPearFragmentProjectileComponent>(ServerComponentType.pricklyPearFragmentProjectile, true, getDataLength, addDataToPacket);
PricklyPearFragmentProjectileComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
PricklyPearFragmentProjectileComponentArray.onHitboxCollision = onHitboxCollision;

function onTick(fragment: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(fragment);
   const hitbox = transformComponent.hitboxes[0];

   if (getHitboxVelocity(hitbox).magnitude() < 200) {
      destroyEntity(fragment);
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, fragment: Entity): void {
   const pricklyPearFragmentProjectileComponent = PricklyPearFragmentProjectileComponentArray.getComponent(fragment);
   packet.writeNumber(pricklyPearFragmentProjectileComponent.variant);
}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const collidingEntity = collidingHitbox.entity;
   
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   const fragment = hitbox.entity;

   const pricklyPearFragmentProjectileComponent = PricklyPearFragmentProjectileComponentArray.getComponent(fragment);
   if (collidingEntity === pricklyPearFragmentProjectileComponent.parentCactus) {
      destroyEntity(fragment);
      return;
   }
   
   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, fragment.toString())) {
      return;
   }

   const hitDirection = hitbox.box.position.angleTo(collidingHitbox.box.position);

   damageEntity(collidingHitbox, fragment, 3, DamageSource.yeti, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingHitbox, polarVec2(100, hitDirection));
   addLocalInvulnerabilityHash(collidingEntity, fragment.toString(), 0.3);
}
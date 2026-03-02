import { ServerComponentType } from "battletribes-shared/components";
import { Entity, DamageSource } from "battletribes-shared/entities";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { Packet } from "battletribes-shared/packets";
import { Settings } from "battletribes-shared/settings";
import { angle, Point, polarVec2, randFloat, randInt } from "battletribes-shared/utils";
import { getEntityAgeTicks, destroyEntity } from "../world";
import { ComponentArray } from "./ComponentArray";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { applyKnockback, getHitboxVelocity, Hitbox } from "../hitboxes";

export class GuardianGemFragmentProjectileComponent {
   public readonly fragmentShape = randInt(0, 2);
   public readonly gemType = randInt(0, 2);
   public readonly tintMultiplier = randFloat(0.5, 1);
}

export const GuardianGemFragmentProjectileComponentArray = new ComponentArray<GuardianGemFragmentProjectileComponent>(ServerComponentType.guardianGemFragmentProjectile, true, getDataLength, addDataToPacket);
GuardianGemFragmentProjectileComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
GuardianGemFragmentProjectileComponentArray.onWallCollision = onWallCollision;
GuardianGemFragmentProjectileComponentArray.onHitboxCollision = onHitboxCollision;

function onTick(fragment: Entity): void {
   const age = getEntityAgeTicks(fragment);
   if (age >= Settings.TICK_RATE * 0.75) {
      destroyEntity(fragment);
   }
}

function onWallCollision(fragment: Entity): void {
   destroyEntity(fragment);
}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const collidingEntity = collidingHitbox.entity;
   
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   const fragment = hitbox.entity;

   // Destroyed regardless of whether it actually damages the entity
   destroyEntity(fragment);

   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "gemFragmentProjectile")) {
      return;
   }
   
   const fragmentHitDirection = hitbox.box.position.angleTo(collidingHitbox.box.position);
   applyKnockback(collidingHitbox, polarVec2(50, fragmentHitDirection));

   damageEntity(collidingHitbox, fragment, 1, DamageSource.yeti, AttackEffectiveness.effective, collisionPoint, 0);
   
   const affectedHitboxVelocity = getHitboxVelocity(hitbox);
   applyKnockback(collidingHitbox, affectedHitboxVelocity);
   
   addLocalInvulnerabilityHash(collidingEntity, "gemFragmentProjectile", 0.166);
}

function getDataLength(): number {
   return 3 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const guardianGemFragmentProjectileComponent = GuardianGemFragmentProjectileComponentArray.getComponent(entity);
   packet.writeNumber(guardianGemFragmentProjectileComponent.fragmentShape);
   packet.writeNumber(guardianGemFragmentProjectileComponent.gemType);
   packet.writeNumber(guardianGemFragmentProjectileComponent.tintMultiplier);
}
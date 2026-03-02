import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Hitbox } from "../hitboxes";
import { getEntityType } from "../world";
import { EntityType } from "../../../shared/src/entities";
import { Settings } from "../../../shared/src/settings";
import { StatusEffect } from "../../../shared/src/status-effects";
import { HealthComponentArray, canDamageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { SpikesComponentArray } from "./SpikesComponent";
import { StatusEffectComponentArray, applyStatusEffect } from "./StatusEffectComponent";
import { getEntityRelationship, EntityRelationship } from "./TribeComponent";

export class PunjiSticksComponent {}

export const PunjiSticksComponentArray = new ComponentArray<PunjiSticksComponent>(ServerComponentType.punjiSticks, true, getDataLength, addDataToPacket);
PunjiSticksComponentArray.onHitboxCollision = onHitboxCollision;

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox): void {
   const punjiSticks = hitbox.entity;
   const collidingEntity = collidingHitbox.entity;
   
   // @Incomplete: Why is this condition neeeded? Shouldn't be able to be placed colliding with other structures anyway.
   const collidingEntityType = getEntityType(collidingEntity);
   if (collidingEntityType === EntityType.floorSpikes || collidingEntityType === EntityType.wallSpikes || collidingEntityType === EntityType.door || collidingEntityType === EntityType.wall) {
      return;
   }
   
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   // Don't collide with friendly entities if the spikes are covered
   const spikesComponent = SpikesComponentArray.getComponent(punjiSticks);
   if (spikesComponent.isCovered && getEntityRelationship(punjiSticks, collidingEntity) === EntityRelationship.friendly) {
      return;
   }

   // Reveal
   spikesComponent.isCovered = false;

   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "punjiSticks")) {
      return;
   }
   
   // @Incomplete: Cause of death
   // @INCOMPLETE
   // hitEntity(collidingEntity, punjiSticks, 1, DamageSource.yeti, AttackEffectiveness.effective, collisionPoint, 0);
   addLocalInvulnerabilityHash(collidingEntity, "punjiSticks", 0.3);

   if (StatusEffectComponentArray.hasComponent(collidingEntity)) {
      applyStatusEffect(collidingEntity, StatusEffect.poisoned, 2 * Settings.TICK_RATE);
   }
}
import { ServerComponentType } from "battletribes-shared/components";
import { Entity, DamageSource } from "battletribes-shared/entities";
import { StatusEffect, STATUS_EFFECT_MODIFIERS } from "battletribes-shared/status-effects";
import { customTickIntervalHasPassed } from "battletribes-shared/utils";
import { ComponentArray } from "./ComponentArray";
import { damageEntity } from "./HealthComponent";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { getRandomPositionInEntity, TransformComponentArray } from "./TransformComponent";
import { Packet } from "battletribes-shared/packets";
import { Hitbox, hitboxIsInRiver } from "../hitboxes";

export class StatusEffectComponent {
   public readonly activeStatusEffectTypes = new Array<StatusEffect>();
   public readonly activeStatusEffectTicksRemaining = new Array<number>();
   public readonly activeStatusEffectTicksElapsed = new Array<number>();

   public readonly statusEffectImmunityBitset: number;

   constructor(statusEffectImmunityBitset: number) {
      this.statusEffectImmunityBitset = statusEffectImmunityBitset;
   }
}

export const StatusEffectComponentArray = new ComponentArray<StatusEffectComponent>(ServerComponentType.statusEffect, false, getDataLength, addDataToPacket);
StatusEffectComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

const entityIsImmuneToStatusEffect = (statusEffectComponent: StatusEffectComponent, statusEffect: StatusEffect): boolean => {
   return (statusEffectComponent.statusEffectImmunityBitset & statusEffect) !== 0;
}

export function applyStatusEffect(entity: Entity, statusEffect: StatusEffect, durationTicks: number): void {
   if (!StatusEffectComponentArray.hasComponent(entity)) {
      return;
   }
   
   const statusEffectComponent = StatusEffectComponentArray.getComponent(entity);
   if (entityIsImmuneToStatusEffect(statusEffectComponent, statusEffect)) {
      return;
   }

   StatusEffectComponentArray.activateComponent(entity);
   
   if (!hasStatusEffect(statusEffectComponent, statusEffect)) {
      // New status effect
      
      statusEffectComponent.activeStatusEffectTypes.push(statusEffect);
      statusEffectComponent.activeStatusEffectTicksElapsed.push(0);
      statusEffectComponent.activeStatusEffectTicksRemaining.push(durationTicks);

      const transformComponent = TransformComponentArray.getComponent(entity);
      // @BUG: Over time this may accrue errors!!!!! fix!!!!
      transformComponent.moveSpeedMultiplier *= STATUS_EFFECT_MODIFIERS[statusEffect].moveSpeedMultiplier;
   } else {
      // Existing status effect

      for (let i = 0; i < statusEffectComponent.activeStatusEffectTypes.length; i++) {
         if (durationTicks > statusEffectComponent.activeStatusEffectTicksRemaining[i]) {
            statusEffectComponent.activeStatusEffectTicksRemaining[i] = durationTicks;
            break;
         }
      }
   }
}

export function hasStatusEffect(statusEffectComponent: StatusEffectComponent, statusEffect: StatusEffect): boolean {
   for (let i = 0; i < statusEffectComponent.activeStatusEffectTypes.length; i++) {
      if (statusEffectComponent.activeStatusEffectTypes[i] === statusEffect) {
         return true;
      }
   }
   return false;
}

export function clearStatusEffect(entityID: number, statusEffectIndex: number): void {
   const statusEffectComponent = StatusEffectComponentArray.getComponent(entityID);

   const statusEffect = statusEffectComponent.activeStatusEffectTypes[statusEffectIndex];
   
   const transformComponent = TransformComponentArray.getComponent(entityID);
      // @BUG: Over time this may accrue errors!!!!! fix!!!!
   transformComponent.moveSpeedMultiplier /= STATUS_EFFECT_MODIFIERS[statusEffect].moveSpeedMultiplier;

   statusEffectComponent.activeStatusEffectTypes.splice(statusEffectIndex, 1);
   statusEffectComponent.activeStatusEffectTicksRemaining.splice(statusEffectIndex, 1);
   statusEffectComponent.activeStatusEffectTicksElapsed.splice(statusEffectIndex, 1);
}

export function clearStatusEffects(entityID: number): void {
   const statusEffectComponent = StatusEffectComponentArray.getComponent(entityID);
   if (typeof statusEffectComponent === "undefined") {
      return;
   }
   
   if (statusEffectComponent.activeStatusEffectTypes.length > 0) {
      statusEffectComponent.activeStatusEffectTypes.splice(0, statusEffectComponent.activeStatusEffectTypes.length);
      statusEffectComponent.activeStatusEffectTicksElapsed.splice(0, statusEffectComponent.activeStatusEffectTicksElapsed.length);
      statusEffectComponent.activeStatusEffectTicksRemaining.splice(0, statusEffectComponent.activeStatusEffectTicksRemaining.length);
   }
}

function onTick(entity: Entity): void {
   const statusEffectComponent = StatusEffectComponentArray.getComponent(entity);
   for (let i = 0; i < statusEffectComponent.activeStatusEffectTypes.length; i++) {
      const statusEffect = statusEffectComponent.activeStatusEffectTypes[i];

      statusEffectComponent.activeStatusEffectTicksElapsed[i]++;

      switch (statusEffect) {
         case StatusEffect.burning: {
            const transformComponent = TransformComponentArray.getComponent(entity);
            // @Hack
            const hitbox = transformComponent.hitboxes[0];
            // If the entity is in a river, clear the fire effect
            if (hitboxIsInRiver(hitbox)) {
               clearStatusEffect(entity, i);
            } else {
               // Fire tick
               const ticksElapsed = statusEffectComponent.activeStatusEffectTicksElapsed[i];
               if (customTickIntervalHasPassed(ticksElapsed, 0.75)) {
                  const hitPosition = getRandomPositionInEntity(transformComponent);
                  damageEntity(hitbox, null, 1, DamageSource.fire, AttackEffectiveness.effective, hitPosition, 0);
               }
            }
            break;
         }
         case StatusEffect.poisoned: {
            const ticksElapsed = statusEffectComponent.activeStatusEffectTicksElapsed[i];
            if (customTickIntervalHasPassed(ticksElapsed, 0.5)) {
               const transformComponent = TransformComponentArray.getComponent(entity);
               // @Hack
               const hitbox = transformComponent.hitboxes[0];
               const hitPosition = getRandomPositionInEntity(transformComponent);
               damageEntity(hitbox, null, 1, DamageSource.poison, AttackEffectiveness.effective, hitPosition, 0);
            }
            break;
         }
         case StatusEffect.bleeding: {
            const ticksElapsed = statusEffectComponent.activeStatusEffectTicksElapsed[i];
            if (customTickIntervalHasPassed(ticksElapsed, 1)) {
               const transformComponent = TransformComponentArray.getComponent(entity);
               // @Hack
               const hitbox = transformComponent.hitboxes[0];
               const hitPosition = getRandomPositionInEntity(transformComponent);
               damageEntity(hitbox, null, 1, DamageSource.bloodloss, AttackEffectiveness.effective, hitPosition, 0);
            }
            break;
         }
         case StatusEffect.heatSickness: {
            const ticksElapsed = statusEffectComponent.activeStatusEffectTicksElapsed[i];
            if (customTickIntervalHasPassed(ticksElapsed, 2)) {
               const transformComponent = TransformComponentArray.getComponent(entity);
               // @Hack
               const hitbox = transformComponent.hitboxes[0];
               const hitPosition = getRandomPositionInEntity(transformComponent);
               damageEntity(hitbox, null, 1, DamageSource.bloodloss, AttackEffectiveness.effective, hitPosition, 0);
            }
         }
      }

      statusEffectComponent.activeStatusEffectTicksRemaining[i]--;
      if (statusEffectComponent.activeStatusEffectTicksRemaining[i] === 0) {
         clearStatusEffect(entity, i);
         i--;
         continue;
      }
   }

   if (statusEffectComponent.activeStatusEffectTypes.length === 0) {
      StatusEffectComponentArray.queueComponentDeactivate(entity);
   }
}

function getDataLength(entity: Entity): number {
   const statusEffectComponent = StatusEffectComponentArray.getComponent(entity);
   return Float32Array.BYTES_PER_ELEMENT + 2 * Float32Array.BYTES_PER_ELEMENT * statusEffectComponent.activeStatusEffectTypes.length;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const statusEffectComponent = StatusEffectComponentArray.getComponent(entity);

   packet.writeNumber(statusEffectComponent.activeStatusEffectTypes.length);
   for (let i = 0; i < statusEffectComponent.activeStatusEffectTypes.length; i++) {
      packet.writeNumber(statusEffectComponent.activeStatusEffectTypes[i]);
      packet.writeNumber(statusEffectComponent.activeStatusEffectTicksElapsed[i]);
   }
}
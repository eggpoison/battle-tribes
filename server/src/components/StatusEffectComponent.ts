import { ServerComponentType } from "../../../shared/dist/components.js";
import { Entity, DamageSource } from "../../../shared/dist/entities.js";
import { AttackEffectiveness } from "../../../shared/dist/entity-damage-types.js";
import { Packet } from "../../../shared/dist/packets.js";
import { StatusEffect, STATUS_EFFECT_MODIFIERS } from "../../../shared/dist/status-effects.js";
import { customTickIntervalHasPassed } from "../../../shared/dist/utils.js";
import { Bytes } from "../../../shared/dist/constants.js";
import { ComponentArray } from "./ComponentArray.js";
import { damageEntity } from "./HealthComponent.js";
import { getRandomPositionInEntity, TransformComponentArray } from "./TransformComponent.js";
import { hitboxIsInRiver } from "../hitboxes.js";

export class StatusEffectComponent {
   public readonly activeStatusEffectTypes: Array<StatusEffect> = [];
   public readonly activeStatusEffectTicksRemaining: Array<number> = [];
   public readonly activeStatusEffectTicksElapsed: Array<number> = [];

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
   if (statusEffectComponent === undefined) {
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
   return Bytes.Float32 + 2 * Bytes.Float32 * statusEffectComponent.activeStatusEffectTypes.length;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const statusEffectComponent = StatusEffectComponentArray.getComponent(entity);

   packet.writeNumber(statusEffectComponent.activeStatusEffectTypes.length);
   for (let i = 0; i < statusEffectComponent.activeStatusEffectTypes.length; i++) {
      packet.writeNumber(statusEffectComponent.activeStatusEffectTypes[i]);
      packet.writeNumber(statusEffectComponent.activeStatusEffectTicksElapsed[i]);
   }
}
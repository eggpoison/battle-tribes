import { ServerComponentType } from "battletribes-shared/components";
import { EntityID, PlayerCauseOfDeath } from "battletribes-shared/entities";
import { StatusEffect, STATUS_EFFECT_MODIFIERS } from "battletribes-shared/status-effects";
import { customTickIntervalHasPassed } from "battletribes-shared/utils";
import { ComponentArray } from "./ComponentArray";
import { getRandomPositionInEntity } from "../Entity";
import { damageEntity } from "./HealthComponent";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { TransformComponentArray } from "./TransformComponent";
import { Packet } from "battletribes-shared/packets";

export class StatusEffectComponent {
   public readonly activeStatusEffectTypes = new Array<StatusEffect>();
   public readonly activeStatusEffectTicksRemaining = new Array<number>();
   public readonly activeStatusEffectTicksElapsed = new Array<number>();

   public readonly statusEffectImmunityBitset: number;

   constructor(statusEffectImmunityBitset: number) {
      this.statusEffectImmunityBitset = statusEffectImmunityBitset;
   }
}

export const StatusEffectComponentArray = new ComponentArray<StatusEffectComponent>(ServerComponentType.statusEffect, false, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

const entityIsImmuneToStatusEffect = (statusEffectComponent: StatusEffectComponent, statusEffect: StatusEffect): boolean => {
   return (statusEffectComponent.statusEffectImmunityBitset & statusEffect) !== 0;
}

export function applyStatusEffect(entityID: number, statusEffect: StatusEffect, durationTicks: number): void {
   const statusEffectComponent = StatusEffectComponentArray.getComponent(entityID);
   if (entityIsImmuneToStatusEffect(statusEffectComponent, statusEffect)) {
      return;
   }

   StatusEffectComponentArray.activateComponent(statusEffectComponent, entityID);
   
   if (!hasStatusEffect(statusEffectComponent, statusEffect)) {
      // New status effect
      
      statusEffectComponent.activeStatusEffectTypes.push(statusEffect);
      statusEffectComponent.activeStatusEffectTicksElapsed.push(0);
      statusEffectComponent.activeStatusEffectTicksRemaining.push(durationTicks);

      if (PhysicsComponentArray.hasComponent(entityID)) {
         const physicsComponent = PhysicsComponentArray.getComponent(entityID);
         physicsComponent.moveSpeedMultiplier *= STATUS_EFFECT_MODIFIERS[statusEffect].moveSpeedMultiplier;
      }
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

   if (PhysicsComponentArray.hasComponent(entityID)) {
      const statusEffect = statusEffectComponent.activeStatusEffectTypes[statusEffectIndex];
      
      const physicsComponent = PhysicsComponentArray.getComponent(entityID);
      physicsComponent.moveSpeedMultiplier /= STATUS_EFFECT_MODIFIERS[statusEffect].moveSpeedMultiplier;
   }

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

function onTick(statusEffectComponent: StatusEffectComponent, entity: EntityID): void {
   for (let i = 0; i < statusEffectComponent.activeStatusEffectTypes.length; i++) {
      const statusEffect = statusEffectComponent.activeStatusEffectTypes[i];

      statusEffectComponent.activeStatusEffectTicksElapsed[i]++;

      switch (statusEffect) {
         case StatusEffect.burning: {
            const transformComponent = TransformComponentArray.getComponent(entity);
            // If the entity is in a river, clear the fire effect
            if (transformComponent.isInRiver) {
               clearStatusEffect(entity, i);
            } else {
               // Fire tick
               const ticksElapsed = statusEffectComponent.activeStatusEffectTicksElapsed[i];
               if (customTickIntervalHasPassed(ticksElapsed, 0.75)) {
                  const hitPosition = getRandomPositionInEntity(entity);
                  damageEntity(entity, null, 1, PlayerCauseOfDeath.fire, AttackEffectiveness.effective, hitPosition, 0);
               }
            }
            break;
         }
         case StatusEffect.poisoned: {
            const ticksElapsed = statusEffectComponent.activeStatusEffectTicksElapsed[i];
            if (customTickIntervalHasPassed(ticksElapsed, 0.5)) {
               const hitPosition = getRandomPositionInEntity(entity);
               damageEntity(entity, null, 1, PlayerCauseOfDeath.poison, AttackEffectiveness.effective, hitPosition, 0);
            }
            break;
         }
         case StatusEffect.bleeding: {
            const ticksElapsed = statusEffectComponent.activeStatusEffectTicksElapsed[i];
            if (customTickIntervalHasPassed(ticksElapsed, 1)) {
               const hitPosition = getRandomPositionInEntity(entity);
               damageEntity(entity, null, 1, PlayerCauseOfDeath.bloodloss, AttackEffectiveness.effective, hitPosition, 0);
            }
            break;
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

function getDataLength(entity: EntityID): number {
   const statusEffectComponent = StatusEffectComponentArray.getComponent(entity);
   return 2 * Float32Array.BYTES_PER_ELEMENT + 2 * Float32Array.BYTES_PER_ELEMENT * statusEffectComponent.activeStatusEffectTypes.length;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const statusEffectComponent = StatusEffectComponentArray.getComponent(entity);

   packet.addNumber(statusEffectComponent.activeStatusEffectTypes.length);
   for (let i = 0; i < statusEffectComponent.activeStatusEffectTypes.length; i++) {
      packet.addNumber(statusEffectComponent.activeStatusEffectTypes[i]);
      packet.addNumber(statusEffectComponent.activeStatusEffectTicksElapsed[i]);
   }
}
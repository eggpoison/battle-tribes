import { StatusEffectData } from "webgl-test-shared/dist/client-server-types";
import { StatusEffectComponentData } from "webgl-test-shared/dist/components";
import { PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { StatusEffect, STATUS_EFFECT_MODIFIERS } from "webgl-test-shared/dist/status-effects";
import { customTickIntervalHasPassed } from "webgl-test-shared/dist/utils";
import { ComponentArray } from "./ComponentArray";
import Entity from "../Entity";
import { damageEntity } from "./HealthComponent";
import { SERVER } from "../server";
import { PhysicsComponentArray } from "./PhysicsComponent";
import Board from "../Board";

export class StatusEffectComponent {
   public readonly activeStatusEffectTypes = new Array<StatusEffect>();
   public readonly activeStatusEffectTicksRemaining = new Array<number>();
   public readonly activeStatusEffectTicksElapsed = new Array<number>();

   public readonly statusEffectImmunityBitset: number;

   constructor(statusEffectImmunityBitset: number) {
      this.statusEffectImmunityBitset = statusEffectImmunityBitset;
   }
}

export const StatusEffectComponentArray = new ComponentArray<StatusEffectComponent>(false);

const entityIsImmuneToStatusEffect = (statusEffectComponent: StatusEffectComponent, statusEffect: StatusEffect): boolean => {
   return (statusEffectComponent.statusEffectImmunityBitset & statusEffect) !== 0;
}

export function applyStatusEffect(entityID: number, statusEffect: StatusEffect, durationTicks: number): void {
   const statusEffectComponent = StatusEffectComponentArray.getComponent(entityID);
   if (entityIsImmuneToStatusEffect(statusEffectComponent, statusEffect)) {
      return;
   }

   if (StatusEffectComponentArray.activeEntityToIndexMap[entityID] === undefined) {
      StatusEffectComponentArray.activateComponent(statusEffectComponent, entityID);
   }
   
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

export function tickStatusEffectComponent(statusEffectComponent: StatusEffectComponent, entityID: number): void {
   const entity = Board.entityRecord[entityID]!;

   for (let i = 0; i < statusEffectComponent.activeStatusEffectTypes.length; i++) {
      const statusEffect = statusEffectComponent.activeStatusEffectTypes[i];

      statusEffectComponent.activeStatusEffectTicksElapsed[i]++;

      switch (statusEffect) {
         case StatusEffect.burning: {
            // If the entity is in a river, clear the fire effect
            if (entity.isInRiver) {
               clearStatusEffect(entity.id, i);
            } else {
               // Fire tick
               const ticksElapsed = statusEffectComponent.activeStatusEffectTicksElapsed[i];
               if (customTickIntervalHasPassed(ticksElapsed, 0.75)) {
                  damageEntity(entity, 1, null, PlayerCauseOfDeath.fire);
                  SERVER.registerEntityHit({
                     entityPositionX: entity.position.x,
                     entityPositionY: entity.position.y,
                     hitEntityID: entity.id,
                     damage: 1,
                     knockback: 0,
                     angleFromAttacker: null,
                     // @Bug: show the id of the entity which caused the burning in the first place
                     attackerID: -1,
                     flags: 0
                  });
               }
            }
            break;
         }
         case StatusEffect.poisoned: {
            const ticksElapsed = statusEffectComponent.activeStatusEffectTicksElapsed[i];
            if (customTickIntervalHasPassed(ticksElapsed, 0.5)) {
               damageEntity(entity, 1, null, PlayerCauseOfDeath.poison);
               SERVER.registerEntityHit({
                  entityPositionX: entity.position.x,
                  entityPositionY: entity.position.y,
                  hitEntityID: entity.id,
                  damage: 1,
                  knockback: 0,
                  angleFromAttacker: null,
                  // @Bug: show the id of the entity which caused the poisoning in the first place
                  attackerID: -1,
                  flags: 0
               });
            }
            break;
         }
         case StatusEffect.bleeding: {
            const ticksElapsed = statusEffectComponent.activeStatusEffectTicksElapsed[i];
            if (customTickIntervalHasPassed(ticksElapsed, 1)) {
               damageEntity(entity, 1, null, PlayerCauseOfDeath.bloodloss);
               SERVER.registerEntityHit({
                  entityPositionX: entity.position.x,
                  entityPositionY: entity.position.y,
                  hitEntityID: entity.id,
                  damage: 1,
                  knockback: 0,
                  angleFromAttacker: null,
                  // @Bug: show the id of the entity which caused the bleeding in the first place
                  attackerID: -1,
                  flags: 0
               });
            }
            break;
         }
      }

      statusEffectComponent.activeStatusEffectTicksRemaining[i]--;
      if (statusEffectComponent.activeStatusEffectTicksRemaining[i] === 0) {
         clearStatusEffect(entity.id, i);
         i--;
         continue;
      }
   }

   if (statusEffectComponent.activeStatusEffectTypes.length === 0) {
      StatusEffectComponentArray.queueComponentDeactivate(entityID);
   }
}

export function tickStatusEffectComponents(): void {
   for (let i = 0; i < StatusEffectComponentArray.activeComponents.length; i++) {
      const component = StatusEffectComponentArray.activeComponents[i];
      const entityID = StatusEffectComponentArray.activeEntityIDs[i];
      tickStatusEffectComponent(component, entityID);
   }

   StatusEffectComponentArray.deactivateQueue();
}

export function serialiseStatusEffectComponent(entity: Entity): StatusEffectComponentData {
   const statusEffects = new Array<StatusEffectData>();
   const statusEffectComponent = StatusEffectComponentArray.getComponent(entity.id);
   for (let i = 0; i < statusEffectComponent.activeStatusEffectTypes.length; i++) {
      statusEffects.push({
         type: statusEffectComponent.activeStatusEffectTypes[i] as unknown as StatusEffect,
         ticksElapsed: statusEffectComponent.activeStatusEffectTicksElapsed[i]
      });
   }

   return {
      statusEffects: statusEffects
   };
}
import { Settings } from "webgl-test-shared/dist/settings";
import { HealingTotemComponentData, HealingTotemTargetData } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
import Board from "../Board";
import { HealingTotemComponentArray, HealthComponentArray } from "./ComponentArray";
import { EntityRelationship, getEntityRelationship } from "./TribeComponent";
import { healEntity } from "./HealthComponent";

const enum Vars {
   HEALING_RANGE = 270,
   HEALING_PER_SECOND = 1
}

export class HealingTotemComponent {
   public readonly healTargetIDs = new Array<number>();
   public readonly healTargetsTicksHealed = new Array<number>();
}

const getHealingTargets = (healingTotem: Entity): ReadonlyArray<Entity> => {
   const minChunkX = Math.max(Math.floor((healingTotem.position.x - Vars.HEALING_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((healingTotem.position.x + Vars.HEALING_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((healingTotem.position.y - Vars.HEALING_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((healingTotem.position.y + Vars.HEALING_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);

   const targets = new Array<Entity>();
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            if (targets.indexOf(entity) !== -1) {
               continue;
            }

            if (!HealthComponentArray.hasComponent(entity.id)) {
               continue;
            }
            
            const healthComponent = HealthComponentArray.getComponent(entity.id);
            if (healthComponent.health === healthComponent.maxHealth) {
               continue;
            }
            
            const relationship = getEntityRelationship(healingTotem.id, entity);
            if (relationship !== EntityRelationship.friendly) {
               continue;
            }
            
            const distance = healingTotem.position.calculateDistanceBetween(entity.position);
            if (distance <= Vars.HEALING_RANGE) {
               targets.push(entity);
            }
         }
      }
   }

   return targets;
}

const idIsInHealTargets = (id: number, healTargets: ReadonlyArray<Entity>): boolean => {
   for (let i = 0; i < healTargets.length; i++) {
      const entity = healTargets[i];
      if (entity.id === id) {
         return true;
      }
   }
   return false;
}

const healTargetIsInIDs = (target: Entity, ids: ReadonlyArray<number>): boolean => {
   for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      if (id === target.id) {
         return true;
      }
   }
   return false;
}

export function tickHealingTotemComponent(healingTotem: Entity, healingTotemComponent: HealingTotemComponent): void {
   // @Speed: shouldn't call every tick
   const healingTargets = getHealingTargets(healingTotem);

   const healTargetIDs = healingTotemComponent.healTargetIDs;
   const healTargetsTicksHealed = healingTotemComponent.healTargetsTicksHealed;

   // Check for removed healing targets
   for (let i = 0; i < healTargetIDs.length; i++) {
      const targetID = healTargetIDs[i];
      if (!idIsInHealTargets(targetID, healingTargets) || typeof Board.entityRecord[targetID] === "undefined") {
         healTargetIDs.splice(i, 1);
         healTargetsTicksHealed.splice(i, 1);
         i--;
      }
   }

   // Add new targets
   for (let i = 0; i < healingTargets.length; i++) {
      const target = healingTargets[i];
      if (!healTargetIsInIDs(target, healTargetIDs)) {
         healTargetIDs.push(target.id);
         healTargetsTicksHealed.push(0);
      }
   }

   // Update heal targets
   for (let i = 0; i < healTargetIDs.length; i++) {
      healTargetsTicksHealed[i]++;
      if (healTargetsTicksHealed[i] % Settings.TPS === 0) {
         const id = healTargetIDs[i];
         const target = Board.entityRecord[id]!;
         healEntity(target, Vars.HEALING_PER_SECOND, healingTotem.id);
      }
   }
}

export function serialiseHealingTotemComponent(healingTotem: Entity): HealingTotemComponentData {
   const healingTotemComponent = HealingTotemComponentArray.getComponent(healingTotem.id);

   const healingData = new Array<HealingTotemTargetData>();
   for (let i = 0; i < healingTotemComponent.healTargetIDs.length; i++) {
      const entityID = healingTotemComponent.healTargetIDs[i];
      const ticksHealed = healingTotemComponent.healTargetsTicksHealed[i];

      const entity = Board.entityRecord[entityID]!;

      healingData.push({
         entityID: entityID,
         x: entity.position.x,
         y: entity.position.y,
         ticksHealed: ticksHealed
      });
   }
   
   return {
      healingTargetsData: healingData
   };
}
import { Settings } from "webgl-test-shared/dist/settings";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import Board from "../Board";
import { EntityRelationship, getEntityRelationship } from "./TribeComponent";
import { HealthComponentArray, healEntity } from "./HealthComponent";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "webgl-test-shared/dist/entities";
import { TransformComponentArray } from "./TransformComponent";
import { Packet } from "webgl-test-shared/dist/packets";

const enum Vars {
   HEALING_RANGE = 270,
   HEALING_PER_SECOND = 1
}

export interface HealingTotemComponentParams {}

export class HealingTotemComponent {
   public readonly healTargetIDs = new Array<number>();
   public readonly healTargetsTicksHealed = new Array<number>();
}

export const HealingTotemComponentArray = new ComponentArray<HealingTotemComponent>(ServerComponentType.healingTotem, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

const getHealingTargets = (healingTotem: EntityID): ReadonlyArray<EntityID> => {
   const transformComponent = TransformComponentArray.getComponent(healingTotem);
   
   const minChunkX = Math.max(Math.floor((transformComponent.position.x - Vars.HEALING_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((transformComponent.position.x + Vars.HEALING_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((transformComponent.position.y - Vars.HEALING_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((transformComponent.position.y + Vars.HEALING_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);

   const targets = new Array<EntityID>();
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            if (targets.indexOf(entity) !== -1) {
               continue;
            }

            if (!HealthComponentArray.hasComponent(entity)) {
               continue;
            }
            
            const healthComponent = HealthComponentArray.getComponent(entity);
            if (healthComponent.health === healthComponent.maxHealth) {
               continue;
            }
            
            const relationship = getEntityRelationship(healingTotem, entity);
            if (relationship !== EntityRelationship.friendly) {
               continue;
            }

            const entityTransformComponent = TransformComponentArray.getComponent(entity);
            
            const distance = transformComponent.position.calculateDistanceBetween(entityTransformComponent.position);
            if (distance <= Vars.HEALING_RANGE) {
               targets.push(entity);
            }
         }
      }
   }

   return targets;
}

const idIsInHealTargets = (id: number, healTargets: ReadonlyArray<EntityID>): boolean => {
   for (let i = 0; i < healTargets.length; i++) {
      const entity = healTargets[i];
      if (entity === id) {
         return true;
      }
   }
   return false;
}

const healTargetIsInIDs = (target: EntityID, ids: ReadonlyArray<number>): boolean => {
   for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      if (id === target) {
         return true;
      }
   }
   return false;
}

export function tickHealingTotemComponent(healingTotem: EntityID, healingTotemComponent: HealingTotemComponent): void {
   // @Speed: shouldn't call every tick
   const healingTargets = getHealingTargets(healingTotem);

   const healTargetIDs = healingTotemComponent.healTargetIDs;
   const healTargetsTicksHealed = healingTotemComponent.healTargetsTicksHealed;

   // Check for removed healing targets
   for (let i = 0; i < healTargetIDs.length; i++) {
      const targetID = healTargetIDs[i];
      if (!idIsInHealTargets(targetID, healingTargets) || !Board.hasEntity(targetID)) {
         healTargetIDs.splice(i, 1);
         healTargetsTicksHealed.splice(i, 1);
         i--;
      }
   }

   // Add new targets
   for (let i = 0; i < healingTargets.length; i++) {
      const target = healingTargets[i];
      if (!healTargetIsInIDs(target, healTargetIDs)) {
         healTargetIDs.push(target);
         healTargetsTicksHealed.push(0);
      }
   }

   // Update heal targets
   for (let i = 0; i < healTargetIDs.length; i++) {
      healTargetsTicksHealed[i]++;
      if (healTargetsTicksHealed[i] % Settings.TPS === 0) {
         const target = healTargetIDs[i];
         healEntity(target, Vars.HEALING_PER_SECOND, healingTotem);
      }
   }
}

function getDataLength(entity: EntityID): number {
   const healingTotemComponent = HealingTotemComponentArray.getComponent(entity);

   let lengthBytes = 2 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 3 * Float32Array.BYTES_PER_ELEMENT * healingTotemComponent.healTargetIDs.length;

   return lengthBytes;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const healingTotemComponent = HealingTotemComponentArray.getComponent(entity);

   packet.addNumber(healingTotemComponent.healTargetIDs.length);
   for (let i = 0; i < healingTotemComponent.healTargetIDs.length; i++) {
      const healTarget = healingTotemComponent.healTargetIDs[i];
      const ticksHealed = healingTotemComponent.healTargetsTicksHealed[i];

      const transformComponent = TransformComponentArray.getComponent(healTarget);

      packet.addNumber(healTarget);
      packet.addNumber(transformComponent.position.x);
      packet.addNumber(transformComponent.position.y);
      packet.addNumber(ticksHealed);
   }
}
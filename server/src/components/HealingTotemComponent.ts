import { Bytes } from "../../../shared/dist/constants.js";
import { ServerComponentType } from "../../../shared/dist/components.js";
import { Entity } from "../../../shared/dist/entities.js";
import { Packet } from "../../../shared/dist/packets.js";
import { Settings } from "../../../shared/dist/settings.js";
import { EntityRelationship, getEntityRelationship } from "./TribeComponent.js";
import { HealthComponentArray, healEntity } from "./HealthComponent.js";
import { ComponentArray } from "./ComponentArray.js";
import { TransformComponentArray } from "./TransformComponent.js";
import { entityExists } from "../world.js";
import { AIHelperComponentArray } from "./AIHelperComponent.js";

const enum Vars {
   HEALING_PER_SECOND = 1
}

export class HealingTotemComponent {
   public readonly healTargetIDs: number[] = [];
   public readonly healTargetsTicksHealed: number[] = [];
}

export const HealingTotemComponentArray = new ComponentArray<HealingTotemComponent>(ServerComponentType.healingTotem, true, getDataLength, addDataToPacket);
HealingTotemComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

const getHealingTargets = (healingTotem: Entity, visibleEntities: readonly Entity[]): readonly Entity[] => {
   const targets: Entity[] = [];
   for (const entity of visibleEntities) {
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

      targets.push(entity);
   }

   return targets;
}

const idIsInHealTargets = (id: number, healTargets: readonly Entity[]): boolean => {
   for (let i = 0; i < healTargets.length; i++) {
      const entity = healTargets[i];
      if (entity === id) {
         return true;
      }
   }
   return false;
}

const healTargetIsInIDs = (target: Entity, ids: readonly number[]): boolean => {
   for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      if (id === target) {
         return true;
      }
   }
   return false;
}

function onTick(healingTotem: Entity): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(healingTotem);
   const healingTotemComponent = HealingTotemComponentArray.getComponent(healingTotem);
   
   // @Speed: shouldn't call every tick
   const healingTargets = getHealingTargets(healingTotem, aiHelperComponent.visibleEntities);

   const healTargetIDs = healingTotemComponent.healTargetIDs;
   const healTargetsTicksHealed = healingTotemComponent.healTargetsTicksHealed;

   // Check for removed healing targets
   for (let i = 0; i < healTargetIDs.length; i++) {
      const targetID = healTargetIDs[i];
      if (!idIsInHealTargets(targetID, healingTargets) || !entityExists(targetID)) {
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
      if (healTargetsTicksHealed[i] % Settings.TICK_RATE === 0) {
         const target = healTargetIDs[i];
         healEntity(target, Vars.HEALING_PER_SECOND, healingTotem);
      }
   }
}

function getDataLength(entity: Entity): number {
   const healingTotemComponent = HealingTotemComponentArray.getComponent(entity);

   let lengthBytes = Bytes.Float32;
   lengthBytes += 3 * Bytes.Float32 * healingTotemComponent.healTargetIDs.length;

   return lengthBytes;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const healingTotemComponent = HealingTotemComponentArray.getComponent(entity);

   packet.writeNumber(healingTotemComponent.healTargetIDs.length);
   for (let i = 0; i < healingTotemComponent.healTargetIDs.length; i++) {
      const healTarget = healingTotemComponent.healTargetIDs[i];
      const ticksHealed = healingTotemComponent.healTargetsTicksHealed[i];

      const transformComponent = TransformComponentArray.getComponent(healTarget);
      const hitbox = transformComponent.hitboxes[0];

      packet.writeNumber(healTarget);
      packet.writeNumber(hitbox.box.posX);
      packet.writeNumber(hitbox.box.posY);
      packet.writeNumber(ticksHealed);
   }
}
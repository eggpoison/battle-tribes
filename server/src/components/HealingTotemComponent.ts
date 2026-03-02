import { Settings } from "battletribes-shared/settings";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityRelationship, getEntityRelationship } from "./TribeComponent";
import { HealthComponentArray, healEntity } from "./HealthComponent";
import { ComponentArray } from "./ComponentArray";
import { Entity } from "battletribes-shared/entities";
import { TransformComponentArray } from "./TransformComponent";
import { Packet } from "battletribes-shared/packets";
import { entityExists } from "../world";
import { AIHelperComponentArray } from "./AIHelperComponent";

const enum Vars {
   HEALING_PER_SECOND = 1
}

export class HealingTotemComponent {
   public readonly healTargetIDs = new Array<number>();
   public readonly healTargetsTicksHealed = new Array<number>();
}

export const HealingTotemComponentArray = new ComponentArray<HealingTotemComponent>(ServerComponentType.healingTotem, true, getDataLength, addDataToPacket);
HealingTotemComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

const getHealingTargets = (healingTotem: Entity, visibleEntities: ReadonlyArray<Entity>): ReadonlyArray<Entity> => {
   const targets = new Array<Entity>();
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

const idIsInHealTargets = (id: number, healTargets: ReadonlyArray<Entity>): boolean => {
   for (let i = 0; i < healTargets.length; i++) {
      const entity = healTargets[i];
      if (entity === id) {
         return true;
      }
   }
   return false;
}

const healTargetIsInIDs = (target: Entity, ids: ReadonlyArray<number>): boolean => {
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

   let lengthBytes = Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 3 * Float32Array.BYTES_PER_ELEMENT * healingTotemComponent.healTargetIDs.length;

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
      packet.writeNumber(hitbox.box.position.x);
      packet.writeNumber(hitbox.box.position.y);
      packet.writeNumber(ticksHealed);
   }
}
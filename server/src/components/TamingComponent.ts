import { ServerComponentType } from "../../../shared/dist/components.js";
import { Entity } from "../../../shared/dist/entities.js";
import { getTamingSkill, TamingSkill, TamingSkillID, TamingTier } from "../../../shared/dist/taming.js";
import { getStringLengthBytes, Packet } from "../../../shared/dist/packets.js";
import { Point, polarVec2 } from "../../../shared/dist/utils.js";
import { Bytes } from "../../../shared/dist/constants.js";
import Tribe from "../Tribe.js";
import { entityExists } from "../world.js";
import { ComponentArray } from "./ComponentArray.js";
import { TransformComponentArray } from "./TransformComponent.js";
import { TribesmanComponentArray } from "./TribesmanComponent.js";
import PlayerClient from "../server/PlayerClient.js";
import { getTamingSpec } from "../taming-specs.js";

interface TamingSkillLearning {
   readonly skill: TamingSkill;
   /** Indexes will be the same as the requirements on the skill */
   readonly requirementProgressArray: Array<number>;
}

export class TamingComponent {
   public tamingTier: TamingTier = 0;
   public tameTribe: Tribe | null = null;
   /** Amount of berries eaten in the current tier. */
   public foodEatenInTier = 0;

   public name = "";

   public readonly acquiredSkills: Array<TamingSkill> = [];
   public readonly skillLearningArray: Array<TamingSkillLearning> = [];

   // @Temporary
   public attackTarget: Entity = 0;
   
   // @Temporary
   public carryTarget: Entity = 0;
   
   // @Temporary
   public followTarget: Entity = 0;

   public depositTarget: Point | null = null;

   constructor() {
      const follow = getTamingSkill(TamingSkillID.follow);
      this.skillLearningArray.push({
         skill: follow,
         requirementProgressArray: [follow.requirements[0].amountRequired]
      });
      const move = getTamingSkill(TamingSkillID.move);
      this.skillLearningArray.push({
         skill: move,
         requirementProgressArray: [move.requirements[0].amountRequired]
      });
      const attack = getTamingSkill(TamingSkillID.attack);
      this.skillLearningArray.push({
         skill: attack,
         requirementProgressArray: [attack.requirements[0].amountRequired]
      });
   }
}

export const TamingComponentArray = new ComponentArray<TamingComponent>(ServerComponentType.taming, true, getDataLength, addDataToPacket);

function getDataLength(entity: Entity): number {
   const tamingComponent = TamingComponentArray.getComponent(entity);
   let lengthBytes = 2 * Bytes.Float32 + getStringLengthBytes(tamingComponent.name);

   // Acquired skills
   lengthBytes += Bytes.Float32 + Bytes.Float32 * tamingComponent.acquiredSkills.length;

   // Skill learnings
   lengthBytes += Bytes.Float32;
   for (const skillLearning of tamingComponent.skillLearningArray) {
      lengthBytes += Bytes.Float32;
      lengthBytes += Bytes.Float32 * skillLearning.requirementProgressArray.length;
   }

   lengthBytes += 2 * Bytes.Float32;
   
   return lengthBytes;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const tamingComponent = TamingComponentArray.getComponent(entity);
   packet.writeNumber(tamingComponent.tamingTier);
   packet.writeNumber(tamingComponent.foodEatenInTier);
   packet.writeString(tamingComponent.name);

   // Acquired skills
   packet.writeNumber(tamingComponent.acquiredSkills.length);
   for (const skill of tamingComponent.acquiredSkills) {
      packet.writeNumber(skill.id);
   }

   // Skill learnings
   packet.writeNumber(tamingComponent.skillLearningArray.length);
   for (const skillLearning of tamingComponent.skillLearningArray) {
      packet.writeNumber(skillLearning.skill.id);
      for (const requirementProgress of skillLearning.requirementProgressArray) {
         packet.writeNumber(requirementProgress);
      }
   }

   packet.writeBool(entityExists(tamingComponent.attackTarget));
   packet.writeBool(entityExists(tamingComponent.followTarget));
}

export function getTamingSkillLearning(tamingComponent: TamingComponent, skillID: TamingSkillID): TamingSkillLearning | null {
   for (const skillLearning of tamingComponent.skillLearningArray) {
      if (skillLearning.skill.id === skillID) {
         return skillLearning;
      }
   }
   return null;
}

export function skillLearningIsComplete(skillLearning: TamingSkillLearning): boolean {
   for (let i = 0; i < skillLearning.skill.requirements.length; i++) {
      const requirement = skillLearning.skill.requirements[0];
      const requirementProgress = skillLearning.requirementProgressArray[0];
      if (requirementProgress < requirement.amountRequired) {
         return false;
      }
   }

   return true;
}

export function addSkillLearningProgress(tamingComponent: TamingComponent, skillID: TamingSkillID, amount: number): void {
   const skill = getTamingSkill(skillID);
   if (tamingComponent.acquiredSkills.includes(skill)) {
      return;
   }
   
   const existingSkillLearning = getTamingSkillLearning(tamingComponent, skillID);
   if (existingSkillLearning !== null) {
      // @Hack
      existingSkillLearning.requirementProgressArray[0] += amount;

      // Clamp it
      const maxAmount = skill.requirements[0].amountRequired;
      if (existingSkillLearning.requirementProgressArray[0] > maxAmount) {
         existingSkillLearning.requirementProgressArray[0] = maxAmount;
      }
   } else {
      const skillLearning: TamingSkillLearning = {
         skill: skill,
         requirementProgressArray: skill.requirements.map(_ => 0)
      };
      // @Hack
      skillLearning.requirementProgressArray[0] = amount;
      tamingComponent.skillLearningArray.push(skillLearning);
   }
}

export function getRiderTargetPosition(rider: Entity): Point | null {
   // @INCOMPLETE: This used to rely on the acceleration of the carried entity, but that's gone now.
   // What will need to be done to return this to a functional state is to make all AI components report
   // what their current movement target is. (Use AIHelperComponent for now but add @Hack comment?)

   if (TribesmanComponentArray.hasComponent(rider)) {
      const tribesmanComponent = TribesmanComponentArray.getComponent(rider);
      if (tribesmanComponent.moveIntention !== null) {
         const transformComponent = TransformComponentArray.getComponent(rider);
         const playerHitbox = transformComponent.hitboxes[0];
   
         const moveIntention = polarVec2(400, tribesmanComponent.moveIntention);
         const x = playerHitbox.box.posX + moveIntention.x;
         const y = playerHitbox.box.posY + moveIntention.y;
         return new Point(x, y);
      }
   }

   return null;
}

export function hasTamingSkill(tamingComponent: TamingComponent, skillID: TamingSkillID): boolean {
   for (const skill of tamingComponent.acquiredSkills) {
      if (skill.id === skillID) {
         return true;
      }
   }
   return false;
}

export function incrementTamingTier(entity: Entity, playerClient: PlayerClient, tamingComponent: TamingComponent): void {
   const tamingSpec = getTamingSpec(entity);
   if (tamingComponent.tamingTier < tamingSpec.maxTamingTier) {
      // @Cleanup @Copynpaste
      tamingComponent.tamingTier++;
      tamingComponent.foodEatenInTier = 0;
      tamingComponent.tameTribe = playerClient.tribe;
   }
}
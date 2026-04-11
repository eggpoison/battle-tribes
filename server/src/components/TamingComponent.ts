import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { getStringLengthBytes, Packet } from "../../../shared/src/packets";
import { Point, polarVec2 } from "../../../shared/src/utils";
import Tribe from "../Tribe";
import { entityExists } from "../world";
import { ComponentArray } from "./ComponentArray";
import { getTamingSkill, TamingSkill, TamingSkillID, TamingTier } from "battletribes-shared/taming";
import { PlayerComponentArray } from "./PlayerComponent";
import { TransformComponentArray } from "./TransformComponent";
import { TribesmanComponentArray } from "./TribesmanComponent";
import PlayerClient from "../server/PlayerClient";
import { getTamingSpec } from "../taming-specs";

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

   public readonly acquiredSkills = new Array<TamingSkill>();
   public readonly skillLearningArray = new Array<TamingSkillLearning>();

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
   let lengthBytes = 2 * Float32Array.BYTES_PER_ELEMENT + getStringLengthBytes(tamingComponent.name);

   // Acquired skills
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + Float32Array.BYTES_PER_ELEMENT * tamingComponent.acquiredSkills.length;

   // Skill learnings
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   for (const skillLearning of tamingComponent.skillLearningArray) {
      lengthBytes += Float32Array.BYTES_PER_ELEMENT;
      lengthBytes += Float32Array.BYTES_PER_ELEMENT * skillLearning.requirementProgressArray.length;
   }

   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;
   
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
         const x = playerHitbox.box.position.x + moveIntention.x;
         const y = playerHitbox.box.position.y + moveIntention.y;
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
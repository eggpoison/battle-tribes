import { ItemType } from "./items/items";

export enum TamingSkillID {
   follow,
   riding,
   move,
   carry,
   attack,
   shatteredWill,
   dulledPainReceptors,
   imprint
}

export type TamingTier = 0 | 1 | 2 | 3;

export interface TamingSkillRequirement {
   readonly description: string;
   readonly amountRequired: number;
   readonly suffix: string;
}

export interface TamingSkill {
   readonly id: TamingSkillID;
   readonly name: string;
   readonly description: string;
   readonly requirements: ReadonlyArray<TamingSkillRequirement>;
}

export interface TamingSkillNode {
   readonly skill: TamingSkill;
   readonly x: number;
   readonly y: number;
   readonly parent: TamingSkillID | null;
   readonly requiredTamingTier: number;
}

export interface EntityTamingSpec<TamingTiers extends TamingTier = TamingTier> {
   readonly maxTamingTier: TamingTier;
   readonly skillNodes: ReadonlyArray<TamingSkillNode>;
   readonly foodItemType: ItemType;
   readonly tierFoodRequirements: Partial<Record<TamingTiers, number>>;
}

export const TAMING_SKILL_RECORD: Record<TamingSkillID, TamingSkill> = {
   [TamingSkillID.follow]: {
      id: TamingSkillID.follow,
      name: "Follow",
      description: "Allows you to command the [[CREATURE_NAME]] to follow you.",
      requirements: [
         {
            description: "Time spent around creature",
            amountRequired: 30,
            suffix: " seconds"
         }
      ]
   },
   [TamingSkillID.riding]: {
      id: TamingSkillID.riding,
      name: "Riding",
      description: "Allows you to ride the [[CREATURE_NAME]].",
      requirements: [
         {
            description: "Mount attempts",
            amountRequired: 5,
            suffix: " attempts"
         }
      ]
   },
   [TamingSkillID.move]: {
      id: TamingSkillID.move,
      name: "Move",
      description: "Allows you to command the [[CREATURE_NAME]] to move to a specific location.",
      requirements: [
         {
            description: "Time spent following",
            amountRequired: 30,
            suffix: " seconds"
         }
      ]
   },
   [TamingSkillID.carry]: {
      id: TamingSkillID.carry,
      name: "Carry",
      description: "Allows you to command the [[CREATURE_NAME]] to pick up an entity.",
      requirements: [
         {
            description: "Time spent riding",
            amountRequired: 120,
            suffix: " seconds"
         }
      ]
   },
   [TamingSkillID.attack]: {
      id: TamingSkillID.attack,
      name: "Attack",
      description: "Allows you to command the [[CREATURE_NAME]] to attack enemies.",
      requirements: [
         {
            description: "Time spent being moved",
            amountRequired: 30,
            suffix: " seconds"
         }
      ]
   },
   [TamingSkillID.shatteredWill]: {
      id: TamingSkillID.shatteredWill,
      name: "Shattered Will",
      description: "The cow will no longer run away when you or any friendly tribesmen hit it.",
      requirements: [
         {
            description: "Damage taken",
            amountRequired: 15,
            suffix: " damage"
         }
      ]
   },
   [TamingSkillID.dulledPainReceptors]: {
      id: TamingSkillID.dulledPainReceptors,
      name: "Dulled Pain Receptors",
      description: "The glurb no longer reacts when hit.",
      requirements: [
         {
            description: "Damage taken",
            amountRequired: 15,
            suffix: " damage"
         }
      ]
   },
   [TamingSkillID.imprint]: {
      id: TamingSkillID.imprint,
      name: "Imprint",
      description: "The krumblid will remain tame at Taming Tier 1 when it metamorphs into an okren.",
      requirements: [
         {
            description: "Time spent at Taming Tier 3",
            amountRequired: 1000,
            suffix: " seconds"
         }
      ]
   }
};

export function getTamingSkill(id: TamingSkillID): TamingSkill {
   return TAMING_SKILL_RECORD[id];
}
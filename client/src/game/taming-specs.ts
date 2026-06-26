import { Entity, EntityType } from "../../../shared/src/entities";
import { ItemType } from "../../../shared/src/items/items";
import { PacketReader } from "../../../shared/src/packets";
import { EntityTamingSpec, getTamingSkill, TamingSkillID, TamingSkillNode, TamingTier } from "../../../shared/src/taming";
import { assert } from "../../../shared/src/utils";
import { getEntityType } from "./world";

const TAMING_SPECS: Partial<Record<EntityType, EntityTamingSpec>> = {};

export function getEntityTamingSpec(entity: Entity): EntityTamingSpec {
   const entityType = getEntityType(entity);
   const spec = TAMING_SPECS[entityType];
   assert(spec !== undefined);
   return spec;
}

const readTamingSpecFromData = (reader: PacketReader): EntityTamingSpec => {
   const maxTamingTier = reader.readNumber() as TamingTier;
   
   const numSkills = reader.readNumber();
   const skillNodes: TamingSkillNode[] = [];
   for (let i = 0; i < numSkills; i++) {
      const skillID: TamingSkillID = reader.readNumber();
      const x = reader.readNumber();
      const y = reader.readNumber();
      const parentSkillID = reader.readNumber();
      const requiredTamingTier = reader.readNumber();
      skillNodes.push({
         skill: getTamingSkill(skillID),
         x: x,
         y: y,
         parent: parentSkillID !== -1 ? parentSkillID : null,
         requiredTamingTier: requiredTamingTier
      });
   }

   const foodItemType: ItemType = reader.readNumber();

   const tierFoodRequirements = {} as Record<TamingTier, number>;
   for (let tamingTier = 0; tamingTier <= maxTamingTier; tamingTier++) {
      const foodRequired = reader.readNumber();
      tierFoodRequirements[tamingTier as TamingTier] = foodRequired;
   }

   return {
      maxTamingTier: maxTamingTier,
      skillNodes: skillNodes,
      foodItemType: foodItemType,
      tierFoodRequirements: tierFoodRequirements
   };
}

export function registerTamingSpecsFromData(reader: PacketReader): void {
   const numSpecs = reader.readNumber();
   for (let i = 0; i < numSpecs; i++) {
      const entityType: EntityType = reader.readNumber();
      const spec = readTamingSpecFromData(reader);

      TAMING_SPECS[entityType] = spec;
   }
}
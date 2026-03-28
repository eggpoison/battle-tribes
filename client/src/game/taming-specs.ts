import { assert, EntityTamingSpec, getTamingSkill, TamingSkillID, TamingSkillNode, TamingTier, PacketReader, ItemType, Entity, EntityType } from "webgl-test-shared";
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
   const skillNodes = new Array<TamingSkillNode>();
   for (let i = 0; i < numSkills; i++) {
      const skillID = reader.readNumber() as TamingSkillID;
      const x = reader.readNumber();
      const y = reader.readNumber();
      const parentSkillID = reader.readNumber();
      const requiredTamingTier = reader.readNumber();
      skillNodes.push({
         skill: getTamingSkill(skillID),
         x: x,
         y: y,
         parent: parentSkillID !== -1 ? parentSkillID as TamingSkillID : null,
         requiredTamingTier: requiredTamingTier
      });
   }

   const foodItemType = reader.readNumber() as ItemType;

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
      const entityType = reader.readNumber() as EntityType;
      const spec = readTamingSpecFromData(reader);

      TAMING_SPECS[entityType] = spec;
   }
}
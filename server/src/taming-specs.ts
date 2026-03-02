import { Entity, EntityType } from "../../shared/src/entities";
import { Packet } from "../../shared/src/packets";
import { EntityTamingSpec, TamingTier } from "../../shared/src/taming";
import { assert } from "../../shared/src/utils";
import { getEntityType } from "./world";

const tamingSpecsMap = new Map<EntityType, EntityTamingSpec>();

export function getTamingSpecsMap(): ReadonlyMap<EntityType, EntityTamingSpec> {
   return tamingSpecsMap;
}

const validateTamingSpec = (spec: EntityTamingSpec): void => {
   for (const skillNode of spec.skillNodes) {
      if (skillNode.parent === skillNode.skill.id) {
         throw new Error("Nodes can't parent themselves!");
      }
   }
}

export function registerEntityTamingSpec(entityType: EntityType, spec: EntityTamingSpec): void {
   validateTamingSpec(spec);
   
   tamingSpecsMap.set(entityType, spec);
}

export function getTamingSpec(entity: Entity): EntityTamingSpec {
   const entityType = getEntityType(entity);
   const spec = tamingSpecsMap.get(entityType);
   assert(typeof spec !== "undefined");
   return spec;
}

export function getTamingSpecDataLength(tamingSpec: EntityTamingSpec): number {
   let lengthBytes = Float32Array.BYTES_PER_ELEMENT;

   lengthBytes += Float32Array.BYTES_PER_ELEMENT + 5 * Float32Array.BYTES_PER_ELEMENT * tamingSpec.skillNodes.length;

   lengthBytes += Float32Array.BYTES_PER_ELEMENT;

   lengthBytes += Float32Array.BYTES_PER_ELEMENT * (tamingSpec.maxTamingTier + 1);

   return lengthBytes;
}

export function addTamingSpecToData(packet: Packet, tamingSpec: EntityTamingSpec): void {
   packet.writeNumber(tamingSpec.maxTamingTier);
   
   packet.writeNumber(tamingSpec.skillNodes.length);
   for (const skillNode of tamingSpec.skillNodes) {
      packet.writeNumber(skillNode.skill.id);
      packet.writeNumber(skillNode.x);
      packet.writeNumber(skillNode.y);
      packet.writeNumber(skillNode.parent !== null ? skillNode.parent : -1);
      packet.writeNumber(skillNode.requiredTamingTier);
   }

   packet.writeNumber(tamingSpec.foodItemType);

   for (let tamingTier = 0; tamingTier <= tamingSpec.maxTamingTier; tamingTier++) {
      const foodRequirements = tamingSpec.tierFoodRequirements[tamingTier as TamingTier];
      assert(typeof foodRequirements !== "undefined");
      packet.writeNumber(foodRequirements);
   }
}
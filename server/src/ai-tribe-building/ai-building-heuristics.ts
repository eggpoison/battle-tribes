import { PotentialPlanSafetyData } from "webgl-test-shared/dist/ai-building-types";
import { EntityType, EntityTypeString } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StructureType } from "webgl-test-shared/dist/structures";
import Tribe from "../Tribe";
import Entity from "../Entity";
import { SafetyNode, addHitboxesOccupiedNodes, getSafetyNode, safetyNodeIsInWall } from "./ai-building";

const enum Vars {
   /** Minimum safety that buildings should have */
   DESIRED_SAFETY = 65,
   MIN_SAFETY_WEIGHT = 2,
   AVERAGE_SAFETY_WEIGHT = 1,
   EXTENDED_NODE_RANGE = 5,
   LN_SCALE_FACTOR = 30
}

type InfrastructureBuildingType = EntityType.tribeTotem | EntityType.workerHut | EntityType.workbench | EntityType.barrel | EntityType.researchBench | EntityType.warriorHut;

const BASE_BUILDING_WEIGHTS: Record<InfrastructureBuildingType, number> = {
   [EntityType.tribeTotem]: 10,
   [EntityType.workerHut]: 5,
   [EntityType.warriorHut]: 5,
   [EntityType.barrel]: 3,
   [EntityType.researchBench]: 3,
   [EntityType.workbench]: 2
};

export function buildingIsInfrastructure(entityType: EntityType): boolean {
   return entityType !== EntityType.wall && entityType !== EntityType.embrasure && entityType !== EntityType.door && entityType !== EntityType.tunnel;
}

const getExtendedNodeSafety = (tribe: Tribe, nodeIndex: number, extendDist: number): number => {
   let safety = tribe.safetyRecord[nodeIndex];
   safety *= 1 - extendDist / Vars.EXTENDED_NODE_RANGE;
   return safety;
}

const getExtendedBuildingNodeSafety = (tribe: Tribe, occupiedNodeIndexes: Set<SafetyNode>): number => {
   // Find border nodes
   const borderNodeIndexes = new Set<number>();
   for (const nodeIndex of occupiedNodeIndexes) {
      const nodeX = nodeIndex % Settings.SAFETY_NODES_IN_WORLD_WIDTH;
      const nodeY = Math.floor(nodeIndex / Settings.SAFETY_NODES_IN_WORLD_WIDTH);

      // Top
      if (nodeY < Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1) {
         const nodeIndex = getSafetyNode(nodeX, nodeY + 1);
         if (!occupiedNodeIndexes.has(nodeIndex) && !safetyNodeIsInWall(nodeX, nodeY + 1)) {
            borderNodeIndexes.add(nodeIndex);
         }
      }

      // Right
      if (nodeX < Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1) {
         const nodeIndex = getSafetyNode(nodeX + 1, nodeY);
         if (!occupiedNodeIndexes.has(nodeIndex) && !safetyNodeIsInWall(nodeX + 1, nodeY)) {
            borderNodeIndexes.add(nodeIndex);
         }
      }

      // Bottom
      if (nodeY > 0) {
         const nodeIndex = getSafetyNode(nodeX, nodeY - 1);
         if (!occupiedNodeIndexes.has(nodeIndex) && !safetyNodeIsInWall(nodeX, nodeY - 1)) {
            borderNodeIndexes.add(nodeIndex);
         }
      }

      // Left
      if (nodeX > 0) {
         const nodeIndex = getSafetyNode(nodeX - 1, nodeY);
         if (!occupiedNodeIndexes.has(nodeIndex) && !safetyNodeIsInWall(nodeX - 1, nodeY)) {
            borderNodeIndexes.add(nodeIndex);
         }
      }
   }

   let safety = 0;

   // Expand nodes
   const expandedNodeIndexes = new Set<SafetyNode>();
   let previousOuterNodes = borderNodeIndexes;
   for (let extendDist = 0; extendDist < Vars.EXTENDED_NODE_RANGE; extendDist++) {
      // 
      // Expand previous outer nodes
      // 

      const addedNodes = new Set<SafetyNode>();
      
      for (const nodeIndex of previousOuterNodes) {
         const nodeX = nodeIndex % Settings.SAFETY_NODES_IN_WORLD_WIDTH;
         const nodeY = Math.floor(nodeIndex / Settings.SAFETY_NODES_IN_WORLD_WIDTH);

         // Top
         if (nodeY < Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1) {
            const nodeIndex = getSafetyNode(nodeX, nodeY + 1);
            if (!expandedNodeIndexes.has(nodeIndex) && !occupiedNodeIndexes.has(nodeIndex) && !safetyNodeIsInWall(nodeX, nodeY + 1)) {
               expandedNodeIndexes.add(nodeIndex);
               addedNodes.add(nodeIndex);
               safety += getExtendedNodeSafety(tribe, nodeIndex, extendDist);
            }
         }
   
         // Right
         if (nodeX < Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1) {
            const nodeIndex = getSafetyNode(nodeX + 1, nodeY);
            if (!expandedNodeIndexes.has(nodeIndex) && !occupiedNodeIndexes.has(nodeIndex) && !safetyNodeIsInWall(nodeX + 1, nodeY)) {
               expandedNodeIndexes.add(nodeIndex);
               addedNodes.add(nodeIndex);
               safety += getExtendedNodeSafety(tribe, nodeIndex, extendDist);
            }
         }
   
         // Bottom
         if (nodeY > 0) {
            const nodeIndex = getSafetyNode(nodeX, nodeY - 1);
            if (!expandedNodeIndexes.has(nodeIndex) && !occupiedNodeIndexes.has(nodeIndex) && !safetyNodeIsInWall(nodeX, nodeY - 1)) {
               expandedNodeIndexes.add(nodeIndex);
               addedNodes.add(nodeIndex);
               safety += getExtendedNodeSafety(tribe, nodeIndex, extendDist);
            }
         }
   
         // Left
         if (nodeX > 0) {
            const nodeIndex = getSafetyNode(nodeX - 1, nodeY);
            if (!expandedNodeIndexes.has(nodeIndex) && !occupiedNodeIndexes.has(nodeIndex) && !safetyNodeIsInWall(nodeX - 1, nodeY)) {
               expandedNodeIndexes.add(nodeIndex);
               addedNodes.add(nodeIndex);
               safety += getExtendedNodeSafety(tribe, nodeIndex, extendDist);
            }
         }
      }

      previousOuterNodes = addedNodes;
   }

   // Average the safety
   safety /= expandedNodeIndexes.size;
   
   return safety;
}

const getMinBuildingNodeSafety = (tribe: Tribe, occupiedIndexes: Set<SafetyNode>): number => {
   let minSafety = Number.MAX_SAFE_INTEGER;
   for (const nodeIndex of occupiedIndexes) {
      const safety = tribe.safetyRecord[nodeIndex];
      if (safety < minSafety) {
         minSafety = safety;
      }
   }

   return minSafety;
}

const getAverageBuildingNodeSafety = (tribe: Tribe, occupiedIndexes: Set<SafetyNode>): number => {
   let averageSafety = 0;
   for (const nodeIndex of occupiedIndexes) {
      if (tribe.safetyRecord[nodeIndex] === undefined) {
         throw new Error("Node wasn't in safety record");
      }

      const safety = tribe.safetyRecord[nodeIndex];
      averageSafety += safety;
   }

   if (averageSafety < 0) {
      averageSafety = 0;
   }
   return averageSafety / occupiedIndexes.size;
}

export function getBuildingSafety(tribe: Tribe, building: Entity, safetyInfo: PotentialPlanSafetyData | null): number {
   if (BASE_BUILDING_WEIGHTS[building.type as InfrastructureBuildingType] === undefined) {
      throw new Error("Base buliding weight not defined for entity type " + EntityTypeString[building.type]);
   }
   
   const occupiedIndexes = new Set<SafetyNode>();
   addHitboxesOccupiedNodes(building.hitboxes, occupiedIndexes);

   let safety = 0;
   if (isNaN(safety)) {
      throw new Error();
   }

   let minSafety = getMinBuildingNodeSafety(tribe, occupiedIndexes);
   minSafety *= Vars.MIN_SAFETY_WEIGHT;
   safety += minSafety;
   if (isNaN(safety)) {
      throw new Error();
   }

   let averageSafety = getAverageBuildingNodeSafety(tribe, occupiedIndexes);
   averageSafety *= Vars.AVERAGE_SAFETY_WEIGHT;
   safety += averageSafety;
   if (isNaN(safety)) {
      throw new Error();
   }

   let extendedAverageSafety = getExtendedBuildingNodeSafety(tribe, occupiedIndexes);
   extendedAverageSafety *= Vars.AVERAGE_SAFETY_WEIGHT;
   safety += extendedAverageSafety;
   if (isNaN(safety)) {
      throw new Error();
   }

   safety = Math.log1p(safety / Vars.LN_SCALE_FACTOR) * Vars.LN_SCALE_FACTOR;
   if (isNaN(safety)) {
      throw new Error();
   }
   
   safety *= BASE_BUILDING_WEIGHTS[building.type as InfrastructureBuildingType];

   if (safetyInfo !== null) {
      safetyInfo.buildingTypes.push(building.type as StructureType);
      safetyInfo.buildingIDs.push(building.id);
      safetyInfo.buildingMinSafetys.push(minSafety);
      safetyInfo.buildingAverageSafetys.push(averageSafety);
      safetyInfo.buildingExtendedAverageSafetys.push(extendedAverageSafety);
      safetyInfo.buildingResultingSafetys.push(safety);
   }

   return safety;
}

export interface SafetyQuery {
   readonly safety: number;
   readonly safetyInfo: PotentialPlanSafetyData;
}

export function getTribeSafety(tribe: Tribe): SafetyQuery {
   let safety = 0;

   const safetyInfo: PotentialPlanSafetyData = {
      buildingTypes: [],
      buildingIDs: [],
      buildingMinSafetys: [],
      buildingAverageSafetys: [],
      buildingExtendedAverageSafetys: [],
      buildingResultingSafetys: []
   };
   
   for (let i = 0; i < tribe.buildings.length; i++) {
      const building = tribe.buildings[i];
      if (!buildingIsInfrastructure(building.type)) {
         continue;
      }

      const buildingSafety = getBuildingSafety(tribe, building, safetyInfo);
      safety += buildingSafety;
   }

   return {
      safety: safety,
      safetyInfo: safetyInfo
   };
}

export function tribeIsVulnerable(tribe: Tribe): boolean {
   for (let i = 0; i < tribe.buildings.length; i++) {
      const building = tribe.buildings[i];
      if (!buildingIsInfrastructure(building.type)) {
         continue;
      }

      const occupiedIndexes = new Set<SafetyNode>();
      addHitboxesOccupiedNodes(building.hitboxes, occupiedIndexes);

      const minSafety = getMinBuildingNodeSafety(tribe, occupiedIndexes);
      if (minSafety < Vars.DESIRED_SAFETY) {
         return true;
      }
   }

   return false;
}
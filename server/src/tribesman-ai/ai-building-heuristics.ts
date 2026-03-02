import { PotentialPlanSafetyData } from "battletribes-shared/ai-building-types";
import { EntityType, EntityTypeString } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import Tribe from "../Tribe";
import { SafetyNode, getSafetyNode, safetyNodeIsInWall } from "./ai-building";
import TribeBuildingLayer, { VirtualStructure } from "./building-plans/TribeBuildingLayer";

const enum Vars {
   /** Minimum safety that buildings should have */
   DESIRED_SAFETY = 65,
   MIN_SAFETY_WEIGHT = 2,
   AVERAGE_SAFETY_WEIGHT = 1,
   EXTENDED_NODE_RANGE = 5,
   LN_SCALE_FACTOR = 30
}

/** Building types which the AI will try to protect with walls */
type InfrastructureBuildingType = EntityType.tribeTotem | EntityType.workerHut | EntityType.workbench | EntityType.barrel | EntityType.researchBench | EntityType.warriorHut | EntityType.furnace;

const BASE_BUILDING_WEIGHTS: Record<InfrastructureBuildingType, number> = {
   [EntityType.tribeTotem]: 10,
   [EntityType.workerHut]: 5,
   [EntityType.warriorHut]: 5,
   [EntityType.barrel]: 3,
   [EntityType.researchBench]: 3,
   [EntityType.workbench]: 2,
   [EntityType.furnace]: 2
};

export function buildingIsInfrastructure(entityType: EntityType): entityType is InfrastructureBuildingType {
   return typeof BASE_BUILDING_WEIGHTS[entityType as InfrastructureBuildingType] !== "undefined";
}

const getExtendedNodeSafety = (buildingLayer: TribeBuildingLayer, nodeIndex: number, extendDist: number): number => {
   let safety = buildingLayer.safetyRecord[nodeIndex];
   safety *= 1 - extendDist / Vars.EXTENDED_NODE_RANGE;
   return safety;
}

const getExtendedBuildingNodeSafety = (buildingLayer: TribeBuildingLayer, occupiedNodeIndexes: Set<SafetyNode>): number => {
   const layer = buildingLayer.layer;
   
   // Find border nodes
   const borderNodeIndexes = new Set<number>();
   for (const nodeIndex of occupiedNodeIndexes) {
      const nodeX = nodeIndex % Settings.SAFETY_NODES_IN_WORLD_WIDTH;
      const nodeY = Math.floor(nodeIndex / Settings.SAFETY_NODES_IN_WORLD_WIDTH);

      // Top
      if (nodeY < Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1) {
         const nodeIndex = getSafetyNode(nodeX, nodeY + 1);
         if (!occupiedNodeIndexes.has(nodeIndex) && !safetyNodeIsInWall(layer, nodeX, nodeY + 1)) {
            borderNodeIndexes.add(nodeIndex);
         }
      }

      // Right
      if (nodeX < Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1) {
         const nodeIndex = getSafetyNode(nodeX + 1, nodeY);
         if (!occupiedNodeIndexes.has(nodeIndex) && !safetyNodeIsInWall(layer, nodeX + 1, nodeY)) {
            borderNodeIndexes.add(nodeIndex);
         }
      }

      // Bottom
      if (nodeY > 0) {
         const nodeIndex = getSafetyNode(nodeX, nodeY - 1);
         if (!occupiedNodeIndexes.has(nodeIndex) && !safetyNodeIsInWall(layer, nodeX, nodeY - 1)) {
            borderNodeIndexes.add(nodeIndex);
         }
      }

      // Left
      if (nodeX > 0) {
         const nodeIndex = getSafetyNode(nodeX - 1, nodeY);
         if (!occupiedNodeIndexes.has(nodeIndex) && !safetyNodeIsInWall(layer, nodeX - 1, nodeY)) {
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
            if (!expandedNodeIndexes.has(nodeIndex) && !occupiedNodeIndexes.has(nodeIndex) && !safetyNodeIsInWall(layer, nodeX, nodeY + 1)) {
               expandedNodeIndexes.add(nodeIndex);
               addedNodes.add(nodeIndex);
               safety += getExtendedNodeSafety(buildingLayer, nodeIndex, extendDist);
            }
         }
   
         // Right
         if (nodeX < Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1) {
            const nodeIndex = getSafetyNode(nodeX + 1, nodeY);
            if (!expandedNodeIndexes.has(nodeIndex) && !occupiedNodeIndexes.has(nodeIndex) && !safetyNodeIsInWall(layer, nodeX + 1, nodeY)) {
               expandedNodeIndexes.add(nodeIndex);
               addedNodes.add(nodeIndex);
               safety += getExtendedNodeSafety(buildingLayer, nodeIndex, extendDist);
            }
         }
   
         // Bottom
         if (nodeY > 0) {
            const nodeIndex = getSafetyNode(nodeX, nodeY - 1);
            if (!expandedNodeIndexes.has(nodeIndex) && !occupiedNodeIndexes.has(nodeIndex) && !safetyNodeIsInWall(layer, nodeX, nodeY - 1)) {
               expandedNodeIndexes.add(nodeIndex);
               addedNodes.add(nodeIndex);
               safety += getExtendedNodeSafety(buildingLayer, nodeIndex, extendDist);
            }
         }
   
         // Left
         if (nodeX > 0) {
            const nodeIndex = getSafetyNode(nodeX - 1, nodeY);
            if (!expandedNodeIndexes.has(nodeIndex) && !occupiedNodeIndexes.has(nodeIndex) && !safetyNodeIsInWall(layer, nodeX - 1, nodeY)) {
               expandedNodeIndexes.add(nodeIndex);
               addedNodes.add(nodeIndex);
               safety += getExtendedNodeSafety(buildingLayer, nodeIndex, extendDist);
            }
         }
      }

      previousOuterNodes = addedNodes;
   }

   // Average the safety
   safety /= expandedNodeIndexes.size;
   
   return safety;
}

const getMinBuildingNodeSafety = (buildingLayer: TribeBuildingLayer, occupiedIndexes: Set<SafetyNode>): number => {
   let minSafety = Number.MAX_SAFE_INTEGER;
   for (const nodeIndex of occupiedIndexes) {
      const safety = buildingLayer.safetyRecord[nodeIndex];
      if (safety < minSafety) {
         minSafety = safety;
      }
   }

   return minSafety;
}

const getAverageBuildingNodeSafety = (buildingLayer: TribeBuildingLayer, occupiedIndexes: Set<SafetyNode>): number => {
   let averageSafety = 0;
   for (const nodeIndex of occupiedIndexes) {
      if (buildingLayer.safetyRecord[nodeIndex] === undefined) {
         throw new Error("Node wasn't in safety record");
      }

      const safety = buildingLayer.safetyRecord[nodeIndex];
      averageSafety += safety;
   }

   if (averageSafety < 0) {
      averageSafety = 0;
   }
   return averageSafety / occupiedIndexes.size;
}

export function getBuildingSafety(tribe: Tribe, virtualBuilding: VirtualStructure, safetyInfo: PotentialPlanSafetyData | null): number {
   const entityType = virtualBuilding.entityType as InfrastructureBuildingType;
   if (typeof BASE_BUILDING_WEIGHTS[entityType] === "undefined") {
      throw new Error("Base building weight not defined for entity type " + EntityTypeString[entityType]);
   }
   
   const buildingLayer = tribe.buildingLayers[virtualBuilding.layer.depth];
   
   let safety = 0;
   if (isNaN(safety)) {
      throw new Error();
   }

   let minSafety = getMinBuildingNodeSafety(buildingLayer, virtualBuilding.occupiedNodes);
   minSafety *= Vars.MIN_SAFETY_WEIGHT;
   safety += minSafety;
   if (isNaN(safety)) {
      throw new Error();
   }

   let averageSafety = getAverageBuildingNodeSafety(buildingLayer, virtualBuilding.occupiedNodes);
   averageSafety *= Vars.AVERAGE_SAFETY_WEIGHT;
   safety += averageSafety;
   if (isNaN(safety)) {
      throw new Error();
   }

   let extendedAverageSafety = getExtendedBuildingNodeSafety(buildingLayer, virtualBuilding.occupiedNodes);
   extendedAverageSafety *= Vars.AVERAGE_SAFETY_WEIGHT;
   safety += extendedAverageSafety;
   if (isNaN(safety)) {
      throw new Error();
   }

   safety = Math.log1p(safety / Vars.LN_SCALE_FACTOR) * Vars.LN_SCALE_FACTOR;
   if (isNaN(safety)) {
      throw new Error();
   }
   
   safety *= BASE_BUILDING_WEIGHTS[entityType];

   if (safetyInfo !== null) {
      safetyInfo.buildingTypes.push(entityType);
      // @Incomplete
      // safetyInfo.buildingIDs.push(building);
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
   
   for (const virtualBuilding of tribe.virtualStructures) {
      if (!buildingIsInfrastructure(virtualBuilding.entityType)) {
         continue;
      }

      const buildingSafety = getBuildingSafety(tribe, virtualBuilding, safetyInfo);
      safety += buildingSafety;
   }

   return {
      safety: safety,
      safetyInfo: safetyInfo
   };
}

export function tribeIsVulnerable(tribe: Tribe): boolean {
   for (const virtualBuilding of tribe.virtualStructures) {
      if (!buildingIsInfrastructure(virtualBuilding.entityType)) {
         continue;
      }

      const buildingLayer = tribe.buildingLayers[virtualBuilding.layer.depth];
      
      const minSafety = getMinBuildingNodeSafety(buildingLayer, virtualBuilding.occupiedNodes);
      if (minSafety < Vars.DESIRED_SAFETY) {
         return true;
      }
   }

   return false;
}
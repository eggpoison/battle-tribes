import { SafetyNodeData, PotentialPlanSafetyData, WallSideNodeData, TribeWallData, WallConnectionData } from "battletribes-shared/ai-building-types";
import { VisibleChunkBounds, RestrictedBuildingAreaData } from "battletribes-shared/client-server-types";
import { EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { AIPlanType } from "battletribes-shared/utils";
import Layer from "../../Layer";
import Tribe from "../../Tribe";
import { SafetyNode, getSafetyNode } from "../ai-building";
import { buildingIsInfrastructure, getBuildingSafety } from "../ai-building-heuristics";
import { TribeComponentArray } from "../../components/TribeComponent";
import { VirtualStructure, VirtualWall } from "./TribeBuildingLayer";
import { AICraftRecipePlan, AIGatherItemPlan, AIPlaceBuildingPlan, AITechCompletePlan, AITechItemPlan, AITechStudyPlan, AIUpgradeBuildingPlan, AIPlanAssignment } from "../tribesman-ai-planning";
import { Packet } from "../../../../shared/src/packets";
import { CRAFTING_RECIPES } from "../../../../shared/src/items/crafting-recipes";
import PlayerClient from "../../server/PlayerClient";
import { getTribes } from "../../world";
import { AIAssignmentComponentArray } from "../../components/AIAssignmentComponent";

// @Cleanup: should this be here?
export function getVisibleTribes(playerLayer: Layer, chunkBounds: VisibleChunkBounds): ReadonlyArray<Tribe> {
   // Calculate visible tribes
   const visibleTribes = new Array<Tribe>();
   for (let chunkX = chunkBounds[0]; chunkX <= chunkBounds[1]; chunkX++) {
      for (let chunkY = chunkBounds[2]; chunkY <= chunkBounds[3]; chunkY++) {
         const chunk = playerLayer.getChunk(chunkX, chunkY);
         for (let i = 0; i < chunk.entities.length; i++) {
            const entity = chunk.entities[i];
            if (TribeComponentArray.hasComponent(entity)) {
               const tribeComponent = TribeComponentArray.getComponent(entity);
               if (visibleTribes.indexOf(tribeComponent.tribe) === -1) {
                  visibleTribes.push(tribeComponent.tribe);
               }
            }
         }
      }
   }
   return visibleTribes;
}

export function getVisibleSafetyNodesData(playerClient: PlayerClient): ReadonlyArray<SafetyNodeData> {
   const tribes = getTribes();

   const minNodeX = Math.floor(playerClient.minVisibleX / Settings.SAFETY_NODE_SEPARATION);
   const maxNodeX = Math.floor(playerClient.maxVisibleX / Settings.SAFETY_NODE_SEPARATION);
   const minNodeY = Math.floor(playerClient.minVisibleY / Settings.SAFETY_NODE_SEPARATION);
   const maxNodeY = Math.floor(playerClient.maxVisibleY / Settings.SAFETY_NODE_SEPARATION);
   
   const safetyNodesData = new Array<SafetyNodeData>();
   for (const tribe of tribes) {
      const buildingLayer = tribe.buildingLayers[playerClient.lastLayer.depth];

      for (let nodeX = minNodeX; nodeX <= maxNodeX; nodeX++) {
         for (let nodeY = minNodeY; nodeY <= maxNodeY; nodeY++) {
            const nodeIndex = getSafetyNode(nodeX, nodeY);

            const safety = buildingLayer.safetyRecord[nodeIndex];
            if (safety === undefined) {
               continue;
            }

            // Check if the node is contained
            let isContained = false;
            for (let i = 0; i < buildingLayer.rooms.length; i++) {
               const area = buildingLayer.rooms[i];
               if (area.containedNodes.has(nodeIndex)) {
                  isContained = true;
                  break;
               }
            }
            
            safetyNodesData.push({
               index: nodeIndex,
               safety: safety,
               isOccupied: buildingLayer.occupiedSafetyNodes.has(nodeIndex),
               isContained: isContained
            });
         }
      }
   }

   return safetyNodesData;
}

// const getTribePotentialBuildingPlans = (plan: AIPlan, chunkBounds: VisibleChunkBounds): ReadonlyArray<PotentialBuildingPlanData> => {
//    const potentialPlansData = new Array<PotentialBuildingPlanData>();
//    for (let i = 0; i < plan.potentialPlans.length; i++) {
//       const potentialPlanData = plan.potentialPlans[i];
   
//       // @Incomplete: filter out potential plans which aren't visible
      
//       potentialPlansData.push(potentialPlanData);
//    }

//    return potentialPlansData;
// }

// const addVisibleAssignmentsRecursively = (assignment: AIPlanAssignment, chunkBounds: VisibleChunkBounds, buildingPlansData: Array<BuildingPlanData>): void => {
//    const plan = assignment.plan;
   
//    let planPosition: Point;
//    let planRotation: number;
//    let entityType: EntityType;
//    switch (plan.type) {
//       case AIPlanType.placeBuilding: {               
//          planPosition = plan.virtualBuilding.position;
//          planRotation = plan.virtualBuilding.rotation;
//          entityType = plan.virtualBuilding.entityType;
//          break;
//       }
//       case AIPlanType.upgradeBuilding: {
//          const building = plan.baseBuildingID;
         
//          const buildingTransformComponent = TransformComponentArray.getComponent(building);
         
//          planPosition = buildingTransformComponent.position;
//          planRotation = plan.rotation;
//          entityType = plan.entityType;
//          break;
//       }
//       default: {
//          return;
//       }
//    }
   
//    // @Cleanup: hardcoded
//    const minChunkX = Math.max(Math.floor((planPosition.x - 800) / Settings.CHUNK_UNITS), 0);
//    const maxChunkX = Math.min(Math.floor((planPosition.x + 800) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);
//    const minChunkY = Math.max(Math.floor((planPosition.y - 800) / Settings.CHUNK_UNITS), 0);
//    const maxChunkY = Math.min(Math.floor((planPosition.y + 800) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);

//    if (minChunkX <= chunkBounds[1] && maxChunkX >= chunkBounds[0] && minChunkY <= chunkBounds[3] && maxChunkY >= chunkBounds[2]) {
//       buildingPlansData.push({
//          x: planPosition.x,
//          y: planPosition.y,
//          rotation: planRotation,
//          entityType: entityType,
//          potentialBuildingPlans: getTribePotentialBuildingPlans(plan, chunkBounds),
//          assignedTribesmanID: assignment.assignedEntity || -1
//       });
//    }

//    for (const childAssignment of assignment.children) {
//       addVisibleAssignmentsRecursively(childAssignment, chunkBounds, buildingPlansData);
//    }
// }

// export function getVisibleBuildingPlans(visibleTribes: ReadonlyArray<Tribe>, chunkBounds: VisibleChunkBounds): ReadonlyArray<BuildingPlanData> {
//    const buildingPlansData = new Array<BuildingPlanData>();
//    for (let i = 0; i < visibleTribes.length; i++) {
//       const tribe = visibleTribes[i];

//       addVisibleAssignmentsRecursively(tribe.assignment, chunkBounds, buildingPlansData);
//    }

//    return buildingPlansData;
// }

const virtualStructureIsSentToPlayer = (playerClient: PlayerClient, virtualBuilding: VirtualStructure): boolean => {
   // Only send infrastructure buildings
   if (!buildingIsInfrastructure(virtualBuilding.entityType)) {
      return false;
   }
   
   // @Speed
   let minX = Number.MAX_SAFE_INTEGER;
   let maxX = Number.MIN_SAFE_INTEGER;
   let minY = Number.MAX_SAFE_INTEGER;
   let maxY = Number.MIN_SAFE_INTEGER;
   for (const box of virtualBuilding.boxes) {
      const boxMinX = box.calculateBoundsMinX();
      const boxMaxX = box.calculateBoundsMaxX();
      const boxMinY = box.calculateBoundsMinY();
      const boxMaxY = box.calculateBoundsMaxY();
      
      if (boxMinX < minX) {
         minX = boxMinX;
      }
      if (boxMaxX < maxX) {
         maxX = boxMaxX;
      }
      if (boxMinY < minY) {
         minY = boxMinY;
      }
      if (boxMaxY < maxY) {
         maxY = boxMaxY;
      }
   }
   
   return maxX >= playerClient.minVisibleX && minX <= playerClient.maxVisibleX && maxY >= playerClient.minVisibleY && minY <= playerClient.maxVisibleY;
}

export function getTribeBuildingSafetyDataLength(playerClient: PlayerClient): number {
   const virtualStructures = playerClient.tribe.virtualStructures;
   
   let lengthBytes = Float32Array.BYTES_PER_ELEMENT;
   for (const virtualStructure of virtualStructures) {
      if (!virtualStructureIsSentToPlayer(playerClient, virtualStructure)) {
         continue;
      }

      lengthBytes += 6 * Float32Array.BYTES_PER_ELEMENT;
   }
   return lengthBytes;
}

export function addTribeBuildingSafetyData(packet: Packet, playerClient: PlayerClient): void {
   const virtualStructures = playerClient.tribe.virtualStructures;

   let numRelevantBuildings = 0;
   for (const virtualBuilding of virtualStructures) {
      if (virtualStructureIsSentToPlayer(playerClient, virtualBuilding)) {
         numRelevantBuildings++;
      }
   }
   
   packet.writeNumber(numRelevantBuildings);
   for (const virtualBuilding of virtualStructures) {
      if (!virtualStructureIsSentToPlayer(playerClient, virtualBuilding)) {
         continue;
      }
      // @Incomplete: filter out nodes which aren't in the chunk bounds

      // @Speed: Garbage collection
      const safetyInfo: PotentialPlanSafetyData = {
         buildingTypes: [],
         buildingIDs: [],
         buildingMinSafetys: [],
         buildingAverageSafetys: [],
         buildingExtendedAverageSafetys: [],
         buildingResultingSafetys: []
      };
      getBuildingSafety(playerClient.tribe, virtualBuilding, safetyInfo);

      packet.writeNumber(virtualBuilding.position.x);
      packet.writeNumber(virtualBuilding.position.y);
      packet.writeNumber(safetyInfo.buildingMinSafetys[0]);
      packet.writeNumber(safetyInfo.buildingAverageSafetys[0]);
      packet.writeNumber(safetyInfo.buildingExtendedAverageSafetys[0]);
      packet.writeNumber(safetyInfo.buildingResultingSafetys[0]);
   }
}

export function getVisibleRestrictedBuildingAreas(visibleTribes: ReadonlyArray<Tribe>, chunkBounds: VisibleChunkBounds): ReadonlyArray<RestrictedBuildingAreaData> {
   const restrictedAreasData = new Array<RestrictedBuildingAreaData>();
   for (let i = 0; i < visibleTribes.length; i++) {
      const tribe = visibleTribes[i];

      for (const virtualBuilding of tribe.virtualStructures) {
         for (const restrictedArea of virtualBuilding.restrictedBuildingAreas) {
            // @Incomplete: filter out areas which aren't in the chunk bounds
   
            restrictedAreasData.push({
               x: restrictedArea.position.x,
               y: restrictedArea.position.y,
               rotation: restrictedArea.rotation,
               width: restrictedArea.width,
               height: restrictedArea.height
            });
         }
      }
   }

   return restrictedAreasData;
}

const getWallSideNodeData = (nodeIndex: SafetyNode, side: number): WallSideNodeData => {
   return {
      nodeIndex: nodeIndex,
      side: side
   };
}

export function getVisibleWallsData(playerLayer: Layer, visibleTribes: ReadonlyArray<Tribe>, chunkBounds: VisibleChunkBounds): ReadonlyArray<TribeWallData> {
   const wallDataArray = new Array<TribeWallData>();
   for (let i = 0; i < visibleTribes.length; i++) {
      const tribe = visibleTribes[i];
      const buildingLayer = tribe.buildingLayers[playerLayer.depth];

      // @Incomplete: filter out areas which aren't in the chunk bounds
      // @Hack: cast
      for (const wall of buildingLayer.virtualStructuresByEntityType[EntityType.wall] as Array<VirtualWall>) {
         const topSideNodes = wall.topSideNodes.map(nodeIndex => getWallSideNodeData(nodeIndex, 0));
         const rightSideNodes = wall.rightSideNodes.map(nodeIndex => getWallSideNodeData(nodeIndex, 1));
         const bottomSideNodes = wall.bottomSideNodes.map(nodeIndex => getWallSideNodeData(nodeIndex, 2));
         const leftSideNodes = wall.leftSideNodes.map(nodeIndex => getWallSideNodeData(nodeIndex, 3));

         wallDataArray.push({
            wallID: wall.id,
            topSideNodes: topSideNodes,
            rightSideNodes: rightSideNodes,
            bottomSideNodes: bottomSideNodes,
            leftSideNodes: leftSideNodes
         });
      }
   }

   return wallDataArray;
}

export function getVisibleWallConnections(playerLayer: Layer, visibleTribes: ReadonlyArray<Tribe>, chunkBounds: VisibleChunkBounds): ReadonlyArray<WallConnectionData> {
   const connectionsData = new Array<WallConnectionData>();
   for (let i = 0; i < visibleTribes.length; i++) {
      const tribe = visibleTribes[i];
      const buildingLayer = tribe.buildingLayers[playerLayer.depth];

      // @Hack: cast
      for (const wall of buildingLayer.virtualStructuresByEntityType[EntityType.wall] as Array<VirtualWall>) {
         // @Incomplete: filter out nodes which aren't in the chunk bounds

         if (wall.connectionBitset & 0b0001) {
            connectionsData.push({
               x: wall.position.x + 24 * Math.sin(wall.rotation),
               y: wall.position.y + 24 * Math.cos(wall.rotation),
               rotation: wall.rotation
            });
         }
         if (wall.connectionBitset & 0b0010) {
            connectionsData.push({
               x: wall.position.x + 24 * Math.sin(wall.rotation + Math.PI/2),
               y: wall.position.y + 24 * Math.cos(wall.rotation + Math.PI/2),
               rotation: wall.rotation + Math.PI/2
            });
         }
         if (wall.connectionBitset & 0b0100) {
            connectionsData.push({
               x: wall.position.x + 24 * Math.sin(wall.rotation + Math.PI),
               y: wall.position.y + 24 * Math.cos(wall.rotation + Math.PI),
               rotation: wall.rotation + Math.PI
            });
         }
         if (wall.connectionBitset & 0b1000) {
            connectionsData.push({
               x: wall.position.x + 24 * Math.sin(wall.rotation + Math.PI*3/2),
               y: wall.position.y + 24 * Math.cos(wall.rotation + Math.PI*3/2),
               rotation: wall.rotation + Math.PI*3/2
            });
         }
      }
   }

   return connectionsData;
}

const addBaseAssignmentData = (packet: Packet, assignment: AIPlanAssignment): void => {
   packet.writeNumber(assignment.plan.type);
   packet.writeNumber(assignment.assignedEntity !== null ? assignment.assignedEntity : 0);
   packet.writeBool(assignment.plan.isComplete);
   packet.writeBool(assignment.plan.isCompletable);
}
const getBasePlanDataLength = (): number => {
   return 4 * Float32Array.BYTES_PER_ELEMENT;
}

const addCraftRecipePlanData = (packet: Packet, plan: AICraftRecipePlan): void => {
   // @Speed
   packet.writeNumber(CRAFTING_RECIPES.indexOf(plan.recipe));
   packet.writeNumber(plan.productAmount);
}
const getCraftRecipePlanDataLength = (): number => {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

const addPlaceBuildingPlanData = (packet: Packet, plan: AIPlaceBuildingPlan): void => {
   packet.writeNumber(plan.virtualBuilding.entityType);
}
const getPlaceBuildingPlanDataLength = (): number => {
   return 1 * Float32Array.BYTES_PER_ELEMENT;
}

const addUpgradeBuildingPlanData = (packet: Packet, plan: AIUpgradeBuildingPlan): void => {
   packet.writeNumber(plan.blueprintType);
}
const getUpgradeBuildingPlanDataLength = (): number => {
   return 1 * Float32Array.BYTES_PER_ELEMENT;
}

const addTechStudyPlanData = (packet: Packet, plan: AITechStudyPlan): void => {
   packet.writeNumber(plan.tech.id);
}
const getTechStudyPlanDataLength = (): number => {
   return 1 * Float32Array.BYTES_PER_ELEMENT;
}

const addTechItemPlanData = (packet: Packet, plan: AITechItemPlan): void => {
   packet.writeNumber(plan.tech.id);
   packet.writeNumber(plan.itemType);
}
const getTechItemPlanDataLength = (): number => {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

const addTechCompletePlanData = (packet: Packet, plan: AITechCompletePlan): void => {
   packet.writeNumber(plan.tech.id);
}
const getTechCompletePlanDataLength = (): number => {
   return 1 * Float32Array.BYTES_PER_ELEMENT;
}

const addGatherItemPlanData = (packet: Packet, plan: AIGatherItemPlan): void => {
   packet.writeNumber(plan.itemType);
   packet.writeNumber(plan.amount);
}
const getGatherItemPlanDataLength = (): number => {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

const addAssignmentData = (packet: Packet, assignment: AIPlanAssignment): void => {
   const plan = assignment.plan;
   
   // Add data for the plan
   addBaseAssignmentData(packet, assignment);
   switch (plan.type) {
      case AIPlanType.craftRecipe:     addCraftRecipePlanData(packet, plan); break;
      case AIPlanType.placeBuilding:   addPlaceBuildingPlanData(packet, plan); break;
      case AIPlanType.upgradeBuilding: addUpgradeBuildingPlanData(packet, plan); break;
      case AIPlanType.doTechStudy:     addTechStudyPlanData(packet, plan); break;
      case AIPlanType.doTechItems:     addTechItemPlanData(packet, plan); break;
      case AIPlanType.completeTech:    addTechCompletePlanData(packet, plan); break;
      case AIPlanType.gatherItem:      addGatherItemPlanData(packet, plan); break;
   }

   packet.writeNumber(assignment.children.length);
   for (const childAssignment of assignment.children) {
      addAssignmentData(packet, childAssignment);
   }
}

const getAssignmentDataLength = (assignment: AIPlanAssignment): number => {
   let dataLength = getBasePlanDataLength();
   switch (assignment.plan.type) {
      case AIPlanType.craftRecipe:     dataLength += getCraftRecipePlanDataLength(); break;
      case AIPlanType.placeBuilding:   dataLength += getPlaceBuildingPlanDataLength(); break;
      case AIPlanType.upgradeBuilding: dataLength += getUpgradeBuildingPlanDataLength(); break;
      case AIPlanType.doTechStudy:     dataLength += getTechStudyPlanDataLength(); break;
      case AIPlanType.doTechItems:     dataLength += getTechItemPlanDataLength(); break;
      case AIPlanType.completeTech:    dataLength += getTechCompletePlanDataLength(); break;
      case AIPlanType.gatherItem:      dataLength += getGatherItemPlanDataLength(); break;
   }
   
   dataLength += Float32Array.BYTES_PER_ELEMENT;
   for (const childAssignment of assignment.children) {
      dataLength += getAssignmentDataLength(childAssignment);
   }

   return dataLength;
}

export function addTribeAssignmentData(packet: Packet, tribe: Tribe): void {
   // Tribe assignment
   addAssignmentData(packet, tribe.rootAssignment);

   // @Speed @Hack
   let numEntitiesWithAIAssignmentComponent = 0;
   for (const tribesman of tribe.entities) {
      if (AIAssignmentComponentArray.hasComponent(tribesman)) {
         const aiAssignmentComponent = AIAssignmentComponentArray.getComponent(tribesman);
         if (aiAssignmentComponent.wholeAssignment !== null) {
            numEntitiesWithAIAssignmentComponent++;
         }
      }
   }

   // Tribesman assignments
   packet.writeNumber(numEntitiesWithAIAssignmentComponent);
   // @Incomplete: won't account for cogwalkers
   for (let i = 0; i < tribe.entities.length; i++) {
      const tribesman = tribe.entities[i];
      
      if (AIAssignmentComponentArray.hasComponent(tribesman)) {
         const aiAssignmentComponent = AIAssignmentComponentArray.getComponent(tribesman);
         if (aiAssignmentComponent.wholeAssignment !== null) {
            packet.writeNumber(tribesman);
            addAssignmentData(packet, aiAssignmentComponent.wholeAssignment);
         }
      }
   }
}

export function getTribeAssignmentDataLength(tribe: Tribe): number {
   // Tribe assignment
   let lengthBytes = getAssignmentDataLength(tribe.rootAssignment);

   // Tribesman assignments
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   // @Incomplete: won't account for cogwalkers
   for (let i = 0; i < tribe.entities.length; i++) {
      const tribesman = tribe.entities[i];
      
      if (AIAssignmentComponentArray.hasComponent(tribesman)) {
         const aiAssignmentComponent = AIAssignmentComponentArray.getComponent(tribesman);
         if (aiAssignmentComponent.wholeAssignment !== null) {
            lengthBytes += Float32Array.BYTES_PER_ELEMENT;
            lengthBytes += getAssignmentDataLength(aiAssignmentComponent.wholeAssignment);
         }
      }
   }

   return lengthBytes;
}
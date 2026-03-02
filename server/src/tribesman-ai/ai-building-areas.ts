import { PotentialBuildingPlanData } from "battletribes-shared/ai-building-types";
import { BlueprintType } from "battletribes-shared/components";
import { EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { SafetyNode, getSafetyNode } from "./ai-building";
import TribeBuildingLayer, { TribeDoorType, VirtualStructure, VirtualDoor, VirtualWall } from "./building-plans/TribeBuildingLayer";
import { createUpgradeBuildingPlanAssignment, AIPlanAssignment, AIUpgradeBuildingPlan } from "./tribesman-ai-planning";

export interface TribeRoom {
   readonly containedNodes: Set<SafetyNode>;
   readonly connectedWalls: ReadonlyArray<VirtualWall>;
   readonly connectedDoors: ReadonlyArray<VirtualDoor>;
}

const getRoundedSafetyNode = (nodeX: number, nodeY: number): number => {
   return getSafetyNode(Math.round(nodeX), Math.round(nodeY));
}

const getDoorType = (buildingLayer: TribeBuildingLayer, door: VirtualStructure): TribeDoorType => {
   // If any of the top or bottom nodes are not in an area, then the door leads outside

   const topNodeOffsetX = Math.sin(door.rotation);
   const topNodeOffsetY = Math.cos(door.rotation);
   const bottomNodeOffsetX = Math.sin(door.rotation + Math.PI);
   const bottomNodeOffsetY = Math.cos(door.rotation + Math.PI);

   for (const node of door.occupiedNodes) {
      const nodeX = node % Settings.SAFETY_NODES_IN_WORLD_WIDTH;
      const nodeY = Math.floor(node / Settings.SAFETY_NODES_IN_WORLD_WIDTH);

      // Top
      if (nodeY < Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1) {
         const node = getRoundedSafetyNode(nodeX + topNodeOffsetX, nodeY + topNodeOffsetY);
         if (!door.occupiedNodes.has(node) && buildingLayer.nodeToRoomRecord[node] === undefined) {
            return TribeDoorType.outside;
         }
      }

      // Bottom
      if (nodeY > 0) {
         const node = getRoundedSafetyNode(nodeX + bottomNodeOffsetX, nodeY + bottomNodeOffsetY);
         if (!door.occupiedNodes.has(node) && buildingLayer.nodeToRoomRecord[node] === undefined) {
            return TribeDoorType.outside;
         }
      }
   }

   return TribeDoorType.enclosed;
}

export function createTribeArea(buildingLayer: TribeBuildingLayer, nodes: Set<SafetyNode>, encounteredOccupiedNodeIndexes: Set<SafetyNode>): TribeRoom {
   const connectedDoors = new Array<VirtualDoor>();
   const connectedWalls = new Array<VirtualWall>();
   const seenBuildingIDs = new Set<SafetyNode>();

   // @Incomplete
   for (const nodeIndex of encounteredOccupiedNodeIndexes) {
      const virtualBuildingIDs = buildingLayer.occupiedNodeToVirtualStructureIDRecord[nodeIndex];
      if (virtualBuildingIDs === undefined) {
         continue;
      }
      
      for (let i = 0; i < virtualBuildingIDs.length; i++) {
         const buildingID = virtualBuildingIDs[i];
         if (seenBuildingIDs.has(buildingID)) {
            continue;
         }
         seenBuildingIDs.add(buildingID);
         
         const virtualBuilding = buildingLayer.virtualStructureRecord[buildingID];
         switch (virtualBuilding.entityType) {
            case EntityType.wall: {
               connectedWalls.push(virtualBuilding);
               break;
            }
            case EntityType.door: {
               connectedDoors.push(virtualBuilding);
               break;
            }
         }
      }
   }

   return {
      containedNodes: nodes,
      connectedWalls: connectedWalls,
      connectedDoors: connectedDoors
   };
}

export function updateTribeAreaDoors(buildingLayer: TribeBuildingLayer): void {
   for (const room of buildingLayer.rooms) {
      for (const door of room.connectedDoors) {
         door.doorType = getDoorType(buildingLayer, door);
      }
   }
}

export function areaHasOutsideDoor(area: TribeRoom): boolean {
   for (let i = 0; i < area.connectedDoors.length; i++) {
      const door = area.connectedDoors[i];
      if (door.doorType === TribeDoorType.outside) {
         return true;
      }
   }
   return false;
}

const sidesFormValidOutsideDoor = (buildingLayer: TribeBuildingLayer, room: TribeRoom, innerSideNodes: Array<SafetyNode>, outerSideNodes: Array<SafetyNode>): boolean => {
   // Make sure the inner nodes are all in the area and aren't occupied
   // Skip the first and last side nodes so that U-type wall structures can create walls
   for (let i = 1; i < innerSideNodes.length - 1; i++) {
      const nodeIndex = innerSideNodes[i];
      if (buildingLayer.occupiedSafetyNodes.has(nodeIndex) || !room.containedNodes.has(nodeIndex)) {
         return false;
      }
   }
   
   // Make sure all the outer nodes aren't occupied
   for (let i = 0; i < outerSideNodes.length; i++) {
      const nodeIndex = outerSideNodes[i];
      if (buildingLayer.occupiedSafetyNodes.has(nodeIndex)) {
         return false;
      }
   }
   
   return true;
}

export function getOutsideDoorPlacePlan(buildingLayer: TribeBuildingLayer, room: TribeRoom): AIPlanAssignment<AIUpgradeBuildingPlan> | null {
   let assignment: AIPlanAssignment<AIUpgradeBuildingPlan> | null = null;
   const potentialPlans = new Array<PotentialBuildingPlanData>();   
   
   for (const wall of room.connectedWalls) {
      // Make sure it has one side fully in the area, and the opposite side fully outside.
      let doorRotation: number;
      if (sidesFormValidOutsideDoor(buildingLayer, room, wall.topSideNodes, wall.bottomSideNodes) && (wall.connectionBitset & 0b1000) !== 0 && (wall.connectionBitset & 0b0010) !== 0) {
         doorRotation = wall.rotation;
      } else if (sidesFormValidOutsideDoor(buildingLayer, room, wall.rightSideNodes, wall.leftSideNodes) && (wall.connectionBitset & 0b0100) !== 0 && (wall.connectionBitset & 0b0001) !== 0) {
         doorRotation = wall.rotation + Math.PI/2;
      } else if (sidesFormValidOutsideDoor(buildingLayer, room, wall.bottomSideNodes, wall.topSideNodes) && (wall.connectionBitset & 0b1000) !== 0 && (wall.connectionBitset & 0b0010) !== 0) {
         doorRotation = wall.rotation + Math.PI;
      } else if (sidesFormValidOutsideDoor(buildingLayer, room, wall.leftSideNodes, wall.rightSideNodes) && (wall.connectionBitset & 0b0100) !== 0 && (wall.connectionBitset & 0b0001) !== 0) {
         doorRotation = wall.rotation + Math.PI*3/2;
      } else {
         continue;
      }

      // @Incomplete: Make sure the door's restricted areas wouldn't be occupied if it were placed
      
      potentialPlans.push({
         x: wall.position.x,
         y: wall.position.y,
         rotation: doorRotation,
         entityType: EntityType.door,
         safety: 0,
         safetyData: {
            buildingTypes: [],
            buildingIDs: [],
            buildingMinSafetys: [],
            buildingAverageSafetys: [],
            buildingExtendedAverageSafetys: [],
            buildingResultingSafetys: []
         }
      });

      // @Cleanup: probs should be done in the tribesman-ai-olanning file
      assignment = createUpgradeBuildingPlanAssignment([], true, wall.id, doorRotation, BlueprintType.woodenDoor, EntityType.door);
      break;
   }

   // @Incomplete?
   // if (assignment !== null) {
   //    assignment.plan.potentialPlans = potentialPlans;
   // }

   return assignment;
}
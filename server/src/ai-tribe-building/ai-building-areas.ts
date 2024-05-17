import { PotentialBuildingPlanData } from "webgl-test-shared/dist/ai-building-types";
import { BlueprintType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import Tribe, { BuildingPlanType, BuildingUpgradePlan, VirtualBuilding } from "../Tribe";
import { SafetyNode, getSafetyNode, placeVirtualBuilding } from "./ai-building";

export const enum TribeDoorType {
   outside,
   enclosed
}

export interface TribeDoorInfo {
   readonly door: VirtualBuilding;
   doorType: TribeDoorType;
}

export interface TribeArea {
   readonly id: number;
   readonly containedNodes: Set<SafetyNode>;
   readonly connectedWallIDs: ReadonlyArray<number>;
   readonly connectedDoors: ReadonlyArray<TribeDoorInfo>;
}

const getRoundedSafetyNode = (nodeX: number, nodeY: number): number => {
   return getSafetyNode(Math.round(nodeX), Math.round(nodeY));
}

const getDoorType = (tribe: Tribe, door: VirtualBuilding): TribeDoorType => {
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
         if (!door.occupiedNodes.has(node) && tribe.nodeToAreaIDRecord[node] === undefined) {
            return TribeDoorType.outside;
         }
      }

      // Bottom
      if (nodeY > 0) {
         const node = getRoundedSafetyNode(nodeX + bottomNodeOffsetX, nodeY + bottomNodeOffsetY);
         if (!door.occupiedNodes.has(node) && tribe.nodeToAreaIDRecord[node] === undefined) {
            return TribeDoorType.outside;
         }
      }
   }

   return TribeDoorType.enclosed;
}

export function createTribeArea(tribe: Tribe, nodes: Set<SafetyNode>, id: number, encounteredOccupiedNodeIndexes: Set<SafetyNode>): TribeArea {
   const connectedWallIDs = new Array<number>();
   const connectedDoors = new Array<TribeDoorInfo>();
   const seenBuildingIDs = new Set<SafetyNode>();
   
   // @Incomplete
   for (const nodeIndex of encounteredOccupiedNodeIndexes) {
      const buildingIDs = tribe.occupiedNodeToEntityIDRecord[nodeIndex];
      if (buildingIDs === undefined) {
         continue;
      }
      
      for (let i = 0; i < buildingIDs.length; i++) {
         const buildingID = buildingIDs[i];
         if (seenBuildingIDs.has(buildingID)) {
            continue;
         }
         seenBuildingIDs.add(buildingID);
         
         const virtualBuilding = tribe.virtualBuildingRecord[buildingID];
         switch (virtualBuilding.entityType) {
            case EntityType.wall: {
               connectedWallIDs.push(buildingID);
               break;
            }
            case EntityType.door: {
               connectedDoors.push({
                  door: virtualBuilding,
                  // Default value until the actual door type gets calculated
                  doorType: TribeDoorType.enclosed
               });
               break;
            }
         }
      }
   }

   return {
      id: id,
      containedNodes: nodes,
      connectedWallIDs: connectedWallIDs,
      connectedDoors: connectedDoors
   };
}

export function updateTribeAreaDoors(tribe: Tribe): void {
   for (let i = 0; i < tribe.areas.length; i++) {
      const area = tribe.areas[i];

      for (let j = 0; j < area.connectedDoors.length; j++) {
         const doorInfo = area.connectedDoors[j];
         doorInfo.doorType = getDoorType(tribe, doorInfo.door);
      }
   }
}

export function areaHasOutsideDoor(area: TribeArea): boolean {
   for (let i = 0; i < area.connectedDoors.length; i++) {
      const door = area.connectedDoors[i];
      if (door.doorType === TribeDoorType.outside) {
         return true;
      }
   }
   return false;
}

const sidesFormValidOutsideDoor = (tribe: Tribe, area: TribeArea, innerSideNodes: Array<SafetyNode>, outerSideNodes: Array<SafetyNode>): boolean => {
   // Make sure the inner nodes are all in the area and aren't occupied
   // Skip the first and last side nodes so that U-type wall structures can create walls
   for (let i = 1; i < innerSideNodes.length - 1; i++) {
      const nodeIndex = innerSideNodes[i];
      if (tribe.occupiedSafetyNodes.has(nodeIndex) || !area.containedNodes.has(nodeIndex)) {
         return false;
      }
   }
   
   // Make sure all the outer nodes aren't occupied
   for (let i = 0; i < outerSideNodes.length; i++) {
      const nodeIndex = outerSideNodes[i];
      if (tribe.occupiedSafetyNodes.has(nodeIndex)) {
         return false;
      }
   }
   
   return true;
}

export function getOutsideDoorPlacePlan(tribe: Tribe, area: TribeArea): BuildingUpgradePlan | null {
   let plan: BuildingUpgradePlan | null = null;
   const potentialPlans = new Array<PotentialBuildingPlanData>();   
   
   for (let i = 0; i < area.connectedWallIDs.length; i++) {
      const wallID = area.connectedWallIDs[i];
      const wallInfo = tribe.wallInfoRecord[wallID];

      // Make sure it has one side fully in the area, and the opposite side fully outside.
      let doorRotation: number;
      if (sidesFormValidOutsideDoor(tribe, area, wallInfo.topSideNodes, wallInfo.bottomSideNodes) && (wallInfo.connectionBitset & 0b1000) !== 0 && (wallInfo.connectionBitset & 0b0010) !== 0) {
         doorRotation = wallInfo.wall.rotation;
      } else if (sidesFormValidOutsideDoor(tribe, area, wallInfo.rightSideNodes, wallInfo.leftSideNodes) && (wallInfo.connectionBitset & 0b0100) !== 0 && (wallInfo.connectionBitset & 0b0001) !== 0) {
         doorRotation = wallInfo.wall.rotation + Math.PI/2;
      } else if (sidesFormValidOutsideDoor(tribe, area, wallInfo.bottomSideNodes, wallInfo.topSideNodes) && (wallInfo.connectionBitset & 0b1000) !== 0 && (wallInfo.connectionBitset & 0b0010) !== 0) {
         doorRotation = wallInfo.wall.rotation + Math.PI;
      } else if (sidesFormValidOutsideDoor(tribe, area, wallInfo.leftSideNodes, wallInfo.rightSideNodes) && (wallInfo.connectionBitset & 0b0100) !== 0 && (wallInfo.connectionBitset & 0b0001) !== 0) {
         doorRotation = wallInfo.wall.rotation + Math.PI*3/2;
      } else {
         continue;
      }

      // @Incomplete: Make sure the door's restricted areas wouldn't be occupied if it were placed
   
      const virtualBuildingID = tribe.virtualEntityIDCounter++;
      const virtualBuilding = placeVirtualBuilding(tribe, wallInfo.wall.position, doorRotation, EntityType.door, virtualBuildingID);
   
      let isValidPosition = true;
      for (const node of virtualBuilding.occupiedNodes) {
         // If it's occupied by something other than the wall then it's a bad spot
         if (tribe.occupiedSafetyNodes.has(node)) {
            isValidPosition = false;
            break;
         }
      }
   
      tribe.removeVirtualBuilding(virtualBuildingID);

      if (!isValidPosition) {
         continue;
      }

      potentialPlans.push({
         x: wallInfo.wall.position.x,
         y: wallInfo.wall.position.y,
         rotation: doorRotation,
         buildingType: EntityType.door,
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

      plan = {
         type: BuildingPlanType.upgrade,
         baseBuildingID: wallInfo.wall.id,
         rotation: doorRotation,
         blueprintType: BlueprintType.woodenDoor,
         entityType: EntityType.door,
         assignedTribesmanID: 0,
         potentialPlans: []
      };
   }

   if (plan !== null) {
      plan.potentialPlans = potentialPlans;
   }

   return plan;
}
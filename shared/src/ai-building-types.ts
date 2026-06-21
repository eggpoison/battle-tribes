import { StructureType } from "./structures.js";

export interface SafetyNodeData {
   readonly index: number;
   readonly safety: number;
   readonly isOccupied: boolean;
   readonly isContained: boolean;
}

export interface PotentialPlanSafetyData {
   readonly buildingTypes: StructureType[];
   readonly buildingIDs: number[];
   readonly buildingMinSafetys: number[];
   readonly buildingAverageSafetys: number[];
   readonly buildingExtendedAverageSafetys: number[];
   readonly buildingResultingSafetys: number[];
}

export interface PotentialBuildingPlanData {
   readonly x: number;
   readonly y: number;
   readonly rotation: number;
   readonly entityType: StructureType;
   readonly safety: number;
   readonly safetyData: PotentialPlanSafetyData;
}

export interface BuildingPlanData {
   readonly x: number;
   readonly y: number;
   readonly rotation: number;
   readonly entityType: StructureType;
   readonly potentialBuildingPlans: readonly PotentialBuildingPlanData[];
   readonly assignedTribesmanID: number;
}

export interface WallSideNodeData {
   readonly nodeIndex: number;
   readonly side: number;
}

export interface TribeWallData {
   readonly wallID: number;
   // @Cleanup: merge into one array
   readonly topSideNodes: WallSideNodeData[];
   readonly rightSideNodes: WallSideNodeData[];
   readonly bottomSideNodes: WallSideNodeData[];
   readonly leftSideNodes: WallSideNodeData[];
}

export interface WallConnectionData {
   readonly x: number;
   readonly y: number;
   readonly rotation: number;
}
import { StructureType } from "./structures";

export interface SafetyNodeData {
   readonly index: number;
   readonly safety: number;
   readonly isOccupied: boolean;
   readonly isContained: boolean;
}

export interface PotentialPlanSafetyData {
   readonly buildingTypes: Array<StructureType>;
   readonly buildingIDs: Array<number>;
   readonly buildingMinSafetys: Array<number>;
   readonly buildingAverageSafetys: Array<number>;
   readonly buildingExtendedAverageSafetys: Array<number>;
   readonly buildingResultingSafetys: Array<number>;
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
   readonly potentialBuildingPlans: ReadonlyArray<PotentialBuildingPlanData>;
   readonly assignedTribesmanID: number;
}

export interface WallSideNodeData {
   readonly nodeIndex: number;
   readonly side: number;
}

export interface TribeWallData {
   readonly wallID: number;
   // @Cleanup: merge into one array
   readonly topSideNodes: Array<WallSideNodeData>;
   readonly rightSideNodes: Array<WallSideNodeData>;
   readonly bottomSideNodes: Array<WallSideNodeData>;
   readonly leftSideNodes: Array<WallSideNodeData>;
}

export interface WallConnectionData {
   readonly x: number;
   readonly y: number;
   readonly rotation: number;
}
import { EntityType } from "./entities";
import { Point } from "./utils";
export declare const STRUCTURE_TYPES: readonly [EntityType.wall, EntityType.door, EntityType.embrasure, EntityType.floorSpikes, EntityType.wallSpikes, EntityType.floorPunjiSticks, EntityType.wallPunjiSticks, EntityType.ballista, EntityType.slingTurret, EntityType.tunnel, EntityType.tribeTotem, EntityType.workerHut, EntityType.warriorHut, EntityType.barrel, EntityType.workbench, EntityType.researchBench, EntityType.healingTotem, EntityType.planterBox, EntityType.furnace, EntityType.campfire, EntityType.fence, EntityType.fenceGate];
export type StructureType = typeof STRUCTURE_TYPES[number];
type SnappedEntityIDs = [number, number, number, number];
export interface EntityInfo {
    readonly type: StructureType;
    readonly position: Readonly<Point>;
    readonly rotation: number;
    readonly id: number;
}
export interface StructurePlaceInfo {
    readonly x: number;
    readonly y: number;
    readonly rotation: number;
    readonly entityType: EntityType;
    readonly snappedSidesBitset: number;
    readonly snappedEntityIDs: Readonly<SnappedEntityIDs>;
}
export declare function getStructurePlaceInfo(snappableEntities: ReadonlyArray<EntityInfo>, placingEntityType: StructureType): StructurePlaceInfo | null;
export {};

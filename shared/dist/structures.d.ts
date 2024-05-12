import { EntityType } from "./entities";
import { Point } from "./utils";
export declare const STRUCTURE_TYPES: readonly [EntityType.wall, EntityType.door, EntityType.embrasure, EntityType.floorSpikes, EntityType.wallSpikes, EntityType.floorPunjiSticks, EntityType.wallPunjiSticks, EntityType.ballista, EntityType.slingTurret, EntityType.tunnel, EntityType.tribeTotem, EntityType.workerHut, EntityType.warriorHut, EntityType.barrel, EntityType.workbench, EntityType.researchBench, EntityType.healingTotem, EntityType.planterBox, EntityType.furnace, EntityType.campfire, EntityType.fence, EntityType.fenceGate];
export type StructureType = typeof STRUCTURE_TYPES[number];
type SnappedEntityIDs = [number, number, number, number];
export interface EntityInfo<T extends EntityType> {
    readonly type: T;
    readonly position: Readonly<Point>;
    readonly rotation: number;
    readonly id: number;
}
export interface ChunkInfo {
    readonly entities: Array<EntityInfo<EntityType>>;
}
export interface StructurePlaceInfo {
    readonly position: Point;
    readonly rotation: number;
    readonly entityType: StructureType;
    readonly snappedSidesBitset: number;
    readonly snappedEntityIDs: SnappedEntityIDs;
}
export declare function calculateStructurePlaceInfo(placeOrigin: Point, placingEntityRotation: number, structureType: StructureType, chunks: ReadonlyArray<Readonly<ChunkInfo>>): StructurePlaceInfo;
export {};

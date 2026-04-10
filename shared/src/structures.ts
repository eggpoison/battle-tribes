import { EntityType } from "./entities";

export const STRUCTURE_TYPES = [EntityType.wall, EntityType.door, EntityType.embrasure, EntityType.floorSpikes, EntityType.wallSpikes, EntityType.floorPunjiSticks, EntityType.wallPunjiSticks, EntityType.ballista, EntityType.slingTurret, EntityType.tunnel, EntityType.tribeTotem, EntityType.workerHut, EntityType.warriorHut, EntityType.barrel, EntityType.workbench, EntityType.researchBench, EntityType.healingTotem, EntityType.planterBox, EntityType.furnace, EntityType.campfire, EntityType.fence, EntityType.fenceGate, EntityType.frostshaper, EntityType.stonecarvingTable, EntityType.bracings, EntityType.fireTorch, EntityType.slurbTorch, EntityType.automatonAssembler, EntityType.mithrilAnvil, EntityType.floorSign] as const;
export type StructureType = typeof STRUCTURE_TYPES[number];

export function entityIsStructure(entityType: EntityType): entityType is StructureType {
   return STRUCTURE_TYPES.indexOf(entityType as StructureType) !== -1;
}
import { ChunkInfo, Chunks, EntityInfo, getChunk } from "./board-interface";
import { EntityType } from "./entities";
import { estimateCollidingEntities } from "./hitbox-collision";
import { Settings } from "./settings";
import { Point, distance, getAbsAngleDiff } from "./utils";

/*
When snapping:
- By default, use the snap rotation rounded closest to the place direction.
   - e.g. walls
- Except when placing something which attaches directly onto a structure, use the direction off that structure.
   - e.g. spikes
*/

const enum Vars {
   STRUCTURE_PLACE_DISTANCE = 60,
   MULTI_SNAP_POSITION_TOLERANCE = 0.1,
   MULTI_SNAP_ROTATION_TOLERANCE = 0.02
}

export const STRUCTURE_TYPES = [EntityType.wall, EntityType.door, EntityType.embrasure, EntityType.floorSpikes, EntityType.wallSpikes, EntityType.floorPunjiSticks, EntityType.wallPunjiSticks, EntityType.ballista, EntityType.slingTurret, EntityType.tunnel, EntityType.tribeTotem, EntityType.workerHut, EntityType.warriorHut, EntityType.barrel, EntityType.workbench, EntityType.researchBench, EntityType.healingTotem, EntityType.planterBox, EntityType.furnace, EntityType.campfire, EntityType.fence, EntityType.fenceGate, EntityType.frostshaper, EntityType.stonecarvingTable] as const;
export type StructureType = typeof STRUCTURE_TYPES[number];

export const enum SnapDirection {
   top,
   right,
   bottom,
   left
}

export type ConnectedEntityIDs = [number, number, number, number];

const enum SnapType {
   horizontal,
   vertical
}

interface StructureTransformInfo {
   readonly position: Point;
   readonly rotation: number;
   /** Direction from the structure being placed to the snap entity */
   readonly snapDirection: SnapDirection;
   readonly connectedEntityID: number;
}

export interface StructurePlaceInfo {
   readonly position: Point;
   readonly rotation: number;
   readonly entityType: StructureType;
   readonly connectedSidesBitset: number;
   readonly connectedEntityIDs: ConnectedEntityIDs;
   readonly isValid: boolean;
}

export interface StructureConnectionInfo {
   readonly connectedSidesBitset: number;
   readonly connectedEntityIDs: ConnectedEntityIDs;
}

export function createEmptyStructureConnectionInfo(): StructureConnectionInfo {
   return {
      connectedSidesBitset: 0,
      connectedEntityIDs: [0, 0, 0, 0]
   };
}

const getSnapOffset = (structureType: StructureType, snapType: SnapType): number => {
   switch (structureType) {
      case EntityType.tunnel:
      case EntityType.wall:
      case EntityType.door:
      case EntityType.embrasure: return 32;
      case EntityType.floorSpikes: return 28;
      case EntityType.wallSpikes: return snapType === SnapType.horizontal ? 28 : 14;
      case EntityType.floorPunjiSticks: return 28;
      case EntityType.wallPunjiSticks: return snapType === SnapType.horizontal ? 28 : 16;
      case EntityType.slingTurret: { return 40; }
      case EntityType.ballista: { return 50; }
      case EntityType.tribeTotem: return 60;
      case EntityType.workerHut: return 44;
      case EntityType.warriorHut: return 52;
      case EntityType.barrel: return 40;
      case EntityType.workbench: return 40;
      case EntityType.researchBench: return snapType === SnapType.horizontal ? 62 : 40;
      case EntityType.healingTotem: return 48;
      case EntityType.planterBox: return 40;
      case EntityType.furnace: return 40;
      case EntityType.campfire: return 52;
      case EntityType.fence: return 32;
      case EntityType.fenceGate: return 32;
      case EntityType.frostshaper: return snapType === SnapType.horizontal ? 60 : 40;
      case EntityType.stonecarvingTable: return snapType === SnapType.horizontal ? 60 : 40;
   }
}

const structurePlaceIsValid = (entityType: StructureType, x: number, y: number, rotation: number, chunks: Chunks): boolean => {
   const collidingEntities = estimateCollidingEntities(chunks, entityType, x, y, rotation);

   for (let i = 0; i < collidingEntities.length; i++) {
      const entity = collidingEntities[i];
      if (entity.type !== EntityType.itemEntity) {
         return false;
      }
   }

   return true;
}

const calculateRegularPlacePosition = (placeOrigin: Point, placingEntityRotation: number, structureType: StructureType): Point => {
   const placeOffsetY = getSnapOffset(structureType, SnapType.vertical);
   
   const placePositionX = placeOrigin.x + (Vars.STRUCTURE_PLACE_DISTANCE + placeOffsetY) * Math.sin(placingEntityRotation);
   const placePositionY = placeOrigin.y + (Vars.STRUCTURE_PLACE_DISTANCE + placeOffsetY) * Math.cos(placingEntityRotation);
   return new Point(placePositionX, placePositionY);
}

const getNearbyStructures = (regularPlacePosition: Point, chunks: Chunks): ReadonlyArray<EntityInfo<StructureType>> => {
   const minChunkX = Math.max(Math.floor((regularPlacePosition.x - Settings.STRUCTURE_SNAP_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((regularPlacePosition.x + Settings.STRUCTURE_SNAP_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((regularPlacePosition.y - Settings.STRUCTURE_SNAP_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((regularPlacePosition.y + Settings.STRUCTURE_SNAP_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   
   const seenEntityIDs = new Set<number>();
   
   const nearbyStructures = new Array<EntityInfo<StructureType>>();
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = getChunk(chunks, chunkX, chunkY);
         for (const entity of chunk.entities) {
            if (seenEntityIDs.has(entity.id)) {
               continue;
            }
            seenEntityIDs.add(entity.id);
            
            const distance = regularPlacePosition.calculateDistanceBetween(entity.position);
            if (distance > Settings.STRUCTURE_SNAP_RANGE) {
               continue;
            }
            
            // @Cleanup: casts
            if (STRUCTURE_TYPES.includes(entity.type as StructureType)) {
               nearbyStructures.push(entity as EntityInfo<StructureType>);
            }
         }
      }
   }

   return nearbyStructures;
}

export function getStructureSnapOrigin(structure: EntityInfo<StructureType>): Point {
   const snapOrigin = structure.position.copy();
   if (structure.type === EntityType.embrasure) {
      snapOrigin.x -= 22 * Math.sin(structure.rotation);
      snapOrigin.y -= 22 * Math.cos(structure.rotation);
   }
   return snapOrigin;
}

export function getSnapDirection(directionToSnappingEntity: number, structureRotation: number): SnapDirection {
   /*
   Note: Assumes that the structure position can properly snap to the snapping entity.
   */
   
   if (getAbsAngleDiff(directionToSnappingEntity, structureRotation) < 0.01) {
      return SnapDirection.top;
   } else if (getAbsAngleDiff(directionToSnappingEntity, structureRotation + Math.PI/2) < 0.01) {
      return SnapDirection.right;
   } else if (getAbsAngleDiff(directionToSnappingEntity, structureRotation + Math.PI) < 0.01) {
      return SnapDirection.bottom;
   } else if (getAbsAngleDiff(directionToSnappingEntity, structureRotation + Math.PI*3/2) < 0.01) {
      return SnapDirection.left;
   }

   console.log(directionToSnappingEntity, structureRotation);
   throw new Error("Misaligned directions!");
}

const getPositionsOffEntity = (snapOrigin: Readonly<Point>, snapEntity: EntityInfo<StructureType>, placeRotation: number, structureType: StructureType): ReadonlyArray<StructureTransformInfo> => {
   const snapPositions = new Array<StructureTransformInfo>();

   for (let i = 0; i < 4; i++) {
      const offsetDirection = i * Math.PI / 2 + snapEntity.rotation;

      const snapType = i % 2 === 0 ? SnapType.vertical : SnapType.horizontal;
      const snapEntityOffset = getSnapOffset(snapEntity.type, snapType);
      
      // direction to the snapping entity is opposite of the offset from the snapping entity
      const snapDirection = getSnapDirection(offsetDirection + Math.PI, placeRotation);

      const placingSnapType = snapDirection % 2 === 0 ? SnapType.vertical : SnapType.horizontal;
      const placingEntityOffset = getSnapOffset(structureType, placingSnapType);

      const offset = snapEntityOffset + placingEntityOffset;
      const positionX = snapOrigin.x + offset * Math.sin(offsetDirection);
      const positionY = snapOrigin.y + offset * Math.cos(offsetDirection);
      const position = new Point(positionX, positionY);

      snapPositions.push({
         position: position,
         rotation: placeRotation,
         snapDirection: snapDirection,
         connectedEntityID: snapEntity.id
      });
   }

   return snapPositions;
}

const findCandidatePlacePositions = (nearbyStructures: ReadonlyArray<EntityInfo<StructureType>>, structureType: StructureType, placingEntityRotation: number): Array<StructureTransformInfo> => {
   const candidatePositions = new Array<StructureTransformInfo>();
   
   for (let i = 0; i < nearbyStructures.length; i++) {
      const entity = nearbyStructures[i];

      // @Cleanup
      let clampedSnapRotation = entity.rotation;
      while (clampedSnapRotation >= Math.PI * 0.25) {
         clampedSnapRotation -= Math.PI * 0.5;
      }
      while (clampedSnapRotation < Math.PI * 0.25) {
         clampedSnapRotation += Math.PI * 0.5;
      }
      const placeRotation = Math.round(placingEntityRotation / (Math.PI * 0.5)) * Math.PI * 0.5 + clampedSnapRotation;

      const snapOrigin = getStructureSnapOrigin(entity);
      const positionsOffEntity = getPositionsOffEntity(snapOrigin, entity, placeRotation, structureType);

      for (let i = 0; i < positionsOffEntity.length; i++) {
         const position = positionsOffEntity[i];
         
         candidatePositions.push(position);
      }
   }

   return candidatePositions;
}

const transformsFormGroup = (transform1: StructureTransformInfo, transform2: StructureTransformInfo): boolean => {
   const dist = distance(transform1.position.x, transform1.position.y, transform2.position.x, transform2.position.y);
   if (dist > Vars.MULTI_SNAP_POSITION_TOLERANCE) {
      return false;
   }

   if (Math.abs(transform1.rotation - transform2.rotation) > Vars.MULTI_SNAP_ROTATION_TOLERANCE) {
      return false;
   }

   return true;
}

const getExistingGroup = (transform: StructureTransformInfo, groups: ReadonlyArray<Array<StructureTransformInfo>>): Array<StructureTransformInfo> | null => {
   for (let i = 0; i < groups.length; i++) {
      const group = groups[i];

      // Just test with the first one in the group, it shouldn't matter
      const testTransform = group[0];
      if (transformsFormGroup(transform, testTransform)) {
         return group;
      }
   }

   return null;
}

const groupTransforms = (transforms: ReadonlyArray<StructureTransformInfo>, structureType: StructureType, chunks: Chunks): ReadonlyArray<StructurePlaceInfo> => {
   const groups = new Array<Array<StructureTransformInfo>>();
   
   for (let i = 0; i < transforms.length; i++) {
      const transform = transforms[i];

      const existingGroup = getExistingGroup(transform, groups);
      if (existingGroup !== null) {
         existingGroup.push(transform);
      } else {
         const group = [transform];
         groups.push(group);
      }
   }

   const placeInfos = new Array<StructurePlaceInfo>();
   for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const firstTransform = group[0];
      
      let snappedSidesBitset = 0;
      const snappedEntityIDs: ConnectedEntityIDs = [0, 0, 0, 0];
      for (let j = 0; j < group.length; j++) {
         const transform = group[j];

         const bit = 1 << transform.snapDirection;
         if ((snappedSidesBitset & bit)) {
            console.warn("Found multiple snaps to the same side of the structure being placed!");
         } else {
            snappedSidesBitset |= bit;

            snappedEntityIDs[transform.snapDirection] = transform.connectedEntityID;
         }
      }

      const placeInfo: StructurePlaceInfo = {
         position: firstTransform.position,
         rotation: firstTransform.rotation,
         connectedSidesBitset: snappedSidesBitset,
         connectedEntityIDs: snappedEntityIDs,
         entityType: structureType,
         isValid: structurePlaceIsValid(structureType, firstTransform.position.x, firstTransform.position.y, firstTransform.rotation, chunks)
      };
      placeInfos.push(placeInfo);
   }

   return placeInfos;
}

const filterCandidatePositions = (candidates: Array<StructureTransformInfo>, regularPlacePosition: Readonly<Point>): void => {
   for (let i = 0; i < candidates.length; i++) {
      const transform = candidates[i];

      if (transform.position.calculateDistanceBetween(regularPlacePosition) > Settings.STRUCTURE_POSITION_SNAP) {
         candidates.splice(i, 1);
         i--;
      }
   }
}

export function calculateStructurePlaceInfo(placeOrigin: Point, placingEntityRotation: number, structureType: StructureType, chunks: Chunks): StructurePlaceInfo {
   const regularPlacePosition = calculateRegularPlacePosition(placeOrigin, placingEntityRotation, structureType);
   const nearbyStructures = getNearbyStructures(regularPlacePosition, chunks);
   
   const candidatePositions = findCandidatePlacePositions(nearbyStructures, structureType, placingEntityRotation);
   filterCandidatePositions(candidatePositions, regularPlacePosition);
   
   const placeInfos = groupTransforms(candidatePositions, structureType, chunks);

   if (placeInfos.length === 0) {
      // If no connections are found, use the regular place position
      return {
         position: regularPlacePosition,
         rotation: placingEntityRotation,
         connectedSidesBitset: 0,
         connectedEntityIDs: [0, 0, 0, 0],
         entityType: structureType,
         isValid: structurePlaceIsValid(structureType, regularPlacePosition.x, regularPlacePosition.y, placingEntityRotation, chunks)
      };
   } else {
      // @Incomplete:
      // - First filter by num snaps
      // - Then filter by proximity to regular place position

      return placeInfos[0];
   }
}

export function calculateStructureConnectionInfo(position: Point, rotation: number, structureType: StructureType, chunks: Chunks): StructureConnectionInfo {
   // @Cleanup: copy and paste
   
   const nearbyStructures = getNearbyStructures(position, chunks);
   
   const candidatePositions = findCandidatePlacePositions(nearbyStructures, structureType, rotation);
   filterCandidatePositions(candidatePositions, position);
   
   const placeInfos = groupTransforms(candidatePositions, structureType, chunks);
   if (placeInfos.length === 0) {
      return {
         connectedSidesBitset: 0,
         connectedEntityIDs: [0, 0, 0, 0]
      };
   } else {
      // @Incomplete:
      // - First filter by num snaps
      // - Then filter by proximity to regular place position

      return placeInfos[0];
   }
}
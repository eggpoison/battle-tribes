import { Chunks, EntityInfo, getChunk } from "./board-interface";
import { EntityType } from "./entities";
import { estimateCollidingEntities } from "./hitbox-collision";
import { createEntityHitboxes } from "./hitboxes/entity-hitbox-creation";
import { hitboxIsCircular } from "./hitboxes/hitboxes";
import { Settings } from "./settings";
import { Point, distance, getAbsAngleDiff } from "./utils";

/*
When snapping:
- By default, use the snap rotation rounded closest to the place direction.
   - e.g. walls
- Except when placing something which attaches onto the side of a structure, use the direction off that structure.
   - e.g. wall spikes
*/

const enum Vars {
   STRUCTURE_PLACE_DISTANCE = 60,
   MULTI_SNAP_POSITION_TOLERANCE = 0.1,
   MULTI_SNAP_ROTATION_TOLERANCE = 0.02,
   COLLISION_EPSILON = 0.01
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

const structurePlaceIsValid = (entityType: StructureType, x: number, y: number, rotation: number, chunks: Chunks): boolean => {
   const collidingEntities = estimateCollidingEntities(chunks, entityType, x, y, rotation, Vars.COLLISION_EPSILON);

   for (let i = 0; i < collidingEntities.length; i++) {
      const entity = collidingEntities[i];
      if (entity.type !== EntityType.itemEntity) {
         return false;
      }
   }

   return true;
}

const calculateRegularPlacePosition = (placeOrigin: Point, placingEntityRotation: number, structureType: StructureType): Point => {
   const hitboxes = createEntityHitboxes(structureType, 1);

   let entityMinX = Number.MAX_SAFE_INTEGER;
   let entityMaxX = Number.MIN_SAFE_INTEGER;
   let entityMinY = Number.MAX_SAFE_INTEGER;
   let entityMaxY = Number.MIN_SAFE_INTEGER;
   
   for (let i = 0; i < hitboxes.length; i++) {
      const hitbox = hitboxes[i];

      const minX = hitbox.calculateHitboxBoundsMinX();
      const maxX = hitbox.calculateHitboxBoundsMaxX();
      const minY = hitbox.calculateHitboxBoundsMinY();
      const maxY = hitbox.calculateHitboxBoundsMaxY();
      
      if (minX < entityMinX) {
         entityMinX = minX;
      }
      if (maxX > entityMaxX) {
         entityMaxX = maxX;
      }
      if (minY < entityMinY) {
         entityMinY = minY;
      }
      if (maxY > entityMaxY) {
         entityMaxY = maxY;
      }
   }

   const boundingAreaHeight = entityMaxY - entityMinY;
   const placeOffsetY = boundingAreaHeight * 0.5;
   
   const placePosition = Point.fromVectorForm(Vars.STRUCTURE_PLACE_DISTANCE + placeOffsetY, placingEntityRotation);
   placePosition.add(placeOrigin);
   return placePosition;
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

const getPositionsOffEntity = (snapOrigin: Readonly<Point>, connectingEntity: EntityInfo<StructureType>, placeRotation: number, structureType: StructureType, chunks: Chunks): ReadonlyArray<StructureTransformInfo> => {
   const placingEntityHitboxes = createEntityHitboxes(structureType, 1);
   
   const snapPositions = new Array<StructureTransformInfo>();

   for (let i = 0; i < connectingEntity.hitboxes.length; i++) {
      const hitbox = connectingEntity.hitboxes[i];
   
      let hitboxHalfWidth: number;
      let hitboxHalfHeight: number;
      if (hitboxIsCircular(hitbox)) {
         hitboxHalfWidth = hitbox.radius;
         hitboxHalfHeight = hitbox.radius;
      } else {
         hitboxHalfWidth = hitbox.width * 0.5;
         hitboxHalfHeight = hitbox.height * 0.5;
      }

      for (let j = 0; j < placingEntityHitboxes.length; j++) {
         const placingEntityHitbox = placingEntityHitboxes[j];
   
         // @Cleanup: copy and paste
         let placingEntityHitboxHalfWidth: number;
         let placingEntityHitboxHalfHeight: number;
         if (hitboxIsCircular(placingEntityHitbox)) {
            placingEntityHitboxHalfWidth = placingEntityHitbox.radius;
            placingEntityHitboxHalfHeight = placingEntityHitbox.radius;
         } else {
            placingEntityHitboxHalfWidth = placingEntityHitbox.width * 0.5;
            placingEntityHitboxHalfHeight = placingEntityHitbox.height * 0.5;
         }

         // Add snap positions for each direction off the connecting entity hitbox
         for (let k = 0; k < 4; k++) {
            const offsetDirection = k * Math.PI / 2 + connectingEntity.rotation;
      
            const connectingEntityOffset = k % 2 === 0 ? hitboxHalfHeight : hitboxHalfWidth;
   
            // Direction to the snapping entity is opposite of the offset from the snapping entity
            const snapDirection = getSnapDirection(offsetDirection + Math.PI, placeRotation);
      
            const placingEntityOffset = snapDirection % 2 === 0 ? placingEntityHitboxHalfHeight : placingEntityHitboxHalfWidth;
      
            const position = Point.fromVectorForm(connectingEntityOffset + placingEntityOffset, offsetDirection);
            position.add(snapOrigin);

            // Don't add the position if it would be colliding with the connecting entity
            let isValid = true;
            const collidingEntities = estimateCollidingEntities(chunks, structureType, position.x, position.y, placeRotation, Vars.COLLISION_EPSILON);
            for (let l = 0; l < collidingEntities.length; l++) {
               const collidingEntity = collidingEntities[l];
               if (collidingEntity.id === connectingEntity.id) {
                  isValid = false;
                  break;
               }
            }
      
            if (isValid) {
               snapPositions.push({
                  position: position,
                  rotation: placeRotation,
                  snapDirection: snapDirection,
                  connectedEntityID: connectingEntity.id
               });
            }
         }
      }
   }

   return snapPositions;
}

const findCandidatePlacePositions = (nearbyStructures: ReadonlyArray<EntityInfo<StructureType>>, structureType: StructureType, placingEntityRotation: number, chunks: Chunks): Array<StructureTransformInfo> => {
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
      const positionsOffEntity = getPositionsOffEntity(snapOrigin, entity, placeRotation, structureType, chunks);

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
      
      let connectedSidesBitset = 0;
      const connectedEntityIDs: ConnectedEntityIDs = [0, 0, 0, 0];
      for (let j = 0; j < group.length; j++) {
         const transform = group[j];

         const bit = 1 << transform.snapDirection;
         if ((connectedSidesBitset & bit)) {
            console.warn("Found multiple snaps to the same side of the structure being placed!");
         } else {
            connectedSidesBitset |= bit;

            connectedEntityIDs[transform.snapDirection] = transform.connectedEntityID;
         }
      }

      const placeInfo: StructurePlaceInfo = {
         position: firstTransform.position,
         rotation: firstTransform.rotation,
         connectedSidesBitset: connectedSidesBitset,
         connectedEntityIDs: connectedEntityIDs,
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

const calculatePlaceInfo = (position: Point, rotation: number, structureType: StructureType, chunks: Chunks): StructurePlaceInfo => {
   const nearbyStructures = getNearbyStructures(position, chunks);
   
   const candidatePositions = findCandidatePlacePositions(nearbyStructures, structureType, rotation, chunks);
   filterCandidatePositions(candidatePositions, position);
   
   const placeInfos = groupTransforms(candidatePositions, structureType, chunks);
   if (placeInfos.length === 0) {
      // If no connections are found, use the regular place position
      return {
         position: position,
         rotation: rotation,
         connectedSidesBitset: 0,
         connectedEntityIDs: [0, 0, 0, 0],
         entityType: structureType,
         isValid: structurePlaceIsValid(structureType, position.x, position.y, rotation, chunks)
      };
   } else {
      // @Incomplete:
      // - First filter by num snaps
      // - Then filter by proximity to regular place position

      return placeInfos[0];
   }
}

export function calculateStructureConnectionInfo(position: Point, rotation: number, structureType: StructureType, chunks: Chunks): StructureConnectionInfo {
   const placeInfo = calculatePlaceInfo(position, rotation, structureType, chunks);
   return {
      connectedSidesBitset: placeInfo.connectedSidesBitset,
      connectedEntityIDs: placeInfo.connectedEntityIDs
   };
}

export function calculateStructurePlaceInfo(placeOrigin: Point, placingEntityRotation: number, structureType: StructureType, chunks: Chunks): StructurePlaceInfo {
   const regularPlacePosition = calculateRegularPlacePosition(placeOrigin, placingEntityRotation, structureType);
   return calculatePlaceInfo(regularPlacePosition, placingEntityRotation, structureType, chunks);
}
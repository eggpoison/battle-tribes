import { Chunks, EntityInfo, getChunk } from "./board-interface";
import { EntityID, EntityType } from "./entities";
import { estimateCollidingEntities } from "./hitbox-collision";
import { createBracingHitboxes, createNormalStructureHitboxes } from "./boxes/entity-hitbox-creation";
import { boxIsCircular, Hitbox } from "./boxes/boxes";
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

export const STRUCTURE_TYPES = [EntityType.wall, EntityType.door, EntityType.embrasure, EntityType.floorSpikes, EntityType.wallSpikes, EntityType.floorPunjiSticks, EntityType.wallPunjiSticks, EntityType.ballista, EntityType.slingTurret, EntityType.tunnel, EntityType.tribeTotem, EntityType.workerHut, EntityType.warriorHut, EntityType.barrel, EntityType.workbench, EntityType.researchBench, EntityType.healingTotem, EntityType.planterBox, EntityType.furnace, EntityType.campfire, EntityType.fence, EntityType.fenceGate, EntityType.frostshaper, EntityType.stonecarvingTable, EntityType.bracings] as const;
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
   readonly hitboxes: ReadonlyArray<Hitbox>;
   readonly isValid: boolean;
}

export interface StructureConnectionInfo {
   readonly connectedSidesBitset: number;
   readonly connectedEntityIDs: ConnectedEntityIDs;
}

export interface WorldInfo {
   readonly chunks: Chunks;
   getEntityCallback(entity: EntityID): EntityInfo;
}

export function createEmptyStructureConnectionInfo(): StructureConnectionInfo {
   return {
      connectedSidesBitset: 0,
      connectedEntityIDs: [0, 0, 0, 0]
   };
}

const structurePlaceIsValid = (entityType: StructureType, x: number, y: number, rotation: number, worldInfo: WorldInfo): boolean => {
   const collidingEntities = estimateCollidingEntities(worldInfo, entityType, x, y, rotation, Vars.COLLISION_EPSILON);

   for (let i = 0; i < collidingEntities.length; i++) {
      const entityID = collidingEntities[i];
      const entity = worldInfo.getEntityCallback(entityID);
      if (entity.type !== EntityType.itemEntity) {
         return false;
      }
   }

   return true;
}

const calculateRegularPlacePosition = (placeOrigin: Point, placingEntityRotation: number, structureType: StructureType): Point => {
   // @Hack?
   if (structureType === EntityType.bracings) {
      const placePosition = Point.fromVectorForm(Vars.STRUCTURE_PLACE_DISTANCE + Settings.TILE_SIZE * 0.5, placingEntityRotation);
      placePosition.add(placeOrigin);
      return placePosition;
   }
   
   const hitboxes = createNormalStructureHitboxes(structureType);

   let entityMinX = Number.MAX_SAFE_INTEGER;
   let entityMaxX = Number.MIN_SAFE_INTEGER;
   let entityMinY = Number.MAX_SAFE_INTEGER;
   let entityMaxY = Number.MIN_SAFE_INTEGER;
   
   for (let i = 0; i < hitboxes.length; i++) {
      const hitbox = hitboxes[i];
      const box = hitbox.box;

      const minX = box.calculateBoundsMinX();
      const maxX = box.calculateBoundsMaxX();
      const minY = box.calculateBoundsMinY();
      const maxY = box.calculateBoundsMaxY();
      
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

const getNearbyStructures = (regularPlacePosition: Point, worldInfo: WorldInfo): ReadonlyArray<EntityInfo<StructureType>> => {
   const minChunkX = Math.max(Math.floor((regularPlacePosition.x - Settings.STRUCTURE_SNAP_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((regularPlacePosition.x + Settings.STRUCTURE_SNAP_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((regularPlacePosition.y - Settings.STRUCTURE_SNAP_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((regularPlacePosition.y + Settings.STRUCTURE_SNAP_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   
   const seenEntityIDs = new Set<number>();
   
   const nearbyStructures = new Array<EntityInfo<StructureType>>();
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = getChunk(worldInfo.chunks, chunkX, chunkY);
         for (const entityID of chunk.entities) {
            const entity = worldInfo.getEntityCallback(entityID);
            
            if (seenEntityIDs.has(entityID)) {
               continue;
            }
            seenEntityIDs.add(entityID);
            
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

export function getStructureSnapOrigin(structure: EntityInfo): Point {
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
   console.warn("Misaligned directions!");
   return SnapDirection.top;
}

const getPositionsOffEntity = (snapOrigin: Readonly<Point>, connectingEntity: EntityInfo<StructureType>, placeRotation: number, structureType: StructureType, worldInfo: WorldInfo): ReadonlyArray<StructureTransformInfo> => {
   const placingEntityHitboxes = createNormalStructureHitboxes(structureType);
   
   const snapPositions = new Array<StructureTransformInfo>();

   for (let i = 0; i < connectingEntity.hitboxes.length; i++) {
      const hitbox = connectingEntity.hitboxes[i];
      const box = hitbox.box;
   
      let hitboxHalfWidth: number;
      let hitboxHalfHeight: number;
      if (boxIsCircular(box)) {
         hitboxHalfWidth = box.radius;
         hitboxHalfHeight = box.radius;
      } else {
         hitboxHalfWidth = box.width * 0.5;
         hitboxHalfHeight = box.height * 0.5;
      }

      for (let j = 0; j < placingEntityHitboxes.length; j++) {
         const placingEntityHitbox = placingEntityHitboxes[j];
         const box = placingEntityHitbox.box;
   
         // @Cleanup: copy and paste
         let placingEntityHitboxHalfWidth: number;
         let placingEntityHitboxHalfHeight: number;
         if (boxIsCircular(box)) {
            placingEntityHitboxHalfWidth = box.radius;
            placingEntityHitboxHalfHeight = box.radius;
         } else {
            placingEntityHitboxHalfWidth = box.width * 0.5;
            placingEntityHitboxHalfHeight = box.height * 0.5;
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
            const collidingEntities = estimateCollidingEntities(worldInfo, structureType, position.x, position.y, placeRotation, Vars.COLLISION_EPSILON);
            for (let l = 0; l < collidingEntities.length; l++) {
               const collidingEntityID = collidingEntities[l];
               if (collidingEntityID === connectingEntity.id) {
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

const findCandidatePlacePositions = (nearbyStructures: ReadonlyArray<EntityInfo<StructureType>>, structureType: StructureType, placingEntityRotation: number, worldInfo: WorldInfo): Array<StructureTransformInfo> => {
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
      const positionsOffEntity = getPositionsOffEntity(snapOrigin, entity, placeRotation, structureType, worldInfo);

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

const groupTransforms = (transforms: ReadonlyArray<StructureTransformInfo>, structureType: StructureType, worldInfo: WorldInfo): ReadonlyArray<StructurePlaceInfo> => {
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
         hitboxes: [],
         isValid: structurePlaceIsValid(structureType, firstTransform.position.x, firstTransform.position.y, firstTransform.rotation, worldInfo)
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

const getNearbyTileCorners = (regularPlacePosition: Point): ReadonlyArray<Point> => {
   const minTileX = Math.floor(regularPlacePosition.x / Settings.TILE_SIZE);
   const maxTileX = Math.ceil(regularPlacePosition.x / Settings.TILE_SIZE);
   const minTileY = Math.floor(regularPlacePosition.y / Settings.TILE_SIZE);
   const maxTileY = Math.ceil(regularPlacePosition.y / Settings.TILE_SIZE);

   const tileCornerPositions = new Array<Point>();
   for (let tileCornerX = minTileX; tileCornerX <= maxTileX; tileCornerX++) {
      for (let tileCornerY = minTileY; tileCornerY <= maxTileY; tileCornerY++) {
         const x = tileCornerX * Settings.TILE_SIZE;
         const y = tileCornerY * Settings.TILE_SIZE;
         tileCornerPositions.push(new Point(x, y));
      }
   }
   return tileCornerPositions;
}

const getBracingsPlaceInfo = (regularPlacePosition: Point, entityType: StructureType): StructurePlaceInfo => {
   // Snap the place position to the closest tile
   const tileX = Math.floor(regularPlacePosition.x / Settings.TILE_SIZE + 0.5);
   const tileY = Math.floor(regularPlacePosition.y / Settings.TILE_SIZE + 0.5);
   const position = new Point((tileX + 0.5) * Settings.TILE_SIZE, (tileY + 0.5) * Settings.TILE_SIZE);
   
   const nearbyTileCorners = getNearbyTileCorners(regularPlacePosition);

   let closestTileCorner: Point | undefined;
   let secondClosestTileCorner: Point | undefined;

   let minDist = Number.MAX_SAFE_INTEGER;
   let secondMinDist = Number.MAX_SAFE_INTEGER;

   for (let i = 0; i < nearbyTileCorners.length; i++) {
      const corner = nearbyTileCorners[i];

      const distance = corner.calculateDistanceBetween(regularPlacePosition);

      if (distance < minDist) {
         secondClosestTileCorner = closestTileCorner;
         secondMinDist = minDist;
         
         closestTileCorner = corner;
         minDist = distance;
      } else if (distance < secondMinDist) {
         secondClosestTileCorner = corner;
         secondMinDist = distance;
      }
   }

   if (typeof closestTileCorner === "undefined" || typeof secondClosestTileCorner === "undefined") {
      throw new Error();
   }

   const hitboxes = createBracingHitboxes(closestTileCorner.x - position.x, closestTileCorner.y - position.y, secondClosestTileCorner.x - position.x, secondClosestTileCorner.y - position.y);

   // // @Incomplete: Make sure that the hitboxes being updated before created won't mess stuff up
   // for (const hitbox of hitboxes) {
   //    updateBox(hitbox.box, position.x, position.y, rotation);
   // }
   
   // // @Hack: should use the structurePlaceIsValid function
   // const collidingHitboxes = getBoxesCollidingEntities(worldInfo, hitboxes, epsilon);
   
   return {
      position: position,
      rotation: 0,
      connectedSidesBitset: 0,
      connectedEntityIDs: [0, 0, 0, 0],
      entityType: entityType,
      hitboxes: hitboxes,
      isValid: true
   }
}

const calculatePlaceInfo = (position: Point, rotation: number, entityType: StructureType, worldInfo: WorldInfo): StructurePlaceInfo => {
   // @Hack?
   if (entityType === EntityType.bracings) {
      return getBracingsPlaceInfo(position, entityType);
   }
   
   const nearbyStructures = getNearbyStructures(position, worldInfo);
   
   const candidatePositions = findCandidatePlacePositions(nearbyStructures, entityType, rotation, worldInfo);
   filterCandidatePositions(candidatePositions, position);
   
   const placeInfos = groupTransforms(candidatePositions, entityType, worldInfo);
   if (placeInfos.length === 0) {
      // If no connections are found, use the regular place position
      return {
         position: position,
         rotation: rotation,
         connectedSidesBitset: 0,
         connectedEntityIDs: [0, 0, 0, 0],
         entityType: entityType,
         hitboxes: [],
         isValid: structurePlaceIsValid(entityType, position.x, position.y, rotation, worldInfo)
      };
   } else {
      // @Incomplete:
      // - First filter by num snaps
      // - Then filter by proximity to regular place position

      return placeInfos[0];
   }
}

export function calculateStructureConnectionInfo(position: Point, rotation: number, structureType: StructureType, worldInfo: WorldInfo): StructureConnectionInfo {
   const placeInfo = calculatePlaceInfo(position, rotation, structureType, worldInfo);
   return {
      connectedSidesBitset: placeInfo.connectedSidesBitset,
      connectedEntityIDs: placeInfo.connectedEntityIDs
   };
}

export function calculateStructurePlaceInfo(placeOrigin: Point, placingEntityRotation: number, structureType: StructureType, worldInfo: WorldInfo): StructurePlaceInfo {
   const regularPlacePosition = calculateRegularPlacePosition(placeOrigin, placingEntityRotation, structureType);
   return calculatePlaceInfo(regularPlacePosition, placingEntityRotation, structureType, worldInfo);
}
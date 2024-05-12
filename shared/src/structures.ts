import { EntityType } from "./entities";
import { Point, distance } from "./utils";

/*

When snapping:
- By default, use the snap rotation rounded closest to the place direction.
   - e.g. walls
- Except when placing something which attaches directly onto a structure, use the direction off that structure.
   - e.g. spikes

*/

const enum Vars {
   MULTI_SNAP_POSITION_TOLERANCE = 0.1,
   MULTI_SNAP_ROTATION_TOLERANCE = 0.02
}

export const STRUCTURE_TYPES = [EntityType.wall, EntityType.door,  EntityType.embrasure,  EntityType.floorSpikes,  EntityType.wallSpikes,  EntityType.floorPunjiSticks,  EntityType.wallPunjiSticks,  EntityType.ballista,  EntityType.slingTurret,  EntityType.tunnel,  EntityType.tribeTotem,  EntityType.workerHut,  EntityType.warriorHut,  EntityType.barrel,  EntityType.workbench,  EntityType.researchBench,  EntityType.healingTotem,  EntityType.planterBox,  EntityType.furnace,  EntityType.campfire,  EntityType.fence,  EntityType.fenceGate] as const;
export type StructureType = typeof STRUCTURE_TYPES[number];

type SnappedEntityIDs = [number, number, number, number];

const enum SnapType {
   horizontal,
   vertical
}

interface StructureTransformInfo {
   readonly position: Point;
   readonly rotation: number;
   readonly snappedSideBit: number;
   readonly snappedEntityID: number;
}

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

const getSnapOffset = (entityType: StructureType, snapType: SnapType): number => {
   switch (entityType) {
      case EntityType.tunnel:
      case EntityType.wall:
      case EntityType.door:
      case EntityType.embrasure: return 64;
      case EntityType.floorSpikes: return 56;
      case EntityType.wallSpikes: return snapType === SnapType.horizontal ? 56 : 28;
      case EntityType.floorPunjiSticks: return 56;
      case EntityType.wallPunjiSticks: return snapType === SnapType.horizontal ? 56 : 32;
      case EntityType.slingTurret: { return 80; }
      case EntityType.ballista: { return 50; }
      case EntityType.tribeTotem: return 120;
      case EntityType.workerHut: return 88;
      case EntityType.warriorHut: return 104;
      case EntityType.barrel: return 80;
      case EntityType.workbench: return 80;
      case EntityType.researchBench: return snapType === SnapType.horizontal ? 124 : 80;
      case EntityType.healingTotem: return 96;
      case EntityType.planterBox: return 40;
      case EntityType.furnace: return 80;
      case EntityType.campfire: return 104;
      case EntityType.fence: return 64;
      case EntityType.fenceGate: return 64;
   }
}

const getPositionsOffEntity = (snapOrigin: Point, snapEntity: EntityInfo, placeRotation: number, isPlacedOnWall: boolean, placingEntityType: StructureType): ReadonlyArray<StructureTransformInfo> => {
   const snapPositions = new Array<StructureTransformInfo>();

   for (let i = 0; i < 4; i++) {
      const direction = i * Math.PI / 2 + snapEntity.rotation;

      const snapType = i % 2 === 0 ? SnapType.vertical : SnapType.horizontal;
      // @Cleanup: / 2
      const snapEntityOffset = getSnapOffset(snapEntity.type, snapType) / 2;

      // @Incompllete
      const placingSnapType = SnapType.vertical;
      // @Cleanup: / 2
      const placingEntityOffset = getSnapOffset(placingEntityType, placingSnapType) / 2;

      
      // const epsilon = 0.01; // @Speed: const enum?
      // let structureOffsetI = i;
      // // If placing on the left or right side of the snap entity, use the width offset
      // if (!(Math.abs(direction - placeRotation) < epsilon || Math.abs(direction - (placeRotation + Math.PI)) < epsilon)) {
      //    structureOffsetI++;
      // }

      // let structureOffset: number;
      // if (structureOffsetI % 2 === 0 || (isPlacedOnWall && (placeInfo.entityType === IEntityType.spikes || placeInfo.entityType === IEntityType.punjiSticks))) {
      //    // Top and bottom
      //    structureOffset = getSnapOffsetHeight(placeInfo.entityType as StructureType, isPlacedOnWall) * 0.5;
      // } else {
      //    // Left and right
      //    structureOffset = getSnapOffsetWidth(placeInfo.entityType as StructureType, isPlacedOnWall) * 0.5;
      // }

      const offset = snapEntityOffset + placingEntityOffset;
      const positionX = snapOrigin.x + offset * Math.sin(direction);
      const positionY = snapOrigin.y + offset * Math.cos(direction);
      snapPositions.push({
         position: new Point(positionX, positionY),
         rotation: placeRotation,
         // @Incomplete
         snappedSideBit: 0,
         snappedEntityID: snapEntity.id
      });
   }

   return snapPositions;
}

const findCandidatePlacePositions = (snappableEntities: ReadonlyArray<EntityInfo>, placingEntityType: StructureType): ReadonlyArray<StructureTransformInfo> => {
   const candidatePositions = new Array<StructureTransformInfo>();
   
   for (let i = 0; i < snappableEntities.length; i++) {
      const entity = snappableEntities[i];

      // @Cleanup: make into func
      const snapOrigin = entity.position.copy();
      if (entity.type === EntityType.embrasure) {
         snapOrigin.x -= 22 * Math.sin(entity.rotation);
         snapOrigin.y -= 22 * Math.cos(entity.rotation);
      }

      // @Cleanup
      let clampedSnapRotation = entity.rotation;
      while (clampedSnapRotation >= Math.PI * 0.25) {
         clampedSnapRotation -= Math.PI * 0.5;
      }
      while (clampedSnapRotation < Math.PI * 0.25) {
         clampedSnapRotation += Math.PI * 0.5;
      }
      const placeRotation = Math.round(entity.rotation / (Math.PI * 0.5)) * Math.PI * 0.5 + clampedSnapRotation;

      // @Incomplete: placedOnWall
      const positionsOffEntity = getPositionsOffEntity(snapOrigin, entity, placeRotation, false, placingEntityType);

      for (let i = 0; i < positionsOffEntity.length; i++) {
         const position = positionsOffEntity[i];
         
         candidatePositions.push(position);
      }
   }

   return candidatePositions;
}

const transformsFormGroup = (transform1: StructureTransformInfo, transform2: StructureTransformInfo): boolean => {
   const dist = distance(transform1.position.x, transform1.position.y, transform2.position.y, transform2.position.y);
   if (dist > Vars.MULTI_SNAP_POSITION_TOLERANCE) {
      return false;
   }

   if (Math.abs(transform1.rotation - transform2.rotation) < Vars.MULTI_SNAP_ROTATION_TOLERANCE) {
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

const groupTransforms = (transforms: ReadonlyArray<StructureTransformInfo>, placingEntityType: StructureType): ReadonlyArray<StructurePlaceInfo> => {
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
   for (let i = 0; groups.length; i++) {
      const group = groups[i];
      const firstTransform = group[0];
      
      // @Incomplete
      let snappedSidesBitset = 0;
      const snappedEntityIDs: SnappedEntityIDs = [0, 0, 0, 0];

      const placeInfo: StructurePlaceInfo = {
         x: firstTransform.position.x,
         y: firstTransform.position.y,
         rotation: firstTransform.rotation,
         snappedSidesBitset: snappedSidesBitset,
         snappedEntityIDs: snappedEntityIDs,
         entityType: placingEntityType
      };
      placeInfos.push(placeInfo);
   }

   return placeInfos;
}

export function getStructurePlaceInfo(snappableEntities: ReadonlyArray<EntityInfo>, placingEntityType: StructureType): StructurePlaceInfo | null {
   const candidatePositions = findCandidatePlacePositions(snappableEntities, placingEntityType);
   const placeInfos = groupTransforms(candidatePositions, placingEntityType);

   // @Incomplete
   if (placeInfos.length === 0) {
      return null;
   } else {
      return placeInfos[0];
   }
}
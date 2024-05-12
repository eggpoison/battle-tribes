"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStructurePlaceInfo = exports.STRUCTURE_TYPES = void 0;
const utils_1 = require("./utils");
exports.STRUCTURE_TYPES = [31 /* EntityType.wall */, 34 /* EntityType.door */, 40 /* EntityType.embrasure */, 42 /* EntityType.floorSpikes */, 43 /* EntityType.wallSpikes */, 44 /* EntityType.floorPunjiSticks */, 45 /* EntityType.wallPunjiSticks */, 47 /* EntityType.ballista */, 48 /* EntityType.slingTurret */, 41 /* EntityType.tunnel */, 15 /* EntityType.tribeTotem */, 16 /* EntityType.workerHut */, 17 /* EntityType.warriorHut */, 18 /* EntityType.barrel */, 4 /* EntityType.workbench */, 30 /* EntityType.researchBench */, 49 /* EntityType.healingTotem */, 37 /* EntityType.planterBox */, 20 /* EntityType.furnace */, 19 /* EntityType.campfire */, 51 /* EntityType.fence */, 52 /* EntityType.fenceGate */];
const getSnapOffset = (entityType, snapType) => {
    switch (entityType) {
        case 41 /* EntityType.tunnel */:
        case 31 /* EntityType.wall */:
        case 34 /* EntityType.door */:
        case 40 /* EntityType.embrasure */: return 64;
        case 42 /* EntityType.floorSpikes */: return 56;
        case 43 /* EntityType.wallSpikes */: return snapType === 0 /* SnapType.horizontal */ ? 56 : 28;
        case 44 /* EntityType.floorPunjiSticks */: return 56;
        case 45 /* EntityType.wallPunjiSticks */: return snapType === 0 /* SnapType.horizontal */ ? 56 : 32;
        case 48 /* EntityType.slingTurret */: {
            return 80;
        }
        case 47 /* EntityType.ballista */: {
            return 50;
        }
        case 15 /* EntityType.tribeTotem */: return 120;
        case 16 /* EntityType.workerHut */: return 88;
        case 17 /* EntityType.warriorHut */: return 104;
        case 18 /* EntityType.barrel */: return 80;
        case 4 /* EntityType.workbench */: return 80;
        case 30 /* EntityType.researchBench */: return snapType === 0 /* SnapType.horizontal */ ? 124 : 80;
        case 49 /* EntityType.healingTotem */: return 96;
        case 37 /* EntityType.planterBox */: return 40;
        case 20 /* EntityType.furnace */: return 80;
        case 19 /* EntityType.campfire */: return 104;
        case 51 /* EntityType.fence */: return 64;
        case 52 /* EntityType.fenceGate */: return 64;
    }
};
const getPositionsOffEntity = (snapOrigin, snapEntity, placeRotation, isPlacedOnWall, placingEntityType) => {
    const snapPositions = new Array();
    for (let i = 0; i < 4; i++) {
        const direction = i * Math.PI / 2 + snapEntity.rotation;
        const snapType = i % 2 === 0 ? 1 /* SnapType.vertical */ : 0 /* SnapType.horizontal */;
        // @Cleanup: / 2
        const snapEntityOffset = getSnapOffset(snapEntity.type, snapType) / 2;
        // @Incompllete
        const placingSnapType = 1 /* SnapType.vertical */;
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
            position: new utils_1.Point(positionX, positionY),
            rotation: placeRotation,
            // @Incomplete
            snappedSideBit: 0,
            snappedEntityID: snapEntity.id
        });
    }
    return snapPositions;
};
const findCandidatePlacePositions = (snappableEntities, placingEntityType) => {
    const candidatePositions = new Array();
    for (let i = 0; i < snappableEntities.length; i++) {
        const entity = snappableEntities[i];
        // @Cleanup: make into func
        const snapOrigin = entity.position.copy();
        if (entity.type === 40 /* EntityType.embrasure */) {
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
};
const transformsFormGroup = (transform1, transform2) => {
    const dist = (0, utils_1.distance)(transform1.position.x, transform1.position.y, transform2.position.y, transform2.position.y);
    if (dist > 0.1 /* Vars.MULTI_SNAP_POSITION_TOLERANCE */) {
        return false;
    }
    if (Math.abs(transform1.rotation - transform2.rotation) < 0.02 /* Vars.MULTI_SNAP_ROTATION_TOLERANCE */) {
        return false;
    }
    return true;
};
const getExistingGroup = (transform, groups) => {
    for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        // Just test with the first one in the group, it shouldn't matter
        const testTransform = group[0];
        if (transformsFormGroup(transform, testTransform)) {
            return group;
        }
    }
    return null;
};
const groupTransforms = (transforms, placingEntityType) => {
    const groups = new Array();
    for (let i = 0; i < transforms.length; i++) {
        const transform = transforms[i];
        const existingGroup = getExistingGroup(transform, groups);
        if (existingGroup !== null) {
            existingGroup.push(transform);
        }
        else {
            const group = [transform];
            groups.push(group);
        }
    }
    const placeInfos = new Array();
    for (let i = 0; groups.length; i++) {
        const group = groups[i];
        const firstTransform = group[0];
        // @Incomplete
        let snappedSidesBitset = 0;
        const snappedEntityIDs = [0, 0, 0, 0];
        const placeInfo = {
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
};
function getStructurePlaceInfo(snappableEntities, placingEntityType) {
    const candidatePositions = findCandidatePlacePositions(snappableEntities, placingEntityType);
    const placeInfos = groupTransforms(candidatePositions, placingEntityType);
    // @Incomplete
    if (placeInfos.length === 0) {
        return null;
    }
    else {
        return placeInfos[0];
    }
}
exports.getStructurePlaceInfo = getStructurePlaceInfo;

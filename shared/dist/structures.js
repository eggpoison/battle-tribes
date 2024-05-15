"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateStructurePlaceInfo = exports.getSnapDirection = exports.SnapDirection = exports.STRUCTURE_TYPES = void 0;
const utils_1 = require("./utils");
exports.STRUCTURE_TYPES = [31 /* EntityType.wall */, 34 /* EntityType.door */, 40 /* EntityType.embrasure */, 42 /* EntityType.floorSpikes */, 43 /* EntityType.wallSpikes */, 44 /* EntityType.floorPunjiSticks */, 45 /* EntityType.wallPunjiSticks */, 47 /* EntityType.ballista */, 48 /* EntityType.slingTurret */, 41 /* EntityType.tunnel */, 15 /* EntityType.tribeTotem */, 16 /* EntityType.workerHut */, 17 /* EntityType.warriorHut */, 18 /* EntityType.barrel */, 4 /* EntityType.workbench */, 30 /* EntityType.researchBench */, 49 /* EntityType.healingTotem */, 37 /* EntityType.planterBox */, 20 /* EntityType.furnace */, 19 /* EntityType.campfire */, 51 /* EntityType.fence */, 52 /* EntityType.fenceGate */];
// @Temporary: make const
var SnapDirection;
(function (SnapDirection) {
    SnapDirection[SnapDirection["top"] = 0] = "top";
    SnapDirection[SnapDirection["right"] = 1] = "right";
    SnapDirection[SnapDirection["bottom"] = 2] = "bottom";
    SnapDirection[SnapDirection["left"] = 3] = "left";
})(SnapDirection = exports.SnapDirection || (exports.SnapDirection = {}));
const getSnapOffset = (structureType, snapType) => {
    switch (structureType) {
        case 41 /* EntityType.tunnel */:
        case 31 /* EntityType.wall */:
        case 34 /* EntityType.door */:
        case 40 /* EntityType.embrasure */: return 32;
        case 42 /* EntityType.floorSpikes */: return 28;
        case 43 /* EntityType.wallSpikes */: return snapType === 0 /* SnapType.horizontal */ ? 28 : 14;
        case 44 /* EntityType.floorPunjiSticks */: return 28;
        case 45 /* EntityType.wallPunjiSticks */: return snapType === 0 /* SnapType.horizontal */ ? 28 : 16;
        case 48 /* EntityType.slingTurret */: {
            return 40;
        }
        case 47 /* EntityType.ballista */: {
            return 50;
        }
        case 15 /* EntityType.tribeTotem */: return 60;
        case 16 /* EntityType.workerHut */: return 44;
        case 17 /* EntityType.warriorHut */: return 52;
        case 18 /* EntityType.barrel */: return 40;
        case 4 /* EntityType.workbench */: return 40;
        case 30 /* EntityType.researchBench */: return snapType === 0 /* SnapType.horizontal */ ? 62 : 40;
        case 49 /* EntityType.healingTotem */: return 48;
        case 37 /* EntityType.planterBox */: return 40;
        case 20 /* EntityType.furnace */: return 40;
        case 19 /* EntityType.campfire */: return 52;
        case 51 /* EntityType.fence */: return 32;
        case 52 /* EntityType.fenceGate */: return 32;
    }
};
const calculateRegularPlacePosition = (placeOrigin, placingEntityRotation, structureType) => {
    const placeOffsetY = getSnapOffset(structureType, 1 /* SnapType.vertical */);
    const placePositionX = placeOrigin.x + (60 /* Vars.STRUCTURE_PLACE_DISTANCE */ + placeOffsetY) * Math.sin(placingEntityRotation);
    const placePositionY = placeOrigin.y + (60 /* Vars.STRUCTURE_PLACE_DISTANCE */ + placeOffsetY) * Math.cos(placingEntityRotation);
    return new utils_1.Point(placePositionX, placePositionY);
};
const getChunk = (chunks, chunkX, chunkY) => {
    const chunkIndex = chunkY * 64 /* Settings.BOARD_SIZE */ + chunkX;
    return chunks[chunkIndex];
};
const getNearbyStructures = (regularPlacePosition, chunks) => {
    const minChunkX = Math.max(Math.floor((regularPlacePosition.x - 100 /* Settings.STRUCTURE_SNAP_RANGE */) / 256 /* Settings.CHUNK_UNITS */), 0);
    const maxChunkX = Math.min(Math.floor((regularPlacePosition.x + 100 /* Settings.STRUCTURE_SNAP_RANGE */) / 256 /* Settings.CHUNK_UNITS */), 64 /* Settings.BOARD_SIZE */ - 1);
    const minChunkY = Math.max(Math.floor((regularPlacePosition.y - 100 /* Settings.STRUCTURE_SNAP_RANGE */) / 256 /* Settings.CHUNK_UNITS */), 0);
    const maxChunkY = Math.min(Math.floor((regularPlacePosition.y + 100 /* Settings.STRUCTURE_SNAP_RANGE */) / 256 /* Settings.CHUNK_UNITS */), 64 /* Settings.BOARD_SIZE */ - 1);
    const seenEntityIDs = new Set();
    const nearbyStructures = new Array();
    for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
        for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
            const chunk = getChunk(chunks, chunkX, chunkY);
            for (const entity of chunk.entities) {
                if (seenEntityIDs.has(entity.id)) {
                    continue;
                }
                seenEntityIDs.add(entity.id);
                const distance = regularPlacePosition.calculateDistanceBetween(entity.position);
                if (distance > 100 /* Settings.STRUCTURE_SNAP_RANGE */) {
                    continue;
                }
                // @Cleanup: casts
                if (exports.STRUCTURE_TYPES.includes(entity.type)) {
                    nearbyStructures.push(entity);
                }
            }
        }
    }
    return nearbyStructures;
};
function getSnapDirection(directionToSnappingEntity, structureRotation) {
    /*
    Note: Assumes that the structure position can properly snap to the snapping entity.
    */
    if ((0, utils_1.getAbsAngleDiff)(directionToSnappingEntity, structureRotation) < 0.01) {
        return SnapDirection.top;
    }
    else if ((0, utils_1.getAbsAngleDiff)(directionToSnappingEntity, structureRotation + Math.PI / 2) < 0.01) {
        return SnapDirection.right;
    }
    else if ((0, utils_1.getAbsAngleDiff)(directionToSnappingEntity, structureRotation + Math.PI) < 0.01) {
        return SnapDirection.bottom;
    }
    else if ((0, utils_1.getAbsAngleDiff)(directionToSnappingEntity, structureRotation + Math.PI * 3 / 2) < 0.01) {
        return SnapDirection.left;
    }
    console.log(directionToSnappingEntity, structureRotation);
    throw new Error("Misaligned directions!");
}
exports.getSnapDirection = getSnapDirection;
const getPositionsOffEntity = (snapOrigin, snapEntity, placeRotation, isPlacedOnWall, structureType) => {
    const snapPositions = new Array();
    for (let i = 0; i < 4; i++) {
        const offsetDirection = i * Math.PI / 2 + snapEntity.rotation;
        const snapType = i % 2 === 0 ? 1 /* SnapType.vertical */ : 0 /* SnapType.horizontal */;
        const snapEntityOffset = getSnapOffset(snapEntity.type, snapType);
        // direction to the snapping entity is opposite of the offset from the snapping entity
        const snapDirection = getSnapDirection(offsetDirection + Math.PI, placeRotation);
        const placingSnapType = snapDirection % 2 === 0 ? 1 /* SnapType.vertical */ : 0 /* SnapType.horizontal */;
        const placingEntityOffset = getSnapOffset(structureType, placingSnapType);
        const offset = snapEntityOffset + placingEntityOffset;
        const positionX = snapOrigin.x + offset * Math.sin(offsetDirection);
        const positionY = snapOrigin.y + offset * Math.cos(offsetDirection);
        const position = new utils_1.Point(positionX, positionY);
        snapPositions.push({
            position: position,
            rotation: placeRotation,
            snapDirection: snapDirection,
            snappedEntityID: snapEntity.id
        });
    }
    return snapPositions;
};
const findCandidatePlacePositions = (nearbyStructures, structureType, placingEntityRotation) => {
    const candidatePositions = new Array();
    for (let i = 0; i < nearbyStructures.length; i++) {
        const entity = nearbyStructures[i];
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
        const placeRotation = Math.round(placingEntityRotation / (Math.PI * 0.5)) * Math.PI * 0.5 + clampedSnapRotation;
        // @Incomplete: placedOnWall
        const positionsOffEntity = getPositionsOffEntity(snapOrigin, entity, placeRotation, false, structureType);
        for (let i = 0; i < positionsOffEntity.length; i++) {
            const position = positionsOffEntity[i];
            candidatePositions.push(position);
        }
    }
    return candidatePositions;
};
const transformsFormGroup = (transform1, transform2) => {
    const dist = (0, utils_1.distance)(transform1.position.x, transform1.position.y, transform2.position.x, transform2.position.y);
    if (dist > 0.1 /* Vars.MULTI_SNAP_POSITION_TOLERANCE */) {
        return false;
    }
    if (Math.abs(transform1.rotation - transform2.rotation) > 0.02 /* Vars.MULTI_SNAP_ROTATION_TOLERANCE */) {
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
const groupTransforms = (transforms, structureType) => {
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
    for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        const firstTransform = group[0];
        let snappedSidesBitset = 0;
        const snappedEntityIDs = [0, 0, 0, 0];
        for (let j = 0; j < group.length; j++) {
            const transform = group[j];
            const bit = 1 << transform.snapDirection;
            if ((snappedSidesBitset & bit)) {
                console.warn("Found multiple snaps to the same side of the structure being placed!");
            }
            else {
                snappedSidesBitset |= bit;
                snappedEntityIDs[transform.snapDirection] = transform.snappedEntityID;
            }
        }
        const placeInfo = {
            position: firstTransform.position,
            rotation: firstTransform.rotation,
            snappedSidesBitset: snappedSidesBitset,
            snappedEntityIDs: snappedEntityIDs,
            entityType: structureType
        };
        placeInfos.push(placeInfo);
    }
    return placeInfos;
};
const filterCandidatePositions = (candidates, regularPlacePosition) => {
    for (let i = 0; i < candidates.length; i++) {
        const transform = candidates[i];
        if (transform.position.calculateDistanceBetween(regularPlacePosition) > 25 /* Settings.STRUCTURE_POSITION_SNAP */) {
            candidates.splice(i, 1);
            i--;
        }
    }
};
function calculateStructurePlaceInfo(placeOrigin, placingEntityRotation, structureType, chunks) {
    const regularPlacePosition = calculateRegularPlacePosition(placeOrigin, placingEntityRotation, structureType);
    const nearbyStructures = getNearbyStructures(regularPlacePosition, chunks);
    const candidatePositions = findCandidatePlacePositions(nearbyStructures, structureType, placingEntityRotation);
    filterCandidatePositions(candidatePositions, regularPlacePosition);
    const placeInfos = groupTransforms(candidatePositions, structureType);
    if (placeInfos.length === 0) {
        return {
            position: regularPlacePosition,
            rotation: placingEntityRotation,
            snappedSidesBitset: 0,
            snappedEntityIDs: [0, 0, 0, 0],
            entityType: structureType,
        };
    }
    else {
        // @Incomplete:
        // - First filter by num snaps
        // - Then filter by proximity to regular place position
        return placeInfos[0];
    }
}
exports.calculateStructurePlaceInfo = calculateStructurePlaceInfo;

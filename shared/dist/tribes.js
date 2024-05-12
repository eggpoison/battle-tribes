"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRIBE_INFO_RECORD = exports.TribeType = void 0;
var TribeType;
(function (TribeType) {
    TribeType[TribeType["plainspeople"] = 0] = "plainspeople";
    TribeType[TribeType["barbarians"] = 1] = "barbarians";
    TribeType[TribeType["frostlings"] = 2] = "frostlings";
    TribeType[TribeType["goblins"] = 3] = "goblins";
})(TribeType = exports.TribeType || (exports.TribeType = {}));
exports.TRIBE_INFO_RECORD = {
    [TribeType.plainspeople]: {
        maxHealthPlayer: 20,
        maxHealthWorker: 14,
        biomes: [0 /* Biome.grasslands */],
        baseTribesmanCap: 4,
        moveSpeedMultiplier: 1
    },
    [TribeType.barbarians]: {
        maxHealthPlayer: 25,
        maxHealthWorker: 18,
        biomes: [1 /* Biome.desert */],
        baseTribesmanCap: 2,
        moveSpeedMultiplier: 0.8
    },
    [TribeType.frostlings]: {
        maxHealthPlayer: 20,
        maxHealthWorker: 14,
        biomes: [2 /* Biome.tundra */],
        baseTribesmanCap: 4,
        moveSpeedMultiplier: 1
    },
    [TribeType.goblins]: {
        maxHealthPlayer: 15,
        maxHealthWorker: 10,
        biomes: [0 /* Biome.grasslands */, 1 /* Biome.desert */, 2 /* Biome.tundra */],
        baseTribesmanCap: 8,
        moveSpeedMultiplier: 1.1
    }
};

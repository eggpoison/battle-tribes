"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecorationType = exports.RIVER_STEPPING_STONE_SIZES = exports.RiverSteppingStoneSize = exports.WaterRockSize = exports.GameDataPacketOptions = exports.HitFlags = void 0;
exports.HitFlags = {
    HIT_BY_FLESH_SWORD: 1 << 0,
    NON_DAMAGING_HIT: 1 << 1
};
var GameDataPacketOptions;
(function (GameDataPacketOptions) {
    GameDataPacketOptions[GameDataPacketOptions["sendVisiblePathfindingNodeOccupances"] = 1] = "sendVisiblePathfindingNodeOccupances";
    GameDataPacketOptions[GameDataPacketOptions["sendVisibleSafetyNodes"] = 2] = "sendVisibleSafetyNodes";
    GameDataPacketOptions[GameDataPacketOptions["sendVisibleBuildingPlans"] = 4] = "sendVisibleBuildingPlans";
    GameDataPacketOptions[GameDataPacketOptions["sendVisibleBuildingSafetys"] = 8] = "sendVisibleBuildingSafetys";
    GameDataPacketOptions[GameDataPacketOptions["sendVisibleRestrictedBuildingAreas"] = 16] = "sendVisibleRestrictedBuildingAreas";
    GameDataPacketOptions[GameDataPacketOptions["sendVisibleWalls"] = 32] = "sendVisibleWalls";
    GameDataPacketOptions[GameDataPacketOptions["sendVisibleWallConnections"] = 64] = "sendVisibleWallConnections";
})(GameDataPacketOptions = exports.GameDataPacketOptions || (exports.GameDataPacketOptions = {}));
var WaterRockSize;
(function (WaterRockSize) {
    WaterRockSize[WaterRockSize["small"] = 0] = "small";
    WaterRockSize[WaterRockSize["large"] = 1] = "large";
})(WaterRockSize = exports.WaterRockSize || (exports.WaterRockSize = {}));
var RiverSteppingStoneSize;
(function (RiverSteppingStoneSize) {
    RiverSteppingStoneSize[RiverSteppingStoneSize["small"] = 0] = "small";
    RiverSteppingStoneSize[RiverSteppingStoneSize["medium"] = 1] = "medium";
    RiverSteppingStoneSize[RiverSteppingStoneSize["large"] = 2] = "large";
})(RiverSteppingStoneSize = exports.RiverSteppingStoneSize || (exports.RiverSteppingStoneSize = {}));
exports.RIVER_STEPPING_STONE_SIZES = {
    [RiverSteppingStoneSize.small]: 32,
    [RiverSteppingStoneSize.medium]: 48,
    [RiverSteppingStoneSize.large]: 56
};
var DecorationType;
(function (DecorationType) {
    DecorationType[DecorationType["pebble"] = 0] = "pebble";
    DecorationType[DecorationType["rock"] = 1] = "rock";
    DecorationType[DecorationType["sandstoneRock"] = 2] = "sandstoneRock";
    DecorationType[DecorationType["sandstoneRockBig"] = 3] = "sandstoneRockBig";
    DecorationType[DecorationType["blackRockSmall"] = 4] = "blackRockSmall";
    DecorationType[DecorationType["blackRock"] = 5] = "blackRock";
    DecorationType[DecorationType["snowPile"] = 6] = "snowPile";
    DecorationType[DecorationType["flower1"] = 7] = "flower1";
    DecorationType[DecorationType["flower2"] = 8] = "flower2";
    DecorationType[DecorationType["flower3"] = 9] = "flower3";
    DecorationType[DecorationType["flower4"] = 10] = "flower4";
})(DecorationType = exports.DecorationType || (exports.DecorationType = {}));

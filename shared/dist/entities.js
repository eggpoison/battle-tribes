"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenericArrowType = exports.DoorToggleType = exports.RockSpikeProjectileSize = exports.FishColour = exports.FrozenYetiAttackType = exports.LimbAction = exports.PlayerCauseOfDeath = exports.SNOWBALL_SIZES = exports.SnowballSize = exports.SlimeSize = exports.CactusFlowerSize = exports.TreeSize = exports.CowSpecies = exports.MOB_ENTITY_TYPES = exports.RESOURCE_ENTITY_TYPES = exports.EntityTypeString = void 0;
exports.EntityTypeString = {
    [0 /* EntityType.cow */]: "cow",
    [1 /* EntityType.zombie */]: "zombie",
    [2 /* EntityType.tombstone */]: "tombstone",
    [3 /* EntityType.tree */]: "tree",
    [4 /* EntityType.workbench */]: "workbench",
    [5 /* EntityType.boulder */]: "boulder",
    [6 /* EntityType.berryBush */]: "berry bush",
    [7 /* EntityType.cactus */]: "cactus",
    [8 /* EntityType.yeti */]: "yeti",
    [9 /* EntityType.iceSpikes */]: "ice spikes",
    [10 /* EntityType.slime */]: "slime",
    [11 /* EntityType.slimewisp */]: "slimewisp",
    [12 /* EntityType.player */]: "player",
    [13 /* EntityType.tribeWorker */]: "tribe worker",
    [14 /* EntityType.tribeWarrior */]: "tribe warrior",
    [15 /* EntityType.tribeTotem */]: "tribe totem",
    [16 /* EntityType.workerHut */]: "worker hut",
    [17 /* EntityType.warriorHut */]: "warrior hut",
    [18 /* EntityType.barrel */]: "barrel",
    [19 /* EntityType.campfire */]: "campfire",
    [20 /* EntityType.furnace */]: "furnace",
    [21 /* EntityType.snowball */]: "snowball",
    [22 /* EntityType.krumblid */]: "krumblid",
    [23 /* EntityType.frozenYeti */]: "frozen yeti",
    [24 /* EntityType.fish */]: "fish",
    [25 /* EntityType.itemEntity */]: "item entity",
    [26 /* EntityType.woodenArrowProjectile */]: "wooden arrow projectile",
    [27 /* EntityType.iceShardProjectile */]: "ice shard projectile",
    [28 /* EntityType.rockSpikeProjectile */]: "rock spike projectile",
    [29 /* EntityType.spearProjectile */]: "spear projectile",
    [30 /* EntityType.researchBench */]: "research bench",
    [31 /* EntityType.wall */]: "wall",
    [32 /* EntityType.slimeSpit */]: "slime spit",
    [33 /* EntityType.spitPoison */]: "spit poison",
    [34 /* EntityType.door */]: "door",
    [35 /* EntityType.battleaxeProjectile */]: "battleaxe projectile",
    [36 /* EntityType.golem */]: "golem",
    [37 /* EntityType.planterBox */]: "planter box",
    [38 /* EntityType.iceArrow */]: "ice arrow",
    [39 /* EntityType.pebblum */]: "pebblum",
    [40 /* EntityType.embrasure */]: "embrasure",
    [41 /* EntityType.tunnel */]: "tunnel",
    [42 /* EntityType.floorSpikes */]: "floor spikes",
    [43 /* EntityType.wallSpikes */]: "wall spikes",
    [44 /* EntityType.floorPunjiSticks */]: "floor punji sticks",
    [45 /* EntityType.wallPunjiSticks */]: "wall punji sticks",
    [46 /* EntityType.blueprintEntity */]: "blueprint entity",
    [47 /* EntityType.ballista */]: "ballista",
    [48 /* EntityType.slingTurret */]: "sling turret",
    [49 /* EntityType.healingTotem */]: "healing totem",
    [50 /* EntityType.plant */]: "plant",
    [51 /* EntityType.fence */]: "fence",
    [52 /* EntityType.fenceGate */]: "fence gate"
};
exports.RESOURCE_ENTITY_TYPES = [3 /* EntityType.tree */, 6 /* EntityType.berryBush */, 9 /* EntityType.iceSpikes */, 7 /* EntityType.cactus */, 5 /* EntityType.boulder */];
exports.MOB_ENTITY_TYPES = [0 /* EntityType.cow */, 1 /* EntityType.zombie */, 8 /* EntityType.yeti */, 10 /* EntityType.slime */, 11 /* EntityType.slimewisp */, 22 /* EntityType.krumblid */, 23 /* EntityType.frozenYeti */];
// @Cleanup: move all of this
var CowSpecies;
(function (CowSpecies) {
    CowSpecies[CowSpecies["brown"] = 0] = "brown";
    CowSpecies[CowSpecies["black"] = 1] = "black";
})(CowSpecies = exports.CowSpecies || (exports.CowSpecies = {}));
var TreeSize;
(function (TreeSize) {
    TreeSize[TreeSize["small"] = 0] = "small";
    TreeSize[TreeSize["large"] = 1] = "large";
})(TreeSize = exports.TreeSize || (exports.TreeSize = {}));
var CactusFlowerSize;
(function (CactusFlowerSize) {
    CactusFlowerSize[CactusFlowerSize["small"] = 0] = "small";
    CactusFlowerSize[CactusFlowerSize["large"] = 1] = "large";
})(CactusFlowerSize = exports.CactusFlowerSize || (exports.CactusFlowerSize = {}));
var SlimeSize;
(function (SlimeSize) {
    SlimeSize[SlimeSize["small"] = 0] = "small";
    SlimeSize[SlimeSize["medium"] = 1] = "medium";
    SlimeSize[SlimeSize["large"] = 2] = "large";
})(SlimeSize = exports.SlimeSize || (exports.SlimeSize = {}));
var SnowballSize;
(function (SnowballSize) {
    SnowballSize[SnowballSize["small"] = 0] = "small";
    SnowballSize[SnowballSize["large"] = 1] = "large";
})(SnowballSize = exports.SnowballSize || (exports.SnowballSize = {}));
exports.SNOWBALL_SIZES = {
    [SnowballSize.small]: 44,
    [SnowballSize.large]: 60
};
// @Cleanup: Rename to something like HitCause
var PlayerCauseOfDeath;
(function (PlayerCauseOfDeath) {
    PlayerCauseOfDeath[PlayerCauseOfDeath["yeti"] = 0] = "yeti";
    PlayerCauseOfDeath[PlayerCauseOfDeath["zombie"] = 1] = "zombie";
    PlayerCauseOfDeath[PlayerCauseOfDeath["poison"] = 2] = "poison";
    PlayerCauseOfDeath[PlayerCauseOfDeath["fire"] = 3] = "fire";
    PlayerCauseOfDeath[PlayerCauseOfDeath["tribe_member"] = 4] = "tribe_member";
    PlayerCauseOfDeath[PlayerCauseOfDeath["arrow"] = 5] = "arrow";
    PlayerCauseOfDeath[PlayerCauseOfDeath["ice_spikes"] = 6] = "ice_spikes";
    PlayerCauseOfDeath[PlayerCauseOfDeath["ice_shards"] = 7] = "ice_shards";
    PlayerCauseOfDeath[PlayerCauseOfDeath["cactus"] = 8] = "cactus";
    PlayerCauseOfDeath[PlayerCauseOfDeath["snowball"] = 9] = "snowball";
    PlayerCauseOfDeath[PlayerCauseOfDeath["slime"] = 10] = "slime";
    PlayerCauseOfDeath[PlayerCauseOfDeath["god"] = 11] = "god";
    PlayerCauseOfDeath[PlayerCauseOfDeath["frozen_yeti"] = 12] = "frozen_yeti";
    PlayerCauseOfDeath[PlayerCauseOfDeath["bloodloss"] = 13] = "bloodloss";
    PlayerCauseOfDeath[PlayerCauseOfDeath["rock_spike"] = 14] = "rock_spike";
    PlayerCauseOfDeath[PlayerCauseOfDeath["lack_of_oxygen"] = 15] = "lack_of_oxygen";
    PlayerCauseOfDeath[PlayerCauseOfDeath["fish"] = 16] = "fish";
    PlayerCauseOfDeath[PlayerCauseOfDeath["spear"] = 17] = "spear";
})(PlayerCauseOfDeath = exports.PlayerCauseOfDeath || (exports.PlayerCauseOfDeath = {}));
var LimbAction;
(function (LimbAction) {
    // @Cleanup: Maybe we can combine all 3 of these into one?
    LimbAction[LimbAction["chargeBow"] = 0] = "chargeBow";
    LimbAction[LimbAction["chargeSpear"] = 1] = "chargeSpear";
    LimbAction[LimbAction["chargeBattleaxe"] = 2] = "chargeBattleaxe";
    LimbAction[LimbAction["loadCrossbow"] = 3] = "loadCrossbow";
    LimbAction[LimbAction["researching"] = 4] = "researching";
    LimbAction[LimbAction["useMedicine"] = 5] = "useMedicine";
    LimbAction[LimbAction["eat"] = 6] = "eat";
    LimbAction[LimbAction["craft"] = 7] = "craft";
    LimbAction[LimbAction["none"] = 8] = "none";
})(LimbAction = exports.LimbAction || (exports.LimbAction = {}));
var FrozenYetiAttackType;
(function (FrozenYetiAttackType) {
    FrozenYetiAttackType[FrozenYetiAttackType["snowThrow"] = 0] = "snowThrow";
    FrozenYetiAttackType[FrozenYetiAttackType["roar"] = 1] = "roar";
    FrozenYetiAttackType[FrozenYetiAttackType["stomp"] = 2] = "stomp";
    FrozenYetiAttackType[FrozenYetiAttackType["bite"] = 3] = "bite";
    FrozenYetiAttackType[FrozenYetiAttackType["none"] = 4] = "none";
})(FrozenYetiAttackType = exports.FrozenYetiAttackType || (exports.FrozenYetiAttackType = {}));
var FishColour;
(function (FishColour) {
    FishColour[FishColour["blue"] = 0] = "blue";
    FishColour[FishColour["gold"] = 1] = "gold";
    FishColour[FishColour["red"] = 2] = "red";
    FishColour[FishColour["lime"] = 3] = "lime";
})(FishColour = exports.FishColour || (exports.FishColour = {}));
var RockSpikeProjectileSize;
(function (RockSpikeProjectileSize) {
    RockSpikeProjectileSize[RockSpikeProjectileSize["small"] = 0] = "small";
    RockSpikeProjectileSize[RockSpikeProjectileSize["medium"] = 1] = "medium";
    RockSpikeProjectileSize[RockSpikeProjectileSize["large"] = 2] = "large";
})(RockSpikeProjectileSize = exports.RockSpikeProjectileSize || (exports.RockSpikeProjectileSize = {}));
var DoorToggleType;
(function (DoorToggleType) {
    DoorToggleType[DoorToggleType["none"] = 0] = "none";
    DoorToggleType[DoorToggleType["close"] = 1] = "close";
    DoorToggleType[DoorToggleType["open"] = 2] = "open";
})(DoorToggleType = exports.DoorToggleType || (exports.DoorToggleType = {}));
var GenericArrowType;
(function (GenericArrowType) {
    GenericArrowType[GenericArrowType["woodenArrow"] = 0] = "woodenArrow";
    GenericArrowType[GenericArrowType["woodenBolt"] = 1] = "woodenBolt";
    GenericArrowType[GenericArrowType["ballistaRock"] = 2] = "ballistaRock";
    GenericArrowType[GenericArrowType["ballistaSlimeball"] = 3] = "ballistaSlimeball";
    GenericArrowType[GenericArrowType["ballistaFrostcicle"] = 4] = "ballistaFrostcicle";
    GenericArrowType[GenericArrowType["slingRock"] = 5] = "slingRock";
})(GenericArrowType = exports.GenericArrowType || (exports.GenericArrowType = {}));

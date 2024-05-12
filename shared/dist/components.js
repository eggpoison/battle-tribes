"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AMMO_INFO_RECORD = exports.PlanterBoxPlant = exports.MATERIAL_TO_ITEM_MAP = exports.BuildingMaterial = exports.TribesmanAIType = exports.BlueprintType = exports.EntityComponents = exports.ServerComponentType = void 0;
const entities_1 = require("./entities");
const items_1 = require("./items");
/*
data sent:
- Array of components (corresponding to the array of component types)

in server:
-
*/
var ServerComponentType;
(function (ServerComponentType) {
    ServerComponentType[ServerComponentType["aiHelper"] = 0] = "aiHelper";
    ServerComponentType[ServerComponentType["arrow"] = 1] = "arrow";
    ServerComponentType[ServerComponentType["berryBush"] = 2] = "berryBush";
    ServerComponentType[ServerComponentType["blueprint"] = 3] = "blueprint";
    ServerComponentType[ServerComponentType["boulder"] = 4] = "boulder";
    ServerComponentType[ServerComponentType["cactus"] = 5] = "cactus";
    ServerComponentType[ServerComponentType["cooking"] = 6] = "cooking";
    ServerComponentType[ServerComponentType["cow"] = 7] = "cow";
    ServerComponentType[ServerComponentType["door"] = 8] = "door";
    ServerComponentType[ServerComponentType["fish"] = 9] = "fish";
    ServerComponentType[ServerComponentType["frozenYeti"] = 10] = "frozenYeti";
    ServerComponentType[ServerComponentType["golem"] = 11] = "golem";
    ServerComponentType[ServerComponentType["health"] = 12] = "health";
    ServerComponentType[ServerComponentType["hut"] = 13] = "hut";
    ServerComponentType[ServerComponentType["iceShard"] = 14] = "iceShard";
    ServerComponentType[ServerComponentType["iceSpikes"] = 15] = "iceSpikes";
    ServerComponentType[ServerComponentType["inventory"] = 16] = "inventory";
    ServerComponentType[ServerComponentType["inventoryUse"] = 17] = "inventoryUse";
    ServerComponentType[ServerComponentType["item"] = 18] = "item";
    ServerComponentType[ServerComponentType["pebblum"] = 19] = "pebblum";
    ServerComponentType[ServerComponentType["physics"] = 20] = "physics";
    ServerComponentType[ServerComponentType["player"] = 21] = "player";
    ServerComponentType[ServerComponentType["rockSpike"] = 22] = "rockSpike";
    ServerComponentType[ServerComponentType["slime"] = 23] = "slime";
    ServerComponentType[ServerComponentType["slimeSpit"] = 24] = "slimeSpit";
    ServerComponentType[ServerComponentType["slimewisp"] = 25] = "slimewisp";
    ServerComponentType[ServerComponentType["snowball"] = 26] = "snowball";
    ServerComponentType[ServerComponentType["statusEffect"] = 27] = "statusEffect";
    ServerComponentType[ServerComponentType["throwingProjectile"] = 28] = "throwingProjectile";
    ServerComponentType[ServerComponentType["tombstone"] = 29] = "tombstone";
    ServerComponentType[ServerComponentType["totemBanner"] = 30] = "totemBanner";
    ServerComponentType[ServerComponentType["tree"] = 31] = "tree";
    ServerComponentType[ServerComponentType["tribe"] = 32] = "tribe";
    ServerComponentType[ServerComponentType["tribeMember"] = 33] = "tribeMember";
    ServerComponentType[ServerComponentType["tribesman"] = 34] = "tribesman";
    ServerComponentType[ServerComponentType["turret"] = 35] = "turret";
    ServerComponentType[ServerComponentType["yeti"] = 36] = "yeti";
    ServerComponentType[ServerComponentType["zombie"] = 37] = "zombie";
    ServerComponentType[ServerComponentType["ammoBox"] = 38] = "ammoBox";
    ServerComponentType[ServerComponentType["wanderAI"] = 39] = "wanderAI";
    ServerComponentType[ServerComponentType["escapeAI"] = 40] = "escapeAI";
    ServerComponentType[ServerComponentType["followAI"] = 41] = "followAI";
    ServerComponentType[ServerComponentType["researchBench"] = 42] = "researchBench";
    ServerComponentType[ServerComponentType["tunnel"] = 43] = "tunnel";
    ServerComponentType[ServerComponentType["buildingMaterial"] = 44] = "buildingMaterial";
    ServerComponentType[ServerComponentType["spikes"] = 45] = "spikes";
    ServerComponentType[ServerComponentType["tribeWarrior"] = 46] = "tribeWarrior";
    ServerComponentType[ServerComponentType["healingTotem"] = 47] = "healingTotem";
    ServerComponentType[ServerComponentType["planterBox"] = 48] = "planterBox";
    ServerComponentType[ServerComponentType["plant"] = 49] = "plant";
    ServerComponentType[ServerComponentType["fenceConnection"] = 50] = "fenceConnection";
    ServerComponentType[ServerComponentType["fence"] = 51] = "fence";
    ServerComponentType[ServerComponentType["fenceGate"] = 52] = "fenceGate";
})(ServerComponentType = exports.ServerComponentType || (exports.ServerComponentType = {}));
exports.EntityComponents = {
    [0 /* EntityType.cow */]: [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.aiHelper, ServerComponentType.wanderAI, ServerComponentType.escapeAI, ServerComponentType.followAI, ServerComponentType.cow],
    [1 /* EntityType.zombie */]: [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.zombie, ServerComponentType.wanderAI, ServerComponentType.aiHelper, ServerComponentType.inventory, ServerComponentType.inventoryUse],
    [2 /* EntityType.tombstone */]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tombstone],
    [3 /* EntityType.tree */]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tree],
    [4 /* EntityType.workbench */]: [ServerComponentType.health, ServerComponentType.statusEffect],
    [5 /* EntityType.boulder */]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.boulder],
    [6 /* EntityType.berryBush */]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.berryBush],
    [7 /* EntityType.cactus */]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.cactus],
    [8 /* EntityType.yeti */]: [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.wanderAI, ServerComponentType.aiHelper, ServerComponentType.yeti],
    [9 /* EntityType.iceSpikes */]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.iceSpikes],
    [10 /* EntityType.slime */]: [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.slime, ServerComponentType.wanderAI, ServerComponentType.aiHelper],
    [11 /* EntityType.slimewisp */]: [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.slimewisp, ServerComponentType.wanderAI, ServerComponentType.aiHelper],
    [12 /* EntityType.player */]: [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.tribeMember, ServerComponentType.inventory, ServerComponentType.inventoryUse, ServerComponentType.player],
    [13 /* EntityType.tribeWorker */]: [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.tribeMember, ServerComponentType.inventory, ServerComponentType.inventoryUse, ServerComponentType.tribesman],
    [14 /* EntityType.tribeWarrior */]: [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.tribeMember, ServerComponentType.inventory, ServerComponentType.inventoryUse, ServerComponentType.tribesman, ServerComponentType.tribeWarrior],
    [15 /* EntityType.tribeTotem */]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.totemBanner],
    [16 /* EntityType.workerHut */]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.hut],
    [17 /* EntityType.warriorHut */]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.hut],
    [18 /* EntityType.barrel */]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.inventory],
    [19 /* EntityType.campfire */]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.inventory, ServerComponentType.cooking],
    [20 /* EntityType.furnace */]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.inventory, ServerComponentType.cooking],
    [21 /* EntityType.snowball */]: [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.snowball],
    [22 /* EntityType.krumblid */]: [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.wanderAI, ServerComponentType.followAI, ServerComponentType.escapeAI, ServerComponentType.aiHelper],
    [23 /* EntityType.frozenYeti */]: [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.wanderAI, ServerComponentType.frozenYeti, ServerComponentType.aiHelper],
    [24 /* EntityType.fish */]: [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.wanderAI, ServerComponentType.escapeAI, ServerComponentType.aiHelper, ServerComponentType.fish],
    [25 /* EntityType.itemEntity */]: [ServerComponentType.physics, ServerComponentType.item],
    [26 /* EntityType.woodenArrowProjectile */]: [ServerComponentType.physics, ServerComponentType.tribe, ServerComponentType.arrow],
    [27 /* EntityType.iceShardProjectile */]: [ServerComponentType.physics, ServerComponentType.iceShard],
    [28 /* EntityType.rockSpikeProjectile */]: [ServerComponentType.rockSpike],
    [29 /* EntityType.spearProjectile */]: [ServerComponentType.physics, ServerComponentType.throwingProjectile],
    [30 /* EntityType.researchBench */]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.researchBench],
    [31 /* EntityType.wall */]: [ServerComponentType.health, ServerComponentType.tribe, ServerComponentType.buildingMaterial],
    [32 /* EntityType.slimeSpit */]: [ServerComponentType.physics, ServerComponentType.slimeSpit],
    [33 /* EntityType.spitPoison */]: [],
    [34 /* EntityType.door */]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.door, ServerComponentType.tribe, ServerComponentType.buildingMaterial],
    [35 /* EntityType.battleaxeProjectile */]: [ServerComponentType.physics, ServerComponentType.throwingProjectile],
    [36 /* EntityType.golem */]: [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.golem],
    [37 /* EntityType.planterBox */]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.planterBox],
    [38 /* EntityType.iceArrow */]: [ServerComponentType.physics, ServerComponentType.tribe],
    [39 /* EntityType.pebblum */]: [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.pebblum],
    [40 /* EntityType.embrasure */]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.buildingMaterial],
    [42 /* EntityType.floorSpikes */]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.spikes, ServerComponentType.buildingMaterial],
    [43 /* EntityType.wallSpikes */]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.spikes, ServerComponentType.buildingMaterial],
    [44 /* EntityType.floorPunjiSticks */]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.spikes],
    [45 /* EntityType.wallPunjiSticks */]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.spikes],
    [46 /* EntityType.blueprintEntity */]: [ServerComponentType.health, ServerComponentType.blueprint, ServerComponentType.tribe],
    [47 /* EntityType.ballista */]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.turret, ServerComponentType.aiHelper, ServerComponentType.ammoBox, ServerComponentType.inventory],
    [48 /* EntityType.slingTurret */]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.turret, ServerComponentType.aiHelper],
    [41 /* EntityType.tunnel */]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.tunnel, ServerComponentType.buildingMaterial],
    [49 /* EntityType.healingTotem */]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.healingTotem],
    [50 /* EntityType.plant */]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.plant],
    [51 /* EntityType.fence */]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.fenceConnection, ServerComponentType.fence],
    [52 /* EntityType.fenceGate */]: [ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.fenceConnection, ServerComponentType.fenceGate]
};
const _ComponentData = {
    [ServerComponentType.aiHelper]: () => 0,
    [ServerComponentType.arrow]: () => 0,
    [ServerComponentType.ammoBox]: () => 0,
    [ServerComponentType.berryBush]: () => 0,
    [ServerComponentType.blueprint]: () => 0,
    [ServerComponentType.boulder]: () => 0,
    [ServerComponentType.cactus]: () => 0,
    [ServerComponentType.cooking]: () => 0,
    [ServerComponentType.cow]: () => 0,
    [ServerComponentType.door]: () => 0,
    [ServerComponentType.fish]: () => 0,
    [ServerComponentType.frozenYeti]: () => 0,
    [ServerComponentType.golem]: () => 0,
    [ServerComponentType.health]: () => 0,
    [ServerComponentType.hut]: () => 0,
    [ServerComponentType.iceShard]: () => 0,
    [ServerComponentType.iceSpikes]: () => 0,
    [ServerComponentType.inventory]: () => 0,
    [ServerComponentType.inventoryUse]: () => 0,
    [ServerComponentType.item]: () => 0,
    [ServerComponentType.pebblum]: () => 0,
    [ServerComponentType.physics]: () => 0,
    [ServerComponentType.player]: () => 0,
    [ServerComponentType.rockSpike]: () => 0,
    [ServerComponentType.slime]: () => 0,
    [ServerComponentType.slimeSpit]: () => 0,
    [ServerComponentType.slimewisp]: () => 0,
    [ServerComponentType.snowball]: () => 0,
    [ServerComponentType.statusEffect]: () => 0,
    [ServerComponentType.throwingProjectile]: () => 0,
    [ServerComponentType.tombstone]: () => 0,
    [ServerComponentType.totemBanner]: () => 0,
    [ServerComponentType.tree]: () => 0,
    [ServerComponentType.tribe]: () => 0,
    [ServerComponentType.tribeMember]: () => 0,
    [ServerComponentType.tribesman]: () => 0,
    [ServerComponentType.turret]: () => 0,
    [ServerComponentType.yeti]: () => 0,
    [ServerComponentType.zombie]: () => 0,
    [ServerComponentType.wanderAI]: () => 0,
    [ServerComponentType.escapeAI]: () => 0,
    [ServerComponentType.followAI]: () => 0,
    [ServerComponentType.researchBench]: () => 0,
    [ServerComponentType.tunnel]: () => 0,
    [ServerComponentType.buildingMaterial]: () => 0,
    [ServerComponentType.spikes]: () => 0,
    [ServerComponentType.tribeWarrior]: () => 0,
    [ServerComponentType.healingTotem]: () => 0,
    [ServerComponentType.planterBox]: () => 0,
    [ServerComponentType.plant]: () => 0,
    [ServerComponentType.fenceConnection]: () => 0,
    [ServerComponentType.fence]: () => 0,
    [ServerComponentType.fenceGate]: () => 0
};
/* Blueprint Component */
var BlueprintType;
(function (BlueprintType) {
    BlueprintType[BlueprintType["stoneWall"] = 0] = "stoneWall";
    BlueprintType[BlueprintType["woodenDoor"] = 1] = "woodenDoor";
    BlueprintType[BlueprintType["stoneDoor"] = 2] = "stoneDoor";
    BlueprintType[BlueprintType["stoneDoorUpgrade"] = 3] = "stoneDoorUpgrade";
    BlueprintType[BlueprintType["woodenEmbrasure"] = 4] = "woodenEmbrasure";
    BlueprintType[BlueprintType["stoneEmbrasure"] = 5] = "stoneEmbrasure";
    BlueprintType[BlueprintType["stoneEmbrasureUpgrade"] = 6] = "stoneEmbrasureUpgrade";
    BlueprintType[BlueprintType["woodenTunnel"] = 7] = "woodenTunnel";
    BlueprintType[BlueprintType["stoneTunnel"] = 8] = "stoneTunnel";
    BlueprintType[BlueprintType["stoneTunnelUpgrade"] = 9] = "stoneTunnelUpgrade";
    BlueprintType[BlueprintType["ballista"] = 10] = "ballista";
    BlueprintType[BlueprintType["slingTurret"] = 11] = "slingTurret";
    BlueprintType[BlueprintType["stoneFloorSpikes"] = 12] = "stoneFloorSpikes";
    BlueprintType[BlueprintType["stoneWallSpikes"] = 13] = "stoneWallSpikes";
    BlueprintType[BlueprintType["warriorHutUpgrade"] = 14] = "warriorHutUpgrade";
    BlueprintType[BlueprintType["fenceGate"] = 15] = "fenceGate";
})(BlueprintType = exports.BlueprintType || (exports.BlueprintType = {}));
/* Tribesman Component */
var TribesmanAIType;
(function (TribesmanAIType) {
    TribesmanAIType[TribesmanAIType["escaping"] = 0] = "escaping";
    TribesmanAIType[TribesmanAIType["attacking"] = 1] = "attacking";
    TribesmanAIType[TribesmanAIType["harvestingResources"] = 2] = "harvestingResources";
    TribesmanAIType[TribesmanAIType["pickingUpDroppedItems"] = 3] = "pickingUpDroppedItems";
    TribesmanAIType[TribesmanAIType["haulingResources"] = 4] = "haulingResources";
    TribesmanAIType[TribesmanAIType["grabbingFood"] = 5] = "grabbingFood";
    TribesmanAIType[TribesmanAIType["patrolling"] = 6] = "patrolling";
    TribesmanAIType[TribesmanAIType["eating"] = 7] = "eating";
    TribesmanAIType[TribesmanAIType["repairing"] = 8] = "repairing";
    TribesmanAIType[TribesmanAIType["assistingOtherTribesmen"] = 9] = "assistingOtherTribesmen";
    TribesmanAIType[TribesmanAIType["building"] = 10] = "building";
    TribesmanAIType[TribesmanAIType["crafting"] = 11] = "crafting";
    TribesmanAIType[TribesmanAIType["researching"] = 12] = "researching";
    TribesmanAIType[TribesmanAIType["giftingItems"] = 13] = "giftingItems";
    TribesmanAIType[TribesmanAIType["idle"] = 14] = "idle";
    TribesmanAIType[TribesmanAIType["recruiting"] = 15] = "recruiting";
})(TribesmanAIType = exports.TribesmanAIType || (exports.TribesmanAIType = {}));
/* Building Material Component Data */
var BuildingMaterial;
(function (BuildingMaterial) {
    BuildingMaterial[BuildingMaterial["wood"] = 0] = "wood";
    BuildingMaterial[BuildingMaterial["stone"] = 1] = "stone";
})(BuildingMaterial = exports.BuildingMaterial || (exports.BuildingMaterial = {}));
exports.MATERIAL_TO_ITEM_MAP = {
    [BuildingMaterial.wood]: items_1.ItemType.wood,
    [BuildingMaterial.stone]: items_1.ItemType.rock
};
/* Plant Component Data */
var PlanterBoxPlant;
(function (PlanterBoxPlant) {
    PlanterBoxPlant[PlanterBoxPlant["tree"] = 0] = "tree";
    PlanterBoxPlant[PlanterBoxPlant["berryBush"] = 1] = "berryBush";
    PlanterBoxPlant[PlanterBoxPlant["iceSpikes"] = 2] = "iceSpikes";
})(PlanterBoxPlant = exports.PlanterBoxPlant || (exports.PlanterBoxPlant = {}));
exports.AMMO_INFO_RECORD = {
    [items_1.ItemType.wood]: {
        type: entities_1.GenericArrowType.woodenBolt,
        damage: 5,
        knockback: 150,
        shotCooldownTicks: 2.5 * 60 /* Settings.TPS */,
        reloadTimeTicks: Math.floor(0.4 * 60 /* Settings.TPS */),
        projectileSpeed: 1100,
        hitboxWidth: 12,
        hitboxHeight: 80,
        ammoMultiplier: 3,
        statusEffect: null
    },
    [items_1.ItemType.rock]: {
        type: entities_1.GenericArrowType.ballistaRock,
        damage: 8,
        knockback: 350,
        shotCooldownTicks: 3 * 60 /* Settings.TPS */,
        reloadTimeTicks: Math.floor(0.5 * 60 /* Settings.TPS */),
        projectileSpeed: 1000,
        hitboxWidth: 12,
        hitboxHeight: 80,
        ammoMultiplier: 3,
        statusEffect: null
    },
    [items_1.ItemType.slimeball]: {
        type: entities_1.GenericArrowType.ballistaSlimeball,
        damage: 3,
        knockback: 0,
        shotCooldownTicks: 2 * 60 /* Settings.TPS */,
        reloadTimeTicks: Math.floor(0.4 * 60 /* Settings.TPS */),
        projectileSpeed: 800,
        hitboxWidth: 12,
        hitboxHeight: 80,
        ammoMultiplier: 4,
        statusEffect: {
            type: 4 /* StatusEffect.poisoned */,
            durationTicks: 2.5 * 60 /* Settings.TPS */
        }
    },
    [items_1.ItemType.frostcicle]: {
        type: entities_1.GenericArrowType.ballistaFrostcicle,
        damage: 1,
        knockback: 50,
        shotCooldownTicks: 0.5 * 60 /* Settings.TPS */,
        reloadTimeTicks: Math.floor(0.15 * 60 /* Settings.TPS */),
        projectileSpeed: 1500,
        hitboxWidth: 12,
        hitboxHeight: 80,
        ammoMultiplier: 6,
        statusEffect: {
            type: 2 /* StatusEffect.freezing */,
            durationTicks: 1 * 60 /* Settings.TPS */
        }
    }
};

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BALLISTA_AMMO_TYPES = exports.getItemStackSize = exports.itemIsStackable = exports.Item = exports.ITEM_INFO_RECORD = exports.ITEM_TYPE_RECORD = exports.ItemType = void 0;
var ItemType;
(function (ItemType) {
    ItemType[ItemType["wood"] = 0] = "wood";
    ItemType[ItemType["workbench"] = 1] = "workbench";
    ItemType[ItemType["wooden_sword"] = 2] = "wooden_sword";
    ItemType[ItemType["wooden_axe"] = 3] = "wooden_axe";
    ItemType[ItemType["wooden_pickaxe"] = 4] = "wooden_pickaxe";
    ItemType[ItemType["berry"] = 5] = "berry";
    ItemType[ItemType["raw_beef"] = 6] = "raw_beef";
    ItemType[ItemType["cooked_beef"] = 7] = "cooked_beef";
    ItemType[ItemType["rock"] = 8] = "rock";
    ItemType[ItemType["stone_sword"] = 9] = "stone_sword";
    ItemType[ItemType["stone_axe"] = 10] = "stone_axe";
    ItemType[ItemType["stone_pickaxe"] = 11] = "stone_pickaxe";
    ItemType[ItemType["stone_hammer"] = 12] = "stone_hammer";
    ItemType[ItemType["leather"] = 13] = "leather";
    ItemType[ItemType["leather_backpack"] = 14] = "leather_backpack";
    ItemType[ItemType["cactus_spine"] = 15] = "cactus_spine";
    ItemType[ItemType["yeti_hide"] = 16] = "yeti_hide";
    ItemType[ItemType["frostcicle"] = 17] = "frostcicle";
    ItemType[ItemType["slimeball"] = 18] = "slimeball";
    ItemType[ItemType["eyeball"] = 19] = "eyeball";
    ItemType[ItemType["flesh_sword"] = 20] = "flesh_sword";
    ItemType[ItemType["tribe_totem"] = 21] = "tribe_totem";
    ItemType[ItemType["worker_hut"] = 22] = "worker_hut";
    ItemType[ItemType["barrel"] = 23] = "barrel";
    ItemType[ItemType["frost_armour"] = 24] = "frost_armour";
    ItemType[ItemType["campfire"] = 25] = "campfire";
    ItemType[ItemType["furnace"] = 26] = "furnace";
    ItemType[ItemType["wooden_bow"] = 27] = "wooden_bow";
    ItemType[ItemType["meat_suit"] = 28] = "meat_suit";
    ItemType[ItemType["deepfrost_heart"] = 29] = "deepfrost_heart";
    ItemType[ItemType["deepfrost_sword"] = 30] = "deepfrost_sword";
    ItemType[ItemType["deepfrost_pickaxe"] = 31] = "deepfrost_pickaxe";
    ItemType[ItemType["deepfrost_axe"] = 32] = "deepfrost_axe";
    ItemType[ItemType["deepfrost_armour"] = 33] = "deepfrost_armour";
    ItemType[ItemType["raw_fish"] = 34] = "raw_fish";
    ItemType[ItemType["cooked_fish"] = 35] = "cooked_fish";
    ItemType[ItemType["fishlord_suit"] = 36] = "fishlord_suit";
    ItemType[ItemType["gathering_gloves"] = 37] = "gathering_gloves";
    ItemType[ItemType["throngler"] = 38] = "throngler";
    ItemType[ItemType["leather_armour"] = 39] = "leather_armour";
    ItemType[ItemType["spear"] = 40] = "spear";
    ItemType[ItemType["paper"] = 41] = "paper";
    ItemType[ItemType["research_bench"] = 42] = "research_bench";
    ItemType[ItemType["wooden_wall"] = 43] = "wooden_wall";
    ItemType[ItemType["wooden_hammer"] = 44] = "wooden_hammer";
    ItemType[ItemType["stone_battleaxe"] = 45] = "stone_battleaxe";
    ItemType[ItemType["living_rock"] = 46] = "living_rock";
    ItemType[ItemType["planter_box"] = 47] = "planter_box";
    ItemType[ItemType["reinforced_bow"] = 48] = "reinforced_bow";
    ItemType[ItemType["crossbow"] = 49] = "crossbow";
    ItemType[ItemType["ice_bow"] = 50] = "ice_bow";
    ItemType[ItemType["poop"] = 51] = "poop";
    ItemType[ItemType["wooden_spikes"] = 52] = "wooden_spikes";
    ItemType[ItemType["punji_sticks"] = 53] = "punji_sticks";
    ItemType[ItemType["ballista"] = 54] = "ballista";
    ItemType[ItemType["sling_turret"] = 55] = "sling_turret";
    ItemType[ItemType["healing_totem"] = 56] = "healing_totem";
    ItemType[ItemType["leaf"] = 57] = "leaf";
    ItemType[ItemType["herbal_medicine"] = 58] = "herbal_medicine";
    ItemType[ItemType["leaf_suit"] = 59] = "leaf_suit";
    ItemType[ItemType["seed"] = 60] = "seed";
    ItemType[ItemType["gardening_gloves"] = 61] = "gardening_gloves";
    ItemType[ItemType["wooden_fence"] = 62] = "wooden_fence";
})(ItemType = exports.ItemType || (exports.ItemType = {}));
exports.ITEM_TYPE_RECORD = {
    [ItemType.wood]: "material",
    [ItemType.workbench]: "placeable",
    [ItemType.wooden_sword]: "sword",
    [ItemType.wooden_axe]: "axe",
    [ItemType.wooden_pickaxe]: "pickaxe",
    [ItemType.wooden_hammer]: "hammer",
    [ItemType.berry]: "healing",
    [ItemType.raw_beef]: "healing",
    [ItemType.cooked_beef]: "healing",
    [ItemType.rock]: "material",
    [ItemType.stone_sword]: "sword",
    [ItemType.stone_axe]: "axe",
    [ItemType.stone_pickaxe]: "pickaxe",
    [ItemType.stone_hammer]: "hammer",
    [ItemType.leather]: "material",
    [ItemType.leather_backpack]: "backpack",
    [ItemType.cactus_spine]: "material",
    [ItemType.yeti_hide]: "material",
    [ItemType.frostcicle]: "material",
    [ItemType.slimeball]: "material",
    [ItemType.eyeball]: "material",
    [ItemType.flesh_sword]: "sword",
    [ItemType.tribe_totem]: "placeable",
    [ItemType.worker_hut]: "placeable",
    [ItemType.barrel]: "placeable",
    [ItemType.frost_armour]: "armour",
    [ItemType.campfire]: "placeable",
    [ItemType.furnace]: "placeable",
    [ItemType.wooden_bow]: "bow",
    [ItemType.meat_suit]: "armour",
    [ItemType.deepfrost_heart]: "material",
    [ItemType.deepfrost_sword]: "sword",
    [ItemType.deepfrost_pickaxe]: "pickaxe",
    [ItemType.deepfrost_axe]: "axe",
    [ItemType.deepfrost_armour]: "armour",
    [ItemType.raw_fish]: "healing",
    [ItemType.cooked_fish]: "healing",
    [ItemType.fishlord_suit]: "armour",
    [ItemType.gathering_gloves]: "glove",
    [ItemType.throngler]: "sword",
    [ItemType.leather_armour]: "armour",
    [ItemType.spear]: "spear",
    [ItemType.paper]: "material",
    [ItemType.research_bench]: "placeable",
    [ItemType.wooden_wall]: "placeable",
    [ItemType.stone_battleaxe]: "battleaxe",
    [ItemType.living_rock]: "material",
    [ItemType.planter_box]: "placeable",
    [ItemType.reinforced_bow]: "bow",
    [ItemType.crossbow]: "crossbow",
    [ItemType.ice_bow]: "bow",
    [ItemType.poop]: "material",
    [ItemType.wooden_spikes]: "placeable",
    [ItemType.punji_sticks]: "placeable",
    [ItemType.ballista]: "placeable",
    [ItemType.sling_turret]: "placeable",
    [ItemType.healing_totem]: "placeable",
    [ItemType.leaf]: "material",
    [ItemType.herbal_medicine]: "healing",
    [ItemType.leaf_suit]: "armour",
    [ItemType.seed]: "material",
    [ItemType.gardening_gloves]: "glove",
    [ItemType.wooden_fence]: "placeable"
};
exports.ITEM_INFO_RECORD = {
    [ItemType.wood]: {
        stackSize: 99
    },
    [ItemType.workbench]: {
        stackSize: 99,
        entityType: 4 /* EntityType.workbench */
    },
    [ItemType.wooden_sword]: {
        stackSize: 1,
        toolType: "sword",
        damage: 2,
        knockback: 150,
        attackCooldown: 0.3,
        level: 1
    },
    [ItemType.wooden_axe]: {
        stackSize: 1,
        toolType: "axe",
        damage: 3,
        knockback: 100,
        attackCooldown: 0.5,
        level: 1
    },
    [ItemType.wooden_pickaxe]: {
        stackSize: 1,
        toolType: "pickaxe",
        damage: 5,
        knockback: 100,
        attackCooldown: 0.5,
        level: 1
    },
    [ItemType.wooden_hammer]: {
        stackSize: 1,
        toolType: "hammer",
        damage: 2,
        knockback: 150,
        attackCooldown: 0.7,
        level: 1,
        repairAmount: 3,
        workAmount: 1
    },
    [ItemType.berry]: {
        stackSize: 99,
        healAmount: 1,
        consumeTime: 0.75,
        consumableItemCategory: 0 /* ConsumableItemCategory.food */
    },
    [ItemType.raw_beef]: {
        stackSize: 99,
        healAmount: 1,
        consumeTime: 1.5,
        consumableItemCategory: 0 /* ConsumableItemCategory.food */
    },
    [ItemType.cooked_beef]: {
        stackSize: 99,
        healAmount: 5,
        consumeTime: 1.5,
        consumableItemCategory: 0 /* ConsumableItemCategory.food */
    },
    [ItemType.rock]: {
        stackSize: 99
    },
    [ItemType.stone_sword]: {
        stackSize: 1,
        toolType: "sword",
        damage: 3,
        knockback: 150,
        attackCooldown: 0.3,
        level: 2
    },
    [ItemType.stone_axe]: {
        stackSize: 1,
        toolType: "axe",
        damage: 5,
        knockback: 100,
        attackCooldown: 0.5,
        level: 2
    },
    [ItemType.stone_pickaxe]: {
        stackSize: 1,
        toolType: "pickaxe",
        damage: 8,
        knockback: 100,
        attackCooldown: 0.5,
        level: 2
    },
    [ItemType.stone_hammer]: {
        stackSize: 1,
        toolType: "hammer",
        damage: 3,
        knockback: 150,
        attackCooldown: 0.7,
        level: 2,
        repairAmount: 5,
        workAmount: 2
    },
    [ItemType.leather]: {
        stackSize: 99
    },
    [ItemType.leather_backpack]: {
        inventoryWidth: 2,
        inventoryHeight: 2,
        level: 1
    },
    [ItemType.cactus_spine]: {
        stackSize: 99
    },
    [ItemType.yeti_hide]: {
        stackSize: 99
    },
    [ItemType.frostcicle]: {
        stackSize: 99
    },
    [ItemType.slimeball]: {
        stackSize: 99
    },
    [ItemType.eyeball]: {
        stackSize: 99
    },
    [ItemType.flesh_sword]: {
        stackSize: 1,
        toolType: "sword",
        damage: 2,
        knockback: 0,
        attackCooldown: 0.3,
        level: 1.5
    },
    [ItemType.tribe_totem]: {
        stackSize: 99,
        entityType: 15 /* EntityType.tribeTotem */
    },
    [ItemType.worker_hut]: {
        stackSize: 99,
        entityType: 16 /* EntityType.workerHut */
    },
    [ItemType.barrel]: {
        stackSize: 99,
        entityType: 18 /* EntityType.barrel */
    },
    [ItemType.frost_armour]: {
        defence: 0.25,
        level: 2
    },
    [ItemType.campfire]: {
        stackSize: 99,
        entityType: 19 /* EntityType.campfire */
    },
    [ItemType.furnace]: {
        stackSize: 99,
        entityType: 20 /* EntityType.furnace */
    },
    [ItemType.wooden_bow]: {
        projectileDamage: 4,
        projectileKnockback: 150,
        shotCooldownTicks: 1 * 60 /* Settings.TPS */,
        projectileSpeed: 1100,
        airResistance: 400,
        level: 2
    },
    [ItemType.reinforced_bow]: {
        projectileDamage: 6,
        projectileKnockback: 200,
        shotCooldownTicks: 1 * 60 /* Settings.TPS */,
        projectileSpeed: 1500,
        airResistance: 300,
        level: 2.5
    },
    [ItemType.ice_bow]: {
        projectileDamage: 0,
        projectileKnockback: 0,
        shotCooldownTicks: 1.25 * 60 /* Settings.TPS */,
        projectileSpeed: 1100,
        airResistance: 400,
        level: 2.5
    },
    [ItemType.crossbow]: {
        projectileDamage: 6,
        projectileKnockback: 200,
        shotCooldownTicks: 1 * 60 /* Settings.TPS */,
        projectileSpeed: 1500,
        airResistance: 300,
        level: 2.5
    },
    [ItemType.meat_suit]: {
        defence: 0,
        level: 1
    },
    [ItemType.deepfrost_heart]: {
        stackSize: 99
    },
    [ItemType.deepfrost_sword]: {
        stackSize: 1,
        toolType: "sword",
        damage: 4,
        knockback: 170,
        attackCooldown: 0.3,
        level: 3
    },
    [ItemType.deepfrost_pickaxe]: {
        stackSize: 1,
        toolType: "pickaxe",
        damage: 13,
        knockback: 100,
        attackCooldown: 0.5,
        level: 3
    },
    [ItemType.deepfrost_axe]: {
        stackSize: 1,
        toolType: "axe",
        damage: 8,
        knockback: 100,
        attackCooldown: 0.5,
        level: 3
    },
    [ItemType.deepfrost_armour]: {
        defence: 0.4,
        level: 3
    },
    [ItemType.raw_fish]: {
        stackSize: 99,
        consumeTime: 2,
        healAmount: 1,
        consumableItemCategory: 0 /* ConsumableItemCategory.food */
    },
    [ItemType.cooked_fish]: {
        stackSize: 99,
        consumeTime: 1.5,
        healAmount: 4,
        consumableItemCategory: 0 /* ConsumableItemCategory.food */
    },
    [ItemType.fishlord_suit]: {
        defence: 0.1,
        level: 1
    },
    [ItemType.gathering_gloves]: {
        level: 1
    },
    [ItemType.throngler]: {
        stackSize: 1,
        toolType: "sword",
        damage: 2,
        knockback: 400,
        attackCooldown: 0.5,
        level: 2.5
    },
    [ItemType.leather_armour]: {
        defence: 0.1,
        level: 1
    },
    [ItemType.spear]: {
        stackSize: 99,
        toolType: "spear",
        damage: 4,
        knockback: 300,
        attackCooldown: 0.8,
        level: 2.5
    },
    [ItemType.paper]: {
        stackSize: 99
    },
    [ItemType.research_bench]: {
        stackSize: 99,
        entityType: 30 /* EntityType.researchBench */
    },
    [ItemType.wooden_wall]: {
        stackSize: 99,
        entityType: 31 /* EntityType.wall */
    },
    [ItemType.stone_battleaxe]: {
        stackSize: 1,
        toolType: "battleaxe",
        damage: 3,
        knockback: 150,
        attackCooldown: 0.5,
        level: 2.5
    },
    [ItemType.living_rock]: {
        stackSize: 99
    },
    [ItemType.planter_box]: {
        stackSize: 99,
        entityType: 37 /* EntityType.planterBox */
    },
    [ItemType.poop]: {
        stackSize: 99
    },
    [ItemType.wooden_spikes]: {
        stackSize: 99,
        // @Incomplete?
        entityType: 42 /* EntityType.floorSpikes */
    },
    [ItemType.punji_sticks]: {
        stackSize: 99,
        // @Incomplete?
        entityType: 44 /* EntityType.floorPunjiSticks */
    },
    [ItemType.ballista]: {
        stackSize: 99,
        entityType: 47 /* EntityType.ballista */
    },
    [ItemType.sling_turret]: {
        stackSize: 99,
        entityType: 48 /* EntityType.slingTurret */
    },
    [ItemType.healing_totem]: {
        stackSize: 99,
        entityType: 49 /* EntityType.healingTotem */
    },
    [ItemType.leaf]: {
        stackSize: 99
    },
    [ItemType.herbal_medicine]: {
        stackSize: 99,
        consumeTime: 1.5,
        healAmount: 3,
        consumableItemCategory: 1 /* ConsumableItemCategory.medicine */
    },
    [ItemType.leaf_suit]: {
        defence: 0,
        level: 1
    },
    [ItemType.seed]: {
        stackSize: 99
    },
    [ItemType.gardening_gloves]: {
        level: 2
    },
    [ItemType.wooden_fence]: {
        stackSize: 99,
        entityType: 51 /* EntityType.fence */
    }
};
class Item {
    constructor(itemType, count, id) {
        this.type = itemType;
        this.count = count;
        this.id = id;
    }
}
exports.Item = Item;
/**
 * Checks whether a given item type is able to be stacked.
 * @param itemType The type of item to check.
 * @returns Whether the item type is able to be stacked.
 */
function itemIsStackable(itemType) {
    return exports.ITEM_INFO_RECORD[itemType].hasOwnProperty("stackSize");
}
exports.itemIsStackable = itemIsStackable;
function getItemStackSize(item) {
    return exports.ITEM_INFO_RECORD[item.type].stackSize;
}
exports.getItemStackSize = getItemStackSize;
exports.BALLISTA_AMMO_TYPES = [ItemType.wood, ItemType.rock, ItemType.slimeball, ItemType.frostcicle];

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BALLISTA_AMMO_TYPES = exports.getItemStackSize = exports.itemIsStackable = exports.Item = exports.Inventory = exports.ITEM_INFO_RECORD = exports.ITEM_TYPE_RECORD = exports.ItemTypeString = void 0;
exports.ItemTypeString = {
    [0 /* ItemType.wood */]: "wood",
    [1 /* ItemType.workbench */]: "workbench",
    [2 /* ItemType.wooden_sword */]: "wooden sword",
    [3 /* ItemType.wooden_axe */]: "wooden axe",
    [4 /* ItemType.wooden_pickaxe */]: "wooden pickaxe",
    [5 /* ItemType.berry */]: "berry",
    [6 /* ItemType.raw_beef */]: "raw beef",
    [7 /* ItemType.cooked_beef */]: "cooked beef",
    [8 /* ItemType.rock */]: "rock",
    [9 /* ItemType.stone_sword */]: "stone sword",
    [10 /* ItemType.stone_axe */]: "stone axe",
    [11 /* ItemType.stone_pickaxe */]: "stone pickaxe",
    [12 /* ItemType.stone_hammer */]: "stone hammer",
    [13 /* ItemType.leather */]: "leather",
    [14 /* ItemType.leather_backpack */]: "leather backpack",
    [15 /* ItemType.cactus_spine */]: "cactus spine",
    [16 /* ItemType.yeti_hide */]: "yeti hide",
    [17 /* ItemType.frostcicle */]: "frostcicle",
    [18 /* ItemType.slimeball */]: "slimeball",
    [19 /* ItemType.eyeball */]: "eyeball",
    [20 /* ItemType.flesh_sword */]: "flesh sword",
    [21 /* ItemType.tribe_totem */]: "tribe totem",
    [22 /* ItemType.worker_hut */]: "worker hut",
    [23 /* ItemType.barrel */]: "barrel",
    [24 /* ItemType.frost_armour */]: "frost armour",
    [25 /* ItemType.campfire */]: "campfire",
    [26 /* ItemType.furnace */]: "furnace",
    [27 /* ItemType.wooden_bow */]: "wooden bow",
    [28 /* ItemType.meat_suit */]: "meat suit",
    [29 /* ItemType.deepfrost_heart */]: "deepfrost heart",
    [30 /* ItemType.deepfrost_sword */]: "deepfrost sword",
    [31 /* ItemType.deepfrost_pickaxe */]: "deepfrost pickaxe",
    [32 /* ItemType.deepfrost_axe */]: "deepfrost axe",
    [33 /* ItemType.deepfrost_armour */]: "deepfrost armour",
    [34 /* ItemType.raw_fish */]: "raw fish",
    [35 /* ItemType.cooked_fish */]: "cooked fish",
    [36 /* ItemType.fishlord_suit */]: "fishlord suit",
    [37 /* ItemType.gathering_gloves */]: "gathering gloves",
    [38 /* ItemType.throngler */]: "throngler",
    [39 /* ItemType.leather_armour */]: "leather armour",
    [40 /* ItemType.spear */]: "spear",
    [41 /* ItemType.paper */]: "paper",
    [42 /* ItemType.research_bench */]: "research bench",
    [43 /* ItemType.wooden_wall */]: "wooden wall",
    [44 /* ItemType.wooden_hammer */]: "wooden hammer",
    [45 /* ItemType.stone_battleaxe */]: "stone battleaxe",
    [46 /* ItemType.living_rock */]: "living rock",
    [47 /* ItemType.planter_box */]: "planter box",
    [48 /* ItemType.reinforced_bow */]: "reinforced bow",
    [49 /* ItemType.crossbow */]: "crossbow",
    [50 /* ItemType.ice_bow */]: "ice bow",
    [51 /* ItemType.poop */]: "poop",
    [52 /* ItemType.wooden_spikes */]: "wooden spikes",
    [53 /* ItemType.punji_sticks */]: "punji sticks",
    [54 /* ItemType.ballista */]: "ballista",
    [55 /* ItemType.sling_turret */]: "sling turret",
    [56 /* ItemType.healing_totem */]: "healing totem",
    [57 /* ItemType.leaf */]: "leaf",
    [58 /* ItemType.herbal_medicine */]: "herbal medicine",
    [59 /* ItemType.leaf_suit */]: "leaf suit",
    [60 /* ItemType.seed */]: "seed",
    [61 /* ItemType.gardening_gloves */]: "gardening gloves",
    [62 /* ItemType.wooden_fence */]: "wooden fence"
};
'';
exports.ITEM_TYPE_RECORD = {
    [0 /* ItemType.wood */]: "material",
    [1 /* ItemType.workbench */]: "placeable",
    [2 /* ItemType.wooden_sword */]: "sword",
    [3 /* ItemType.wooden_axe */]: "axe",
    [4 /* ItemType.wooden_pickaxe */]: "pickaxe",
    [44 /* ItemType.wooden_hammer */]: "hammer",
    [5 /* ItemType.berry */]: "healing",
    [6 /* ItemType.raw_beef */]: "healing",
    [7 /* ItemType.cooked_beef */]: "healing",
    [8 /* ItemType.rock */]: "material",
    [9 /* ItemType.stone_sword */]: "sword",
    [10 /* ItemType.stone_axe */]: "axe",
    [11 /* ItemType.stone_pickaxe */]: "pickaxe",
    [12 /* ItemType.stone_hammer */]: "hammer",
    [13 /* ItemType.leather */]: "material",
    [14 /* ItemType.leather_backpack */]: "backpack",
    [15 /* ItemType.cactus_spine */]: "material",
    [16 /* ItemType.yeti_hide */]: "material",
    [17 /* ItemType.frostcicle */]: "material",
    [18 /* ItemType.slimeball */]: "material",
    [19 /* ItemType.eyeball */]: "material",
    [20 /* ItemType.flesh_sword */]: "sword",
    [21 /* ItemType.tribe_totem */]: "placeable",
    [22 /* ItemType.worker_hut */]: "placeable",
    [23 /* ItemType.barrel */]: "placeable",
    [24 /* ItemType.frost_armour */]: "armour",
    [25 /* ItemType.campfire */]: "placeable",
    [26 /* ItemType.furnace */]: "placeable",
    [27 /* ItemType.wooden_bow */]: "bow",
    [28 /* ItemType.meat_suit */]: "armour",
    [29 /* ItemType.deepfrost_heart */]: "material",
    [30 /* ItemType.deepfrost_sword */]: "sword",
    [31 /* ItemType.deepfrost_pickaxe */]: "pickaxe",
    [32 /* ItemType.deepfrost_axe */]: "axe",
    [33 /* ItemType.deepfrost_armour */]: "armour",
    [34 /* ItemType.raw_fish */]: "healing",
    [35 /* ItemType.cooked_fish */]: "healing",
    [36 /* ItemType.fishlord_suit */]: "armour",
    [37 /* ItemType.gathering_gloves */]: "glove",
    [38 /* ItemType.throngler */]: "sword",
    [39 /* ItemType.leather_armour */]: "armour",
    [40 /* ItemType.spear */]: "spear",
    [41 /* ItemType.paper */]: "material",
    [42 /* ItemType.research_bench */]: "placeable",
    [43 /* ItemType.wooden_wall */]: "placeable",
    [45 /* ItemType.stone_battleaxe */]: "battleaxe",
    [46 /* ItemType.living_rock */]: "material",
    [47 /* ItemType.planter_box */]: "placeable",
    [48 /* ItemType.reinforced_bow */]: "bow",
    [49 /* ItemType.crossbow */]: "crossbow",
    [50 /* ItemType.ice_bow */]: "bow",
    [51 /* ItemType.poop */]: "material",
    [52 /* ItemType.wooden_spikes */]: "placeable",
    [53 /* ItemType.punji_sticks */]: "placeable",
    [54 /* ItemType.ballista */]: "placeable",
    [55 /* ItemType.sling_turret */]: "placeable",
    [56 /* ItemType.healing_totem */]: "placeable",
    [57 /* ItemType.leaf */]: "material",
    [58 /* ItemType.herbal_medicine */]: "healing",
    [59 /* ItemType.leaf_suit */]: "armour",
    [60 /* ItemType.seed */]: "material",
    [61 /* ItemType.gardening_gloves */]: "glove",
    [62 /* ItemType.wooden_fence */]: "placeable"
};
exports.ITEM_INFO_RECORD = {
    [0 /* ItemType.wood */]: {
        stackSize: 99
    },
    [1 /* ItemType.workbench */]: {
        stackSize: 99,
        entityType: 4 /* EntityType.workbench */
    },
    [2 /* ItemType.wooden_sword */]: {
        stackSize: 1,
        toolType: "sword",
        damage: 2,
        knockback: 150,
        attackCooldown: 0.3,
        level: 1
    },
    [3 /* ItemType.wooden_axe */]: {
        stackSize: 1,
        toolType: "axe",
        damage: 3,
        knockback: 100,
        attackCooldown: 0.5,
        level: 1
    },
    [4 /* ItemType.wooden_pickaxe */]: {
        stackSize: 1,
        toolType: "pickaxe",
        damage: 5,
        knockback: 100,
        attackCooldown: 0.5,
        level: 1
    },
    [44 /* ItemType.wooden_hammer */]: {
        stackSize: 1,
        toolType: "hammer",
        damage: 2,
        knockback: 150,
        attackCooldown: 0.7,
        level: 1,
        repairAmount: 3,
        workAmount: 1
    },
    [5 /* ItemType.berry */]: {
        stackSize: 99,
        healAmount: 1,
        consumeTime: 0.75,
        consumableItemCategory: 0 /* ConsumableItemCategory.food */
    },
    [6 /* ItemType.raw_beef */]: {
        stackSize: 99,
        healAmount: 1,
        consumeTime: 1.5,
        consumableItemCategory: 0 /* ConsumableItemCategory.food */
    },
    [7 /* ItemType.cooked_beef */]: {
        stackSize: 99,
        healAmount: 5,
        consumeTime: 1.5,
        consumableItemCategory: 0 /* ConsumableItemCategory.food */
    },
    [8 /* ItemType.rock */]: {
        stackSize: 99
    },
    [9 /* ItemType.stone_sword */]: {
        stackSize: 1,
        toolType: "sword",
        damage: 3,
        knockback: 150,
        attackCooldown: 0.3,
        level: 2
    },
    [10 /* ItemType.stone_axe */]: {
        stackSize: 1,
        toolType: "axe",
        damage: 5,
        knockback: 100,
        attackCooldown: 0.5,
        level: 2
    },
    [11 /* ItemType.stone_pickaxe */]: {
        stackSize: 1,
        toolType: "pickaxe",
        damage: 8,
        knockback: 100,
        attackCooldown: 0.5,
        level: 2
    },
    [12 /* ItemType.stone_hammer */]: {
        stackSize: 1,
        toolType: "hammer",
        damage: 3,
        knockback: 150,
        attackCooldown: 0.7,
        level: 2,
        repairAmount: 5,
        workAmount: 2
    },
    [13 /* ItemType.leather */]: {
        stackSize: 99
    },
    [14 /* ItemType.leather_backpack */]: {
        inventoryWidth: 2,
        inventoryHeight: 2,
        level: 1
    },
    [15 /* ItemType.cactus_spine */]: {
        stackSize: 99
    },
    [16 /* ItemType.yeti_hide */]: {
        stackSize: 99
    },
    [17 /* ItemType.frostcicle */]: {
        stackSize: 99
    },
    [18 /* ItemType.slimeball */]: {
        stackSize: 99
    },
    [19 /* ItemType.eyeball */]: {
        stackSize: 99
    },
    [20 /* ItemType.flesh_sword */]: {
        stackSize: 1,
        toolType: "sword",
        damage: 2,
        knockback: 0,
        attackCooldown: 0.3,
        level: 1.5
    },
    [21 /* ItemType.tribe_totem */]: {
        stackSize: 99,
        entityType: 15 /* EntityType.tribeTotem */
    },
    [22 /* ItemType.worker_hut */]: {
        stackSize: 99,
        entityType: 16 /* EntityType.workerHut */
    },
    [23 /* ItemType.barrel */]: {
        stackSize: 99,
        entityType: 18 /* EntityType.barrel */
    },
    [24 /* ItemType.frost_armour */]: {
        defence: 0.25,
        level: 2
    },
    [25 /* ItemType.campfire */]: {
        stackSize: 99,
        entityType: 19 /* EntityType.campfire */
    },
    [26 /* ItemType.furnace */]: {
        stackSize: 99,
        entityType: 20 /* EntityType.furnace */
    },
    [27 /* ItemType.wooden_bow */]: {
        projectileDamage: 4,
        projectileKnockback: 150,
        shotCooldownTicks: 1 * 60 /* Settings.TPS */,
        projectileSpeed: 1100,
        airResistance: 400,
        level: 2
    },
    [48 /* ItemType.reinforced_bow */]: {
        projectileDamage: 6,
        projectileKnockback: 200,
        shotCooldownTicks: 1 * 60 /* Settings.TPS */,
        projectileSpeed: 1500,
        airResistance: 300,
        level: 2.5
    },
    [50 /* ItemType.ice_bow */]: {
        projectileDamage: 0,
        projectileKnockback: 0,
        shotCooldownTicks: 1.25 * 60 /* Settings.TPS */,
        projectileSpeed: 1100,
        airResistance: 400,
        level: 2.5
    },
    [49 /* ItemType.crossbow */]: {
        projectileDamage: 6,
        projectileKnockback: 200,
        shotCooldownTicks: 1 * 60 /* Settings.TPS */,
        projectileSpeed: 1500,
        airResistance: 300,
        level: 2.5
    },
    [28 /* ItemType.meat_suit */]: {
        defence: 0,
        level: 1
    },
    [29 /* ItemType.deepfrost_heart */]: {
        stackSize: 99
    },
    [30 /* ItemType.deepfrost_sword */]: {
        stackSize: 1,
        toolType: "sword",
        damage: 4,
        knockback: 170,
        attackCooldown: 0.3,
        level: 3
    },
    [31 /* ItemType.deepfrost_pickaxe */]: {
        stackSize: 1,
        toolType: "pickaxe",
        damage: 13,
        knockback: 100,
        attackCooldown: 0.5,
        level: 3
    },
    [32 /* ItemType.deepfrost_axe */]: {
        stackSize: 1,
        toolType: "axe",
        damage: 8,
        knockback: 100,
        attackCooldown: 0.5,
        level: 3
    },
    [33 /* ItemType.deepfrost_armour */]: {
        defence: 0.4,
        level: 3
    },
    [34 /* ItemType.raw_fish */]: {
        stackSize: 99,
        consumeTime: 2,
        healAmount: 1,
        consumableItemCategory: 0 /* ConsumableItemCategory.food */
    },
    [35 /* ItemType.cooked_fish */]: {
        stackSize: 99,
        consumeTime: 1.5,
        healAmount: 4,
        consumableItemCategory: 0 /* ConsumableItemCategory.food */
    },
    [36 /* ItemType.fishlord_suit */]: {
        defence: 0.1,
        level: 1
    },
    [37 /* ItemType.gathering_gloves */]: {
        level: 1
    },
    [38 /* ItemType.throngler */]: {
        stackSize: 1,
        toolType: "sword",
        damage: 2,
        knockback: 400,
        attackCooldown: 0.5,
        level: 2.5
    },
    [39 /* ItemType.leather_armour */]: {
        defence: 0.1,
        level: 1
    },
    [40 /* ItemType.spear */]: {
        stackSize: 99,
        toolType: "spear",
        damage: 4,
        knockback: 300,
        attackCooldown: 0.8,
        level: 2.5
    },
    [41 /* ItemType.paper */]: {
        stackSize: 99
    },
    [42 /* ItemType.research_bench */]: {
        stackSize: 99,
        entityType: 30 /* EntityType.researchBench */
    },
    [43 /* ItemType.wooden_wall */]: {
        stackSize: 99,
        entityType: 31 /* EntityType.wall */
    },
    [45 /* ItemType.stone_battleaxe */]: {
        stackSize: 1,
        toolType: "battleaxe",
        damage: 3,
        knockback: 150,
        attackCooldown: 0.5,
        level: 2.5
    },
    [46 /* ItemType.living_rock */]: {
        stackSize: 99
    },
    [47 /* ItemType.planter_box */]: {
        stackSize: 99,
        entityType: 37 /* EntityType.planterBox */
    },
    [51 /* ItemType.poop */]: {
        stackSize: 99
    },
    [52 /* ItemType.wooden_spikes */]: {
        stackSize: 99,
        // @Incomplete?
        entityType: 42 /* EntityType.floorSpikes */
    },
    [53 /* ItemType.punji_sticks */]: {
        stackSize: 99,
        // @Incomplete?
        entityType: 44 /* EntityType.floorPunjiSticks */
    },
    [54 /* ItemType.ballista */]: {
        stackSize: 99,
        entityType: 47 /* EntityType.ballista */
    },
    [55 /* ItemType.sling_turret */]: {
        stackSize: 99,
        entityType: 48 /* EntityType.slingTurret */
    },
    [56 /* ItemType.healing_totem */]: {
        stackSize: 99,
        entityType: 49 /* EntityType.healingTotem */
    },
    [57 /* ItemType.leaf */]: {
        stackSize: 99
    },
    [58 /* ItemType.herbal_medicine */]: {
        stackSize: 99,
        consumeTime: 1.5,
        healAmount: 3,
        consumableItemCategory: 1 /* ConsumableItemCategory.medicine */
    },
    [59 /* ItemType.leaf_suit */]: {
        defence: 0,
        level: 1
    },
    [60 /* ItemType.seed */]: {
        stackSize: 99
    },
    [61 /* ItemType.gardening_gloves */]: {
        level: 2
    },
    [62 /* ItemType.wooden_fence */]: {
        stackSize: 99,
        entityType: 51 /* EntityType.fence */
    }
};
class Inventory {
    constructor(width, height, name) {
        this.itemSlots = {};
        this.items = new Array;
        this.width = width;
        this.height = height;
        this.name = name;
    }
    addItem(item, itemSlot) {
        this.itemSlots[itemSlot] = item;
        this.items.push(item);
    }
    removeItem(itemSlot) {
        const item = this.itemSlots[itemSlot];
        if (typeof item === "undefined") {
            return;
        }
        delete this.itemSlots[itemSlot];
        const idx = this.items.indexOf(item);
        if (idx !== -1) {
            this.items.splice(idx, 1);
        }
    }
    hasItem(itemSlot) {
        return typeof this.itemSlots[itemSlot] !== "undefined";
    }
    getItemSlot(item) {
        for (let i = 0; i < this.items.length; i++) {
            const currentItem = this.items[i];
            if (item === currentItem) {
                return i;
            }
        }
        return -1;
    }
}
exports.Inventory = Inventory;
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
exports.BALLISTA_AMMO_TYPES = [0 /* ItemType.wood */, 8 /* ItemType.rock */, 18 /* ItemType.slimeball */, 17 /* ItemType.frostcicle */];

import { EntityType } from "./entities";
import { StructureType } from "./structures";
export declare enum ItemType {
    wood = 0,
    workbench = 1,
    wooden_sword = 2,
    wooden_axe = 3,
    wooden_pickaxe = 4,
    berry = 5,
    raw_beef = 6,
    cooked_beef = 7,
    rock = 8,
    stone_sword = 9,
    stone_axe = 10,
    stone_pickaxe = 11,
    stone_hammer = 12,
    leather = 13,
    leather_backpack = 14,
    cactus_spine = 15,
    yeti_hide = 16,
    frostcicle = 17,
    slimeball = 18,
    eyeball = 19,
    flesh_sword = 20,
    tribe_totem = 21,
    worker_hut = 22,
    barrel = 23,
    frost_armour = 24,
    campfire = 25,
    furnace = 26,
    wooden_bow = 27,
    meat_suit = 28,
    deepfrost_heart = 29,
    deepfrost_sword = 30,
    deepfrost_pickaxe = 31,
    deepfrost_axe = 32,
    deepfrost_armour = 33,
    raw_fish = 34,
    cooked_fish = 35,
    fishlord_suit = 36,
    gathering_gloves = 37,
    throngler = 38,
    leather_armour = 39,
    spear = 40,
    paper = 41,
    research_bench = 42,
    wooden_wall = 43,
    wooden_hammer = 44,
    stone_battleaxe = 45,
    living_rock = 46,
    planter_box = 47,
    reinforced_bow = 48,
    crossbow = 49,
    ice_bow = 50,
    poop = 51,
    wooden_spikes = 52,
    punji_sticks = 53,
    ballista = 54,
    sling_turret = 55,
    healing_totem = 56,
    leaf = 57,
    herbal_medicine = 58,
    leaf_suit = 59,
    seed = 60,
    gardening_gloves = 61,
    wooden_fence = 62
}
export interface BaseItemInfo {
}
export interface StackableItemInfo extends BaseItemInfo {
    readonly stackSize: number;
}
export interface MaterialItemInfo extends StackableItemInfo {
}
export declare const enum ConsumableItemCategory {
    food = 0,
    medicine = 1
}
export interface ConsumableItemInfo extends StackableItemInfo {
    readonly healAmount: number;
    readonly consumeTime: number;
    readonly consumableItemCategory: ConsumableItemCategory;
}
export type ToolType = "sword" | "bow" | "axe" | "pickaxe" | "spear" | "hammer" | "battleaxe";
export interface ToolItemInfo extends StackableItemInfo {
    readonly toolType: ToolType;
    readonly damage: number;
    readonly knockback: number;
    /** Cooldown between attacks */
    readonly attackCooldown: number;
    /** Rough estimate of how powerful the item is. */
    readonly level: number;
}
export interface SwordItemInfo extends ToolItemInfo {
    readonly toolType: "sword";
}
export interface BowItemInfo extends BaseItemInfo {
    readonly projectileDamage: number;
    readonly projectileKnockback: number;
    readonly shotCooldownTicks: number;
    readonly projectileSpeed: number;
    /** The units of speed that the arrow's velocity gets decreased by each second */
    readonly airResistance: number;
    readonly level: number;
}
export interface CrossbowItemInfo extends BowItemInfo {
}
export interface AxeItemInfo extends ToolItemInfo {
    readonly toolType: "axe";
}
export interface PickaxeItemInfo extends ToolItemInfo {
    readonly toolType: "pickaxe";
}
export interface HammerItemInfo extends ToolItemInfo {
    readonly toolType: "hammer";
    /** Health that the hammer restores when hitting friendly buildings */
    readonly repairAmount: number;
    readonly workAmount: number;
}
export interface PlaceableItemInfo extends StackableItemInfo {
    readonly entityType: StructureType;
}
export interface BackpackItemInfo extends BaseItemInfo {
    /** Width of the backpack inventory in terms of item slots. */
    readonly inventoryWidth: number;
    /** Width of the backpack inventory in terms of item slots. */
    readonly inventoryHeight: number;
    /** Rough estimate of how powerful the item is. */
    readonly level: number;
}
export interface ArmourItemInfo extends BaseItemInfo {
    readonly defence: number;
    /** Rough estimate of how powerful the item is. */
    readonly level: number;
}
export interface GloveItemInfo extends BaseItemInfo {
    readonly level: number;
}
export interface SpearItemInfo extends ToolItemInfo {
}
export interface BattleaxeItemInfo extends ToolItemInfo {
}
export interface ItemInfoRecord {
    material: MaterialItemInfo;
    healing: ConsumableItemInfo;
    sword: SwordItemInfo;
    bow: BowItemInfo;
    axe: AxeItemInfo;
    pickaxe: PickaxeItemInfo;
    placeable: PlaceableItemInfo;
    backpack: BackpackItemInfo;
    armour: ArmourItemInfo;
    glove: GloveItemInfo;
    spear: SpearItemInfo;
    hammer: HammerItemInfo;
    battleaxe: BattleaxeItemInfo;
    crossbow: CrossbowItemInfo;
}
export declare const ITEM_TYPE_RECORD: {
    0: "material";
    1: "placeable";
    2: "sword";
    3: "axe";
    4: "pickaxe";
    44: "hammer";
    5: "healing";
    6: "healing";
    7: "healing";
    8: "material";
    9: "sword";
    10: "axe";
    11: "pickaxe";
    12: "hammer";
    13: "material";
    14: "backpack";
    15: "material";
    16: "material";
    17: "material";
    18: "material";
    19: "material";
    20: "sword";
    21: "placeable";
    22: "placeable";
    23: "placeable";
    24: "armour";
    25: "placeable";
    26: "placeable";
    27: "bow";
    28: "armour";
    29: "material";
    30: "sword";
    31: "pickaxe";
    32: "axe";
    33: "armour";
    34: "healing";
    35: "healing";
    36: "armour";
    37: "glove";
    38: "sword";
    39: "armour";
    40: "spear";
    41: "material";
    42: "placeable";
    43: "placeable";
    45: "battleaxe";
    46: "material";
    47: "placeable";
    48: "bow";
    49: "crossbow";
    50: "bow";
    51: "material";
    52: "placeable";
    53: "placeable";
    54: "placeable";
    55: "placeable";
    56: "placeable";
    57: "material";
    58: "healing";
    59: "armour";
    60: "material";
    61: "glove";
    62: "placeable";
};
export type ItemInfo<T extends ItemType> = ItemInfoRecord[typeof ITEM_TYPE_RECORD[T]];
export declare const ITEM_INFO_RECORD: {
    0: {
        stackSize: number;
    };
    1: {
        stackSize: number;
        entityType: EntityType.workbench;
    };
    2: {
        stackSize: number;
        toolType: "sword";
        damage: number;
        knockback: number;
        attackCooldown: number;
        level: number;
    };
    3: {
        stackSize: number;
        toolType: "axe";
        damage: number;
        knockback: number;
        attackCooldown: number;
        level: number;
    };
    4: {
        stackSize: number;
        toolType: "pickaxe";
        damage: number;
        knockback: number;
        attackCooldown: number;
        level: number;
    };
    44: {
        stackSize: number;
        toolType: "hammer";
        damage: number;
        knockback: number;
        attackCooldown: number;
        level: number;
        repairAmount: number;
        workAmount: number;
    };
    5: {
        stackSize: number;
        healAmount: number;
        consumeTime: number;
        consumableItemCategory: ConsumableItemCategory.food;
    };
    6: {
        stackSize: number;
        healAmount: number;
        consumeTime: number;
        consumableItemCategory: ConsumableItemCategory.food;
    };
    7: {
        stackSize: number;
        healAmount: number;
        consumeTime: number;
        consumableItemCategory: ConsumableItemCategory.food;
    };
    8: {
        stackSize: number;
    };
    9: {
        stackSize: number;
        toolType: "sword";
        damage: number;
        knockback: number;
        attackCooldown: number;
        level: number;
    };
    10: {
        stackSize: number;
        toolType: "axe";
        damage: number;
        knockback: number;
        attackCooldown: number;
        level: number;
    };
    11: {
        stackSize: number;
        toolType: "pickaxe";
        damage: number;
        knockback: number;
        attackCooldown: number;
        level: number;
    };
    12: {
        stackSize: number;
        toolType: "hammer";
        damage: number;
        knockback: number;
        attackCooldown: number;
        level: number;
        repairAmount: number;
        workAmount: number;
    };
    13: {
        stackSize: number;
    };
    14: {
        inventoryWidth: number;
        inventoryHeight: number;
        level: number;
    };
    15: {
        stackSize: number;
    };
    16: {
        stackSize: number;
    };
    17: {
        stackSize: number;
    };
    18: {
        stackSize: number;
    };
    19: {
        stackSize: number;
    };
    20: {
        stackSize: number;
        toolType: "sword";
        damage: number;
        knockback: number;
        attackCooldown: number;
        level: number;
    };
    21: {
        stackSize: number;
        entityType: EntityType.tribeTotem;
    };
    22: {
        stackSize: number;
        entityType: EntityType.workerHut;
    };
    23: {
        stackSize: number;
        entityType: EntityType.barrel;
    };
    24: {
        defence: number;
        level: number;
    };
    25: {
        stackSize: number;
        entityType: EntityType.campfire;
    };
    26: {
        stackSize: number;
        entityType: EntityType.furnace;
    };
    27: {
        projectileDamage: number;
        projectileKnockback: number;
        shotCooldownTicks: number;
        projectileSpeed: number;
        airResistance: number;
        level: number;
    };
    48: {
        projectileDamage: number;
        projectileKnockback: number;
        shotCooldownTicks: number;
        projectileSpeed: number;
        airResistance: number;
        level: number;
    };
    50: {
        projectileDamage: number;
        projectileKnockback: number;
        shotCooldownTicks: number;
        projectileSpeed: number;
        airResistance: number;
        level: number;
    };
    49: {
        projectileDamage: number;
        projectileKnockback: number;
        shotCooldownTicks: number;
        projectileSpeed: number;
        airResistance: number;
        level: number;
    };
    28: {
        defence: number;
        level: number;
    };
    29: {
        stackSize: number;
    };
    30: {
        stackSize: number;
        toolType: "sword";
        damage: number;
        knockback: number;
        attackCooldown: number;
        level: number;
    };
    31: {
        stackSize: number;
        toolType: "pickaxe";
        damage: number;
        knockback: number;
        attackCooldown: number;
        level: number;
    };
    32: {
        stackSize: number;
        toolType: "axe";
        damage: number;
        knockback: number;
        attackCooldown: number;
        level: number;
    };
    33: {
        defence: number;
        level: number;
    };
    34: {
        stackSize: number;
        consumeTime: number;
        healAmount: number;
        consumableItemCategory: ConsumableItemCategory.food;
    };
    35: {
        stackSize: number;
        consumeTime: number;
        healAmount: number;
        consumableItemCategory: ConsumableItemCategory.food;
    };
    36: {
        defence: number;
        level: number;
    };
    37: {
        level: number;
    };
    38: {
        stackSize: number;
        toolType: "sword";
        damage: number;
        knockback: number;
        attackCooldown: number;
        level: number;
    };
    39: {
        defence: number;
        level: number;
    };
    40: {
        stackSize: number;
        toolType: "spear";
        damage: number;
        knockback: number;
        attackCooldown: number;
        level: number;
    };
    41: {
        stackSize: number;
    };
    42: {
        stackSize: number;
        entityType: EntityType.researchBench;
    };
    43: {
        stackSize: number;
        entityType: EntityType.wall;
    };
    45: {
        stackSize: number;
        toolType: "battleaxe";
        damage: number;
        knockback: number;
        attackCooldown: number;
        level: number;
    };
    46: {
        stackSize: number;
    };
    47: {
        stackSize: number;
        entityType: EntityType.planterBox;
    };
    51: {
        stackSize: number;
    };
    52: {
        stackSize: number;
        entityType: EntityType.floorSpikes;
    };
    53: {
        stackSize: number;
        entityType: EntityType.floorPunjiSticks;
    };
    54: {
        stackSize: number;
        entityType: EntityType.ballista;
    };
    55: {
        stackSize: number;
        entityType: EntityType.slingTurret;
    };
    56: {
        stackSize: number;
        entityType: EntityType.healingTotem;
    };
    57: {
        stackSize: number;
    };
    58: {
        stackSize: number;
        consumeTime: number;
        healAmount: number;
        consumableItemCategory: ConsumableItemCategory.medicine;
    };
    59: {
        defence: number;
        level: number;
    };
    60: {
        stackSize: number;
    };
    61: {
        level: number;
    };
    62: {
        stackSize: number;
        entityType: EntityType.fence;
    };
};
type ExcludeNonPlaceableItemTypes<T extends ItemType> = typeof ITEM_TYPE_RECORD[T] extends "placeable" ? T : never;
export type PlaceableItemType = keyof {
    [T in ItemType as ExcludeNonPlaceableItemTypes<T>]: T;
};
type ExcludeNonArmourItemTypes<T extends ItemType> = typeof ITEM_TYPE_RECORD[T] extends "armour" ? T : never;
export type ArmourItemType = keyof {
    [T in ItemType as ExcludeNonArmourItemTypes<T>]: T;
};
type ExcludeNonGloveItemTypes<T extends ItemType> = typeof ITEM_TYPE_RECORD[T] extends "glove" ? T : never;
export type GloveItemType = keyof {
    [T in ItemType as ExcludeNonGloveItemTypes<T>]: T;
};
type ExcludeNonHammerItemTypes<T extends ItemType> = typeof ITEM_TYPE_RECORD[T] extends "hammer" ? T : never;
export type HammerItemType = keyof {
    [T in ItemType as ExcludeNonHammerItemTypes<T>]: T;
};
export type ItemSlot = Item | null;
/** Stores the items inside an inventory, indexed by their slot number. */
export type ItemSlots = {
    [itemSlot: number]: Item;
};
export interface Inventory {
    /** Width of the inventory in item slots */
    width: number;
    /** Height of the inventory in item slots */
    height: number;
    /** The items contained by the inventory. */
    readonly itemSlots: ItemSlots;
    readonly name: string;
}
export declare class Item {
    /** Unique identifier for the item */
    readonly id: number;
    type: ItemType;
    count: number;
    constructor(itemType: ItemType, count: number, id: number);
}
/**
 * Checks whether a given item type is able to be stacked.
 * @param itemType The type of item to check.
 * @returns Whether the item type is able to be stacked.
 */
export declare function itemIsStackable(itemType: ItemType): boolean;
export declare function getItemStackSize(item: Item): number;
export declare const BALLISTA_AMMO_TYPES: readonly [ItemType.wood, ItemType.rock, ItemType.slimeball, ItemType.frostcicle];
export type BallistaAmmoType = typeof BALLISTA_AMMO_TYPES[number];
export {};

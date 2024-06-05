import { EntityType } from "./entities";
import { Settings } from "./settings";
import { StructureType } from "./structures";

export const enum ItemType {
   wood,
   workbench,
   wooden_sword,
   wooden_axe,
   wooden_pickaxe,
   berry,
   raw_beef,
   cooked_beef,
   rock,
   stone_sword,
   stone_axe,
   stone_pickaxe,
   stone_hammer,
   leather,
   leather_backpack,
   cactus_spine,
   yeti_hide,
   frostcicle,
   slimeball,
   eyeball,
   flesh_sword,
   tribe_totem,
   worker_hut,
   barrel,
   frost_armour,
   campfire,
   furnace,
   wooden_bow,
   meat_suit,
   deepfrost_heart,
   deepfrost_sword,
   deepfrost_pickaxe,
   deepfrost_axe,
   deepfrost_armour,
   raw_fish,
   cooked_fish,
   fishlord_suit,
   gathering_gloves,
   throngler,
   leather_armour,
   spear,
   paper,
   research_bench,
   wooden_wall,
   wooden_hammer,
   stone_battleaxe,
   living_rock,
   planter_box,
   reinforced_bow,
   crossbow,
   ice_bow,
   poop,
   wooden_spikes,
   punji_sticks,
   ballista,
   sling_turret,
   healing_totem,
   leaf,
   herbal_medicine,
   leaf_suit,
   seed,
   gardening_gloves,
   wooden_fence,
   fertiliser,
   frostshaper,
   stonecarvingTable
}

export const ItemTypeString: Record<ItemType, string> = {
   [ItemType.wood]: "wood",
   [ItemType.workbench]: "workbench",
   [ItemType.wooden_sword]: "wooden_sword",
   [ItemType.wooden_axe]: "wooden_axe",
   [ItemType.wooden_pickaxe]: "wooden_pickaxe",
   [ItemType.berry]: "berry",
   [ItemType.raw_beef]: "raw beef",
   [ItemType.cooked_beef]: "cooked_beef",
   [ItemType.rock]: "rock",
   [ItemType.stone_sword]: "stone_sword",
   [ItemType.stone_axe]: "stone_axe",
   [ItemType.stone_pickaxe]: "stone_pickaxe",
   [ItemType.stone_hammer]: "stone_hammer",
   [ItemType.leather]: "leather",
   [ItemType.leather_backpack]: "leather_backpack",
   [ItemType.cactus_spine]: "cactus_spine",
   [ItemType.yeti_hide]: "yeti_hide",
   [ItemType.frostcicle]: "frostcicle",
   [ItemType.slimeball]: "slimeball",
   [ItemType.eyeball]: "eyeball",
   [ItemType.flesh_sword]: "flesh_sword",
   [ItemType.tribe_totem]: "tribe_totem",
   [ItemType.worker_hut]: "worker_hut",
   [ItemType.barrel]: "barrel",
   [ItemType.frost_armour]: "frost_armour",
   [ItemType.campfire]: "campfire",
   [ItemType.furnace]: "furnace",
   [ItemType.wooden_bow]: "wooden_bow",
   [ItemType.meat_suit]: "meat_suit",
   [ItemType.deepfrost_heart]: "deepfrost_heart",
   [ItemType.deepfrost_sword]: "deepfrost_sword",
   [ItemType.deepfrost_pickaxe]: "deepfrost_pickaxe",
   [ItemType.deepfrost_axe]: "deepfrost_axe",
   [ItemType.deepfrost_armour]: "deepfrost_armour",
   [ItemType.raw_fish]: "raw_fish",
   [ItemType.cooked_fish]: "cooked_fish",
   [ItemType.fishlord_suit]: "fishlord_suit",
   [ItemType.gathering_gloves]: "gathering_gloves",
   [ItemType.throngler]: "throngler",
   [ItemType.leather_armour]: "leather_armour",
   [ItemType.spear]: "spear",
   [ItemType.paper]: "paper",
   [ItemType.research_bench]: "research_bench",
   [ItemType.wooden_wall]: "wooden_wall",
   [ItemType.wooden_hammer]: "wooden_hammer",
   [ItemType.stone_battleaxe]: "stone_battleaxe",
   [ItemType.living_rock]: "living_rock",
   [ItemType.planter_box]: "planter_box",
   [ItemType.reinforced_bow]: "reinforced_bow",
   [ItemType.crossbow]: "crossbow",
   [ItemType.ice_bow]: "ice_bow",
   [ItemType.poop]: "poop",
   [ItemType.wooden_spikes]: "wooden_spikes",
   [ItemType.punji_sticks]: "punji_sticks",
   [ItemType.ballista]: "ballista",
   [ItemType.sling_turret]: "sling_turret",
   [ItemType.healing_totem]: "healing_totem",
   [ItemType.leaf]: "leaf",
   [ItemType.herbal_medicine]: "herbal_medicine",
   [ItemType.leaf_suit]: "leaf_suit",
   [ItemType.seed]: "seed",
   [ItemType.gardening_gloves]: "gardening_gloves",
   [ItemType.wooden_fence]: "wooden_fence",
   [ItemType.fertiliser]: "fertiliser",
   [ItemType.frostshaper]: "frostshaper",
   [ItemType.stonecarvingTable]: "stonecarving_table"
};

const numItemTypes = Object.keys(ItemTypeString).length;

export function getItemTypeFromString(itemTypeString: string): ItemType | null {
   for (let itemType: ItemType = 0; itemType < numItemTypes; itemType++) {
      if (ItemTypeString[itemType] === itemTypeString) {
         return itemType;
      }
   }

   return null;
}

export interface BaseItemInfo {}

export interface StackableItemInfo extends BaseItemInfo {
   readonly stackSize: number;
}

export interface MaterialItemInfo extends StackableItemInfo {}

export const enum ConsumableItemCategory {
   food,
   medicine
}

export interface ConsumableItemInfo extends StackableItemInfo {
   readonly healAmount: number;
   readonly consumeTime: number;
   readonly consumableItemCategory: ConsumableItemCategory;
}

// @Cleanup: Is this necessary?
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

export interface CrossbowItemInfo extends BowItemInfo {}

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
   readonly inventoryHeight: number
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

export interface SpearItemInfo extends ToolItemInfo {}

export interface BattleaxeItemInfo extends ToolItemInfo {}

export interface ItemInfoRecord {
   material: MaterialItemInfo;
   healing: ConsumableItemInfo;
   sword: SwordItemInfo;
   bow: BowItemInfo;
   axe: AxeItemInfo;
   pickaxe: PickaxeItemInfo
   placeable: PlaceableItemInfo;
   backpack: BackpackItemInfo;
   armour: ArmourItemInfo;
   glove: GloveItemInfo;
   spear: SpearItemInfo;
   hammer: HammerItemInfo;
   battleaxe: BattleaxeItemInfo;
   crossbow: CrossbowItemInfo;
}

export const ITEM_TYPE_RECORD = {
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
   [ItemType.wooden_fence]: "placeable",
   [ItemType.fertiliser]: "material",
   [ItemType.frostshaper]: "placeable",
   [ItemType.stonecarvingTable]: "placeable"
} satisfies Record<ItemType, keyof ItemInfoRecord>;

export type ItemInfo<T extends ItemType> = ItemInfoRecord[typeof ITEM_TYPE_RECORD[T]];

export const ITEM_INFO_RECORD = {
   [ItemType.wood]: {
      stackSize: 99
   },
   [ItemType.workbench]: {
      stackSize: 99,
      entityType: EntityType.workbench
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
      consumableItemCategory: ConsumableItemCategory.food
   },
   [ItemType.raw_beef]: {
      stackSize: 99,
      healAmount: 1,
      consumeTime: 1.5,
      consumableItemCategory: ConsumableItemCategory.food
   },
   [ItemType.cooked_beef]: {
      stackSize: 99,
      healAmount: 5,
      consumeTime: 1.5,
      consumableItemCategory: ConsumableItemCategory.food
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
      entityType: EntityType.tribeTotem
   },
   [ItemType.worker_hut]: {
      stackSize: 99,
      entityType: EntityType.workerHut
   },
   [ItemType.barrel]: {
      stackSize: 99,
      entityType: EntityType.barrel
   },
   [ItemType.frost_armour]: {
      defence: 0.25,
      level: 2
   },
   [ItemType.campfire]: {
      stackSize: 99,
      entityType: EntityType.campfire
   },
   [ItemType.furnace]: {
      stackSize: 99,
      entityType: EntityType.furnace
   },
   [ItemType.wooden_bow]: {
      projectileDamage: 4,
      projectileKnockback: 150,
      shotCooldownTicks: 1 * Settings.TPS,
      projectileSpeed: 1100,
      airResistance: 400,
      level: 2
   },
   [ItemType.reinforced_bow]: {
      projectileDamage: 6,
      projectileKnockback: 200,
      shotCooldownTicks: 1 * Settings.TPS,
      projectileSpeed: 1500,
      airResistance: 300,
      level: 2.5
   },
   [ItemType.ice_bow]: {
      projectileDamage: 0,
      projectileKnockback: 0,
      shotCooldownTicks: 1.25 * Settings.TPS,
      projectileSpeed: 1100,
      airResistance: 400,
      level: 2.5
   },
   [ItemType.crossbow]: {
      projectileDamage: 6,
      projectileKnockback: 200,
      shotCooldownTicks: 1 * Settings.TPS,
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
      consumableItemCategory: ConsumableItemCategory.food
   },
   [ItemType.cooked_fish]: {
      stackSize: 99,
      consumeTime: 1.5,
      healAmount: 4,
      consumableItemCategory: ConsumableItemCategory.food
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
      entityType: EntityType.researchBench
   },
   [ItemType.wooden_wall]: {
      stackSize: 99,
      entityType: EntityType.wall
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
      entityType: EntityType.planterBox
   },
   [ItemType.poop]: {
      stackSize: 99
   },
   [ItemType.wooden_spikes]: {
      stackSize: 99,
      // @Incomplete?
      entityType: EntityType.floorSpikes
   },
   [ItemType.punji_sticks]: {
      stackSize: 99,
      // @Incomplete?
      entityType: EntityType.floorPunjiSticks
   },
   [ItemType.ballista]: {
      stackSize: 99,
      entityType: EntityType.ballista
   },
   [ItemType.sling_turret]: {
      stackSize: 99,
      entityType: EntityType.slingTurret
   },
   [ItemType.healing_totem]: {
      stackSize: 99,
      entityType: EntityType.healingTotem
   },
   [ItemType.leaf]: {
      stackSize: 99
   },
   [ItemType.herbal_medicine]: {
      stackSize: 99,
      consumeTime: 1.5,
      healAmount: 3,
      consumableItemCategory: ConsumableItemCategory.medicine
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
      entityType: EntityType.fence
   },
   [ItemType.fertiliser]: {
      stackSize: 99
   },
   [ItemType.frostshaper]: {
      stackSize: 99,
      entityType: EntityType.frostshaper
   },
   [ItemType.stonecarvingTable]: {
      stackSize: 99,
      entityType: EntityType.stonecarvingTable
   }
} satisfies { [T in ItemType]: ItemInfo<T> };

// Some typescript wizardry
type ExcludeNonPlaceableItemTypes<T extends ItemType> = typeof ITEM_TYPE_RECORD[T] extends "placeable" ? T : never;
export type PlaceableItemType = keyof {
   [T in ItemType as ExcludeNonPlaceableItemTypes<T>]: T;
}
type ExcludeNonArmourItemTypes<T extends ItemType> = typeof ITEM_TYPE_RECORD[T] extends "armour" ? T : never;
export type ArmourItemType = keyof {
   [T in ItemType as ExcludeNonArmourItemTypes<T>]: T;
}
type ExcludeNonGloveItemTypes<T extends ItemType> = typeof ITEM_TYPE_RECORD[T] extends "glove" ? T : never;
export type GloveItemType = keyof {
   [T in ItemType as ExcludeNonGloveItemTypes<T>]: T;
}
type ExcludeNonHammerItemTypes<T extends ItemType> = typeof ITEM_TYPE_RECORD[T] extends "hammer" ? T : never;
export type HammerItemType = keyof {
   [T in ItemType as ExcludeNonHammerItemTypes<T>]: T;
}

/** Stores the items inside an inventory, indexed by their slot number. */
export type ItemSlots = Partial<{ [itemSlot: number]: Item }>;

export const enum InventoryName {
   hotbar,
   offhand,
   craftingOutputSlot,
   heldItemSlot,
   armourSlot,
   backpackSlot,
   gloveSlot,
   backpack,
   fuelInventory,
   ingredientInventory,
   outputInventory,
   inventory,
   handSlot,
   ammoBoxInventory,
   devInventory
}

/** Inventory data sent between client and server */
export interface InventoryData {
   width: number;
   height: number;
   readonly itemSlots: ItemSlots;
   readonly name: InventoryName;
}

export class Inventory {
   public width: number;
   public height: number;
   public readonly name: InventoryName;

   public readonly itemSlots: ItemSlots = {};
   public readonly items = new Array<Item>;

   constructor(width: number, height: number, name: InventoryName) {
      this.width = width;
      this.height = height;
      this.name = name;
   }

   public addItem(item: Item, itemSlot: number): void {
      this.itemSlots[itemSlot] = item;
      this.items.push(item);
   }

   public removeItem(itemSlot: number): void {
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
   
   public hasItem(itemSlot: number): boolean {
      return typeof this.itemSlots[itemSlot] !== "undefined";
   }

   /** Returns 0 if the item is not in the inventory */
   public getItemSlot(item: Item): number {
      for (let itemSlot = 1; itemSlot <= this.width * this.height; itemSlot++) {
         const currentItem = this.itemSlots[itemSlot];
         if (currentItem === item) {
            return itemSlot;
         }
      }
      
      return 0;
   }
}

export class Item {
   /** Unique identifier for the item */
   public readonly id: number;
   
   public type: ItemType;
   public count: number;

   constructor(itemType: ItemType, count: number, id: number) {
      this.type = itemType;
      this.count = count;
      this.id = id;
   }
}

/**
 * Checks whether a given item type is able to be stacked.
 * @param itemType The type of item to check.
 * @returns Whether the item type is able to be stacked.
 */
export function itemIsStackable(itemType: ItemType): boolean {
   return ITEM_INFO_RECORD[itemType].hasOwnProperty("stackSize");
}

export function getItemStackSize(item: Item): number {
   return (ITEM_INFO_RECORD[item.type] as StackableItemInfo).stackSize;
}

// @Cleanup: combine the two parameters to make calling it easier

export function itemInfoIsTool(itemType: ItemType, itemInfo: unknown): itemInfo is ToolItemInfo {
   const itemTypeInfo = ITEM_TYPE_RECORD[itemType];
   return itemTypeInfo === "axe" || itemTypeInfo === "sword" || itemTypeInfo === "pickaxe" || itemTypeInfo === "spear" || itemTypeInfo === "hammer" || itemTypeInfo === "battleaxe";
}

export function itemInfoIsUtility(itemType: ItemType, itemInfo: unknown): itemInfo is AxeItemInfo | SwordItemInfo | BowItemInfo | PickaxeItemInfo | SpearItemInfo | HammerItemInfo | BattleaxeItemInfo | CrossbowItemInfo {
   const itemTypeInfo = ITEM_TYPE_RECORD[itemType];
   return itemTypeInfo === "axe" || itemTypeInfo === "sword" || itemTypeInfo === "bow" || itemTypeInfo === "pickaxe" || itemTypeInfo === "spear" || itemTypeInfo === "hammer" || itemTypeInfo === "battleaxe" || itemTypeInfo === "crossbow";
}

export function itemInfoIsBow(itemType: ItemType, itemInfo: unknown): itemInfo is BowItemInfo {
   const itemTypeInfo = ITEM_TYPE_RECORD[itemType];
   return itemTypeInfo === "bow" || itemTypeInfo === "crossbow";
}

// @Cleanup: move elsewhere
export const BALLISTA_AMMO_TYPES = [ItemType.wood, ItemType.rock, ItemType.slimeball, ItemType.frostcicle] as const;
export type BallistaAmmoType = typeof BALLISTA_AMMO_TYPES[number];
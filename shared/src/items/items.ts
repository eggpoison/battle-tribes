import { AttackPatternInfo, AttackTimingsInfo, AXE_ATTACK_TIMINGS, UNARMED_ATTACK_PATTERNS, DEFAULT_ATTACK_TIMINGS, DEFAULT_ITEM_DAMAGE_BOX_INFO, HAMMER_ATTACK_TIMINGS, LimbHeldItemDamageBoxInfo, PICKAXE_ATTACK_PATTERNS, PICKAXE_ATTACK_TIMINGS, PICKAXE_ITEM_DAMAGE_BOX_INFO, SHIELD_BLOCKING_DAMAGE_BOX_INFO, SPEAR_ATTACK_PATTERNS, SPEAR_ATTACK_TIMINGS, SPEAR_DAMAGE_BOX_INFO, SWORD_ATTACK_TIMINGS, SWORD_ITEM_DAMAGE_BOX_INFO, TOOL_ITEM_DAMAGE_BOX_INFO, LimbConfiguration, IVORY_SPEAR_DAMAGE_BOX_INFO } from "../attack-patterns";
import { EntityType } from "../entities";
import { Settings } from "../settings";
import { StructureType } from "../structures";

export enum ItemType {
   wood,
   workbench,
   wooden_sword,
   wooden_axe,
   wooden_pickaxe,
   wooden_hammer,
   woodenSpear,
   berry,
   raw_beef,
   cooked_beef,
   rock,
   stone_sword,
   stone_axe,
   stone_pickaxe,
   stone_hammer,
   stoneSpear,
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
   frostSword,
   frostPickaxe,
   frostAxe,
   frostArmour,
   campfire,
   furnace,
   wooden_bow,
   meat_suit,
   deepfrost_heart,
   raw_fish,
   cooked_fish,
   fishlord_suit,
   gathering_gloves,
   leather_armour,
   paper,
   research_bench,
   wooden_wall,
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
   stonecarvingTable,
   woodenShield,
   slingshot,
   woodenBracings,
   fireTorch,
   slurb,
   slurbTorch,
   rawYetiFlesh,
   cookedYetiFlesh,
   mithrilOre,
   mithrilBar,
   mithrilSword,
   mithrilPickaxe,
   mithrilAxe,
   mithrilArmour,
   scrappy,
   cogwalker,
   automatonAssembler,
   mithrilAnvil,
   animalStaff,
   woodenArrow,
   tamingAlmanac,
   floorSign,
   pricklyPear,
   rawCrabMeat,
   cookedCrabMeat,
   chitin,
   crabplateArmour,
   dustfleaEgg,
   snowberry,
   rawSnobeMeat,
   snobeStew,
   snobeHide,
   inguSerpentTooth,
   iceWringer,
   rawTukmokMeat,
   cookedTukmokMeat,
   tukmokFurHide,
   winterskinArmour,
   ivoryTusk,
   ivorySpear,
   sock,
   mrpebbles
}

// @Cleanup @Robustness: pretty sure there's a C++ thing to automatically do this
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
   [ItemType.frostSword]: "Frost Sword",
   [ItemType.frostPickaxe]: "Frost Pickaxe",
   [ItemType.frostAxe]: "Frost Axe",
   [ItemType.frostArmour]: "Frost Armour",
   [ItemType.campfire]: "campfire",
   [ItemType.furnace]: "furnace",
   [ItemType.wooden_bow]: "wooden_bow",
   [ItemType.meat_suit]: "meat_suit",
   [ItemType.deepfrost_heart]: "deepfrost_heart",
   [ItemType.raw_fish]: "raw_fish",
   [ItemType.cooked_fish]: "cooked_fish",
   [ItemType.fishlord_suit]: "fishlord_suit",
   [ItemType.gathering_gloves]: "gathering_gloves",
   [ItemType.leather_armour]: "leather_armour",
   [ItemType.woodenSpear]: "Wooden Spear",
   [ItemType.stoneSpear]: "Stone Spear",
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
   [ItemType.stonecarvingTable]: "stonecarving_table",
   [ItemType.woodenShield]: "Wooden Shield",
   [ItemType.slingshot]: "Slingshot",
   [ItemType.woodenBracings]: "Wooden Bracings",
   [ItemType.fireTorch]: "Fire Torch",
   [ItemType.slurb]: "Slurb",
   [ItemType.slurbTorch]: "Slurb Torch",
   [ItemType.rawYetiFlesh]: "Raw Yeti Flesh",
   [ItemType.cookedYetiFlesh]: "Cooked Yeti Flesh",
   [ItemType.mithrilOre]: "Mithril Ore",
   [ItemType.mithrilBar]: "Mithril Bar",
   [ItemType.mithrilSword]: "Mithril Sword",
   [ItemType.mithrilPickaxe]: "Mithril Pickaxe",
   [ItemType.mithrilAxe]: "Mithril Axe",
   [ItemType.mithrilArmour]: "Mithril Armour",
   [ItemType.scrappy]: "Scrappy",
   [ItemType.cogwalker]: "Cogwalker",
   [ItemType.automatonAssembler]: "Automaton Assembler",
   [ItemType.mithrilAnvil]: "Mithril Anvil",
   [ItemType.animalStaff]: "Animal Staff",
   [ItemType.woodenArrow]: "Wooden Arrow",
   [ItemType.tamingAlmanac]: "Taming Almanac",
   [ItemType.floorSign]: "Floor Sign",
   [ItemType.pricklyPear]: "Prickly Pear",
   [ItemType.rawCrabMeat]: "Raw Crab Meat",
   [ItemType.cookedCrabMeat]: "Cooked Crab Meat",
   [ItemType.chitin]: "Chitin",
   [ItemType.crabplateArmour]: "Crabplate Armour",
   [ItemType.dustfleaEgg]: "Dustflea Egg",
   [ItemType.snowberry]: "Snowberry",
   [ItemType.rawSnobeMeat]: "Snobe Meat",
   [ItemType.snobeStew]: "Snobe Stew",
   [ItemType.snobeHide]: "Snobe Hide",
   [ItemType.inguSerpentTooth]: "Ingu Serpent Tooth",
   [ItemType.iceWringer]: "Ice Wringer",
   [ItemType.rawTukmokMeat]: "Raw Tukmok Meat",
   [ItemType.cookedTukmokMeat]: "Cooked Tukmok Meat",
   [ItemType.tukmokFurHide]: "Tukmok Fur Hide",
   [ItemType.winterskinArmour]: "Winterskin Armour",
   [ItemType.ivoryTusk]: "Ivory Tusk",
   [ItemType.ivorySpear]: "Ivory Spear",
   [ItemType.sock]: "Sock",
   [ItemType.mrpebbles]: "Mr Pebbles"
};

export const NUM_ITEM_TYPES = Object.keys(ItemTypeString).length;

export const ALL_ITEM_TYPES = new Array<ItemType>();
for (let i = 0; i < NUM_ITEM_TYPES; i++) {
   ALL_ITEM_TYPES.push(i);
}

export function getItemTypeFromString(itemTypeString: string): ItemType | null {
   for (let itemType: ItemType = 0; itemType < NUM_ITEM_TYPES; itemType++) {
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

export enum ConsumableItemCategory {
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
}

export interface SwordItemInfo extends ToolItemInfo {
   readonly toolType: "sword";
}

export interface BowItemInfo extends BaseItemInfo {
   readonly projectileDamage: number;
   readonly projectileKnockback: number;
   readonly shotChargeTimeTicks: number;
   readonly projectileSpeed: number;
   /** The units of speed that the arrow's velocity gets decreased by each second */
   readonly airResistance: number;
}

export interface CrossbowItemInfo extends BowItemInfo {}

export interface AxeItemInfo extends ToolItemInfo {
   readonly toolType: "axe";
}

export interface PickaxeItemInfo extends ToolItemInfo {
   readonly toolType: "pickaxe";
   readonly wallDamage: number;
}

export interface HammerItemInfo extends ToolItemInfo {
   readonly toolType: "hammer";
   /** Health that the hammer restores when hitting friendly buildings */
   readonly repairAmount: number;
   readonly workAmount: number;
}

export interface PlaceableItemInfo extends StackableItemInfo {
   readonly entityType: EntityType;
}

export interface BackpackItemInfo extends BaseItemInfo {
   /** Width of the backpack inventory in terms of item slots. */
   readonly inventoryWidth: number;
   /** Width of the backpack inventory in terms of item slots. */
   readonly inventoryHeight: number
}

export interface ArmourItemInfo extends BaseItemInfo {
   readonly defence: number;
}

export interface GloveItemInfo extends BaseItemInfo {}

export interface SpearItemInfo extends ToolItemInfo {}

export interface BattleaxeItemInfo extends ToolItemInfo {}

export interface ShieldItemInfo extends BaseItemInfo {}

export interface SlingshotItemInfo extends BaseItemInfo {}

export interface AnimalStaffItemInfo extends BaseItemInfo {
   readonly controlRange: number;
}

export interface TamingAlmanacItemInfo extends BaseItemInfo {}

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
   shield: ShieldItemInfo;
   slingshot: SlingshotItemInfo;
   animalStaff: AnimalStaffItemInfo;
   tamingAlmanac: TamingAlmanacItemInfo;
}

export interface AttackInfo {
   readonly attackPatterns: Record<LimbConfiguration, AttackPatternInfo> | null;
   readonly attackTimings: AttackTimingsInfo;
   readonly heldItemDamageBoxInfo: LimbHeldItemDamageBoxInfo;
}

const UNARMED_ATTACK_INFO: Readonly<AttackInfo> = {
   attackPatterns: UNARMED_ATTACK_PATTERNS,
   attackTimings: DEFAULT_ATTACK_TIMINGS,
   heldItemDamageBoxInfo: DEFAULT_ITEM_DAMAGE_BOX_INFO
};

/** If an entry is null, then that item category can't attack. */
const ITEM_CATEGORY_ATTACK_INFO_RECORD: Record<keyof ItemInfoRecord, Readonly<AttackInfo>> = {
   material: {
      attackPatterns: UNARMED_ATTACK_PATTERNS,
      attackTimings: DEFAULT_ATTACK_TIMINGS,
      heldItemDamageBoxInfo: DEFAULT_ITEM_DAMAGE_BOX_INFO
   },
   healing: {
      attackPatterns: UNARMED_ATTACK_PATTERNS,
      attackTimings: DEFAULT_ATTACK_TIMINGS,
      heldItemDamageBoxInfo: DEFAULT_ITEM_DAMAGE_BOX_INFO
   },
   sword: {
      attackPatterns: UNARMED_ATTACK_PATTERNS,
      attackTimings: SWORD_ATTACK_TIMINGS,
      heldItemDamageBoxInfo: SWORD_ITEM_DAMAGE_BOX_INFO
   },
   bow: {
      attackPatterns: UNARMED_ATTACK_PATTERNS,
      attackTimings: DEFAULT_ATTACK_TIMINGS,
      heldItemDamageBoxInfo: DEFAULT_ITEM_DAMAGE_BOX_INFO
   },
   axe: {
      attackPatterns: UNARMED_ATTACK_PATTERNS,
      attackTimings: AXE_ATTACK_TIMINGS,
      heldItemDamageBoxInfo: TOOL_ITEM_DAMAGE_BOX_INFO
   },
   pickaxe: {
      attackPatterns: UNARMED_ATTACK_PATTERNS,
      attackTimings: PICKAXE_ATTACK_TIMINGS,
      heldItemDamageBoxInfo: PICKAXE_ITEM_DAMAGE_BOX_INFO
   },
   placeable: {
      attackPatterns: UNARMED_ATTACK_PATTERNS,
      attackTimings: DEFAULT_ATTACK_TIMINGS,
      heldItemDamageBoxInfo: DEFAULT_ITEM_DAMAGE_BOX_INFO
   },
   backpack: {
      attackPatterns: UNARMED_ATTACK_PATTERNS,
      attackTimings: DEFAULT_ATTACK_TIMINGS,
      heldItemDamageBoxInfo: DEFAULT_ITEM_DAMAGE_BOX_INFO
   },
   armour: {
      attackPatterns: UNARMED_ATTACK_PATTERNS,
      attackTimings: DEFAULT_ATTACK_TIMINGS,
      heldItemDamageBoxInfo: DEFAULT_ITEM_DAMAGE_BOX_INFO
   },
   glove: {
      attackPatterns: UNARMED_ATTACK_PATTERNS,
      attackTimings: DEFAULT_ATTACK_TIMINGS,
      heldItemDamageBoxInfo: DEFAULT_ITEM_DAMAGE_BOX_INFO
   },
   spear: {
      attackPatterns: SPEAR_ATTACK_PATTERNS,
      attackTimings: SPEAR_ATTACK_TIMINGS,
      heldItemDamageBoxInfo: SPEAR_DAMAGE_BOX_INFO
   },
   hammer: {
      attackPatterns: UNARMED_ATTACK_PATTERNS,
      attackTimings: HAMMER_ATTACK_TIMINGS,
      heldItemDamageBoxInfo: TOOL_ITEM_DAMAGE_BOX_INFO
   },
   battleaxe: {
      attackPatterns: UNARMED_ATTACK_PATTERNS,
      attackTimings: HAMMER_ATTACK_TIMINGS,
      heldItemDamageBoxInfo: SWORD_ITEM_DAMAGE_BOX_INFO
   },
   crossbow: {
      attackPatterns: UNARMED_ATTACK_PATTERNS,
      attackTimings: DEFAULT_ATTACK_TIMINGS,
      heldItemDamageBoxInfo: DEFAULT_ITEM_DAMAGE_BOX_INFO
   },
   shield: {
      attackPatterns: null,
      attackTimings: {
         windupTimeTicks: 0,
         swingTimeTicks: 0,
         returnTimeTicks: 0,
         restTimeTicks: 0,
         /** If null, then the attack cannot block. */
         blockTimeTicks: Math.floor(0.2 * Settings.TICK_RATE)
      },
      heldItemDamageBoxInfo: SHIELD_BLOCKING_DAMAGE_BOX_INFO
   },
   slingshot: {
      attackPatterns: UNARMED_ATTACK_PATTERNS,
      attackTimings: DEFAULT_ATTACK_TIMINGS,
      heldItemDamageBoxInfo: DEFAULT_ITEM_DAMAGE_BOX_INFO
   },
   animalStaff: {
      attackPatterns: UNARMED_ATTACK_PATTERNS,
      attackTimings: DEFAULT_ATTACK_TIMINGS,
      heldItemDamageBoxInfo: DEFAULT_ITEM_DAMAGE_BOX_INFO
   },
   tamingAlmanac: {
      attackPatterns: UNARMED_ATTACK_PATTERNS,
      attackTimings: DEFAULT_ATTACK_TIMINGS,
      heldItemDamageBoxInfo: DEFAULT_ITEM_DAMAGE_BOX_INFO
   }
};

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
   [ItemType.frostSword]: "sword",
   [ItemType.frostPickaxe]: "pickaxe",
   [ItemType.frostAxe]: "axe",
   [ItemType.frostArmour]: "armour",
   [ItemType.campfire]: "placeable",
   [ItemType.furnace]: "placeable",
   [ItemType.wooden_bow]: "bow",
   [ItemType.meat_suit]: "armour",
   [ItemType.deepfrost_heart]: "material",
   [ItemType.raw_fish]: "healing",
   [ItemType.cooked_fish]: "healing",
   [ItemType.fishlord_suit]: "armour",
   [ItemType.gathering_gloves]: "glove",
   [ItemType.leather_armour]: "armour",
   [ItemType.woodenSpear]: "spear",
   [ItemType.stoneSpear]: "spear",
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
   [ItemType.stonecarvingTable]: "placeable",
   [ItemType.woodenShield]: "shield",
   [ItemType.slingshot]: "slingshot",
   [ItemType.woodenBracings]: "placeable",
   [ItemType.fireTorch]: "placeable",
   [ItemType.slurb]: "material",
   [ItemType.slurbTorch]: "placeable",
   [ItemType.rawYetiFlesh]: "healing",
   [ItemType.cookedYetiFlesh]: "healing",
   [ItemType.mithrilOre]: "material",
   [ItemType.mithrilBar]: "material",
   [ItemType.mithrilSword]: "sword",
   [ItemType.mithrilPickaxe]: "pickaxe",
   [ItemType.mithrilAxe]: "axe",
   [ItemType.mithrilArmour]: "armour",
   [ItemType.scrappy]: "placeable",
   [ItemType.cogwalker]: "placeable",
   [ItemType.automatonAssembler]: "placeable",
   [ItemType.mithrilAnvil]: "placeable",
   [ItemType.animalStaff]: "animalStaff",
   [ItemType.woodenArrow]: "material",
   [ItemType.tamingAlmanac]: "tamingAlmanac",
   [ItemType.floorSign]: "placeable",
   [ItemType.pricklyPear]: "healing",
   [ItemType.rawCrabMeat]: "healing",
   [ItemType.cookedCrabMeat]: "healing",
   [ItemType.chitin]: "material",
   [ItemType.crabplateArmour]: "armour",
   [ItemType.dustfleaEgg]: "healing",
   [ItemType.snowberry]: "healing",
   [ItemType.rawSnobeMeat]: "healing",
   [ItemType.snobeStew]: "healing",
   [ItemType.snobeHide]: "material",
   [ItemType.inguSerpentTooth]: "material",
   [ItemType.iceWringer]: "sword",
   [ItemType.rawTukmokMeat]: "healing",
   [ItemType.cookedTukmokMeat]: "healing",
   [ItemType.tukmokFurHide]: "material",
   [ItemType.winterskinArmour]: "armour",
   [ItemType.ivoryTusk]: "sword",
   [ItemType.ivorySpear]: "spear",
   [ItemType.sock]: "material",
   [ItemType.mrpebbles]: "material"
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
      damage: 1,
      knockback: 150,
      // @Incomplete
      // attackCooldown: 0.3,
   },
   [ItemType.wooden_axe]: {
      stackSize: 1,
      toolType: "axe",
      damage: 3,
      knockback: 100,
      // @Incomplete
      // attackCooldown: 0.5,
   },
   [ItemType.wooden_pickaxe]: {
      stackSize: 1,
      toolType: "pickaxe",
      damage: 5,
      knockback: 100,
      // @Incomplete
      // attackCooldown: 0.5,
      wallDamage: 1
   },
   [ItemType.wooden_hammer]: {
      stackSize: 1,
      toolType: "hammer",
      damage: 2,
      knockback: 150,
      // @Incomplete
      // attackCooldown: 0.7,
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
      healAmount: 3,
      consumeTime: 1.5,
      consumableItemCategory: ConsumableItemCategory.food
   },
   [ItemType.rock]: {
      stackSize: 99
   },
   [ItemType.stone_sword]: {
      stackSize: 1,
      toolType: "sword",
      damage: 2,
      knockback: 150
   },
   [ItemType.stone_pickaxe]: {
      stackSize: 1,
      toolType: "pickaxe",
      damage: 8,
      knockback: 100,
      wallDamage: 2
   },
   [ItemType.stone_axe]: {
      stackSize: 1,
      toolType: "axe",
      damage: 5,
      knockback: 100
   },
   [ItemType.stone_hammer]: {
      stackSize: 1,
      toolType: "hammer",
      damage: 3,
      knockback: 150,
      repairAmount: 5,
      workAmount: 2
   },
   [ItemType.leather]: {
      stackSize: 99
   },
   [ItemType.leather_backpack]: {
      inventoryWidth: 2,
      inventoryHeight: 2
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
      damage: 1,
      knockback: 0
      // @Incomplete
      // attackCooldown: 0.3,
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
   [ItemType.frostSword]: {
      stackSize: 1,
      toolType: "sword",
      // @Incomplete: shouldn't be as good as the mithril sword!
      damage: 3,
      knockback: 150
   },
   [ItemType.frostPickaxe]: {
      stackSize: 1,
      toolType: "pickaxe",
      damage: 10,
      knockback: 100,
      wallDamage: 3
   },
   [ItemType.frostAxe]: {
      stackSize: 1,
      toolType: "axe",
      damage: 8,
      knockback: 100
   },
   [ItemType.frostArmour]: {
      defence: 0.25
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
      shotChargeTimeTicks: Settings.TICK_RATE,
      projectileSpeed: 1100,
      airResistance: 400
   },
   [ItemType.reinforced_bow]: {
      projectileDamage: 6,
      projectileKnockback: 200,
      shotChargeTimeTicks: 1 * Settings.TICK_RATE,
      projectileSpeed: 1500,
      airResistance: 300
   },
   [ItemType.ice_bow]: {
      projectileDamage: 0,
      projectileKnockback: 0,
      shotChargeTimeTicks: 1.25 * Settings.TICK_RATE,
      projectileSpeed: 1100,
      airResistance: 400
   },
   [ItemType.crossbow]: {
      projectileDamage: 6,
      projectileKnockback: 200,
      shotChargeTimeTicks: 1 * Settings.TICK_RATE,
      projectileSpeed: 1500,
      airResistance: 300
   },
   [ItemType.meat_suit]: {
      defence: 0
   },
   [ItemType.deepfrost_heart]: {
      stackSize: 99
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
      defence: 0.1
   },
   [ItemType.gathering_gloves]: {
      level: 1
   },
   [ItemType.leather_armour]: {
      defence: 0.1
   },
   [ItemType.woodenSpear]: {
      stackSize: 99,
      toolType: "spear",
      damage: 2,
      knockback: 300
      // @Incomplete
      // attackCooldown: 0.8,
   },
   [ItemType.stoneSpear]: {
      stackSize: 99,
      toolType: "spear",
      damage: 4,
      knockback: 300
      // @Incomplete
      // attackCooldown: 0.8,
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
      knockback: 150
      // @Incomplete
      // attackCooldown: 0.5,
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
      defence: 0
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
   },
   [ItemType.woodenShield]: {},
   [ItemType.slingshot]: {},
   [ItemType.woodenBracings]: {
      stackSize: 99,
      entityType: EntityType.bracings
   },
   [ItemType.fireTorch]: {
      stackSize: 99,
      entityType: EntityType.fireTorch
   },
   [ItemType.slurb]: {
      stackSize: 99
   },
   [ItemType.slurbTorch]: {
      stackSize: 99,
      entityType: EntityType.slurbTorch
   },
   [ItemType.rawYetiFlesh]: {
      stackSize: 99,
      consumeTime: 1.5,
      healAmount: 1,
      consumableItemCategory: ConsumableItemCategory.food
   },
   [ItemType.cookedYetiFlesh]: {
      stackSize: 99,
      consumeTime: 1.5,
      healAmount: 5,
      consumableItemCategory: ConsumableItemCategory.food
   },
   [ItemType.mithrilOre]: {
      stackSize: 99
   },
   [ItemType.mithrilBar]: {
      stackSize: 99
   },
   [ItemType.mithrilSword]: {
      stackSize: 1,
      toolType: "sword",
      damage: 3,
      knockback: 170
   },
   [ItemType.mithrilPickaxe]: {
      stackSize: 1,
      toolType: "pickaxe",
      damage: 13,
      knockback: 100,
      // @Temporary
      wallDamage: 12
   },
   [ItemType.mithrilAxe]: {
      stackSize: 1,
      toolType: "axe",
      damage: 8,
      knockback: 100
   },
   [ItemType.mithrilArmour]: {
      defence: 0.4
   },
   [ItemType.scrappy]: {
      stackSize: 99,
      entityType: EntityType.scrappy
   },
   [ItemType.cogwalker]: {
      stackSize: 99,
      entityType: EntityType.cogwalker
   },
   [ItemType.automatonAssembler]: {
      stackSize: 99,
      entityType: EntityType.automatonAssembler
   },
   [ItemType.mithrilAnvil]: {
      stackSize: 99,
      entityType: EntityType.mithrilAnvil
   },
   [ItemType.animalStaff]: {
      controlRange: 320
   },
   [ItemType.woodenArrow]: {
      stackSize: 16
   },
   [ItemType.tamingAlmanac]: {},
   [ItemType.floorSign]: {
      stackSize: 99,
      entityType: EntityType.floorSign
   },
   [ItemType.pricklyPear]: {
      stackSize: 99,
      consumeTime: 5,
      healAmount: 1,
      consumableItemCategory: ConsumableItemCategory.food
   },
   [ItemType.rawCrabMeat]: {
      stackSize: 99,
      consumeTime: 3,
      healAmount: 1,
      consumableItemCategory: ConsumableItemCategory.food
   },
   [ItemType.cookedCrabMeat]: {
      stackSize: 99,
      consumeTime: 3,
      healAmount: 5,
      consumableItemCategory: ConsumableItemCategory.food
   },
   [ItemType.chitin]: {
      stackSize: 99,
   },
   [ItemType.crabplateArmour]: {
      defence: 0.3
   },
   [ItemType.dustfleaEgg]: {
      stackSize: 99,
      healAmount: 2,
      consumeTime: 0.75,
      consumableItemCategory: ConsumableItemCategory.food
   },
   [ItemType.snowberry]: {
      stackSize: 99,
      healAmount: 1,
      consumeTime: 0.75,
      consumableItemCategory: ConsumableItemCategory.food
   },
   [ItemType.rawSnobeMeat]: {
      stackSize: 99,
      consumeTime: 3,
      healAmount: 1,
      consumableItemCategory: ConsumableItemCategory.food
   },
   [ItemType.snobeStew]: {
      stackSize: 99,
      consumeTime: 3,
      healAmount: 3,
      consumableItemCategory: ConsumableItemCategory.food
   },
   [ItemType.snobeHide]: {
      stackSize: 99
   },
   [ItemType.inguSerpentTooth]: {
      stackSize: 99
   },
   [ItemType.iceWringer]: {
      stackSize: 1,
      toolType: "sword",
      damage: 2,
      knockback: 170
   },
   [ItemType.rawTukmokMeat]: {
      stackSize: 99,
      consumeTime: 3,
      healAmount: 1,
      consumableItemCategory: ConsumableItemCategory.food
   },
   [ItemType.cookedTukmokMeat]: {
      stackSize: 99,
      consumeTime: 3,
      healAmount: 5,
      consumableItemCategory: ConsumableItemCategory.food
   },
   [ItemType.tukmokFurHide]: {
      stackSize: 99
   },
   [ItemType.winterskinArmour]: {
      defence: 0.3
   },
   [ItemType.ivoryTusk]: {
      stackSize: 1,
      toolType: "sword",
      damage: 3,
      knockback: 170
   },
   [ItemType.ivorySpear]: {
      stackSize: 99,
      toolType: "spear",
      damage: 5,
      knockback: 300
   },
   [ItemType.sock]: {
      stackSize: 99
   },
   [ItemType.mrpebbles]: {
      stackSize: 99
   }
} satisfies { [T in ItemType]: ItemInfo<T> };

// Some typescript wizardry

type ExcludeNonPlaceableItemTypes<T extends ItemType> = typeof ITEM_TYPE_RECORD[T] extends "placeable" ? T : never;
export type PlaceableItemType = keyof {
   [T in ItemType as ExcludeNonPlaceableItemTypes<T>]: T;
}

type ExcludeNonStructureItemTypes<T extends PlaceableItemType> = (typeof ITEM_INFO_RECORD[T])["entityType"] extends StructureType ? T : never;
export type StructureItemType = keyof {
   [T in PlaceableItemType as ExcludeNonStructureItemTypes<T>]: T;
}

type ExcludeNonArmourItemTypes<T extends ItemType> = typeof ITEM_TYPE_RECORD[T] extends "armour" ? T : never;
export type ArmourItemType = keyof {
   [T in ItemType as ExcludeNonArmourItemTypes<T>]: T;
}
export const ARMOUR_ITEM_TYPES = ALL_ITEM_TYPES.filter(itemType => itemTypeIsArmour(itemType)) as ReadonlyArray<ArmourItemType>;

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

export enum InventoryName {
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

export const InventoryNameString: Record<InventoryName, string> = {
   [InventoryName.hotbar]: "Hotbar",
   [InventoryName.offhand]: "Offhand",
   [InventoryName.craftingOutputSlot]: "Crafting Output Slot",
   [InventoryName.heldItemSlot]: "Held Item Slot",
   [InventoryName.armourSlot]: "Armour Slot",
   [InventoryName.backpackSlot]: "Backpack Slot",
   [InventoryName.gloveSlot]: "Glove Slot",
   [InventoryName.backpack]: "Backpack",
   [InventoryName.fuelInventory]: "Fuel Inventory",
   [InventoryName.ingredientInventory]: "Ingredient Inventory",
   [InventoryName.outputInventory]: "Output Inventory",
   [InventoryName.inventory]: "Inventory",
   [InventoryName.handSlot]: "Hand Slot",
   [InventoryName.ammoBoxInventory]: "Ammo Box Inventory",
   [InventoryName.devInventory]: "Dev Inventory"
};

// @Cleanup: move to separate file?
export const INVENTORY_NAME_RECORD: Record<InventoryName, string> = {
   [InventoryName.ammoBoxInventory]: "Ammo Box Inventory",
   [InventoryName.armourSlot]: "Armour Slot",
   [InventoryName.backpack]: "Backpack",
   [InventoryName.backpackSlot]: "Backpack Slot",
   [InventoryName.craftingOutputSlot]: "Crafting Output Slot",
   [InventoryName.devInventory]: "Dev Inventory",
   [InventoryName.fuelInventory]: "Fuel Inventory",
   [InventoryName.gloveSlot]: "Glove Slot",
   [InventoryName.handSlot]: "Hand Slot",
   [InventoryName.heldItemSlot]: "Held Item Slot",
   [InventoryName.hotbar]: "Hotbar",
   [InventoryName.ingredientInventory]: "Ingredient Inventory",
   [InventoryName.inventory]: "Inventory",
   [InventoryName.offhand]: "Offhand",
   [InventoryName.outputInventory]: "Output Inventory"
};

export const NUM_INVENTORY_NAMES = Object.keys(InventoryNameString).length;

/** Inventory data sent between client and server */
export interface InventoryData {
   width: number;
   height: number;
   readonly itemSlots: ItemSlots;
   readonly name: InventoryName;
}

// @Hack: all of these
/** Time to move limb to quiver */
export const QUIVER_ACCESS_TIME_TICKS = Math.floor(0.4 * Settings.TICK_RATE);
/** Time to pull arrow from quiver to bow */
export const QUIVER_PULL_TIME_TICKS = Math.floor(0.6 * Settings.TICK_RATE);
export const ARROW_RELEASE_WAIT_TIME_TICKS = Math.floor(0.3 * Settings.TICK_RATE);
export const RETURN_FROM_BOW_USE_TIME_TICKS = Math.floor(0.3 * Settings.TICK_RATE);

export class Item {
   /** Unique identifier for the item */
   public readonly id: number;
   
   public type: ItemType;
   public count: number;

   public nickname: string;
   public namer: string;

   // @Cleanup: so awkward to have to pass in nickname and namer when these will be empty in 99% of cases
   constructor(itemType: ItemType, count: number, id: number, nickname: string, namer: string) {
      this.type = itemType;
      this.count = count;
      this.id = id;
      this.nickname = nickname;
      this.namer = namer;
   }
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

   /** @returns Whether the item was added (if there was space) or not. */
   public addItem(item: Item, itemSlot: number): boolean {
      if (typeof this.itemSlots[itemSlot] !== "undefined") {
         return false;
      }
   
      this.itemSlots[itemSlot] = item;
      this.items.push(item);
      return true;
   }

   public getItem(itemSlot: number): Item | null {
      const item = this.itemSlots[itemSlot];
      if (typeof item === "undefined") {
         return null;
      }
      return item;
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

   public getSlots(): Array<number> {
      const slots = new Array<number>();
      for (let itemSlot = 1; itemSlot <= this.width * this.height; itemSlot++) {
         slots.push(itemSlot);
      }
      return slots;
   }
}

export function copyInventoryDeep(inventory: Inventory): Inventory {
   const newInventory = new Inventory(inventory.width, inventory.height, inventory.name);

   for (let itemSlot = 1; itemSlot <= inventory.width * inventory.height; itemSlot++) {
      const item = inventory.itemSlots[itemSlot];
      if (typeof item !== "undefined") {
         const itemCopy = new Item(item.type, item.count, item.id, item.nickname, item.namer);
         newInventory.addItem(itemCopy, itemSlot);
      }
   }

   return newInventory;
}
export function copyInventoryShallow(inventory: Inventory): Inventory {
   const newInventory = new Inventory(inventory.width, inventory.height, inventory.name);

   for (let itemSlot = 1; itemSlot <= inventory.width * inventory.height; itemSlot++) {
      const item = inventory.itemSlots[itemSlot];
      if (typeof item !== "undefined") {
         newInventory.addItem(item, itemSlot);
      }
   }

   return newInventory;
}

/**
 * Checks whether a given item type is able to be stacked.
 * @param itemType The type of item to check.
 * @returns Whether the item type is able to be stacked.
 */
export function itemIsStackable(itemType: ItemType): boolean {
   return ITEM_INFO_RECORD[itemType].hasOwnProperty("stackSize");
}

export function getItemStackSize(itemType: ItemType): number {
   const stackSize = (ITEM_INFO_RECORD[itemType] as StackableItemInfo).stackSize;
   return stackSize || 1;
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

export function itemInfoIsPlaceable(itemType: ItemType, itemInfo: unknown): itemInfo is PlaceableItemInfo {
   const itemTypeInfo = ITEM_TYPE_RECORD[itemType];
   return itemTypeInfo === "placeable";
}

export function itemInfoIsConsumable(itemType: ItemType, itemInfo: unknown): itemInfo is ConsumableItemInfo {
   const itemTypeInfo = ITEM_TYPE_RECORD[itemType];
   return itemTypeInfo === "healing";
}

export function itemTypeIsArmour(itemType: ItemType): itemType is ArmourItemType {
   return ITEM_TYPE_RECORD[itemType] === "armour";
}

export function itemTypeIsBackpack(itemType: ItemType): boolean {
   return ITEM_TYPE_RECORD[itemType] === "backpack";
}

export function itemTypeIsGlove(itemType: ItemType): itemType is GloveItemType {
   return ITEM_TYPE_RECORD[itemType] === "glove";
}

export function itemTypeIsHammer(itemType: ItemType): itemType is HammerItemType {
   return ITEM_TYPE_RECORD[itemType] === "hammer";
}

export function getItemAttackInfo(itemType: ItemType | null): AttackInfo {
   if (itemType === null) {
      return UNARMED_ATTACK_INFO;
   }

   // @HACK cuz the ivory spear has a different hitbox than the other spears
   if (itemType === ItemType.ivorySpear) {
      return {
         attackPatterns: SPEAR_ATTACK_PATTERNS,
         attackTimings: SPEAR_ATTACK_TIMINGS,
         heldItemDamageBoxInfo: IVORY_SPEAR_DAMAGE_BOX_INFO
      };
   }

   const itemCategory = ITEM_TYPE_RECORD[itemType];
   return ITEM_CATEGORY_ATTACK_INFO_RECORD[itemCategory];
}

export function getItemType(item: Item | null): ItemType | null {
   return item !== null ? item.type : null;
}
import { ItemType } from "../../../shared/src/items/items";
import { assert } from "../../../shared/src/utils";
import { TextureIndex } from "../texture-index";

export interface ClientItemInfo {
   readonly entityTextureIndex: TextureIndex;
   readonly textureIndex: TextureIndex;
   /** Texture source when used as a tool in a tribe members' hand. Empty string if not used as a tool */
   readonly toolTextureIndex: TextureIndex;
   readonly name: string;
   readonly namePlural: string;
   /** A description of what the item is for. */
   readonly description: string;
   /** Random shit shown in small text at the bottom of the item tooltip */
   readonly flavourText?: string;
}

const itemImages = import.meta.glob("/src/images/items/**/*", { eager: true, query: "?url", import: "default" });

const CLIENT_ITEM_INFO_RECORD: Record<ItemType, ClientItemInfo> = {
   [ItemType.wood]: {
      entityTextureIndex: TextureIndex.items_small_wood,
      textureIndex: TextureIndex.items_large_wood,
      toolTextureIndex: 0,
      name: "Wood",
      namePlural: "Wood",
      description: "A common material used in crafting many things."
   },
   [ItemType.wooden_sword]: {
      entityTextureIndex: TextureIndex.items_small_woodenSword,
      textureIndex: TextureIndex.items_large_woodenSword,
      toolTextureIndex: TextureIndex.items_large_woodenSword,
      name: "Wooden Sword",
      namePlural: "Wooden Swords",
      description: "Basic sword.",
      flavourText: "The splinters hurt you as much as the blade hurts the enemy."
   },
   [ItemType.wooden_axe]: {
      entityTextureIndex: TextureIndex.items_small_woodenAxe,
      textureIndex: TextureIndex.items_large_woodenAxe,
      toolTextureIndex: TextureIndex.items_large_woodenAxe,
      name: "Wooden Axe",
      namePlural: "Wooden Axes",
      description: "Basic axe."
   },
   [ItemType.wooden_pickaxe]: {
      entityTextureIndex: TextureIndex.items_small_woodenPickaxe,
      textureIndex: TextureIndex.items_large_woodenPickaxe,
      toolTextureIndex: TextureIndex.items_large_woodenPickaxe,
      name: "Wooden Pickaxe",
      namePlural: "Wooden Pickaxes",
      description: ""
   },
   [ItemType.berry]: {
      entityTextureIndex: TextureIndex.items_small_berry,
      textureIndex: TextureIndex.items_large_berry,
      toolTextureIndex: 0,
      name: "Berry",
      namePlural: "Berries",
      description: "Provides little sustenance, but can be used in a pinch."
   },
   [ItemType.raw_beef]: {
      entityTextureIndex: TextureIndex.items_small_rawBeef,
      textureIndex: TextureIndex.items_large_rawBeef,
      toolTextureIndex: 0,
      name: "Raw Beef",
      namePlural: "Raw Beef",
      description: "The raw mutilated flesh of a deceased cow - would not recommend eating."
   },
   [ItemType.cooked_beef]: {
      entityTextureIndex: TextureIndex.items_small_cookedBeef,
      textureIndex: TextureIndex.items_large_cookedBeef,
      toolTextureIndex: 0,
      name: "Cooked Beef",
      namePlural: "Cooked Beef",
      description: "A hearty meal. Could use some seasoning."
   },
   [ItemType.workbench]: {
      entityTextureIndex: TextureIndex.items_small_workbench,
      textureIndex: TextureIndex.items_large_workbench,
      toolTextureIndex: 0,
      name: "Workbench",
      namePlural: "Workbenches",
      description: "The first crafting station available, able to craft many more complex recipes."
   },
   [ItemType.rock]: {
      entityTextureIndex: TextureIndex.items_small_rock,
      textureIndex: TextureIndex.items_large_rock,
      toolTextureIndex: 0,
      name: "Rock",
      namePlural: "Rocks",
      description: "This Grug rock. No hurt or face wrath of Grug."
   },
   [ItemType.stone_sword]: {
      entityTextureIndex: TextureIndex.items_small_stoneSword,
      textureIndex: TextureIndex.items_large_stoneSword,
      toolTextureIndex: TextureIndex.items_large_stoneSword,
      name: "Stone Sword",
      namePlural: "Stone Swords",
      description: ""
   },
   [ItemType.stone_axe]: {
      entityTextureIndex: TextureIndex.items_small_stoneAxe,
      textureIndex: TextureIndex.items_large_stoneAxe,
      toolTextureIndex: TextureIndex.items_large_stoneAxe,
      name: "Stone Axe",
      namePlural: "Stone Axes",
      description: ""
   },
   [ItemType.stone_pickaxe]: {
      entityTextureIndex: TextureIndex.items_small_stonePickaxe,
      textureIndex: TextureIndex.items_large_stonePickaxe,
      toolTextureIndex: TextureIndex.items_large_stonePickaxe,
      name: "Stone Pickaxe",
      namePlural: "Stone Pickaxes",
      description: ""
   },
   [ItemType.stone_hammer]: {
      entityTextureIndex: TextureIndex.items_small_stoneHammer,
      textureIndex: TextureIndex.items_large_stoneHammer,
      toolTextureIndex: TextureIndex.items_large_stoneHammer,
      name: "Stone Hammer",
      namePlural: "Stone Hammers",
      description: ""
   },
   [ItemType.leather]: {
      entityTextureIndex: TextureIndex.items_small_leather,
      textureIndex: TextureIndex.items_large_leather,
      toolTextureIndex: 0,
      name: "Leather",
      namePlural: "Leather",
      description: ""
   },
   [ItemType.leather_backpack]: {
      entityTextureIndex: TextureIndex.items_small_leatherBackpack,
      textureIndex: TextureIndex.items_large_leatherBackpack,
      toolTextureIndex: 0,
      name: "Leather Backpack",
      namePlural: "Leather Backpacks",
      description: "Allows you to hold more item."
   },
   [ItemType.cactus_spine]: {
      entityTextureIndex: TextureIndex.items_small_cactusSpine,
      textureIndex: TextureIndex.items_large_cactusSpine,
      toolTextureIndex: 0,
      name: "Cactus Spine",
      namePlural: "Cactus Spines",
      description: "It's tough and spiky and gets everywhere."
   },
   [ItemType.yeti_hide]: {
      entityTextureIndex: TextureIndex.items_small_yetiHide,
      textureIndex: TextureIndex.items_large_yetiHide,
      toolTextureIndex: 0,
      name: "Yeti Hide",
      namePlural: "Yeti Hides",
      description: "An extremely tough half-frost half-flesh hide."
   },
   [ItemType.frostcicle]: {
      entityTextureIndex: TextureIndex.items_small_frostcicle,
      textureIndex: TextureIndex.items_large_frostcicle,
      toolTextureIndex: 0,
      name: "Frostcicle",
      namePlural: "Frostcicles",
      description: "A perfectly preserved ice shard."
   },
   [ItemType.slimeball]: {
      entityTextureIndex: TextureIndex.items_small_slimeball,
      textureIndex: TextureIndex.items_large_slimeball,
      toolTextureIndex: 0,
      name: "Slimeball",
      namePlural: "Slimeballs",
      description: ""
   },
   [ItemType.eyeball]: {
      entityTextureIndex: TextureIndex.items_small_eyeball,
      textureIndex: TextureIndex.items_large_eyeball,
      toolTextureIndex: 0,
      name: "Eyeball",
      namePlural: "Eyeballs",
      description: ""
   },
   [ItemType.flesh_sword]: {
      entityTextureIndex: TextureIndex.items_small_fleshSword,
      textureIndex: TextureIndex.items_large_fleshSword,
      toolTextureIndex: TextureIndex.items_large_fleshSword,
      name: "Flesh Sword",
      namePlural: "Flesh Swords",
      description: ""
   },
   [ItemType.tribe_totem]: {
      entityTextureIndex: TextureIndex.items_small_tribeTotem,
      textureIndex: TextureIndex.items_large_tribeTotem,
      toolTextureIndex: 0,
      name: "Totem",
      namePlural: "Totems",
      description: "Centerpiece of the tribe."
   },
   [ItemType.worker_hut]: {
      entityTextureIndex: TextureIndex.items_small_workerHut,
      textureIndex: TextureIndex.items_large_workerHut,
      toolTextureIndex: 0,
      name: "Worker Hut",
      namePlural: "Worker Huts",
      description: ""
   },
   [ItemType.barrel]: {
      entityTextureIndex: TextureIndex.items_small_barrel,
      textureIndex: TextureIndex.items_large_barrel,
      toolTextureIndex: 0,
      name: "Barrel",
      namePlural: "Barrels",
      description: ""
   },
   [ItemType.frostSword]: {
      entityTextureIndex: TextureIndex.items_small_frostSword,
      textureIndex: TextureIndex.items_large_frostSword,
      toolTextureIndex: TextureIndex.items_large_frostSword,
      name: "Frost Sword",
      namePlural: "Frost Swords",
      description: ""
   },
   [ItemType.frostPickaxe]: {
      entityTextureIndex: TextureIndex.items_small_frostPickaxe,
      textureIndex: TextureIndex.items_large_frostPickaxe,
      toolTextureIndex: TextureIndex.items_large_frostPickaxe,
      name: "Frost Pickaxe",
      namePlural: "Frost Pickaxes",
      description: ""
   },
   [ItemType.frostAxe]: {
      entityTextureIndex: TextureIndex.items_small_frostAxe,
      textureIndex: TextureIndex.items_large_frostAxe,
      toolTextureIndex: TextureIndex.items_large_frostAxe,
      name: "Frost Axe",
      namePlural: "Frost Axes",
      description: ""
   },
   [ItemType.frostArmour]: {
      entityTextureIndex: TextureIndex.items_small_frostArmour,
      textureIndex: TextureIndex.items_large_frostArmour,
      toolTextureIndex: 0,
      name: "Frost Armour",
      namePlural: "Frost Armours",
      description: ""
   },
   [ItemType.campfire]: {
      entityTextureIndex: TextureIndex.items_small_campfire,
      textureIndex: TextureIndex.items_large_campfire,
      toolTextureIndex: 0,
      name: "Campfire",
      namePlural: "Campfires",
      description: ""
   },
   [ItemType.furnace]: {
      entityTextureIndex: TextureIndex.items_small_furnace,
      textureIndex: TextureIndex.items_large_furnace,
      toolTextureIndex: 0,
      name: "Furnace",
      namePlural: "Furnaces",
      description: ""
   },
   [ItemType.wooden_bow]: {
      entityTextureIndex: TextureIndex.items_small_woodenBow,
      textureIndex: TextureIndex.items_large_woodenBow,
      toolTextureIndex: TextureIndex.items_large_woodenBow,
      name: "Wooden Bow",
      namePlural: "Wooden Bows",
      description: ""
   },
   [ItemType.reinforced_bow]: {
      entityTextureIndex: TextureIndex.items_small_reinforcedBow,
      textureIndex: TextureIndex.items_large_reinforcedBow,
      toolTextureIndex: TextureIndex.items_large_reinforcedBow,
      name: "Reinforced Bow",
      namePlural: "Reinforced Bows",
      description: ""
   },
   [ItemType.ice_bow]: {
      entityTextureIndex: TextureIndex.items_small_iceBow,
      textureIndex: TextureIndex.items_large_iceBow,
      toolTextureIndex: TextureIndex.items_large_iceBow,
      name: "Ice Bow",
      namePlural: "Ice Bows",
      description: ""
   },
   [ItemType.crossbow]: {
      entityTextureIndex: TextureIndex.items_small_crossbow,
      textureIndex: TextureIndex.items_large_crossbow,
      toolTextureIndex: TextureIndex.items_large_crossbow,
      name: "Crossbow",
      namePlural: "Crossbows",
      description: ""
   },
   [ItemType.meat_suit]: {
      entityTextureIndex: TextureIndex.items_small_meatSuit,
      textureIndex: TextureIndex.items_large_meatSuit,
      toolTextureIndex: 0,
      name: "Meat Suit",
      namePlural: "Meat Suits",
      description: "You think you are Cow, but you are not. You are a mere imitation, a foolish attempt to recreate That which is divine."
   },
   [ItemType.deepfrost_heart]: {
      entityTextureIndex: TextureIndex.items_small_deepfrostHeart,
      textureIndex: TextureIndex.items_large_deepfrostHeart,
      toolTextureIndex: 0,
      name: "Deepfrost Heart",
      namePlural: "Deepfrost Hearts",
      description: ""
   },
   [ItemType.raw_fish]: {
      entityTextureIndex: TextureIndex.items_small_rawFish,
      textureIndex: TextureIndex.items_large_rawFish,
      toolTextureIndex: 0,
      name: "Raw Fish",
      namePlural: "Raw Fishes",
      description: ""
   },
   [ItemType.cooked_fish]: {
      entityTextureIndex: TextureIndex.items_small_cookedFish,
      textureIndex: TextureIndex.items_large_cookedFish,
      toolTextureIndex: 0,
      name: "Cooked Fish",
      namePlural: "Cooked Fishes",
      description: ""
   },
   [ItemType.fishlord_suit]: {
      entityTextureIndex: TextureIndex.items_small_fishlordSuit,
      textureIndex: TextureIndex.items_large_fishlordSuit,
      toolTextureIndex: 0,
      name: "Fish Suit",
      namePlural: "Fish Suits", 
      description: ""
   },
   [ItemType.gathering_gloves]: {
      entityTextureIndex: TextureIndex.items_small_gatheringGloves,
      textureIndex: TextureIndex.items_large_gatheringGloves,
      toolTextureIndex: 0,
      name: "Gathering Gloves",
      namePlural: "Gathering Gloves", 
      description: ""
   },
   [ItemType.leather_armour]: {
      entityTextureIndex: TextureIndex.items_small_leatherArmour,
      textureIndex: TextureIndex.items_large_leatherArmour,
      toolTextureIndex: 0,
      name: "Leather Armour",
      namePlural: "Leather Armours", 
      description: ""
   },
   [ItemType.woodenSpear]: {
      entityTextureIndex: TextureIndex.items_small_woodenSpear,
      textureIndex: TextureIndex.items_large_woodenSpear,
      toolTextureIndex: TextureIndex.items_misc_woodenSpear,
      name: "Wooden Spear",
      namePlural: "Wooden Spears",
      description: "Pointy end works best."
   },
   [ItemType.stoneSpear]: {
      entityTextureIndex: TextureIndex.items_small_stoneSpear,
      textureIndex: TextureIndex.items_large_stoneSpear,
      toolTextureIndex: TextureIndex.items_misc_stoneSpear,
      name: "Stone Spear",
      namePlural: "Stone Spears", 
      description: "Pointy end works best."
   },
   [ItemType.paper]: {
      entityTextureIndex: TextureIndex.items_small_paper,
      textureIndex: TextureIndex.items_large_paper,
      toolTextureIndex: 0,
      name: "Paper",
      namePlural: "Papers", 
      description: ""
   },
   [ItemType.research_bench]: {
      entityTextureIndex: TextureIndex.items_small_researchBench,
      textureIndex: TextureIndex.items_large_researchBench,
      toolTextureIndex: 0,
      name: "Research Bench",
      namePlural: "Research Benches", 
      description: ""
   },
   [ItemType.wooden_wall]: {
      entityTextureIndex: TextureIndex.items_small_woodenWall,
      textureIndex: TextureIndex.items_large_woodenWall,
      toolTextureIndex: 0,
      name: "Wooden Wall",
      namePlural: "Wooden Walls",
      description: ""
   },
   [ItemType.wooden_hammer]: {
      entityTextureIndex: TextureIndex.items_small_woodenHammer,
      textureIndex: TextureIndex.items_large_woodenHammer,
      toolTextureIndex: TextureIndex.items_large_woodenHammer,
      name: "Wooden Hammer",
      namePlural: "Wooden Hammers",
      description: ""
   },
   [ItemType.stone_battleaxe]: {
      entityTextureIndex: TextureIndex.items_small_stoneBattleaxe,
      textureIndex: TextureIndex.items_large_stoneBattleaxe,
      toolTextureIndex: TextureIndex.items_large_stoneBattleaxe,
      name: "Stone Battleaxe",
      namePlural: "Stone Battleaxes",
      description: ""
   },
   [ItemType.living_rock]: {
      entityTextureIndex: TextureIndex.items_small_livingRock,
      textureIndex: TextureIndex.items_large_livingRock,
      toolTextureIndex: 0,
      name: "Living Rock",
      namePlural: "Living Rocks",
      description: ""
   },
   [ItemType.planter_box]: {
      entityTextureIndex: TextureIndex.items_small_planterBox,
      textureIndex: TextureIndex.items_large_planterBox,
      toolTextureIndex: 0,
      name: "Planter Box",
      namePlural: "Planter Boxes",
      description: ""
   },
   [ItemType.poop]: {
      entityTextureIndex: TextureIndex.items_small_poop,
      textureIndex: TextureIndex.items_large_poop,
      toolTextureIndex: 0,
      name: "Poop",
      namePlural: "Poops",
      description: ""
   },
   [ItemType.wooden_spikes]: {
      entityTextureIndex: TextureIndex.items_small_woodenSpikes,
      textureIndex: TextureIndex.items_large_woodenSpikes,
      toolTextureIndex: 0,
      name: "Wooden Spikes",
      namePlural: "Wooden Spikes",
      description: ""
   },
   [ItemType.punji_sticks]: {
      entityTextureIndex: TextureIndex.items_small_punjiSticks,
      textureIndex: TextureIndex.items_large_punjiSticks,
      toolTextureIndex: 0,
      name: "Punji Sticks",
      namePlural: "Punji Sticks",
      description: "Slightly weaker than wooden spikes, but inflicts additional poison damage."
   },
   [ItemType.ballista]: {
      entityTextureIndex: TextureIndex.items_small_ballista,
      textureIndex: TextureIndex.items_large_ballista,
      toolTextureIndex: 0,
      name: "Ballista",
      namePlural: "Ballistas",
      description: "An automatic crossbow turret. Requires ammo to function."
   },
   [ItemType.sling_turret]: {
      // @Incomplete
      entityTextureIndex: TextureIndex.items_small_ballista,
      textureIndex: TextureIndex.items_large_slingTurret,
      toolTextureIndex: 0,
      name: "Sling Turret",
      namePlural: "Sling Turrets",
      description: ""
   },
   [ItemType.healing_totem]: {
      // @Incomplete
      entityTextureIndex: TextureIndex.items_small_ballista,
      textureIndex: TextureIndex.items_large_healingTotem,
      toolTextureIndex: 0,
      name: "Healing Totem",
      namePlural: "Healing Totems",
      description: "Concentrates healing beams to heal nearby tribesmen."
   },
   [ItemType.leaf]: {
      entityTextureIndex: TextureIndex.items_small_leaf,
      textureIndex: TextureIndex.items_large_leaf,
      toolTextureIndex: 0,
      name: "Leaf",
      namePlural: "Leaves",
      description: ""
   },
   [ItemType.herbal_medicine]: {
      entityTextureIndex: TextureIndex.items_small_herbalMedicine,
      textureIndex: TextureIndex.items_large_herbalMedicine,
      toolTextureIndex: 0,
      name: "Herbal Medicine",
      namePlural: "Herbal Medicines",
      description: ""
   },
   // @Incomplete
   [ItemType.leaf_suit]: {
      entityTextureIndex: TextureIndex.items_small_leatherArmour,
      textureIndex: TextureIndex.items_large_leafSuit,
      toolTextureIndex: 0,
      name: "Leaf Suit",
      namePlural: "Leaf Suits",
      description: ""
   },
   [ItemType.seed]: {
      entityTextureIndex: TextureIndex.items_small_seed,
      textureIndex: TextureIndex.items_large_seed,
      toolTextureIndex: 0,
      name: "Seed",
      namePlural: "Seeds",
      description: ""
   },
   [ItemType.gardening_gloves]: {
      entityTextureIndex: TextureIndex.items_small_gardeningGloves,
      textureIndex: TextureIndex.items_large_gardeningGloves,
      toolTextureIndex: 0,
      name: "Gardening Gloves",
      namePlural: "Gardening Gloves",
      description: ""
   },
   [ItemType.wooden_fence]: {
      entityTextureIndex: TextureIndex.items_small_fence,
      textureIndex: TextureIndex.items_large_fence,
      toolTextureIndex: 0,
      name: "Wooden Fence",
      namePlural: "Wooden Fences",
      description: "Good for keeping cows in, not so good for defending your valuables."
   },
   [ItemType.fertiliser]: {
      entityTextureIndex: TextureIndex.items_small_fertiliser,
      textureIndex: TextureIndex.items_large_fertiliser,
      toolTextureIndex: 0,
      name: "Fertiliser",
      namePlural: "Fertilisers",
      description: "Speeds up plant growth when used on planter boxes."
   },
   [ItemType.frostshaper]: {
      entityTextureIndex: TextureIndex.items_small_frostshaper,
      textureIndex: TextureIndex.items_large_frostshaper,
      toolTextureIndex: 0,
      name: "Frostshaper",
      namePlural: "Frostshapers",
      description: "Carves ice into complex shapes."
   },
   [ItemType.stonecarvingTable]: {
      entityTextureIndex: TextureIndex.items_small_stonecarvingTable,
      textureIndex: TextureIndex.items_large_stonecarvingTable,
      toolTextureIndex: 0,
      name: "Stonecarving Table",
      namePlural: "Stonecarving Tables",
      description: "Carves stone into complex shapes."
   },
   [ItemType.woodenShield]: {
      entityTextureIndex: TextureIndex.items_small_woodenShield,
      textureIndex: TextureIndex.items_large_woodenShield,
      toolTextureIndex: TextureIndex.entities_shieldItems_woodenShield,
      name: "Wooden Shield",
      namePlural: "Wooden Shields",
      description: "Blocks projectiles and melee attacks, poorly."
   },
   [ItemType.slingshot]: {
      // @Incomplete
      entityTextureIndex: TextureIndex.items_small_woodenShield,
      textureIndex: TextureIndex.items_large_slingshot,
      toolTextureIndex: TextureIndex.entities_shieldItems_woodenShield,
      name: "Slingshot",
      namePlural: "Slingshots",
      description: "Slings rocks at people you don't like."
   },
   [ItemType.woodenBracings]: {
      entityTextureIndex: TextureIndex.items_small_woodenBracings,
      textureIndex: TextureIndex.items_large_woodenBracings,
      toolTextureIndex: 0,
      name: "Wooden Bracings",
      namePlural: "Wooden Bracings",
      description: "Supports the surrounding stone's mental health, preventing them from collapsing."
   },
   [ItemType.fireTorch]: {
      entityTextureIndex: TextureIndex.items_small_fireTorch,
      textureIndex: TextureIndex.items_large_fireTorch,
      toolTextureIndex: 0,
      name: "Fire Torch",
      namePlural: "Fire Torches",
      description: "Provides a temporary light source."
   },
   [ItemType.slurb]: {
      entityTextureIndex: TextureIndex.items_small_slurb,
      textureIndex: TextureIndex.items_large_slurb,
      toolTextureIndex: 0,
      name: "Slurb",
      namePlural: "Slurb",
      description: "Gooey. Glows a bit."
   },
   [ItemType.slurbTorch]: {
      entityTextureIndex: TextureIndex.items_small_slurbTorch,
      textureIndex: TextureIndex.items_large_slurbTorch,
      toolTextureIndex: 0,
      name: "Slurb Torch",
      namePlural: "Slurb Torches",
      description: "Less powerful than a regular torch, but doesn't burn out."
   },
   [ItemType.rawYetiFlesh]: {
      entityTextureIndex: TextureIndex.items_small_rawYetiFlesh,
      textureIndex: TextureIndex.items_large_rawYetiFlesh,
      toolTextureIndex: 0,
      name: "Raw Yeti Flesh",
      namePlural: "Raw Yeti Flesh",
      description: "Disgusting."
   },
   [ItemType.cookedYetiFlesh]: {
      entityTextureIndex: TextureIndex.items_small_cookedYetiFlesh,
      textureIndex: TextureIndex.items_large_cookedYetiFlesh,
      toolTextureIndex: 0,
      name: "Cooked Yeti Flesh",
      namePlural: "Cooked Yeti Flesh",
      description: "Disgusting, but nutritious."
   },
   [ItemType.mithrilOre]: {
      entityTextureIndex: TextureIndex.items_small_mithrilOre,
      textureIndex: TextureIndex.items_large_mithrilOre,
      toolTextureIndex: 0,
      name: "Mithril Ore",
      namePlural: "Mithril Ores",
      description: "Unrefined mithril."
   },
   [ItemType.mithrilBar]: {
      entityTextureIndex: TextureIndex.items_small_mithrilBar,
      textureIndex: TextureIndex.items_large_mithrilBar,
      toolTextureIndex: 0,
      name: "Mithril Bar",
      namePlural: "Mithril Bars",
      description: "Refined mithril."
   },
   [ItemType.mithrilSword]: {
      entityTextureIndex: TextureIndex.items_small_mithrilSword,
      textureIndex: TextureIndex.items_large_mithrilSword,
      toolTextureIndex: TextureIndex.items_large_mithrilSword,
      name: "Mithril Sword",
      namePlural: "Mithril Swords",
      description: ""
   },
   [ItemType.mithrilPickaxe]: {
      entityTextureIndex: TextureIndex.items_small_mithrilPickaxe,
      textureIndex: TextureIndex.items_large_mithrilPickaxe,
      toolTextureIndex: TextureIndex.items_large_mithrilPickaxe,
      name: "Mithril Pickaxe",
      namePlural: "Mithril Pickaxes",
      description: ""
   },
   [ItemType.mithrilAxe]: {
      entityTextureIndex: TextureIndex.items_small_mithrilAxe,
      textureIndex: TextureIndex.items_large_mithrilAxe,
      toolTextureIndex: TextureIndex.items_large_mithrilAxe,
      name: "Mithril Axe",
      namePlural: "Mithril Axes",
      description: ""
   },
   [ItemType.mithrilArmour]: {
      entityTextureIndex: TextureIndex.items_small_mithrilArmour,
      textureIndex: TextureIndex.items_large_mithrilArmour,
      toolTextureIndex: 0,
      name: "Mithril Armour",
      namePlural: "Mithril Armours",
      description: ""
   },
   [ItemType.scrappy]: {
      entityTextureIndex: TextureIndex.items_small_scrappy,
      textureIndex: TextureIndex.items_large_scrappy,
      toolTextureIndex: 0,
      name: "Scrappy",
      namePlural: "Scrappies",
      description: ""
   },
   [ItemType.cogwalker]: {
      entityTextureIndex: TextureIndex.items_small_cogwalker,
      textureIndex: TextureIndex.items_large_cogwalker,
      toolTextureIndex: 0,
      name: "Cogwalker",
      namePlural: "Cogwalkers",
      description: ""
   },
   [ItemType.automatonAssembler]: {
      entityTextureIndex: TextureIndex.items_small_automatonAssembler,
      textureIndex: TextureIndex.items_large_automatonAssembler,
      toolTextureIndex: 0,
      name: "Automaton Assembler",
      namePlural: "Automaton Assemblers",
      description: ""
   },
   [ItemType.mithrilAnvil]: {
      entityTextureIndex: TextureIndex.items_small_mithrilAnvil,
      textureIndex: TextureIndex.items_large_mithrilAnvil,
      toolTextureIndex: 0,
      name: "Mithril Anvil",
      namePlural: "Mithril Anvils",
      description: ""
   },
   [ItemType.animalStaff]: {
      entityTextureIndex: TextureIndex.items_small_animalStaff,
      textureIndex: TextureIndex.items_large_animalStaff,
      toolTextureIndex: TextureIndex.items_large_animalStaff,
      name: "Animal Staff",
      namePlural: "Animal Staff",
      description: "Allows you to control animals."
   },
   [ItemType.woodenArrow]: {
      entityTextureIndex: TextureIndex.items_small_woodenArrow,
      textureIndex: TextureIndex.items_large_woodenArrow,
      toolTextureIndex: 0,
      name: "Wooden Arrow",
      namePlural: "Wooden Arrows",
      description: "A primitive projectile able to be used in bows and crossbows."
   },
   [ItemType.tamingAlmanac]: {
      entityTextureIndex: TextureIndex.items_small_tamingAlmanac,
      textureIndex: TextureIndex.items_large_tamingAlmanac,
      toolTextureIndex: 0,
      name: "Taming Almanac",
      namePlural: "Taming Almanacs",
      description: "Allows you to see a creature's taming progress."
   },
   [ItemType.floorSign]: {
      entityTextureIndex: TextureIndex.items_small_floorSign,
      textureIndex: TextureIndex.items_large_floorSign,
      toolTextureIndex: 0,
      name: "Floor Sign",
      namePlural: "Floor Signs",
      description: "Lets you write a message on the ground."
   },
   [ItemType.pricklyPear]: {
      entityTextureIndex: TextureIndex.items_small_pricklyPear,
      textureIndex: TextureIndex.items_large_pricklyPear,
      toolTextureIndex: 0,
      name: "Prickly Pear",
      namePlural: "Prickly Pears",
      description: "Takes a very long time to eat."
   },
   [ItemType.rawCrabMeat]: {
      entityTextureIndex: TextureIndex.items_small_rawCrabMeat,
      textureIndex: TextureIndex.items_large_rawCrabMeat,
      toolTextureIndex: 0,
      name: "Raw Crab Meat",
      namePlural: "Raw Crab Meats",
      description: ""
   },
   [ItemType.cookedCrabMeat]: {
      entityTextureIndex: TextureIndex.items_small_cookedCrabMeat,
      textureIndex: TextureIndex.items_large_cookedCrabMeat,
      toolTextureIndex: 0,
      name: "Cooked Crab Meat",
      namePlural: "Cooked Crab Meats",
      description: ""
   },
   [ItemType.chitin]: {
      entityTextureIndex: TextureIndex.items_small_chitin,
      textureIndex: TextureIndex.items_large_chitin,
      toolTextureIndex: 0,
      name: "Chitin",
      namePlural: "Chitin",
      description: ""
   },
   [ItemType.crabplateArmour]: {
      entityTextureIndex: TextureIndex.items_small_crabplateArmour,
      textureIndex: TextureIndex.items_large_crabplateArmour,
      toolTextureIndex: 0,
      name: "Crabplate Armour",
      namePlural: "Crabplate Armour",
      description: ""
   },
   [ItemType.dustfleaEgg]: {
      entityTextureIndex: TextureIndex.items_small_dustfleaEgg,
      textureIndex: TextureIndex.items_large_dustfleaEgg,
      toolTextureIndex: 0,
      name: "Dustflea Egg",
      namePlural: "Dustflea Eggs",
      description: ""
   },
   [ItemType.snowberry]: {
      entityTextureIndex: TextureIndex.items_small_snowberry,
      textureIndex: TextureIndex.items_large_snowberry,
      toolTextureIndex: 0,
      name: "Snowberry",
      namePlural: "Snowberries",
      description: ""
   },
   [ItemType.rawSnobeMeat]: {
      entityTextureIndex: TextureIndex.items_small_rawSnobeMeat,
      textureIndex: TextureIndex.items_large_rawSnobeMeat,
      toolTextureIndex: 0,
      name: "Raw Snobe Meat",
      namePlural: "Raw Snobe Meats",
      description: ""
   },
   [ItemType.snobeStew]: {
      entityTextureIndex: TextureIndex.items_small_snobeStew,
      textureIndex: TextureIndex.items_large_snobeStew,
      toolTextureIndex: 0,
      name: "Snobe Stew",
      namePlural: "Snobe Stews",
      description: ""
   },
   [ItemType.snobeHide]: {
      entityTextureIndex: TextureIndex.items_small_snobeHide,
      textureIndex: TextureIndex.items_large_snobeHide,
      toolTextureIndex: 0,
      name: "Snobe Hide",
      namePlural: "Snobe Hides",
      description: ""
   },
   [ItemType.inguSerpentTooth]: {
      entityTextureIndex: TextureIndex.items_small_inguSerpentTooth,
      textureIndex: TextureIndex.items_large_inguSerpentTooth,
      toolTextureIndex: 0,
      name: "Ingu Serpent Tooth",
      namePlural: "Ingu Serpent Teeth",
      description: ""
   },
   [ItemType.iceWringer]: {
      entityTextureIndex: TextureIndex.items_small_iceWringer,
      textureIndex: TextureIndex.items_large_iceWringer,
      toolTextureIndex: TextureIndex.items_large_iceWringer,
      name: "Ice Wringer",
      namePlural: "Ice Wringer",
      description: ""
   },
   [ItemType.rawTukmokMeat]: {
      entityTextureIndex: TextureIndex.items_small_rawTukmokMeat,
      textureIndex: TextureIndex.items_large_rawTukmokMeat,
      toolTextureIndex: 0,
      name: "Raw Tukmok Meat",
      namePlural: "Raw Tukmok Meat",
      description: ""
   },
   [ItemType.cookedTukmokMeat]: {
      entityTextureIndex: TextureIndex.items_small_cookedTukmokMeat,
      textureIndex: TextureIndex.items_large_cookedTukmokMeat,
      toolTextureIndex: 0,
      name: "Cooked Tukmok Meat",
      namePlural: "Cooked Tukmok Meat",
      description: ""
   },
   [ItemType.tukmokFurHide]: {
      entityTextureIndex: TextureIndex.items_small_tukmokFurHide,
      textureIndex: TextureIndex.items_large_tukmokFurHide,
      toolTextureIndex: 0,
      name: "Tukmok Fur Hide",
      namePlural: "Tukmok Fur Hides",
      description: ""
   },
   [ItemType.winterskinArmour]: {
      entityTextureIndex: TextureIndex.items_small_winterskinArmour,
      textureIndex: TextureIndex.items_large_winterskinArmour,
      toolTextureIndex: 0,
      name: "Winterskin Armour",
      namePlural: "Winterskin Armour",
      description: ""
   },
   [ItemType.ivoryTusk]: {
      entityTextureIndex: TextureIndex.items_small_ivoryTusk,
      textureIndex: TextureIndex.items_large_ivoryTusk,
      toolTextureIndex: TextureIndex.items_misc_ivoryTusk,
      name: "Ivory Tusk",
      namePlural: "Ivory Tusk",
      description: ""
   },
   [ItemType.ivorySpear]: {
      entityTextureIndex: TextureIndex.items_small_ivorySpear,
      textureIndex: TextureIndex.items_large_ivorySpear,
      toolTextureIndex: TextureIndex.items_misc_ivorySpear,
      name: "Ivory Spear",
      namePlural: "Ivory Spear",
      description: ""
   },
   [ItemType.sock]: {
      entityTextureIndex: TextureIndex.items_small_sock,
      textureIndex: TextureIndex.items_large_sock,
      toolTextureIndex: 0,
      name: "Sock",
      namePlural: "",
      description: "",
      flavourText: "Works ok if you shift your foot around so the hole is on the top."
   },
   [ItemType.mrpebbles]: {
      entityTextureIndex: TextureIndex.items_small_mrpebbles,
      textureIndex: TextureIndex.items_large_mrpebbles,
      toolTextureIndex: 0,
      name: "Rock",
      namePlural: "",
      description: "",
      flavourText: "A pet rock. Someone has carved a smile onto its face."
   },
};

export function getItemTypeImage(itemType: ItemType): string {
   const img = itemImages["/src/images/" + CLIENT_ITEM_INFO_RECORD[itemType].textureIndex] as string | undefined;
   assert(img !== undefined);
   return img;
}

export default CLIENT_ITEM_INFO_RECORD;
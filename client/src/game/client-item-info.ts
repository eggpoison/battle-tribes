import { ItemType } from "../../../shared/src/items/items";
import { assert } from "../../../shared/src/utils";
import { TextureIndex } from "../texture-index";

export interface ClientItemInfo {
   readonly itemTextureSrc: string;
   readonly entityTextureIndex: TextureIndex;
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
      itemTextureSrc: "items/large/wood.png",
      entityTextureIndex: TextureIndex.items_small_wood,
      toolTextureIndex: 0,
      name: "Wood",
      namePlural: "Wood",
      description: "A common material used in crafting many things."
   },
   [ItemType.wooden_sword]: {
      itemTextureSrc: "items/large/wooden-sword.png",
      entityTextureIndex: TextureIndex.items_small_woodenSword,
      toolTextureIndex: TextureIndex.items_large_woodenSword,
      name: "Wooden Sword",
      namePlural: "Wooden Swords",
      description: "Basic sword.",
      flavourText: "The splinters hurt you as much as the blade hurts the enemy."
   },
   [ItemType.wooden_axe]: {
      itemTextureSrc: "items/large/wooden-axe.png",
      entityTextureIndex: TextureIndex.items_small_woodenAxe,
      toolTextureIndex: TextureIndex.items_large_woodenAxe,
      name: "Wooden Axe",
      namePlural: "Wooden Axes",
      description: "Basic axe."
   },
   [ItemType.wooden_pickaxe]: {
      itemTextureSrc: "items/large/wooden-pickaxe.png",
      entityTextureIndex: TextureIndex.items_small_woodenPickaxe,
      toolTextureIndex: TextureIndex.items_large_woodenPickaxe,
      name: "Wooden Pickaxe",
      namePlural: "Wooden Pickaxes",
      description: ""
   },
   [ItemType.berry]: {
      itemTextureSrc: "items/large/berry.png",
      entityTextureIndex: TextureIndex.items_small_berry,
      toolTextureIndex: 0,
      name: "Berry",
      namePlural: "Berries",
      description: "Provides little sustenance, but can be used in a pinch."
   },
   [ItemType.raw_beef]: {
      itemTextureSrc: "items/large/raw-beef.png",
      entityTextureIndex: TextureIndex.items_small_rawBeef,
      toolTextureIndex: 0,
      name: "Raw Beef",
      namePlural: "Raw Beef",
      description: "The raw mutilated flesh of a deceased cow - would not recommend eating."
   },
   [ItemType.cooked_beef]: {
      itemTextureSrc: "items/large/cooked-beef.png",
      entityTextureIndex: TextureIndex.items_small_cookedBeef,
      toolTextureIndex: 0,
      name: "Cooked Beef",
      namePlural: "Cooked Beef",
      description: "A hearty meal. Could use some seasoning."
   },
   [ItemType.workbench]: {
      itemTextureSrc: "items/large/workbench.png",
      entityTextureIndex: TextureIndex.items_small_workbench,
      toolTextureIndex: 0,
      name: "Workbench",
      namePlural: "Workbenches",
      description: "The first crafting station available, able to craft many more complex recipes."
   },
   [ItemType.rock]: {
      itemTextureSrc: "items/large/rock.png",
      entityTextureIndex: TextureIndex.items_small_rock,
      toolTextureIndex: 0,
      name: "Rock",
      namePlural: "Rocks",
      description: "This Grug rock. No hurt or face wrath of Grug."
   },
   [ItemType.stone_sword]: {
      itemTextureSrc: "items/large/stone-sword.png",
      entityTextureIndex: TextureIndex.items_small_stoneSword,
      toolTextureIndex: TextureIndex.items_large_stoneSword,
      name: "Stone Sword",
      namePlural: "Stone Swords",
      description: ""
   },
   [ItemType.stone_axe]: {
      itemTextureSrc: "items/large/stone-axe.png",
      entityTextureIndex: TextureIndex.items_small_stoneAxe,
      toolTextureIndex: TextureIndex.items_large_stoneAxe,
      name: "Stone Axe",
      namePlural: "Stone Axes",
      description: ""
   },
   [ItemType.stone_pickaxe]: {
      itemTextureSrc: "items/large/stone-pickaxe.png",
      entityTextureIndex: TextureIndex.items_small_stonePickaxe,
      toolTextureIndex: TextureIndex.items_large_stonePickaxe,
      name: "Stone Pickaxe",
      namePlural: "Stone Pickaxes",
      description: ""
   },
   [ItemType.stone_hammer]: {
      itemTextureSrc: "items/large/stone-hammer.png",
      entityTextureIndex: TextureIndex.items_small_stoneHammer,
      toolTextureIndex: TextureIndex.items_large_stoneHammer,
      name: "Stone Hammer",
      namePlural: "Stone Hammers",
      description: ""
   },
   [ItemType.leather]: {
      itemTextureSrc: "items/large/leather.png",
      entityTextureIndex: TextureIndex.items_small_leather,
      toolTextureIndex: 0,
      name: "Leather",
      namePlural: "Leather",
      description: ""
   },
   [ItemType.leather_backpack]: {
      itemTextureSrc: "items/large/leather-backpack.png",
      entityTextureIndex: TextureIndex.items_small_leatherBackpack,
      toolTextureIndex: 0,
      name: "Leather Backpack",
      namePlural: "Leather Backpacks",
      description: "Allows you to hold more item."
   },
   [ItemType.cactus_spine]: {
      itemTextureSrc: "items/large/cactus-spine.png",
      entityTextureIndex: TextureIndex.items_small_cactusSpine,
      toolTextureIndex: 0,
      name: "Cactus Spine",
      namePlural: "Cactus Spines",
      description: "It's tough and spiky and gets everywhere."
   },
   [ItemType.yeti_hide]: {
      itemTextureSrc: "items/large/yeti-hide.png",
      entityTextureIndex: TextureIndex.items_small_yetiHide,
      toolTextureIndex: 0,
      name: "Yeti Hide",
      namePlural: "Yeti Hides",
      description: "An extremely tough half-frost half-flesh hide."
   },
   [ItemType.frostcicle]: {
      itemTextureSrc: "items/large/frostcicle.png",
      entityTextureIndex: TextureIndex.items_small_frostcicle,
      toolTextureIndex: 0,
      name: "Frostcicle",
      namePlural: "Frostcicles",
      description: "A perfectly preserved ice shard."
   },
   [ItemType.slimeball]: {
      itemTextureSrc: "items/large/slimeball.png",
      entityTextureIndex: TextureIndex.items_small_slimeball,
      toolTextureIndex: 0,
      name: "Slimeball",
      namePlural: "Slimeballs",
      description: ""
   },
   [ItemType.eyeball]: {
      itemTextureSrc: "items/large/eyeball.png",
      entityTextureIndex: TextureIndex.items_small_eyeball,
      toolTextureIndex: 0,
      name: "Eyeball",
      namePlural: "Eyeballs",
      description: ""
   },
   [ItemType.flesh_sword]: {
      itemTextureSrc: "items/large/flesh-sword.png",
      entityTextureIndex: TextureIndex.items_small_fleshSword,
      toolTextureIndex: TextureIndex.items_large_fleshSword,
      name: "Flesh Sword",
      namePlural: "Flesh Swords",
      description: ""
   },
   [ItemType.tribe_totem]: {
      itemTextureSrc: "items/large/tribe-totem.png",
      entityTextureIndex: TextureIndex.items_small_tribeTotem,
      toolTextureIndex: 0,
      name: "Totem",
      namePlural: "Totems",
      description: "Centerpiece of the tribe."
   },
   [ItemType.worker_hut]: {
      itemTextureSrc: "items/large/worker-hut.png",
      entityTextureIndex: TextureIndex.items_small_workerHut,
      toolTextureIndex: 0,
      name: "Worker Hut",
      namePlural: "Worker Huts",
      description: ""
   },
   [ItemType.barrel]: {
      itemTextureSrc: "items/large/barrel.png",
      entityTextureIndex: TextureIndex.items_small_barrel,
      toolTextureIndex: 0,
      name: "Barrel",
      namePlural: "Barrels",
      description: ""
   },
   [ItemType.frostSword]: {
      itemTextureSrc: "items/large/frost-sword.png",
      entityTextureIndex: TextureIndex.items_small_frostSword,
      toolTextureIndex: TextureIndex.items_large_frostSword,
      name: "Frost Sword",
      namePlural: "Frost Swords",
      description: ""
   },
   [ItemType.frostPickaxe]: {
      itemTextureSrc: "items/large/frost-pickaxe.png",
      entityTextureIndex: TextureIndex.items_small_frostPickaxe,
      toolTextureIndex: TextureIndex.items_large_frostPickaxe,
      name: "Frost Pickaxe",
      namePlural: "Frost Pickaxes",
      description: ""
   },
   [ItemType.frostAxe]: {
      itemTextureSrc: "items/large/frost-axe.png",
      entityTextureIndex: TextureIndex.items_small_frostAxe,
      toolTextureIndex: TextureIndex.items_large_frostAxe,
      name: "Frost Axe",
      namePlural: "Frost Axes",
      description: ""
   },
   [ItemType.frostArmour]: {
      itemTextureSrc: "items/large/frost-armour.png",
      entityTextureIndex: TextureIndex.items_small_frostArmour,
      toolTextureIndex: 0,
      name: "Frost Armour",
      namePlural: "Frost Armours",
      description: ""
   },
   [ItemType.campfire]: {
      itemTextureSrc: "items/large/campfire.png",
      entityTextureIndex: TextureIndex.items_small_campfire,
      toolTextureIndex: 0,
      name: "Campfire",
      namePlural: "Campfires",
      description: ""
   },
   [ItemType.furnace]: {
      itemTextureSrc: "items/large/furnace.png",
      entityTextureIndex: TextureIndex.items_small_furnace,
      toolTextureIndex: 0,
      name: "Furnace",
      namePlural: "Furnaces",
      description: ""
   },
   [ItemType.wooden_bow]: {
      itemTextureSrc: "items/large/wooden-bow.png",
      entityTextureIndex: TextureIndex.items_small_woodenBow,
      toolTextureIndex: TextureIndex.items_large_woodenBow,
      name: "Wooden Bow",
      namePlural: "Wooden Bows",
      description: ""
   },
   [ItemType.reinforced_bow]: {
      itemTextureSrc: "items/large/reinforced-bow.png",
      entityTextureIndex: TextureIndex.items_small_reinforcedBow,
      toolTextureIndex: TextureIndex.items_large_reinforcedBow,
      name: "Reinforced Bow",
      namePlural: "Reinforced Bows",
      description: ""
   },
   [ItemType.ice_bow]: {
      itemTextureSrc: "items/large/ice-bow.png",
      entityTextureIndex: TextureIndex.items_small_iceBow,
      toolTextureIndex: TextureIndex.items_large_iceBow,
      name: "Ice Bow",
      namePlural: "Ice Bows",
      description: ""
   },
   [ItemType.crossbow]: {
      itemTextureSrc: "items/large/crossbow.png",
      entityTextureIndex: TextureIndex.items_small_crossbow,
      toolTextureIndex: TextureIndex.items_large_crossbow,
      name: "Crossbow",
      namePlural: "Crossbows",
      description: ""
   },
   [ItemType.meat_suit]: {
      itemTextureSrc: "items/large/meat-suit.png",
      entityTextureIndex: TextureIndex.items_small_meatSuit,
      toolTextureIndex: 0,
      name: "Meat Suit",
      namePlural: "Meat Suits",
      description: "You think you are Cow, but you are not. You are a mere imitation, a foolish attempt to recreate That which is divine."
   },
   [ItemType.deepfrost_heart]: {
      itemTextureSrc: "items/large/deepfrost-heart.png",
      entityTextureIndex: TextureIndex.items_small_deepfrostHeart,
      toolTextureIndex: 0,
      name: "Deepfrost Heart",
      namePlural: "Deepfrost Hearts",
      description: ""
   },
   [ItemType.raw_fish]: {
      itemTextureSrc: "items/large/raw-fish.png",
      entityTextureIndex: TextureIndex.items_small_rawFish,
      toolTextureIndex: 0,
      name: "Raw Fish",
      namePlural: "Raw Fishes",
      description: ""
   },
   [ItemType.cooked_fish]: {
      itemTextureSrc: "items/large/cooked-fish.png",
      entityTextureIndex: TextureIndex.items_small_cookedFish,
      toolTextureIndex: 0,
      name: "Cooked Fish",
      namePlural: "Cooked Fishes",
      description: ""
   },
   [ItemType.fishlord_suit]: {
      itemTextureSrc: "items/large/fishlord-suit.png",
      entityTextureIndex: TextureIndex.items_small_fishlordSuit,
      toolTextureIndex: 0,
      name: "Fish Suit",
      namePlural: "Fish Suits", 
      description: ""
   },
   [ItemType.gathering_gloves]: {
      itemTextureSrc: "items/large/gathering-gloves.png",
      entityTextureIndex: TextureIndex.items_small_gatheringGloves,
      toolTextureIndex: 0,
      name: "Gathering Gloves",
      namePlural: "Gathering Gloves", 
      description: ""
   },
   [ItemType.leather_armour]: {
      itemTextureSrc: "items/large/leather-armour.png",
      entityTextureIndex: TextureIndex.items_small_leatherArmour,
      toolTextureIndex: 0,
      name: "Leather Armour",
      namePlural: "Leather Armours", 
      description: ""
   },
   [ItemType.woodenSpear]: {
      itemTextureSrc: "items/large/wooden-spear.png",
      entityTextureIndex: TextureIndex.items_small_woodenSpear,
      toolTextureIndex: TextureIndex.items_misc_woodenSpear,
      name: "Wooden Spear",
      namePlural: "Wooden Spears",
      description: "Pointy end works best."
   },
   [ItemType.stoneSpear]: {
      itemTextureSrc: "items/large/stone-spear.png",
      entityTextureIndex: TextureIndex.items_small_stoneSpear,
      toolTextureIndex: TextureIndex.items_misc_stoneSpear,
      name: "Stone Spear",
      namePlural: "Stone Spears", 
      description: "Pointy end works best."
   },
   [ItemType.paper]: {
      itemTextureSrc: "items/large/paper.png",
      entityTextureIndex: TextureIndex.items_small_paper,
      toolTextureIndex: 0,
      name: "Paper",
      namePlural: "Papers", 
      description: ""
   },
   [ItemType.research_bench]: {
      itemTextureSrc: "items/large/research-bench.png",
      entityTextureIndex: TextureIndex.items_small_researchBench,
      toolTextureIndex: 0,
      name: "Research Bench",
      namePlural: "Research Benches", 
      description: ""
   },
   [ItemType.wooden_wall]: {
      itemTextureSrc: "items/large/wooden-wall.png",
      entityTextureIndex: TextureIndex.items_small_woodenWall,
      toolTextureIndex: 0,
      name: "Wooden Wall",
      namePlural: "Wooden Walls",
      description: ""
   },
   [ItemType.wooden_hammer]: {
      itemTextureSrc: "items/large/wooden-hammer.png",
      entityTextureIndex: TextureIndex.items_small_woodenHammer,
      toolTextureIndex: TextureIndex.items_large_woodenHammer,
      name: "Wooden Hammer",
      namePlural: "Wooden Hammers",
      description: ""
   },
   [ItemType.stone_battleaxe]: {
      itemTextureSrc: "items/large/stone-battleaxe.png",
      entityTextureIndex: TextureIndex.items_small_stoneBattleaxe,
      toolTextureIndex: TextureIndex.items_large_stoneBattleaxe,
      name: "Stone Battleaxe",
      namePlural: "Stone Battleaxes",
      description: ""
   },
   [ItemType.living_rock]: {
      itemTextureSrc: "items/large/living-rock.png",
      entityTextureIndex: TextureIndex.items_small_livingRock,
      toolTextureIndex: 0,
      name: "Living Rock",
      namePlural: "Living Rocks",
      description: ""
   },
   [ItemType.planter_box]: {
      itemTextureSrc: "items/large/planter-box.png",
      entityTextureIndex: TextureIndex.items_small_planterBox,
      toolTextureIndex: 0,
      name: "Planter Box",
      namePlural: "Planter Boxes",
      description: ""
   },
   [ItemType.poop]: {
      itemTextureSrc: "items/large/poop.png",
      entityTextureIndex: TextureIndex.items_small_poop,
      toolTextureIndex: 0,
      name: "Poop",
      namePlural: "Poops",
      description: ""
   },
   [ItemType.wooden_spikes]: {
      itemTextureSrc: "items/large/wooden-spikes.png",
      entityTextureIndex: TextureIndex.items_small_woodenSpikes,
      toolTextureIndex: 0,
      name: "Wooden Spikes",
      namePlural: "Wooden Spikes",
      description: ""
   },
   [ItemType.punji_sticks]: {
      itemTextureSrc: "items/large/punji-sticks.png",
      entityTextureIndex: TextureIndex.items_small_punjiSticks,
      toolTextureIndex: 0,
      name: "Punji Sticks",
      namePlural: "Punji Sticks",
      description: "Slightly weaker than wooden spikes, but inflicts additional poison damage."
   },
   [ItemType.ballista]: {
      itemTextureSrc: "items/large/ballista.png",
      entityTextureIndex: TextureIndex.items_small_ballista,
      toolTextureIndex: 0,
      name: "Ballista",
      namePlural: "Ballistas",
      description: "An automatic crossbow turret. Requires ammo to function."
   },
   [ItemType.sling_turret]: {
      itemTextureSrc: "items/large/sling-turret.png",
      // @Incomplete
      entityTextureIndex: TextureIndex.items_small_ballista,
      toolTextureIndex: 0,
      name: "Sling Turret",
      namePlural: "Sling Turrets",
      description: ""
   },
   [ItemType.healing_totem]: {
      itemTextureSrc: "items/large/healing-totem.png",
      // @Incomplete
      entityTextureIndex: TextureIndex.items_small_ballista,
      toolTextureIndex: 0,
      name: "Healing Totem",
      namePlural: "Healing Totems",
      description: "Concentrates healing beams to heal nearby tribesmen."
   },
   [ItemType.leaf]: {
      itemTextureSrc: "items/large/leaf.png",
      entityTextureIndex: TextureIndex.items_small_leaf,
      toolTextureIndex: 0,
      name: "Leaf",
      namePlural: "Leaves",
      description: ""
   },
   [ItemType.herbal_medicine]: {
      itemTextureSrc: "items/large/herbal-medicine.png",
      entityTextureIndex: TextureIndex.items_small_herbalMedicine,
      toolTextureIndex: 0,
      name: "Herbal Medicine",
      namePlural: "Herbal Medicines",
      description: ""
   },
   [ItemType.leaf_suit]: {
      itemTextureSrc: "items/large/leaf-suit.png",
      // @Incomplete
      entityTextureIndex: TextureIndex.items_small_leatherArmour,
      toolTextureIndex: 0,
      name: "Leaf Suit",
      namePlural: "Leaf Suits",
      description: ""
   },
   [ItemType.seed]: {
      itemTextureSrc: "items/large/seed.png",
      entityTextureIndex: TextureIndex.items_small_seed,
      toolTextureIndex: 0,
      name: "Seed",
      namePlural: "Seeds",
      description: ""
   },
   [ItemType.gardening_gloves]: {
      itemTextureSrc: "items/large/gardening-gloves.png",
      entityTextureIndex: TextureIndex.items_small_gardeningGloves,
      toolTextureIndex: 0,
      name: "Gardening Gloves",
      namePlural: "Gardening Gloves",
      description: ""
   },
   [ItemType.wooden_fence]: {
      itemTextureSrc: "items/large/fence.png",
      entityTextureIndex: TextureIndex.items_small_fence,
      toolTextureIndex: 0,
      name: "Wooden Fence",
      namePlural: "Wooden Fences",
      description: "Good for keeping cows in, not so good for defending your valuables."
   },
   [ItemType.fertiliser]: {
      itemTextureSrc: "items/large/fertiliser.png",
      entityTextureIndex: TextureIndex.items_small_fertiliser,
      toolTextureIndex: 0,
      name: "Fertiliser",
      namePlural: "Fertilisers",
      description: "Speeds up plant growth when used on planter boxes."
   },
   [ItemType.frostshaper]: {
      itemTextureSrc: "items/large/frostshaper.png",
      entityTextureIndex: TextureIndex.items_small_frostshaper,
      toolTextureIndex: 0,
      name: "Frostshaper",
      namePlural: "Frostshapers",
      description: "Carves ice into complex shapes."
   },
   [ItemType.stonecarvingTable]: {
      itemTextureSrc: "items/large/stonecarving-table.png",
      entityTextureIndex: TextureIndex.items_small_stonecarvingTable,
      toolTextureIndex: 0,
      name: "Stonecarving Table",
      namePlural: "Stonecarving Tables",
      description: "Carves stone into complex shapes."
   },
   [ItemType.woodenShield]: {
      itemTextureSrc: "items/large/wooden-shield.png",
      entityTextureIndex: TextureIndex.items_small_woodenShield,
      toolTextureIndex: TextureIndex.entities_shieldItems_woodenShield,
      name: "Wooden Shield",
      namePlural: "Wooden Shields",
      description: "Blocks projectiles and melee attacks, poorly."
   },
   [ItemType.slingshot]: {
      itemTextureSrc: "items/large/slingshot.png",
      // @Incomplete
      entityTextureIndex: TextureIndex.items_small_woodenShield,
      toolTextureIndex: TextureIndex.entities_shieldItems_woodenShield,
      name: "Slingshot",
      namePlural: "Slingshots",
      description: "Slings rocks at people you don't like."
   },
   [ItemType.woodenBracings]: {
      itemTextureSrc: "items/large/wooden-bracings.png",
      entityTextureIndex: TextureIndex.items_small_woodenBracings,
      toolTextureIndex: 0,
      name: "Wooden Bracings",
      namePlural: "Wooden Bracings",
      description: "Supports the surrounding stone's mental health, preventing them from collapsing."
   },
   [ItemType.fireTorch]: {
      itemTextureSrc: "items/large/fire-torch.png",
      entityTextureIndex: TextureIndex.items_small_fireTorch,
      toolTextureIndex: 0,
      name: "Fire Torch",
      namePlural: "Fire Torches",
      description: "Provides a temporary light source."
   },
   [ItemType.slurb]: {
      itemTextureSrc: "items/large/slurb.png",
      entityTextureIndex: TextureIndex.items_small_slurb,
      toolTextureIndex: 0,
      name: "Slurb",
      namePlural: "Slurb",
      description: "Gooey. Glows a bit."
   },
   [ItemType.slurbTorch]: {
      itemTextureSrc: "items/large/slurb-torch.png",
      entityTextureIndex: TextureIndex.items_small_slurbTorch,
      toolTextureIndex: 0,
      name: "Slurb Torch",
      namePlural: "Slurb Torches",
      description: "Less powerful than a regular torch, but doesn't burn out."
   },
   [ItemType.rawYetiFlesh]: {
      itemTextureSrc: "items/large/raw-yeti-flesh.png",
      entityTextureIndex: TextureIndex.items_small_rawYetiFlesh,
      toolTextureIndex: 0,
      name: "Raw Yeti Flesh",
      namePlural: "Raw Yeti Flesh",
      description: "Disgusting."
   },
   [ItemType.cookedYetiFlesh]: {
      itemTextureSrc: "items/large/cooked-yeti-flesh.png",
      entityTextureIndex: TextureIndex.items_small_cookedYetiFlesh,
      toolTextureIndex: 0,
      name: "Cooked Yeti Flesh",
      namePlural: "Cooked Yeti Flesh",
      description: "Disgusting, but nutritious."
   },
   [ItemType.mithrilOre]: {
      itemTextureSrc: "items/large/mithril-ore.png",
      entityTextureIndex: TextureIndex.items_small_mithrilOre,
      toolTextureIndex: 0,
      name: "Mithril Ore",
      namePlural: "Mithril Ores",
      description: "Unrefined mithril."
   },
   [ItemType.mithrilBar]: {
      itemTextureSrc: "items/large/mithril-bar.png",
      entityTextureIndex: TextureIndex.items_small_mithrilBar,
      toolTextureIndex: 0,
      name: "Mithril Bar",
      namePlural: "Mithril Bars",
      description: "Refined mithril."
   },
   [ItemType.mithrilSword]: {
      itemTextureSrc: "items/large/mithril-sword.png",
      entityTextureIndex: TextureIndex.items_small_mithrilSword,
      toolTextureIndex: TextureIndex.items_large_mithrilSword,
      name: "Mithril Sword",
      namePlural: "Mithril Swords",
      description: ""
   },
   [ItemType.mithrilPickaxe]: {
      itemTextureSrc: "items/large/mithril-pickaxe.png",
      entityTextureIndex: TextureIndex.items_small_mithrilPickaxe,
      toolTextureIndex: TextureIndex.items_large_mithrilPickaxe,
      name: "Mithril Pickaxe",
      namePlural: "Mithril Pickaxes",
      description: ""
   },
   [ItemType.mithrilAxe]: {
      itemTextureSrc: "items/large/mithril-axe.png",
      entityTextureIndex: TextureIndex.items_small_mithrilAxe,
      toolTextureIndex: TextureIndex.items_large_mithrilAxe,
      name: "Mithril Axe",
      namePlural: "Mithril Axes",
      description: ""
   },
   [ItemType.mithrilArmour]: {
      itemTextureSrc: "items/large/mithril-armour.png",
      entityTextureIndex: TextureIndex.items_small_mithrilArmour,
      toolTextureIndex: 0,
      name: "Mithril Armour",
      namePlural: "Mithril Armours",
      description: ""
   },
   [ItemType.scrappy]: {
      itemTextureSrc: "items/large/scrappy.png",
      entityTextureIndex: TextureIndex.items_small_scrappy,
      toolTextureIndex: 0,
      name: "Scrappy",
      namePlural: "Scrappies",
      description: ""
   },
   [ItemType.cogwalker]: {
      itemTextureSrc: "items/large/cogwalker.png",
      entityTextureIndex: TextureIndex.items_small_cogwalker,
      toolTextureIndex: 0,
      name: "Cogwalker",
      namePlural: "Cogwalkers",
      description: ""
   },
   [ItemType.automatonAssembler]: {
      itemTextureSrc: "items/large/automaton-assembler.png",
      entityTextureIndex: TextureIndex.items_small_automatonAssembler,
      toolTextureIndex: 0,
      name: "Automaton Assembler",
      namePlural: "Automaton Assemblers",
      description: ""
   },
   [ItemType.mithrilAnvil]: {
      itemTextureSrc: "items/large/mithril-anvil.png",
      entityTextureIndex: TextureIndex.items_small_mithrilAnvil,
      toolTextureIndex: 0,
      name: "Mithril Anvil",
      namePlural: "Mithril Anvils",
      description: ""
   },
   [ItemType.animalStaff]: {
      itemTextureSrc: "items/large/animal-staff.png",
      entityTextureIndex: TextureIndex.items_small_animalStaff,
      toolTextureIndex: TextureIndex.items_large_animalStaff,
      name: "Animal Staff",
      namePlural: "Animal Staff",
      description: "Allows you to control animals."
   },
   [ItemType.woodenArrow]: {
      itemTextureSrc: "items/large/wooden-arrow.png",
      entityTextureIndex: TextureIndex.items_small_woodenArrow,
      toolTextureIndex: 0,
      name: "Wooden Arrow",
      namePlural: "Wooden Arrows",
      description: "A primitive projectile able to be used in bows and crossbows."
   },
   [ItemType.tamingAlmanac]: {
      itemTextureSrc: "items/large/taming-almanac.png",
      entityTextureIndex: TextureIndex.items_small_tamingAlmanac,
      toolTextureIndex: 0,
      name: "Taming Almanac",
      namePlural: "Taming Almanacs",
      description: "Allows you to see a creature's taming progress."
   },
   [ItemType.floorSign]: {
      itemTextureSrc: "items/large/floor-sign.png",
      entityTextureIndex: TextureIndex.items_small_floorSign,
      toolTextureIndex: 0,
      name: "Floor Sign",
      namePlural: "Floor Signs",
      description: "Lets you write a message on the ground."
   },
   [ItemType.pricklyPear]: {
      itemTextureSrc: "items/large/prickly-pear.png",
      entityTextureIndex: TextureIndex.items_small_pricklyPear,
      toolTextureIndex: 0,
      name: "Prickly Pear",
      namePlural: "Prickly Pears",
      description: "Takes a very long time to eat."
   },
   [ItemType.rawCrabMeat]: {
      itemTextureSrc: "items/large/raw-crab-meat.png",
      entityTextureIndex: TextureIndex.items_small_rawCrabMeat,
      toolTextureIndex: 0,
      name: "Raw Crab Meat",
      namePlural: "Raw Crab Meats",
      description: ""
   },
   [ItemType.cookedCrabMeat]: {
      itemTextureSrc: "items/large/cooked-crab-meat.png",
      entityTextureIndex: TextureIndex.items_small_cookedCrabMeat,
      toolTextureIndex: 0,
      name: "Cooked Crab Meat",
      namePlural: "Cooked Crab Meats",
      description: ""
   },
   [ItemType.chitin]: {
      itemTextureSrc: "items/large/chitin.png",
      entityTextureIndex: TextureIndex.items_small_chitin,
      toolTextureIndex: 0,
      name: "Chitin",
      namePlural: "Chitin",
      description: ""
   },
   [ItemType.crabplateArmour]: {
      itemTextureSrc: "items/large/crabplate-armour.png",
      entityTextureIndex: TextureIndex.items_small_crabplateArmour,
      toolTextureIndex: 0,
      name: "Crabplate Armour",
      namePlural: "Crabplate Armour",
      description: ""
   },
   [ItemType.dustfleaEgg]: {
      itemTextureSrc: "items/large/dustflea-egg.png",
      entityTextureIndex: TextureIndex.items_small_dustfleaEgg,
      toolTextureIndex: 0,
      name: "Dustflea Egg",
      namePlural: "Dustflea Eggs",
      description: ""
   },
   [ItemType.snowberry]: {
      itemTextureSrc: "items/large/snowberry.png",
      entityTextureIndex: TextureIndex.items_small_snowberry,
      toolTextureIndex: 0,
      name: "Snowberry",
      namePlural: "Snowberries",
      description: ""
   },
   [ItemType.rawSnobeMeat]: {
      itemTextureSrc: "items/large/raw-snobe-meat.png",
      entityTextureIndex: TextureIndex.items_small_rawSnobeMeat,
      toolTextureIndex: 0,
      name: "Raw Snobe Meat",
      namePlural: "Raw Snobe Meats",
      description: ""
   },
   [ItemType.snobeStew]: {
      itemTextureSrc: "items/large/snobe-stew.png",
      entityTextureIndex: TextureIndex.items_small_snobeStew,
      toolTextureIndex: 0,
      name: "Snobe Stew",
      namePlural: "Snobe Stews",
      description: ""
   },
   [ItemType.snobeHide]: {
      itemTextureSrc: "items/large/snobe-hide.png",
      entityTextureIndex: TextureIndex.items_small_snobeHide,
      toolTextureIndex: 0,
      name: "Snobe Hide",
      namePlural: "Snobe Hides",
      description: ""
   },
   [ItemType.inguSerpentTooth]: {
      itemTextureSrc: "items/large/ingu-serpent-tooth.png",
      entityTextureIndex: TextureIndex.items_small_inguSerpentTooth,
      toolTextureIndex: 0,
      name: "Ingu Serpent Tooth",
      namePlural: "Ingu Serpent Teeth",
      description: ""
   },
   [ItemType.iceWringer]: {
      itemTextureSrc: "items/large/ice-wringer.png",
      entityTextureIndex: TextureIndex.items_small_iceWringer,
      toolTextureIndex: TextureIndex.items_large_iceWringer,
      name: "Ice Wringer",
      namePlural: "Ice Wringer",
      description: ""
   },
   [ItemType.rawTukmokMeat]: {
      itemTextureSrc: "items/large/raw-tukmok-meat.png",
      entityTextureIndex: TextureIndex.items_small_rawTukmokMeat,
      toolTextureIndex: 0,
      name: "Raw Tukmok Meat",
      namePlural: "Raw Tukmok Meat",
      description: ""
   },
   [ItemType.cookedTukmokMeat]: {
      itemTextureSrc: "items/large/cooked-tukmok-meat.png",
      entityTextureIndex: TextureIndex.items_small_cookedTukmokMeat,
      toolTextureIndex: 0,
      name: "Cooked Tukmok Meat",
      namePlural: "Cooked Tukmok Meat",
      description: ""
   },
   [ItemType.tukmokFurHide]: {
      itemTextureSrc: "items/large/tukmok-fur-hide.png",
      entityTextureIndex: TextureIndex.items_small_tukmokFurHide,
      toolTextureIndex: 0,
      name: "Tukmok Fur Hide",
      namePlural: "Tukmok Fur Hides",
      description: ""
   },
   [ItemType.winterskinArmour]: {
      itemTextureSrc: "items/large/winterskin-armour.png",
      entityTextureIndex: TextureIndex.items_small_winterskinArmour,
      toolTextureIndex: 0,
      name: "Winterskin Armour",
      namePlural: "Winterskin Armour",
      description: ""
   },
   [ItemType.ivoryTusk]: {
      itemTextureSrc: "items/large/ivory-tusk.png",
      entityTextureIndex: TextureIndex.items_small_ivoryTusk,
      toolTextureIndex: TextureIndex.items_misc_ivoryTusk,
      name: "Ivory Tusk",
      namePlural: "Ivory Tusk",
      description: ""
   },
   [ItemType.ivorySpear]: {
      itemTextureSrc: "items/large/ivory-spear.png",
      entityTextureIndex: TextureIndex.items_small_ivorySpear,
      toolTextureIndex: TextureIndex.items_misc_ivorySpear,
      name: "Ivory Spear",
      namePlural: "Ivory Spear",
      description: ""
   },
   [ItemType.sock]: {
      itemTextureSrc: "items/large/sock.png",
      entityTextureIndex: TextureIndex.items_small_sock,
      toolTextureIndex: 0,
      name: "Sock",
      namePlural: "",
      description: "",
      flavourText: "Works ok if you shift your foot around so the hole is on the top."
   },
   [ItemType.mrpebbles]: {
      itemTextureSrc: "items/large/mrpebbles.png",
      entityTextureIndex: TextureIndex.items_small_mrpebbles,
      toolTextureIndex: 0,
      name: "Rock",
      namePlural: "",
      description: "",
      flavourText: "A pet rock. Someone has carved a smile onto its face."
   },
};

export function getItemTypeImage(itemType: ItemType): string {
   const img = itemImages["/src/images/" + CLIENT_ITEM_INFO_RECORD[itemType].itemTextureSrc] as string | undefined;
   assert(img !== undefined);
   return img;
}

export default CLIENT_ITEM_INFO_RECORD;
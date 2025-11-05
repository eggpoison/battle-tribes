import { ItemType } from "webgl-test-shared/src/items/items";

export type ClientItemInfo = {
   readonly entityTextureSource: string;
   readonly textureSource: string;
   /** Texture source when used as a tool in a tribe members' hand. Empty string if not used as a tool */
   readonly toolTextureSource: string;
   readonly name: string;
   readonly namePlural: string;
   /** A description of what the item is for. */
   readonly description: string;
   /** Random shit shown in small text at the bottom of the item tooltip */
   readonly flavourText?: string;
}

const itemImages = import.meta.glob("../images/items/*", { eager: true, as: "url" });

const CLIENT_ITEM_INFO_RECORD: Record<ItemType, ClientItemInfo> = {
   [ItemType.wood]: {
      entityTextureSource: "../images/items/small/wood.png",
      textureSource: "../images/items/large/wood.png",
      toolTextureSource: "",
      name: "Wood",
      namePlural: "Wood",
      description: "A common material used in crafting many things."
   },
   [ItemType.wooden_sword]: {
      entityTextureSource: "../images/items/small/wooden-sword.png",
      textureSource: "../images/items/large/wooden-sword.png",
      toolTextureSource: "../images/items/large/wooden-sword.png",
      name: "Wooden Sword",
      namePlural: "Wooden Swords",
      description: "Basic sword.",
      flavourText: "The splinters hurt you as much as the blade hurts the enemy."
   },
   [ItemType.wooden_axe]: {
      entityTextureSource: "../images/items/small/wooden-axe.png",
      textureSource: "../images/items/large/wooden-axe.png",
      toolTextureSource: "../images/items/large/wooden-axe.png",
      name: "Wooden Axe",
      namePlural: "Wooden Axes",
      description: "Basic axe."
   },
   [ItemType.wooden_pickaxe]: {
      entityTextureSource: "../images/items/small/wooden-pickaxe.png",
      textureSource: "../images/items/large/wooden-pickaxe.png",
      toolTextureSource: "../images/items/large/wooden-pickaxe.png",
      name: "Wooden Pickaxe",
      namePlural: "Wooden Pickaxes",
      description: ""
   },
   [ItemType.berry]: {
      entityTextureSource: "../images/items/small/berry.png",
      textureSource: "../images/items/large/berry.png",
      toolTextureSource: "",
      name: "Berry",
      namePlural: "Berries",
      description: "Provides little sustenance, but can be used in a pinch."
   },
   [ItemType.raw_beef]: {
      entityTextureSource: "../images/items/small/raw-beef.png",
      textureSource: "../images/items/large/raw-beef.png",
      toolTextureSource: "",
      name: "Raw Beef",
      namePlural: "Raw Beef",
      description: "The raw mutilated flesh of a deceased cow - would not recommend eating."
   },
   [ItemType.cooked_beef]: {
      entityTextureSource: "../images/items/small/cooked-beef.png",
      textureSource: "../images/items/large/cooked-beef.png",
      toolTextureSource: "",
      name: "Cooked Beef",
      namePlural: "Cooked Beef",
      description: "A hearty meal. Could use some seasoning."
   },
   [ItemType.workbench]: {
      entityTextureSource: "../images/items/small/workbench.png",
      textureSource: "../images/items/large/workbench.png",
      toolTextureSource: "",
      name: "Workbench",
      namePlural: "Workbenches",
      description: "The first crafting station available, able to craft many more complex recipes."
   },
   [ItemType.rock]: {
      entityTextureSource: "../images/items/small/rock.png",
      textureSource: "../images/items/large/rock.png",
      toolTextureSource: "",
      name: "Rock",
      namePlural: "Rocks",
      description: "This Grug rock. No hurt or face wrath of Grug."
   },
   [ItemType.stone_sword]: {
      entityTextureSource: "../images/items/small/stone-sword.png",
      textureSource: "../images/items/large/stone-sword.png",
      toolTextureSource: "../images/items/large/stone-sword.png",
      name: "Stone Sword",
      namePlural: "Stone Swords",
      description: ""
   },
   [ItemType.stone_axe]: {
      entityTextureSource: "../images/items/small/stone-axe.png",
      textureSource: "../images/items/large/stone-axe.png",
      toolTextureSource: "../images/items/large/stone-axe.png",
      name: "Stone Axe",
      namePlural: "Stone Axes",
      description: ""
   },
   [ItemType.stone_pickaxe]: {
      entityTextureSource: "../images/items/small/stone-pickaxe.png",
      textureSource: "../images/items/large/stone-pickaxe.png",
      toolTextureSource: "../images/items/large/stone-pickaxe.png",
      name: "Stone Pickaxe",
      namePlural: "Stone Pickaxes",
      description: ""
   },
   [ItemType.stone_hammer]: {
      entityTextureSource: "../images/items/small/stone-hammer.png",
      textureSource: "../images/items/large/stone-hammer.png",
      toolTextureSource: "../images/items/large/stone-hammer.png",
      name: "Stone Hammer",
      namePlural: "Stone Hammers",
      description: ""
   },
   [ItemType.leather]: {
      entityTextureSource: "../images/items/small/leather.png",
      textureSource: "../images/items/large/leather.png",
      toolTextureSource: "",
      name: "Leather",
      namePlural: "Leather",
      description: ""
   },
   [ItemType.leather_backpack]: {
      entityTextureSource: "../images/items/small/leather-backpack.png",
      textureSource: "../images/items/large/leather-backpack.png",
      toolTextureSource: "",
      name: "Leather Backpack",
      namePlural: "Leather Backpacks",
      description: "Allows you to hold more items."
   },
   [ItemType.cactus_spine]: {
      entityTextureSource: "../images/items/small/cactus-spine.png",
      textureSource: "../images/items/large/cactus-spine.png",
      toolTextureSource: "",
      name: "Cactus Spine",
      namePlural: "Cactus Spines",
      description: "It's tough and spiky and gets everywhere."
   },
   [ItemType.yeti_hide]: {
      entityTextureSource: "../images/items/small/yeti-hide.png",
      textureSource: "../images/items/large/yeti-hide.png",
      toolTextureSource: "",
      name: "Yeti Hide",
      namePlural: "Yeti Hides",
      description: "An extremely tough half-frost half-flesh hide."
   },
   [ItemType.frostcicle]: {
      entityTextureSource: "../images/items/small/frostcicle.png",
      textureSource: "../images/items/large/frostcicle.png",
      toolTextureSource: "",
      name: "Frostcicle",
      namePlural: "Frostcicles",
      description: "A perfectly preserved ice shard."
   },
   [ItemType.slimeball]: {
      entityTextureSource: "../images/items/small/slimeball.png",
      textureSource: "../images/items/large/slimeball.png",
      toolTextureSource: "",
      name: "Slimeball",
      namePlural: "Slimeballs",
      description: ""
   },
   [ItemType.eyeball]: {
      entityTextureSource: "../images/items/small/eyeball.png",
      textureSource: "../images/items/large/eyeball.png",
      toolTextureSource: "",
      name: "Eyeball",
      namePlural: "Eyeballs",
      description: ""
   },
   [ItemType.flesh_sword]: {
      entityTextureSource: "../images/items/small/flesh-sword.png",
      textureSource: "../images/items/large/flesh-sword.png",
      toolTextureSource: "../images/items/large/flesh-sword.png",
      name: "Flesh Sword",
      namePlural: "Flesh Swords",
      description: ""
   },
   [ItemType.tribe_totem]: {
      entityTextureSource: "../images/items/small/tribe-totem.png",
      textureSource: "../images/items/large/tribe-totem.png",
      toolTextureSource: "",
      name: "Totem",
      namePlural: "Totems",
      description: "Centerpiece of the tribe."
   },
   [ItemType.worker_hut]: {
      entityTextureSource: "../images/items/small/worker-hut.png",
      textureSource: "../images/items/large/worker-hut.png",
      toolTextureSource: "",
      name: "Worker Hut",
      namePlural: "Worker Huts",
      description: ""
   },
   [ItemType.barrel]: {
      entityTextureSource: "../images/items/small/barrel.png",
      textureSource: "../images/items/large/barrel.png",
      toolTextureSource: "",
      name: "Barrel",
      namePlural: "Barrels",
      description: ""
   },
   [ItemType.frostSword]: {
      entityTextureSource: "../images/items/small/frost-sword.png",
      textureSource: "../images/items/large/frost-sword.png",
      toolTextureSource: "../images/items/large/frost-sword.png",
      name: "Frost Sword",
      namePlural: "Frost Swords",
      description: ""
   },
   [ItemType.frostPickaxe]: {
      entityTextureSource: "../images/items/small/frost-pickaxe.png",
      textureSource: "../images/items/large/frost-pickaxe.png",
      toolTextureSource: "../images/items/large/frost-pickaxe.png",
      name: "Frost Pickaxe",
      namePlural: "Frost Pickaxes",
      description: ""
   },
   [ItemType.frostAxe]: {
      entityTextureSource: "../images/items/small/frost-axe.png",
      textureSource: "../images/items/large/frost-axe.png",
      toolTextureSource: "../images/items/large/frost-axe.png",
      name: "Frost Axe",
      namePlural: "Frost Axes",
      description: ""
   },
   [ItemType.frostArmour]: {
      entityTextureSource: "../images/items/small/frost-armour.png",
      textureSource: "../images/items/large/frost-armour.png",
      toolTextureSource: "",
      name: "Frost Armour",
      namePlural: "Frost Armours",
      description: ""
   },
   [ItemType.campfire]: {
      entityTextureSource: "../images/items/small/campfire.png",
      textureSource: "../images/items/large/campfire.png",
      toolTextureSource: "",
      name: "Campfire",
      namePlural: "Campfires",
      description: ""
   },
   [ItemType.furnace]: {
      entityTextureSource: "../images/items/small/furnace.png",
      textureSource: "../images/items/large/furnace.png",
      toolTextureSource: "",
      name: "Furnace",
      namePlural: "Furnaces",
      description: ""
   },
   [ItemType.wooden_bow]: {
      entityTextureSource: "../images/items/small/wooden-bow.png",
      textureSource: "../images/items/large/wooden-bow.png",
      toolTextureSource: "../images/items/large/wooden-bow.png",
      name: "Wooden Bow",
      namePlural: "Wooden Bows",
      description: ""
   },
   [ItemType.reinforced_bow]: {
      entityTextureSource: "../images/items/small/reinforced-bow.png",
      textureSource: "../images/items/large/reinforced-bow.png",
      toolTextureSource: "../images/items/large/reinforced-bow.png",
      name: "Reinforced Bow",
      namePlural: "Reinforced Bows",
      description: ""
   },
   [ItemType.ice_bow]: {
      entityTextureSource: "../images/items/small/ice-bow.png",
      textureSource: "../images/items/large/ice-bow.png",
      toolTextureSource: "../images/items/large/ice-bow.png",
      name: "Ice Bow",
      namePlural: "Ice Bows",
      description: ""
   },
   [ItemType.crossbow]: {
      entityTextureSource: "../images/items/small/crossbow.png",
      textureSource: "../images/items/large/crossbow.png",
      toolTextureSource: "../images/items/large/crossbow.png",
      name: "Crossbow",
      namePlural: "Crossbows",
      description: ""
   },
   [ItemType.meat_suit]: {
      entityTextureSource: "../images/items/small/meat-suit.png",
      textureSource: "../images/items/large/meat-suit.png",
      toolTextureSource: "",
      name: "Meat Suit",
      namePlural: "Meat Suits",
      description: "You think you are Cow, but you are not. You are a mere imitation, a foolish attempt to recreate That which is divine."
   },
   [ItemType.deepfrost_heart]: {
      entityTextureSource: "../images/items/small/deepfrost-heart.png",
      textureSource: "../images/items/large/deepfrost-heart.png",
      toolTextureSource: "",
      name: "Deepfrost Heart",
      namePlural: "Deepfrost Hearts",
      description: ""
   },
   [ItemType.raw_fish]: {
      entityTextureSource: "../images/items/small/raw-fish.png",
      textureSource: "../images/items/large/raw-fish.png",
      toolTextureSource: "",
      name: "Raw Fish",
      namePlural: "Raw Fishes",
      description: ""
   },
   [ItemType.cooked_fish]: {
      entityTextureSource: "../images/items/small/cooked-fish.png",
      textureSource: "../images/items/large/cooked-fish.png",
      toolTextureSource: "",
      name: "Cooked Fish",
      namePlural: "Cooked Fishes",
      description: ""
   },
   [ItemType.fishlord_suit]: {
      entityTextureSource: "../images/items/small/fishlord-suit.png",
      textureSource: "../images/items/large/fishlord-suit.png",
      toolTextureSource: "",
      name: "Fish Suit",
      namePlural: "Fish Suits", 
      description: ""
   },
   [ItemType.gathering_gloves]: {
      entityTextureSource: "../images/items/small/gathering-gloves.png",
      textureSource: "../images/items/large/gathering-gloves.png",
      toolTextureSource: "",
      name: "Gathering Gloves",
      namePlural: "Gathering Gloves", 
      description: ""
   },
   [ItemType.leather_armour]: {
      entityTextureSource: "../images/items/small/leather-armour.png",
      textureSource: "../images/items/large/leather-armour.png",
      toolTextureSource: "",
      name: "Leather Armour",
      namePlural: "Leather Armours", 
      description: ""
   },
   [ItemType.woodenSpear]: {
      entityTextureSource: "../images/items/small/wooden-spear.png",
      textureSource: "../images/items/large/wooden-spear.png",
      toolTextureSource: "../images/items/misc/wooden-spear.png",
      name: "Wooden Spear",
      namePlural: "Wooden Spears", 
      description: "Pointy end works best."
   },
   [ItemType.stoneSpear]: {
      entityTextureSource: "../images/items/small/stone-spear.png",
      textureSource: "../images/items/large/stone-spear.png",
      toolTextureSource: "../images/items/misc/stone-spear.png",
      name: "Stone Spear",
      namePlural: "Stone Spears", 
      description: "Pointy end works best."
   },
   [ItemType.paper]: {
      entityTextureSource: "../images/items/small/paper.png",
      textureSource: "../images/items/large/paper.png",
      toolTextureSource: "",
      name: "Paper",
      namePlural: "Papers", 
      description: ""
   },
   [ItemType.research_bench]: {
      entityTextureSource: "../images/items/small/research-bench.png",
      textureSource: "../images/items/large/research-bench.png",
      toolTextureSource: "",
      name: "Research Bench",
      namePlural: "Research Benches", 
      description: ""
   },
   [ItemType.wooden_wall]: {
      entityTextureSource: "../images/items/small/wooden-wall.png",
      textureSource: "../images/items/large/wooden-wall.png",
      toolTextureSource: "",
      name: "Wooden Wall",
      namePlural: "Wooden Walls",
      description: ""
   },
   [ItemType.wooden_hammer]: {
      entityTextureSource: "../images/items/small/wooden-hammer.png",
      textureSource: "../images/items/large/wooden-hammer.png",
      toolTextureSource: "../images/items/large/wooden-hammer.png",
      name: "Wooden Hammer",
      namePlural: "Wooden Hammers",
      description: ""
   },
   [ItemType.stone_battleaxe]: {
      entityTextureSource: "../images/items/small/stone-battleaxe.png",
      textureSource: "../images/items/large/stone-battleaxe.png",
      toolTextureSource: "../images/items/large/stone-battleaxe.png",
      name: "Stone Battleaxe",
      namePlural: "Stone Battleaxes",
      description: ""
   },
   [ItemType.living_rock]: {
      entityTextureSource: "../images/items/small/living-rock.png",
      textureSource: "../images/items/large/living-rock.png",
      toolTextureSource: "",
      name: "Living Rock",
      namePlural: "Living Rocks",
      description: ""
   },
   [ItemType.planter_box]: {
      entityTextureSource: "../images/items/small/planter-box.png",
      textureSource: "../images/items/large/planter-box.png",
      toolTextureSource: "",
      name: "Planter Box",
      namePlural: "Planter Boxes",
      description: ""
   },
   [ItemType.poop]: {
      entityTextureSource: "../images/items/small/poop.png",
      textureSource: "../images/items/large/poop.png",
      toolTextureSource: "",
      name: "Poop",
      namePlural: "Poops",
      description: ""
   },
   [ItemType.wooden_spikes]: {
      entityTextureSource: "../images/items/small/wooden-spikes.png",
      textureSource: "../images/items/large/wooden-spikes.png",
      toolTextureSource: "",
      name: "Wooden Spikes",
      namePlural: "Wooden Spikes",
      description: ""
   },
   [ItemType.punji_sticks]: {
      entityTextureSource: "../images/items/small/punji-sticks.png",
      textureSource: "../images/items/large/punji-sticks.png",
      toolTextureSource: "",
      name: "Punji Sticks",
      namePlural: "Punji Sticks",
      description: "Slightly weaker than wooden spikes, but inflicts additional poison damage."
   },
   [ItemType.ballista]: {
      entityTextureSource: "../images/items/small/ballista.png",
      textureSource: "../images/items/large/ballista.png",
      toolTextureSource: "",
      name: "Ballista",
      namePlural: "Ballistas",
      description: "An automatic crossbow turret. Requires ammo to function."
   },
   [ItemType.sling_turret]: {
      // @Incomplete
      entityTextureSource: "../images/items/small/ballista.png",
      textureSource: "../images/items/large/sling-turret.png",
      toolTextureSource: "",
      name: "Sling Turret",
      namePlural: "Sling Turrets",
      description: ""
   },
   [ItemType.healing_totem]: {
      // @Incomplete
      entityTextureSource: "../images/items/small/ballista.png",
      textureSource: "../images/items/large/healing-totem.png",
      toolTextureSource: "",
      name: "Healing Totem",
      namePlural: "Healing Totems",
      description: "Concentrates healing beams to heal nearby tribesmen."
   },
   [ItemType.leaf]: {
      entityTextureSource: "../images/items/small/leaf.png",
      textureSource: "../images/items/large/leaf.png",
      toolTextureSource: "",
      name: "Leaf",
      namePlural: "Leaves",
      description: ""
   },
   [ItemType.herbal_medicine]: {
      entityTextureSource: "../images/items/small/herbal-medicine.png",
      textureSource: "../images/items/large/herbal-medicine.png",
      toolTextureSource: "",
      name: "Herbal Medicine",
      namePlural: "Herbal Medicines",
      description: ""
   },
   // @Incomplete
   [ItemType.leaf_suit]: {
      entityTextureSource: "../images/items/small/leather-armour.png",
      textureSource: "../images/items/large/leaf-suit.png",
      toolTextureSource: "",
      name: "Leaf Suit",
      namePlural: "Leaf Suits",
      description: ""
   },
   [ItemType.seed]: {
      entityTextureSource: "../images/items/small/seed.png",
      textureSource: "../images/items/large/seed.png",
      toolTextureSource: "",
      name: "Seed",
      namePlural: "Seeds",
      description: ""
   },
   [ItemType.gardening_gloves]: {
      entityTextureSource: "../images/items/small/gardening-gloves.png",
      textureSource: "../images/items/large/gardening-gloves.png",
      toolTextureSource: "",
      name: "Gardening Gloves",
      namePlural: "Gardening Gloves",
      description: ""
   },
   [ItemType.wooden_fence]: {
      entityTextureSource: "../images/items/small/fence.png",
      textureSource: "../images/items/large/fence.png",
      toolTextureSource: "",
      name: "Wooden Fence",
      namePlural: "Wooden Fences",
      description: "Good for keeping cows in, not so good for defending your valuables."
   },
   [ItemType.fertiliser]: {
      entityTextureSource: "../images/items/small/fertiliser.png",
      textureSource: "../images/items/large/fertiliser.png",
      toolTextureSource: "",
      name: "Fertiliser",
      namePlural: "Fertilisers",
      description: "Speeds up plant growth when used on planter boxes."
   },
   [ItemType.frostshaper]: {
      entityTextureSource: "../images/items/small/frostshaper.png",
      textureSource: "../images/items/large/frostshaper.png",
      toolTextureSource: "",
      name: "Frostshaper",
      namePlural: "Frostshapers",
      description: "Carves ice into complex shapes."
   },
   [ItemType.stonecarvingTable]: {
      entityTextureSource: "../images/items/small/stonecarving-table.png",
      textureSource: "../images/items/large/stonecarving-table.png",
      toolTextureSource: "",
      name: "Stonecarving Table",
      namePlural: "Stonecarving Tables",
      description: "Carves stone into complex shapes."
   },
   [ItemType.woodenShield]: {
      entityTextureSource: "../images/items/small/wooden-shield.png",
      textureSource: "../images/items/large/wooden-shield.png",
      toolTextureSource: "entities/shield-items/wooden-shield.png",
      name: "Wooden Shield",
      namePlural: "Wooden Shields",
      description: "Blocks projectiles and melee attacks, poorly."
   },
   [ItemType.slingshot]: {
      // @Incomplete
      entityTextureSource: "../images/items/small/wooden-shield.png",
      textureSource: "../images/items/large/slingshot.png",
      toolTextureSource: "entities/shield-items/wooden-shield.png",
      name: "Slingshot",
      namePlural: "Slingshots",
      description: "Slings rocks at people you don't like."
   },
   [ItemType.woodenBracings]: {
      entityTextureSource: "../images/items/small/wooden-bracings.png",
      textureSource: "../images/items/large/wooden-bracings.png",
      toolTextureSource: "",
      name: "Wooden Bracings",
      namePlural: "Wooden Bracings",
      description: "Supports the surrounding stone's mental health, preventing them from collapsing."
   },
   [ItemType.fireTorch]: {
      entityTextureSource: "../images/items/small/fire-torch.png",
      textureSource: "../images/items/large/fire-torch.png",
      toolTextureSource: "",
      name: "Fire Torch",
      namePlural: "Fire Torches",
      description: "Provides a temporary light source."
   },
   [ItemType.slurb]: {
      entityTextureSource: "../images/items/small/slurb.png",
      textureSource: "../images/items/large/slurb.png",
      toolTextureSource: "",
      name: "Slurb",
      namePlural: "Slurb",
      description: "Gooey. Glows a bit."
   },
   [ItemType.slurbTorch]: {
      entityTextureSource: "../images/items/small/slurb-torch.png",
      textureSource: "../images/items/large/slurb-torch.png",
      toolTextureSource: "",
      name: "Slurb Torch",
      namePlural: "Slurb Torches",
      description: "Less powerful than a regular torch, but doesn't burn out."
   },
   [ItemType.rawYetiFlesh]: {
      entityTextureSource: "../images/items/small/raw-yeti-flesh.png",
      textureSource: "../images/items/large/raw-yeti-flesh.png",
      toolTextureSource: "",
      name: "Raw Yeti Flesh",
      namePlural: "Raw Yeti Flesh",
      description: "Disgusting."
   },
   [ItemType.cookedYetiFlesh]: {
      entityTextureSource: "../images/items/small/cooked-yeti-flesh.png",
      textureSource: "../images/items/large/cooked-yeti-flesh.png",
      toolTextureSource: "",
      name: "Cooked Yeti Flesh",
      namePlural: "Cooked Yeti Flesh",
      description: "Disgusting, but nutritious."
   },
   [ItemType.mithrilOre]: {
      entityTextureSource: "../images/items/small/mithril-ore.png",
      textureSource: "../images/items/large/mithril-ore.png",
      toolTextureSource: "",
      name: "Mithril Ore",
      namePlural: "Mithril Ores",
      description: "Unrefined mithril."
   },
   [ItemType.mithrilBar]: {
      entityTextureSource: "../images/items/small/mithril-bar.png",
      textureSource: "../images/items/large/mithril-bar.png",
      toolTextureSource: "",
      name: "Mithril Bar",
      namePlural: "Mithril Bars",
      description: "Refined mithril."
   },
   [ItemType.mithrilSword]: {
      entityTextureSource: "../images/items/small/mithril-sword.png",
      textureSource: "../images/items/large/mithril-sword.png",
      toolTextureSource: "../images/items/large/mithril-sword.png",
      name: "Mithril Sword",
      namePlural: "Mithril Swords",
      description: ""
   },
   [ItemType.mithrilPickaxe]: {
      entityTextureSource: "../images/items/small/mithril-pickaxe.png",
      textureSource: "../images/items/large/mithril-pickaxe.png",
      toolTextureSource: "../images/items/large/mithril-pickaxe.png",
      name: "Mithril Pickaxe",
      namePlural: "Mithril Pickaxes",
      description: ""
   },
   [ItemType.mithrilAxe]: {
      entityTextureSource: "../images/items/small/mithril-axe.png",
      textureSource: "../images/items/large/mithril-axe.png",
      toolTextureSource: "../images/items/large/mithril-axe.png",
      name: "Mithril Axe",
      namePlural: "Mithril Axes",
      description: ""
   },
   [ItemType.mithrilArmour]: {
      entityTextureSource: "../images/items/small/mithril-armour.png",
      textureSource: "../images/items/large/mithril-armour.png",
      toolTextureSource: "",
      name: "Mithril Armour",
      namePlural: "Mithril Armours",
      description: ""
   },
   [ItemType.scrappy]: {
      entityTextureSource: "../images/items/small/scrappy.png",
      textureSource: "../images/items/large/scrappy.png",
      toolTextureSource: "",
      name: "Scrappy",
      namePlural: "Scrappies",
      description: ""
   },
   [ItemType.cogwalker]: {
      entityTextureSource: "../images/items/small/cogwalker.png",
      textureSource: "../images/items/large/cogwalker.png",
      toolTextureSource: "",
      name: "Cogwalker",
      namePlural: "Cogwalkers",
      description: ""
   },
   [ItemType.automatonAssembler]: {
      entityTextureSource: "../images/items/small/automaton-assembler.png",
      textureSource: "../images/items/large/automaton-assembler.png",
      toolTextureSource: "",
      name: "Automaton Assembler",
      namePlural: "Automaton Assemblers",
      description: ""
   },
   [ItemType.mithrilAnvil]: {
      entityTextureSource: "../images/items/small/mithril-anvil.png",
      textureSource: "../images/items/large/mithril-anvil.png",
      toolTextureSource: "",
      name: "Mithril Anvil",
      namePlural: "Mithril Anvils",
      description: ""
   },
   [ItemType.yuriMinecraft]: {
      entityTextureSource: "../images/items/small/scrappy.png",
      textureSource: "../images/items/large/minecraft.png",
      toolTextureSource: "",
      name: "The Evoker's Cold Touch | Alex's Awakening",
      namePlural: "The Evoker's Cold Touch | Alex's Awakening",
      description: "Alex's thoughts keep drifting back to that encounter in the woodland mansion, as much as she wills herself not to. She can't put the cold shivers out of her mind, the cold shivers which make her feel so warm. Perhaps the Illager's intentions weren't hostile..."
   },  
   [ItemType.yuriSonichu]: {
      entityTextureSource: "../images/items/small/cogwalker.png",
      textureSource: "../images/items/large/sonichu.png",
      toolTextureSource: "",
      name: "Sonichu x FemShrek - Alone in Shrekke's Love Shack (Chapters 1-5)",
      namePlural: "Sonichu x FemShrek - Alone in Shrekke's Love Shack (Chapters 1-5)",
      description: "Stuck alone and pent up in the woods for a week, Sonichu has an affliction only Shrekke's gentle yet controlling hands can cure."
   },
   [ItemType.animalStaff]: {
      entityTextureSource: "../images/items/small/animal-staff.png",
      textureSource: "../images/items/large/animal-staff.png",
      toolTextureSource: "../images/items/large/animal-staff.png",
      name: "Animal Staff",
      namePlural: "Animal Staff",
      description: "Allows you to control animals."
   },
   [ItemType.woodenArrow]: {
      entityTextureSource: "../images/items/small/wooden-arrow.png",
      textureSource: "../images/items/large/wooden-arrow.png",
      toolTextureSource: "",
      name: "Wooden Arrow",
      namePlural: "Wooden Arrows",
      description: "A primitive projectile able to be used in bows and crossbows."
   },
   [ItemType.tamingAlmanac]: {
      entityTextureSource: "../images/items/small/taming-almanac.png",
      textureSource: "../images/items/large/taming-almanac.png",
      toolTextureSource: "",
      name: "Taming Almanac",
      namePlural: "Taming Almanacs",
      description: "Allows you to see a creature's taming progress."
   },
   [ItemType.floorSign]: {
      entityTextureSource: "../images/items/small/floor-sign.png",
      textureSource: "../images/items/large/floor-sign.png",
      toolTextureSource: "",
      name: "Floor Sign",
      namePlural: "Floor Signs",
      description: "Lets you write a message on the ground."
   },
   [ItemType.pricklyPear]: {
      entityTextureSource: "../images/items/small/prickly-pear.png",
      textureSource: "../images/items/large/prickly-pear.png",
      toolTextureSource: "",
      name: "Prickly Pear",
      namePlural: "Prickly Pears",
      description: "Takes a very long time to eat."
   },
   [ItemType.rawCrabMeat]: {
      entityTextureSource: "../images/items/small/raw-crab-meat.png",
      textureSource: "../images/items/large/raw-crab-meat.png",
      toolTextureSource: "",
      name: "Raw Crab Meat",
      namePlural: "Raw Crab Meats",
      description: ""
   },
   [ItemType.cookedCrabMeat]: {
      entityTextureSource: "../images/items/small/cooked-crab-meat.png",
      textureSource: "../images/items/large/cooked-crab-meat.png",
      toolTextureSource: "",
      name: "Cooked Crab Meat",
      namePlural: "Cooked Crab Meats",
      description: ""
   },
   [ItemType.chitin]: {
      entityTextureSource: "../images/items/small/chitin.png",
      textureSource: "../images/items/large/chitin.png",
      toolTextureSource: "",
      name: "Chitin",
      namePlural: "Chitin",
      description: ""
   },
   [ItemType.crabplateArmour]: {
      entityTextureSource: "../images/items/small/crabplate-armour.png",
      textureSource: "../images/items/large/crabplate-armour.png",
      toolTextureSource: "",
      name: "Crabplate Armour",
      namePlural: "Crabplate Armour",
      description: ""
   },
   [ItemType.dustfleaEgg]: {
      entityTextureSource: "../images/items/small/dustflea-egg.png",
      textureSource: "../images/items/large/dustflea-egg.png",
      toolTextureSource: "",
      name: "Dustflea Egg",
      namePlural: "Dustflea Eggs",
      description: ""
   },
   [ItemType.snowberry]: {
      entityTextureSource: "../images/items/small/snowberry.png",
      textureSource: "../images/items/large/snowberry.png",
      toolTextureSource: "",
      name: "Snowberry",
      namePlural: "Snowberries",
      description: ""
   },
   [ItemType.rawSnobeMeat]: {
      entityTextureSource: "../images/items/small/raw-snobe-meat.png",
      textureSource: "../images/items/large/raw-snobe-meat.png",
      toolTextureSource: "",
      name: "Raw Snobe Meat",
      namePlural: "Raw Snobe Meats",
      description: ""
   },
   [ItemType.snobeStew]: {
      entityTextureSource: "../images/items/small/snobe-stew.png",
      textureSource: "../images/items/large/snobe-stew.png",
      toolTextureSource: "",
      name: "Snobe Stew",
      namePlural: "Snobe Stews",
      description: ""
   },
   [ItemType.snobeHide]: {
      entityTextureSource: "../images/items/small/snobe-hide.png",
      textureSource: "../images/items/large/snobe-hide.png",
      toolTextureSource: "",
      name: "Snobe Hide",
      namePlural: "Snobe Hides",
      description: ""
   },
   [ItemType.inguSerpentTooth]: {
      entityTextureSource: "../images/items/small/ingu-serpent-tooth.png",
      textureSource: "../images/items/large/ingu-serpent-tooth.png",
      toolTextureSource: "",
      name: "Ingu Serpent Tooth",
      namePlural: "Ingu Serpent Teeth",
      description: ""
   },
   [ItemType.iceWringer]: {
      entityTextureSource: "../images/items/small/ice-wringer.png",
      textureSource: "../images/items/large/ice-wringer.png",
      toolTextureSource: "../images/items/large/ice-wringer.png",
      name: "Ice Wringer",
      namePlural: "Ice Wringer",
      description: ""
   },
   [ItemType.rawTukmokMeat]: {
      entityTextureSource: "../images/items/small/raw-tukmok-meat.png",
      textureSource: "../images/items/large/raw-tukmok-meat.png",
      toolTextureSource: "",
      name: "Raw Tukmok Meat",
      namePlural: "Raw Tukmok Meat",
      description: ""
   },
   [ItemType.cookedTukmokMeat]: {
      entityTextureSource: "../images/items/small/cooked-tukmok-meat.png",
      textureSource: "../images/items/large/cooked-tukmok-meat.png",
      toolTextureSource: "",
      name: "Cooked Tukmok Meat",
      namePlural: "Cooked Tukmok Meat",
      description: ""
   },
   [ItemType.tukmokFurHide]: {
      entityTextureSource: "../images/items/small/tukmok-fur-hide.png",
      textureSource: "../images/items/large/tukmok-fur-hide.png",
      toolTextureSource: "",
      name: "Tukmok Fur Hide",
      namePlural: "Tukmok Fur Hides",
      description: ""
   },
   [ItemType.winterskinArmour]: {
      entityTextureSource: "../images/items/small/winterskin-armour.png",
      textureSource: "../images/items/large/winterskin-armour.png",
      toolTextureSource: "",
      name: "Winterskin Armour",
      namePlural: "Winterskin Armour",
      description: ""
   },
   [ItemType.ivoryTusk]: {
      entityTextureSource: "../images/items/small/ivory-tusk.png",
      textureSource: "../images/items/large/ivory-tusk.png",
      toolTextureSource: "../images/items/misc/ivory-tusk.png",
      name: "Ivory Tusk",
      namePlural: "Ivory Tusk",
      description: ""
   },
   [ItemType.ivorySpear]: {
      entityTextureSource: "../images/items/small/ivory-spear.png",
      textureSource: "../images/items/large/ivory-spear.png",
      toolTextureSource: "../images/items/misc/ivory-spear.png",
      name: "Ivory Spear",
      namePlural: "Ivory Spear",
      description: ""
   },
};

export function getItemTypeImage(itemType: ItemType): string {
   // @SQUEAM just cuz im curious what they look like
   console.log(itemImages[CLIENT_ITEM_INFO_RECORD[itemType].textureSource])
   return itemImages[CLIENT_ITEM_INFO_RECORD[itemType].textureSource];
}

export default CLIENT_ITEM_INFO_RECORD;
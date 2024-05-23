import { ItemType } from "webgl-test-shared/dist/items";

export type ClientItemInfo = {
   readonly entityTextureSource: string;
   readonly textureSource: string;
   /** Texture source when used as a tool in a tribe members' hand. Empty string if not used as a tool */
   readonly toolTextureSource: string;
   readonly name: string;
   readonly description: string;
}

const CLIENT_ITEM_INFO_RECORD: Record<ItemType, ClientItemInfo> = {
   [ItemType.wood]: {
      entityTextureSource: "items/small/wood.png",
      textureSource: "items/large/wood.png",
      toolTextureSource: "",
      name: "Wood",
      description: "A common material used in crafting many things."
   },
   [ItemType.wooden_sword]: {
      entityTextureSource: "items/small/wooden-sword.png",
      textureSource: "items/large/wooden-sword.png",
      toolTextureSource: "items/large/wooden-sword.png",
      name: "Wooden Sword",
      description: "The splinters hurt you as much as the blade hurts the enemy."
   },
   [ItemType.wooden_axe]: {
      entityTextureSource: "items/small/wooden-axe.png",
      textureSource: "items/large/wooden-axe.png",
      toolTextureSource: "items/large/wooden-axe.png",
      name: "Wooden Axe",
      description: ""
   },
   [ItemType.wooden_pickaxe]: {
      entityTextureSource: "items/small/wooden-pickaxe.png",
      textureSource: "items/large/wooden-pickaxe.png",
      toolTextureSource: "items/large/wooden-pickaxe.png",
      name: "Wooden Pickaxe",
      description: ""
   },
   [ItemType.berry]: {
      entityTextureSource: "items/small/berry.png",
      textureSource: "items/large/berry.png",
      toolTextureSource: "",
      name: "Berry",
      description: "Provides little sustenance, but can be used in a pinch."
   },
   [ItemType.raw_beef]: {
      entityTextureSource: "items/small/raw-beef.png",
      textureSource: "items/large/raw-beef.png",
      toolTextureSource: "",
      name: "Raw Beef",
      description: "The raw mutilated flesh of a deceased cow - would not recommend eating."
   },
   [ItemType.cooked_beef]: {
      entityTextureSource: "items/small/cooked-beef.png",
      textureSource: "items/large/cooked-beef.png",
      toolTextureSource: "",
      name: "Cooked Beef",
      description: "A hearty meal. Could use some seasoning."
   },
   [ItemType.workbench]: {
      entityTextureSource: "items/small/workbench.png",
      textureSource: "items/large/workbench.png",
      toolTextureSource: "",
      name: "Workbench",
      description: "The first crafting station available, able to craft many more complex recipes."
   },
   [ItemType.rock]: {
      entityTextureSource: "items/small/rock.png",
      textureSource: "items/large/rock.png",
      toolTextureSource: "",
      name: "Rock",
      description: "This Grug rock. No hurt or face wrath of Grug."
   },
   [ItemType.stone_sword]: {
      entityTextureSource: "items/small/stone-sword.png",
      textureSource: "items/large/stone-sword.png",
      toolTextureSource: "items/large/stone-sword.png",
      name: "Stone Sword",
      description: ""
   },
   [ItemType.stone_axe]: {
      entityTextureSource: "items/small/stone-axe.png",
      textureSource: "items/large/stone-axe.png",
      toolTextureSource: "items/large/stone-axe.png",
      name: "Stone Axe",
      description: ""
   },
   [ItemType.stone_pickaxe]: {
      entityTextureSource: "items/small/stone-pickaxe.png",
      textureSource: "items/large/stone-pickaxe.png",
      toolTextureSource: "items/large/stone-pickaxe.png",
      name: "Stone Pickaxe",
      description: ""
   },
   [ItemType.stone_hammer]: {
      entityTextureSource: "items/small/stone-hammer.png",
      textureSource: "items/large/stone-hammer.png",
      toolTextureSource: "items/large/stone-hammer.png",
      name: "Stone Hammer",
      description: ""
   },
   [ItemType.leather]: {
      entityTextureSource: "items/small/leather.png",
      textureSource: "items/large/leather.png",
      toolTextureSource: "",
      name: "Leather",
      description: ""
   },
   [ItemType.leather_backpack]: {
      entityTextureSource: "items/small/leather-backpack.png",
      textureSource: "items/large/leather-backpack.png",
      toolTextureSource: "",
      name: "Leather Backpack",
      description: "Allows you to hold more items."
   },
   [ItemType.cactus_spine]: {
      entityTextureSource: "items/small/cactus-spine.png",
      textureSource: "items/large/cactus-spine.png",
      toolTextureSource: "",
      name: "Cactus Spine",
      description: "It's tough and spiky and gets everywhere."
   },
   [ItemType.yeti_hide]: {
      entityTextureSource: "items/small/yeti-hide.png",
      textureSource: "items/large/yeti-hide.png",
      toolTextureSource: "",
      name: "Yeti Hide",
      description: "An extremely tough half-frost half-flesh hide."
   },
   [ItemType.frostcicle]: {
      entityTextureSource: "items/small/frostcicle.png",
      textureSource: "items/large/frostcicle.png",
      toolTextureSource: "",
      name: "Frostcicle",
      description: "A perfectly preserved ice shard."
   },
   [ItemType.slimeball]: {
      entityTextureSource: "items/small/slimeball.png",
      textureSource: "items/large/slimeball.png",
      toolTextureSource: "",
      name: "Slimeball",
      description: ""
   },
   [ItemType.eyeball]: {
      entityTextureSource: "items/small/eyeball.png",
      textureSource: "items/large/eyeball.png",
      toolTextureSource: "",
      name: "Eyeball",
      description: ""
   },
   [ItemType.flesh_sword]: {
      entityTextureSource: "items/small/flesh-sword.png",
      textureSource: "items/large/flesh-sword.png",
      toolTextureSource: "items/large/flesh-sword.png",
      name: "Flesh Sword",
      description: ""
   },
   [ItemType.tribe_totem]: {
      entityTextureSource: "items/small/tribe-totem.png",
      textureSource: "items/large/tribe-totem.png",
      toolTextureSource: "",
      name: "Totem",
      description: "Centerpiece of the tribe."
   },
   [ItemType.worker_hut]: {
      entityTextureSource: "items/small/worker-hut.png",
      textureSource: "items/large/worker-hut.png",
      toolTextureSource: "",
      name: "Worker Hut",
      description: ""
   },
   [ItemType.barrel]: {
      entityTextureSource: "items/small/barrel.png",
      textureSource: "items/large/barrel.png",
      toolTextureSource: "",
      name: "Barrel",
      description: ""
   },
   [ItemType.frost_armour]: {
      entityTextureSource: "items/small/frost-armour.png",
      textureSource: "items/large/frost-armour.png",
      toolTextureSource: "",
      name: "Frost Armour",
      description: ""
   },
   [ItemType.campfire]: {
      entityTextureSource: "items/small/campfire.png",
      textureSource: "items/large/campfire.png",
      toolTextureSource: "",
      name: "Campfire",
      description: ""
   },
   [ItemType.furnace]: {
      entityTextureSource: "items/small/furnace.png",
      textureSource: "items/large/furnace.png",
      toolTextureSource: "",
      name: "Furnace",
      description: ""
   },
   [ItemType.wooden_bow]: {
      entityTextureSource: "items/small/wooden-bow.png",
      textureSource: "items/large/wooden-bow.png",
      toolTextureSource: "items/large/wooden-bow.png",
      name: "Wooden Bow",
      description: ""
   },
   [ItemType.reinforced_bow]: {
      entityTextureSource: "items/small/reinforced-bow.png",
      textureSource: "items/large/reinforced-bow.png",
      toolTextureSource: "items/large/reinforced-bow.png",
      name: "Reinforced Bow",
      description: ""
   },
   [ItemType.ice_bow]: {
      entityTextureSource: "items/small/ice-bow.png",
      textureSource: "items/large/ice-bow.png",
      toolTextureSource: "items/large/ice-bow.png",
      name: "Ice Bow",
      description: ""
   },
   [ItemType.crossbow]: {
      entityTextureSource: "items/small/crossbow.png",
      textureSource: "items/large/crossbow.png",
      toolTextureSource: "items/large/crossbow.png",
      name: "Crossbow",
      description: ""
   },
   [ItemType.meat_suit]: {
      entityTextureSource: "items/small/meat-suit.png",
      textureSource: "items/large/meat-suit.png",
      toolTextureSource: "",
      name: "Meat Suit",
      description: "You think you are Cow, but you are not. You are a mere imitation, a foolish attempt to recreate That which is divine. You will never approach Their divinity."
   },
   [ItemType.deepfrost_heart]: {
      entityTextureSource: "items/small/deepfrost-heart.png",
      textureSource: "items/large/deepfrost-heart.png",
      toolTextureSource: "",
      name: "Deepfrost Heart",
      description: ""
   },
   [ItemType.deepfrost_sword]: {
      entityTextureSource: "items/small/deepfrost-sword.png",
      textureSource: "items/large/deepfrost-sword.png",
      toolTextureSource: "items/large/deepfrost-sword.png",
      name: "Deepfrost Sword",
      description: ""
   },
   [ItemType.deepfrost_pickaxe]: {
      entityTextureSource: "items/small/deepfrost-pickaxe.png",
      textureSource: "items/large/deepfrost-pickaxe.png",
      toolTextureSource: "items/large/deepfrost-pickaxe.png",
      name: "Deepfrost Pickaxe",
      description: ""
   },
   [ItemType.deepfrost_axe]: {
      entityTextureSource: "items/small/deepfrost-axe.png",
      textureSource: "items/large/deepfrost-axe.png",
      toolTextureSource: "items/large/deepfrost-axe.png",
      name: "Deepfrost Axe",
      description: ""
   },
   [ItemType.deepfrost_armour]: {
      entityTextureSource: "items/small/deepfrost-armour.png",
      textureSource: "items/large/deepfrost-armour.png",
      toolTextureSource: "",
      name: "Deepfrost Armour",
      description: ""
   },
   [ItemType.raw_fish]: {
      entityTextureSource: "items/small/raw-fish.png",
      textureSource: "items/large/raw-fish.png",
      toolTextureSource: "",
      name: "Deepfrost Armour",
      description: ""
   },
   [ItemType.cooked_fish]: {
      entityTextureSource: "items/small/cooked-fish.png",
      textureSource: "items/large/cooked-fish.png",
      toolTextureSource: "",
      name: "Deepfrost Armour",
      description: ""
   },
   [ItemType.fishlord_suit]: {
      entityTextureSource: "items/small/fishlord-suit.png",
      textureSource: "items/large/fishlord-suit.png",
      toolTextureSource: "",
      name: "Fish Suit",
      description: ""
   },
   [ItemType.gathering_gloves]: {
      entityTextureSource: "items/small/gathering-gloves.png",
      textureSource: "items/large/gathering-gloves.png",
      toolTextureSource: "",
      name: "Gathering Gloves",
      description: ""
   },
   // @Incomplete
   [ItemType.throngler]: {
      entityTextureSource: "items/small/fishlord-suit.png",
      textureSource: "items/large/fishlord-suit.png",
      toolTextureSource: "items/large/fishlord-suit.png",
      name: "The Throngler",
      description: ""
   },
   [ItemType.leather_armour]: {
      entityTextureSource: "items/small/leather-armour.png",
      textureSource: "items/large/leather-armour.png",
      toolTextureSource: "",
      name: "Leather Armour",
      description: ""
   },
   [ItemType.spear]: {
      entityTextureSource: "items/small/spear.png",
      textureSource: "items/large/spear.png",
      toolTextureSource: "items/misc/spear.png",
      name: "Spear",
      description: "Pointy end works best."
   },
   [ItemType.paper]: {
      entityTextureSource: "items/small/paper.png",
      textureSource: "items/large/paper.png",
      toolTextureSource: "",
      name: "Paper",
      description: ""
   },
   [ItemType.research_bench]: {
      entityTextureSource: "items/small/research-bench.png",
      textureSource: "items/large/research-bench.png",
      toolTextureSource: "",
      name: "Research Bench",
      description: ""
   },
   [ItemType.wooden_wall]: {
      entityTextureSource: "items/small/wooden-wall.png",
      textureSource: "items/large/wooden-wall.png",
      toolTextureSource: "",
      name: "Wooden Wall",
      description: ""
   },
   [ItemType.wooden_hammer]: {
      entityTextureSource: "items/small/wooden-hammer.png",
      textureSource: "items/large/wooden-hammer.png",
      toolTextureSource: "items/large/wooden-hammer.png",
      name: "Wooden Hammer",
      description: ""
   },
   [ItemType.stone_battleaxe]: {
      entityTextureSource: "items/small/stone-battleaxe.png",
      textureSource: "items/large/stone-battleaxe.png",
      toolTextureSource: "items/large/stone-battleaxe.png",
      name: "Stone Battleaxe",
      description: ""
   },
   [ItemType.living_rock]: {
      entityTextureSource: "items/small/living-rock.png",
      textureSource: "items/large/living-rock.png",
      toolTextureSource: "",
      name: "Living Rock",
      description: ""
   },
   [ItemType.planter_box]: {
      entityTextureSource: "items/small/planter-box.png",
      textureSource: "items/large/planter-box.png",
      toolTextureSource: "",
      name: "Planter Box",
      description: ""
   },
   [ItemType.poop]: {
      entityTextureSource: "items/small/poop.png",
      textureSource: "items/large/poop.png",
      toolTextureSource: "",
      name: "Poop",
      description: ""
   },
   [ItemType.wooden_spikes]: {
      entityTextureSource: "items/small/wooden-spikes.png",
      textureSource: "items/large/wooden-spikes.png",
      toolTextureSource: "",
      name: "Wooden Spikes",
      description: ""
   },
   [ItemType.punji_sticks]: {
      entityTextureSource: "items/small/punji-sticks.png",
      textureSource: "items/large/punji-sticks.png",
      toolTextureSource: "",
      name: "Punji Sticks",
      description: "Slightly weaker than wooden spikes, but inflicts additional poison damage."
   },
   [ItemType.ballista]: {
      entityTextureSource: "items/small/ballista.png",
      textureSource: "items/large/ballista.png",
      toolTextureSource: "",
      name: "Ballista",
      description: "An automatic crossbow turret. Requires ammo to function."
   },
   [ItemType.sling_turret]: {
      // @Incomplete
      entityTextureSource: "items/small/ballista.png",
      textureSource: "items/large/sling-turret.png",
      toolTextureSource: "",
      name: "Sling Turret",
      description: ""
   },
   [ItemType.healing_totem]: {
      // @Incomplete
      entityTextureSource: "items/small/ballista.png",
      textureSource: "items/large/healing-totem.png",
      toolTextureSource: "",
      name: "Healing Totem",
      description: "Concentrates healing beams to heal nearby tribesmen."
   },
   [ItemType.leaf]: {
      entityTextureSource: "items/small/leaf.png",
      textureSource: "items/large/leaf.png",
      toolTextureSource: "",
      name: "Leaf",
      description: ""
   },
   [ItemType.herbal_medicine]: {
      entityTextureSource: "items/small/herbal-medicine.png",
      textureSource: "items/large/herbal-medicine.png",
      toolTextureSource: "",
      name: "Herbal Medicine",
      description: ""
   },
   // @Incomplete
   [ItemType.leaf_suit]: {
      entityTextureSource: "items/small/leather-armour.png",
      textureSource: "items/large/leaf-suit.png",
      toolTextureSource: "",
      name: "Leaf Suit",
      description: ""
   },
   [ItemType.seed]: {
      entityTextureSource: "items/small/seed.png",
      textureSource: "items/large/seed.png",
      toolTextureSource: "",
      name: "Seed",
      description: ""
   },
   [ItemType.gardening_gloves]: {
      entityTextureSource: "items/small/gardening-gloves.png",
      textureSource: "items/large/gardening-gloves.png",
      toolTextureSource: "",
      name: "Gardening Gloves",
      description: ""
   },
   [ItemType.wooden_fence]: {
      entityTextureSource: "items/small/fence.png",
      textureSource: "items/large/fence.png",
      toolTextureSource: "",
      name: "Wooden Fence",
      description: "Good for keeping cows in, not so good for defending your valuables."
   },
   // @Incomplete
   [ItemType.fertiliser]: {
      entityTextureSource: "items/small/fence.png",
      textureSource: "items/large/fertiliser.png",
      toolTextureSource: "",
      name: "Fertiliser",
      description: "Speeds up plant growth when used on planter boxes."
   }
};

export function getItemTypeImage(itemType: ItemType): any {
   return require("./images/" + CLIENT_ITEM_INFO_RECORD[itemType].textureSource);
}

export default CLIENT_ITEM_INFO_RECORD;
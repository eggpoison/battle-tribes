import { ItemSlots, ItemType, ItemTypeString, PlaceableItemType } from "./items";
import { Settings } from "./settings";

const enum Vars {
   FAST_CRAFT_TIME = (0.5 * Settings.TPS) | 0,
   NORMAL_CRAFT_TIME = (1.2 * Settings.TPS) | 0,
   SLOW_CRAFT_TIME = (2.5 * Settings.TPS) | 0
}

export enum CraftingStation {
   workbench,
   slime,
   water
}
export const CRAFTING_STATIONS: ReadonlyArray<CraftingStation> = [0, 1, 2];

export const CRAFTING_STATION_ITEM_TYPE_RECORD: Partial<Record<CraftingStation, PlaceableItemType>> = {
   [CraftingStation.workbench]: ItemType.workbench
};

export type ItemRequirements = Partial<Record<ItemType, number>>;

export interface CraftingRecipe {
   readonly product: ItemType;
   /** Number of products created when the crafting recipe is used */
   readonly yield: number;
   readonly ingredients: ItemRequirements;
   readonly aiCraftTimeTicks: number;
   readonly craftingStation?: CraftingStation;
}

export const CRAFTING_RECIPES: ReadonlyArray<CraftingRecipe> = [
   {
      product: ItemType.workbench,
      yield: 1,
      ingredients: {
         [ItemType.wood]: 15
      },
      aiCraftTimeTicks: Vars.SLOW_CRAFT_TIME
   },
   {
      product: ItemType.wooden_sword,
      yield: 1,
      ingredients: {
         [ItemType.wood]: 15
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME
   },
   {
      product: ItemType.wooden_pickaxe,
      yield: 1,
      ingredients: {
         [ItemType.wood]: 10
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME
   },
   {
      product: ItemType.wooden_axe,
      yield: 1,
      ingredients: {
         [ItemType.wood]: 10
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME
   },
   {
      product: ItemType.wooden_hammer,
      yield: 1,
      ingredients: {
         [ItemType.wood]: 10
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME
   },
   {
      product: ItemType.stone_sword,
      yield: 1,
      ingredients: {
         [ItemType.wood]: 5,
         [ItemType.rock]: 15
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.stone_pickaxe,
      yield: 1,
      ingredients: {
         [ItemType.wood]: 5,
         [ItemType.rock]: 10
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.stone_axe,
      yield: 1,
      ingredients: {
         [ItemType.wood]: 5,
         [ItemType.rock]: 10
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.stone_hammer,
      yield: 1,
      ingredients: {
         [ItemType.wood]: 5,
         [ItemType.rock]: 10
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.leather_backpack,
      yield: 1,
      ingredients: {
         [ItemType.leather]: 5
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.flesh_sword,
      yield: 1,
      ingredients: {
         [ItemType.raw_beef]: 10,
         [ItemType.slimeball]: 10,
         [ItemType.eyeball]: 1
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: CraftingStation.slime
   },
   {
      product: ItemType.tribe_totem,
      yield: 1,
      ingredients: {
         [ItemType.wood]: 40
      },
      aiCraftTimeTicks: Vars.SLOW_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.worker_hut,
      yield: 1,
      ingredients: {
         [ItemType.wood]: 20,
      },
      aiCraftTimeTicks: Vars.SLOW_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.barrel,
      yield: 1,
      ingredients: {
         [ItemType.wood]: 20,
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.frost_armour,
      yield: 1,
      ingredients: {
         [ItemType.frostcicle]: 20,
         [ItemType.yeti_hide]: 10
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.campfire,
      yield: 1,
      ingredients: {
         [ItemType.wood]: 15
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME
   },
   {
      product: ItemType.furnace,
      yield: 1,
      ingredients: {
         [ItemType.campfire]: 1,
         [ItemType.rock]: 25
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME
   },
   {
      product: ItemType.wooden_bow,
      yield: 1,
      ingredients: {
         [ItemType.wood]: 20
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME
   },
   {
      product: ItemType.crossbow,
      yield: 1,
      ingredients: {
         [ItemType.wood]: 40,
         [ItemType.rock]: 30
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.reinforced_bow,
      yield: 1,
      ingredients: {
         [ItemType.wood]: 40,
         [ItemType.rock]: 30
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.ice_bow,
      yield: 1,
      ingredients: {
         [ItemType.frostcicle]: 20
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.meat_suit,
      yield: 1,
      ingredients: {
         [ItemType.raw_beef]: 15,
         [ItemType.cactus_spine]: 10
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.deepfrost_sword,
      yield: 1,
      ingredients: {
         [ItemType.deepfrost_heart]: 1,
         [ItemType.frostcicle]: 30
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.deepfrost_pickaxe,
      yield: 1,
      ingredients: {
         [ItemType.deepfrost_heart]: 1,
         [ItemType.frostcicle]: 25
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.deepfrost_axe,
      yield: 1,
      ingredients: {
         [ItemType.deepfrost_heart]: 1,
         [ItemType.frostcicle]: 20
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.deepfrost_armour,
      yield: 1,
      ingredients: {
         [ItemType.deepfrost_heart]: 1,
         [ItemType.yeti_hide]: 10,
         [ItemType.frostcicle]: 50
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.fishlord_suit,
      yield: 1,
      ingredients: {
         [ItemType.raw_fish]: 64,
         [ItemType.cactus_spine]: 1
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: CraftingStation.water
   },
   {
      product: ItemType.spear,
      yield: 1,
      ingredients: {
         [ItemType.wood]: 10,
         [ItemType.rock]: 5
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME
   },
   {
      product: ItemType.paper,
      yield: 1,
      ingredients: {
         [ItemType.wood]: 3
      },
      aiCraftTimeTicks: Vars.FAST_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.research_bench,
      yield: 1,
      ingredients: {
         [ItemType.wood]: 30,
         [ItemType.paper]: 10,
         [ItemType.slimeball]: 5
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.stone_battleaxe,
      yield: 1,
      ingredients: {
         [ItemType.wood]: 15,
         [ItemType.living_rock]: 25
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.wooden_spikes,
      yield: 3,
      ingredients: {
         [ItemType.wood]: 10
      },
      aiCraftTimeTicks: Vars.FAST_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.punji_sticks,
      yield: 1,
      ingredients: {
         [ItemType.wooden_spikes]: 1,
         [ItemType.slimeball]: 1,
         [ItemType.poop]: 2
      },
      aiCraftTimeTicks: Vars.FAST_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.sling_turret,
      yield: 1,
      ingredients: {
         [ItemType.wood]: 20,
         [ItemType.rock]: 30
      },
      aiCraftTimeTicks: Vars.SLOW_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.ballista,
      yield: 1,
      ingredients: {
         [ItemType.wood]: 60,
         [ItemType.rock]: 50
      },
      aiCraftTimeTicks: Vars.SLOW_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.wooden_wall,
      yield: 1,
      ingredients: {
         [ItemType.wood]: 4
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.wooden_fence,
      yield: 1,
      ingredients: {
         [ItemType.wood]: 2
      },
      aiCraftTimeTicks: Vars.FAST_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.herbal_medicine,
      yield: 2,
      ingredients: {
         [ItemType.leaf]: 10,
         [ItemType.berry]: 4,
         [ItemType.slimeball]: 2
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.leaf_suit,
      yield: 1,
      ingredients: {
         [ItemType.leaf]: 40
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.gathering_gloves,
      yield: 1,
      ingredients: {
         [ItemType.leather]: 7
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.gardening_gloves,
      yield: 1,
      ingredients: {
         [ItemType.leather]: 10,
         [ItemType.leaf]: 15
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.planter_box,
      yield: 1,
      ingredients: {
         [ItemType.wood]: 20
      },
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.healing_totem,
      yield: 1,
      ingredients: {
         [ItemType.wood]: 40,
         [ItemType.leaf]: 80
      },
      aiCraftTimeTicks: Vars.SLOW_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   },
   {
      product: ItemType.fertiliser,
      yield: 2,
      ingredients: {
         [ItemType.poop]: 3,
         [ItemType.leaf]: 3
      },
      aiCraftTimeTicks: Vars.SLOW_CRAFT_TIME,
      craftingStation: CraftingStation.workbench
   }
];

export function getItemRecipe(itemType: ItemType): CraftingRecipe | null {
   for (let i = 0; i < CRAFTING_RECIPES.length; i++) {
      const recipe = CRAFTING_RECIPES[i];

      if (recipe.product === itemType) {
         return recipe;
      }
   }

   return null;
}

export function forceGetItemRecipe(itemType: ItemType): CraftingRecipe {
   const recipe = getItemRecipe(itemType);
   if (recipe === null) {
      throw new Error("No recipe for item type " + ItemTypeString[itemType]);
   }
   return recipe;
}

export function hasEnoughItems(itemSlotRecords: ReadonlyArray<ItemSlots>, requiredItems: ItemRequirements): boolean {
   // Tally the total resources available for crafting
   const availableResources: Partial<Record<ItemType, number>> = {};
   for (const itemSlots of itemSlotRecords) {
      for (const item of Object.values(itemSlots)) {
         if (typeof item === "undefined") {
            continue;
         }
         
         if (!availableResources.hasOwnProperty(item.type)) {
            availableResources[item.type] = item.count;
         } else {
            availableResources[item.type]! += item.count;
         }
      }
   }
   
   for (const [ingredientType, ingredientCount] of Object.entries(requiredItems).map(entry => [Number(entry[0]), entry[1]]) as ReadonlyArray<[ItemType, number]>) {
      // If there is none of the ingredient available, the recipe cannot be crafted
      if (!availableResources.hasOwnProperty(ingredientType)) {
         return false;
      }

      // If there isn't enough of the ingredient available, the recipe cannot be crafted
      if (availableResources[ingredientType]! < ingredientCount) {
         return false;
      }
   }
   
   return true;
}

export type ItemTally = Partial<Record<ItemType, number>>;

const copyItemTally = (tally: ItemTally): ItemTally => {
   const copy: ItemTally = {};
   
   const itemTypes = Object.keys(tally).map(ingredientTypeString => Number(ingredientTypeString) as ItemType);
   for (let i = 0; i < itemTypes.length; i++) {
      const itemType = itemTypes[i];
      
      copy[itemType] = tally[itemType];
   }

   return copy;
}

export interface ProductInfo {
   readonly type: ItemType;
   readonly amountRequired: number;
}

export function getRecipeProductChain(itemType: ItemType, availableItems: Readonly<ItemTally>): ReadonlyArray<ProductInfo> {
   let currentAvailableItems = copyItemTally(availableItems);
   
   const productChain = new Array<ProductInfo>();
   const itemsToCheck = new Array<ProductInfo>();
   itemsToCheck.push({
      type: itemType,
      amountRequired: 1
   });

   while (itemsToCheck.length > 0) {
      const currentProductInfo = itemsToCheck[0];
      itemsToCheck.shift();

      const recipe = getItemRecipe(currentProductInfo.type);
      if (recipe === null) {
         continue;
      }

      // Don't add items which there are already enough of.
      const amountAvailable = currentAvailableItems[currentProductInfo.type];
      if (typeof amountAvailable !== "undefined" && amountAvailable >= currentProductInfo.amountRequired) {
         continue;
      }

      // Account for the product being crafted
      currentAvailableItems[currentProductInfo.type]! -= currentProductInfo.amountRequired;

      productChain.push(currentProductInfo);

      const ingredientTypes = Object.keys(recipe.ingredients).map(ingredientTypeString => Number(ingredientTypeString) as ItemType);
      for (let i = 0; i < ingredientTypes.length; i++) {
         const ingredientType = ingredientTypes[i];
         const amountRequired = recipe.ingredients[ingredientType]!;
         itemsToCheck.push({
            type: ingredientType,
            amountRequired: amountRequired
         });
      }
   }

   return productChain;
}
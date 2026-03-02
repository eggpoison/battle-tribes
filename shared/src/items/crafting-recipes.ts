import { ItemSlots, ItemType, ItemTypeString } from "./items";
import { Settings } from "../settings";
import { ItemTally2, createTallyFromRecord } from "./ItemTally";
import { EntityType } from "../entities";

enum Vars {
   FAST_CRAFT_TIME = (0.5 * Settings.TICK_RATE) | 0,
   NORMAL_CRAFT_TIME = (1.2 * Settings.TICK_RATE) | 0,
   SLOW_CRAFT_TIME = (2.5 * Settings.TICK_RATE) | 0
}

export type CraftingStationEntityType = EntityType.workbench | EntityType.slime | EntityType.frostshaper | EntityType.stonecarvingTable | EntityType.automatonAssembler | EntityType.mithrilAnvil;

// @Cleanup: remove once all references to this are removed
export type ItemRequirements = Partial<Record<ItemType, number>>;

export interface CraftingRecipe {
   readonly product: ItemType;
   /** Number of products created when the crafting recipe is used */
   readonly yield: number;
   readonly ingredients: ItemTally2;
   readonly aiCraftTimeTicks: number;
   readonly craftingStation?: CraftingStationEntityType;
}

export const CRAFTING_RECIPES: ReadonlyArray<CraftingRecipe> = [
   {
      product: ItemType.workbench,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 15
      }),
      aiCraftTimeTicks: Vars.SLOW_CRAFT_TIME
   },
   {
      product: ItemType.wooden_sword,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 15
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME
   },
   {
      product: ItemType.wooden_pickaxe,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 10
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME
   },
   {
      product: ItemType.wooden_axe,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 10
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME
   },
   {
      product: ItemType.wooden_hammer,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 10
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME
   },
   {
      product: ItemType.stone_sword,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 5,
         [ItemType.rock]: 15
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.stone_pickaxe,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 5,
         [ItemType.rock]: 10
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.stone_axe,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 5,
         [ItemType.rock]: 10
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.stone_hammer,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 5,
         [ItemType.rock]: 10
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.leather_backpack,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.leather]: 5
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.flesh_sword,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.raw_beef]: 10,
         [ItemType.slimeball]: 10,
         [ItemType.eyeball]: 1
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: EntityType.slime
   },
   {
      product: ItemType.tribe_totem,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 40
      }),
      aiCraftTimeTicks: Vars.SLOW_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.worker_hut,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 20,
      }),
      aiCraftTimeTicks: Vars.SLOW_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.barrel,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 20,
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.frostArmour,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.snobeHide]: 15,
         [ItemType.inguSerpentTooth]: 10
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: EntityType.frostshaper
   },
   {
      product: ItemType.campfire,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 15
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME
   },
   {
      product: ItemType.furnace,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.campfire]: 1,
         [ItemType.rock]: 25
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME
   },
   {
      product: ItemType.wooden_bow,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 20
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME
   },
   {
      product: ItemType.crossbow,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 40,
         [ItemType.rock]: 30
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: EntityType.stonecarvingTable
   },
   {
      product: ItemType.reinforced_bow,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 40,
         [ItemType.rock]: 30
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: EntityType.stonecarvingTable
   },
   {
      product: ItemType.ice_bow,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.frostcicle]: 20
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: EntityType.frostshaper
   },
   {
      product: ItemType.meat_suit,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.raw_beef]: 15,
         [ItemType.cactus_spine]: 10
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.fishlord_suit,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.raw_fish]: 64,
         [ItemType.cactus_spine]: 1
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.woodenSpear,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 10
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME
   },
   {
      product: ItemType.stoneSpear,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 10,
         [ItemType.rock]: 5
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME
   },
   {
      product: ItemType.paper,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 3
      }),
      aiCraftTimeTicks: Vars.FAST_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.research_bench,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 30,
         [ItemType.paper]: 10,
         [ItemType.slimeball]: 5
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.stone_battleaxe,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 15,
         [ItemType.living_rock]: 25
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: EntityType.stonecarvingTable
   },
   {
      product: ItemType.wooden_spikes,
      yield: 3,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 10
      }),
      aiCraftTimeTicks: Vars.FAST_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.punji_sticks,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wooden_spikes]: 1,
         [ItemType.slimeball]: 1,
         [ItemType.poop]: 2
      }),
      aiCraftTimeTicks: Vars.FAST_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.sling_turret,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 20,
         [ItemType.rock]: 30
      }),
      aiCraftTimeTicks: Vars.SLOW_CRAFT_TIME,
      craftingStation: EntityType.stonecarvingTable
   },
   {
      product: ItemType.ballista,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 60,
         [ItemType.rock]: 50
      }),
      aiCraftTimeTicks: Vars.SLOW_CRAFT_TIME,
      craftingStation: EntityType.stonecarvingTable
   },
   {
      product: ItemType.wooden_wall,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 4
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.wooden_fence,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 2
      }),
      aiCraftTimeTicks: Vars.FAST_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.herbal_medicine,
      yield: 2,
      ingredients: createTallyFromRecord({
         [ItemType.leaf]: 10,
         [ItemType.berry]: 4,
         [ItemType.slimeball]: 2
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.leaf_suit,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.leaf]: 40
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.gathering_gloves,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.leather]: 7
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.gardening_gloves,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.leather]: 10,
         [ItemType.leaf]: 15
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.planter_box,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 20
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.healing_totem,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 40,
         [ItemType.leaf]: 80
      }),
      aiCraftTimeTicks: Vars.SLOW_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.fertiliser,
      yield: 2,
      ingredients: createTallyFromRecord({
         [ItemType.poop]: 3,
         [ItemType.leaf]: 3
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.frostshaper,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.frostcicle]: 15,
         [ItemType.yeti_hide]: 1
      }),
      aiCraftTimeTicks: Vars.SLOW_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.stonecarvingTable,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.rock]: 15
      }),
      aiCraftTimeTicks: Vars.SLOW_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.woodenBracings,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 5
      }),
      aiCraftTimeTicks: Vars.FAST_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.fireTorch,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 2
      }),
      aiCraftTimeTicks: Vars.FAST_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.slurbTorch,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 2,
         [ItemType.slurb]: 2
      }),
      aiCraftTimeTicks: Vars.FAST_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.mithrilAnvil,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.mithrilBar]: 15
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.mithrilSword,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 5,
         [ItemType.mithrilBar]: 10
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: EntityType.mithrilAnvil
   },
   {
      product: ItemType.mithrilPickaxe,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 5,
         [ItemType.mithrilBar]: 10
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: EntityType.mithrilAnvil

   },
   {
      product: ItemType.mithrilAxe,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.wood]: 5,
         [ItemType.mithrilBar]: 10
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: EntityType.mithrilAnvil
   },
   {
      product: ItemType.automatonAssembler,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.mithrilBar]: 15
      }),
      aiCraftTimeTicks: Vars.SLOW_CRAFT_TIME,
      craftingStation: EntityType.mithrilAnvil
   },
   {
      product: ItemType.scrappy,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.mithrilBar]: 3
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: EntityType.automatonAssembler
   },
   {
      product: ItemType.crabplateArmour,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.chitin]: 15
      }),
      aiCraftTimeTicks: Vars.SLOW_CRAFT_TIME,
      craftingStation: EntityType.mithrilAnvil
   },
   // @Temporary: this makes no sense to be made in the workbench but thats all that can be done rn
   {
      product: ItemType.snobeStew,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.rawSnobeMeat]: 5
      }),
      aiCraftTimeTicks: Vars.NORMAL_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.iceWringer,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.inguSerpentTooth]: 10,
         [ItemType.frostcicle]: 20
      }),
      aiCraftTimeTicks: Vars.SLOW_CRAFT_TIME,
      craftingStation: EntityType.frostshaper
   },
   {
      product: ItemType.winterskinArmour,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.tukmokFurHide]: 10
      }),
      aiCraftTimeTicks: Vars.SLOW_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
   {
      product: ItemType.ivorySpear,
      yield: 1,
      ingredients: createTallyFromRecord({
         [ItemType.ivoryTusk]: 1,
         [ItemType.wood]: 10
      }),
      aiCraftTimeTicks: Vars.SLOW_CRAFT_TIME,
      craftingStation: EntityType.workbench
   },
];

export function getItemRecipe(itemType: ItemType): CraftingRecipe | null {
   // @Speed
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

export interface ProductInfo {
   readonly type: ItemType;
   readonly amountRequired: number;
}

/** Gets the chain of items required to craft a recipe, taking into account how many items are already available */
export function getRecipeProductChain(recipe: CraftingRecipe, availableItemsTally: Readonly<ItemTally2>): ReadonlyArray<ProductInfo> {
   const currentAvailableItems = availableItemsTally.copy();
   
   const productChain = new Array<ProductInfo>();
   const itemsToCheck = new Array<ProductInfo>();
   itemsToCheck.push({
      type: recipe.product,
      amountRequired: recipe.yield 
   });

   while (itemsToCheck.length > 0) {
      const currentProductInfo = itemsToCheck[0];
      itemsToCheck.shift();

      const recipe = forceGetItemRecipe(currentProductInfo.type);

      // Don't add items which there are already enough of.
      const amountAvailable = currentAvailableItems.getItemCount(currentProductInfo.type);
      if (amountAvailable >= currentProductInfo.amountRequired) {
         continue;
      }

      // Simulate the product being crafted
      currentAvailableItems.removeItemCount(currentProductInfo.type, currentProductInfo.amountRequired);

      productChain.push(currentProductInfo);

      const ingredientEntries = recipe.ingredients.getEntries();
      for (let i = 0; i < ingredientEntries.length; i++) {
         const entry = ingredientEntries[i];

         // If the ingredient also has a recipe, add it
         if (getItemRecipe(entry.itemType) !== null) {
            itemsToCheck.push({
               type: entry.itemType,
               amountRequired: entry.count
            });
         }
      }
   }

   return productChain;
}
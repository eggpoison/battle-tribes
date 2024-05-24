import { CraftingRecipe, CRAFTING_STATION_ITEM_TYPE_RECORD, ItemTally, getRecipeProductChain, forceGetItemRecipe } from "webgl-test-shared/dist/crafting-recipes";
import { EntityType } from "webgl-test-shared/dist/entities";
import { ItemType, ToolType, Inventory, PlaceableItemType, ITEM_INFO_RECORD, PlaceableItemInfo, InventoryName } from "webgl-test-shared/dist/items";
import { Settings } from "webgl-test-shared/dist/settings";
import { StructureType } from "webgl-test-shared/dist/structures";
import { TechInfo, getTechChain } from "webgl-test-shared/dist/techs";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../../Entity";
import { craftingStationExists, getBestHammerItemSlot } from "./tribesman-ai";
import { TribeComponentArray, TribesmanComponentArray } from "../../../components/ComponentArray";
import { InventoryComponentArray, getInventory, getItemTypeSlot, inventoryComponentCanAffordRecipe, inventoryHasItemType, tallyInventoryComponentItems } from "../../../components/InventoryComponent";
import Tribe, { BuildingPlan, BuildingPlanType, BuildingUpgradePlan, NewBuildingPlan } from "../../../Tribe";
import { createBuildingHitboxes } from "../../../buildings";
import { generateBuildingPosition } from "../../../ai-tribe-building/ai-building-plans";

// @Cleanup: can this be inferred from stuff like the entity->resource-dropped record?
const TOOL_TYPE_FOR_MATERIAL_RECORD: Record<ItemType, ToolType | null> = {
   [ItemType.wood]: "axe",
   [ItemType.workbench]: null,
   [ItemType.wooden_sword]: null,
   [ItemType.wooden_axe]: null,
   [ItemType.wooden_pickaxe]: null,
   [ItemType.wooden_hammer]: null,
   [ItemType.berry]: "sword",
   [ItemType.raw_beef]: "sword",
   [ItemType.cooked_beef]: null,
   [ItemType.rock]: "pickaxe",
   [ItemType.stone_sword]: null,
   [ItemType.stone_axe]: null,
   [ItemType.stone_pickaxe]: null,
   [ItemType.stone_hammer]: null,
   [ItemType.leather]: "sword",
   [ItemType.leather_backpack]: null,
   [ItemType.cactus_spine]: "sword",
   [ItemType.yeti_hide]: "sword",
   [ItemType.frostcicle]: "pickaxe",
   [ItemType.slimeball]: "sword",
   [ItemType.eyeball]: "sword",
   [ItemType.flesh_sword]: null,
   [ItemType.tribe_totem]: null,
   [ItemType.worker_hut]: null,
   [ItemType.barrel]: null,
   [ItemType.frost_armour]: null,
   [ItemType.campfire]: null,
   [ItemType.furnace]: null,
   [ItemType.wooden_bow]: null,
   [ItemType.meat_suit]: null,
   [ItemType.deepfrost_heart]: "sword",
   [ItemType.deepfrost_sword]: null,
   [ItemType.deepfrost_pickaxe]: null,
   [ItemType.deepfrost_axe]: null,
   [ItemType.deepfrost_armour]: null,
   [ItemType.raw_fish]: "sword",
   [ItemType.cooked_fish]: null,
   [ItemType.fishlord_suit]: null,
   [ItemType.gathering_gloves]: null,
   [ItemType.throngler]: null,
   [ItemType.leather_armour]: null,
   [ItemType.spear]: null,
   [ItemType.paper]: null,
   [ItemType.research_bench]: null,
   [ItemType.wooden_wall]: null,
   [ItemType.stone_battleaxe]: null,
   [ItemType.living_rock]: "pickaxe",
   [ItemType.planter_box]: null,
   [ItemType.reinforced_bow]: null,
   [ItemType.crossbow]: null,
   [ItemType.ice_bow]: null,
   [ItemType.poop]: null,
   [ItemType.wooden_spikes]: null,
   [ItemType.punji_sticks]: null,
   [ItemType.ballista]: null,
   [ItemType.sling_turret]: null,
   [ItemType.healing_totem]: null,
   // @Incomplete
   [ItemType.leaf]: null,
   [ItemType.herbal_medicine]: null,
   [ItemType.leaf_suit]: null,
   [ItemType.seed]: "axe",
   [ItemType.gardening_gloves]: null,
   [ItemType.wooden_fence]: null,
   [ItemType.fertiliser]: null
}

export const enum TribesmanGoalType {
   craftRecipe,
   placeBuilding,
   upgradeBuilding,
   researchTech,
   gatherItems
}

interface BaseTribesmanGoal {
   readonly type: TribesmanGoalType;
   readonly isPersonalPlan: boolean;
}

export interface TribesmanCraftGoal extends BaseTribesmanGoal {
   readonly type: TribesmanGoalType.craftRecipe;
   readonly recipe: CraftingRecipe;
   readonly plan: NewBuildingPlan | null;
}

export interface TribesmanPlaceGoal extends BaseTribesmanGoal {
   readonly type: TribesmanGoalType.placeBuilding;
   readonly placeableItemSlot: number;
   readonly plan: NewBuildingPlan;
}

export interface TribesmanUpgradeGoal extends BaseTribesmanGoal {
   readonly type: TribesmanGoalType.upgradeBuilding;
   readonly plan: BuildingUpgradePlan;
}

/** Tells the tribesman to contribute gathered items and work to a tech, and completes that tech as soon as possible */
export interface TribesmanResearchGoal extends BaseTribesmanGoal {
   readonly type: TribesmanGoalType.researchTech;
   readonly tech: TechInfo;
}

export interface TribesmanGatherGoal extends BaseTribesmanGoal {
   readonly type: TribesmanGoalType.gatherItems;
   readonly itemTypesToGather: ReadonlyArray<ItemType>;
}

export type TribesmanGoal = TribesmanCraftGoal | TribesmanPlaceGoal | TribesmanUpgradeGoal | TribesmanResearchGoal | TribesmanGatherGoal;

// @Cleanup: unused?
// const shouldCraftHammer = (hotbarInventory: Inventory, tribe: Tribe): boolean => {
//    if (getBestHammerItemSlot(hotbarInventory) !== 0) {
//       return false;
//    }

//    for (let i = 0; i < tribe.buildings.length; i++) {
//       const building = tribe.buildings[i];
//       if (building.type === EntityType.wall) {
//          return true;
//       }
//    }

//    return false;
// }

// @Cleanup: needed?
// const canCraftPlannedBuilding = (hotbarInventory: Inventory, tribe: Tribe, workingPlan: NewBuildingPlan): boolean => {
//    // @Incomplete: also account for backpack

//    const hotbarInventorySlots = hotbarInventory.itemSlots;

//    // @Speed
//    const hotbarAvailableResources: Partial<Record<ItemType, number>> = {};
//    for (const item of Object.values(hotbarInventorySlots)) {
//       if (!hotbarAvailableResources.hasOwnProperty(item.type)) {
//          hotbarAvailableResources[item.type] = item.count;
//       } else {
//          hotbarAvailableResources[item.type]! += item.count;
//       }
//    }
   
//    // @Speed
//    for (const [ingredientType, ingredientCount] of Object.entries(workingPlan.buildingRecipe.ingredients).map(entry => [Number(entry[0]), entry[1]]) as ReadonlyArray<[ItemType, number]>) {
//       let availableCount = 0;

//       if (tribe.availableResources.hasOwnProperty(ingredientType)) {
//          availableCount += tribe.availableResources[ingredientType]!;
//       }
//       if (hotbarAvailableResources.hasOwnProperty(ingredientType)) {
//          availableCount += hotbarAvailableResources[ingredientType]!;
//       }

//       if (availableCount < ingredientCount) {
//          return false;
//       }
//    }

//    return true;
// }

// @Temporary?
// const hasMatchingPersonalPlan = (tribesmanComponent: TribesmanComponent, planType: BuildingPlanType): boolean => {
//    const personalPlan = tribesmanComponent.personalBuildingPlan;
   
//    if (personalPlan === null || personalPlan.type !== planType) {
//       return false;
//    }

//    return true;
// }

const planIsAvailable = (tribesman: Entity, plan: BuildingPlan): boolean => {
   if (plan.assignedTribesmanID !== 0) {
      return plan.assignedTribesmanID === tribesman.id;
   }

   return true;
}

// @Cleanup: copy and paste from building-plans
interface BuildingPosition {
   readonly x: number;
   readonly y: number;
   readonly rotation: number;
}

// @Cleanup: large amount of copy and paste from building-plans
const generateRandomNearbyPosition = (tribesman: Entity, entityType: StructureType): BuildingPosition => {
   let attempts = 0;
   main:
   while (attempts++ < 999) {
      const offsetMagnitude = 200 * Math.random();
      const offsetDirection = 2 * Math.PI;
      const position = tribesman.position.offset(offsetMagnitude, offsetDirection);
      
      const rotation = 2 * Math.PI * Math.random();

      const hitboxes = createBuildingHitboxes(entityType, position, 1, rotation);

      // @Incomplete: Make sure hitboxes aren't colliding with an entity

      // Make sure the hitboxes don't go outside the world
      for (let i = 0; i < hitboxes.length; i++) {
         const hitbox = hitboxes[i];

         const minX = hitbox.calculateHitboxBoundsMinX();
         const maxX = hitbox.calculateHitboxBoundsMaxX();
         const minY = hitbox.calculateHitboxBoundsMinY();
         const maxY = hitbox.calculateHitboxBoundsMaxY();
         if (minX < 0 || maxX >= Settings.BOARD_UNITS || minY < 0 || maxY >= Settings.BOARD_UNITS) {
            continue main;
         }
      }
      
      return {
         x: position.x,
         y: position.y,
         rotation: rotation
      };
   }

   return {
      x: tribesman.position.x,
      y: tribesman.position.y,
      rotation: 2 * Math.PI * Math.random()
   };
}

const goalsIncludeCraftingItem = (goals: ReadonlyArray<TribesmanGoal>, itemType: ItemType): boolean => {
   for (let i = 0; i < goals.length; i++) {
      const goal = goals[i];
      if (goal.type !== TribesmanGoalType.craftRecipe) {
         continue;
      }

      if (goal.recipe.product === itemType) {
         return true;
      }
   }

   return false;
}

const createItemGatherGoal = (goals: Array<TribesmanGoal>, tribesman: Entity, hotbarInventory: Inventory, itemTypesToGather: ReadonlyArray<ItemType>): void => {
   for (let i = 0; i < itemTypesToGather.length; i++) {
      const itemType = itemTypesToGather[i];

      // Make tools to complete the gather task faster
      const toolTypeToGather = TOOL_TYPE_FOR_MATERIAL_RECORD[itemType];
      if (toolTypeToGather !== null) {
         // @Cleanup: can be simplified
         switch (toolTypeToGather) {
            case "axe": {
               if (!goalsIncludeCraftingItem(goals, ItemType.wooden_axe) && !inventoryHasItemType(hotbarInventory, ItemType.wooden_axe)) {
                  createCraftGoal(goals, tribesman, ItemType.wooden_axe);
                  return;
               }
               break;
            }
            case "sword": {
               if (!goalsIncludeCraftingItem(goals, ItemType.wooden_sword) && !inventoryHasItemType(hotbarInventory, ItemType.wooden_sword)) {
                  createCraftGoal(goals, tribesman, ItemType.wooden_sword);
                  return;
               }
               break;
            }
            case "pickaxe": {
               if (!goalsIncludeCraftingItem(goals, ItemType.wooden_pickaxe) && !inventoryHasItemType(hotbarInventory, ItemType.wooden_pickaxe)) {
                  createCraftGoal(goals, tribesman, ItemType.wooden_pickaxe);
                  return;
               }
               break;
            }
         }
      }
   }
   
   goals.unshift({
      type: TribesmanGoalType.gatherItems,
      itemTypesToGather: itemTypesToGather,
      isPersonalPlan: false
   });
}

const createGoalForRecipe = (goals: Array<TribesmanGoal>, tribesman: Entity, tribe: Tribe, recipe: CraftingRecipe, hasNecessaryIngredients: boolean): void => {
   goals.unshift({
      type: TribesmanGoalType.craftRecipe,
      recipe: recipe,
      plan: null,
      isPersonalPlan: false
   });

   // If there is no crafting station which can craft the recipe, place that workbench type.
   if (typeof recipe.craftingStation !== "undefined" && !craftingStationExists(tribe, recipe.craftingStation)) {
      // @Cleanup: Copy and paste
      const inventoryComponent = InventoryComponentArray.getComponent(tribesman.id);
      const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);
      
      const craftingStationItemType = CRAFTING_STATION_ITEM_TYPE_RECORD[recipe.craftingStation]!;
      createBuildingPlaceGoal(goals, tribesman, hotbarInventory, craftingStationItemType);
      return;
   }
   
   // Items are still being gathered for the recipe
   if (!hasNecessaryIngredients) {
      // @Cleanup: Copy and paste
      const inventoryComponent = InventoryComponentArray.getComponent(tribesman.id);
      const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);
      
      const requiredItems = Object.keys(recipe.ingredients).map(ingredientTypeString => Number(ingredientTypeString));
      createItemGatherGoal(goals, tribesman, hotbarInventory, requiredItems);
      return;
   }
}

const createCraftGoal = (goals: Array<TribesmanGoal>, tribesman: Entity, itemType: ItemType): void => {
   // Start with the lowest-level not bottom intermediate products and work up to the final product

   const inventoryComponent = InventoryComponentArray.getComponent(tribesman.id);
   const tribeComponent = TribeComponentArray.getComponent(tribesman.id);

   const tally: ItemTally = {};
   tallyInventoryComponentItems(tally, inventoryComponent);
   const productChain = getRecipeProductChain(itemType, tally);
   
   // Try to craft any products in the chain
   for (let i = 0; i < productChain.length; i++) {
      const currentProductInfo = productChain[i];

      // Don't add items which we already have enough of.

      // If the item can be crafted, go craft it
      const recipe = forceGetItemRecipe(currentProductInfo.type);
      if (inventoryComponentCanAffordRecipe(inventoryComponent, recipe, InventoryName.hotbar)) {
         createGoalForRecipe(goals, tribesman, tribeComponent.tribe, recipe, true);
         return;
      } else {
         createGoalForRecipe(goals, tribesman, tribeComponent.tribe, recipe, false);
      }
   }
}

const getNextTechRequiredForItem = (tribesman: Entity, itemType: ItemType): TechInfo | null => {
   const tribeComponent = TribeComponentArray.getComponent(tribesman.id);
   const tribe = tribeComponent.tribe;

   const techsRequired = getTechChain(itemType);
   for (let i = 0; i < techsRequired.length; i++) {
      const tech = techsRequired[i];
      if (!tribe.hasUnlockedTech(tech.id)) {
         return tech;
      }
   }

   return null;
}

const tribeHasResearchBench = (tribe: Tribe): boolean => {
   for (let i = 0; i < tribe.buildings.length; i++) {
      const building = tribe.buildings[i];
      if (building.type === EntityType.researchBench) {
         return true;
      }
   }
   return false;
}

const createTechResearchGoal = (goals: Array<TribesmanGoal>, tribesman: Entity, tribe: Tribe, tech: TechInfo): void => {
   goals.unshift({
      type: TribesmanGoalType.researchTech,
      isPersonalPlan: false,
      tech: tech
   });

   // If there is no bench to research at, go place one
   if (tech.researchStudyRequirements > 0 && !tribeHasResearchBench(tribe)) {
      // @Cleanup: Copy and paste
      const inventoryComponent = InventoryComponentArray.getComponent(tribesman.id);
      const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

      createBuildingPlaceGoal(goals, tribesman, hotbarInventory, ItemType.research_bench);
      return;
   }

   const itemTypesRequiredToResearch = tribe.getItemsRequiredForTech(tech);
   if (itemTypesRequiredToResearch.length > 0) {
      // @Cleanup: Copy and paste
      const inventoryComponent = InventoryComponentArray.getComponent(tribesman.id);
      const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

      createItemGatherGoal(goals, tribesman, hotbarInventory, itemTypesRequiredToResearch);
   }
}

const createBuildingPlaceGoal = (goals: Array<TribesmanGoal>, tribesman: Entity, hotbarInventory: Inventory, placeableItemType: PlaceableItemType): void => {
   const buildingRecipe = forceGetItemRecipe(placeableItemType);
   
   // @Incomplete: account for barrel resources
   // If the tribesman doesn't have the item then they should go craft it
   if (!inventoryHasItemType(hotbarInventory, placeableItemType)) {
      // If the tribesman is missing research to craft it, research the missing tech
      const missingTech = getNextTechRequiredForItem(tribesman, placeableItemType);
      if (missingTech !== null) {
         const tribeComponent = TribeComponentArray.getComponent(tribesman.id);
         createTechResearchGoal(goals, tribesman, tribeComponent.tribe, missingTech);
         return;
      }
      
      createCraftGoal(goals, tribesman, placeableItemType);
      return;
   }
      
   const tribesmanComponent = TribesmanComponentArray.getComponent(tribesman.id);

   let plan: NewBuildingPlan;

   const personalPlan = tribesmanComponent.personalBuildingPlan;
   // @Bug: might break if tries to place two of the same building type one after the other
   if (personalPlan !== null && personalPlan.type === BuildingPlanType.newBuilding && personalPlan.buildingRecipe.product === placeableItemType) {
      plan = tribesmanComponent.personalBuildingPlan as NewBuildingPlan;
   } else {
      const tribeComponent = TribeComponentArray.getComponent(tribesman.id);
      const entityType = (ITEM_INFO_RECORD[placeableItemType] as PlaceableItemInfo).entityType;

      let position: Point;
      let rotation: number;
      if (tribeComponent.tribe.buildings.length > 0) {
         const positionInfo = generateBuildingPosition(tribeComponent.tribe, entityType);
         position = new Point(positionInfo.x, positionInfo.y);
         rotation = positionInfo.rotation;
      } else {
         const positionInfo = generateRandomNearbyPosition(tribesman, entityType);
         position = new Point(positionInfo.x, positionInfo.y);
         rotation = positionInfo.rotation;
      }

      plan = {
         type: BuildingPlanType.newBuilding,
         position: position,
         rotation: rotation,
         buildingRecipe: buildingRecipe,
         assignedTribesmanID: 0,
         potentialPlans: []
      };
   }

   const itemSlot = getItemTypeSlot(hotbarInventory, placeableItemType);
   if (itemSlot === null) {
      throw new Error("Item type not in inventory")
   }

   const goal: TribesmanPlaceGoal = {
      type: TribesmanGoalType.placeBuilding,
      placeableItemSlot: itemSlot,
      plan: plan,
      isPersonalPlan: true
   };
   goals.unshift(goal);
}

/** Gets a tribesman's goals in order of which should be done first */
export function getTribesmanGoals(tribesman: Entity, hotbarInventory: Inventory): ReadonlyArray<TribesmanGoal> {
   const tribeComponent = TribeComponentArray.getComponent(tribesman.id);
   const tribe = tribeComponent.tribe;

   const goals = new Array<TribesmanGoal>();
   
   // If the tribe doesn't have a totem, place one
   if (!tribe.hasTotem()) {
      createBuildingPlaceGoal(goals, tribesman, hotbarInventory, ItemType.tribe_totem);
      return goals;
   }

   // Place a hut so the tribesman can respawn
   if (tribe.getNumHuts() === 0) {
      createBuildingPlaceGoal(goals, tribesman, hotbarInventory, ItemType.worker_hut);
      return goals;
   }

   // @Incomplete: place huts for other tribesman
   
   // @Incomplete: do just as a result of stuff
   // // Craft hammer
   // if (shouldCraftHammer(hotbarInventory, tribe) && craftingStationExists(tribe, CraftingStation.workbench)) {
   //    return {
   //       type: TribesmanGoalType.craftRecipe,
   //       recipe: forceGetItemRecipe(ItemType.wooden_hammer),
   //       canPerformImmediately: true,
   //       assignedPlanIdx: -1
   //    };
   // }

   // See if any available plans can be worked on
   for (let i = 0; i < tribe.buildingPlans.length; i++) {
      const plan = tribe.buildingPlans[i];
      if (!planIsAvailable(tribesman, plan)) {
         continue;
      }

      switch (plan.type) {
         case BuildingPlanType.newBuilding: {
            // If they have the desired item, go place it
            if (inventoryHasItemType(hotbarInventory, plan.buildingRecipe.product)) {
               const itemSlot = getItemTypeSlot(hotbarInventory, plan.buildingRecipe.product);
               if (itemSlot === null) {
                  throw new Error("Item type not in inventory")
               }

               return [{
                  type: TribesmanGoalType.placeBuilding,
                  placeableItemSlot: itemSlot,
                  plan: plan,
                  isPersonalPlan: false
               }];
            }
   
            // Try to craft the item
            createCraftGoal(goals, tribesman, plan.buildingRecipe.product);
            return goals;
         }
         case BuildingPlanType.upgrade: {
            if (getBestHammerItemSlot(hotbarInventory) !== 0) {
               return [{
                  type: TribesmanGoalType.upgradeBuilding,
                  plan: plan,
                  isPersonalPlan: false
               }];
            } else {
               // Craft a hammer
               createCraftGoal(goals, tribesman, ItemType.wooden_hammer);
               return goals;
            }
         }
      }
   }

   return [];
}
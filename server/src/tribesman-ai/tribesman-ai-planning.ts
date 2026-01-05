import { BlueprintType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { CraftingRecipe, getItemRecipe } from "../../../shared/src/items/crafting-recipes";
import { InventoryName, ITEM_INFO_RECORD, ItemType, NUM_ITEM_TYPES, PlaceableItemInfo, ToolType } from "../../../shared/src/items/items";
import { StructureType } from "../../../shared/src/structures";
import { getTechRequiredForItem, Tech } from "../../../shared/src/techs";
import { AIPlanType, Point } from "../../../shared/src/utils";
import { AIAssignmentComponentArray, clearAssignment } from "../components/AIAssignmentComponent";
import { getInventory, InventoryComponentArray, inventoryHasItemType } from "../components/InventoryComponent";
import { TribeComponentArray } from "../components/TribeComponent";
import { entityHasWeapon } from "../entities/tribes/tribesman-ai/tribesman-combat-ai";
import { getLightIntensityAtPos } from "../lights";
import Tribe from "../Tribe";
import { getEntityType } from "../world";
import { updateBuildingLayer } from "./ai-building";
import { areaHasOutsideDoor, getOutsideDoorPlacePlan } from "./ai-building-areas";
import { tribeIsVulnerable } from "./ai-building-heuristics";
import { findIdealWallPlacePosition, WallPlaceCandidate } from "./ai-building-plans";
import { generateBuildingCandidate } from "./building-plans/ai-building-utils";
import { generateLightPosition, structureLightLevelIsValid } from "./building-plans/ai-buildling-lights";
import { createVirtualStructure, VirtualStructure, VirtualUnidentifiedBuilding } from "./building-plans/TribeBuildingLayer";

/*
This file contains the logic for planning what AI tribes should do.
*/

interface AIBasePlan {
   readonly type: AIPlanType;
   /** Whether or not the plan has been completed by the assigned entity. */
   // Stored on the plan so that when an entity completes the assignment in their personal plan, its completion is also reflected in the main tree
   isComplete: boolean;
   // @Cleanup: very awkward to have to set this everywhere.
   /** Whether the plan can actually be completable or not. This is expected to be true in all normal circumstances, and is only false if e.g. the AI can't find a valid building position to place a building at */
   readonly isCompletable: boolean;
}

export interface AIRootPlan extends AIBasePlan {
   readonly type: AIPlanType.root;
}

export interface AICraftRecipePlan extends AIBasePlan {
   readonly type: AIPlanType.craftRecipe;
   readonly recipe: CraftingRecipe;
   /** Amount of the product required for the plan to be fulfilled */
   readonly productAmount: number;
}

export interface AIPlaceBuildingPlan extends AIBasePlan {
   readonly type: AIPlanType.placeBuilding;
   readonly virtualBuilding: VirtualStructure;
   /** If this plan is for a safety-related building, this contains the safety data for all the candidates considered. */
   potentialPlans: ReadonlyArray<WallPlaceCandidate>;
}

export interface AIUpgradeBuildingPlan extends AIBasePlan {
   readonly type: AIPlanType.upgradeBuilding;
   readonly baseBuildingID: number;
   readonly rotation: number;
   // @Cleanup: can't one be deduced from the other?
   readonly blueprintType: BlueprintType;
   readonly entityType: StructureType;
}

/** Directs the entity to study a tech. */
export interface AITechStudyPlan extends AIBasePlan {
   readonly type: AIPlanType.doTechStudy;
   readonly tech: Tech;
}

/** Directs the entity to contribute gathered items to a tech. */
export interface AITechItemPlan extends AIBasePlan {
   readonly type: AIPlanType.doTechItems;
   readonly tech: Tech;
   readonly itemType: ItemType;
}

/** Directs the entity to complete the tech. */
export interface AITechCompletePlan extends AIBasePlan {
   readonly type: AIPlanType.completeTech;
   readonly tech: Tech;
}

export interface AIGatherItemPlan extends AIBasePlan {
   readonly type: AIPlanType.gatherItem;
   readonly itemType: ItemType;
   /** Amount of the item type to gather */
   readonly amount: number;
}

/** Represents an individual unit of work that an entity can do in order to advance their tribe. */
export type AIPlan = AIRootPlan | AICraftRecipePlan | AIPlaceBuildingPlan | AIUpgradeBuildingPlan | AITechStudyPlan | AITechItemPlan | AITechCompletePlan | AIGatherItemPlan;

export interface AIPlanAssignment<T extends AIPlan = AIPlan> {
   readonly plan: T;
   readonly children: Array<AIPlanAssignment>;
   // Stored on the assigned entity so that, when the assignment is assigned to an entity, their own personal assignment
   // of the plan doesn't have them always assigned to the root of the personal assignment.
   assignedEntity: Entity | null;
}

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
   [ItemType.frostSword]: null,
   [ItemType.frostPickaxe]: null,
   [ItemType.frostAxe]: null,
   [ItemType.frostArmour]: null,
   [ItemType.campfire]: null,
   [ItemType.furnace]: null,
   [ItemType.wooden_bow]: null,
   [ItemType.meat_suit]: null,
   [ItemType.deepfrost_heart]: "sword",
   [ItemType.raw_fish]: "sword",
   [ItemType.cooked_fish]: null,
   [ItemType.fishlord_suit]: null,
   [ItemType.gathering_gloves]: null,
   [ItemType.leather_armour]: null,
   [ItemType.woodenSpear]: null,
   [ItemType.stoneSpear]: null,
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
   [ItemType.fertiliser]: null,
   [ItemType.frostshaper]: null,
   [ItemType.stonecarvingTable]: null,
   [ItemType.woodenShield]: null,
   [ItemType.slingshot]: null,
   [ItemType.woodenBracings]: null,
   [ItemType.fireTorch]: null,
   [ItemType.slurb]: null,
   [ItemType.slurbTorch]: null,
   [ItemType.rawYetiFlesh]: null,
   [ItemType.cookedYetiFlesh]: null,
   [ItemType.mithrilOre]: null,
   [ItemType.mithrilBar]: null,
   [ItemType.mithrilSword]: null,
   [ItemType.mithrilPickaxe]: null,
   [ItemType.mithrilAxe]: null,
   [ItemType.mithrilArmour]: null,
   [ItemType.scrappy]: null,
   [ItemType.cogwalker]: null,
   [ItemType.automatonAssembler]: null,
   [ItemType.mithrilAnvil]: null,
   [ItemType.animalStaff]: null,
   [ItemType.woodenArrow]: null,
   [ItemType.tamingAlmanac]: null,
   [ItemType.floorSign]: null,
   [ItemType.pricklyPear]: null,
   [ItemType.rawCrabMeat]: null,
   [ItemType.cookedCrabMeat]: null,
   [ItemType.chitin]: null,
   [ItemType.crabplateArmour]: null,
   [ItemType.dustfleaEgg]: null,
   [ItemType.snowberry]: "sword",
   [ItemType.rawSnobeMeat]: "sword",
   [ItemType.snobeStew]: null,
   [ItemType.snobeHide]: null,
   [ItemType.inguSerpentTooth]: "sword",
   [ItemType.iceWringer]: null,
   [ItemType.rawTukmokMeat]: "sword",
   [ItemType.cookedTukmokMeat]: null,
   [ItemType.tukmokFurHide]: "sword",
   [ItemType.winterskinArmour]: null,
   [ItemType.ivoryTusk]: "sword",
   [ItemType.ivorySpear]: null,
   [ItemType.sock]: null,
   [ItemType.mrpebbles]: null,
};

const createAssignment = <T extends AIPlan>(plan: T, children: Array<AIPlanAssignment>): AIPlanAssignment<T> => {
   return {
      plan: plan,
      children: children,
      assignedEntity: null
   };
}

const createNewAssignmentWithSamePlan = <T extends AIPlan>(assignment: AIPlanAssignment<T> , children: Array<AIPlanAssignment>): AIPlanAssignment<T> => {
   return {
      plan: assignment.plan,
      children: children,
      assignedEntity: null
   };
}

export function createRootPlanAssignment(children: Array<AIPlanAssignment>, isCompletable: boolean): AIPlanAssignment<AIRootPlan> {
   return createAssignment({
      type: AIPlanType.root,
      isComplete: false,
      isCompletable: isCompletable
   }, children);
}

export function createCraftRecipePlanAssignment(children: Array<AIPlanAssignment>, isCompletable: boolean, recipe: CraftingRecipe, productAmount: number): AIPlanAssignment<AICraftRecipePlan> {
   return createAssignment({
      type: AIPlanType.craftRecipe,
      isComplete: false,
      isCompletable: isCompletable,
      recipe: recipe,
      productAmount: productAmount
   }, children);
}

export function createPlaceBuildingPlanAssignment(children: Array<AIPlanAssignment>, isCompletable: boolean, virtualBuilding: VirtualStructure): AIPlanAssignment<AIPlaceBuildingPlan> {
   return createAssignment({
      type: AIPlanType.placeBuilding,
      isComplete: false,
      isCompletable: isCompletable,
      potentialPlans: [],
      virtualBuilding: virtualBuilding
   }, children);
}

export function createUpgradeBuildingPlanAssignment(children: Array<AIPlanAssignment>, isCompletable: boolean, baseBuildingID: number, rotation: number, blueprintType: BlueprintType, entityType: StructureType): AIPlanAssignment<AIUpgradeBuildingPlan> {
   return createAssignment({
      type: AIPlanType.upgradeBuilding,
      isComplete: false,
      isCompletable: isCompletable,
      baseBuildingID: baseBuildingID,
      rotation: rotation,
      blueprintType: blueprintType,
      entityType: entityType
   }, children);
}

export function createTechStudyPlanAssignment(children: Array<AIPlanAssignment>, isCompletable: boolean, tech: Tech): AIPlanAssignment<AITechStudyPlan> {
   return createAssignment({
      type: AIPlanType.doTechStudy,
      isComplete: false,
      isCompletable: isCompletable,
      tech: tech
   }, children);
}

export function createTechItemPlanAssignment(children: Array<AIPlanAssignment>, isCompletable: boolean, tech: Tech, itemType: ItemType): AIPlanAssignment<AITechItemPlan> {
   return createAssignment({
      type: AIPlanType.doTechItems,
      isComplete: false,
      isCompletable: isCompletable,
      tech: tech,
      itemType: itemType
   }, children);
}

export function createTechCompletePlanAssignment(children: Array<AIPlanAssignment>, isCompletable: boolean, tech: Tech): AIPlanAssignment<AITechCompletePlan> {
   return createAssignment({
      type: AIPlanType.completeTech,
      isComplete: false,
      isCompletable: isCompletable,
      tech: tech
   }, children);
}

export function createGatherItemPlanAssignment(children: Array<AIPlanAssignment>, isCompletable: boolean, itemType: ItemType, amount: number): AIPlanAssignment<AIGatherItemPlan> {
   return createAssignment({
      type: AIPlanType.gatherItem,
      isComplete: false,
      isCompletable: isCompletable,
      itemType: itemType,
      amount: amount
   }, children);
}

const craftingStationExists = (tribe: Tribe, entityType: StructureType): boolean => {
   return tribe.virtualStructuresByEntityType[entityType].length > 0;
}

const planToCraftItem = (tribe: Tribe, recipe: CraftingRecipe, productAmount: number): AIPlanAssignment<AICraftRecipePlan> => {
   const children = new Array<AIPlanAssignment>();

   // If a tech is required for the recipe, plan to research that tech first
   const requiredTech = getTechRequiredForItem(recipe.product);
   if (requiredTech !== null) {
      children.push(
         planToResearchTech(tribe, requiredTech)
      );
   }
   
   // If there is no crafting station which can craft the recipe, first place that crafting station.
   // @HACK: CAST!!!
   if (typeof recipe.craftingStation !== "undefined" && !craftingStationExists(tribe, recipe.craftingStation as any)) {
      children.push(
         // @HACK: CAST!!!
         planToPlaceStructure(tribe, recipe.craftingStation as any, null)
      );
   }

   // Plan to gather any necessary resources
   for (const entry of recipe.ingredients.getEntries()) {
      children.push(
         planToGetItem(tribe, entry.itemType, entry.count * productAmount)
      );
   }

   return createCraftRecipePlanAssignment(children, true, recipe, productAmount);
}

/** Creates a goal to obtain an item by any means necessary */
export function planToGetItem(tribe: Tribe, itemType: ItemType, amount: number): AIPlanAssignment<AICraftRecipePlan | AIGatherItemPlan> {
   const recipe = getItemRecipe(itemType);
   if (recipe !== null) {
      return planToCraftItem(tribe, recipe, amount);
   } else {
      return createGatherItemPlanAssignment([], true, itemType, amount);
   }
}

const tribeHasResearchBench = (tribe: Tribe): boolean => {
   return tribe.virtualStructuresByEntityType[EntityType.researchBench].length > 0;
}

const planToResearchTech = (tribe: Tribe, tech: Tech): AIPlanAssignment<AITechCompletePlan> => {
   const children = new Array<AIPlanAssignment>();

   // @Incomplete?
   // If the tech has any precursor techs which aren't researched, research them first

   // Add all required items to the tech
   for (const entry of tech.researchItemRequirements.getEntries()) {
      const requiredItemType = entry.itemType;
      const amountRequired = entry.count;

      // Skip items which have already been donated
      if (typeof tribe.techTreeUnlockProgress[tech.id] !== "undefined" && typeof tribe.techTreeUnlockProgress[tech.id]!.itemProgress[requiredItemType] !== "undefined" && tribe.techTreeUnlockProgress[tech.id]!.itemProgress[requiredItemType]! >= amountRequired) {
         continue;
      }

      children.push(
         planToGetItem(tribe, requiredItemType, amountRequired)
      );

      children.push(
         createTechItemPlanAssignment([], true, tech, requiredItemType)
      );
   }

   // If there is no bench to research at, go place one
   if (tech.researchStudyRequirements > 0 && !tribeHasResearchBench(tribe)) {
      children.push(
         planToPlaceStructure(tribe, EntityType.researchBench, null)
      );
   }

   if (tech.researchStudyRequirements > 0) {
      children.push(
         createTechStudyPlanAssignment([], true, tech)
      );
   }

   return createTechCompletePlanAssignment(children, true, tech);
}

const getStructureItemType = (entityType: EntityType): ItemType => {
   // @Speed
   for (let itemType: ItemType = 0; itemType < NUM_ITEM_TYPES; itemType++) {
      const itemInfo = ITEM_INFO_RECORD[itemType];
      if ((itemInfo as PlaceableItemInfo).entityType === entityType) {
         return itemType;
      }
   }
   throw new Error();
}

// @Cleanup: I feel like this should take in the entity type instead of the item type. That feels more natural
export function planToPlaceStructure(tribe: Tribe, entityType: StructureType, virtualStructure: VirtualStructure | null): AIPlanAssignment<AIPlaceBuildingPlan> {
   const children = new Array<AIPlanAssignment>();
   
   let placedVirtualStructure: VirtualStructure;
   if (virtualStructure === null) {
      // Find a random spot to put the structure
      // @Hack: home layer
      const buildingLayer = tribe.getBuildingLayer(tribe.homeLayer);
      // @Cleanup: shouldn't have to define both entity type and placeable item type
      const candidate = generateBuildingCandidate(buildingLayer, entityType);
      if (candidate === null) {
         const uselessVirtualStructure: VirtualUnidentifiedBuilding = {
            // @HACK the cast
            entityType: entityType as any,
            id: 0,
            layer: buildingLayer.layer,
            position: new Point(0, 0),
            rotation: 0,
            boxes: [],
            occupiedNodes: new Set(),
            restrictedBuildingAreas: []
         };
         return createPlaceBuildingPlanAssignment([], false, uselessVirtualStructure);
      }
      placedVirtualStructure = createVirtualStructure(buildingLayer, candidate.position, candidate.rotation, entityType);
   } else {
      placedVirtualStructure = virtualStructure;
   }
   
   // @Hack
   const numWorkbenches = tribe.virtualStructuresByEntityType[EntityType.workbench].length;
   
   // Place the virtual building (before the light so that the light can't take its spot)
   const buildingLayer = tribe.getBuildingLayer(placedVirtualStructure.layer);
   buildingLayer.addVirtualBuilding(placedVirtualStructure);
   updateBuildingLayer(buildingLayer);

   // If the area is too dark to be placed in, place a torch first
   const lightLevel = getLightIntensityAtPos(placedVirtualStructure.layer, placedVirtualStructure.position.x, placedVirtualStructure.position.y);
   // @Hack: item type check. should really check if the entity produces light.
   if (entityType !== EntityType.slurbTorch && numWorkbenches > 0 && !structureLightLevelIsValid(lightLevel)) {
      const virtualStructure = generateLightPosition(tribe, placedVirtualStructure.layer, placedVirtualStructure.position.x, placedVirtualStructure.position.y);
      children.push(
         planToPlaceStructure(tribe, EntityType.slurbTorch, virtualStructure)
      );
   }
   
   children.push(
      planToGetItem(tribe, getStructureItemType(entityType), 1)
   );

   return createPlaceBuildingPlanAssignment(children, true, placedVirtualStructure);
}

const getNumDesiredBarrels = (tribe: Tribe): number => {
   // Want a barrel every 20 buildings
   return Math.floor(tribe.virtualStructures.length / 20);
}

const planIsValid = (tribe: Tribe, plan: AIPlan): boolean => {
   switch (plan.type) {
      case AIPlanType.root: return true;
      case AIPlanType.craftRecipe: return true;
      case AIPlanType.placeBuilding: return true;
      case AIPlanType.upgradeBuilding: return true;
      case AIPlanType.doTechStudy: return true;
      case AIPlanType.doTechItems: return true;
      case AIPlanType.completeTech: {
         // Only valid if the tech isn't researched
         return !tribe.hasUnlockedTech(plan.tech);
      }
      case AIPlanType.gatherItem: return true;
   }
}

/** Ensures that the given assignments's child assignments are valid */
const trimAssignmentRecursively = (tribe: Tribe, assignment: AIPlanAssignment): void => {
   for (let i = 0; i < assignment.children.length; i++) {
      const childAssignment = assignment.children[i];

      if (planIsValid(tribe, childAssignment.plan)) {
         trimAssignmentRecursively(tribe, childAssignment);
      } else {
         assignment.children.splice(i, 1);
         i--;

         // If there are any entities assigned to the plan, clear their assignment
         if (childAssignment.assignedEntity !== null) {
            const aiAssignmentComponent = AIAssignmentComponentArray.getComponent(childAssignment.assignedEntity);
            if (aiAssignmentComponent.wholeAssignment === childAssignment) {
               clearAssignment(aiAssignmentComponent);
            }
         }
      }
   }
}
/** Incrementally updates a tribe's plans */
export function updateTribePlans(tribe: Tribe): void {
   // @Incomplete: place huts for other tribesman

   // Trim invalid plans
   trimAssignmentRecursively(tribe, tribe.rootAssignment);

   // If the tribe doesn't have a totem, place one
   if (tribe.virtualStructuresByEntityType[EntityType.tribeTotem].length === 0) {
      tribe.rootAssignment.children.push(
         planToPlaceStructure(tribe, EntityType.tribeTotem, null)
      );
   }

   // Plan to place a hut so the settler can respawn if it dies
   if (tribe.virtualStructuresByEntityType[EntityType.workerHut].length === 0) {
      tribe.rootAssignment.children.push(
         planToPlaceStructure(tribe, EntityType.workerHut, null)
      );
   }

   // Make sure all rooms which can have doors leading outside do have them
   for (const buildingLayer of tribe.buildingLayers) {
      for (const room of buildingLayer.rooms) {
         if (!areaHasOutsideDoor(room)) {
            const plan = getOutsideDoorPlacePlan(buildingLayer, room);
            if (plan !== null) {
               tribe.rootAssignment.children.push(plan);
            }
         }
      }
   }

   const numHuts = tribe.getNumEntitiesOfType(EntityType.workerHut) + tribe.getNumEntitiesOfType(EntityType.warriorHut);
   for (let i = 0; i < numHuts; i++) {
      const numDesiredBarrels = getNumDesiredBarrels(tribe);
      if (tribe.virtualStructuresByEntityType[EntityType.barrel].length < numDesiredBarrels) {
         tribe.rootAssignment.children.push(
            planToPlaceStructure(tribe, EntityType.barrel, null)
         );
         continue;
      }

      // Protect buildings if vulnerable
      if (tribeIsVulnerable(tribe)) {
         // @Incomplete: not just walls!
         // Find the place for a wall that would maximise the building's safety
         const wallPlaceResult = findIdealWallPlacePosition(tribe);
         if (wallPlaceResult !== null) {
            // @Hack: item type
            const assignment = planToPlaceStructure(tribe, EntityType.wall, wallPlaceResult.virtualBuilding);
            assignment.plan.potentialPlans = wallPlaceResult.potentialPlans;

            tribe.rootAssignment.children.push(assignment);
            continue;
         }
      }

      break;
   }
}

/** Returns the first available assignment in the assignment's plan tree */
export function getFirstAvailableAssignment(assignment: AIPlanAssignment): AIPlanAssignment | null {
   // If the plan is unable to be assigned to an entity, it can't be a leaf
   if (assignment.assignedEntity !== null || assignment.plan.isComplete) {
      return null;
   }

   for (const childAssignment of assignment.children) {
      const leafAssignment = getFirstAvailableAssignment(childAssignment);
      if (leafAssignment !== null) {
         return leafAssignment;
      }
   }
   
   return assignment;
}

export function checkForAvailableAssignment(tribe: Tribe): AIPlanAssignment | null {
   return getFirstAvailableAssignment(tribe.rootAssignment);
}

export function createPersonalAssignment(entity: Entity, assignment: AIPlanAssignment): AIPlanAssignment {
   const children = new Array<AIPlanAssignment>();

   // Scrappy's can't make tools
   if (getEntityType(entity) !== EntityType.scrappy) {
      const plan = assignment.plan;
      if (plan.type === AIPlanType.gatherItem) {
         // Make tools to complete the gather task faster
         const toolTypeToGather = TOOL_TYPE_FOR_MATERIAL_RECORD[plan.itemType];
         if (toolTypeToGather !== null) {
            const tribeComponent = TribeComponentArray.getComponent(entity);
            const inventoryComponent = InventoryComponentArray.getComponent(entity);
            const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);
            // @Cleanup: can be simplified
            switch (toolTypeToGather) {
               case "axe": {
                  if (!inventoryHasItemType(hotbarInventory, ItemType.wooden_axe)) {
                     children.push(
                        planToGetItem(tribeComponent.tribe, ItemType.wooden_axe, 1)
                     );
                  }
                  break;
               }
               case "sword": {
                  if (!entityHasWeapon(entity)) {
                     children.push(
                        planToGetItem(tribeComponent.tribe, ItemType.wooden_sword, 1)
                     );
                  }
                  break;
               }
               case "pickaxe": {
                  if (!inventoryHasItemType(hotbarInventory, ItemType.wooden_pickaxe)) {
                     children.push(
                        planToGetItem(tribeComponent.tribe, ItemType.wooden_sword, 1)
                     );
                  }
                  break;
               }
            }
         }
      }
   }
   
   return createNewAssignmentWithSamePlan(assignment, children);
}
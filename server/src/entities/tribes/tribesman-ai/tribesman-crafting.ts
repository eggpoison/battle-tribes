import { TribesmanAIType } from "battletribes-shared/components";
import { EntityID, EntityType, LimbAction } from "battletribes-shared/entities";
import { Settings, PathfindingSettings } from "battletribes-shared/settings";
import Tribe from "../../../Tribe";
import { stopEntity, turnEntityToEntity } from "../../../ai-shared";
import { recipeCraftingStationIsAvailable, InventoryComponentArray, craftRecipe } from "../../../components/InventoryComponent";
import { InventoryUseComponentArray, setLimbActions } from "../../../components/InventoryUseComponent";
import { PhysicsComponentArray } from "../../../components/PhysicsComponent";
import { TribesmanPathType, TribesmanAIComponentArray } from "../../../components/TribesmanAIComponent";
import { PathfindFailureDefault } from "../../../pathfinding";
import { getAvailableCraftingStations } from "../tribe-member";
import { TRIBESMAN_TURN_SPEED } from "./tribesman-ai";
import { pathfindToPosition, clearTribesmanPath } from "./tribesman-ai-utils";
import { CraftingStation, CraftingRecipe, CRAFTING_RECIPES } from "battletribes-shared/items/crafting-recipes";
import { InventoryName } from "battletribes-shared/items/items";
import { TransformComponentArray } from "../../../components/TransformComponent";
import { getEntityType, getGameTicks } from "../../../world";

const buildingMatchesCraftingStation = (building: EntityID, craftingStation: CraftingStation): boolean => {
   return getEntityType(building) === EntityType.workbench && craftingStation === CraftingStation.workbench;
}

// @Cleanup: move to different file
export function craftingStationExists(tribe: Tribe, craftingStation: CraftingStation): boolean {
   for (let i = 0; i < tribe.buildings.length; i++) {
      const building = tribe.buildings[i];
      if (buildingMatchesCraftingStation(building, craftingStation)) {
         return true;
      }
   }
   return false;
}

const getClosestCraftingStation = (tribesman: EntityID, tribe: Tribe, craftingStation: CraftingStation): EntityID => {
   // @Incomplete: slime

   const transformComponent = TransformComponentArray.getComponent(tribesman);
   
   // @Speed
   let closestStation: EntityID | undefined;
   let minDist = Number.MAX_SAFE_INTEGER;
   for (let i = 0; i < tribe.buildings.length; i++) {
      const building = tribe.buildings[i];

      if (buildingMatchesCraftingStation(building, craftingStation)) {
         const buildingTransformComponent = TransformComponentArray.getComponent(building);
         
         const dist = transformComponent.position.calculateDistanceBetween(buildingTransformComponent.position);
         if (dist < minDist) {
            minDist = dist;
            closestStation = building;
         }
      }
   }

   if (typeof closestStation !== "undefined") {
      return closestStation;
   }
   throw new Error();
}

export function goCraftItem(tribesman: EntityID, recipe: CraftingRecipe, tribe: Tribe): boolean {
   const availableCraftingStations = getAvailableCraftingStations(tribesman);
   if (!recipeCraftingStationIsAvailable(availableCraftingStations, recipe)) {
      // Move to the crafting station
      const craftingStation = getClosestCraftingStation(tribesman, tribe, recipe.craftingStation!);

      const craftingStationTransformComponent = TransformComponentArray.getComponent(craftingStation);
      
      const isPathfinding = pathfindToPosition(tribesman, craftingStationTransformComponent.position.x, craftingStationTransformComponent.position.y, craftingStation, TribesmanPathType.default, Math.floor(Settings.MAX_CRAFTING_STATION_USE_DISTANCE / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.throwError);
      if (isPathfinding) {
         const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);

         setLimbActions(inventoryUseComponent, LimbAction.none);
         tribesmanComponent.currentAIType = TribesmanAIType.crafting;
         return true;
      } else {
         return false;
      }
   } else {
      // Continue crafting the item

      const physicsComponent = PhysicsComponentArray.getComponent(tribesman);
      stopEntity(physicsComponent);
      
      if (typeof recipe.craftingStation !== "undefined") {
         const craftingStation = getClosestCraftingStation(tribesman, tribe, recipe.craftingStation);
         turnEntityToEntity(tribesman, craftingStation, TRIBESMAN_TURN_SPEED);
      }

      const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
      const recipeIdx = CRAFTING_RECIPES.indexOf(recipe);
      
      tribesmanComponent.currentAIType = TribesmanAIType.crafting;
      if (tribesmanComponent.currentCraftingRecipeIdx !== recipeIdx) {
         tribesmanComponent.currentCraftingRecipeIdx = recipeIdx;
         tribesmanComponent.currentCraftingTicks = 1;
      } else {
         tribesmanComponent.currentCraftingTicks++;
      }
      
      const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
      for (let i = 0; i < inventoryUseComponent.limbInfos.length; i++) {
         const limbInfo = inventoryUseComponent.limbInfos[i];
         if (limbInfo.action !== LimbAction.craft) {
            limbInfo.lastCraftTicks = getGameTicks();
         }
         limbInfo.action = LimbAction.craft;
      }
      
      if (tribesmanComponent.currentCraftingTicks >= recipe.aiCraftTimeTicks) {
         // Craft the item
         const inventoryComponent = InventoryComponentArray.getComponent(tribesman);
         craftRecipe(inventoryComponent, recipe, InventoryName.hotbar);

         tribesmanComponent.currentCraftingTicks = 0;
      }

      clearTribesmanPath(tribesman);
      return true;
   }
}
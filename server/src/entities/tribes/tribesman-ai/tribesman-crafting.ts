import { TribesmanAIType } from "webgl-test-shared/dist/components";
import { CraftingStation, CraftingRecipe, CRAFTING_RECIPES } from "webgl-test-shared/dist/crafting-recipes";
import { EntityType, LimbAction } from "webgl-test-shared/dist/entities";
import { InventoryName } from "webgl-test-shared/dist/items";
import { Settings, PathfindingSettings } from "webgl-test-shared/dist/settings";
import Board from "../../../Board";
import Entity from "../../../Entity";
import Tribe from "../../../Tribe";
import { stopEntity } from "../../../ai-shared";
import { recipeCraftingStationIsAvailable, InventoryComponentArray, craftRecipe } from "../../../components/InventoryComponent";
import { InventoryUseComponentArray, setLimbActions } from "../../../components/InventoryUseComponent";
import { PhysicsComponentArray } from "../../../components/PhysicsComponent";
import { TribesmanPathType, TribesmanAIComponentArray } from "../../../components/TribesmanAIComponent";
import { PathfindFailureDefault } from "../../../pathfinding";
import { getAvailableCraftingStations } from "../tribe-member";
import { TRIBESMAN_TURN_SPEED } from "./tribesman-ai";
import { pathfindToPosition, clearTribesmanPath } from "./tribesman-ai-utils";

const buildingMatchesCraftingStation = (building: Entity, craftingStation: CraftingStation): boolean => {
   return building.type === EntityType.workbench && craftingStation === CraftingStation.workbench;
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

const getClosestCraftingStation = (tribesman: Entity, tribe: Tribe, craftingStation: CraftingStation): Entity => {
   // @Incomplete: slime
   
   // @Speed
   let closestStation: Entity | undefined;
   let minDist = Number.MAX_SAFE_INTEGER;
   for (let i = 0; i < tribe.buildings.length; i++) {
      const building = tribe.buildings[i];

      if (buildingMatchesCraftingStation(building, craftingStation)) {
         const dist = tribesman.position.calculateDistanceBetween(building.position);
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

export function goCraftItem(tribesman: Entity, recipe: CraftingRecipe, tribe: Tribe): boolean {
   const availableCraftingStations = getAvailableCraftingStations(tribesman);
   if (!recipeCraftingStationIsAvailable(availableCraftingStations, recipe)) {
      // Move to the crafting station
      const craftingStation = getClosestCraftingStation(tribesman, tribe, recipe.craftingStation!);

      const isPathfinding = pathfindToPosition(tribesman, craftingStation.position.x, craftingStation.position.y, craftingStation.id, TribesmanPathType.default, Math.floor(Settings.MAX_CRAFTING_STATION_USE_DISTANCE / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.throwError);
      if (isPathfinding) {
         const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman.id);
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman.id);

         setLimbActions(inventoryUseComponent, LimbAction.none);
         tribesmanComponent.currentAIType = TribesmanAIType.crafting;
         return true;
      } else {
         return false;
      }
   } else {
      // Continue crafting the item

      const physicsComponent = PhysicsComponentArray.getComponent(tribesman.id);
      stopEntity(physicsComponent);
      
      if (typeof recipe.craftingStation !== "undefined") {
         const craftingStation = getClosestCraftingStation(tribesman, tribe, recipe.craftingStation);
         const targetDirection = tribesman.position.calculateAngleBetween(craftingStation.position);

         physicsComponent.targetRotation = targetDirection;
         physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;
      }

      const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman.id);
      const recipeIdx = CRAFTING_RECIPES.indexOf(recipe);
      
      tribesmanComponent.currentAIType = TribesmanAIType.crafting;
      if (tribesmanComponent.currentCraftingRecipeIdx !== recipeIdx) {
         tribesmanComponent.currentCraftingRecipeIdx = recipeIdx;
         tribesmanComponent.currentCraftingTicks = 1;
      } else {
         tribesmanComponent.currentCraftingTicks++;
      }
      
      const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman.id);
      for (let i = 0; i < inventoryUseComponent.inventoryUseInfos.length; i++) {
         const limbInfo = inventoryUseComponent.inventoryUseInfos[i];
         if (limbInfo.action !== LimbAction.craft) {
            limbInfo.lastCraftTicks = Board.ticks;
         }
         limbInfo.action = LimbAction.craft;
      }
      
      if (tribesmanComponent.currentCraftingTicks >= recipe.aiCraftTimeTicks) {
         // Craft the item
         const inventoryComponent = InventoryComponentArray.getComponent(tribesman.id);
         craftRecipe(inventoryComponent, recipe, InventoryName.hotbar);

         tribesmanComponent.currentCraftingTicks = 0;
      }

      clearTribesmanPath(tribesman);
      return true;
   }
}
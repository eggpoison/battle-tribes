import { TribesmanAIType, Entity, EntityType, LimbAction, Settings, PathfindingSettings, CRAFTING_RECIPES, InventoryName, distance } from "battletribes-shared";
import Tribe from "../../../Tribe.js";
import { turnEntityToEntity } from "../../../ai-shared.js";
import { InventoryComponentArray, craftRecipe, InventoryComponent, countItemType } from "../../../components/InventoryComponent.js";
import { InventoryUseComponentArray, setLimbActions } from "../../../components/InventoryUseComponent.js";
import { TribesmanPathType, TribesmanAIComponentArray } from "../../../components/TribesmanAIComponent.js";
import { PathfindFailureDefault } from "../../../pathfinding.js";
import { TRIBESMAN_TURN_SPEED } from "./tribesman-ai.js";
import { TransformComponentArray } from "../../../components/TransformComponent.js";
import { getEntityLayer, getEntityType, getGameTicks } from "../../../world.js";
import { AICraftRecipePlan, planToPlaceStructure } from "../../../tribesman-ai/tribesman-ai-planning.js";
import { addAssignmentPart, AIAssignmentComponentArray } from "../../../components/AIAssignmentComponent.js";
import { TribeComponentArray } from "../../../components/TribeComponent.js";
import { clearPathfinding, pathfindTribesman } from "../../../components/AIPathfindingComponent.js";

const getClosestCraftingStation = (tribesman: Entity, tribe: Tribe, craftingStation: EntityType): Entity | null => {
   // @Incomplete: Shouldn't just look for this tribe's crafting stations, if possible should check for visible non-tribe crafting stations.

   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.hitboxes[0];
   
   const craftingStations = tribe.getEntitiesByType(craftingStation);
   
   // @Speed
   let closestStation: Entity | undefined;
   let minDist = Number.MAX_SAFE_INTEGER;
   for (const entity of craftingStations) {
      const buildingTransformComponent = TransformComponentArray.getComponent(entity);
      const buildingHitbox = buildingTransformComponent.hitboxes[0];
      
      const dist = distance(tribesmanHitbox.box.posX, tribesmanHitbox.box.posY, buildingHitbox.box.posX, buildingHitbox.box.posY);
      if (dist < minDist) {
         minDist = dist;
         closestStation = entity;
      }
   }

   if (typeof closestStation !== "undefined") {
      return closestStation;
   }
   return null;
}

const getAvailableCraftingStations = (tribeMember: Entity): ReadonlyArray<EntityType> => {
   const transformComponent = TransformComponentArray.getComponent(tribeMember);
   const tribeMemberHitbox = transformComponent.hitboxes[0];
   
   const layer = getEntityLayer(tribeMember);
   
   const minChunkX = Math.max(Math.floor((tribeMemberHitbox.box.posX - Settings.MAX_CRAFTING_STATION_USE_DISTANCE) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((tribeMemberHitbox.box.posX + Settings.MAX_CRAFTING_STATION_USE_DISTANCE) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);
   const minChunkY = Math.max(Math.floor((tribeMemberHitbox.box.posY - Settings.MAX_CRAFTING_STATION_USE_DISTANCE) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((tribeMemberHitbox.box.posY + Settings.MAX_CRAFTING_STATION_USE_DISTANCE) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);

   const availableCraftingStations: Array<EntityType> = [];

   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            const entityTransformComponent = TransformComponentArray.getComponent(entity);
            const entityHitbox = entityTransformComponent.hitboxes[0];
            
            const dist = distance(tribeMemberHitbox.box.posX, tribeMemberHitbox.box.posY, entityHitbox.box.posX, entityHitbox.box.posY);
            if (dist > Settings.MAX_CRAFTING_STATION_USE_DISTANCE) {
               continue;
            }

            const entityType = getEntityType(entity);
            if (!availableCraftingStations.includes(entityType)) {
               availableCraftingStations.push(entityType);
            }
         }
      }
   }

   return availableCraftingStations;
}

export function goCraftItem(tribesman: Entity, plan: AICraftRecipePlan, tribe: Tribe): void {
   const recipe = plan.recipe;

   // If the recipe needs a crafting station but there are none, create a plan to place one

   
   // Move to a crafting station if necessary
   const availableCraftingStations = getAvailableCraftingStations(tribesman);
   if (typeof recipe.craftingStation !== "undefined") {
      const craftingStation = getClosestCraftingStation(tribesman, tribe, recipe.craftingStation);

      // If there are no crafting stations available, create a plan to do that
      if (craftingStation === null) {
         const tribeComponent = TribeComponentArray.getComponent(tribesman);
         // @HACK: the cast
         const placeAssignment = planToPlaceStructure(tribeComponent.tribe, recipe.craftingStation as any, null);

         const aiAssignmentComponent = AIAssignmentComponentArray.getComponent(tribesman);
         addAssignmentPart(aiAssignmentComponent, placeAssignment);
         
         // @Bug: The tribesman will do nothing for 1 tick
         return;
      }

      if (!availableCraftingStations.includes(recipe.craftingStation)) {
         const craftingStationTransformComponent = TransformComponentArray.getComponent(craftingStation);
         const craftingStationHitbox = craftingStationTransformComponent.hitboxes[0];
         
         const isFinished = pathfindTribesman(tribesman, craftingStationHitbox.box.posX, craftingStationHitbox.box.posY, getEntityLayer(craftingStation), craftingStation, TribesmanPathType.default, Math.floor(Settings.MAX_CRAFTING_STATION_USE_DISTANCE / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.none);
         if (!isFinished) {
            const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
            const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
   
            setLimbActions(inventoryUseComponent, LimbAction.none);
            tribesmanComponent.currentAIType = TribesmanAIType.crafting;
         }
         return;
      } else {
         turnEntityToEntity(tribesman, craftingStation, TRIBESMAN_TURN_SPEED, 1);
      }
   }

   // Continue crafting the item

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
      craftRecipe(tribesman, inventoryComponent, recipe, InventoryName.hotbar);

      tribesmanComponent.currentCraftingTicks = 0;
   }

   clearPathfinding(tribesman);
}

export function craftGoalIsComplete(plan: AICraftRecipePlan, inventoryComponent: InventoryComponent): boolean {
   return countItemType(inventoryComponent, plan.recipe.product) >= plan.productAmount;
}
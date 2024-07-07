import { EntityID, EntityType, LimbAction } from "webgl-test-shared/dist/entities";
import { HealthComponent, HealthComponentArray } from "../../../components/HealthComponent";
import { VACUUM_RANGE, tribeMemberCanPickUpItem } from "../tribe-member";
import { InventoryComponentArray, getInventory, inventoryIsFull } from "../../../components/InventoryComponent";
import { PlanterBoxPlant, TribesmanAIType } from "webgl-test-shared/dist/components";
import { PlantComponentArray, plantIsFullyGrown } from "../../../components/PlantComponent";
import { TribeComponentArray } from "../../../components/TribeComponent";
import { tribesmanShouldEscape } from "./tribesman-escaping";
import { clearTribesmanPath, getTribesmanRadius, pathfindToPosition, positionIsSafeForTribesman } from "./tribesman-ai-utils";
import { ItemComponentArray } from "../../../components/ItemComponent";
import { PathfindingSettings } from "webgl-test-shared/dist/settings";
import { InventoryUseComponentArray, setLimbActions } from "../../../components/InventoryUseComponent";
import { TribesmanAIComponentArray, TribesmanPathType } from "../../../components/TribesmanAIComponent";
import { PathfindFailureDefault } from "../../../pathfinding";
import { ItemType, InventoryName } from "webgl-test-shared/dist/items/items";
import { AIHelperComponentArray } from "../../../components/AIHelperComponent";
import { huntEntity } from "./tribesman-combat-ai";
import Board from "../../../Board";
import { TransformComponentArray } from "../../../components/TransformComponent";

const getResourceProducts = (entity: EntityID): ReadonlyArray<ItemType> => {
   switch (Board.getEntityType(entity)) {
      case EntityType.cow: return [ItemType.leather, ItemType.raw_beef];
      case EntityType.berryBush: return [ItemType.berry];
      case EntityType.tree: return [ItemType.wood, ItemType.seed];
      case EntityType.iceSpikes: return [ItemType.frostcicle];
      case EntityType.cactus: return [ItemType.cactus_spine];
      case EntityType.boulder: return [ItemType.rock];
      case EntityType.krumblid: return [ItemType.leather];
      case EntityType.yeti: return [ItemType.yeti_hide, ItemType.raw_beef];
      case EntityType.plant: {
         const plantComponent = PlantComponentArray.getComponent(entity);
         switch (plantComponent.plantType) {
            case PlanterBoxPlant.tree: return [ItemType.wood, ItemType.seed];
            case PlanterBoxPlant.berryBush: return [ItemType.berry];
            case PlanterBoxPlant.iceSpikes: return [ItemType.frostcicle];
            default: {
               const unreachable: never = plantComponent.plantType;
               return unreachable;
            }
         }
      }
      case EntityType.slime: return [ItemType.slimeball];
      default: return [];
   }
}

export function entityIsResource(entity: EntityID): boolean {
   const resourceProducts = getResourceProducts(entity);
   return resourceProducts.length > 0;
}

const resourceIsPrioritised = (resourceProducts: ReadonlyArray<ItemType>, prioritisedItemTypes: ReadonlyArray<ItemType>): boolean => {
   // See if any of its resource products are prioritised
   for (let i = 0; i < resourceProducts.length; i++) {
      const resourceProduct = resourceProducts[i];
      if (prioritisedItemTypes.indexOf(resourceProduct) !== -1) {
         return true;
      }
   }

   return false;
}

const shouldGatherPlant = (plantID: number): boolean => {
   const plantComponent = PlantComponentArray.getComponent(plantID);

   switch (plantComponent.plantType) {
      // Harvest when fully grown
      case PlanterBoxPlant.tree:
      case PlanterBoxPlant.iceSpikes: {
         return plantIsFullyGrown(plantComponent);
      }
      // Harvest when they have fruit
      case PlanterBoxPlant.berryBush: {
         return plantComponent.numFruit > 0;
      }
   }
}

// @Incomplete: when the tribesman wants to gather a resource but there isn't enough space, should make space

const shouldGatherResource = (tribesman: EntityID, healthComponent: HealthComponent, inventoryIsFull: boolean, resource: EntityID, resourceProducts: ReadonlyArray<ItemType>): boolean => {
   if (resourceProducts.length === 0) {
      return false;
   }
   
   // If the tribesman is within the escape health threshold, make sure there wouldn't be any enemies visible while picking up the dropped item
   // @Hack: the accessibility check doesn't work for plants in planter boxes
   const resourceTransformComponent = TransformComponentArray.getComponent(resource);
   if (tribesmanShouldEscape(Board.getEntityType(tribesman)!, healthComponent) || !positionIsSafeForTribesman(tribesman, resourceTransformComponent.position.x, resourceTransformComponent.position.y)) {
   // if (tribesmanShouldEscape(tribesman.type, healthComponent) || !positionIsSafeForTribesman(tribesman, resource.position.x, resource.position.y) || !entityIsAccessible(tribesman, resource, tribeComponent.tribe, getTribesmanAttackRadius(tribesman))) {
      return false;
   }

   // Only try to gather plants if they are fully grown
   if (Board.getEntityType(resource) === EntityType.plant && !shouldGatherPlant(resource)) {
      return false;
   }

   // If the tribesman's inventory is full, make sure the tribesman would be able to pick up the products the resource would produce
   if (inventoryIsFull) {
      // If any of the resource products can't be picked up, don't try to gather.
      // This is so the tribesmen don't leave un-picked-up items laying around.
      for (const itemType of resourceProducts) {
         if (!tribeMemberCanPickUpItem(tribesman, itemType)) {
            return false;
         }
      }
   }

   return true;
}

export interface GatherTargetInfo {
   readonly target: EntityID | null;
   readonly isPrioritised: boolean;
}

export function getGatherTarget(tribesman: EntityID, visibleEntities: ReadonlyArray<EntityID>, prioritisedItemTypes: ReadonlyArray<ItemType>): GatherTargetInfo {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const healthComponent = HealthComponentArray.getComponent(tribesman);
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman);
   const tribeComponent = TribeComponentArray.getComponent(tribesman);
   
   // @Incomplete: Doesn't account for room in backpack/other
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);
   const isFull = inventoryIsFull(hotbarInventory);
   
   let minDist = Number.MAX_SAFE_INTEGER;
   let closestResource: EntityID | undefined;
   
   let minPrioritisedDist = Number.MAX_SAFE_INTEGER;
   let closestPrioritisedResource: EntityID | undefined;

   for (let i = 0; i < visibleEntities.length; i++) {
      const resource = visibleEntities[i];
      
      const resourceProducts = getResourceProducts(resource);
      if (!shouldGatherResource(tribesman, healthComponent, isFull, resource, resourceProducts)) {
         continue;
      }
      
      const resourceTransformComponent = TransformComponentArray.getComponent(resource);
      const dist = transformComponent.position.calculateDistanceBetween(resourceTransformComponent.position);
      if (tribeComponent.tribe.isAIControlled && resourceIsPrioritised(resourceProducts, prioritisedItemTypes)) {
         if (dist < minPrioritisedDist) {
            closestPrioritisedResource = resource;
            minPrioritisedDist = dist;
         }
      } else {
         // @Temporary?
         // if (!SHOULD_HARVEST_CONSERVATIVELY[resource.type] && dist < minDist) {
         if (dist < minDist) {
            closestResource = resource;
            minDist = dist;
         }
      }
   }
   
   // Prioritise gathering resources which can be used in the tribe's building plan
   if (typeof closestPrioritisedResource !== "undefined") {
      return {
         target: closestPrioritisedResource,
         isPrioritised: true
      };
   }
   
   return {
      target: typeof closestResource !== "undefined" ? closestResource : null,
      isPrioritised: false
   };
}

export function tribesmanGetItemPickupTarget(tribesman: EntityID, visibleItemEntities: ReadonlyArray<EntityID>, prioritisedItemTypes: ReadonlyArray<ItemType>, gatherTargetInfo: GatherTargetInfo): EntityID | null {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const healthComponent = HealthComponentArray.getComponent(tribesman);
   const shouldEscape = tribesmanShouldEscape(Board.getEntityType(tribesman)!, healthComponent);
   
   const goalRadius = getTribesmanRadius(tribesman);
      
   let closestDroppedItem: EntityID | null = null;
   let minDistance = Number.MAX_SAFE_INTEGER;
   for (const itemEntity of visibleItemEntities) {
      const itemEntityTransformComponent = TransformComponentArray.getComponent(itemEntity);
      // If the tribesman is within the escape health threshold, make sure there wouldn't be any enemies visible while picking up the dropped item
      if (shouldEscape && !positionIsSafeForTribesman(tribesman, itemEntityTransformComponent.position.x, itemEntityTransformComponent.position.y)) {
         continue;
      }

      // @Temporary @Bug @Incomplete: Will cause the tribesman to incorrectly skip items which are JUST inside a hitbox, but are still accessible via vacuum.
      // if (!entityIsAccessible(tribesman, itemEntity, tribeComponent.tribe, goalRadius)) {
      //    console.log("b");
      //    continue;
      // }

      const itemComponent = ItemComponentArray.getComponent(itemEntity);
      if (!tribeMemberCanPickUpItem(tribesman, itemComponent.itemType)) {
         continue;
      }
      
      // If gathering is prioritised, make sure the dropped item is useful for gathering
      if (gatherTargetInfo.isPrioritised) {
         if (prioritisedItemTypes.indexOf(itemComponent.itemType) === -1) {
            continue;
         }
      }

      const distance = transformComponent.position.calculateDistanceBetween(itemEntityTransformComponent.position);
      if (distance < minDistance) {
         closestDroppedItem = itemEntity;
         minDistance = distance;
      }
   }

   return closestDroppedItem;
}

export function tribesmanGoPickupItemEntity(tribesman: EntityID, pickupTarget: EntityID): void {
   const targetTransformComponent = TransformComponentArray.getComponent(pickupTarget);
   
   // @Temporary
   // pathfindToPosition(tribesman, closestDroppedItem.position.x, closestDroppedItem.position.y, closestDroppedItem.id, TribesmanPathType.default, Math.floor(32 / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.throwError);
   pathfindToPosition(tribesman, targetTransformComponent.position.x, targetTransformComponent.position.y, pickupTarget, TribesmanPathType.default, Math.floor((32 + VACUUM_RANGE) / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.returnClosest);

   clearTribesmanPath(tribesman);
   
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
   setLimbActions(inventoryUseComponent, LimbAction.none);
   
   const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(tribesman);
   tribesmanAIComponent.currentAIType = TribesmanAIType.pickingUpDroppedItems;
}

/** Gathers the specified item types. If the array is empty, gathers everything possible. */
export function gatherResources(tribesman: EntityID, gatheredItemTypes: ReadonlyArray<ItemType>, visibleItemEntities: ReadonlyArray<EntityID>): boolean {
   const aiHelperComponent = AIHelperComponentArray.getComponent(tribesman);
   
   const gatherTargetInfo = getGatherTarget(tribesman, aiHelperComponent.visibleEntities, gatheredItemTypes);
   
   // Pick up dropped items
   const pickupTarget = tribesmanGetItemPickupTarget(tribesman, visibleItemEntities, gatheredItemTypes, gatherTargetInfo);
   if (pickupTarget !== null) {
      tribesmanGoPickupItemEntity(tribesman, pickupTarget);
      return true;
   }

   // Gather resources
   if (gatherTargetInfo.target !== null) {
      huntEntity(tribesman, gatherTargetInfo.target, false);
      return true;
   }

   return false;
}
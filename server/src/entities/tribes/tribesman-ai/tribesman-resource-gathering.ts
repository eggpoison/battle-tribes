import { EntityType, LimbAction } from "webgl-test-shared/dist/entities";
import { InventoryName, ItemType } from "webgl-test-shared/dist/items";
import Entity from "../../../Entity";
import { HealthComponent, HealthComponentArray } from "../../../components/HealthComponent";
import { VACUUM_RANGE, tribeMemberCanPickUpItem } from "../tribe-member";
import { InventoryComponentArray, getInventory, inventoryIsFull } from "../../../components/InventoryComponent";
import { PlanterBoxPlant, TribesmanAIType } from "webgl-test-shared/dist/components";
import { PlantComponentArray, plantIsFullyGrown } from "../../../components/PlantComponent";
import { TribeComponentArray } from "../../../components/TribeComponent";
import { tribesmanShouldEscape } from "./tribesman-escaping";
import { getTribesmanRadius, pathfindToPosition, positionIsSafeForTribesman } from "./tribesman-ai-utils";
import { ItemComponentArray } from "../../../components/ItemComponent";
import { PathfindingSettings } from "webgl-test-shared/dist/settings";
import { InventoryUseComponentArray, setLimbActions } from "../../../components/InventoryUseComponent";
import { TribesmanAIComponentArray, TribesmanPathType } from "../../../components/TribesmanAIComponent";
import { PathfindFailureDefault } from "../../../pathfinding";

// Goal: find which items should be used to gather a resource

const RESOURCE_PRODUCT_TO_ENTITY_RECORD: Partial<Record<ItemType, ReadonlyArray<EntityType>>> = {
   [ItemType.leather]: [EntityType.cow, EntityType.krumblid],
   [ItemType.raw_beef]: [EntityType.cow, EntityType.yeti],
   [ItemType.berry]: [EntityType.berryBush],
   [ItemType.wood]: [EntityType.tree],
   [ItemType.seed]: [EntityType.tree],
   [ItemType.frostcicle]: [EntityType.iceSpikes],
   [ItemType.cactus_spine]: [EntityType.cactus],
   [ItemType.rock]: [EntityType.boulder],
   [ItemType.yeti_hide]: [EntityType.yeti]
};

const getResourceProducts = (entity: Entity): ReadonlyArray<ItemType> => {
   switch (entity.type) {
      case EntityType.cow: return [ItemType.leather, ItemType.raw_beef];
      case EntityType.berryBush: return [ItemType.berry];
      case EntityType.tree: return [ItemType.wood, ItemType.seed];
      case EntityType.iceSpikes: return [ItemType.frostcicle];
      case EntityType.cactus: return [ItemType.cactus_spine];
      case EntityType.boulder: return [ItemType.rock];
      case EntityType.krumblid: return [ItemType.leather];
      case EntityType.yeti: return [ItemType.yeti_hide, ItemType.raw_beef];
      case EntityType.plant: {
         const plantComponent = PlantComponentArray.getComponent(entity.id);
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
      default: return [];
   }
}

export function entityIsResource(entity: Entity): boolean {
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

const shouldGatherResource = (tribesman: Entity, healthComponent: HealthComponent, inventoryIsFull: boolean, resource: Entity, resourceProducts: ReadonlyArray<ItemType>): boolean => {
   if (resourceProducts.length === 0) {
      return false;
   }
   
   // If the tribesman is within the escape health threshold, make sure there wouldn't be any enemies visible while picking up the dropped item
   // @Hack: the accessibility check doesn't work for plants in planter boxes
   if (tribesmanShouldEscape(tribesman.type, healthComponent) || !positionIsSafeForTribesman(tribesman, resource.position.x, resource.position.y)) {
   // if (tribesmanShouldEscape(tribesman.type, healthComponent) || !positionIsSafeForTribesman(tribesman, resource.position.x, resource.position.y) || !entityIsAccessible(tribesman, resource, tribeComponent.tribe, getTribesmanAttackRadius(tribesman))) {
      return false;
   }

   // Only try to gather plants if they are fully grown
   if (resource.type === EntityType.plant && !shouldGatherPlant(resource.id)) {
      return false;
   }

   // If the tribesman's inventory is full, make sure the tribesman would be able to pick up the product the resource would produce
   if (inventoryIsFull) {
      for (const itemType of resourceProducts) {
         if (tribeMemberCanPickUpItem(tribesman, itemType)) {
            return true;
         }
      }

      return false;
   }

   return true;
}

export interface GatherTargetInfo {
   readonly target: Entity | null;
   readonly isPrioritised: boolean;
}

export function getGatherTarget(tribesman: Entity, visibleEntities: ReadonlyArray<Entity>, prioritisedItemTypes: ReadonlyArray<ItemType>): GatherTargetInfo {
   const healthComponent = HealthComponentArray.getComponent(tribesman.id);
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman.id);
   const tribeComponent = TribeComponentArray.getComponent(tribesman.id);
   
   // @Incomplete: Doesn't account for room in backpack/other
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);
   const isFull = inventoryIsFull(hotbarInventory);
   
   let minDist = Number.MAX_SAFE_INTEGER;
   let closestResource: Entity | undefined;
   
   let minPrioritisedDist = Number.MAX_SAFE_INTEGER;
   let closestPrioritisedResource: Entity | undefined;

   for (let i = 0; i < visibleEntities.length; i++) {
      const resource = visibleEntities[i];
      
      const resourceProducts = getResourceProducts(resource);
      if (!shouldGatherResource(tribesman, healthComponent, isFull, resource, resourceProducts)) {
         continue;
      }
      
      const dist = tribesman.position.calculateDistanceBetween(resource.position);
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

export function tribesmanGetItemPickupTarget(tribesman: Entity, visibleItemEntities: ReadonlyArray<Entity>, prioritisedItemTypes: ReadonlyArray<ItemType>, gatherTargetInfo: GatherTargetInfo): Entity | null {
   const healthComponent = HealthComponentArray.getComponent(tribesman.id);
   const shouldEscape = tribesmanShouldEscape(tribesman.type, healthComponent);
   
   const goalRadius = getTribesmanRadius(tribesman);
      
   let closestDroppedItem: Entity | null = null;
   let minDistance = Number.MAX_SAFE_INTEGER;
   for (const itemEntity of visibleItemEntities) {
      // If the tribesman is within the escape health threshold, make sure there wouldn't be any enemies visible while picking up the dropped item
      if (shouldEscape && !positionIsSafeForTribesman(tribesman, itemEntity.position.x, itemEntity.position.y)) {
         continue;
      }

      // @Temporary @Bug @Incomplete: Will cause the tribesman to incorrectly skip items which are JUST inside a hitbox, but are still accessible via vacuum.
      // if (!entityIsAccessible(tribesman, itemEntity, tribeComponent.tribe, goalRadius)) {
      //    console.log("b");
      //    continue;
      // }

      const itemComponent = ItemComponentArray.getComponent(itemEntity.id);
      if (!tribeMemberCanPickUpItem(tribesman, itemComponent.itemType)) {
         continue;
      }
      
      // If gathering is prioritised, make sure the dropped item is useful for gathering
      if (gatherTargetInfo.isPrioritised) {
         if (prioritisedItemTypes.indexOf(itemComponent.itemType) === -1) {
            continue;
         }
      }

      const distance = tribesman.position.calculateDistanceBetween(itemEntity.position);
      if (distance < minDistance) {
         closestDroppedItem = itemEntity;
         minDistance = distance;
      }
   }

   return closestDroppedItem;
}

export function tribesmanGoPickupItemEntity(tribesman: Entity, pickupTarget: Entity): void {
   // @Temporary
   // pathfindToPosition(tribesman, closestDroppedItem.position.x, closestDroppedItem.position.y, closestDroppedItem.id, TribesmanPathType.default, Math.floor(32 / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.throwError);
   pathfindToPosition(tribesman, pickupTarget.position.x, pickupTarget.position.y, pickupTarget.id, TribesmanPathType.default, Math.floor((32 + VACUUM_RANGE) / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.returnClosest);

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman.id);
   setLimbActions(inventoryUseComponent, LimbAction.none);
   
   const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(tribesman.id);
   tribesmanAIComponent.currentAIType = TribesmanAIType.pickingUpDroppedItems;
}
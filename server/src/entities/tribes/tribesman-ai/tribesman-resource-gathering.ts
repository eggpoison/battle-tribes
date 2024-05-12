import { EntityType } from "webgl-test-shared/dist/entities";
import { InventoryName, ItemType } from "webgl-test-shared/dist/items";
import Entity from "../../../Entity";
import { HealthComponentArray, InventoryComponentArray, TribeComponentArray } from "../../../components/ComponentArray";
import { entityIsAccessible, positionIsSafeForTribesman, tribesmanShouldEscape } from "./tribesman-ai";
import { HealthComponent } from "../../../components/HealthComponent";
import { tribeMemberCanPickUpItem } from "../tribe-member";
import { inventoryIsFull } from "../../../components/InventoryComponent";

const RESOURCE_PRODUCTS: Partial<Record<EntityType, ReadonlyArray<ItemType>>> = {
   [EntityType.cow]: [ItemType.leather, ItemType.raw_beef],
   [EntityType.berryBush]: [ItemType.berry],
   [EntityType.tree]: [ItemType.wood],
   [EntityType.iceSpikes]: [ItemType.frostcicle],
   [EntityType.cactus]: [ItemType.cactus_spine],
   [EntityType.boulder]: [ItemType.rock],
   [EntityType.krumblid]: [ItemType.leather],
   [EntityType.yeti]: [ItemType.yeti_hide, ItemType.raw_beef]
};

/** Record of whether or not an entity type should only be harvested if the resource is urgently needed */
const SHOULD_HARVEST_CONSERVATIVELY: Partial<Record<EntityType, boolean>> = {
   [EntityType.cow]: false,
   [EntityType.berryBush]: false,
   [EntityType.tree]: false,
   [EntityType.iceSpikes]: true,
   [EntityType.cactus]: false,
   [EntityType.boulder]: false,
   [EntityType.krumblid]: false
};

export function entityIsResource(entity: Entity): boolean {
   return entity.type === EntityType.cow
      || entity.type === EntityType.berryBush
      || entity.type === EntityType.tree
      || entity.type === EntityType.iceSpikes
      || entity.type === EntityType.cactus
      || entity.type === EntityType.boulder
      || entity.type === EntityType.krumblid;
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

const canGatherResource = (tribesman: Entity, healthComponent: HealthComponent, inventoryIsFull: boolean, resource: Entity): boolean => {
   const tribeComponent = TribeComponentArray.getComponent(tribesman.id); // @Speed
   
   // If the tribesman is within the escape health threshold, make sure there wouldn't be any enemies visible while picking up the dropped item
   if (tribesmanShouldEscape(tribesman.type, healthComponent) || !positionIsSafeForTribesman(tribesman, resource.position.x, resource.position.y) || !entityIsAccessible(tribesman, resource, tribeComponent.tribe)) {
      return false;
   }

   // If the tribesman's inventory is full, make sure the tribesman would be able to pick up the product the resource would produce
   if (inventoryIsFull) {
      const resourceProducts = RESOURCE_PRODUCTS[resource.type];
      if (resourceProducts !== undefined) {
         for (const itemType of RESOURCE_PRODUCTS[resource.type]!) {
            if (tribeMemberCanPickUpItem(tribesman, itemType)) {
               return true;
            }
         }
      }
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
   
   // @Incomplete: Doesn't account for room in backpack/other
   const isFull = inventoryIsFull(inventoryComponent, InventoryName.hotbar);
   
   let minDist = Number.MAX_SAFE_INTEGER;
   let closestResource: Entity | undefined;
   
   let minPrioritisedDist = Number.MAX_SAFE_INTEGER;
   let closestPrioritisedResource: Entity | undefined;

   // Prioritise gathering resources which can be used in the tribe's building plan
   for (let i = 0; i < visibleEntities.length; i++) {
      const resource = visibleEntities[i];
      
      if (RESOURCE_PRODUCTS[resource.type] === undefined || !canGatherResource(tribesman, healthComponent, isFull, resource)) {
         continue;
      }

      const dist = tribesman.position.calculateDistanceBetween(resource.position);
      const resourceProducts = RESOURCE_PRODUCTS[resource.type];
      if (resourceProducts !== undefined && resourceIsPrioritised(resourceProducts, prioritisedItemTypes)) {
         if (dist < minPrioritisedDist) {
            closestPrioritisedResource = resource;
            minPrioritisedDist = dist;
         }
      } else {
         if (!SHOULD_HARVEST_CONSERVATIVELY[resource.type] && dist < minDist) {
            closestResource = resource;
            minDist = dist;
         }
      }
   }

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
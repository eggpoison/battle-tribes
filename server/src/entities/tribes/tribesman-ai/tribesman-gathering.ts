import { Biome } from "../../../../../shared/dist/biomes.js";
import { TribesmanAIType } from "../../../../../shared/dist/components.js";
import { Entity, EntityType } from "../../../../../shared/dist/entities.js";
import { InventoryName, ItemType, ITEM_INFO_RECORD, itemInfoIsConsumable, ItemTypeString } from "../../../../../shared/dist/items/items.js";
import { PathfindingSettings, Settings } from "../../../../../shared/dist/settings.js";
import { distance, getTileIndexIncludingEdges, assert, randItem, getTileX, getTileY } from "../../../../../shared/dist/utils.js";
import { HealthComponentArray } from "../../../components/HealthComponent.js";
import { VACUUM_RANGE, tribeMemberCanPickUpItem } from "../tribe-member.js";
import { InventoryComponent, InventoryComponentArray, addItem, countItemType, getInventory, inventoryHasItemType } from "../../../components/InventoryComponent.js";
import { tribeMemberShouldEscape } from "./tribesman-escaping.js";
import { getHumanoidRadius } from "./tribesman-ai-utils.js";
import { ItemComponentArray } from "../../../components/ItemComponent.js";
import { TribesmanAIComponentArray, TribesmanPathType } from "../../../components/TribesmanAIComponent.js";
import { PathfindFailureDefault } from "../../../pathfinding.js";
import { AIHelperComponentArray } from "../../../components/AIHelperComponent.js";
import { goKillEntity } from "./tribesman-combat-ai.js";
import { TransformComponentArray } from "../../../components/TransformComponent.js";
import { entityExists, getEntityLayer, getEntityType } from "../../../world.js";
import { AIGatherItemPlan } from "../../../tribesman-ai/tribesman-ai-planning.js";
import { runPatrolAI } from "../../../ai/PatrolAI.js";
import { TribeComponentArray } from "../../../components/TribeComponent.js";
import { entityDropsFoodItem, entityDropsItem, getEntityTypesWhichDropItem } from "../../../components/LootComponent.js";
import { getSpawnInfoForEntityType } from "../../../entity-spawn-info.js";
import { LocalBiome } from "../../../world-generation/terrain-generation-utils.js";
import Layer from "../../../Layer.js";
import { getHitboxTile } from "../../../hitboxes.js";
import { pathToEntityExists, pathfindTribesman, getFinalPath, continueCurrentPath, AIPathfindingComponentArray } from "../../../components/AIPathfindingComponent.js";
import { createItem } from "../../../items.js";

// @Cleanup: unused?
const tribesmanIsElegibleToHarvestEntityType = (tribesman: Entity, entityType: EntityType): boolean => {
   switch (entityType) {
      case EntityType.tree: {
         // If the tribesman is underground, make sure they have enough items to take on the guardian
         // @Incomplete: this won't make them go get those items yet...

         const inventoryComponent = InventoryComponentArray.getComponent(tribesman);
         const hotbar = getInventory(inventoryComponent, InventoryName.hotbar);

         return inventoryHasItemType(hotbar, ItemType.stone_sword);
      }
      // @Temporary
      case EntityType.treePlanted: {
         return false;
      }
   }

   return true;
}

// @Incomplete: when the tribesman wants to gather a resource but there isn't enough space, should make space

// @Incomplete
// const shouldGatherResource = (tribesman: Entity, healthComponent: HealthComponent, inventoryIsFull: boolean, resource: Entity, resourceProducts: readonly ItemType[]): boolean => {
//    if (resourceProducts.length === 0) {
//       return false;
//    }
   
//    // @Incomplete
//    // If the tribesman is within the escape health threshold, make sure there wouldn't be any enemies visible while picking up the dropped item
//    // @Hack: the accessibility check doesn't work for plants in planter boxes
//    // const resourceTransformComponent = TransformComponentArray.getComponent(resource);
//    // if (tribesmanShouldEscape(getEntityType(tribesman), healthComponent)) {
//    // // if (tribesmanShouldEscape(tribesman.type, healthComponent) || !positionIsSafeForTribesman(tribesman, resource.position.x, resource.position.y) || !entityIsAccessible(tribesman, resource, tribeComponent.tribe, getTribesmanAttackRadius(tribesman))) {
//    //    return false;
//    // }

//    // If the tribesman's inventory is full, make sure the tribesman would be able to pick up the products the resource would produce
//    if (inventoryIsFull) {
//       // If any of the resource products can't be picked up, don't try to gather.
//       // This is so the tribesmen don't leave un-picked-up items laying around.
//       for (const itemType of resourceProducts) {
//          if (!tribeMemberCanPickUpItem(tribesman, itemType)) {
//             return false;
//          }
//       }
//    }

//    return true;
// }

const getGatherTarget = (tribesman: Entity, visibleEntities: readonly Entity[], gatheredItemType: ItemType): Entity | null => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.hitboxes[0];
   
   let minDist = Number.MAX_SAFE_INTEGER;
   let closestResource: Entity | undefined;

   for (let i = 0; i < visibleEntities.length; i++) {
      const resource = visibleEntities[i];
      if (!entityDropsItem(resource, gatheredItemType)) {
         continue;
      }

      // @Speed
      // @Incomplete: goal radius doesn't match up with the hunting
      if (!pathToEntityExists(tribesman, resource, 32)) {
         continue;
      }
      
      const resourceTransformComponent = TransformComponentArray.getComponent(resource);
      const resourceHitbox = resourceTransformComponent.hitboxes[0];
      
      const dist = distance(tribesmanHitbox.box.posX, tribesmanHitbox.box.posY, resourceHitbox.box.posX, resourceHitbox.box.posY);
      if (dist < minDist) {
         closestResource = resource;
         minDist = dist;
      }
   }
   
   return closestResource !== undefined ? closestResource : null;
}

const getFoodTarget = (tribesman: Entity, visibleEntities: readonly Entity[]): Entity | null => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.hitboxes[0];

   let minDist = Number.MAX_SAFE_INTEGER;
   let target: Entity | undefined;
   for (const entity of visibleEntities) {
      if (!entityDropsFoodItem(entity)) {
         continue;
      }

      // Don't attack cows unless the tribe has a furnace
      // @Hack: kinda hardcoded. should just check to see if the item type requires cooking to be valuable?
      if (getEntityType(entity) === EntityType.cow) {
         const tribeComponent = TribeComponentArray.getComponent(tribesman);
         const tribe = tribeComponent.tribe;

         if (tribe.getNumEntitiesOfType(EntityType.furnace) === 0) {
            continue;
         }
      }

      const resourceTransformComponent = TransformComponentArray.getComponent(entity);
      const resourceHitbox = resourceTransformComponent.hitboxes[0];

      const dist = distance(tribesmanHitbox.box.posX, tribesmanHitbox.box.posY, resourceHitbox.box.posX, resourceHitbox.box.posY);
      if (dist < minDist) {
         target = entity;
         minDist = dist;
      }
   }
   
   return target !== undefined ? target : null;
}

const tribesmanGetItemPickupTarget = (tribesman: Entity, visibleItemEntities: readonly Entity[], gatheredItemType: ItemType): Entity | null => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.hitboxes[0];
   
   const healthComponent = HealthComponentArray.getComponent(tribesman);
   const shouldEscape = tribeMemberShouldEscape(getEntityType(tribesman), healthComponent);
   
   // @Cleanup: unused?
   const goalRadius = getHumanoidRadius(transformComponent);
      
   let closestDroppedItem: Entity | null = null;
   let minDistance = Number.MAX_SAFE_INTEGER;
   for (const itemEntity of visibleItemEntities) {
      const itemEntityTransformComponent = TransformComponentArray.getComponent(itemEntity);
      // If the tribesman is within the escape health threshold, make sure there wouldn't be any enemies visible while picking up the dropped item
      // @Incomplete
      // if (shouldEscape && !positionIsSafeForTribesman(tribesman, itemEntityTransformComponent.position.x, itemEntityTransformComponent.position.y)) {
      //    continue;
      // }

      // @Temporary @Bug @Incomplete: Will cause the tribesman to incorrectly skip items which are JUST inside a hitbox, but are still accessible via vacuum.
      // if (!entityIsAccessible(tribesman, itemEntity, tribeComponent.tribe, goalRadius)) {
      //    console.log("b");
      //    continue;
      // }

      const itemComponent = ItemComponentArray.getComponent(itemEntity);
      if (itemComponent.item.type !== gatheredItemType || !tribeMemberCanPickUpItem(tribesman, itemComponent.item.type)) {
         continue;
      }

      const itemEntityHitbox = itemEntityTransformComponent.hitboxes[0];
      // Only pull free items
      if (itemEntityHitbox.parent !== null) {
         continue;
      }
      
      const dist = distance(tribesmanHitbox.box.posX, tribesmanHitbox.box.posY, itemEntityHitbox.box.posX, itemEntityHitbox.box.posY);
      if (dist < minDistance) {
         closestDroppedItem = itemEntity;
         minDistance = dist;
      }
   }

   return closestDroppedItem;
}

const goPickupItemEntity = (tribesman: Entity, pickupTarget: Entity): void => {
   const targetTransformComponent = TransformComponentArray.getComponent(pickupTarget);
   const targetHitbox = targetTransformComponent.hitboxes[0];
   
   pathfindTribesman(tribesman, targetHitbox.box.posX, targetHitbox.box.posY, getEntityLayer(pickupTarget), pickupTarget, TribesmanPathType.default, Math.floor(VACUUM_RANGE / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.none);
   
   const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(tribesman);
   tribesmanAIComponent.currentAIType = TribesmanAIType.pickingUpDroppedItems;
}

const findBiomeForGathering = (tribesman: Entity, layer: Layer, biome: Biome): LocalBiome | null => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.hitboxes[0];
   
   let minDist = Number.MAX_SAFE_INTEGER;
   let closestBiome: LocalBiome | null = null;
   for (const localBiome of layer.localBiomes) {
      if (localBiome.biome !== biome || localBiome.tilesInBorder.length === 0) {
         continue;
      }

      // @Incomplete: do entity density check
      // Should sum the density of all valid entity types to be utterly correct

      // @Incomplete: calculate distance to closest tile in the biome
      const dist = distance(tribesmanHitbox.box.posX, tribesmanHitbox.box.posY, localBiome.centerX, localBiome.centerY);
      if (dist < minDist) {
         minDist = dist;
         closestBiome = localBiome;
      }
   }

   return closestBiome;
}

const moveTribesmanToBiome = (tribesman: Entity, layer: Layer, biome: Biome): void => {
   const aiPathfindingComponent = AIPathfindingComponentArray.getComponent(tribesman);

   // If the tribesman is already on way to the biome, continue
   const finalPath = getFinalPath(aiPathfindingComponent);
   if (finalPath !== null) {
      const targetTileX = Math.floor(finalPath.goalX / Settings.TILE_SIZE);
      const targetTileY = Math.floor(finalPath.goalY / Settings.TILE_SIZE);
      const tileIndex = getTileIndexIncludingEdges(targetTileX, targetTileY);
      if (finalPath.layer.getTileBiome(tileIndex) === biome) {
         continueCurrentPath(tribesman);
         return;
      }
   }

   // Not on the way to the biome - need to find a path
   
   const localBiome = findBiomeForGathering(tribesman, layer, biome);
   assert(localBiome !== null);
   
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.hitboxes[0];
   
   // Try to find a close tile in the local biome to pathfind to
   let targetX = 0;
   let targetY = 0;
   let minDist = Number.MAX_SAFE_INTEGER;
   for (let attempts = 0; attempts < 40; attempts++) {
      const targetTile = randItem(localBiome.tilesInBorder);
      const x = (getTileX(targetTile) + Math.random()) * Settings.TILE_SIZE;
      const y = (getTileY(targetTile) + Math.random()) * Settings.TILE_SIZE;

      const dist = distance(x, y, tribesmanHitbox.box.posX, tribesmanHitbox.box.posY);
      if (dist < minDist) {
         minDist = dist;
         targetX = x;
         targetY = y;
      }
   }
   
   pathfindTribesman(tribesman, targetX, targetY, localBiome.layer, 0, TribesmanPathType.default, Math.floor(64 / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.none);

   // @Incomplete: also note which layer the tribesman is moving to
   const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(tribesman);
   tribesmanAIComponent.currentAIType = TribesmanAIType.moveToBiome;
}

const isLowOnFood = (entity: Entity): boolean => {
   const inventoryComponent = InventoryComponentArray.getComponent(entity);
   
   let totalHealing = 0;
   for (const inventory of inventoryComponent.inventories) {
      for (const item of inventory.items) {
         const itemInfo = ITEM_INFO_RECORD[item.type];
         if (itemInfoIsConsumable(item.type, itemInfo)) {
            totalHealing += itemInfo.healAmount * item.count;
         }
      }
   }

   return totalHealing < 10;
}

export function workOnGatherPlan(tribesman: Entity, gatherPlan: AIGatherItemPlan, visibleItemEntities: readonly Entity[]): void {
   const gatheredItemType = gatherPlan.itemType;

   // If the tribe has autogiveBaseResources enabled, then just give all of the item required
   const tribeComponent = TribeComponentArray.getComponent(tribesman);
   if (tribeComponent.tribe.autogiveBaseResources) {
      const inventoryComponent = InventoryComponentArray.getComponent(tribesman);
      const numItemsInInventory = countItemType(inventoryComponent, gatheredItemType);

      const numToGive = gatherPlan.amount - numItemsInInventory;
      addItem(tribesman, inventoryComponent, createItem(gatheredItemType, numToGive, "", ""));
      return;
   }
   
   const aiHelperComponent = AIHelperComponentArray.getComponent(tribesman);
   
   // First see if there are any items which match which we can pick up
   const itemPickupTarget = tribesmanGetItemPickupTarget(tribesman, visibleItemEntities, gatheredItemType);
   if (itemPickupTarget !== null) {
      goPickupItemEntity(tribesman, itemPickupTarget);
      return;
   }

   // Passively look for food
   // @Temporary: This is disabled while the combat swing AI is shit, because the tribesmen will try to attack cows to get raw beef and endlessly miss.
   if (isLowOnFood(tribesman)) {
      const target = getFoodTarget(tribesman, aiHelperComponent.visibleEntities);
      if (target !== null) {
         goKillEntity(tribesman, target, false);
         return;
      }
   }
   
   // Look for targets to gather
   const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(tribesman);
   if (!entityExists(tribesmanAIComponent.targetEntity) || !entityDropsItem(tribesmanAIComponent.targetEntity, gatheredItemType)) {
      const target = getGatherTarget(tribesman, aiHelperComponent.visibleEntities, gatheredItemType);
      if (target !== null) {
         tribesmanAIComponent.targetEntity = target;
      } else {
         tribesmanAIComponent.targetEntity = 0;
      }
   }

   if (entityExists(tribesmanAIComponent.targetEntity) && entityDropsItem(tribesmanAIComponent.targetEntity, gatheredItemType)) {
      goKillEntity(tribesman, tribesmanAIComponent.targetEntity, false);
      return;
   }

   const layer = getEntityLayer(tribesman);

   const targetEntityTypes = getEntityTypesWhichDropItem(gatheredItemType);
   for (const targettedEntityType of targetEntityTypes) {
      const spawnInfo = getSpawnInfoForEntityType(targettedEntityType);
      if (spawnInfo === null) {
         continue;
      }

      // If the entity isn't in the right biome, go to the right biome
      const transformComponent = TransformComponentArray.getComponent(tribesman);
      const tribesmanHitbox = transformComponent.hitboxes[0];
      const currentTile = getHitboxTile(tribesmanHitbox);
      if (layer.getTileBiome(currentTile) !== spawnInfo.biome) {
         moveTribesmanToBiome(tribesman, spawnInfo.layer, spawnInfo.biome);
         return;
      }
   
      // Explore the biome for things to harvest
      const localBiome = layer.getTileLocalBiome(currentTile);
      const patrolAI = aiHelperComponent.getPatrolAI();
      runPatrolAI(tribesman, patrolAI, localBiome.tilesInBorder);
      return;
   }

   throw new Error("There is no way to gather " + ItemTypeString[gatheredItemType] + "!");
}

export function gatherItemPlanIsComplete(inventoryComponent: InventoryComponent, plan: AIGatherItemPlan): boolean {
   return countItemType(inventoryComponent, plan.itemType) >= plan.amount;
}
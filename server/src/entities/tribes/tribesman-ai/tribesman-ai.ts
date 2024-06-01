import { PlanterBoxPlant, TribesmanAIType } from "webgl-test-shared/dist/components";
import { CraftingStation, CraftingRecipe, CRAFTING_RECIPES } from "webgl-test-shared/dist/crafting-recipes";
import { EntityType, EntityTypeString, LimbAction } from "webgl-test-shared/dist/entities";
import { ITEM_TYPE_RECORD, ITEM_INFO_RECORD, Item, ConsumableItemInfo, Inventory, ItemType, HammerItemInfo, PlaceableItemInfo, ConsumableItemCategory, InventoryName } from "webgl-test-shared/dist/items";
import { Settings, PathfindingSettings } from "webgl-test-shared/dist/settings";
import { TechInfo, getTechByID } from "webgl-test-shared/dist/techs";
import { TribesmanTitle } from "webgl-test-shared/dist/titles";
import { TRIBE_INFO_RECORD } from "webgl-test-shared/dist/tribes";
import { distance, angle, Point, randInt, getAngleDiff } from "webgl-test-shared/dist/utils";
import Entity from "../../../Entity";
import { getEntitiesInRange, willStopAtDesiredDistance, stopEntity, moveEntityToPosition, getDistanceFromPointToEntity, getClosestAccessibleEntity } from "../../../ai-shared";
import { HealthComponent, HealthComponentArray } from "../../../components/HealthComponent";
import { getInventory, addItemToInventory, consumeItemFromSlot, craftRecipe, recipeCraftingStationIsAvailable, inventoryComponentCanAffordRecipe, inventoryIsFull, getItemTypeSlot, InventoryComponentArray } from "../../../components/InventoryComponent";
import { TribesmanAIComponentArray, TribesmanPathType, getItemGiftAppreciation, itemThrowIsOnCooldown } from "../../../components/TribesmanAIComponent";
import { tickTribeMember, calculateRadialAttackTargets, repairBuilding, calculateRepairTarget, placeBuilding, placeBlueprint, getAvailableCraftingStations, throwItem, VACUUM_RANGE, tribeMemberCanPickUpItem, } from "../tribe-member";
import { TRIBE_WORKER_RADIUS, TRIBE_WORKER_VISION_RANGE } from "../tribe-worker";
import { InventoryUseComponentArray, getInventoryUseInfo, setLimbActions } from "../../../components/InventoryUseComponent";
import Board from "../../../Board";
import { TRIBE_WARRIOR_VISION_RANGE } from "../tribe-warrior";
import { AIHelperComponentArray } from "../../../components/AIHelperComponent";
import { EntityRelationship, TribeComponent, TribeComponentArray, getEntityRelationship } from "../../../components/TribeComponent";
import { attemptToOccupyResearchBench, canResearchAtBench, continueResearching, markPreemptiveMoveToBench, shouldMoveToResearchBench } from "../../../components/ResearchBenchComponent";
import { PathfindFailureDefault, PathfindOptions, entityCanBlockPathfinding, entityHasReachedNode, getAngleToNode, getClosestPathfindNode, getDistanceToNode, getEntityFootprint, getEntityPathfindingGroupID, pathIsClear, pathfind, positionIsAccessible, replacePathfindingNodeGroupID, smoothPath } from "../../../pathfinding";
import { PhysicsComponentArray } from "../../../components/PhysicsComponent";
import Tribe from "../../../Tribe";
import { TribesmanGoal, TribesmanGoalType, TribesmanPlaceGoal, TribesmanUpgradeGoal, getTribesmanGoals } from "./tribesman-goals";
import { createBuildingHitboxes } from "../../../buildings";
import { CollisionVars, entitiesAreColliding, getHitboxesCollidingEntities } from "../../../collision";
import { huntEntity } from "./tribesman-combat-ai";
import { doorIsClosed, toggleDoor } from "../../../components/DoorComponent";
import { TITLE_REWARD_CHANCES } from "../../../tribesman-title-generation";
import { TribeMemberComponentArray, awardTitle, tribeMemberHasTitle } from "../../../components/TribeMemberComponent";
import { PlanterBoxComponentArray, placePlantInPlanterBox } from "../../../components/PlanterBoxComponent";
import { calculateStructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { HutComponentArray } from "../../../components/HutComponent";
import { PlayerComponentArray } from "../../../components/PlayerComponent";
import { SpikesComponentArray } from "../../../components/SpikesComponent";
import { ItemComponentArray } from "../../../components/ItemComponent";
import { getGatherTarget } from "./tribesman-resource-gathering";

// @Cleanup: Move all of this to the TribesmanComponent file

const enum Vars {
   HELP_TIME = 10 * Settings.TPS,
   BUILDING_PLACE_DISTANCE = 80,
   BLOCKING_TRIBESMAN_DISTANCE = 80
}

const SLOW_ACCELERATION = 200;
const ACCELERATION = 400;

const BARREL_INTERACT_DISTANCE = 80;

export const TRIBESMAN_TURN_SPEED = 2 * Math.PI;

/** How far off the target the pathfinding can be before recalculating */
const PATH_RECALCULATE_DIST = 32;

export const TRIBESMAN_COMMUNICATION_RANGE = 1000;

const MESSAGE_INTERVAL_TICKS = 2 * Settings.TPS;

export const PLANT_TO_SEED_RECORD: Record<PlanterBoxPlant, ItemType> = {
   [PlanterBoxPlant.tree]: ItemType.seed,
   [PlanterBoxPlant.berryBush]: ItemType.berry,
   [PlanterBoxPlant.iceSpikes]: ItemType.frostcicle
};

const getCommunicationTargets = (tribesman: Entity): ReadonlyArray<Entity> => {
   const minChunkX = Math.max(Math.floor((tribesman.position.x - TRIBESMAN_COMMUNICATION_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((tribesman.position.x + TRIBESMAN_COMMUNICATION_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((tribesman.position.y - TRIBESMAN_COMMUNICATION_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((tribesman.position.y + TRIBESMAN_COMMUNICATION_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);

   const tribeComponent = TribeComponentArray.getComponent(tribesman.id);
   
   const communcationTargets = new Array<Entity>();
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (let i = 0; i < chunk.entities.length; i++) {
            const entity = chunk.entities[i];
            if (entity === tribesman || !TribesmanAIComponentArray.hasComponent(entity.id)) {
               continue;
            }

            // Make sure the tribesman are of the same tribe
            const otherTribeComponent = TribeComponentArray.getComponent(entity.id);
            if (tribeComponent.tribe.id === otherTribeComponent.tribe.id) {
               communcationTargets.push(entity);
            }
         }
      }
   }

   return communcationTargets;
}

// @Cleanup: unused?
/** Called while fighting an enemy, it calls other tribesman to move to the position of the fighting */
const sendCallToArmsMessage = (tribesman: Entity, communicationTargets: ReadonlyArray<Entity>, targetEntity: Entity): void => {
   for (let i = 0; i < communicationTargets.length; i++) {
      const currentTribesman = communicationTargets[i];

      const tribesmanComponent = TribesmanAIComponentArray.getComponent(currentTribesman.id);
      tribesmanComponent.helpX = targetEntity.position.x;
      tribesmanComponent.helpY = targetEntity.position.y;
      tribesmanComponent.ticksSinceLastHelpRequest = 0;
   }
}

const sendHelpMessage = (communicatingTribesman: Entity, communicationTargets: ReadonlyArray<Entity>): void => {
   for (let i = 0; i < communicationTargets.length; i++) {
      const currentTribesman = communicationTargets[i];

      // @Cleanup: bad. should only change tribesman ai in that tribesman's tick function.
      const healthComponent = HealthComponentArray.getComponent(currentTribesman.id);
      if (!tribesmanShouldEscape(currentTribesman.type, healthComponent)) {
         pathfindToPosition(currentTribesman, communicatingTribesman.position.x, communicatingTribesman.position.y, communicatingTribesman.id, TribesmanPathType.tribesmanRequest, Math.floor(64 / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.returnEmpty);
      }
   }
}

export function getTribesmanVisionRange(tribesman: Entity): number {
   if (tribesman.type === EntityType.tribeWorker) {
      return TRIBE_WORKER_VISION_RANGE;
   } else {
      return TRIBE_WARRIOR_VISION_RANGE;
   }
}

/** How far away from the entity the attack is done */
export function getTribesmanAttackOffset(tribesman: Entity): number {
   if (tribesman.type === EntityType.tribeWorker) {
      return 40;
   } else {
      return 50;
   }
}

/** Max distance from the attack position that the attack will be registered from */
export function getTribesmanAttackRadius(tribesman: Entity): number {
   if (tribesman.type === EntityType.tribeWorker) {
      return 40;
   } else {
      return 50;
   }
}

/** How far the tribesman wants to be away from their target when attacking */
export function getTribesmanDesiredAttackRange(tribesman: Entity): number {
   if (tribesman.type === EntityType.tribeWorker) {
      return 45;
   } else {
      return 55;
   }
}

export function getTribesmanRadius(tribesman: Entity): number {
   if (tribesman.type === EntityType.tribeWorker) {
      return TRIBE_WORKER_RADIUS;
   } else {
      return 32;
   }
}

const isCollidingWithCoveredSpikes = (tribesmanID: number): boolean => {
   const collidingEntityIDs = Board.getEntityCollisions(tribesmanID);

   for (let i = 0; i < collidingEntityIDs.length; i++) {
      const entityID = collidingEntityIDs[i];

      if (SpikesComponentArray.hasComponent(entityID)) {
         const spikesComponent = SpikesComponentArray.getComponent(entityID);
         if (spikesComponent.isCovered) {
            return true;
         }
      }
   }

   return false;
}

const getAccelerationMultiplier = (tribesmanID: number): number => {
   const tribeComponent = TribeComponentArray.getComponent(tribesmanID);
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(tribesmanID);
   
   let multiplier = TRIBE_INFO_RECORD[tribeComponent.tribe.type].moveSpeedMultiplier;

   // @Incomplete: only do when wearing the bush suit
   if (tribeMemberComponent.lastPlantCollisionTicks >= Board.ticks - 1) {
      multiplier *= 0.5;
   }
   
   if (tribeMemberHasTitle(tribeMemberComponent, TribesmanTitle.sprinter)) {
      multiplier *= 1.2;
   }

   if (isCollidingWithCoveredSpikes(tribesmanID)) {
      multiplier *= 0.5;
   }

   return multiplier;
}

export function getTribesmanSlowAcceleration(tribesmanID: number): number {
   return SLOW_ACCELERATION * getAccelerationMultiplier(tribesmanID);
}

const getAcceleration = (tribesmanID: number): number => {
   return ACCELERATION * getAccelerationMultiplier(tribesmanID);
}

const getFoodItemSlot = (tribesman: Entity): number => {
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman.id);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

   for (let i = 0; i < hotbarInventory.items.length; i++) {
      const item = hotbarInventory.items[i];

      const itemCategory = ITEM_TYPE_RECORD[item.type];
      if (itemCategory === "healing") {
         return hotbarInventory.getItemSlot(item);
      }
   }

   return -1;
}

export function tribesmanShouldEscape(entityType: EntityType, healthComponent: HealthComponent): boolean {
   const remainingHealthRatio = healthComponent.health / healthComponent.maxHealth;
   
   switch (entityType) {
      case EntityType.tribeWorker: return remainingHealthRatio <= 0.5;
      case EntityType.tribeWarrior: return remainingHealthRatio <= 0.4;
      default: {
         throw new Error("Unknown tribesman type " + EntityTypeString[entityType]);
      }
   }
}

export function positionIsSafeForTribesman(tribesman: Entity, x: number, y: number): boolean {
   const visibleEntitiesFromItem = getEntitiesInRange(x, y, getTribesmanVisionRange(tribesman));
   for (const entity of visibleEntitiesFromItem) {
      const relationship = getEntityRelationship(tribesman.id, entity);
      if (relationship >= EntityRelationship.hostileMob) {
         return false;
      }
   }

   return true;
}

// @Cleanup: unused?
// const findNearestBarrel = (tribesman: Entity): Entity | null => {
//    const tribeComponent = TribeComponentArray.getComponent(tribesman.id);
   
//    let minDistance = Number.MAX_SAFE_INTEGER;
//    let closestBarrel: Entity | null = null;
//    for (const barrel of tribeComponent.tribe.barrels) {
//       const distance = tribesman.position.calculateDistanceBetween(barrel.position);
//       if (distance < minDistance) {
//          minDistance = distance;
//          closestBarrel = barrel;
//       }
//    }
   
//    return closestBarrel;
// }

// @Incomplete
// /** Deposit all resources from the tribesman's inventory into a barrel */
// const depositResources = (tribesman: Entity, barrel: Entity): void => {
//    const tribesmanInventoryComponent = InventoryComponentArray.getComponent(tribesman.id);
//    const barrelInventoryComponent = InventoryComponentArray.getComponent(barrel.id);
//    const tribesmanInventory = getInventory(tribesmanInventoryComponent, "hotbar");

//    // 
//    // Isolate the items the tribesman will want to keep
//    // 
//    // @Incomplete @Temporary
//    const bestWeaponItemSlot = 1;
//    // const bestWeaponItemSlot = getBestWeaponSlot(tribesman);
//    let bestPickaxeLevel = -1;
//    let bestPickaxeItemSlot = -1;
//    let bestAxeLevel = -1;
//    let bestAxeItemSlot = -1;
//    let bestArmourLevel = -1;
//    let bestArmourItemSlot = -1;
//    let bestHammerLevel = -1;
//    let bestHammerItemSlot = -1;
//    let firstFoodItemSlot = -1; // Tribesman will only keep the first food item type in their inventory
//    for (let itemSlot = 1; itemSlot <= tribesmanInventory.width * tribesmanInventory.height; itemSlot++) {
//       const item = tribesmanInventory.itemSlots[itemSlot]; 
//       if (typeof item === "undefined") {
//          continue;
//       }
      
//       const itemInfo = ITEM_INFO_RECORD[item.type];
//       const itemCategory = ITEM_TYPE_RECORD[item.type];
//       switch (itemCategory) {
//          case "pickaxe": {
//             if ((itemInfo as ToolItemInfo).level > bestPickaxeLevel) {
//                bestPickaxeLevel = (itemInfo as ToolItemInfo).level;
//                bestPickaxeItemSlot = itemSlot;
//             }
//             break;
//          }
//          case "axe": {
//             if ((itemInfo as ToolItemInfo).level > bestAxeLevel) {
//                bestAxeLevel = (itemInfo as ToolItemInfo).level;
//                bestAxeItemSlot = itemSlot;
//             }
//             break;
//          }
//          case "armour": {
//             if ((itemInfo as ArmourItemInfo).level > bestArmourLevel) {
//                bestArmourLevel = (itemInfo as ArmourItemInfo).level;
//                bestArmourItemSlot = itemSlot;
//             }
//             break;
//          }
//          case "hammer": {
//             if ((itemInfo as ArmourItemInfo).level > bestHammerLevel) {
//                bestHammerLevel = (itemInfo as ArmourItemInfo).level;
//                bestHammerItemSlot = itemSlot;
//             }
//             break;
//          }
//          case "healing": {
//             if (firstFoodItemSlot === -1) {
//                firstFoodItemSlot = itemSlot;
//             }
//             break;
//          }
//       }
//    }
   
//    // @Speed
//    for (const [_itemSlot, item] of Object.entries(tribesmanInventory.itemSlots)) {
//       const itemSlot = Number(_itemSlot);
      
//       if (itemSlot === bestWeaponItemSlot || itemSlot === bestAxeItemSlot || itemSlot === bestPickaxeItemSlot || itemSlot === bestArmourItemSlot || itemSlot === firstFoodItemSlot || itemSlot === bestHammerItemSlot) {
//          continue;
//       }
      
//       // Add the item to the barrel inventory and remove from tribesman inventory
//       const amountAdded = addItemToInventory(barrelInventoryComponent, "inventory", item.type, item.count);
//       consumeItemFromSlot(tribesmanInventoryComponent, "hotbar", itemSlot, amountAdded);
//    }
// }

// @Incomplete
// const haulToBarrel = (tribesman: Entity, barrel: Entity): boolean => {
//    // @Incomplete: goal radius
//    const didPathfind = pathfindToPosition(tribesman, barrel.position.x, barrel.position.y, barrel.id, TribesmanPathType.haulingToBarrel, 0, PathfindFailureDefault.returnEmpty);

//    if (tribesman.position.calculateDistanceBetween(barrel.position) <= BARREL_INTERACT_DISTANCE) {
//       depositResources(tribesman, barrel);
//    }

//    return didPathfind;
// }

const grabBarrelFood = (tribesman: Entity, barrel: Entity): void => {
   // 
   // Grab the food stack with the highest total heal amount
   // 

   const barrelInventoryComponent = InventoryComponentArray.getComponent(barrel.id);
   const barrelInventory = getInventory(barrelInventoryComponent, InventoryName.inventory);

   let foodItemSlot = -1;
   let food: Item | undefined;
   let maxFoodValue = 0;
   for (let slotNum = 1; slotNum <= barrelInventory.width * barrelInventory.height; slotNum++) {
      const item = barrelInventory.itemSlots[slotNum];
      if (typeof item === "undefined") {
         continue;
      }
      
      // Skip non-food
      if (ITEM_TYPE_RECORD[item.type] !== "healing") {
         continue;
      }

      const foodValue = (ITEM_INFO_RECORD[item.type] as ConsumableItemInfo).healAmount * item.count;
      if (typeof food === "undefined" || foodValue > maxFoodValue) {
         food = item;
         foodItemSlot = slotNum;
         maxFoodValue = foodValue;
      }
   }
   if (typeof food === "undefined") {
      throw new Error("Couldn't find a food item to grab.");
   }

   const tribesmanInventoryComponent = InventoryComponentArray.getComponent(tribesman.id);
   const hotbarInventory = getInventory(tribesmanInventoryComponent, InventoryName.hotbar);
   addItemToInventory(hotbarInventory, food.type, food.count);
   consumeItemFromSlot(barrelInventory, foodItemSlot, 999);
}

const barrelHasFood = (barrel: Entity): boolean => {
   const inventoryComponent = InventoryComponentArray.getComponent(barrel.id);
   const inventory = getInventory(inventoryComponent, InventoryName.inventory);

   for (let slotNum = 1; slotNum <= inventory.width * inventory.height; slotNum++) {
      const item = inventory.itemSlots[slotNum];
      if (typeof item !== "undefined") {
         if (ITEM_TYPE_RECORD[item.type] === "healing") {
            return true;
         }
      }
   }

   return false;
}

// @Cleanup: move to inventory component file
/** Returns 0 if no hammer is in the inventory */
export function getBestHammerItemSlot(inventory: Inventory): number {
   let bestLevel = 0;
   let bestItemSlot = 0;

   for (let i = 0; i < inventory.items.length; i++) {
      const item = inventory.items[i];

      if (item.type === ItemType.wooden_hammer || item.type === ItemType.stone_hammer) {
         const itemInfo = ITEM_INFO_RECORD[item.type] as HammerItemInfo;
         if (itemInfo.level > bestLevel) {
            bestLevel = itemInfo.level;
            bestItemSlot = inventory.getItemSlot(item);
         }
      }
   }

   return bestItemSlot;
}

const getOccupiedResearchBenchID = (tribesman: Entity, tribeComponent: TribeComponent): number => {
   for (let i = 0; i < tribeComponent.tribe.researchBenches.length; i++) {
      const bench = tribeComponent.tribe.researchBenches[i];
      if (canResearchAtBench(bench, tribesman)) {
         return bench.id;
      }
   }

   return 0;
}

const getAvailableResearchBenchID = (tribesman: Entity, tribeComponent: TribeComponent): number => {
   let id = 0;
   let minDist = Number.MAX_SAFE_INTEGER;

   for (let i = 0; i < tribeComponent.tribe.researchBenches.length; i++) {
      const bench = tribeComponent.tribe.researchBenches[i];

      if (!shouldMoveToResearchBench(bench, tribesman)) {
         continue;
      }

      const dist = tribesman.position.calculateDistanceBetween(bench.position);
      if (dist < minDist) {
         minDist = dist;
         id = bench.id;
      }
   }

   return id;
}

const shouldRecalculatePath = (tribesman: Entity, goalX: number, goalY: number, goalRadiusNodes: number): boolean => {
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman.id); // @Speed

   if (tribesmanComponent.path.length === 0) {
      // @Incomplete: Should we do this?
      // Recalculate the path if the path's final node was reached but it wasn't at the goal
      const targetNode = getClosestPathfindNode(goalX, goalY);
      
      return tribesmanComponent.pathfindingTargetNode !== targetNode;
   } else {
      // @Speed
      // Recalculate if the tribesman isn't making any progress
      const physicsComponent = PhysicsComponentArray.getComponent(tribesman.id);
      if (tribesmanComponent.rawPath.length > 2 && tribesman.ageTicks % Settings.TPS === 0 && physicsComponent.velocity.lengthSquared() < 10 * 10) {
         return true;
      }

      // Recalculate if the goal has moved too far away from the path's final node
      
      const pathTargetNode = tribesmanComponent.path[tribesmanComponent.path.length - 1];
      
      const pathTargetX = (pathTargetNode % PathfindingSettings.NODES_IN_WORLD_WIDTH - 1) * PathfindingSettings.NODE_SEPARATION;
      const pathTargetY = (Math.floor(pathTargetNode / PathfindingSettings.NODES_IN_WORLD_WIDTH) - 1) * PathfindingSettings.NODE_SEPARATION;

      return distance(goalX, goalY, pathTargetX, pathTargetY) >= goalRadiusNodes * PathfindingSettings.NODE_SEPARATION + PATH_RECALCULATE_DIST;
   }
}

const openDoors = (tribesman: Entity, tribe: Tribe): void => {
   const offsetMagnitude = getTribesmanRadius(tribesman) + 20;
   const checkX = tribesman.position.x + offsetMagnitude * Math.sin(tribesman.rotation);
   const checkY = tribesman.position.y + offsetMagnitude * Math.cos(tribesman.rotation);
   const entitiesInFront = getEntitiesInRange(checkX, checkY, 40);
   for (let i = 0; i < entitiesInFront.length; i++) {
      const entity = entitiesInFront[i];
      if (entity.type !== EntityType.door) {
         continue;
      }

      // Only open friendly doors
      const tribeComponent = TribeComponentArray.getComponent(entity.id);
      if (tribeComponent.tribe !== tribe) {
         continue;
      }

      if (doorIsClosed(entity)) {
         toggleDoor(entity);

         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman.id);
         const useInfo = getInventoryUseInfo(inventoryUseComponent, InventoryName.hotbar);
         useInfo.lastAttackTicks = Board.ticks;
      }
   }
}

const continueCurrentPath = (tribesman: Entity, goalX: number, goalY: number): boolean => {
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman.id); // @Speed
   const tribeComponent = TribeComponentArray.getComponent(tribesman.id); // @Speed
   const path = tribesmanComponent.path;

   if (entityHasReachedNode(tribesman, path[0])) {
      // If passed the next node, remove it
      path.shift();
   }

   if (path.length > 0) {
      const footprint = getEntityFootprint(getTribesmanRadius(tribesman));

      // If the path is clear, just move in a direct line to the goal
      if (pathIsClear(tribesman.position.x, tribesman.position.y, goalX, goalY, tribeComponent.tribe.pathfindingGroupID, footprint)) {
         const targetDirection = angle(goalX - tribesman.position.x, goalY - tribesman.position.y);

         const physicsComponent = PhysicsComponentArray.getComponent(tribesman.id);
         
         const acceleration = getAcceleration(tribesman.id);
         physicsComponent.acceleration.x = acceleration * Math.sin(targetDirection);
         physicsComponent.acceleration.y = acceleration * Math.cos(targetDirection);

         physicsComponent.targetRotation = targetDirection;
         physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;

         // Remove all nodes except the goal node
         while (path.length > 1) {
            path.shift();
         }
      } else {
         // Otherwise, move to the next node

         const nextNode = path[0];
         const targetDirection = getAngleToNode(tribesman, nextNode);

         const physicsComponent = PhysicsComponentArray.getComponent(tribesman.id);
         physicsComponent.targetRotation = targetDirection;
         physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;

         // If the tribesman is close to the next node, slow down as to not overshoot it
         const distFromNode = getDistanceToNode(tribesman, nextNode);
         if (willStopAtDesiredDistance(physicsComponent, -2, distFromNode)) {
            stopEntity(physicsComponent);
         } else {
            const acceleration = getAcceleration(tribesman.id);
            physicsComponent.acceleration.x = acceleration * Math.sin(tribesman.rotation);
            physicsComponent.acceleration.y = acceleration * Math.cos(tribesman.rotation);
         }
      }

      // @Speed: only do this if we know the path has a door in it
      // Open any doors in their way
      if (tribesman.ageTicks % ((Settings.TPS / 6) | 0) === 0) {
         openDoors(tribesman, tribeComponent.tribe);
      }

      tribesmanComponent.isPathfinding = true;

      return true;
   } else {
      // Reached path!
      const physicsComponent = PhysicsComponentArray.getComponent(tribesman.id);
      stopEntity(physicsComponent);

      tribesmanComponent.rawPath = [];
      tribesmanComponent.pathType = TribesmanPathType.default;
      tribesmanComponent.isPathfinding = false;
      return false;
   }
}

export function clearTribesmanPath(tribesman: Entity): void {
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman.id); // @Speed
   tribesmanComponent.isPathfinding = false;
}

const convertEntityPathfindingGroupID = (entity: Entity, oldGroupID: number, newGroupID: number): void => {
   for (const node of entity.occupiedPathfindingNodes) {
      replacePathfindingNodeGroupID(node, oldGroupID, newGroupID);
   }
}

const getPotentialBlockingTribesmen = (tribesman: Entity): ReadonlyArray<Entity> => {
   const minChunkX = Math.max(Math.min(Math.floor((tribesman.position.x - Vars.BLOCKING_TRIBESMAN_DISTANCE/2) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((tribesman.position.x + Vars.BLOCKING_TRIBESMAN_DISTANCE/2) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((tribesman.position.y - Vars.BLOCKING_TRIBESMAN_DISTANCE/2) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((tribesman.position.y + Vars.BLOCKING_TRIBESMAN_DISTANCE/2) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   
   const blockingTribesmen = new Array<Entity>();
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);

         for (let i = 0; i < chunk.entities.length; i++) {
            const entity = chunk.entities[i];
            if (blockingTribesmen.indexOf(entity) !== -1 || entity === tribesman) {
               continue;
            }

            const relationship = getEntityRelationship(tribesman.id, entity);
            if (relationship === EntityRelationship.friendly) {
               blockingTribesmen.push(entity);
            }
         }
      }
   }
   return blockingTribesmen;
}

const preparePathfinding = (targetEntityID: number, tribe: Tribe, blockingTribesman: ReadonlyArray<Entity>): void => {
   // Ignore the target
   if (targetEntityID !== 0) {
      // @Speed: Some places which call this have access to the entity already
      const targetEntity = Board.entityRecord[targetEntityID]!;
      if (entityCanBlockPathfinding(targetEntity.type)) {
         const oldGroupID = getEntityPathfindingGroupID(targetEntity);
         convertEntityPathfindingGroupID(targetEntity, oldGroupID, tribe.pathfindingGroupID);
      }
   }

   // Take into account all blocking tribesmen
   for (let i = 0; i < blockingTribesman.length; i++) {
      const tribesman = blockingTribesman[i];
      convertEntityPathfindingGroupID(tribesman, tribe.pathfindingGroupID, 0);
   }
}

const cleanupPathfinding = (targetEntityID: number, tribe: Tribe, blockingTribesman: ReadonlyArray<Entity>): void => {
   // Reset the target
   if (targetEntityID !== 0) {
      // @Speed: Some places which call this have access to the entity already
      const targetEntity = Board.entityRecord[targetEntityID]!;
      if (entityCanBlockPathfinding(targetEntity.type)) {
         const oldGroupID = getEntityPathfindingGroupID(targetEntity);
         convertEntityPathfindingGroupID(targetEntity, tribe.pathfindingGroupID, oldGroupID);
      }
   }

   // Re-ignore all blocking tribesmen
   for (let i = 0; i < blockingTribesman.length; i++) {
      const tribesman = blockingTribesman[i];
      convertEntityPathfindingGroupID(tribesman, 0, tribe.pathfindingGroupID);
   }
}

export function pathfindToPosition(tribesman: Entity, goalX: number, goalY: number, targetEntityID: number, pathType: TribesmanPathType, goalRadius: number, failureDefault: PathfindFailureDefault): boolean {
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman.id); // @Speed
   
   tribesmanComponent.pathType = pathType;

   // If moving to a new target node, recalculate path
   if (shouldRecalculatePath(tribesman, goalX, goalY, goalRadius)) {
      const tribeComponent = TribeComponentArray.getComponent(tribesman.id); // @Speed
      
      const footprint = getEntityFootprint(getTribesmanRadius(tribesman));
      const tribe = tribeComponent.tribe;
   
      const options: PathfindOptions = {
         goalRadius: goalRadius,
         failureDefault: failureDefault
      };

      const blockingTribesmen = getPotentialBlockingTribesmen(tribesman);
      preparePathfinding(targetEntityID, tribe, blockingTribesmen);
      
      const rawPath = pathfind(tribesman.position.x, tribesman.position.y, goalX, goalY, tribe.pathfindingGroupID, footprint, options);

      // @Incomplete: figure out why this happens
      // If the pathfinding failed, don't do anything
      if (rawPath.length === 0) {
         const physicsComponent = PhysicsComponentArray.getComponent(tribesman.id);
         stopEntity(physicsComponent);
         
         cleanupPathfinding(targetEntityID, tribe, blockingTribesmen);
         return false;
      }
      
      tribesmanComponent.rawPath = rawPath;
      tribesmanComponent.path = smoothPath(rawPath, tribe.pathfindingGroupID, footprint);
      
      cleanupPathfinding(targetEntityID, tribe, blockingTribesmen);
   }

   return continueCurrentPath(tribesman, goalX, goalY);
}

// @Cleanup: these two functions do much the same thing. which one to keep?

export function entityIsAccessible(tribesman: Entity, entity: Entity, tribe: Tribe, goalRadius: number): boolean {
   const blockingTribesmen = getPotentialBlockingTribesmen(tribesman);
   preparePathfinding(entity.id, tribe, blockingTribesmen);

   const isAccessible = positionIsAccessible(entity.position.x, entity.position.y, tribe.pathfindingGroupID, getEntityFootprint(goalRadius));

   cleanupPathfinding(entity.id, tribe, blockingTribesmen);

   return isAccessible;
}

export function pathToEntityExists(tribesman: Entity, huntedEntity: Entity, tribe: Tribe, goalRadius: number): boolean {
   const blockingTribesmen = getPotentialBlockingTribesmen(tribesman);
   preparePathfinding(huntedEntity.id, tribe, blockingTribesmen);
   
   const options: PathfindOptions = {
      goalRadius: Math.floor(goalRadius / PathfindingSettings.NODE_SEPARATION),
      failureDefault: PathfindFailureDefault.returnEmpty
   };
   const path = pathfind(tribesman.position.x, tribesman.position.y, huntedEntity.position.x, huntedEntity.position.y, tribe.pathfindingGroupID, getEntityFootprint(getTribesmanRadius(tribesman)), options);

   cleanupPathfinding(huntedEntity.id, tribe, blockingTribesmen);

   return path.length > 0;
}

export function attemptToRepairBuildings(tribesman: Entity): boolean {
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman.id);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);
   const hammerItemSlot = getBestHammerItemSlot(hotbarInventory);
   
   const aiHelperComponent = AIHelperComponentArray.getComponent(tribesman.id);
   
   let closestDamagedBuilding: Entity | undefined;
   let minDistance = Number.MAX_SAFE_INTEGER;
   for (const entity of aiHelperComponent.visibleEntities) {
      const relationship = getEntityRelationship(tribesman.id, entity);
      if (relationship !== EntityRelationship.friendlyBuilding) {
         continue;
      }

      const healthComponent = HealthComponentArray.getComponent(entity.id);
      if (healthComponent.health === healthComponent.maxHealth) {
         continue;
      }

      // @Incomplete: Skip buildings which there isn't a path to

      const distance = tribesman.position.calculateDistanceBetween(entity.position);
      if (distance < minDistance) {
         closestDamagedBuilding = entity;
         minDistance = distance;
      }
   }

   if (typeof closestDamagedBuilding === "undefined") {
      return false;
   }

   // Select the hammer item slot
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman.id);
   const useInfo = getInventoryUseInfo(inventoryUseComponent, InventoryName.hotbar);
   useInfo.selectedItemSlot = hammerItemSlot;
   setLimbActions(inventoryUseComponent, LimbAction.none);

   const desiredAttackRange = getTribesmanDesiredAttackRange(tribesman);
   const physicsComponent = PhysicsComponentArray.getComponent(tribesman.id);

   const distance = getDistanceFromPointToEntity(tribesman.position, closestDamagedBuilding) - getTribesmanRadius(tribesman);
   if (willStopAtDesiredDistance(physicsComponent, desiredAttackRange, distance)) {
      // If the tribesman will stop too close to the target, move back a bit
      if (willStopAtDesiredDistance(physicsComponent, desiredAttackRange - 20, distance)) {
         physicsComponent.acceleration.x = getTribesmanSlowAcceleration(tribesman.id) * Math.sin(tribesman.rotation + Math.PI);
         physicsComponent.acceleration.y = getTribesmanSlowAcceleration(tribesman.id) * Math.cos(tribesman.rotation + Math.PI);
      } else {
         stopEntity(physicsComponent);
      }

      const targetRotation = tribesman.position.calculateAngleBetween(closestDamagedBuilding.position);
      physicsComponent.targetRotation = targetRotation;
      physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;

      if (Math.abs(getAngleDiff(tribesman.rotation, targetRotation)) < 0.1) {
         // If in melee range, try to repair the building
         const targets = calculateRadialAttackTargets(tribesman, getTribesmanAttackOffset(tribesman), getTribesmanAttackRadius(tribesman));
         const repairTarget = calculateRepairTarget(tribesman, targets);
         if (repairTarget !== null) {
            repairBuilding(tribesman, repairTarget, hammerItemSlot, InventoryName.hotbar);
         }
      }
   } else {
      pathfindToPosition(tribesman, closestDamagedBuilding.position.x, closestDamagedBuilding.position.y, closestDamagedBuilding.id, TribesmanPathType.default, Math.floor(desiredAttackRange / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.throwError);
   }

   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman.id);
   tribesmanComponent.currentAIType = TribesmanAIType.repairing;

   return true;
}

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

const goCraftItem = (tribesman: Entity, recipe: CraftingRecipe, tribe: Tribe): boolean => {
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

const goPlaceBuilding = (tribesman: Entity, hotbarInventory: Inventory, tribe: Tribe, goal: TribesmanPlaceGoal): boolean => {
   const plan = goal.plan;
   
   const entityType = (ITEM_INFO_RECORD[plan.buildingRecipe.product] as PlaceableItemInfo).entityType;
   const hitboxes = createBuildingHitboxes(entityType, plan.position, 1, plan.rotation);
   
   const blockingEntities = getHitboxesCollidingEntities(hitboxes);
   for (let i = 0; i < blockingEntities.length; i++) {
      const blockingEntity = blockingEntities[i];
      if (!HealthComponentArray.hasComponent(blockingEntity.id)) {
         continue;
      }
      
      const relationship = getEntityRelationship(tribesman.id, blockingEntity);
      if (relationship !== EntityRelationship.friendly) {
         // @Bug: sometimes the blocking entity is inaccessible, causing the pathfinding to the entity to break. Fix
         
         huntEntity(tribesman, blockingEntity, false);
         return true;
      }
   }
   
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman.id);
   
   const distance = getDistanceFromPointToEntity(plan.position, tribesman);
   if (distance < Vars.BUILDING_PLACE_DISTANCE) {
      // Equip the item
      const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman.id);
      const useInfo = getInventoryUseInfo(inventoryUseComponent, InventoryName.hotbar);
      useInfo.selectedItemSlot = goal.placeableItemSlot;
      
      const targetDirection = angle(plan.position.x - tribesman.position.x, plan.position.y - tribesman.position.y);
      if (distance < getTribesmanAttackRadius(tribesman)) {
         // @Incomplete: Shouldn't move backwards from the target position, should instead pathfind to the closest position
         // which is far enough away, as currently it will try to back into buildings and get stuck like this.
         
         // 
         // If too close to the plan position, move back a bit
         // 

         const physicsComponent = PhysicsComponentArray.getComponent(tribesman.id);

         const acceleration = getTribesmanSlowAcceleration(tribesman.id);
         physicsComponent.acceleration.x = acceleration * Math.sin(targetDirection + Math.PI);
         physicsComponent.acceleration.y = acceleration * Math.cos(targetDirection + Math.PI);

         physicsComponent.targetRotation = targetDirection;
         physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;
         
         setLimbActions(inventoryUseComponent, LimbAction.none);
         tribesmanComponent.currentAIType = TribesmanAIType.building;
         return true;
      } else if (Math.abs(getAngleDiff(tribesman.rotation, targetDirection)) < 0.02) {
         // @Cleanup: copy and paste. use the function from item-use.ts
         
         // 
         // Place the item
         // 
         
         const item = hotbarInventory.itemSlots[goal.placeableItemSlot]!;
         const placingEntityType = (ITEM_INFO_RECORD[item.type] as PlaceableItemInfo).entityType;
         
         const connectionInfo = calculateStructureConnectionInfo(plan.position, plan.rotation, placingEntityType, Board.chunks);
         placeBuilding(tribe, plan.position, plan.rotation, placingEntityType, connectionInfo);

         if (Math.random() < TITLE_REWARD_CHANCES.ARCHITECT_REWARD_CHANCE) {
            awardTitle(tribesman, TribesmanTitle.architect);
         }

         consumeItemFromSlot(hotbarInventory, goal.placeableItemSlot, 1);
         
         useInfo.lastAttackTicks = Board.ticks;
      } else {
         const physicsComponent = PhysicsComponentArray.getComponent(tribesman.id);
         
         stopEntity(physicsComponent);
         physicsComponent.targetRotation = targetDirection;
         physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;

         setLimbActions(inventoryUseComponent, LimbAction.none);
         tribesmanComponent.currentAIType = TribesmanAIType.building;
         return true;
      }
   } else {
      // Move to the building plan
      const isPathfinding = pathfindToPosition(tribesman, plan.position.x, plan.position.y, 0, TribesmanPathType.default, Math.floor(Vars.BUILDING_PLACE_DISTANCE / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.returnEmpty);
      if (isPathfinding) {
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman.id);
         
         setLimbActions(inventoryUseComponent, LimbAction.none);
         tribesmanComponent.currentAIType = TribesmanAIType.building;
         return true;
      }
   }

   return false;
}

const goUpgradeBuilding = (tribesman: Entity, goal: TribesmanUpgradeGoal): void => {
   const plan = goal.plan;
   const building = Board.entityRecord[plan.baseBuildingID]!;
   
   // @Cleanup: Copy and paste from attemptToRepairBuildings
   
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman.id);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);
   const hammerItemSlot = getBestHammerItemSlot(hotbarInventory);

   // Select the hammer item slot
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman.id);
   const useInfo = getInventoryUseInfo(inventoryUseComponent, InventoryName.hotbar);
   useInfo.selectedItemSlot = hammerItemSlot;
   setLimbActions(inventoryUseComponent, LimbAction.none);

   const desiredAttackRange = getTribesmanDesiredAttackRange(tribesman);
   const physicsComponent = PhysicsComponentArray.getComponent(tribesman.id);
   
   const distance = getDistanceFromPointToEntity(tribesman.position, building) - getTribesmanRadius(tribesman);
   if (willStopAtDesiredDistance(physicsComponent, desiredAttackRange, distance)) {
      // If the tribesman will stop too close to the target, move back a bit
      if (willStopAtDesiredDistance(physicsComponent, desiredAttackRange - 20, distance)) {
         physicsComponent.acceleration.x = getTribesmanSlowAcceleration(tribesman.id) * Math.sin(tribesman.rotation + Math.PI);
         physicsComponent.acceleration.y = getTribesmanSlowAcceleration(tribesman.id) * Math.cos(tribesman.rotation + Math.PI);
      } else {
         stopEntity(physicsComponent);
      }

      const targetRotation = tribesman.position.calculateAngleBetween(building.position);

      physicsComponent.targetRotation = targetRotation;
      physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;

      if (Math.abs(getAngleDiff(tribesman.rotation, targetRotation)) < 0.1) {
         placeBlueprint(tribesman, building.id, plan.blueprintType, plan.rotation);
      }
   } else {
      pathfindToPosition(tribesman, building.position.x, building.position.y, building.id, TribesmanPathType.default, Math.floor(desiredAttackRange / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.returnEmpty);
   }

   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman.id);
   tribesmanComponent.currentAIType = TribesmanAIType.building;
}

const goResearchTech = (tribesman: Entity, tech: TechInfo): boolean => {
   const tribeComponent = TribeComponentArray.getComponent(tribesman.id);
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman.id);

   // @Incomplete: use pathfinding
   
   // Continue researching at an occupied bench
   const occupiedBenchID = getOccupiedResearchBenchID(tribesman, tribeComponent);
   if (occupiedBenchID !== 0) {
      const bench = Board.entityRecord[occupiedBenchID]!;
      
      const targetDirection = tribesman.position.calculateAngleBetween(bench.position);
      const physicsComponent = PhysicsComponentArray.getComponent(tribesman.id);

      const slowAcceleration = getTribesmanSlowAcceleration(tribesman.id);
      physicsComponent.acceleration.x = slowAcceleration * Math.sin(targetDirection);
      physicsComponent.acceleration.y = slowAcceleration * Math.cos(targetDirection);

      physicsComponent.targetRotation = targetDirection;
      physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;
      
      continueResearching(bench, tribesman, tech);
      
      tribesmanComponent.targetResearchBenchID = occupiedBenchID;
      tribesmanComponent.currentAIType = TribesmanAIType.researching;

      const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman.id);
      setLimbActions(inventoryUseComponent, LimbAction.researching);
      
      return true;
   }
   
   const benchID = getAvailableResearchBenchID(tribesman, tribeComponent);
   if (benchID !== 0) {
      const bench = Board.entityRecord[benchID]!;
      
      markPreemptiveMoveToBench(bench, tribesman);
      moveEntityToPosition(tribesman, bench.position.x, bench.position.y, getAcceleration(tribesman.id), TRIBESMAN_TURN_SPEED);
      
      tribesmanComponent.targetResearchBenchID = benchID;
      tribesmanComponent.currentAIType = TribesmanAIType.researching;

      // If close enough, switch to doing research
      const dist = getDistanceFromPointToEntity(tribesman.position, bench) - getTribesmanRadius(tribesman);
      if (dist < 50) {
         attemptToOccupyResearchBench(bench, tribesman);
      }

      const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman.id);
      setLimbActions(inventoryUseComponent, LimbAction.none);

      return true;
   }

   return false;
}

const generateTribeAreaPatrolPosition = (tribesman: Entity, tribe: Tribe): Point | null => {
   // Filter tiles in tribe area
   const potentialTiles = tribe.getArea();

   // Randomly look for a place to patrol to
   while (potentialTiles.length > 0) {
      const idx = randInt(0, potentialTiles.length - 1);
      const tile = potentialTiles[idx];
      
      const x = (tile.x + Math.random()) * Settings.TILE_SIZE;
      const y = (tile.y + Math.random()) * Settings.TILE_SIZE;

      if (positionIsAccessible(x, y, tribe.pathfindingGroupID, getEntityFootprint(getTribesmanRadius(tribesman)))) {
         return new Point(x, y);
      }

      potentialTiles.splice(idx, 1);
   }

   return null;
}

const generateRandomExplorePosition = (tribesman: Entity, tribe: Tribe): Point | null => {
   const visionRange = getTribesmanVisionRange(tribesman);
   const footprint = getEntityFootprint(getTribesmanRadius(tribesman));
   
   const distToTotem = tribe.totem !== null ? tribesman.position.calculateDistanceBetween(tribe.totem.position) : 0;
   
   for (let attempts = 0; attempts < 100; attempts++) {
      const offsetMagnitude = visionRange * Math.random();
      const offsetDirection = 2 * Math.PI * Math.random();

      const x = tribesman.position.x + offsetMagnitude * Math.sin(offsetDirection);
      const y = tribesman.position.y + offsetMagnitude * Math.cos(offsetDirection);

      // Always explore further away from the totem
      const currentDistToTotem = tribe.totem !== null ? distance(x, y, tribe.totem.position.x, tribe.totem.position.y) : 0;
      if (currentDistToTotem < distToTotem) {
         continue;
      }

      if (!positionIsAccessible(x, y, tribe.pathfindingGroupID, footprint)) {
         continue;
      }
      
      const nearbyEntities = getEntitiesInRange(x, y, 20);
      if (nearbyEntities.length === 0) {
         return new Point(x, y);
      }
   }

   return null;
}

const generatePatrolPosition = (tribesman: Entity, tribe: Tribe, goal: TribesmanGoal | null): Point | null => {
   switch (tribesman.type) {
      case EntityType.tribeWorker: {
         if (goal === null || Board.isNight()) {
            return generateTribeAreaPatrolPosition(tribesman, tribe);
         } else {
            return generateRandomExplorePosition(tribesman, tribe);
         }
      }
      case EntityType.tribeWarrior: {
         return generateTribeAreaPatrolPosition(tribesman, tribe);
      }
   }

   throw new Error();
}

const getAvailableHut = (tribe: Tribe): Entity | null => {
   for (let i = 0; i < tribe.buildings.length; i++) {
      const building = tribe.buildings[i];
      if (building.type !== EntityType.workerHut && building.type !== EntityType.warriorHut) {
         continue;
      }

      const hutComponent = HutComponentArray.getComponent(building.id);
      if (!hutComponent.hasTribesman) {
         return building;
      }
   }

   return null;
}

const getGiftableItemSlot = (tribesman: Entity): number => {
   // @Incomplete: don't gift items useful to the tribesman
   
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman.id);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

   let maxGiftWeight = 0;
   let bestItemSlot = 0;
   for (let itemSlot = 1; itemSlot <= hotbarInventory.width * hotbarInventory.height; itemSlot++) {
      const item = hotbarInventory.itemSlots[itemSlot];
      if (typeof item === "undefined") {
         continue;
      }

      const giftWeight = getItemGiftAppreciation(item.type);
      if (giftWeight > maxGiftWeight) {
         maxGiftWeight = giftWeight;
         bestItemSlot = itemSlot;
      }
   }

   return bestItemSlot;
}

const getRecruitTarget = (tribesman: Entity, visibleEntities: ReadonlyArray<Entity>): Entity | null => {
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman.id);
   
   let maxRelationship = -100;
   let closestAcquaintance: Entity | null = null;
   for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];
      if (entity.type === EntityType.player || !TribeMemberComponentArray.hasComponent(entity.id) || getEntityRelationship(tribesman.id, entity) === EntityRelationship.enemy) {
         continue;
      }

      // Don't try to gift items to tribesman who are already in an established tribe
      const tribeComponent = TribeComponentArray.getComponent(entity.id);
      if (tribeComponent.tribe.hasTotem()) {
         continue;
      }
      
      const relationship = tribesmanComponent.tribesmanRelations[entity.id] || 0;
      if (relationship > maxRelationship) {
         maxRelationship = relationship;
         closestAcquaintance = entity;
      }
   }
   
   return closestAcquaintance;
}

const getSeedItemSlot = (hotbarInventory: Inventory, plantType: PlanterBoxPlant): number | null => {
   const searchItemType = PLANT_TO_SEED_RECORD[plantType];
   return getItemTypeSlot(hotbarInventory, searchItemType);
}

export function tickTribesman(tribesman: Entity): void {
   // @Cleanup: This is an absolutely massive function
   
   tickTribeMember(tribesman);

   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman.id);
   const tribeComponent = TribeComponentArray.getComponent(tribesman.id);

   tribesmanComponent.targetResearchBenchID = 0;
   tribesmanComponent.ticksSinceLastHelpRequest++;

   // As soon as the tribesman stops patrolling, clear the existing target patrol position.
   if (tribesmanComponent.currentAIType !== TribesmanAIType.patrolling) {
      tribesmanComponent.targetPatrolPositionX = -1;
   }

   // @Speed
   // Clear any previous assigned plan
   for (let i = 0; i < tribeComponent.tribe.buildingPlans.length; i++) {
      const plan = tribeComponent.tribe.buildingPlans[i];
      if (plan.assignedTribesmanID === tribesman.id) {
         plan.assignedTribesmanID = 0;
         break;
      }
   }

   // If recalled, go back to hut
   const hutID = tribesmanComponent.hutID;
   if (hutID !== 0) {
      if (typeof Board.entityRecord[hutID] === "undefined") {
         tribesmanComponent.hutID = 0;
      } else {
         const hutComponent = HutComponentArray.getComponent(hutID);
         if (hutComponent.isRecalling) {
            const hut = Board.entityRecord[hutID]!;
            pathfindToPosition(tribesman, hut.position.x, hut.position.y, hut.id, TribesmanPathType.default, Math.floor(50 / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.returnEmpty);
            
            if (entitiesAreColliding(tribesman, hut) !== CollisionVars.NO_COLLISION) {
               tribesman.destroy();
            }

            const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman.id);
            setLimbActions(inventoryUseComponent, LimbAction.none);
            
            return;
         }
      }
   }

   const inventoryComponent = InventoryComponentArray.getComponent(tribesman.id);

   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);
   const armourInventory = getInventory(inventoryComponent, InventoryName.armourSlot);

   // Automatically equip armour from the hotbar
   if (typeof armourInventory.itemSlots[1] === "undefined") {
      for (let i = 0; i < hotbarInventory.items.length; i++) {
         const item = hotbarInventory.items[i];
         if (ITEM_TYPE_RECORD[item.type] === "armour") {
            armourInventory.addItem(item, 1);

            // Remove from hotbar
            const itemSlot = hotbarInventory.getItemSlot(item);
            hotbarInventory.removeItem(itemSlot);
            break;
         }
      }
   }

   const aiHelperComponent = AIHelperComponentArray.getComponent(tribesman.id);

   // @Cleanup: A nicer way to do this might be to sort the visible entities array based on the 'threat level' of each entity
   // @Cleanup: A perhaps combine the visible enemies and visible hostile mobs arrays?

   // Categorise visible entities
   const visibleEnemies = new Array<Entity>();
   const visibleEnemyBuildings = new Array<Entity>();
   const visibleHostileMobs = new Array<Entity>();
   const visibleItemEntities = new Array<Entity>();
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];

      // @Temporary: may want to reintroduce
      // But use paths instead!! :D
      // if (!entityIsAccessible(tribesman, entity)) {
      //    continue;
      // }

      switch (getEntityRelationship(tribesman.id, entity)) {
         case EntityRelationship.enemy: {
            visibleEnemies.push(entity);
            break;
         }
         case EntityRelationship.enemyBuilding: {
            visibleEnemyBuildings.push(entity);
            break;
         }
         case EntityRelationship.hostileMob: {
            visibleHostileMobs.push(entity);
            break;
         }
         case EntityRelationship.neutral: {
            if (entity.type === EntityType.itemEntity) {
               visibleItemEntities.push(entity);
            }
            break;
         }
      }
   }

   // Escape from enemies when low on health
   const healthComponent = HealthComponentArray.getComponent(tribesman.id);
   if (tribesmanShouldEscape(tribesman.type, healthComponent) && (visibleEnemies.length > 0 || visibleHostileMobs.length > 0)) {
      escape(tribesman, visibleEnemies, visibleHostileMobs);

      if (tribesman.ageTicks % MESSAGE_INTERVAL_TICKS === 0) {
         const communicationTargets = getCommunicationTargets(tribesman);
         sendHelpMessage(tribesman, communicationTargets);
      }

      const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman.id);
      setLimbActions(inventoryUseComponent, LimbAction.none);

      tribesmanComponent.currentAIType = TribesmanAIType.escaping;
      return;
   }

   // @Speed
   // If the player is interacting with the tribesman, move towards the player
   for (const entity of aiHelperComponent.visibleEntities) {
      if (entity.type !== EntityType.player) {
         continue;
      }

      const playerComponent = PlayerComponentArray.getComponent(entity.id);
      if (playerComponent.interactingEntityID === tribesman.id) {
         const physicsComponent = PhysicsComponentArray.getComponent(tribesman.id);

         const distance = tribesman.position.calculateDistanceBetween(entity.position);
         if (willStopAtDesiredDistance(physicsComponent, 80, distance)) {
            physicsComponent.acceleration.x = 0;
            physicsComponent.acceleration.y = 0;
         } else {
            physicsComponent.acceleration.x = getAcceleration(tribesman.id) * Math.sin(tribesman.rotation);
            physicsComponent.acceleration.y = getAcceleration(tribesman.id) * Math.cos(tribesman.rotation);
         }

         physicsComponent.targetRotation = tribesman.position.calculateAngleBetween(entity.position);
         physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;

         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman.id);
         const useInfo = getInventoryUseInfo(inventoryUseComponent, InventoryName.hotbar);
         
         tribesmanComponent.currentAIType = TribesmanAIType.idle;
         useInfo.action = LimbAction.none;
         clearTribesmanPath(tribesman);
         return;
      }
   }

   // If the tribesman doesn't have a hut, try to look for one
   if (tribesmanComponent.hutID === 0) {
      const availableHut = getAvailableHut(tribeComponent.tribe);
      if (availableHut !== null) {
         const isPathfinding = pathfindToPosition(tribesman, availableHut.position.x, availableHut.position.y, availableHut.id, TribesmanPathType.default, Math.floor(32 / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.returnEmpty);

         if (entitiesAreColliding(tribesman, availableHut) !== CollisionVars.NO_COLLISION) {
            tribesmanComponent.hutID = availableHut.id;
            
            const hutComponent = HutComponentArray.getComponent(availableHut.id);
            hutComponent.hasTribesman = true;
         }
         
         if (isPathfinding) {
            return;
         }
      }
   }
      
   // Attack enemies
   if (visibleEnemies.length > 0) {
      const target = getClosestAccessibleEntity(tribesman, visibleEnemies);
      tribesmanComponent.huntedEntityID = target.id;
      huntEntity(tribesman, target, true);
      
      if (tribesman.ageTicks % MESSAGE_INTERVAL_TICKS === 0) {
         const communcationTargets = getCommunicationTargets(tribesman);
         sendCallToArmsMessage(tribesman, communcationTargets, target);
      }
      return;
   }

   // // @Temporary? Do we keep?
   // // Continue hunting existing entity
   // if (tribesmanShouldEscape(tribesman.type, healthComponent) || (tribesmanComponent.huntedEntityID !== 0 && !Board.entityRecord.hasOwnProperty(tribesmanComponent.huntedEntityID))) {
   //    tribesmanComponent.huntedEntityID = 0;
   // }

   // if (tribesmanComponent.huntedEntityID !== 0) {
   //    const huntedEntity = Board.entityRecord[tribesmanComponent.huntedEntityID];
      
   //    const distance = getDistanceFromPointToEntity(tribesman.position.x, tribesman.position.y, huntedEntity) - getRadius(tribesman);
   //    if (distance > getHuntingVisionRange(tribesman)) {
   //       tribesmanComponent.huntedEntityID = 0;
   //    } else {
   //       huntEntity(tribesman, huntedEntity, true);
   //    }
   //    return;
   // }
   
   // Attack hostile mobs
   if (visibleHostileMobs.length > 0) {
      const target = getClosestAccessibleEntity(tribesman, visibleHostileMobs);
      huntEntity(tribesman, target, true);

      // @Cleanup: Copy and paste from hunting enemies section
      if (tribesman.ageTicks % MESSAGE_INTERVAL_TICKS === 0) {
         const communcationTargets = getCommunicationTargets(tribesman);
         sendCallToArmsMessage(tribesman, communcationTargets, target);
      }
      return;
   }

   // Help other tribesmen
   if (tribesmanComponent.ticksSinceLastHelpRequest <= Vars.HELP_TIME) {
      const isPathfinding = pathfindToPosition(tribesman, tribesmanComponent.helpX, tribesmanComponent.helpY, 0, TribesmanPathType.default, Math.floor(100 / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.returnClosest);
      
      if (isPathfinding) {
         tribesmanComponent.currentAIType = TribesmanAIType.assistingOtherTribesmen;
         
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman.id);
         setLimbActions(inventoryUseComponent, LimbAction.none);
         return;
      }
   }
   
   // // Attack enemy buildings
   if (visibleEnemyBuildings.length > 0) {
      huntEntity(tribesman, getClosestAccessibleEntity(tribesman, visibleEnemyBuildings), true);
      return;
   }

   // Heal when missing health
   if (healthComponent.health < healthComponent.maxHealth) {
      const foodItemSlot = getFoodItemSlot(tribesman);
      if (foodItemSlot !== -1) {
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman.id);
         const useInfo = getInventoryUseInfo(inventoryUseComponent, InventoryName.hotbar);
         useInfo.selectedItemSlot = foodItemSlot;

         const foodItem = hotbarInventory.itemSlots[foodItemSlot]!;
         const itemInfo = ITEM_INFO_RECORD[foodItem.type] as ConsumableItemInfo;

         let action: LimbAction;
         switch (itemInfo.consumableItemCategory) {
            case ConsumableItemCategory.food: {
               action = LimbAction.eat;
               break;
            }
            case ConsumableItemCategory.medicine: {
               action = LimbAction.useMedicine;
               break;
            }
         }
         
         // If the food is only just being eaten, reset the food timer so that the food isn't immediately eaten
         if (useInfo.action !== action) {
            useInfo.foodEatingTimer = itemInfo.consumeTime;
         }
         
         const physicsComponent = PhysicsComponentArray.getComponent(tribesman.id);
         stopEntity(physicsComponent);
         
         useInfo.action = action;
         tribesmanComponent.currentAIType = TribesmanAIType.eating;
         return;
      }
   }

   // @Incomplete: Doesn't work if hammer is in offhand
   const hammerItemSlot = getBestHammerItemSlot(hotbarInventory);
   if (hammerItemSlot !== 0) {
      const isRepairing = attemptToRepairBuildings(tribesman);
      if (isRepairing) {
         return;
      }
      
      // 
      // Help work on blueprints
      // 
      
      // @Cleanup: Move messy logic out of main function
      // @Speed: Loops through all visible entities
      let closestBlueprint: Entity | undefined;
      let minDistance = Number.MAX_SAFE_INTEGER;
      for (const entity of aiHelperComponent.visibleEntities) {
         if (entity.type !== EntityType.blueprintEntity) {
            continue;
         }

         const distance = tribesman.position.calculateDistanceBetween(entity.position);
         if (distance < minDistance) {
            closestBlueprint = entity;
            minDistance = distance;
         }
      }

      if (typeof closestBlueprint !== "undefined") {
         const targetDirection = tribesman.position.calculateAngleBetween(closestBlueprint.position);

         const desiredAttackRange = getTribesmanDesiredAttackRange(tribesman);
         const physicsComponent = PhysicsComponentArray.getComponent(tribesman.id);
         
         // @Incomplete: use pathfinding
         // @Cleanup: Copy and pasted from huntEntity. Should be combined into its own function
         const distance = getDistanceFromPointToEntity(tribesman.position, closestBlueprint) - getTribesmanRadius(tribesman);
         if (willStopAtDesiredDistance(physicsComponent, desiredAttackRange - 20, distance)) {
            // If the tribesman will stop too close to the target, move back a bit
            physicsComponent.acceleration.x = getTribesmanSlowAcceleration(tribesman.id) * Math.sin(tribesman.rotation + Math.PI);
            physicsComponent.acceleration.y = getTribesmanSlowAcceleration(tribesman.id) * Math.cos(tribesman.rotation + Math.PI);
         } else if (willStopAtDesiredDistance(physicsComponent, desiredAttackRange, distance)) {
            stopEntity(physicsComponent);
         } else {
            // Too far away; move closer
            physicsComponent.acceleration.x = getAcceleration(tribesman.id) * Math.sin(targetDirection);
            physicsComponent.acceleration.y = getAcceleration(tribesman.id) * Math.cos(targetDirection);
         }

         physicsComponent.targetRotation = targetDirection;
         physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;

         // Select the hammer item slot
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman.id);
         const useInfo = getInventoryUseInfo(inventoryUseComponent, InventoryName.hotbar);
         useInfo.selectedItemSlot = hammerItemSlot;
         setLimbActions(inventoryUseComponent, LimbAction.none);

         // Find the target
         const targets = calculateRadialAttackTargets(tribesman, getTribesmanAttackOffset(tribesman), getTribesmanAttackRadius(tribesman));
         if (targets.includes(closestBlueprint)) {
            const useInfo = getInventoryUseInfo(inventoryUseComponent, InventoryName.hotbar);
            repairBuilding(tribesman, closestBlueprint, useInfo.selectedItemSlot, InventoryName.hotbar);
         }
         
         return;
      }
   }

   // Try to recuit other tribesmen
   const recruitTarget = getRecruitTarget(tribesman, aiHelperComponent.visibleEntities);
   if (recruitTarget !== null) {
      const targetTribesmanComponent = TribesmanAIComponentArray.getComponent(recruitTarget.id);
      const relation = targetTribesmanComponent.tribesmanRelations[tribesman.id];
      
      // @Cleanup: hardcoded val '50'
      if (typeof relation !== "undefined" && relation >= 50) {
         // Try to recruit the target
         
         const recruitRange = 50;
         const distance = getDistanceFromPointToEntity(tribesman.position, recruitTarget);
         if (distance <= recruitRange) {
            recruitTribesman(recruitTarget, tribeComponent.tribe);
         } else {
            pathfindToPosition(tribesman, recruitTarget.position.x, recruitTarget.position.y, recruitTarget.id, TribesmanPathType.default, Math.floor(recruitRange / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.returnClosest)
            
            const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman.id);
            setLimbActions(inventoryUseComponent, LimbAction.none);
            tribesmanComponent.currentAIType = TribesmanAIType.recruiting;
            return;
         }
      } else {
         // Try to gift items to the tribesman
         const giftItemSlot = getGiftableItemSlot(tribesman);
         if (giftItemSlot !== 0) {
            const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman.id);
            const useInfo = getInventoryUseInfo(inventoryUseComponent, InventoryName.hotbar);
            useInfo.selectedItemSlot = giftItemSlot;
   
            // Swap to that item slot
            const physicsComponent = PhysicsComponentArray.getComponent(tribesman.id);
            const distance = getDistanceFromPointToEntity(tribesman.position, recruitTarget);
            
            // @Incomplete: account for tribesman radius
            const giftRange = 50;
            if (willStopAtDesiredDistance(physicsComponent, giftRange, distance)) {
               if (willStopAtDesiredDistance(physicsComponent, giftRange - 20, distance)) {
                  physicsComponent.acceleration.x = getTribesmanSlowAcceleration(tribesman.id) * Math.sin(tribesman.rotation + Math.PI);
                  physicsComponent.acceleration.y = getTribesmanSlowAcceleration(tribesman.id) * Math.cos(tribesman.rotation + Math.PI);
               } else {
                  stopEntity(physicsComponent);
               }

               const targetDirection = tribesman.position.calculateAngleBetween(recruitTarget.position);

               physicsComponent.targetRotation = targetDirection;
               physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;
   
               if (Math.abs(getAngleDiff(targetDirection, tribesman.rotation)) < 0.1 && !itemThrowIsOnCooldown(tribesmanComponent)) {
                  const item = hotbarInventory.itemSlots[giftItemSlot]!;
                  throwItem(tribesman, InventoryName.hotbar, giftItemSlot, item.count, targetDirection);
               }
   
               setLimbActions(inventoryUseComponent, LimbAction.none);
               tribesmanComponent.currentAIType = TribesmanAIType.giftingItems;
               clearTribesmanPath(tribesman);
               
               return;
            } else {
               pathfindToPosition(tribesman, recruitTarget.position.x, recruitTarget.position.y, recruitTarget.id, TribesmanPathType.default, Math.floor(giftRange / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.returnClosest)
   
               setLimbActions(inventoryUseComponent, LimbAction.none);
               tribesmanComponent.currentAIType = TribesmanAIType.giftingItems;
               return;
            }
         }
      }
   }


   // @Temporary
   // If full inventory, haul resources back to barrel
   // if (inventoryIsFull(inventoryComponent, "hotbar")) {
   //    // Only look for/update path to barrel every second
   //    if (tribesman.ageTicks % Settings.TPS === 0) {
   //       const closestBarrel = findNearestBarrel(tribesman);
   //       if (closestBarrel !== null) {
   //          const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman.id);
   //          const useInfo = getInventoryUseInfo(inventoryUseComponent, "hotbar");
            
   //          const didPathfind = haulToBarrel(tribesman, closestBarrel);
   //          if (didPathfind) {
   //             tribesmanComponent.currentAIType = TribesmanAIType.haulingResources;
   //             useInfo.currentAction = LimbAction.none;
   //             return;
   //          }
   //       }
   //    } else if (tribesmanComponent.pathType === TribesmanPathType.haulingToBarrel) {
   //       continueCurrentPath(tribesman);
   //    }
   // }

   const goals = getTribesmanGoals(tribesman, hotbarInventory);

   // @Cleanup: don't use null
   const goal = goals.length > 0 ? goals[0] : null;
   tribesmanComponent.goals = goals;
   
   if (goal !== null) {
      // @Cleanup: messy
      if (goal.type === TribesmanGoalType.craftRecipe || goal.type === TribesmanGoalType.placeBuilding || goal.type === TribesmanGoalType.upgradeBuilding) {
         if (goal.isPersonalPlan && goal.plan !== null) {
            // @Cleanup: copy and paste
            if (tribesmanComponent.personalBuildingPlan !== null) {
               const idx = tribeComponent.tribe.personalBuildingPlans.indexOf(tribesmanComponent.personalBuildingPlan);
               if (idx !== -1) {
                  tribeComponent.tribe.personalBuildingPlans.splice(idx, 1);
               }
            }
   
            tribesmanComponent.personalBuildingPlan = goal.plan;
            tribeComponent.tribe.personalBuildingPlans.push(goal.plan);
         } else {
            // @Cleanup: copy and paste
            if (tribesmanComponent.personalBuildingPlan !== null) {
               const idx = tribeComponent.tribe.personalBuildingPlans.indexOf(tribesmanComponent.personalBuildingPlan);
               if (idx !== -1) {
                  tribeComponent.tribe.personalBuildingPlans.splice(idx, 1);
               }
            }
            
            tribesmanComponent.personalBuildingPlan = null;
         }
         
         if (goal.plan !== null) {
            goal.plan.assignedTribesmanID = tribesman.id;
         }
      }
      
      switch (goal.type) {
         case TribesmanGoalType.craftRecipe: {
            if (inventoryComponentCanAffordRecipe(inventoryComponent, goal.recipe, InventoryName.hotbar)) {
               const isGoing = goCraftItem(tribesman, goal.recipe, tribeComponent.tribe);
               if (isGoing) {
                  return;
               }
            }
            break;
         }
         case TribesmanGoalType.placeBuilding: {
            const isGoing = goPlaceBuilding(tribesman, hotbarInventory, tribeComponent.tribe, goal);
            if (isGoing) {
               return;
            }
            break;
         }
         case TribesmanGoalType.upgradeBuilding: {
            goUpgradeBuilding(tribesman, goal);
            return;
         }
         case TribesmanGoalType.researchTech: {
            if (tribeComponent.tribe.techRequiresResearching(goal.tech)) {
               const isGoing = goResearchTech(tribesman, goal.tech);
               if (isGoing) {
                  return;
               }
            }
            break;
         }
      }
   }

   // @Speed: shouldn't have to run for tribesmen which can't research
   // Research
   if (tribeComponent.tribe.selectedTechID !== null && tribeComponent.tribe.techRequiresResearching(getTechByID(tribeComponent.tribe.selectedTechID)) && tribesman.type === EntityType.tribeWorker) {
      const isGoing = goResearchTech(tribesman, getTechByID(tribeComponent.tribe.selectedTechID));
      if (isGoing) {
         return;
      }
   }

   const prioritisedItemTypes = goal !== null && goal.type === TribesmanGoalType.gatherItems ? goal.itemTypesToGather : [];
   const gatherTargetInfo = getGatherTarget(tribesman, aiHelperComponent.visibleEntities, prioritisedItemTypes);

   // Pick up dropped items
   // @Temporary
   if (visibleItemEntities.length > 0) {
      const goalRadius = getTribesmanRadius(tribesman);
      
      let closestDroppedItem: Entity | undefined;
      let minDistance = Number.MAX_SAFE_INTEGER;
      for (const itemEntity of visibleItemEntities) {
         // If the tribesman is within the escape health threshold, make sure there wouldn't be any enemies visible while picking up the dropped item
         if (tribesmanShouldEscape(tribesman.type, healthComponent) && !positionIsSafeForTribesman(tribesman, itemEntity.position.x, itemEntity.position.y)) {
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

      if (typeof closestDroppedItem !== "undefined") {
         // @Temporary
         // pathfindToPosition(tribesman, closestDroppedItem.position.x, closestDroppedItem.position.y, closestDroppedItem.id, TribesmanPathType.default, Math.floor(32 / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.throwError);
         pathfindToPosition(tribesman, closestDroppedItem.position.x, closestDroppedItem.position.y, closestDroppedItem.id, TribesmanPathType.default, Math.floor((32 + VACUUM_RANGE) / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.returnClosest);

         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman.id);
         setLimbActions(inventoryUseComponent, LimbAction.none);
         
         tribesmanComponent.currentAIType = TribesmanAIType.pickingUpDroppedItems;
         return;
      }
   }

   // Use items in research
   // @Hack
   if (goals.length >= 2 && goal!.type === TribesmanGoalType.gatherItems && goals[1].type === TribesmanGoalType.researchTech) {
      const researchGoal = goals[1];
      
      // @Incomplete: take into account backpack
      for (let itemSlot = 1; itemSlot <= hotbarInventory.width * hotbarInventory.height; itemSlot++) {
         const item = hotbarInventory.itemSlots[itemSlot];
         if (typeof item === "undefined") {
            continue;
         }


         const amountUsed = tribeComponent.tribe.useItemInTechResearch(researchGoal.tech, item.type, item.count);
         if (amountUsed > 0) {
            consumeItemFromSlot(hotbarInventory, itemSlot, amountUsed);
         }
      }

      if (tribeComponent.tribe.techIsComplete(researchGoal.tech)) {
         tribeComponent.tribe.unlockTech(researchGoal.tech.id);
      }
   }

   // Replace plants in planter boxes
   // @Speed
   {
      let closestReplantablePlanterBox: Entity | undefined;
      let seedItemSlot: number | undefined;
      let minDist = Number.MAX_SAFE_INTEGER;
      for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
         const entity = aiHelperComponent.visibleEntities[i];
         if (entity.type !== EntityType.planterBox) {
            continue;
         }
   
         const planterBoxComponent = PlanterBoxComponentArray.getComponent(entity.id);
         if (planterBoxComponent.replantType === null) {
            continue;
         }

         const plant = Board.entityRecord[planterBoxComponent.plantEntityID];
         if (typeof plant !== "undefined") {
            continue;
         }

         const currentSeedItemSlot = getSeedItemSlot(hotbarInventory, planterBoxComponent.replantType);
         if (currentSeedItemSlot === null) {
            continue;
         }

         const dist = tribesman.position.calculateDistanceBetween(entity.position);
         if (dist < minDist) {
            minDist = dist;
            closestReplantablePlanterBox = entity;
            seedItemSlot = currentSeedItemSlot;
         }
      }

      if (typeof closestReplantablePlanterBox !== "undefined") {
         // Select the seed
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman.id);
         const hotbarUseInfo = getInventoryUseInfo(inventoryUseComponent, InventoryName.hotbar);
         hotbarUseInfo.selectedItemSlot = seedItemSlot!;
         
         const physicsComponent = PhysicsComponentArray.getComponent(tribesman.id);

         // @Cleanup: copy and pasted from tribesman-combat-ai
         const desiredDistance = getTribesmanAttackRadius(tribesman);
         const distance = getDistanceFromPointToEntity(tribesman.position, closestReplantablePlanterBox) - getTribesmanRadius(tribesman);
         if (willStopAtDesiredDistance(physicsComponent, desiredDistance, distance)) {
            // @Incomplete: turn to face direction and then place
            
            // @Cleanup: copy and pasted from player replant logic
   
            const planterBoxComponent = PlanterBoxComponentArray.getComponent(closestReplantablePlanterBox.id);
            placePlantInPlanterBox(closestReplantablePlanterBox, planterBoxComponent.replantType!);

            // Consume the item
            const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman.id);
            const hotbarUseInfo = getInventoryUseInfo(inventoryUseComponent, InventoryName.hotbar);
            const hotbarInventory = hotbarUseInfo.inventory;

            consumeItemFromSlot(hotbarInventory, hotbarUseInfo.selectedItemSlot, 1);
         } else {
            const pointDistance = tribesman.position.calculateDistanceBetween(closestReplantablePlanterBox.position);
            const targetDirectRadius = pointDistance - distance;

            const goalRadius = Math.floor((desiredDistance + targetDirectRadius) / PathfindingSettings.NODE_SEPARATION);
            // @Temporary: failure default
            // pathfindToPosition(tribesman, closestReplantablePlanterBox.position.x, closestReplantablePlanterBox.position.y, closestReplantablePlanterBox.id, TribesmanPathType.default, goalRadius, PathfindFailureDefault.throwError);
            pathfindToPosition(tribesman, closestReplantablePlanterBox.position.x, closestReplantablePlanterBox.position.y, closestReplantablePlanterBox.id, TribesmanPathType.default, goalRadius, PathfindFailureDefault.returnClosest);

            tribesmanComponent.currentAIType = TribesmanAIType.planting;
            setLimbActions(inventoryUseComponent, LimbAction.none);

            return;
         }
      }
   }

   // Gather resources
   if (gatherTargetInfo.target !== null) {
      huntEntity(tribesman, gatherTargetInfo.target, false);
      return;
   }

   // @Cleanup: Remove once all paths set their limb actions
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman.id);
   setLimbActions(inventoryUseComponent, LimbAction.none);

   // Grab food from barrel
   if (getFoodItemSlot(tribesman) === -1 && !inventoryIsFull(hotbarInventory)) {
      let closestBarrelWithFood: Entity | undefined;
      let minDist = Number.MAX_SAFE_INTEGER;
      for (const entity of aiHelperComponent.visibleEntities) {
         if (entity.type === EntityType.barrel) {
            const distance = tribesman.position.calculateDistanceBetween(entity.position);
            if (distance < minDist && barrelHasFood(entity)) {
               minDist = distance;
               closestBarrelWithFood = entity;
            }
         }
      }
      if (typeof closestBarrelWithFood !== "undefined") {
         if (tribesman.position.calculateDistanceBetween(closestBarrelWithFood.position) > BARREL_INTERACT_DISTANCE) {
            pathfindToPosition(tribesman, closestBarrelWithFood.position.x, closestBarrelWithFood.position.y, closestBarrelWithFood.id, TribesmanPathType.default, Math.floor(BARREL_INTERACT_DISTANCE / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.returnEmpty);
         } else {
            const physicsComponent = PhysicsComponentArray.getComponent(tribesman.id);
            stopEntity(physicsComponent);
            
            grabBarrelFood(tribesman, closestBarrelWithFood);
            clearTribesmanPath(tribesman);
         }
         tribesmanComponent.currentAIType = TribesmanAIType.grabbingFood;
         return;
      }
   }

   // If nothing else to do, patrol tribe area
   if (tribesmanComponent.targetPatrolPositionX === -1 && Math.random() < 0.3 / Settings.TPS) {
      // const patrolPosition = generatePatrolPosition(tribesman, tribeComponent.tribe, goal);
      const patrolPosition = generatePatrolPosition(tribesman, tribeComponent.tribe, null);
      if (patrolPosition !== null) {
         const didPathfind = pathfindToPosition(tribesman, patrolPosition.x, patrolPosition.y, 0, TribesmanPathType.default, 0, PathfindFailureDefault.returnEmpty);
         if (didPathfind) {
            // Patrol to that position
            tribesmanComponent.targetPatrolPositionX = patrolPosition.x;
            tribesmanComponent.targetPatrolPositionY = patrolPosition.y;
            tribesmanComponent.currentAIType = TribesmanAIType.patrolling;
            return;
         }
      }
   } else if (tribesmanComponent.targetPatrolPositionX !== -1) {
      const isPathfinding = continueCurrentPath(tribesman, tribesmanComponent.targetPatrolPositionX, tribesmanComponent.targetPatrolPositionY);

      // reset target patrol position when not patrolling
      
      if (!isPathfinding) {
         const physicsComponent = PhysicsComponentArray.getComponent(tribesman.id);
         stopEntity(physicsComponent);

         tribesmanComponent.currentAIType = TribesmanAIType.idle;
         tribesmanComponent.targetPatrolPositionX = -1
         clearTribesmanPath(tribesman);
         return;
      }
      
      tribesmanComponent.currentAIType = TribesmanAIType.patrolling;
      return;
   }

   // If all else fails, don't do anything
   const physicsComponent = PhysicsComponentArray.getComponent(tribesman.id);
   stopEntity(physicsComponent);

   tribesmanComponent.currentAIType = TribesmanAIType.idle;
   clearTribesmanPath(tribesman);
}

const escape = (tribesman: Entity, visibleEnemies: ReadonlyArray<Entity>, visibleHostileMobs: ReadonlyArray<Entity>): void => {
   // Calculate the escape position based on the position of all visible enemies
   let averageEnemyX = 0;
   let averageEnemyY = 0;
   for (let i = 0; i < visibleEnemies.length; i++) {
      const enemy = visibleEnemies[i];

      let distance = tribesman.position.calculateDistanceBetween(enemy.position);
      if (distance > getTribesmanVisionRange(tribesman)) {
         distance = getTribesmanVisionRange(tribesman);
      }
      const weight = Math.pow(1 - distance / getTribesmanVisionRange(tribesman) / 1.25, 0.5);

      const relativeX = (enemy.position.x - tribesman.position.x) * weight;
      const relativeY = (enemy.position.y - tribesman.position.y) * weight;

      averageEnemyX += relativeX + tribesman.position.x;
      averageEnemyY += relativeY + tribesman.position.y;
      // @Temporary: shouldn't occur, fix root cause
      if (isNaN(averageEnemyX) || isNaN(averageEnemyY)) {
         console.warn("NaN!");
         return;
      }
   }
   // @Cleanup: Copy and paste
   for (let i = 0; i < visibleHostileMobs.length; i++) {
      const enemy = visibleHostileMobs[i];

      let distance = tribesman.position.calculateDistanceBetween(enemy.position);
      if (distance > getTribesmanVisionRange(tribesman)) {
         distance = getTribesmanVisionRange(tribesman);
      }
      const weight = Math.pow(1 - distance / getTribesmanVisionRange(tribesman) / 1.25, 0.5);

      const relativeX = (enemy.position.x - tribesman.position.x) * weight;
      const relativeY = (enemy.position.y - tribesman.position.y) * weight;

      averageEnemyX += relativeX + tribesman.position.x;
      averageEnemyY += relativeY + tribesman.position.y;
      // @Temporary: shouldn't occur, fix root cause
      if (isNaN(averageEnemyX) || isNaN(averageEnemyY)) {
         console.warn("NaN!");
         return;
      }
   }
   averageEnemyX /= visibleEnemies.length + visibleHostileMobs.length;
   averageEnemyY /= visibleEnemies.length + visibleHostileMobs.length;

   // 
   // Run away from that position
   // 

   const runDirection = angle(averageEnemyX - tribesman.position.x, averageEnemyY - tribesman.position.y) + Math.PI;
   const physicsComponent = PhysicsComponentArray.getComponent(tribesman.id);

   physicsComponent.acceleration.x = getAcceleration(tribesman.id) * Math.sin(runDirection);
   physicsComponent.acceleration.y = getAcceleration(tribesman.id) * Math.cos(runDirection);
   physicsComponent.targetRotation = runDirection;
   physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;

   clearTribesmanPath(tribesman);
}

// @Cleanup: wrong file?
export function recruitTribesman(tribesman: Entity, newTribe: Tribe): void {
   const tribeComponent = TribeComponentArray.getComponent(tribesman.id);
   tribeComponent.tribe = newTribe;
}
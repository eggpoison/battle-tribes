import { PlanterBoxPlant, TribesmanAIType } from "webgl-test-shared/dist/components";
import { EntityType, LimbAction } from "webgl-test-shared/dist/entities";
import { Settings, PathfindingSettings } from "webgl-test-shared/dist/settings";
import { getTechByID } from "webgl-test-shared/dist/techs";
import { getAngleDiff } from "webgl-test-shared/dist/utils";
import Entity from "../../../Entity";
import { willStopAtDesiredDistance, stopEntity, getDistanceFromPointToEntity, getClosestAccessibleEntity } from "../../../ai-shared";
import { HealthComponentArray } from "../../../components/HealthComponent";
import { getInventory, addItemToInventory, consumeItemFromSlot, inventoryComponentCanAffordRecipe, inventoryIsFull, getItemTypeSlot, InventoryComponentArray, hasSpaceForRecipe } from "../../../components/InventoryComponent";
import { TribesmanAIComponentArray, TribesmanPathType, itemThrowIsOnCooldown } from "../../../components/TribesmanAIComponent";
import { tickTribeMember, calculateRadialAttackTargets, repairBuilding, throwItem, } from "../tribe-member";
import { InventoryUseComponentArray, getInventoryUseInfo, setLimbActions } from "../../../components/InventoryUseComponent";
import Board from "../../../Board";
import { AIHelperComponentArray } from "../../../components/AIHelperComponent";
import { EntityRelationship, TribeComponentArray, getEntityRelationship, recruitTribesman } from "../../../components/TribeComponent";
import { PathfindFailureDefault } from "../../../pathfinding";
import { PhysicsComponentArray } from "../../../components/PhysicsComponent";
import Tribe from "../../../Tribe";
import { TribesmanGoalType, getTribesmanGoals } from "./tribesman-goals";
import { CollisionVars, entitiesAreColliding } from "../../../collision";
import { huntEntity } from "./tribesman-combat-ai";
import { PlanterBoxComponentArray, placePlantInPlanterBox } from "../../../components/PlanterBoxComponent";
import { HutComponentArray } from "../../../components/HutComponent";
import { PlayerComponentArray } from "../../../components/PlayerComponent";
import { gatherResources, getGatherTarget, tribesmanGetItemPickupTarget, tribesmanGoPickupItemEntity } from "./tribesman-resource-gathering";
import { goResearchTech } from "./tribesman-researching";
import { clearTribesmanPath, getBestToolItemSlot, getTribesmanAcceleration, getTribesmanAttackOffset, getTribesmanAttackRadius, getTribesmanDesiredAttackRange, getTribesmanRadius, getTribesmanSlowAcceleration, pathfindToPosition } from "./tribesman-ai-utils";
import { attemptToRepairBuildings, goPlaceBuilding, goUpgradeBuilding } from "./tribesman-structures";
import { goCraftItem } from "./tribesman-crafting";
import { getGiftableItemSlot, getRecruitTarget } from "./tribesman-recruiting";
import { escapeFromEnemies, tribesmanShouldEscape } from "./tribesman-escaping";
import { continueTribesmanHealing, getHealingItemUseInfo } from "./tribesman-healing";
import { tribesmanDoPatrol } from "./tribesman-patrolling";
import { ItemType, InventoryName, Item, ITEM_TYPE_RECORD, ITEM_INFO_RECORD, ConsumableItemInfo, Inventory, ItemTypeString } from "webgl-test-shared/dist/items/items";

// @Cleanup: Move all of this to the TribesmanComponent file

const enum Vars {
   HELP_TIME = 10 * Settings.TPS
}

const BARREL_INTERACT_DISTANCE = 80;

export const TRIBESMAN_TURN_SPEED = 2 * Math.PI;

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
      escapeFromEnemies(tribesman, visibleEnemies, visibleHostileMobs);

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
            physicsComponent.acceleration.x = getTribesmanAcceleration(tribesman.id) * Math.sin(tribesman.rotation);
            physicsComponent.acceleration.y = getTribesmanAcceleration(tribesman.id) * Math.cos(tribesman.rotation);
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
      huntEntity(tribesman, target, true);
      
      if (tribesman.ageTicks % MESSAGE_INTERVAL_TICKS === 0) {
         const communcationTargets = getCommunicationTargets(tribesman);
         sendCallToArmsMessage(tribesman, communcationTargets, target);
      }
      return;
   }
   
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
   
   // Attack enemy buildings
   if (visibleEnemyBuildings.length > 0) {
      huntEntity(tribesman, getClosestAccessibleEntity(tribesman, visibleEnemyBuildings), true);
      return;
   }

   // Heal when missing health
   if (healthComponent.health < healthComponent.maxHealth) {
      const useInfo = getHealingItemUseInfo(tribesman.id);
      if (useInfo !== null) {
         continueTribesmanHealing(tribesman.id, useInfo);
         return;
      }
   }

   // @Incomplete: Doesn't work if hammer is in offhand
   const hammerItemSlot = getBestToolItemSlot(hotbarInventory, "hammer");
   if (hammerItemSlot !== null) {
      const isRepairing = attemptToRepairBuildings(tribesman, hammerItemSlot);
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
            physicsComponent.acceleration.x = getTribesmanAcceleration(tribesman.id) * Math.sin(targetDirection);
            physicsComponent.acceleration.y = getTribesmanAcceleration(tribesman.id) * Math.cos(targetDirection);
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

   // @Cleanup
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
      // @Cleanup: messy. this whole system kinda sucks
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
            // If not enough space, try to make space
            if (!hasSpaceForRecipe(inventoryComponent, goal.recipe, InventoryName.hotbar)) {
               // Just throw out any item which isn't used in the recipe
               let hasThrown = false;
               for (let i = 0; i < hotbarInventory.items.length; i++) {
                  const item = hotbarInventory.items[i];

                  if (goal.recipe.ingredients.getItemCount(item.type) === 0) {
                     const itemSlot = hotbarInventory.getItemSlot(item);
                     throwItem(tribesman, InventoryName.hotbar, itemSlot, item.count, tribesman.rotation);
                     hasThrown = true;
                     break;
                  }
               }

               if (!hasThrown) {
                  console.warn("couldn't throw");
                  console.log(hotbarInventory.itemSlots);
                  console.log(goal.recipe);
                  return;
               }
            }
            
            const isGoing = goCraftItem(tribesman, goal.recipe, tribeComponent.tribe);
            if (isGoing) {
               return;
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
         case TribesmanGoalType.gatherItems: {
            const isGathering = gatherResources(tribesman, goal.itemTypesToGather, visibleItemEntities);
            if (isGathering) {
               return;
            }
            // @Incomplete:
            // level 1) explore randomly if not gathering
            // level 2) remember which places the tribesman has been to and go there to get more of those resources
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

   // Use items in research
   // @Hack
   // instead make the research tech goal have 
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

   // If not in an AI tribe, try to gather any resources you can indiscriminantly
   if (!tribeComponent.tribe.isAIControlled) {
      const isGathering = gatherResources(tribesman, [], visibleItemEntities);
      if (isGathering) {
         return;
      }
   }

   // @Cleanup: Remove once all paths set their limb actions
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman.id);
   setLimbActions(inventoryUseComponent, LimbAction.none);

   // Grab food from barrel
   if (getHealingItemUseInfo(tribesman.id) === null && !inventoryIsFull(hotbarInventory)) {
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

   // Patrol tribe area
   const isPatrolling = tribesmanDoPatrol(tribesman, goal);
   if (isPatrolling) {
      return;
   }

   // If all else fails, don't do anything
   const physicsComponent = PhysicsComponentArray.getComponent(tribesman.id);
   stopEntity(physicsComponent);

   tribesmanComponent.currentAIType = TribesmanAIType.idle;
   clearTribesmanPath(tribesman);
}
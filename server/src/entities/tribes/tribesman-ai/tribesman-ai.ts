import { TribesmanAIType } from "../../../../../shared/dist/components.js";
import { Entity, EntityType, LimbAction } from "../../../../../shared/dist/entities.js";
import { InventoryName, Item, ITEM_TYPE_RECORD, ITEM_INFO_RECORD, ConsumableItemInfo } from "../../../../../shared/dist/items/items.js";
import { Settings, PathfindingSettings } from "../../../../../shared/dist/settings.js";
import { distance, polarVec2, angle, getAbsAngleDiff } from "../../../../../shared/dist/utils.js";
import { getTechByID } from "../../../../../shared/dist/techs.js";
import { willStopAtDesiredDistance, getDistanceFromPointToEntity, getClosestAccessibleEntity } from "../../../ai-shared.js";
import { HealthComponentArray } from "../../../components/HealthComponent.js";
import { getInventory, addItemToInventory, consumeItemFromSlot, inventoryIsFull, InventoryComponentArray, hasInventory } from "../../../components/InventoryComponent.js";
import { TribesmanAIComponentArray, TribesmanPathType } from "../../../components/TribesmanAIComponent.js";
import { InventoryUseComponentArray, setLimbActions } from "../../../components/InventoryUseComponent.js";
import { AIHelperComponentArray } from "../../../components/AIHelperComponent.js";
import { EntityRelationship, TribeComponentArray, getEntityRelationship } from "../../../components/TribeComponent.js";
import { PathfindFailureDefault } from "../../../pathfinding.js";
import Tribe from "../../../Tribe.js";
import { doMeleeAttack, goKillEntity } from "./tribesman-combat-ai.js";
import { HutComponentArray } from "../../../components/HutComponent.js";
import { PlayerComponentArray } from "../../../components/PlayerComponent.js";
import { goResearchTech } from "./tribesman-researching.js";
import { getBestHammerItemSlot, getTribesmanAcceleration, getTribesmanDesiredAttackRange, getHumanoidRadius, getTribesmanSlowAcceleration } from "./tribesman-ai-utils.js";
import { attemptToRepairBuildings } from "./tribesman-structures.js";
import { escapeFromEnemies, tribeMemberShouldEscape } from "./tribesman-escaping.js";
import { continueTribesmanHealing, getHealingItemUseInfo } from "./tribesman-healing.js";
import { TransformComponentArray } from "../../../components/TransformComponent.js";
import { destroyEntity, entityExists, getEntityAgeTicks, getEntityLayer, getEntityType } from "../../../world.js";
import { runPatrolAI } from "../../../ai/PatrolAI.js";
import { runAssignmentAI } from "../../../components/AIAssignmentComponent.js";
import { replantPlanterBoxes } from "./tribesman-replanting.js";
import { entitiesAreColliding, CollisionVars } from "../../../collision-detection.js";
import { applyAccelerationFromGround, turnHitboxToAngle } from "../../../hitboxes.js";
import { clearPathfinding, pathfindTribesman } from "../../../components/AIPathfindingComponent.js";

// @Cleanup: Move all of this to the TribesmanComponent file

const enum Vars {
   HELP_TIME = 10 * Settings.TICK_RATE
}

const BARREL_INTERACT_DISTANCE = 80;

export const TRIBESMAN_TURN_SPEED = 3 * Math.PI;

export const TRIBESMAN_COMMUNICATION_RANGE = 1000;

const MESSAGE_INTERVAL_TICKS = 2 * Settings.TICK_RATE;

const getCommunicationTargets = (tribesman: Entity): ReadonlyArray<Entity> => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.hitboxes[0];
   
   const layer = getEntityLayer(tribesman);
   
   const minChunkX = Math.max(Math.floor((tribesmanHitbox.box.posX - TRIBESMAN_COMMUNICATION_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((tribesmanHitbox.box.posX + TRIBESMAN_COMMUNICATION_RANGE) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);
   const minChunkY = Math.max(Math.floor((tribesmanHitbox.box.posY - TRIBESMAN_COMMUNICATION_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((tribesmanHitbox.box.posY + TRIBESMAN_COMMUNICATION_RANGE) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);

   const tribeComponent = TribeComponentArray.getComponent(tribesman);
   
   const communcationTargets: Array<Entity> = [];
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         for (let i = 0; i < chunk.entities.length; i++) {
            const entity = chunk.entities[i];
            if (entity === tribesman || !TribesmanAIComponentArray.hasComponent(entity)) {
               continue;
            }

            // Make sure the tribesman are of the same tribe
            const otherTribeComponent = TribeComponentArray.getComponent(entity);
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
   const targetTransformComponent = TransformComponentArray.getComponent(targetEntity);
   const targetHitbox = targetTransformComponent.hitboxes[0];
   
   for (let i = 0; i < communicationTargets.length; i++) {
      const currentTribesman = communicationTargets[i];

      const tribesmanComponent = TribesmanAIComponentArray.getComponent(currentTribesman);
      tribesmanComponent.helpX = targetHitbox.box.posX;
      tribesmanComponent.helpY = targetHitbox.box.posY;
      tribesmanComponent.ticksSinceLastHelpRequest = 0;
   }
}

const sendHelpMessage = (communicatingTribesman: Entity, communicationTargets: ReadonlyArray<Entity>): void => {
   const transformComponent = TransformComponentArray.getComponent(communicatingTribesman);
   const communicatingTribesmanHitbox = transformComponent.hitboxes[0];
   
   for (let i = 0; i < communicationTargets.length; i++) {
      const currentTribesman = communicationTargets[i];

      // @Cleanup: bad. should only change tribesman ai in that tribesman's tick function.
      const healthComponent = HealthComponentArray.getComponent(currentTribesman);
      if (!tribeMemberShouldEscape(getEntityType(currentTribesman), healthComponent)) {
         pathfindTribesman(currentTribesman, communicatingTribesmanHitbox.box.posX, communicatingTribesmanHitbox.box.posY, getEntityLayer(communicatingTribesman), communicatingTribesman, TribesmanPathType.tribesmanRequest, Math.floor(64 / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.none);
      }
   }
}

// @Cleanup: unused?
// const findNearestBarrel = (tribesman: Entity): Entity | null => {
//    const tribeComponent = TribeComponentArray.getComponent(tribesman.id);
   
//    let minDistance = Number.MAX_SAFE_INTEGER;
//    let closestBarrel: Entity | null = null;
//    for (const barrel of tribeComponent.tribe.barrels) {
//       const distance = tribesman.position.distanceTo(barrel.position);
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
//       if (item === undefined) {
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

//    if (tribesman.position.distanceTo(barrel.position) <= BARREL_INTERACT_DISTANCE) {
//       depositResources(tribesman, barrel);
//    }

//    return didPathfind;
// }

const grabBarrelFood = (tribesman: Entity, barrel: Entity): void => {
   // 
   // Grab the food stack with the highest total heal amount
   // 

   const barrelInventoryComponent = InventoryComponentArray.getComponent(barrel);
   const barrelInventory = getInventory(barrelInventoryComponent, InventoryName.inventory);

   let foodItemSlot = -1;
   let food: Item | undefined;
   let maxFoodValue = 0;
   for (let slotNum = 1; slotNum <= barrelInventory.width * barrelInventory.height; slotNum++) {
      const item = barrelInventory.itemSlots[slotNum];
      if (item === undefined) {
         continue;
      }
      
      // Skip non-food
      if (ITEM_TYPE_RECORD[item.type] !== "healing") {
         continue;
      }

      const foodValue = (ITEM_INFO_RECORD[item.type] as ConsumableItemInfo).healAmount * item.count;
      if (food === undefined || foodValue > maxFoodValue) {
         food = item;
         foodItemSlot = slotNum;
         maxFoodValue = foodValue;
      }
   }
   if (food === undefined) {
      throw new Error("Couldn't find a food item to grab.");
   }

   const tribesmanInventoryComponent = InventoryComponentArray.getComponent(tribesman);
   const hotbarInventory = getInventory(tribesmanInventoryComponent, InventoryName.hotbar);
   addItemToInventory(tribesman, hotbarInventory, food);
   consumeItemFromSlot(tribesman, barrelInventory, foodItemSlot, 999);
}

const barrelHasFood = (barrel: Entity): boolean => {
   const inventoryComponent = InventoryComponentArray.getComponent(barrel);
   const inventory = getInventory(inventoryComponent, InventoryName.inventory);

   for (let slotNum = 1; slotNum <= inventory.width * inventory.height; slotNum++) {
      const item = inventory.itemSlots[slotNum];
      if (item !== undefined) {
         if (ITEM_TYPE_RECORD[item.type] === "healing") {
            return true;
         }
      }
   }

   return false;
}

const findAvailableHut = (tribe: Tribe): Entity | null => {
   for (const hut of tribe.getEntitiesByType(EntityType.workerHut)) {
      const hutComponent = HutComponentArray.getComponent(hut);
      if (!hutComponent.hasTribesman) {
         return hut;
      }
   }

   // @Copynpaste
   for (const hut of tribe.getEntitiesByType(EntityType.warriorHut)) {
      const hutComponent = HutComponentArray.getComponent(hut);
      if (!hutComponent.hasTribesman) {
         return hut;
      }
   }
   
   return null;
}

// @Cleanup: Move to tribesmanAIComponent
export function tickTribesman(tribesman: Entity): void {
   // @Cleanup: This is an absolutely massive function
   
   const tribeComponent = TribeComponentArray.getComponent(tribesman);
   const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(tribesman);

   tribesmanAIComponent.targetResearchBenchID = 0;
   tribesmanAIComponent.ticksSinceLastHelpRequest++;

   // @Speed @Hack: ideally should be done once the crafting job is complete
   // @Hack: don't do logic based off the tribesman ai type
   if (tribesmanAIComponent.currentAIType === TribesmanAIType.crafting) {
      setLimbActions(InventoryUseComponentArray.getComponent(tribesman), LimbAction.none);
   }

   // If recalled, go back to hut
   const hut = tribesmanAIComponent.hut;
   if (hut !== 0) {
      if (!entityExists(hut)) {
         tribesmanAIComponent.hut = 0;
      } else {
         const hutComponent = HutComponentArray.getComponent(hut);
         if (hutComponent.isRecalling) {
            const hutTransformComponent = TransformComponentArray.getComponent(hut);
            const hutHitbox = hutTransformComponent.hitboxes[0];
            
            pathfindTribesman(tribesman, hutHitbox.box.posX, hutHitbox.box.posY, getEntityLayer(hut), hut, TribesmanPathType.default, Math.floor(50 / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.none);
            
            if (entitiesAreColliding(tribesman, hut) !== CollisionVars.NO_COLLISION) {
               destroyEntity(tribesman);
            }

            const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
            setLimbActions(inventoryUseComponent, LimbAction.none);
            
            return;
         }
      }
   }

   const inventoryComponent = InventoryComponentArray.getComponent(tribesman);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

   // Automatically equip armour from the hotbar
   // @Speed: only do when inventory changes
   if (hasInventory(inventoryComponent, InventoryName.armourSlot)) {
      const armourSlotInventory = getInventory(inventoryComponent, InventoryName.armourSlot);
      const armour = armourSlotInventory.itemSlots[1];
      if (armour === undefined) {
         for (let i = 0; i < hotbarInventory.items.length; i++) {
            const item = hotbarInventory.items[i];
            if (ITEM_TYPE_RECORD[item.type] === "armour") {
               armourSlotInventory.addItem(item, 1);
   
               // Remove from hotbar
               const itemSlot = hotbarInventory.getItemSlot(item);
               hotbarInventory.removeItem(itemSlot);
               break;
            }
         }
      }
   }

   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.hitboxes[0];
   
   const aiHelperComponent = AIHelperComponentArray.getComponent(tribesman);

   // @Cleanup: A nicer way to do this might be to sort the visible entities array based on the 'threat level' of each entity
   // @Cleanup: A perhaps combine the visible enemies and visible hostile mobs arrays?

   // @Speed: we could store these arrays on the entity, and then when an entity is added/removed from the
   // visible entities array we could also add/remove them to these.
   // Categorise visible entities
   const visibleEnemies: Array<Entity> = [];
   const visibleEnemyBuildings: Array<Entity> = [];
   const visibleHostileMobs: Array<Entity> = [];
   const visibleItemEntities: Array<Entity> = [];
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];

      // @Temporary: may want to reintroduce
      // But use paths instead!! :D
      // if (!entityIsAccessible(tribesman, entity)) {
      //    continue;
      // }

      switch (getEntityRelationship(tribesman, entity)) {
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
            if (getEntityType(entity) === EntityType.itemEntity) {
               visibleItemEntities.push(entity);
            }
            break;
         }
      }
   }

   const ageTicks = getEntityAgeTicks(tribesman);
   
   // Escape from enemies when low on health
   const healthComponent = HealthComponentArray.getComponent(tribesman);
   if (tribeMemberShouldEscape(getEntityType(tribesman), healthComponent) && (visibleEnemies.length > 0 || visibleHostileMobs.length > 0)) {
      escapeFromEnemies(tribesman, visibleEnemies, visibleHostileMobs);

      if (ageTicks % MESSAGE_INTERVAL_TICKS === 0) {
         const communicationTargets = getCommunicationTargets(tribesman);
         sendHelpMessage(tribesman, communicationTargets);
      }

      const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
      setLimbActions(inventoryUseComponent, LimbAction.none);

      tribesmanAIComponent.currentAIType = TribesmanAIType.escaping;
      return;
   }

   // @Speed: when the player interacts with the tribesman, set a variable in the tribesman
   // If the player is interacting with the tribesman, move towards the player
   for (const entity of aiHelperComponent.visibleEntities) {
      if (getEntityType(entity) !== EntityType.player) {
         continue;
      }

      const playerComponent = PlayerComponentArray.getComponent(entity);
      if (playerComponent.interactingEntityID === tribesman) {
         const entityTransformComponent = TransformComponentArray.getComponent(entity);
         const entityHitbox = entityTransformComponent.hitboxes[0];

         const dist = distance(tribesmanHitbox.box.posX, tribesmanHitbox.box.posY, entityHitbox.box.posX, entityHitbox.box.posY);
         if (!willStopAtDesiredDistance(tribesmanHitbox, 80, dist)) {
            const accM = getTribesmanAcceleration(tribesman);
            applyAccelerationFromGround(tribesmanHitbox, polarVec2(accM, tribesmanHitbox.box.angle));
         }

         const targetAngle = angle(entityHitbox.box.posX - tribesmanHitbox.box.posX, entityHitbox.box.posY - tribesmanHitbox.box.posY);
         turnHitboxToAngle(tribesmanHitbox, targetAngle, TRIBESMAN_TURN_SPEED, 0.5, false);

         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
         const useInfo = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
         
         tribesmanAIComponent.currentAIType = TribesmanAIType.idle;
         useInfo.action = LimbAction.none;
         clearPathfinding(tribesman);
         return;
      }
   }

   // If the tribesman doesn't have a hut, try to look for one
   if (tribesmanAIComponent.hut === 0) {
      const availableHut = findAvailableHut(tribeComponent.tribe);
      if (availableHut !== null) {
         const hutTransformComponent = TransformComponentArray.getComponent(availableHut);
         const hutHitbox = hutTransformComponent.hitboxes[0];
         
         const isFinished = pathfindTribesman(tribesman, hutHitbox.box.posX, hutHitbox.box.posY, getEntityLayer(availableHut), availableHut, TribesmanPathType.default, Math.floor(32 / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.none);

         if (entitiesAreColliding(tribesman, availableHut) !== CollisionVars.NO_COLLISION) {
            tribesmanAIComponent.hut = availableHut;
            
            const hutComponent = HutComponentArray.getComponent(availableHut);
            hutComponent.hasTribesman = true;
         }
         
         if (!isFinished) {
            return;
         }
      }
   }

   // @Cleanup: rename these into threats
      
   // Attack enemies
   if (visibleEnemies.length > 0) {
      const target = getClosestAccessibleEntity(tribesman, visibleEnemies);
      goKillEntity(tribesman, target, true);
      
      if (ageTicks % MESSAGE_INTERVAL_TICKS === 0) {
         const communcationTargets = getCommunicationTargets(tribesman);
         sendCallToArmsMessage(tribesman, communcationTargets, target);
      }
      return;
   }
   
   // Attack hostile mobs
   if (visibleHostileMobs.length > 0) {
      const target = getClosestAccessibleEntity(tribesman, visibleHostileMobs);
      goKillEntity(tribesman, target, true);

      // @Cleanup: Copy and paste from hunting enemies section
      if (ageTicks % MESSAGE_INTERVAL_TICKS === 0) {
         const communcationTargets = getCommunicationTargets(tribesman);
         sendCallToArmsMessage(tribesman, communcationTargets, target);
      }
      return;
   }

   // Help other tribesmen
   if (tribesmanAIComponent.ticksSinceLastHelpRequest <= Vars.HELP_TIME) {
      const isFinished = pathfindTribesman(tribesman, tribesmanAIComponent.helpX, tribesmanAIComponent.helpY, getEntityLayer(tribesman), 0, TribesmanPathType.default, Math.floor(100 / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.returnClosest);
      
      if (!isFinished) {
         tribesmanAIComponent.currentAIType = TribesmanAIType.assistingOtherTribesmen;
         
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
         setLimbActions(inventoryUseComponent, LimbAction.none);
         return;
      }
   }
   
   // Attack enemy buildings
   // @TEMPORARY
   // if (visibleEnemyBuildings.length > 0) {
   //    goKillEntity(tribesman, getClosestAccessibleEntity(tribesman, visibleEnemyBuildings), true);
   //    return;
   // }

   // Heal when missing health
   if (healthComponent.health < healthComponent.maxHealth) {
      const useInfo = getHealingItemUseInfo(tribesman);
      if (useInfo !== null) {
         continueTribesmanHealing(tribesman, useInfo);
         return;
      }
   }

   // @Incomplete: Doesn't work if hammer is in offhand
   const hammerItemSlot = getBestHammerItemSlot(hotbarInventory);
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
         if (getEntityType(entity) !== EntityType.blueprintEntity) {
            continue;
         }

         const entityTransformComponent = TransformComponentArray.getComponent(entity);
         const entityHitbox = entityTransformComponent.hitboxes[0];
         
         const dist = distance(tribesmanHitbox.box.posX, tribesmanHitbox.box.posY, entityHitbox.box.posX, entityHitbox.box.posY);
         if (dist < minDistance) {
            closestBlueprint = entity;
            minDistance = dist;
         }
      }

      if (closestBlueprint !== undefined) {
         const blueprintTransformComponent = TransformComponentArray.getComponent(closestBlueprint);
         const blueprintHitbox = blueprintTransformComponent.hitboxes[0];
         
         const targetDir = angle(blueprintHitbox.box.posX - tribesmanHitbox.box.posX, blueprintHitbox.box.posY - tribesmanHitbox.box.posY);

         const desiredAttackRange = getTribesmanDesiredAttackRange() - getHumanoidRadius(transformComponent);
         
         // @Incomplete: use pathfinding
         // @Cleanup: Copy and pasted from huntEntity. Should be combined into its own function
         const distance = getDistanceFromPointToEntity(tribesmanHitbox.box.posX, tribesmanHitbox.box.posY, blueprintTransformComponent) - getHumanoidRadius(transformComponent);
         if (willStopAtDesiredDistance(tribesmanHitbox, desiredAttackRange - 20, distance)) {
            // If the tribesman will stop too close to the target, move back a bit
            const acceleration = getTribesmanSlowAcceleration(tribesman);
            applyAccelerationFromGround(tribesmanHitbox, polarVec2(acceleration, tribesmanHitbox.box.angle + Math.PI));
         } else if (!willStopAtDesiredDistance(tribesmanHitbox, desiredAttackRange, distance)) {
            // Too far away, move closer
            const acceleration = getTribesmanAcceleration(tribesman);
            applyAccelerationFromGround(tribesmanHitbox, polarVec2(acceleration, targetDir));
         }

         turnHitboxToAngle(tribesmanHitbox, targetDir, TRIBESMAN_TURN_SPEED, 0.5, false);

         // Select the hammer item slot
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
         const useInfo = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
         useInfo.selectedItemSlot = hammerItemSlot;

         if (getAbsAngleDiff(tribesmanHitbox.box.angle, targetDir) < 0.1) {
            doMeleeAttack(tribesman, hammerItemSlot);
         }
         
         return;
      }
   }

   // @Cleanup
   // Try to recuit other tribesmen
   // const recruitTarget = getRecruitTarget(tribesman, aiHelperComponent.visibleEntities);
   // if (recruitTarget !== null) {
   //    const targetTribesmanComponent = TribesmanAIComponentArray.getComponent(recruitTarget);
   //    const relation = targetTribesmanComponent.tribesmanRelations[tribesman];
      
   //    // @Cleanup: hardcoded val '50'
   //    if (relation !== undefined && relation >= 50) {
   //       // Try to recruit the target
         
   //       const recruitRange = 50;
   //       const distance = getDistanceFromPointToEntity(transformComponent.position, recruitTarget);
   //       if (distance <= recruitRange) {
   //          recruitTribesman(recruitTarget, tribeComponent.tribe);
   //       } else {
   //          const targetTransformComponent = TransformComponentArray.getComponent(recruitTarget);
            
   //          pathfindTribesman(tribesman, targetTransformComponent.position.x, targetTransformComponent.position.y, getEntityLayer(recruitTarget), recruitTarget, TribesmanPathType.default, Math.floor(recruitRange / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.returnClosest)
            
   //          const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
   //          setLimbActions(inventoryUseComponent, LimbAction.none);
   //          tribesmanAIComponent.currentAIType = TribesmanAIType.recruiting;
   //          return;
   //       }
   //    } else {
   //       // Try to gift items to the tribesman
   //       const giftItemSlot = getGiftableItemSlot(tribesman);
   //       if (giftItemSlot !== 0) {
   //          const targetTransformComponent = TransformComponentArray.getComponent(recruitTarget);

   //          const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
   //          const useInfo = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
   //          useInfo.selectedItemSlot = giftItemSlot;
   
   //          // Swap to that item slot
   //          const physicsComponent = PhysicsComponentArray.getComponent(tribesman);
   //          const distance = getDistanceFromPointToEntity(transformComponent.position, recruitTarget);
            
   //          // @Incomplete: account for tribesman radius
   //          const giftRange = 50;
   //          if (willStopAtDesiredDistance(physicsComponent, giftRange, distance)) {
   //             if (willStopAtDesiredDistance(physicsComponent, giftRange - 20, distance)) {
   //                physicsComponent.acceleration.x = getTribesmanSlowAcceleration(tribesman) * Math.sin(transformComponent.rotation + Math.PI);
   //                physicsComponent.acceleration.y = getTribesmanSlowAcceleration(tribesman) * Math.cos(transformComponent.rotation + Math.PI);
   //             } else {
   //                stopEntity(physicsComponent);
   //             }
               
   //             const targetDirection = transformComponent.position.angleTo(targetTransformComponent.position);

   //             physicsComponent.targetRotation = targetDirection;
   //             physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;
   
   //             if (Math.abs(getAngleDiff(targetDirection, transformComponent.rotation)) < 0.1 && !itemThrowIsOnCooldown(tribesmanAIComponent)) {
   //                const item = hotbarInventory.itemSlots[giftItemSlot]!;
   //                throwItem(tribesman, InventoryName.hotbar, giftItemSlot, item.count, targetDirection);
   //             }
   
   //             setLimbActions(inventoryUseComponent, LimbAction.none);
   //             tribesmanAIComponent.currentAIType = TribesmanAIType.giftingItems;
   //             clearTribesmanPath(tribesman);
               
   //             return;
   //          } else {
   //             pathfindTribesman(tribesman, targetTransformComponent.position.x, targetTransformComponent.position.y, getEntityLayer(recruitTarget), recruitTarget, TribesmanPathType.default, Math.floor(giftRange / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.returnClosest)
   
   //             setLimbActions(inventoryUseComponent, LimbAction.none);
   //             tribesmanAIComponent.currentAIType = TribesmanAIType.giftingItems;
   //             return;
   //          }
   //       }
   //    }
   // }


   // @Temporary
   // If full inventory, haul resources back to barrel
   // if (inventoryIsFull(inventoryComponent, "hotbar")) {
   //    // Only look for/update path to barrel every second
   //    if (tribesman.ageTicks % Settings.TICK_RATE === 0) {
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

   const isDoingAssignments = runAssignmentAI(tribesman, visibleItemEntities);
   if (isDoingAssignments) {
      return;
   }

   // @Cleanup: combine this with the one above
   // @Speed: shouldn't have to run for tribesmen which can't research
   // Research
   if (tribeComponent.tribe.selectedTechID !== null && tribeComponent.tribe.techRequiresResearching(getTechByID(tribeComponent.tribe.selectedTechID)) && getEntityType(tribesman) === EntityType.tribeWorker) {
      goResearchTech(tribesman, getTechByID(tribeComponent.tribe.selectedTechID));
      return;
   }

   const isReplanting = replantPlanterBoxes(tribesman, aiHelperComponent, transformComponent, hotbarInventory, tribesmanAIComponent);
   if (isReplanting) {
      return;
   }

   // If not in an AI tribe, try to gather any resources you can indiscriminantly
   // @Incomplete
   // if (!tribeComponent.tribe.isAIControlled) {
   //    // @Speed?
   //    for (const itemType of ALL_ITEM_TYPES) {
   //       const isGathering = gatherResource(tribesman, itemType, visibleItemEntities);
   //       if (isGathering) {
   //          return;
   //       }
   //    }
   // }

   // Grab food from barrel
   if (getHealingItemUseInfo(tribesman) === null && !inventoryIsFull(hotbarInventory)) {
      let closestBarrelWithFood: Entity | undefined;
      let minDist = Number.MAX_SAFE_INTEGER;
      for (const entity of aiHelperComponent.visibleEntities) {
         if (getEntityType(entity) === EntityType.barrel) {
            const entityTransformComponent = TransformComponentArray.getComponent(entity);
            const entityHitbox = entityTransformComponent.hitboxes[0];
            
            const dist = distance(tribesmanHitbox.box.posX, tribesmanHitbox.box.posY, entityHitbox.box.posX, entityHitbox.box.posY);
            if (dist < minDist && barrelHasFood(entity)) {
               minDist = dist;
               closestBarrelWithFood = entity;
            }
         }
      }
      if (closestBarrelWithFood !== undefined) {
         const barrelTransformComponent = TransformComponentArray.getComponent(closestBarrelWithFood);
         const barrelHitbox = barrelTransformComponent.hitboxes[0];
         
         if (distance(tribesmanHitbox.box.posX, tribesmanHitbox.box.posY, barrelHitbox.box.posX, barrelHitbox.box.posY) > BARREL_INTERACT_DISTANCE) {
            pathfindTribesman(tribesman, barrelHitbox.box.posX, barrelHitbox.box.posY, getEntityLayer(closestBarrelWithFood), closestBarrelWithFood, TribesmanPathType.default, Math.floor(BARREL_INTERACT_DISTANCE / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.none);
         } else {
            grabBarrelFood(tribesman, closestBarrelWithFood);
            // @Cleanup: not needed? When the tribesman finishes pathfinding it should automatically clear the path??
            clearPathfinding(tribesman);
         }
         tribesmanAIComponent.currentAIType = TribesmanAIType.grabbingFood;
         return;
      }
   }

   // If there's nothing else to do, patrol the tribe area
   const tribeArea = tribeComponent.tribe.getArea();
   if (tribeArea.length > 0) {
      const patrolAI = aiHelperComponent.getPatrolAI();
      runPatrolAI(tribesman, patrolAI, tribeArea);
      return;
   }
}
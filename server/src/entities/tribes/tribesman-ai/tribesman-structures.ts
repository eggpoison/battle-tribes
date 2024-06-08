import { TribesmanAIType } from "webgl-test-shared/dist/components";
import { LimbAction } from "webgl-test-shared/dist/entities";
import { Inventory, ITEM_INFO_RECORD, PlaceableItemInfo, InventoryName } from "webgl-test-shared/dist/items";
import { PathfindingSettings } from "webgl-test-shared/dist/settings";
import { calculateStructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { TribesmanTitle } from "webgl-test-shared/dist/titles";
import { angle, getAngleDiff } from "webgl-test-shared/dist/utils";
import Board from "../../../Board";
import Entity from "../../../Entity";
import Tribe from "../../../Tribe";
import { getDistanceFromPointToEntity, stopEntity, willStopAtDesiredDistance } from "../../../ai-shared";
import { createBuildingHitboxes } from "../../../buildings";
import { getHitboxesCollidingEntities } from "../../../collision";
import { HealthComponentArray } from "../../../components/HealthComponent";
import { consumeItemFromSlot, InventoryComponentArray, getInventory } from "../../../components/InventoryComponent";
import { InventoryUseComponentArray, getInventoryUseInfo, setLimbActions } from "../../../components/InventoryUseComponent";
import { PhysicsComponentArray } from "../../../components/PhysicsComponent";
import { getEntityRelationship, EntityRelationship } from "../../../components/TribeComponent";
import { awardTitle } from "../../../components/TribeMemberComponent";
import { TribesmanAIComponentArray, TribesmanPathType } from "../../../components/TribesmanAIComponent";
import { PathfindFailureDefault } from "../../../pathfinding";
import { TITLE_REWARD_CHANCES } from "../../../tribesman-title-generation";
import { placeBuilding, placeBlueprint, calculateRadialAttackTargets, calculateRepairTarget, repairBuilding } from "../tribe-member";
import { TRIBESMAN_TURN_SPEED } from "./tribesman-ai";
import { getBestToolItemSlot, getTribesmanAttackOffset, getTribesmanAttackRadius, getTribesmanDesiredAttackRange, getTribesmanRadius, getTribesmanSlowAcceleration, pathfindToPosition } from "./tribesman-ai-utils";
import { huntEntity } from "./tribesman-combat-ai";
import { TribesmanPlaceGoal, TribesmanUpgradeGoal } from "./tribesman-goals";
import { AIHelperComponentArray } from "../../../components/AIHelperComponent";

const enum Vars {
   BUILDING_PLACE_DISTANCE = 80
}

export function goPlaceBuilding(tribesman: Entity, hotbarInventory: Inventory, tribe: Tribe, goal: TribesmanPlaceGoal): boolean {
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

         if (Math.random() < TITLE_REWARD_CHANCES.BUILDER_REWARD_CHANCE) {
            awardTitle(tribesman, TribesmanTitle.builder);
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

export function goUpgradeBuilding(tribesman: Entity, goal: TribesmanUpgradeGoal): void {
   const plan = goal.plan;
   const building = Board.entityRecord[plan.baseBuildingID]!;
   
   // @Cleanup: Copy and paste from attemptToRepairBuildings
   
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman.id);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);
   const hammerItemSlot = getBestToolItemSlot(hotbarInventory, "hammer");
   if (hammerItemSlot === null) {
      console.warn("Tried to upgrade a building without a hammer.");
      return;
   }

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

export function attemptToRepairBuildings(tribesman: Entity, hammerItemSlot: number): boolean {
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
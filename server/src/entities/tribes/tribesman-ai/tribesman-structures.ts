import { TribesmanAIType } from "battletribes-shared/components";
import { EntityID, LimbAction } from "battletribes-shared/entities";
import { PathfindingSettings } from "battletribes-shared/settings";
import { calculateStructureConnectionInfo } from "battletribes-shared/structures";
import { TribesmanTitle } from "battletribes-shared/titles";
import { angle, getAngleDiff } from "battletribes-shared/utils";
import Tribe from "../../../Tribe";
import { getDistanceFromPointToEntity, stopEntity, willStopAtDesiredDistance } from "../../../ai-shared";
import { HealthComponentArray } from "../../../components/HealthComponent";
import { consumeItemFromSlot, InventoryComponentArray, getInventory } from "../../../components/InventoryComponent";
import { InventoryUseComponentArray, setLimbActions } from "../../../components/InventoryUseComponent";
import { PhysicsComponentArray } from "../../../components/PhysicsComponent";
import { getEntityRelationship, EntityRelationship } from "../../../components/TribeComponent";
import { awardTitle } from "../../../components/TribeMemberComponent";
import { TribesmanAIComponentArray, TribesmanPathType } from "../../../components/TribesmanAIComponent";
import { PathfindFailureDefault } from "../../../pathfinding";
import { TITLE_REWARD_CHANCES } from "../../../tribesman-title-generation";
import { placeBuilding, placeBlueprint } from "../tribe-member";
import { TRIBESMAN_TURN_SPEED } from "./tribesman-ai";
import { getBestToolItemSlot, getTribesmanAttackRadius, getTribesmanDesiredAttackRange, getTribesmanRadius, getTribesmanSlowAcceleration, pathfindToPosition } from "./tribesman-ai-utils";
import { huntEntity } from "./tribesman-combat-ai";
import { TribesmanPlaceGoal, TribesmanUpgradeGoal } from "./tribesman-goals";
import { AIHelperComponentArray } from "../../../components/AIHelperComponent";
import { getBoxesCollidingEntities } from "battletribes-shared/hitbox-collision";
import { Inventory, ITEM_INFO_RECORD, PlaceableItemInfo, InventoryName } from "battletribes-shared/items/items";
import { TransformComponentArray } from "../../../components/TransformComponent";
import { createNormalStructureHitboxes } from "battletribes-shared/boxes/entity-hitbox-creation";
import { updateBox } from "battletribes-shared/boxes/boxes";
import { getEntityLayer, getGameTicks } from "../../../world";

const enum Vars {
   BUILDING_PLACE_DISTANCE = 80
}

export function goPlaceBuilding(tribesman: EntityID, hotbarInventory: Inventory, tribe: Tribe, goal: TribesmanPlaceGoal): boolean {
   const plan = goal.plan;
   
   const entityType = (ITEM_INFO_RECORD[plan.buildingRecipe.product] as PlaceableItemInfo).entityType;
   const hitboxes = createNormalStructureHitboxes(entityType);
   for (let i = 0; i < hitboxes.length; i++) {
      const hitbox = hitboxes[i];
      updateBox(hitbox.box, plan.position.x, plan.position.y, plan.rotation);
   }
   
   const layer = getEntityLayer(tribesman);
   const blockingEntities = getBoxesCollidingEntities(layer.getWorldInfo(), hitboxes);
   for (let i = 0; i < blockingEntities.length; i++) {
      const blockingEntity = blockingEntities[i];
      if (!HealthComponentArray.hasComponent(blockingEntity)) {
         continue;
      }
      
      const relationship = getEntityRelationship(tribesman, blockingEntity);
      if (relationship !== EntityRelationship.friendly) {
         // @Bug: sometimes the blocking entity is inaccessible, causing the pathfinding to the entity to break. Fix
         
         huntEntity(tribesman, blockingEntity, false);
         return true;
      }
   }
   
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
   
   const distance = getDistanceFromPointToEntity(plan.position, tribesman);
   if (distance < Vars.BUILDING_PLACE_DISTANCE) {
      // Equip the item
      const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
      const useInfo = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
      useInfo.selectedItemSlot = goal.placeableItemSlot;
      
      const transformComponent = TransformComponentArray.getComponent(tribesman);
      
      const targetDirection = angle(plan.position.x - transformComponent.position.x, plan.position.y - transformComponent.position.y);
      if (distance < getTribesmanAttackRadius(tribesman)) {
         // @Incomplete: Shouldn't move backwards from the target position, should instead pathfind to the closest position
         // which is far enough away, as currently it will try to back into buildings and get stuck like this.
         
         // 
         // If too close to the plan position, move back a bit
         // 

         const physicsComponent = PhysicsComponentArray.getComponent(tribesman);

         const acceleration = getTribesmanSlowAcceleration(tribesman);
         physicsComponent.acceleration.x = acceleration * Math.sin(targetDirection + Math.PI);
         physicsComponent.acceleration.y = acceleration * Math.cos(targetDirection + Math.PI);

         physicsComponent.targetRotation = targetDirection;
         physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;
         
         setLimbActions(inventoryUseComponent, LimbAction.none);
         tribesmanComponent.currentAIType = TribesmanAIType.building;
         return true;
      } else if (Math.abs(getAngleDiff(transformComponent.rotation, targetDirection)) < 0.02) {
         // @Cleanup: copy and paste. use the function from item-use.ts
         
         // 
         // Place the item
         // 
         
         const item = hotbarInventory.itemSlots[goal.placeableItemSlot]!;
         const placingEntityType = (ITEM_INFO_RECORD[item.type] as PlaceableItemInfo).entityType;
         
         const connectionInfo = calculateStructureConnectionInfo(plan.position, plan.rotation, placingEntityType, layer.getWorldInfo());
         placeBuilding(tribe, getEntityLayer(tribesman), plan.position, plan.rotation, placingEntityType, connectionInfo, []);

         if (Math.random() < TITLE_REWARD_CHANCES.BUILDER_REWARD_CHANCE) {
            awardTitle(tribesman, TribesmanTitle.builder);
         }

         consumeItemFromSlot(hotbarInventory, goal.placeableItemSlot, 1);
         
         useInfo.lastAttackTicks = getGameTicks();
      } else {
         const physicsComponent = PhysicsComponentArray.getComponent(tribesman);
         
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
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
         
         setLimbActions(inventoryUseComponent, LimbAction.none);
         tribesmanComponent.currentAIType = TribesmanAIType.building;
         return true;
      }
   }

   return false;
}

export function goUpgradeBuilding(tribesman: EntityID, goal: TribesmanUpgradeGoal): void {
   const plan = goal.plan;
   const building = plan.baseBuildingID;
   
   // @Cleanup: Copy and paste from attemptToRepairBuildings
   
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);
   const hammerItemSlot = getBestToolItemSlot(hotbarInventory, "hammer");
   if (hammerItemSlot === null) {
      console.warn("Tried to upgrade a building without a hammer.");
      return;
   }

   // Select the hammer item slot
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
   const useInfo = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
   useInfo.selectedItemSlot = hammerItemSlot;
   setLimbActions(inventoryUseComponent, LimbAction.none);

   const desiredAttackRange = getTribesmanDesiredAttackRange(tribesman);
   const physicsComponent = PhysicsComponentArray.getComponent(tribesman);
   
   const transformComponent = TransformComponentArray.getComponent(tribesman);

   const buildingTransformComponent = TransformComponentArray.getComponent(building);

   const distance = getDistanceFromPointToEntity(transformComponent.position, building) - getTribesmanRadius(tribesman);
   if (willStopAtDesiredDistance(physicsComponent, desiredAttackRange, distance)) {
      // If the tribesman will stop too close to the target, move back a bit
      if (willStopAtDesiredDistance(physicsComponent, desiredAttackRange - 20, distance)) {
         physicsComponent.acceleration.x = getTribesmanSlowAcceleration(tribesman) * Math.sin(transformComponent.rotation + Math.PI);
         physicsComponent.acceleration.y = getTribesmanSlowAcceleration(tribesman) * Math.cos(transformComponent.rotation + Math.PI);
      } else {
         stopEntity(physicsComponent);
      }

      const targetRotation = transformComponent.position.calculateAngleBetween(buildingTransformComponent.position);

      physicsComponent.targetRotation = targetRotation;
      physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;

      if (Math.abs(getAngleDiff(transformComponent.rotation, targetRotation)) < 0.1) {
         placeBlueprint(tribesman, building, plan.blueprintType, plan.rotation);
      }
   } else {
      pathfindToPosition(tribesman, buildingTransformComponent.position.x, buildingTransformComponent.position.y, building, TribesmanPathType.default, Math.floor(desiredAttackRange / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.returnEmpty);
   }

   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
   tribesmanComponent.currentAIType = TribesmanAIType.building;
}

export function attemptToRepairBuildings(tribesman: EntityID, hammerItemSlot: number): boolean {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const aiHelperComponent = AIHelperComponentArray.getComponent(tribesman);
   
   let closestDamagedBuilding: EntityID | undefined;
   let minDistance = Number.MAX_SAFE_INTEGER;
   for (const entity of aiHelperComponent.visibleEntities) {
      const relationship = getEntityRelationship(tribesman, entity);
      if (relationship !== EntityRelationship.friendlyBuilding) {
         continue;
      }

      const healthComponent = HealthComponentArray.getComponent(entity);
      if (healthComponent.health === healthComponent.maxHealth) {
         continue;
      }

      const entityTransformComponent = TransformComponentArray.getComponent(entity);

      // @Incomplete: Skip buildings which there isn't a path to

      const distance = transformComponent.position.calculateDistanceBetween(entityTransformComponent.position);
      if (distance < minDistance) {
         closestDamagedBuilding = entity;
         minDistance = distance;
      }
   }

   if (typeof closestDamagedBuilding === "undefined") {
      return false;
   }

   // Select the hammer item slot
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
   const useInfo = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
   useInfo.selectedItemSlot = hammerItemSlot;
   setLimbActions(inventoryUseComponent, LimbAction.none);

   const desiredAttackRange = getTribesmanDesiredAttackRange(tribesman);
   const physicsComponent = PhysicsComponentArray.getComponent(tribesman);

   const buildingTransformComponent = TransformComponentArray.getComponent(closestDamagedBuilding);
   
   const distance = getDistanceFromPointToEntity(transformComponent.position, closestDamagedBuilding) - getTribesmanRadius(tribesman);
   if (willStopAtDesiredDistance(physicsComponent, desiredAttackRange, distance)) {
      // If the tribesman will stop too close to the target, move back a bit
      if (willStopAtDesiredDistance(physicsComponent, desiredAttackRange - 20, distance)) {
         physicsComponent.acceleration.x = getTribesmanSlowAcceleration(tribesman) * Math.sin(transformComponent.rotation + Math.PI);
         physicsComponent.acceleration.y = getTribesmanSlowAcceleration(tribesman) * Math.cos(transformComponent.rotation + Math.PI);
      } else {
         stopEntity(physicsComponent);
      }

      const targetRotation = transformComponent.position.calculateAngleBetween(buildingTransformComponent.position);
      physicsComponent.targetRotation = targetRotation;
      physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;

      if (Math.abs(getAngleDiff(transformComponent.rotation, targetRotation)) < 0.1) {
         // @Incomplete

         // // If in melee range, try to repair the building
         // const targets = calculateRadialAttackTargets(tribesman, getTribesmanAttackOffset(tribesman), getTribesmanAttackRadius(tribesman));
         // const repairTarget = calculateRepairTarget(tribesman, targets);
         // if (repairTarget !== null) {
         //    repairBuilding(tribesman, repairTarget, hammerItemSlot, InventoryName.hotbar);
         // }
      }
   } else {
      pathfindToPosition(tribesman, buildingTransformComponent.position.x, buildingTransformComponent.position.y, closestDamagedBuilding, TribesmanPathType.default, Math.floor(desiredAttackRange / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.throwError);
   }

   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
   tribesmanComponent.currentAIType = TribesmanAIType.repairing;

   return true;
}
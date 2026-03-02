import { TribesmanAIType } from "battletribes-shared/components";
import { Entity, EntityType, LimbAction } from "battletribes-shared/entities";
import { PathfindingSettings } from "battletribes-shared/settings";
import { TribesmanTitle } from "battletribes-shared/titles";
import { angle, assert, getAbsAngleDiff, getAngleDiff, polarVec2 } from "battletribes-shared/utils";
import Tribe from "../../../Tribe";
import { getDistanceFromPointToEntity, willStopAtDesiredDistance } from "../../../ai-shared";
import { HealthComponentArray } from "../../../components/HealthComponent";
import { consumeItemFromSlot, InventoryComponentArray, getInventory, inventoryHasItemType } from "../../../components/InventoryComponent";
import { InventoryUseComponentArray, setLimbActions } from "../../../components/InventoryUseComponent";
import { getEntityRelationship, EntityRelationship, TribeComponentArray } from "../../../components/TribeComponent";
import { TribesmanAIComponentArray, TribesmanPathType } from "../../../components/TribesmanAIComponent";
import { PathfindFailureDefault } from "../../../pathfinding";
import { TITLE_REWARD_CHANCES } from "../../../tribesman-title-generation";
import { placeBlueprint } from "../tribe-member";
import { TRIBESMAN_TURN_SPEED } from "./tribesman-ai";
import { getBestHammerItemSlot, getTribesmanAttackRadius, getTribesmanDesiredAttackRange, getHumanoidRadius, getTribesmanSlowAcceleration } from "./tribesman-ai-utils";
import { doMeleeAttack, goKillEntity } from "./tribesman-combat-ai";
import { AIHelperComponentArray } from "../../../components/AIHelperComponent";
import { Inventory, InventoryName, ITEM_INFO_RECORD, itemInfoIsPlaceable, ItemType } from "battletribes-shared/items/items";
import { TransformComponentArray } from "../../../components/TransformComponent";
import { createEntity, getEntityLayer, getEntityType, getGameTicks } from "../../../world";
import { AIPlaceBuildingPlan, AIUpgradeBuildingPlan, planToGetItem } from "../../../tribesman-ai/tribesman-ai-planning";
import { addAssignmentPart, AIAssignmentComponentArray } from "../../../components/AIAssignmentComponent";
import { awardTitle } from "../../../components/TribesmanComponent";
import { getBoxesCollidingEntities } from "../../../collision-detection";
import { calculateEntityPlaceInfo, createStructureConfig } from "../../../structure-placement";
import { StructureType } from "../../../../../shared/src/structures";
import { applyAccelerationFromGround, Hitbox, turnHitboxToAngle } from "../../../hitboxes";
import { clearPathfinding, pathfindTribesman } from "../../../components/AIPathfindingComponent";

const enum Vars {
   BUILDING_PLACE_DISTANCE = 80
}

const getPlaceableItemSlot = (hotbarInventory: Inventory, entityType: StructureType): number | null => {
   for (let itemSlot = 1; itemSlot <= hotbarInventory.width * hotbarInventory.height; itemSlot++) {
      const item = hotbarInventory.itemSlots[itemSlot];
      if (typeof item === "undefined") {
         continue;
      }
      
      const itemInfo = ITEM_INFO_RECORD[item.type];
      if (itemInfoIsPlaceable(item.type, itemInfo) && itemInfo.entityType === entityType) {
         return itemSlot;
      }
   }
   
   return null;
}

export function goPlaceBuilding(tribesman: Entity, hotbarInventory: Inventory, tribe: Tribe, plan: AIPlaceBuildingPlan): boolean {
   const virtualBuilding = plan.virtualBuilding;
   
   const layer = getEntityLayer(tribesman);

   const placeableItemSlot = getPlaceableItemSlot(hotbarInventory, virtualBuilding.entityType);
   assert(placeableItemSlot !== null);
   
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);

   const distance = getDistanceFromPointToEntity(virtualBuilding.position, transformComponent);

   // if the entity is close enough to the build location, become concerned about blocking entities
   if (distance < Vars.BUILDING_PLACE_DISTANCE + 100) {
      const blockingEntities = getBoxesCollidingEntities(layer, virtualBuilding.boxes);
      for (let i = 0; i < blockingEntities.length; i++) {
         const blockingEntity = blockingEntities[i];
         if (!HealthComponentArray.hasComponent(blockingEntity)) {
            continue;
         }
         
         const relationship = getEntityRelationship(tribesman, blockingEntity);
         if (relationship !== EntityRelationship.friendly) {
            // @Bug: sometimes the blocking entity is inaccessible, causing the pathfinding to the entity to break. Fix
            
            // If the entity is a boulder, ensure that the tribesman has a pickaxe so that it can damage it
            // @Hack: hardcoded
            if (getEntityType(blockingEntity) === EntityType.boulder) {
               const inventoryComponent = InventoryComponentArray.getComponent(tribesman);
               // @Hack: this is shit, only checks for wooden pickaxe, but it's just a start. improve layer.
               const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);
               if (!inventoryHasItemType(hotbarInventory, ItemType.wooden_pickaxe)) {
                  const tribeComponent = TribeComponentArray.getComponent(tribesman);
                  const assignment = planToGetItem(tribeComponent.tribe, ItemType.wooden_pickaxe, 1);
                  
                  const aiAssignmentComponent = AIAssignmentComponentArray.getComponent(tribesman);
                  addAssignmentPart(aiAssignmentComponent, assignment);
                  // @Bug: the entity will do nothing this tick...
                  return false;
               }
            }
            
            goKillEntity(tribesman, blockingEntity, false);
            return false;
         }
      }
   }
   
   if (distance < Vars.BUILDING_PLACE_DISTANCE) {
      // Equip the item
      const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
      const useInfo = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
      useInfo.selectedItemSlot = placeableItemSlot;
      
      const tribesmanHitbox = transformComponent.hitboxes[0];
      
      const targetDirection = angle(virtualBuilding.position.x - tribesmanHitbox.box.position.x, virtualBuilding.position.y - tribesmanHitbox.box.position.y);
      if (distance < getTribesmanAttackRadius(tribesman)) {
         // @Incomplete: Shouldn't move backwards from the target position, should instead pathfind to the closest position
         // which is far enough away, as currently it will try to back into buildings and get stuck like this.
         
         // 
         // If too close to the plan position, move back a bit
         // 

         const acceleration = getTribesmanSlowAcceleration(tribesman);
         applyAccelerationFromGround(tribesmanHitbox, polarVec2(acceleration, targetDirection + Math.PI));

         turnHitboxToAngle(tribesmanHitbox, targetDirection, TRIBESMAN_TURN_SPEED, 0.5, false);
         
         setLimbActions(inventoryUseComponent, LimbAction.none);
         tribesmanComponent.currentAIType = TribesmanAIType.building;
         return false;
      } else if (Math.abs(getAngleDiff(tribesmanHitbox.box.angle, targetDirection)) < 0.02) {
         // @Cleanup: copy and paste. use the function from item-use.ts
         
         // 
         // Place the item
         // 
         
         const placeInfo = calculateEntityPlaceInfo(virtualBuilding.position, virtualBuilding.rotation, virtualBuilding.entityType, layer);
         const entityConfig = createStructureConfig(tribe, virtualBuilding.entityType, placeInfo.position, placeInfo.angle, placeInfo.connections);
         createEntity(entityConfig, layer, 0);

         if (Math.random() < TITLE_REWARD_CHANCES.BUILDER_REWARD_CHANCE) {
            awardTitle(tribesman, TribesmanTitle.builder);
         }

         consumeItemFromSlot(tribesman, hotbarInventory, placeableItemSlot, 1);
         
         useInfo.lastAttackTicks = getGameTicks();
         return true;
      } else {
         turnHitboxToAngle(tribesmanHitbox, targetDirection, TRIBESMAN_TURN_SPEED, 0.5, false);

         setLimbActions(inventoryUseComponent, LimbAction.none);
         tribesmanComponent.currentAIType = TribesmanAIType.building;
         return false;
      }
   } else {
      // Move to the building plan
      const isFinished = pathfindTribesman(tribesman, virtualBuilding.position.x, virtualBuilding.position.y, virtualBuilding.layer, 0, TribesmanPathType.default, Math.floor(Vars.BUILDING_PLACE_DISTANCE / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.none);
      if (!isFinished) {
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
         
         setLimbActions(inventoryUseComponent, LimbAction.none);
         tribesmanComponent.currentAIType = TribesmanAIType.building;
      }
      return false;
   }
}

export function goUpgradeBuilding(tribesman: Entity, plan: AIUpgradeBuildingPlan): void {
   const building = plan.baseBuildingID;
   
   // @Cleanup: Copy and paste from attemptToRepairBuildings
   
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);
   const hammerItemSlot = getBestHammerItemSlot(hotbarInventory);
   if (hammerItemSlot === null) {
      console.warn("Tried to upgrade a building without a hammer.");
      return;
   }

   // Select the hammer item slot
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
   const useInfo = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
   useInfo.selectedItemSlot = hammerItemSlot;

   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.hitboxes[0];
   
   const desiredAttackRange = getTribesmanDesiredAttackRange() - getHumanoidRadius(transformComponent);

   const buildingTransformComponent = TransformComponentArray.getComponent(building);
   const buildingHitbox = buildingTransformComponent.hitboxes[0];

   const distance = getDistanceFromPointToEntity(tribesmanHitbox.box.position, buildingTransformComponent) - getHumanoidRadius(transformComponent);
   if (willStopAtDesiredDistance(tribesmanHitbox, desiredAttackRange, distance)) {
      // If the tribesman will stop too close to the target, move back a bit
      if (willStopAtDesiredDistance(tribesmanHitbox, desiredAttackRange - 20, distance)) {
         const acceleration = getTribesmanSlowAcceleration(tribesman);
         applyAccelerationFromGround(tribesmanHitbox, polarVec2(acceleration, tribesmanHitbox.box.angle + Math.PI));
      }

      const targetAngle = tribesmanHitbox.box.position.angleTo(buildingHitbox.box.position);
      turnHitboxToAngle(tribesmanHitbox, targetAngle, TRIBESMAN_TURN_SPEED, 0.5, false);

      if (Math.abs(getAngleDiff(tribesmanHitbox.box.angle, targetAngle)) < 0.1) {
         placeBlueprint(tribesman, building, plan.blueprintType, plan.rotation);
      }
   } else {
      pathfindTribesman(tribesman, buildingHitbox.box.position.x, buildingHitbox.box.position.y, getEntityLayer(building), building, TribesmanPathType.default, Math.floor(desiredAttackRange / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.none);
   }

   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
   tribesmanComponent.currentAIType = TribesmanAIType.building;
}

export function attemptToRepairBuildings(tribesman: Entity, hammerItemSlot: number): boolean {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.hitboxes[0];
   
   const aiHelperComponent = AIHelperComponentArray.getComponent(tribesman);
   
   let closestDamagedBuilding: Entity | undefined;
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
      const entityHitbox = entityTransformComponent.hitboxes[0];

      // @Incomplete: Skip buildings which there isn't a path to

      const distance = tribesmanHitbox.box.position.distanceTo(entityHitbox.box.position);
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

   const desiredAttackRange = getTribesmanDesiredAttackRange() - getHumanoidRadius(transformComponent);

   const buildingTransformComponent = TransformComponentArray.getComponent(closestDamagedBuilding);
   const buildingHitbox = buildingTransformComponent.hitboxes[0];
   
   const distance = getDistanceFromPointToEntity(tribesmanHitbox.box.position, buildingTransformComponent) - getHumanoidRadius(transformComponent);
   if (willStopAtDesiredDistance(tribesmanHitbox, desiredAttackRange, distance)) {
      // If the tribesman will stop too close to the target, move back a bit
      if (willStopAtDesiredDistance(tribesmanHitbox, desiredAttackRange - 20, distance)) {
         const acceleration = getTribesmanSlowAcceleration(tribesman);
         applyAccelerationFromGround(tribesmanHitbox, polarVec2(acceleration, tribesmanHitbox.box.angle + Math.PI));
      }

      const targetAngle = tribesmanHitbox.box.position.angleTo(buildingHitbox.box.position);
      turnHitboxToAngle(tribesmanHitbox, targetAngle, TRIBESMAN_TURN_SPEED, 0.5, false);

      if (getAbsAngleDiff(tribesmanHitbox.box.angle, targetAngle) < 0.1) {
         doMeleeAttack(tribesman, hammerItemSlot);
      }

      clearPathfinding(tribesman);
   } else {
      pathfindTribesman(tribesman, buildingHitbox.box.position.x, buildingHitbox.box.position.y, getEntityLayer(closestDamagedBuilding), closestDamagedBuilding, TribesmanPathType.default, Math.floor(desiredAttackRange / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.none);
   }

   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
   tribesmanComponent.currentAIType = TribesmanAIType.repairing;

   return true;
}
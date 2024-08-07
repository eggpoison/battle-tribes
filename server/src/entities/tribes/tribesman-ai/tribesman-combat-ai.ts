import { TribesmanAIType } from "webgl-test-shared/dist/components";
import { EntityType, LimbAction } from "webgl-test-shared/dist/entities";
import { Settings, PathfindingSettings } from "webgl-test-shared/dist/settings";
import { TribeType } from "webgl-test-shared/dist/tribes";
import { Point, distance } from "webgl-test-shared/dist/utils";
import Board from "../../../Board";
import Entity from "../../../Entity";
import { getDistanceFromPointToEntity, stopEntity, entityIsInLineOfSight, willStopAtDesiredDistance } from "../../../ai-shared";
import { InventoryComponentArray, getInventory } from "../../../components/InventoryComponent";
import { InventoryUseComponentArray, getInventoryUseInfo, setLimbActions } from "../../../components/InventoryUseComponent";
import { PhysicsComponentArray } from "../../../components/PhysicsComponent";
import { TribesmanAIComponentArray, TribesmanPathType } from "../../../components/TribesmanAIComponent";
import { PathfindFailureDefault } from "../../../pathfinding";
import { attemptAttack, calculateAttackTarget, calculateItemDamage, calculateRadialAttackTargets, useItem } from "../tribe-member";
import { TRIBESMAN_TURN_SPEED } from "./tribesman-ai";
import { EntityRelationship, TribeComponentArray } from "../../../components/TribeComponent";
import { getItemAttackCooldown } from "../../../items";
import { calculateAttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { clearTribesmanPath, getBestToolItemSlot, getTribesmanAttackOffset, getTribesmanAttackRadius, getTribesmanDesiredAttackRange, getTribesmanRadius, getTribesmanSlowAcceleration, pathfindToPosition, pathToEntityExists } from "./tribesman-ai-utils";
import { attemptToRepairBuildings } from "./tribesman-structures";
import { InventoryName, ITEM_TYPE_RECORD, ITEM_INFO_RECORD, BowItemInfo } from "webgl-test-shared/dist/items/items";

const enum Vars {
   BOW_LINE_OF_SIGHT_WAIT_TIME = 0.5 * Settings.TPS,
   EMBRASURE_USE_RADIUS = 40,
   BATTLEAXE_MIN_USE_RANGE = 120,
   BATTLEAXE_IDEAL_USE_RANGE = 260,
   BATTLEAXE_MAX_USE_RANGE = 400,
   DESIRED_RANGED_ATTACK_DISTANCE = 360
}

const EXTRA_BOW_COOLDOWNS: Partial<Record<EntityType, number>> = {
   [EntityType.tribeWorker]: Math.floor(0.3 * Settings.TPS),
   [EntityType.tribeWarrior]: Math.floor(0.1 * Settings.TPS)
};

const doMeleeAttack = (tribesman: Entity): void => {
   // @Speed: Do the check for if the item is on cooldown before doing the expensive radial attack calculations

   // Find the attack target
   const attackTargets = calculateRadialAttackTargets(tribesman, getTribesmanAttackOffset(tribesman), getTribesmanAttackRadius(tribesman));
   const target = calculateAttackTarget(tribesman, attackTargets, ~(EntityRelationship.friendly | EntityRelationship.friendlyBuilding));

   // Register the hit
   if (target !== null) {
      const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman.id);
      const hotbarUseInfo = getInventoryUseInfo(inventoryUseComponent, InventoryName.hotbar);
      const didSucceed = attemptAttack(tribesman, target, hotbarUseInfo.selectedItemSlot, InventoryName.hotbar);

      if (!didSucceed) {
         // Use offhand
         const tribeComponent = TribeComponentArray.getComponent(tribesman.id);
         if (tribeComponent.tribe.tribeType === TribeType.barbarians) {
            const offhandUseInfo = getInventoryUseInfo(inventoryUseComponent, InventoryName.offhand);
            attemptAttack(tribesman, target, offhandUseInfo.selectedItemSlot, InventoryName.offhand);
         }
      }
   }
}

const getMostDamagingItemSlot = (tribesman: Entity, huntedEntity: Entity): number => {
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman.id);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

   // @Incomplete: Account for status effects
   
   let bestItemSlot = 1;
   let mostDps = 0;
   for (let itemSlot = 1; itemSlot <= hotbarInventory.width * hotbarInventory.height; itemSlot++) {
      const item = hotbarInventory.itemSlots[itemSlot];
      if (typeof item === "undefined") {
         if (mostDps < 1 / Settings.DEFAULT_ATTACK_COOLDOWN) {
            mostDps = 1 / Settings.DEFAULT_ATTACK_COOLDOWN;
            bestItemSlot = itemSlot;
         }
         continue;
      }

      const attackEffectiveness = calculateAttackEffectiveness(item, huntedEntity.type);
      
      const attackCooldown = getItemAttackCooldown(item);
      const damage = calculateItemDamage(tribesman, item, attackEffectiveness);
      const dps = damage / attackCooldown;

      if (dps > mostDps) {
         mostDps = dps;
         bestItemSlot = itemSlot;
      }
   }

   return bestItemSlot;
}

const getNearbyEmbrasureUsePoints = (tribesman: Entity): ReadonlyArray<Point> => {
   // Add 30 to the range to account for the fact that use points are disconnected from the embrasure positions
   const minChunkX = Math.max(Math.floor((tribesman.position.x - (Vars.EMBRASURE_USE_RADIUS + 30)) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((tribesman.position.x + (Vars.EMBRASURE_USE_RADIUS + 30)) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((tribesman.position.y - (Vars.EMBRASURE_USE_RADIUS + 30)) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((tribesman.position.y + (Vars.EMBRASURE_USE_RADIUS + 30)) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);

   const usePoints = new Array<Point>();
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (let i = 0; i < chunk.entities.length; i++) {
            const entity = chunk.entities[i];
            if (entity.type !== EntityType.embrasure) {
               continue;
            }

            const usePointX = entity.position.x - 22 * Math.sin(entity.rotation);
            const usePointY = entity.position.y - 22 * Math.cos(entity.rotation);

            if (distance(tribesman.position.x, tribesman.position.y, usePointX, usePointY) > Vars.EMBRASURE_USE_RADIUS) {
               continue;
            }

            usePoints.push(new Point(usePointX, usePointY));
         }
      }
   }

   return usePoints;
}

const getClosestEmbrasureUsePoint = (tribesman: Entity, usePoints: ReadonlyArray<Point>): Point => {
   let minDist = Number.MAX_SAFE_INTEGER;
   let closestPoint!: Point;
   for (let i = 0; i < usePoints.length; i++) {
      const point = usePoints[i];

      const dist = tribesman.position.calculateDistanceBetween(point);
      if (dist < minDist) {
         minDist = dist;
         closestPoint = point;
      }
   }

   return closestPoint;
}

export function huntEntity(tribesman: Entity, huntedEntity: Entity, isAggressive: boolean): void {
   // @Cleanup: Refactor to not be so big
   
   // @Incomplete: Only accounts for hotbar

   const inventoryComponent = InventoryComponentArray.getComponent(tribesman.id);
   
   const mostDamagingItemSlot = getMostDamagingItemSlot(tribesman, huntedEntity);

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman.id);
   const hotbarUseInfo = getInventoryUseInfo(inventoryUseComponent, InventoryName.hotbar);
   
   // Select the item slot
   hotbarUseInfo.selectedItemSlot = mostDamagingItemSlot;
   
   const inventory = getInventory(inventoryComponent, InventoryName.hotbar);
   if (inventory.hasItem(mostDamagingItemSlot)) {
      const selectedItem = hotbarUseInfo.inventory.itemSlots[hotbarUseInfo.selectedItemSlot]!;
      const weaponCategory = ITEM_TYPE_RECORD[selectedItem.type];

      // Throw spears if there is multiple
      if (weaponCategory === "spear" && selectedItem.count > 1) {
         const physicsComponent = PhysicsComponentArray.getComponent(tribesman.id);

         // Rotate to face the target
         const direction = tribesman.position.calculateAngleBetween(huntedEntity.position);
         if (direction !== tribesman.rotation) {
            physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;
            physicsComponent.targetRotation = direction;
         }

         const distance = getDistanceFromPointToEntity(tribesman.position, huntedEntity) - getTribesmanRadius(tribesman);
         if (distance > 250) {
            // Move closer
            physicsComponent.acceleration.x = getTribesmanSlowAcceleration(tribesman.id) * Math.sin(direction);
            physicsComponent.acceleration.y = getTribesmanSlowAcceleration(tribesman.id) * Math.cos(direction);
         } else if (distance > 150) {
            stopEntity(physicsComponent);
         } else {
            // Backpedal away from the entity if too close
            const backwards = direction + Math.PI;
            physicsComponent.acceleration.x = getTribesmanSlowAcceleration(tribesman.id) * Math.sin(backwards);
            physicsComponent.acceleration.y = getTribesmanSlowAcceleration(tribesman.id) * Math.cos(backwards);
         }

         if (hotbarUseInfo.action !== LimbAction.chargeSpear) {
            hotbarUseInfo.lastSpearChargeTicks = Board.ticks;
         }
         
         const ticksSinceLastAction = Board.ticks - hotbarUseInfo.lastSpearChargeTicks;
         if (ticksSinceLastAction >= 3 * Settings.TPS) {
            // Throw spear
            useItem(tribesman, selectedItem, InventoryName.hotbar, hotbarUseInfo.selectedItemSlot);
            setLimbActions(inventoryUseComponent, LimbAction.none);
         } else {
            // Charge spear
            hotbarUseInfo.action = LimbAction.chargeSpear;
         }

         const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman.id);
         tribesmanComponent.currentAIType = TribesmanAIType.attacking;
         return;
      }
      
      // Don't do a melee attack if using a bow, instead charge the bow
      if (weaponCategory === "bow") {
         const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman.id);
         tribesmanComponent.currentAIType = TribesmanAIType.attacking;

         const tribeComponent = TribeComponentArray.getComponent(tribesman.id);
         
         const isInLineOfSight = entityIsInLineOfSight(tribesman, huntedEntity, tribeComponent.tribe.pathfindingGroupID);
         if (isInLineOfSight) {
            tribesmanComponent.lastEnemyLineOfSightTicks = Board.ticks;
         }
         
         if (isInLineOfSight || (Board.ticks - tribesmanComponent.lastEnemyLineOfSightTicks) <= Vars.BOW_LINE_OF_SIGHT_WAIT_TIME) {
            const physicsComponent = PhysicsComponentArray.getComponent(tribesman.id);
            const distance = getDistanceFromPointToEntity(tribesman.position, huntedEntity) - getTribesmanRadius(tribesman);
            
            // If there are any nearby embrasure use points, move to them
            const nearbyEmbrasureUsePoints = getNearbyEmbrasureUsePoints(tribesman);
            if (nearbyEmbrasureUsePoints.length > 0) {
               // Move to the closest one
               const targetUsePoint = getClosestEmbrasureUsePoint(tribesman, nearbyEmbrasureUsePoints);
               
               const moveDirection = tribesman.position.calculateAngleBetween(targetUsePoint);
               physicsComponent.acceleration.x = getTribesmanSlowAcceleration(tribesman.id) * Math.sin(moveDirection);
               physicsComponent.acceleration.y = getTribesmanSlowAcceleration(tribesman.id) * Math.cos(moveDirection);
            } else if (willStopAtDesiredDistance(physicsComponent, Vars.DESIRED_RANGED_ATTACK_DISTANCE - 20, distance)) {
               // If the tribesman will stop too close to the target, move back a bit
               physicsComponent.acceleration.x = getTribesmanSlowAcceleration(tribesman.id) * Math.sin(tribesman.rotation + Math.PI);
               physicsComponent.acceleration.y = getTribesmanSlowAcceleration(tribesman.id) * Math.cos(tribesman.rotation + Math.PI);
            } else {
               stopEntity(physicsComponent);
            }

            const targetRotation = tribesman.position.calculateAngleBetween(huntedEntity.position);

            physicsComponent.targetRotation = targetRotation;
            physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;

            if (hotbarUseInfo.action !== LimbAction.chargeBow) {
               // If the tribesman is only just charging the bow, reset the cooldown to prevent the bow firing immediately
               const itemInfo = ITEM_INFO_RECORD[selectedItem.type] as BowItemInfo;
               hotbarUseInfo.lastBowChargeTicks = Board.ticks;
               hotbarUseInfo.bowCooldownTicks = itemInfo.shotCooldownTicks;
               tribesmanComponent.extraBowCooldownTicks = EXTRA_BOW_COOLDOWNS[tribesman.type]!;
            } else if (hotbarUseInfo.bowCooldownTicks === 0 && tribesmanComponent.extraBowCooldownTicks > 0) {
               tribesmanComponent.extraBowCooldownTicks--;
            } else {
               // If the bow is fully charged, fire it
               useItem(tribesman, selectedItem, InventoryName.hotbar, hotbarUseInfo.selectedItemSlot);
               tribesmanComponent.extraBowCooldownTicks = EXTRA_BOW_COOLDOWNS[tribesman.type]!;
            }
            hotbarUseInfo.action = LimbAction.chargeBow;

            clearTribesmanPath(tribesman);
         } else {
            pathfindToPosition(tribesman, huntedEntity.position.x, huntedEntity.position.y, huntedEntity.id, TribesmanPathType.default, Math.floor(100 / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.returnClosest);

            // If reached goal, turn towards the enemy
            if (tribesmanComponent.path.length === 0) {
               const targetRotation = tribesman.position.calculateAngleBetween(huntedEntity.position);

               const physicsComponent = PhysicsComponentArray.getComponent(tribesman.id);
               physicsComponent.targetRotation = targetRotation;
               physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;
            }

            setLimbActions(inventoryUseComponent, LimbAction.none);
         }

         return;
      }

      if (isAggressive && weaponCategory === "battleaxe") {
         // Use the battleaxe if the entity is in the use range
         const distance = getDistanceFromPointToEntity(tribesman.position, huntedEntity) - getTribesmanRadius(tribesman);
         if (distance >= Vars.BATTLEAXE_MIN_USE_RANGE && distance <= Vars.BATTLEAXE_MAX_USE_RANGE && selectedItem.id !== hotbarUseInfo.thrownBattleaxeItemID) {
            if (hotbarUseInfo.action !== LimbAction.chargeBattleaxe) {
               hotbarUseInfo.lastBattleaxeChargeTicks = Board.ticks;
            }

            const targetDirection = tribesman.position.calculateAngleBetween(huntedEntity.position);

            const physicsComponent = PhysicsComponentArray.getComponent(tribesman.id);
            physicsComponent.targetRotation = targetDirection;
            physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;

            if (distance > Vars.BATTLEAXE_IDEAL_USE_RANGE + 10) {
               // Move closer
               const acceleration = getTribesmanSlowAcceleration(tribesman.id);
               physicsComponent.acceleration.x = acceleration * Math.sin(targetDirection);
               physicsComponent.acceleration.y = acceleration * Math.cos(targetDirection);
            } else if (distance < Vars.BATTLEAXE_IDEAL_USE_RANGE - 10) {
               // Move futher away
               const acceleration = getTribesmanSlowAcceleration(tribesman.id);
               const moveDirection = targetDirection + Math.PI;
               physicsComponent.acceleration.x = acceleration * Math.sin(moveDirection);
               physicsComponent.acceleration.y = acceleration * Math.cos(moveDirection);
            } else {
               // Sweet spot
               stopEntity(physicsComponent);
            }

            const ticksSinceLastAction = Board.ticks - hotbarUseInfo.lastBattleaxeChargeTicks;
            if (ticksSinceLastAction >= 3 * Settings.TPS) {
               // Throw the battleaxe
               useItem(tribesman, selectedItem, InventoryName.hotbar, mostDamagingItemSlot);
               setLimbActions(inventoryUseComponent, LimbAction.none);
            } else {
               setLimbActions(inventoryUseComponent, LimbAction.chargeBattleaxe);
            }
            
            const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman.id);
            tribesmanComponent.currentAIType = TribesmanAIType.attacking;

            clearTribesmanPath(tribesman);
            return;
         }
      }
   }

   // @Cleanup: Shouldn't be done here. Just skip out of this function and let the main path do the repairing.
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);
   const hammerItemSlot = getBestToolItemSlot(hotbarInventory, "hammer");
   if (hammerItemSlot !== null) {
      // If there isn't a path to the entity, try to repair buildings
      // @Incomplete: This will cause a delay after the tribesman finishes repairing the building.
      if (tribesman.ageTicks % (Settings.TPS / 2) === 0) {
         const tribeComponent = TribeComponentArray.getComponent(tribesman.id);
         const pathExists = pathToEntityExists(tribesman, huntedEntity, tribeComponent.tribe, getTribesmanRadius(tribesman));
         if (!pathExists) {
            const isRepairing = attemptToRepairBuildings(tribesman, hammerItemSlot);
            if (isRepairing) {
               return;
            }
         }
      } else {
         const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman.id);
         if (tribesmanComponent.currentAIType === TribesmanAIType.repairing) {
            const isRepairing = attemptToRepairBuildings(tribesman, hammerItemSlot);
            if (isRepairing) {
               return;
            }
         }
      }
   }

   const physicsComponent = PhysicsComponentArray.getComponent(tribesman.id);
   const desiredAttackRange = getTribesmanDesiredAttackRange(tribesman);

   const distance = getDistanceFromPointToEntity(tribesman.position, huntedEntity) - getTribesmanRadius(tribesman);
   if (willStopAtDesiredDistance(physicsComponent, desiredAttackRange, distance)) {
      // If the tribesman will stop too close to the target, move back a bit
      if (willStopAtDesiredDistance(physicsComponent, desiredAttackRange - 20, distance)) {
         physicsComponent.acceleration.x = getTribesmanSlowAcceleration(tribesman.id) * Math.sin(tribesman.rotation + Math.PI);
         physicsComponent.acceleration.y = getTribesmanSlowAcceleration(tribesman.id) * Math.cos(tribesman.rotation + Math.PI);
      } else {
         stopEntity(physicsComponent);
      }

      physicsComponent.targetRotation = tribesman.position.calculateAngleBetween(huntedEntity.position);
      physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;
   
      // If in melee range, try to do a melee attack
      doMeleeAttack(tribesman);

      clearTribesmanPath(tribesman);
   } else {
      const pointDistance = tribesman.position.calculateDistanceBetween(huntedEntity.position);
      const targetDirectRadius = pointDistance - distance;

      const goalRadius = Math.floor((desiredAttackRange + targetDirectRadius) / PathfindingSettings.NODE_SEPARATION);
      const failureDefault = isAggressive ? PathfindFailureDefault.returnClosest : PathfindFailureDefault.throwError;
      pathfindToPosition(tribesman, huntedEntity.position.x, huntedEntity.position.y, huntedEntity.id, TribesmanPathType.default, goalRadius, failureDefault);
   }

   setLimbActions(inventoryUseComponent, LimbAction.none);

   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman.id);
   tribesmanComponent.currentAIType = TribesmanAIType.attacking;
}
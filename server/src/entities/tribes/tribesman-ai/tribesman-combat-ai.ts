import { TribesmanAIType } from "webgl-test-shared/dist/components";
import { EntityID, EntityType, LimbAction } from "webgl-test-shared/dist/entities";
import { Settings, PathfindingSettings } from "webgl-test-shared/dist/settings";
import { Point, distance } from "webgl-test-shared/dist/utils";
import Board from "../../../Board";
import { getDistanceFromPointToEntity, stopEntity, entityIsInLineOfSight, willStopAtDesiredDistance } from "../../../ai-shared";
import { InventoryComponentArray, getInventory } from "../../../components/InventoryComponent";
import { InventoryUseComponentArray, setLimbActions } from "../../../components/InventoryUseComponent";
import { PhysicsComponentArray } from "../../../components/PhysicsComponent";
import { TribesmanAIComponentArray, TribesmanPathType } from "../../../components/TribesmanAIComponent";
import { PathfindFailureDefault } from "../../../pathfinding";
import { calculateItemDamage, useItem } from "../tribe-member";
import { TRIBESMAN_TURN_SPEED } from "./tribesman-ai";
import { TribeComponentArray } from "../../../components/TribeComponent";
import { calculateAttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { clearTribesmanPath, getBestToolItemSlot, getTribesmanDesiredAttackRange, getTribesmanRadius, getTribesmanSlowAcceleration, pathfindToPosition, pathToEntityExists } from "./tribesman-ai-utils";
import { attemptToRepairBuildings } from "./tribesman-structures";
import { InventoryName, ITEM_TYPE_RECORD, ITEM_INFO_RECORD, BowItemInfo, getItemAttackInfo, Item } from "webgl-test-shared/dist/items/items";
import { getAgeTicks, TransformComponentArray } from "../../../components/TransformComponent";

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

// @Incomplete
const doMeleeAttack = (tribesman: EntityID): void => {
   // @Speed: Do the check for if the item is on cooldown before doing the expensive radial attack calculations

   // // Find the attack target
   // const attackTargets = calculateRadialAttackTargets(tribesman, getTribesmanAttackOffset(tribesman), getTribesmanAttackRadius(tribesman));
   // const target = calculateAttackTarget(tribesman, attackTargets, ~(EntityRelationship.friendly | EntityRelationship.friendlyBuilding));

   // // Register the hit
   // if (target !== null) {
   //    const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
   //    const hotbarUseInfo = inventoryUseComponent.getUseInfo(InventoryName.hotbar);
   //    const didSucceed = beginSwing(tribesman, hotbarUseInfo.selectedItemSlot, InventoryName.hotbar);

   //    if (!didSucceed) {
   //       // Use offhand
   //       const tribeComponent = TribeComponentArray.getComponent(tribesman);
   //       if (tribeComponent.tribe.tribeType === TribeType.barbarians) {
   //          const offhandUseInfo = inventoryUseComponent.getUseInfo(InventoryName.offhand);
   //          beginSwing(tribesman, offhandUseInfo.selectedItemSlot, InventoryName.offhand);
   //       }
   //    }
   // }
}

const getItemAttackExecuteTimeSeconds = (item: Item): number => {
   const attackInfo = getItemAttackInfo(item);
   const timings = attackInfo.attackTimings;
   return (timings.windupTimeTicks + timings.swingTimeTicks + timings.returnTimeTicks) / Settings.TPS;
}

const getMostDamagingItemSlot = (tribesman: EntityID, huntedEntity: EntityID): number => {
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman);
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

      const attackEffectiveness = calculateAttackEffectiveness(item, Board.getEntityType(huntedEntity)!);
      
      const attackExecuteTimeSeconds = getItemAttackExecuteTimeSeconds(item);
      const damage = calculateItemDamage(tribesman, item, attackEffectiveness);
      const dps = damage / attackExecuteTimeSeconds;

      if (dps > mostDps) {
         mostDps = dps;
         bestItemSlot = itemSlot;
      }
   }

   return bestItemSlot;
}

const getNearbyEmbrasureUsePoints = (tribesman: EntityID): ReadonlyArray<Point> => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   
   // Add 30 to the range to account for the fact that use points are disconnected from the embrasure positions
   const minChunkX = Math.max(Math.floor((transformComponent.position.x - (Vars.EMBRASURE_USE_RADIUS + 30)) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((transformComponent.position.x + (Vars.EMBRASURE_USE_RADIUS + 30)) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((transformComponent.position.y - (Vars.EMBRASURE_USE_RADIUS + 30)) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((transformComponent.position.y + (Vars.EMBRASURE_USE_RADIUS + 30)) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);

   const usePoints = new Array<Point>();
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (let i = 0; i < chunk.entities.length; i++) {
            const entity = chunk.entities[i];
            if (Board.getEntityType(entity) !== EntityType.embrasure) {
               continue;
            }

            const entityTransformComponent = TransformComponentArray.getComponent(entity);

            const usePointX = entityTransformComponent.position.x - 22 * Math.sin(entityTransformComponent.rotation);
            const usePointY = entityTransformComponent.position.y - 22 * Math.cos(entityTransformComponent.rotation);

            if (distance(transformComponent.position.x, transformComponent.position.y, usePointX, usePointY) <= Vars.EMBRASURE_USE_RADIUS) {
               usePoints.push(new Point(usePointX, usePointY));
            }
         }
      }
   }

   return usePoints;
}

const getClosestEmbrasureUsePoint = (tribesman: EntityID, usePoints: ReadonlyArray<Point>): Point => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);

   let minDist = Number.MAX_SAFE_INTEGER;
   let closestPoint!: Point;
   for (let i = 0; i < usePoints.length; i++) {
      const point = usePoints[i];

      const dist = transformComponent.position.calculateDistanceBetween(point);
      if (dist < minDist) {
         minDist = dist;
         closestPoint = point;
      }
   }

   return closestPoint;
}

export function huntEntity(tribesman: EntityID, huntedEntity: EntityID, isAggressive: boolean): void {
   // @Cleanup: Refactor to not be so big
   
   // @Incomplete: Only accounts for hotbar

   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman);

   const huntedEntityTransformComponent = TransformComponentArray.getComponent(huntedEntity);
   
   const mostDamagingItemSlot = getMostDamagingItemSlot(tribesman, huntedEntity);

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
   const hotbarUseInfo = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
   
   // Select the item slot
   hotbarUseInfo.selectedItemSlot = mostDamagingItemSlot;
   
   const inventory = getInventory(inventoryComponent, InventoryName.hotbar);
   if (inventory.hasItem(mostDamagingItemSlot)) {
      const hotbar = getInventory(inventoryComponent, InventoryName.hotbar);
      
      const selectedItem = hotbar.itemSlots[hotbarUseInfo.selectedItemSlot]!;
      const weaponCategory = ITEM_TYPE_RECORD[selectedItem.type];

      // Throw spears if there is multiple
      if (weaponCategory === "spear" && selectedItem.count > 1) {
         const physicsComponent = PhysicsComponentArray.getComponent(tribesman);

         // Rotate to face the target
         const direction = transformComponent.position.calculateAngleBetween(huntedEntityTransformComponent.position);
         if (direction !== transformComponent.rotation) {
            physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;
            physicsComponent.targetRotation = direction;
         }

         const distance = getDistanceFromPointToEntity(transformComponent.position, huntedEntity) - getTribesmanRadius(tribesman);
         if (distance > 250) {
            // Move closer
            physicsComponent.acceleration.x = getTribesmanSlowAcceleration(tribesman) * Math.sin(direction);
            physicsComponent.acceleration.y = getTribesmanSlowAcceleration(tribesman) * Math.cos(direction);
         } else if (distance > 150) {
            stopEntity(physicsComponent);
         } else {
            // Backpedal away from the entity if too close
            const backwards = direction + Math.PI;
            physicsComponent.acceleration.x = getTribesmanSlowAcceleration(tribesman) * Math.sin(backwards);
            physicsComponent.acceleration.y = getTribesmanSlowAcceleration(tribesman) * Math.cos(backwards);
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

         const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
         tribesmanComponent.currentAIType = TribesmanAIType.attacking;
         return;
      }
      
      // Don't do a melee attack if using a bow, instead charge the bow
      if (weaponCategory === "bow") {
         const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
         tribesmanComponent.currentAIType = TribesmanAIType.attacking;

         const tribeComponent = TribeComponentArray.getComponent(tribesman);
         
         const isInLineOfSight = entityIsInLineOfSight(tribesman, huntedEntity, tribeComponent.tribe.pathfindingGroupID);
         if (isInLineOfSight) {
            tribesmanComponent.lastEnemyLineOfSightTicks = Board.ticks;
         }
         
         if (isInLineOfSight || (Board.ticks - tribesmanComponent.lastEnemyLineOfSightTicks) <= Vars.BOW_LINE_OF_SIGHT_WAIT_TIME) {
            const physicsComponent = PhysicsComponentArray.getComponent(tribesman);

            const distance = getDistanceFromPointToEntity(transformComponent.position, huntedEntity) - getTribesmanRadius(tribesman);
            
            // If there are any nearby embrasure use points, move to them
            const nearbyEmbrasureUsePoints = getNearbyEmbrasureUsePoints(tribesman);
            if (nearbyEmbrasureUsePoints.length > 0) {
               // Move to the closest one
               const targetUsePoint = getClosestEmbrasureUsePoint(tribesman, nearbyEmbrasureUsePoints);
               
               const moveDirection = transformComponent.position.calculateAngleBetween(targetUsePoint);
               physicsComponent.acceleration.x = getTribesmanSlowAcceleration(tribesman) * Math.sin(moveDirection);
               physicsComponent.acceleration.y = getTribesmanSlowAcceleration(tribesman) * Math.cos(moveDirection);
            } else if (willStopAtDesiredDistance(physicsComponent, Vars.DESIRED_RANGED_ATTACK_DISTANCE - 20, distance)) {
               // If the tribesman will stop too close to the target, move back a bit
               physicsComponent.acceleration.x = getTribesmanSlowAcceleration(tribesman) * Math.sin(transformComponent.rotation + Math.PI);
               physicsComponent.acceleration.y = getTribesmanSlowAcceleration(tribesman) * Math.cos(transformComponent.rotation + Math.PI);
            } else {
               stopEntity(physicsComponent);
            }

            const targetRotation = transformComponent.position.calculateAngleBetween(huntedEntityTransformComponent.position);

            physicsComponent.targetRotation = targetRotation;
            physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;

            if (hotbarUseInfo.action !== LimbAction.chargeBow) {
               // If the tribesman is only just charging the bow, reset the cooldown to prevent the bow firing immediately
               const itemInfo = ITEM_INFO_RECORD[selectedItem.type] as BowItemInfo;
               hotbarUseInfo.lastBowChargeTicks = Board.ticks;
               hotbarUseInfo.bowCooldownTicks = itemInfo.shotCooldownTicks;
               tribesmanComponent.extraBowCooldownTicks = EXTRA_BOW_COOLDOWNS[Board.getEntityType(tribesman)!]!;
            } else if (hotbarUseInfo.bowCooldownTicks === 0 && tribesmanComponent.extraBowCooldownTicks > 0) {
               tribesmanComponent.extraBowCooldownTicks--;
            } else {
               // If the bow is fully charged, fire it
               useItem(tribesman, selectedItem, InventoryName.hotbar, hotbarUseInfo.selectedItemSlot);
               tribesmanComponent.extraBowCooldownTicks = EXTRA_BOW_COOLDOWNS[Board.getEntityType(tribesman)!]!;
            }
            hotbarUseInfo.action = LimbAction.chargeBow;

            clearTribesmanPath(tribesman);
         } else {
            pathfindToPosition(tribesman, huntedEntityTransformComponent.position.x, huntedEntityTransformComponent.position.y, huntedEntity, TribesmanPathType.default, Math.floor(100 / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.returnClosest);

            // If reached goal, turn towards the enemy
            if (tribesmanComponent.path.length === 0) {
               const targetRotation = transformComponent.position.calculateAngleBetween(huntedEntityTransformComponent.position);

               const physicsComponent = PhysicsComponentArray.getComponent(tribesman);
               physicsComponent.targetRotation = targetRotation;
               physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;
            }

            setLimbActions(inventoryUseComponent, LimbAction.none);
         }

         return;
      }

      if (isAggressive && weaponCategory === "battleaxe") {
         // Use the battleaxe if the entity is in the use range
         const distance = getDistanceFromPointToEntity(transformComponent.position, huntedEntity) - getTribesmanRadius(tribesman);
         if (distance >= Vars.BATTLEAXE_MIN_USE_RANGE && distance <= Vars.BATTLEAXE_MAX_USE_RANGE && selectedItem.id !== hotbarUseInfo.thrownBattleaxeItemID) {
            if (hotbarUseInfo.action !== LimbAction.chargeBattleaxe) {
               hotbarUseInfo.lastBattleaxeChargeTicks = Board.ticks;
            }

            const targetDirection = transformComponent.position.calculateAngleBetween(huntedEntityTransformComponent.position);

            const physicsComponent = PhysicsComponentArray.getComponent(tribesman);
            physicsComponent.targetRotation = targetDirection;
            physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;

            if (distance > Vars.BATTLEAXE_IDEAL_USE_RANGE + 10) {
               // Move closer
               const acceleration = getTribesmanSlowAcceleration(tribesman);
               physicsComponent.acceleration.x = acceleration * Math.sin(targetDirection);
               physicsComponent.acceleration.y = acceleration * Math.cos(targetDirection);
            } else if (distance < Vars.BATTLEAXE_IDEAL_USE_RANGE - 10) {
               // Move futher away
               const acceleration = getTribesmanSlowAcceleration(tribesman);
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
            
            const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
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
      const ageTicks = getAgeTicks(transformComponent);
      if (ageTicks % (Settings.TPS / 2) === 0) {
         const tribeComponent = TribeComponentArray.getComponent(tribesman);
         const pathExists = pathToEntityExists(tribesman, huntedEntity, tribeComponent.tribe, getTribesmanRadius(tribesman));
         if (!pathExists) {
            const isRepairing = attemptToRepairBuildings(tribesman, hammerItemSlot);
            if (isRepairing) {
               return;
            }
         }
      } else {
         const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
         if (tribesmanComponent.currentAIType === TribesmanAIType.repairing) {
            const isRepairing = attemptToRepairBuildings(tribesman, hammerItemSlot);
            if (isRepairing) {
               return;
            }
         }
      }
   }

   const physicsComponent = PhysicsComponentArray.getComponent(tribesman);
   const desiredAttackRange = getTribesmanDesiredAttackRange(tribesman);

   const distance = getDistanceFromPointToEntity(transformComponent.position, huntedEntity) - getTribesmanRadius(tribesman);
   if (willStopAtDesiredDistance(physicsComponent, desiredAttackRange, distance)) {
      // If the tribesman will stop too close to the target, move back a bit
      if (willStopAtDesiredDistance(physicsComponent, desiredAttackRange - 20, distance)) {
         physicsComponent.acceleration.x = getTribesmanSlowAcceleration(tribesman) * Math.sin(transformComponent.rotation + Math.PI);
         physicsComponent.acceleration.y = getTribesmanSlowAcceleration(tribesman) * Math.cos(transformComponent.rotation + Math.PI);
      } else {
         stopEntity(physicsComponent);
      }

      physicsComponent.targetRotation = transformComponent.position.calculateAngleBetween(huntedEntityTransformComponent.position);
      physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;
   
      // If in melee range, try to do a melee attack
      doMeleeAttack(tribesman);

      clearTribesmanPath(tribesman);
   } else {
      const pointDistance = transformComponent.position.calculateDistanceBetween(huntedEntityTransformComponent.position);
      const targetDirectRadius = pointDistance - distance;

      const goalRadius = Math.floor((desiredAttackRange + targetDirectRadius) / PathfindingSettings.NODE_SEPARATION);
      const failureDefault = isAggressive ? PathfindFailureDefault.returnClosest : PathfindFailureDefault.throwError;
      pathfindToPosition(tribesman, huntedEntityTransformComponent.position.x, huntedEntityTransformComponent.position.y, huntedEntity, TribesmanPathType.default, goalRadius, failureDefault);
   }

   setLimbActions(inventoryUseComponent, LimbAction.none);

   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
   tribesmanComponent.currentAIType = TribesmanAIType.attacking;
}
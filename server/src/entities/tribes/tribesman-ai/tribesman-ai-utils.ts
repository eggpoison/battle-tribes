import { PathfindingSettings, Settings } from "webgl-test-shared/dist/settings";
import Board from "../../../Board";
import Entity from "../../../Entity";
import Tribe from "../../../Tribe";
import { getEntitiesInRange, stopEntity, willStopAtDesiredDistance } from "../../../ai-shared";
import { PhysicsComponentArray } from "../../../components/PhysicsComponent";
import { EntityRelationship, TribeComponentArray, getEntityRelationship } from "../../../components/TribeComponent";
import { TribesmanPathType, TribesmanAIComponentArray } from "../../../components/TribesmanAIComponent";
import { entityCanBlockPathfinding, getEntityPathfindingGroupID, PathfindFailureDefault, getEntityFootprint, PathfindOptions, pathfind, smoothPath, positionIsAccessible, replacePathfindingNodeGroupID, entityHasReachedNode, getAngleToNode, getClosestPathfindNode, getDistanceToNode, pathIsClear } from "../../../pathfinding";
import { TRIBESMAN_TURN_SPEED } from "./tribesman-ai";
import { EntityType } from "webgl-test-shared/dist/entities";
import { ITEM_INFO_RECORD, ITEM_TYPE_RECORD, Inventory, InventoryName, ItemInfoRecord, ToolItemInfo } from "webgl-test-shared/dist/items";
import { distance, angle } from "webgl-test-shared/dist/utils";
import { doorIsClosed, toggleDoor } from "../../../components/DoorComponent";
import { InventoryUseComponentArray, getInventoryUseInfo } from "../../../components/InventoryUseComponent";
import { TribesmanTitle } from "webgl-test-shared/dist/titles";
import { TRIBE_INFO_RECORD } from "webgl-test-shared/dist/tribes";
import { TribeMemberComponentArray, tribeMemberHasTitle } from "../../../components/TribeMemberComponent";
import { SpikesComponentArray } from "../../../components/SpikesComponent";
import { TRIBE_WARRIOR_VISION_RANGE } from "../tribe-warrior";
import { TRIBE_WORKER_VISION_RANGE, TRIBE_WORKER_RADIUS } from "../tribe-worker";

const enum Vars {
   BLOCKING_TRIBESMAN_DISTANCE = 80,
   /** How far off the target the pathfinding can be before recalculating */
   PATH_RECALCULATE_DIST = 32,
   ACCELERATION = 400,
   SLOW_ACCELERATION = 200
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
   return Vars.SLOW_ACCELERATION * getAccelerationMultiplier(tribesmanID);
}

export function getTribesmanAcceleration(tribesmanID: number): number {
   return Vars.ACCELERATION * getAccelerationMultiplier(tribesmanID);
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

      return distance(goalX, goalY, pathTargetX, pathTargetY) >= goalRadiusNodes * PathfindingSettings.NODE_SEPARATION + Vars.PATH_RECALCULATE_DIST;
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
         
         const acceleration = getTribesmanAcceleration(tribesman.id);
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
            const acceleration = getTribesmanAcceleration(tribesman.id);
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

const convertEntityPathfindingGroupID = (entity: Entity, oldGroupID: number, newGroupID: number): void => {
   for (const node of entity.occupiedPathfindingNodes) {
      replacePathfindingNodeGroupID(node, oldGroupID, newGroupID);
   }
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

/* INVENTORY UTILS */

/** Returns 0 if no tool is in the inventory */
export function getBestToolItemSlot(inventory: Inventory, toolCategory: keyof ItemInfoRecord): number | null {
   let bestLevel = 0;
   let bestItemSlot: number | null = null;

   for (let i = 0; i < inventory.items.length; i++) {
      const item = inventory.items[i];

      const itemCategory = ITEM_TYPE_RECORD[item.type];
      if (itemCategory === toolCategory) {
         const itemInfo = ITEM_INFO_RECORD[item.type] as ToolItemInfo;
         if (itemInfo.level > bestLevel) {
            bestLevel = itemInfo.level;
            bestItemSlot = inventory.getItemSlot(item);
         }
      }
   }

   return bestItemSlot;
}
import { EntityRelationship, getEntityRelationship, TribeComponentArray } from "../../../components/TribeComponent";
import { Entity, EntityType } from "battletribes-shared/entities";
import { TribesmanTitle } from "battletribes-shared/titles";
import { TRIBE_INFO_RECORD } from "battletribes-shared/tribes";
import { SpikesComponentArray } from "../../../components/SpikesComponent";
import { Inventory, ITEM_TYPE_RECORD, ITEM_INFO_RECORD, HammerItemInfo } from "battletribes-shared/items/items";
import { TransformComponent, TransformComponentArray } from "../../../components/TransformComponent";
import { getEntityLayer, getEntityType, getGameTicks } from "../../../world";
import { CircularBox } from "../../../../../shared/src/boxes/CircularBox";
import { tribeMemberHasTitle, TribesmanComponentArray } from "../../../components/TribesmanComponent";
import { Settings, PathfindingSettings } from "../../../../../shared/src/settings";
import { Path, entityCanBlockPathfinding, getEntityPathfindingGroupID, convertEntityPathfindingGroupID, getEntityFootprint, findMultiLayerPath, positionIsAccessible, PathfindFailureDefault, PathfindOptions } from "../../../pathfinding";
import Tribe from "../../../Tribe";
import { AIPathfindingComponent, AIPathfindingComponentArray } from "../../../components/AIPathfindingComponent";

const enum Vars {
   BLOCKING_TRIBESMAN_DISTANCE = 80,
   /** How far off the target the pathfinding can be before recalculating */
   PATH_RECALCULATE_DIST = 32,
   ACCELERATION = 700,
   SLOW_ACCELERATION = 400
}

/** Max distance from the attack position that the attack will be registered from */
export function getTribesmanAttackRadius(tribesman: Entity): number {
   if (getEntityType(tribesman) === EntityType.tribeWorker) {
      return 35;
   } else {
      return 45;
   }
}

/** How far the tribesman wants to be away from their target when attacking */
export function getTribesmanDesiredAttackRange(): number {
   // @Incomplete: these shouldn't be hardcoded, they should be per-swing.

   // Unarmed: 6
   return 6;
}

/**
 * @param transformComponent The tribesman's transform component
 */
export function getHumanoidRadius(transformComponent: TransformComponent): number {
   return ((transformComponent.hitboxes[0]).box as CircularBox).radius;
}

const isCollidingWithCoveredSpikes = (tribesman: Entity): boolean => {
   const layer = getEntityLayer(tribesman);
   const collisionPairs = layer.getEntityCollisionPairs(tribesman);

   for (let i = 0; i < collisionPairs.length; i++) {
      const entityID = collisionPairs[i].collidingEntity;

      if (SpikesComponentArray.hasComponent(entityID)) {
         const spikesComponent = SpikesComponentArray.getComponent(entityID);
         if (spikesComponent.isCovered) {
            return true;
         }
      }
   }

   return false;
}

const getAccelerationMultiplier = (tribeMember: Entity): number => {
   const tribeComponent = TribeComponentArray.getComponent(tribeMember);
   
   let multiplier = TRIBE_INFO_RECORD[tribeComponent.tribe.tribeType].moveSpeedMultiplier;

   if (TribesmanComponentArray.hasComponent(tribeMember)) {
      const tribesmanComponent = TribesmanComponentArray.getComponent(tribeMember);
      
      // @Incomplete: only do when wearing the bush suit
      if (tribesmanComponent.lastPlantCollisionTicks >= getGameTicks() - 1) {
         multiplier *= 0.5;
      }
      
      if (tribeMemberHasTitle(tribesmanComponent, TribesmanTitle.sprinter)) {
         multiplier *= 1.2;
      }
   }

   if (isCollidingWithCoveredSpikes(tribeMember)) {
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

export function clearTribesmanPath(tribesman: Entity): void {
   const aiPathfindingComponent = AIPathfindingComponentArray.getComponent(tribesman);
   aiPathfindingComponent.paths.splice(0, aiPathfindingComponent.paths.length);
}

export function getFinalPath(aiPathfindingComponent: AIPathfindingComponent): Path | null {
   if (aiPathfindingComponent.paths.length > 0) {
      return aiPathfindingComponent.paths[aiPathfindingComponent.paths.length - 1];
   }
   return null;
}

const getPotentialBlockingTribesmen = (tribesman: Entity): ReadonlyArray<Entity> => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.hitboxes[0];
   
   const layer = getEntityLayer(tribesman);
   
   const minChunkX = Math.max(Math.min(Math.floor((tribesmanHitbox.box.position.x - Vars.BLOCKING_TRIBESMAN_DISTANCE/2) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((tribesmanHitbox.box.position.x + Vars.BLOCKING_TRIBESMAN_DISTANCE/2) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((tribesmanHitbox.box.position.y - Vars.BLOCKING_TRIBESMAN_DISTANCE/2) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((tribesmanHitbox.box.position.y + Vars.BLOCKING_TRIBESMAN_DISTANCE/2) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   
   const blockingTribesmen = new Array<Entity>();
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);

         for (let i = 0; i < chunk.entities.length; i++) {
            const entity = chunk.entities[i];
            if (blockingTribesmen.indexOf(entity) !== -1 || entity === tribesman) {
               continue;
            }

            const relationship = getEntityRelationship(tribesman, entity);
            if (relationship === EntityRelationship.friendly) {
               blockingTribesmen.push(entity);
            }
         }
      }
   }
   return blockingTribesmen;
}

const preparePathfinding = (targetEntity: Entity, tribe: Tribe, blockingTribesman: ReadonlyArray<Entity>): void => {
   // @Cleanup: why don't we just convert all the entities to 0?
   
   // Ignore the target
   if (targetEntity !== 0) {
      if (entityCanBlockPathfinding(targetEntity)) {
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

const cleanupPathfinding = (targetEntity: Entity | 0, tribe: Tribe, blockingTribesman: ReadonlyArray<Entity>): void => {
   // Reset the target
   if (targetEntity !== 0) {
      // @Speed: Some places which call this have access to the entity already
      if (entityCanBlockPathfinding(targetEntity)) {
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

// @Cleanup: these two functions do much the same thing. which one to keep?

export function entityIsAccessible(tribesman: Entity, entity: Entity, tribe: Tribe, goalRadius: number): boolean {
   const blockingTribesmen = getPotentialBlockingTribesmen(tribesman);
   preparePathfinding(entity, tribe, blockingTribesmen);

   const transformComponent = TransformComponentArray.getComponent(entity);
   const entityHitbox = transformComponent.hitboxes[0];
   
   const layer = getEntityLayer(entity);
   const isAccessible = positionIsAccessible(layer, entityHitbox.box.position.x, entityHitbox.box.position.y, tribe.pathfindingGroupID, getEntityFootprint(goalRadius));

   cleanupPathfinding(entity, tribe, blockingTribesmen);

   return isAccessible;
}

export function pathToEntityExists(tribesman: Entity, huntedEntity: Entity, goalRadius: number): boolean {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.hitboxes[0];
   
   const tribeComponent = TribeComponentArray.getComponent(tribesman);

   const huntedEntityTransformComponent = TransformComponentArray.getComponent(huntedEntity);
   const targetHitbox = huntedEntityTransformComponent.hitboxes[0];
   
   const blockingTribesmen = getPotentialBlockingTribesmen(tribesman);
   preparePathfinding(huntedEntity, tribeComponent.tribe, blockingTribesmen);
   
   const options: PathfindOptions = {
      goalRadius: Math.floor(goalRadius / PathfindingSettings.NODE_SEPARATION),
      failureDefault: PathfindFailureDefault.none
   };
   const path = findMultiLayerPath(getEntityLayer(tribesman), getEntityLayer(huntedEntity), tribesmanHitbox.box.position.x, tribesmanHitbox.box.position.y, targetHitbox.box.position.x, targetHitbox.box.position.y, tribeComponent.tribe.pathfindingGroupID, getEntityFootprint(getHumanoidRadius(transformComponent)), options);

   cleanupPathfinding(huntedEntity, tribeComponent.tribe, blockingTribesmen);

   return path.length > 0;
}

/* INVENTORY UTILS */

/** Returns 0 if no hammer is in the inventory */
export function getBestHammerItemSlot(inventory: Inventory): number | null {
   let bestRepairAmount = 0;
   let bestItemSlot: number | null = null;

   for (let i = 0; i < inventory.items.length; i++) {
      const item = inventory.items[i];

      const itemCategory = ITEM_TYPE_RECORD[item.type];
      if (itemCategory === "hammer") {
         const itemInfo = ITEM_INFO_RECORD[item.type] as HammerItemInfo;
         if (itemInfo.repairAmount > bestRepairAmount) {
            bestRepairAmount = itemInfo.repairAmount;
            bestItemSlot = inventory.getItemSlot(item);
         }
      }
   }

   return bestItemSlot;
}
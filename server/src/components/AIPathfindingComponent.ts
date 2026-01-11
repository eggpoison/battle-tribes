import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { InventoryName } from "../../../shared/src/items/items";
import { Settings, PathfindingSettings } from "../../../shared/src/settings";
import { TileType } from "../../../shared/src/tiles";
import { angleToPoint, assert, curveWeight, distance, Point, polarVec2, Vector } from "../../../shared/src/utils";
import { getEntitiesInRange, getVelocityClosenessAdjustmentFactor } from "../ai-shared";
import { TRIBESMAN_TURN_SPEED } from "../entities/tribes/tribesman-ai/tribesman-ai";
import { getHumanoidRadius, getTribesmanAcceleration } from "../entities/tribes/tribesman-ai/tribesman-ai-utils";
import { Hitbox, applyAccelerationFromGround, getHitboxTile, getHitboxVelocity, turnHitboxToAngle } from "../hitboxes";
import Layer from "../Layer";
import { surfaceLayer } from "../layers";
import { convertEntityPathfindingGroupID, entityCanBlockPathfinding, entityHasReachedNode, runPathfindingMultiLayer, getAngleToNode, getDistanceToNode, getEntityFootprint, getEntityPathfindingGroupID, getPathfindingNodePos, Path, PathfindFailureDefault, PathfindOptions, positionIsAccessible } from "../pathfinding";
import Tribe from "../Tribe";
import { getEntityAgeTicks, getEntityLayer, getEntityType, getGameTicks } from "../world";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
import { doorIsClosed, toggleDoor } from "./DoorComponent";
import { InventoryUseComponentArray } from "./InventoryUseComponent";
import { changeEntityLayer, TransformComponentArray } from "./TransformComponent";
import { EntityRelationship, getEntityRelationship, TribeComponentArray } from "./TribeComponent";
import { TribesmanPathType } from "./TribesmanAIComponent";
import { TribesmanComponentArray } from "./TribesmanComponent";

const enum Vars {
   BLOCKING_TRIBESMAN_DISTANCE = 80,
   /** How far off the target the pathfinding can be before recalculating */
   PATH_RECALCULATE_DIST = 32
}

export class AIPathfindingComponent {
   /**
    * Stores an array of all paths the entity is going to follow to reach its destination.
    * Once an indiviual path is completed, it is removed from this array.
   */
   public paths = new Array<Path>();
}

export const AIPathfindingComponentArray = new ComponentArray<AIPathfindingComponent>(ServerComponentType.aiPathfinding, true, getDataLength, addDataToPacket);

const shouldRecalculatePath = (tribesman: Entity, goalX: number, goalY: number, goalLayer: Layer, goalRadiusNodes: number): boolean => {
   const aiPathfindingComponent = AIPathfindingComponentArray.getComponent(tribesman); // @Speed

   if (aiPathfindingComponent.paths.length === 0) {
      return true;
   }

   const currentPath = aiPathfindingComponent.paths[0];
   
   // @Speed
   // Recalculate if the tribesman isn't making any progress
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.hitboxes[0];

   const tribesmanVelocity = getHitboxVelocity(tribesmanHitbox);
   const vx = tribesmanVelocity.x;
   const vy = tribesmanVelocity.y;
   const velocitySquare = vx * vx + vy * vy;
   
   const ageTicks = getEntityAgeTicks(tribesman);
   if (currentPath.rawPath.length > 2 && ageTicks % Settings.TICK_RATE === 0 && velocitySquare < 10 * 10) {
      return true;
   }

   const finalPath = aiPathfindingComponent.paths[aiPathfindingComponent.paths.length - 1];

   // Recalculate if the current path target is on the wrong layer
   if (finalPath.layer !== goalLayer) {
      return true;
   }
   
   // Recalculate if the goal has moved too far away from the path's final node

   const pathTargetNode = finalPath.smoothPath[finalPath.smoothPath.length - 1];
   
   // @Hack: probs better to have a failed/succeeded boolean on the path
   // If there is no path, always recalculate
   if (typeof pathTargetNode === "undefined") {
      return true;
   }
   
   const pathTargetX = (pathTargetNode % PathfindingSettings.NODES_IN_WORLD_WIDTH - 1) * PathfindingSettings.NODE_SEPARATION;
   const pathTargetY = (Math.floor(pathTargetNode / PathfindingSettings.NODES_IN_WORLD_WIDTH) - 1) * PathfindingSettings.NODE_SEPARATION;

   return distance(goalX, goalY, pathTargetX, pathTargetY) >= goalRadiusNodes * PathfindingSettings.NODE_SEPARATION + Vars.PATH_RECALCULATE_DIST;
}

const openDoors = (tribesman: Entity, tribe: Tribe): void => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.hitboxes[0];
   
   const layer = getEntityLayer(tribesman);
   
   const offsetMagnitude = getHumanoidRadius(transformComponent) + 20;
   const checkX = tribesmanHitbox.box.position.x + offsetMagnitude * Math.sin(tribesmanHitbox.box.angle);
   const checkY = tribesmanHitbox.box.position.y + offsetMagnitude * Math.cos(tribesmanHitbox.box.angle);
   const entitiesInFront = getEntitiesInRange(layer, checkX, checkY, 40);
   for (let i = 0; i < entitiesInFront.length; i++) {
      const entity = entitiesInFront[i];
      if (getEntityType(entity) !== EntityType.door) {
         continue;
      }

      // Only open friendly doors
      const tribeComponent = TribeComponentArray.getComponent(entity);
      if (tribeComponent.tribe !== tribe) {
         continue;
      }

      if (doorIsClosed(entity)) {
         toggleDoor(entity);

         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
         const useInfo = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
         useInfo.lastAttackTicks = getGameTicks();
      }
   }
}

export function continueCurrentPath(tribesman: Entity): boolean {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const aiPathfindingComponent = AIPathfindingComponentArray.getComponent(tribesman); // @Speed
   
   // If the entity is currently in position to change layers, do so
   const finalPath = aiPathfindingComponent.paths[aiPathfindingComponent.paths.length - 1];
   if (getEntityLayer(tribesman) !== finalPath.layer) {
      const transformComponent = TransformComponentArray.getComponent(tribesman);
      const hitbox = transformComponent.hitboxes[0] as Hitbox;
      const currentTileIndex = getHitboxTile(hitbox);
      if (surfaceLayer.getTileType(currentTileIndex) === TileType.dropdown) {
         changeEntityLayer(tribesman, finalPath.layer);
      }
   }

   const path = aiPathfindingComponent.paths[0];
   const nodes = path.smoothPath;

   if (entityHasReachedNode(transformComponent, nodes[0])) {
      // If passed the next node, remove it
      nodes.shift();
   }

   if (nodes.length > 0) {
      const nextNode = nodes[0];
      const targetDirection = getAngleToNode(transformComponent, nextNode);

      const tribesmanHitbox = transformComponent.hitboxes[0];

      // Turn to the target
      // turnHitboxToAngle(tribesmanHitbox, targetDirection, TRIBESMAN_TURN_SPEED, 1, false);

      if (tribesmanHitbox.entity === tribesmanHitbox.rootEntity) {
         // @Temporary @Hack: have moved this inside this check so that the tribesman's AI can aim the bow while riding.
         turnHitboxToAngle(tribesmanHitbox, targetDirection, TRIBESMAN_TURN_SPEED, 1, false);

         // If the tribesman is close to the next node, slow down as to not overshoot it
         const distanceFromNextNode = getDistanceToNode(transformComponent, nextNode);
         const accel = getTribesmanAcceleration(tribesman);
         const adjustmentFactor = getVelocityClosenessAdjustmentFactor(distanceFromNextNode, 80);
         applyAccelerationFromGround(tribesmanHitbox, polarVec2(accel * adjustmentFactor, tribesmanHitbox.box.angle));
      } else {
         // If being carried by something, instead mark the move intention for the carrier to deal with

         // @HACK so that tribesmen on cows shooting will avoid shooting each-other!!
         // @HACK @HACK @HACK massive jiggling @ASS.
         // @Copynpaste from ai-shared herd boid mechanics
         

         // @Copynpaste
         const TURN_CONSTANT = Math.PI * Settings.DT_S;

         // Average angle of nearby entities
         let totalXVal: number = 0;
         let totalYVal: number = 0;
      
         let centerX = 0;
         let centerY = 0;

         const findHerdMembers = (visibleEntities: ReadonlyArray<Entity>): ReadonlyArray<Entity> => {
            const herdMembers = new Array<Entity>();
            for (let i = 0; i < visibleEntities.length; i++) {
               const entity = visibleEntities[i];
               const relationship = getEntityRelationship(tribesman, entity);
               if (relationship === EntityRelationship.friendly) {
                  herdMembers.push(entity);
               }
            }
            return herdMembers;
         }

         const aiHelperComponent = AIHelperComponentArray.getComponent(tribesman);
         const herdMembers = findHerdMembers(aiHelperComponent.visibleEntities);
      
         let closestHerdMember: Entity | undefined;
         let minDist = Number.MAX_SAFE_INTEGER;
         let numHerdMembers = 0;
         for (let i = 0; i < herdMembers.length; i++) {
            const herdMember = herdMembers[i];
      
            const herdMemberTransformComponent = TransformComponentArray.getComponent(herdMember);
            // @HACK
            const herdMemberHitbox = herdMemberTransformComponent.hitboxes[0];
      
            const distance = tribesmanHitbox.box.position.distanceTo(herdMemberHitbox.box.position);
            if (distance < minDist) {
               closestHerdMember = herdMember;
               minDist = distance;
            }
      
            totalXVal += Math.sin(herdMemberHitbox.box.angle);
            totalYVal += Math.cos(herdMemberHitbox.box.angle);
      
            centerX += herdMemberHitbox.box.position.x;
            centerY += herdMemberHitbox.box.position.y;
            numHerdMembers++;
         }
      
         centerX /= numHerdMembers;
         centerY /= numHerdMembers;
      
         // @Cleanup: We can probably clean up a lot of this code by using Entity's built in turn functions
         let angularVelocity = 0;
         
         // SEPARATION
         // Steer away from herd members who are too close
         const minSeparationDistance = 180;
         let distanceVector: Point | undefined;
         if (minDist < minSeparationDistance && typeof closestHerdMember !== "undefined") {
            // Calculate the weight of the separation
            let weight = 1 - minDist / minSeparationDistance;
            weight = curveWeight(weight, 2, 0.2);
            
            const herdMemberTransformComponent = TransformComponentArray.getComponent(closestHerdMember);
            // @Hack
            const herdMemberHitbox = herdMemberTransformComponent.hitboxes[0];
            
            // @Speed: Garbage collection
            distanceVector = angleToPoint(herdMemberHitbox.box.position.angleTo(tribesmanHitbox.box.position));
         }

         const pathfindingAngle = angleToPoint(tribesmanHitbox.box.angle);
         
         if (typeof distanceVector === "undefined") {
            distanceVector = pathfindingAngle.copy();
         }

         // @HACK average the angles (isn't even weighted holy shit!!!)
         const a = pathfindingAngle;
         const b = distanceVector;
         const c = new Point(a.x + b.x, a.y + b.y);
         
         const tribesmanComponent = TribesmanComponentArray.getComponent(tribesman);
         tribesmanComponent.movementIntention = c;
      }

      // @Speed: only do this if we know the path has a door in it
      // Open any doors in their way
      const ageTicks = getEntityAgeTicks(tribesman);
      if (ageTicks % ((Settings.TICK_RATE / 6) | 0) === 0) {
         const tribeComponent = TribeComponentArray.getComponent(tribesman); // @Speed?
         openDoors(tribesman, tribeComponent.tribe);
      }

      return false;
   } else {
      // Reached path!
      aiPathfindingComponent.paths.shift();
      return true;
   }
}

// @Cleanup: This really shouldn't be necessary...
export function clearPathfinding(tribesman: Entity): void {
   const aiPathfindingComponent = AIPathfindingComponentArray.getComponent(tribesman); // @Speed
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
   // @HACK: to stop the tribesman from trying to pathfind around the cow its riding
   if (tribesmanHitbox.entity !== tribesmanHitbox.rootEntity) {
      blockingTribesmen.push(tribesmanHitbox.rootEntity);
   }
   // @HACK @Speed cuz the tribesman's held item is blocking pathfinding
   for (const hitbox of transformComponent.hitboxes) {
      for (const childHitbox of hitbox.children) {
         if (getEntityType(childHitbox.entity) === EntityType.heldItem) {
            blockingTribesmen.push(childHitbox.entity);
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

export function pathfindTribesman(tribesman: Entity, goalX: number, goalY: number, goalLayer: Layer, targetEntityID: number, pathType: TribesmanPathType, goalRadius: number, failureDefault: PathfindFailureDefault): boolean {
   assert(goalX >= 0 && goalX < Settings.WORLD_UNITS && goalY >= 0 && goalY < Settings.WORLD_UNITS);
   
   // If moving to a new target node, recalculate path
   if (shouldRecalculatePath(tribesman, goalX, goalY, goalLayer, goalRadius)) {
      const transformComponent = TransformComponentArray.getComponent(tribesman); // @Speed
      const tribesmanHitbox = transformComponent.hitboxes[0];
      
      const tribeComponent = TribeComponentArray.getComponent(tribesman); // @Speed
      const aiPathfindingComponent = AIPathfindingComponentArray.getComponent(tribesman); // @Speed
      
      const footprint = getEntityFootprint(getHumanoidRadius(transformComponent));
      const tribe = tribeComponent.tribe;
      const layer = getEntityLayer(tribesman);

      const blockingTribesmen = getPotentialBlockingTribesmen(tribesman);
      preparePathfinding(targetEntityID, tribe, blockingTribesmen);
      
      const options: PathfindOptions = {
         goalRadius: goalRadius,
         failureDefault: failureDefault
      };
      aiPathfindingComponent.paths = runPathfindingMultiLayer(layer, goalLayer, tribesmanHitbox.box.position.x, tribesmanHitbox.box.position.y, goalX, goalY, tribe.pathfindingGroupID, footprint, options);

      cleanupPathfinding(targetEntityID, tribe, blockingTribesmen);

      if (aiPathfindingComponent.paths[0].isFailed) {
         return false;
      }
   }

   return continueCurrentPath(tribesman);
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
   
   const queryOptions: PathfindOptions = {
      goalRadius: Math.floor(goalRadius / PathfindingSettings.NODE_SEPARATION),
      failureDefault: PathfindFailureDefault.none
   };
   const path = runPathfindingMultiLayer(getEntityLayer(tribesman), getEntityLayer(huntedEntity), tribesmanHitbox.box.position.x, tribesmanHitbox.box.position.y, targetHitbox.box.position.x, targetHitbox.box.position.y, tribeComponent.tribe.pathfindingGroupID, getEntityFootprint(getHumanoidRadius(transformComponent)), queryOptions);

   cleanupPathfinding(huntedEntity, tribeComponent.tribe, blockingTribesmen);

   return path.length > 0;
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket() {}
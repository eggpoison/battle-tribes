import { TribesmanAIType } from "webgl-test-shared/dist/components";
import { Settings } from "webgl-test-shared/dist/settings";
import { getEntitiesInRange, stopEntity } from "../../../ai-shared";
import { PhysicsComponentArray } from "../../../components/PhysicsComponent";
import { TribesmanAIComponentArray, TribesmanPathType } from "../../../components/TribesmanAIComponent";
import { PathfindFailureDefault, getEntityFootprint, positionIsAccessible } from "../../../pathfinding";
import { pathfindToPosition, clearTribesmanPath, getTribesmanRadius, getTribesmanVisionRange } from "./tribesman-ai-utils";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { Point, randInt, distance } from "webgl-test-shared/dist/utils";
import Board from "../../../Board";
import Tribe from "../../../Tribe";
import { TribesmanGoal } from "./tribesman-goals";
import { TribeComponentArray } from "../../../components/TribeComponent";
import { TransformComponentArray } from "../../../components/TransformComponent";


const generateTribeAreaPatrolPosition = (tribesman: EntityID, tribe: Tribe): Point | null => {
   // Filter tiles in tribe area
   const potentialTiles = tribe.getArea();

   // Randomly look for a place to patrol to
   while (potentialTiles.length > 0) {
      const idx = randInt(0, potentialTiles.length - 1);
      const tileIndex = potentialTiles[idx];
      
      const tileX = Board.getTileX(tileIndex);
      const tileY = Board.getTileY(tileIndex);
      const x = (tileX + Math.random()) * Settings.TILE_SIZE;
      const y = (tileY + Math.random()) * Settings.TILE_SIZE;

      if (positionIsAccessible(x, y, tribe.pathfindingGroupID, getEntityFootprint(getTribesmanRadius(tribesman)))) {
         return new Point(x, y);
      }

      potentialTiles.splice(idx, 1);
   }

   return null;
}

const generateRandomExplorePosition = (tribesman: EntityID, tribe: Tribe): Point | null => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   
   const visionRange = getTribesmanVisionRange(tribesman);
   const footprint = getEntityFootprint(getTribesmanRadius(tribesman));
   
   let distToTotem: number;
   if (tribe.totem !== null) {
      const totemTransformComponent = TransformComponentArray.getComponent(tribe.totem);
      distToTotem = transformComponent.position.calculateDistanceBetween(totemTransformComponent.position);
   } else {
      distToTotem = 0;
   }
   
   for (let attempts = 0; attempts < 100; attempts++) {
      const offsetMagnitude = visionRange * Math.random();
      const offsetDirection = 2 * Math.PI * Math.random();

      const x = transformComponent.position.x + offsetMagnitude * Math.sin(offsetDirection);
      const y = transformComponent.position.y + offsetMagnitude * Math.cos(offsetDirection);

      // Always explore further away from the totem
      // @Copynpaste
      let currentDistToTotem: number;
      if (tribe.totem !== null) {
         const totemTransformComponent = TransformComponentArray.getComponent(tribe.totem);
         currentDistToTotem = distance(x, y, totemTransformComponent.position.x, totemTransformComponent.position.y);
      } else {
         currentDistToTotem = 0;
      }
      if (currentDistToTotem < distToTotem) {
         continue;
      }

      if (!positionIsAccessible(x, y, tribe.pathfindingGroupID, footprint)) {
         continue;
      }
      
      const nearbyEntities = getEntitiesInRange(x, y, 20);
      if (nearbyEntities.length === 0) {
         return new Point(x, y);
      }
   }

   return null;
}

const generatePatrolPosition = (tribesman: EntityID, tribe: Tribe, goal: TribesmanGoal | null): Point | null => {
   switch (Board.getEntityType(tribesman)) {
      case EntityType.tribeWorker: {
         if (goal === null || Board.isNight()) {
            return generateTribeAreaPatrolPosition(tribesman, tribe);
         } else {
            return generateRandomExplorePosition(tribesman, tribe);
         }
      }
      case EntityType.tribeWarrior: {
         return generateTribeAreaPatrolPosition(tribesman, tribe);
      }
   }

   throw new Error();
}

export function tribesmanDoPatrol(tribesman: EntityID, goal: TribesmanGoal | null): boolean {
   const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(tribesman);
   
   if (tribesmanAIComponent.targetPatrolPositionX === -1 && Math.random() < 0.3 / Settings.TPS) {
      const tribeComponent = TribeComponentArray.getComponent(tribesman);
      const patrolPosition = generatePatrolPosition(tribesman, tribeComponent.tribe, goal);
      
      if (patrolPosition !== null) {
         const didPathfind = pathfindToPosition(tribesman, patrolPosition.x, patrolPosition.y, 0, TribesmanPathType.default, 0, PathfindFailureDefault.returnEmpty);
         if (didPathfind) {
            // Patrol to that position
            tribesmanAIComponent.targetPatrolPositionX = patrolPosition.x;
            tribesmanAIComponent.targetPatrolPositionY = patrolPosition.y;
            tribesmanAIComponent.currentAIType = TribesmanAIType.patrolling;
            return true;
         }
      }
   } else if (tribesmanAIComponent.targetPatrolPositionX !== -1) {
      const isPathfinding = pathfindToPosition(tribesman, tribesmanAIComponent.targetPatrolPositionX, tribesmanAIComponent.targetPatrolPositionY, 0, TribesmanPathType.default, 0, PathfindFailureDefault.returnEmpty);

      // Reset target patrol position when not patrolling
      if (!isPathfinding) {
         const physicsComponent = PhysicsComponentArray.getComponent(tribesman);
         stopEntity(physicsComponent);

         tribesmanAIComponent.currentAIType = TribesmanAIType.idle;
         tribesmanAIComponent.targetPatrolPositionX = -1;
         clearTribesmanPath(tribesman);
         return false;
      }
      
      tribesmanAIComponent.currentAIType = TribesmanAIType.patrolling;
      return true;
   }

   return false;
}
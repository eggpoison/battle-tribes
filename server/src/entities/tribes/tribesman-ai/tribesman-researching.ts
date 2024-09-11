import { TribesmanAIType } from "battletribes-shared/components";
import { EntityID, LimbAction } from "battletribes-shared/entities";
import { TechInfo } from "battletribes-shared/techs";
import Board from "../../../Board";
import { moveEntityToPosition, getDistanceFromPointToEntity } from "../../../ai-shared";
import { InventoryUseComponentArray, setLimbActions } from "../../../components/InventoryUseComponent";
import { PhysicsComponentArray } from "../../../components/PhysicsComponent";
import { continueResearching, markPreemptiveMoveToBench, attemptToOccupyResearchBench, canResearchAtBench, shouldMoveToResearchBench } from "../../../components/ResearchBenchComponent";
import { TribeComponent, TribeComponentArray } from "../../../components/TribeComponent";
import { TribesmanAIComponentArray } from "../../../components/TribesmanAIComponent";
import { TRIBESMAN_TURN_SPEED } from "./tribesman-ai";
import { getTribesmanSlowAcceleration, getTribesmanAcceleration, getTribesmanRadius } from "./tribesman-ai-utils";
import { TransformComponentArray } from "../../../components/TransformComponent";

const getOccupiedResearchBenchID = (tribesman: EntityID, tribeComponent: TribeComponent): EntityID => {
   for (let i = 0; i < tribeComponent.tribe.researchBenches.length; i++) {
      const bench = tribeComponent.tribe.researchBenches[i];
      if (canResearchAtBench(bench, tribesman)) {
         return bench;
      }
   }

   return 0;
}

const getAvailableResearchBenchID = (tribesman: EntityID, tribeComponent: TribeComponent): EntityID => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   
   let id = 0;
   let minDist = Number.MAX_SAFE_INTEGER;

   for (let i = 0; i < tribeComponent.tribe.researchBenches.length; i++) {
      const bench = tribeComponent.tribe.researchBenches[i];
      if (!shouldMoveToResearchBench(bench, tribesman)) {
         continue;
      }

      const benchTransformComponent = TransformComponentArray.getComponent(bench);

      const dist = transformComponent.position.calculateDistanceBetween(benchTransformComponent.position);
      if (dist < minDist) {
         minDist = dist;
         id = bench;
      }
   }

   return id;
}

export function goResearchTech(tribesman: EntityID, tech: TechInfo): boolean {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribeComponent = TribeComponentArray.getComponent(tribesman);
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);

   // @Incomplete: use pathfinding
   
   // Continue researching at an occupied bench
   const occupiedBench = getOccupiedResearchBenchID(tribesman, tribeComponent);
   if (occupiedBench !== 0) {
      const benchTransformComponent = TransformComponentArray.getComponent(occupiedBench);
      
      const targetDirection = transformComponent.position.calculateAngleBetween(benchTransformComponent.position);
      const physicsComponent = PhysicsComponentArray.getComponent(tribesman);

      const slowAcceleration = getTribesmanSlowAcceleration(tribesman);
      physicsComponent.acceleration.x = slowAcceleration * Math.sin(targetDirection);
      physicsComponent.acceleration.y = slowAcceleration * Math.cos(targetDirection);

      physicsComponent.targetRotation = targetDirection;
      physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;
      
      continueResearching(occupiedBench, tribesman, tech);
      
      tribesmanComponent.targetResearchBenchID = occupiedBench;
      tribesmanComponent.currentAIType = TribesmanAIType.researching;

      const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
      setLimbActions(inventoryUseComponent, LimbAction.researching);
      
      return true;
   }
   
   const bench = getAvailableResearchBenchID(tribesman, tribeComponent);
   if (bench !== 0) {
      const benchTransformComponent = TransformComponentArray.getComponent(occupiedBench);

      markPreemptiveMoveToBench(bench, tribesman);
      moveEntityToPosition(tribesman, benchTransformComponent.position.x, benchTransformComponent.position.y, getTribesmanAcceleration(tribesman), TRIBESMAN_TURN_SPEED);
      
      tribesmanComponent.targetResearchBenchID = bench;
      tribesmanComponent.currentAIType = TribesmanAIType.researching;

      // If close enough, switch to doing research
      const dist = getDistanceFromPointToEntity(transformComponent.position, bench) - getTribesmanRadius(tribesman);
      if (dist < 50) {
         attemptToOccupyResearchBench(bench, tribesman);
      }

      const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
      setLimbActions(inventoryUseComponent, LimbAction.none);

      return true;
   }

   return false;
}
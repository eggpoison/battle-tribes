import { TribesmanAIType } from "webgl-test-shared/dist/components";
import { LimbAction } from "webgl-test-shared/dist/entities";
import { TechInfo } from "webgl-test-shared/dist/techs";
import Board from "../../../Board";
import Entity from "../../../Entity";
import { moveEntityToPosition, getDistanceFromPointToEntity } from "../../../ai-shared";
import { InventoryUseComponentArray, setLimbActions } from "../../../components/InventoryUseComponent";
import { PhysicsComponentArray } from "../../../components/PhysicsComponent";
import { continueResearching, markPreemptiveMoveToBench, attemptToOccupyResearchBench, canResearchAtBench, shouldMoveToResearchBench } from "../../../components/ResearchBenchComponent";
import { TribeComponent, TribeComponentArray } from "../../../components/TribeComponent";
import { TribesmanAIComponentArray } from "../../../components/TribesmanAIComponent";
import { TRIBESMAN_TURN_SPEED } from "./tribesman-ai";
import { getTribesmanSlowAcceleration, getTribesmanAcceleration, getTribesmanRadius } from "./tribesman-ai-utils";

const getOccupiedResearchBenchID = (tribesman: Entity, tribeComponent: TribeComponent): number => {
   for (let i = 0; i < tribeComponent.tribe.researchBenches.length; i++) {
      const bench = tribeComponent.tribe.researchBenches[i];
      if (canResearchAtBench(bench, tribesman)) {
         return bench.id;
      }
   }

   return 0;
}

const getAvailableResearchBenchID = (tribesman: Entity, tribeComponent: TribeComponent): number => {
   let id = 0;
   let minDist = Number.MAX_SAFE_INTEGER;

   for (let i = 0; i < tribeComponent.tribe.researchBenches.length; i++) {
      const bench = tribeComponent.tribe.researchBenches[i];

      if (!shouldMoveToResearchBench(bench, tribesman)) {
         continue;
      }

      const dist = tribesman.position.calculateDistanceBetween(bench.position);
      if (dist < minDist) {
         minDist = dist;
         id = bench.id;
      }
   }

   return id;
}

export function goResearchTech(tribesman: Entity, tech: TechInfo): boolean {
   const tribeComponent = TribeComponentArray.getComponent(tribesman.id);
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman.id);

   // @Incomplete: use pathfinding
   
   // Continue researching at an occupied bench
   const occupiedBenchID = getOccupiedResearchBenchID(tribesman, tribeComponent);
   if (occupiedBenchID !== 0) {
      const bench = Board.entityRecord[occupiedBenchID]!;
      
      const targetDirection = tribesman.position.calculateAngleBetween(bench.position);
      const physicsComponent = PhysicsComponentArray.getComponent(tribesman.id);

      const slowAcceleration = getTribesmanSlowAcceleration(tribesman.id);
      physicsComponent.acceleration.x = slowAcceleration * Math.sin(targetDirection);
      physicsComponent.acceleration.y = slowAcceleration * Math.cos(targetDirection);

      physicsComponent.targetRotation = targetDirection;
      physicsComponent.turnSpeed = TRIBESMAN_TURN_SPEED;
      
      continueResearching(bench, tribesman, tech);
      
      tribesmanComponent.targetResearchBenchID = occupiedBenchID;
      tribesmanComponent.currentAIType = TribesmanAIType.researching;

      const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman.id);
      setLimbActions(inventoryUseComponent, LimbAction.researching);
      
      return true;
   }
   
   const benchID = getAvailableResearchBenchID(tribesman, tribeComponent);
   if (benchID !== 0) {
      const bench = Board.entityRecord[benchID]!;
      
      markPreemptiveMoveToBench(bench, tribesman);
      moveEntityToPosition(tribesman, bench.position.x, bench.position.y, getTribesmanAcceleration(tribesman.id), TRIBESMAN_TURN_SPEED);
      
      tribesmanComponent.targetResearchBenchID = benchID;
      tribesmanComponent.currentAIType = TribesmanAIType.researching;

      // If close enough, switch to doing research
      const dist = getDistanceFromPointToEntity(tribesman.position, bench) - getTribesmanRadius(tribesman);
      if (dist < 50) {
         attemptToOccupyResearchBench(bench, tribesman);
      }

      const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman.id);
      setLimbActions(inventoryUseComponent, LimbAction.none);

      return true;
   }

   return false;
}
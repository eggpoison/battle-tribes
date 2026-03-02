import { TribesmanAIType } from "battletribes-shared/components";
import { Entity, EntityType, LimbAction } from "battletribes-shared/entities";
import { Tech } from "battletribes-shared/techs";
import { getDistanceFromPointToEntity } from "../../../ai-shared";
import { InventoryUseComponentArray, setLimbActions } from "../../../components/InventoryUseComponent";
import { continueResearching, markPreemptiveMoveToBench, attemptToOccupyResearchBench, canResearchAtBench, shouldMoveToResearchBench } from "../../../components/ResearchBenchComponent";
import { TribeComponentArray } from "../../../components/TribeComponent";
import { TribesmanAIComponentArray, TribesmanPathType } from "../../../components/TribesmanAIComponent";
import { TRIBESMAN_TURN_SPEED } from "./tribesman-ai";
import { getTribesmanSlowAcceleration, getHumanoidRadius } from "./tribesman-ai-utils";
import { TransformComponentArray } from "../../../components/TransformComponent";
import { Inventory, ItemType } from "../../../../../shared/src/items/items";
import { consumeItemFromSlot } from "../../../components/InventoryComponent";
import Tribe from "../../../Tribe";
import { assert, polarVec2 } from "../../../../../shared/src/utils";
import { getEntityLayer } from "../../../world";
import { PathfindingSettings } from "../../../../../shared/src/settings";
import { PathfindFailureDefault } from "../../../pathfinding";
import { applyAccelerationFromGround, turnHitboxToAngle } from "../../../hitboxes";
import { pathfindTribesman } from "../../../components/AIPathfindingComponent";

const getOccupiedResearchBenchID = (tribesman: Entity, tribe: Tribe): Entity => {
   for (const bench of tribe.getEntitiesByType(EntityType.researchBench)) {
      if (canResearchAtBench(bench, tribesman)) {
         return bench;
      }
   }
   return 0;
}

const getAvailableResearchBenchID = (tribesman: Entity, tribe: Tribe): Entity => {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.hitboxes[0];
   
   let id = 0;
   let minDist = Number.MAX_SAFE_INTEGER;

   for (const bench of tribe.getEntitiesByType(EntityType.researchBench)) {
      if (!shouldMoveToResearchBench(bench, tribesman)) {
         continue;
      }

      const benchTransformComponent = TransformComponentArray.getComponent(bench);
      const researchBenchHitbox = benchTransformComponent.hitboxes[0];

      const dist = tribesmanHitbox.box.position.distanceTo(researchBenchHitbox.box.position);
      if (dist < minDist) {
         minDist = dist;
         id = bench;
      }
   }

   return id;
}

export function goResearchTech(tribesman: Entity, tech: Tech): void {
   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanHitbox = transformComponent.hitboxes[0];
   
   const tribeComponent = TribeComponentArray.getComponent(tribesman);
   const tribe = tribeComponent.tribe;
   
   const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(tribesman);

   // Make sure that the tech requires researching
   assert(tribe.techRequiresResearching(tech));

   // If already researching at a bench, continue researching at an occupied bench
   const occupiedBench = getOccupiedResearchBenchID(tribesman, tribe);
   if (occupiedBench !== 0) {
      const benchTransformComponent = TransformComponentArray.getComponent(occupiedBench);
      const researchBenchHitbox = benchTransformComponent.hitboxes[0];
      
      const targetDir = tribesmanHitbox.box.position.angleTo(researchBenchHitbox.box.position);

      const slowAcceleration = getTribesmanSlowAcceleration(tribesman);
      applyAccelerationFromGround(tribesmanHitbox, polarVec2(slowAcceleration, targetDir));

      turnHitboxToAngle(tribesmanHitbox, targetDir, TRIBESMAN_TURN_SPEED, 0.5, false);
      
      continueResearching(occupiedBench, tribesman, tech);
      
      tribesmanAIComponent.targetResearchBenchID = occupiedBench;
      tribesmanAIComponent.currentAIType = TribesmanAIType.researching;

      const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
      setLimbActions(inventoryUseComponent, LimbAction.researching);

      return;
   }
   
   const bench = getAvailableResearchBenchID(tribesman, tribe);
   if (bench !== 0) {
      const benchTransformComponent = TransformComponentArray.getComponent(bench);
      const researchBenchHitbox = benchTransformComponent.hitboxes[0];

      const benchLayer = getEntityLayer(bench);

      markPreemptiveMoveToBench(bench, tribesman);
      pathfindTribesman(tribesman, researchBenchHitbox.box.position.x, researchBenchHitbox.box.position.y, benchLayer, bench, TribesmanPathType.default, Math.floor(64 / PathfindingSettings.NODE_SEPARATION), PathfindFailureDefault.none);
      
      tribesmanAIComponent.targetResearchBenchID = bench;
      tribesmanAIComponent.currentAIType = TribesmanAIType.researching;

      // If close enough, switch to doing research
      if (benchLayer === getEntityLayer(tribesman)) {
         const dist = getDistanceFromPointToEntity(tribesmanHitbox.box.position, benchTransformComponent) - getHumanoidRadius(transformComponent);
         if (dist < 30) {
            attemptToOccupyResearchBench(bench, tribesman);
         }
      }

      return;
   }

   // Somehow there aren't any research benches to work at.
   // This can happen if the research bench is placed but is still in the join queue (not in the world).
   // If we can get here without there being a bench in the join queue then that would be preeetty bad.
}

export function techStudyIsComplete(tribe: Tribe, tech: Tech): boolean {
   return !tribe.techRequiresResearching(tech);
}

const useItemInTechResearch = (tribe: Tribe, tech: Tech, itemType: ItemType, amount: number): number => {
   const amountRequiredToResearch = tech.researchItemRequirements.getItemCount(itemType);
   
   let amountUsed = 0;

   const techUnlockProgress = tribe.techTreeUnlockProgress[tech.id];
   if (typeof techUnlockProgress === "undefined") {
      amountUsed = Math.min(amount, amountRequiredToResearch);
      tribe.techTreeUnlockProgress[tech.id] = {
         itemProgress: { [itemType]: amountUsed },
         studyProgress: 0
      };
   } else if (typeof techUnlockProgress.itemProgress[itemType] === "undefined") {
      amountUsed = Math.min(amount, amountRequiredToResearch);
      techUnlockProgress.itemProgress[itemType] = amountUsed;
   } else {
      amountUsed = Math.min(amount, amountRequiredToResearch - techUnlockProgress.itemProgress[itemType]!);
      techUnlockProgress.itemProgress[itemType]! += amountUsed;
   }

   return amountUsed;
}

const techHasEnoughItems = (tribe: Tribe, tech: Tech, itemType: ItemType): boolean => {
   const amountRequiredToResearch = tech.researchItemRequirements.getItemCount(itemType);
   
   const techUnlockProgress = tribe.techTreeUnlockProgress[tech.id];
   return (techUnlockProgress?.itemProgress[itemType] || 0) >= amountRequiredToResearch;
}

export function useItemsInResearch(tribesman: Entity, tech: Tech, itemType: ItemType, hotbarInventory: Inventory): boolean {
   // @Incomplete: take into account backpack

   const tribeComponent = TribeComponentArray.getComponent(tribesman);
   const tribe = tribeComponent.tribe;

   for (let itemSlot = 1; itemSlot <= hotbarInventory.width * hotbarInventory.height; itemSlot++) {
      const item = hotbarInventory.itemSlots[itemSlot];
      if (typeof item === "undefined" || item.type !== itemType) {
         continue;
      }

      const amountUsed = useItemInTechResearch(tribe, tech, item.type, item.count);
      if (amountUsed > 0) {
         consumeItemFromSlot(tribesman, hotbarInventory, itemSlot, amountUsed);
      }
   }

   // Return whether or not the item requirements have been fulfilled
   return techHasEnoughItems(tribe, tech, itemType);
}
import { ResearchBenchComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { TechInfo } from "webgl-test-shared/dist/techs";
import { TribesmanTitle } from "webgl-test-shared/dist/titles";
import { RESEARCH_ORB_AMOUNTS, RESEARCH_ORB_COMPLETE_TIME, getRandomResearchOrbSize } from "webgl-test-shared/dist/research";
import Entity from "../Entity";
import { ComponentArray } from "./ComponentArray";
import Board from "../Board";
import { InventoryUseComponentArray, getInventoryUseInfo } from "./InventoryUseComponent";
import { TITLE_REWARD_CHANCES } from "../tribesman-title-generation";
import { TribeMemberComponentArray, awardTitle, hasTitle } from "./TribeMemberComponent";
import { TribeComponentArray } from "./TribeComponent";
import { TribesmanAIComponentArray } from "./TribesmanAIComponent";
import { InventoryName } from "webgl-test-shared/dist/items/items";

export interface ResearchBenchComponentParams {}

const ORB_COMPLETE_TICKS = Math.floor(RESEARCH_ORB_COMPLETE_TIME * Settings.TPS);

export class ResearchBenchComponent {
   public isOccupied = false;
   public occupee: EntityID = 0;

   // @Incomplete: reset back to id sentinel value when not looking for a bench
   /** ID of any tribemsan currently on the way to the bench to research */
   public preemptiveOccupeeID = 0;

   public orbCompleteProgressTicks = 0;
}

export const ResearchBenchComponentArray = new ComponentArray<ServerComponentType.researchBench, ResearchBenchComponent>(true, {
   serialise: serialise
});

export function tickResearchBenchComponent(researchBench: Entity): void {
   const researchBenchComponent = ResearchBenchComponentArray.getComponent(researchBench.id);
   
   // @Speed: This runs every tick, but this condition only activates rarely when the bench is being used.
   if (researchBenchComponent.isOccupied) {
      // @Incomplete?
      if (TribesmanAIComponentArray.hasComponent(researchBenchComponent.occupee)) {
         const tribesmanComponent = TribesmanAIComponentArray.getComponent(researchBenchComponent.occupee);
         if (tribesmanComponent.targetResearchBenchID !== researchBench.id) {
            researchBenchComponent.occupee = 0;
            researchBenchComponent.isOccupied = false;
            researchBenchComponent.orbCompleteProgressTicks = 0;
         }
      } else {
         researchBenchComponent.occupee = 0;
         researchBenchComponent.isOccupied = false;
         researchBenchComponent.orbCompleteProgressTicks = 0;
      }
   }
}

export function attemptToOccupyResearchBench(researchBench: EntityID, researcher: EntityID): void {
   const researchBenchComponent = ResearchBenchComponentArray.getComponent(researchBench);
   if (researchBenchComponent.isOccupied) {
      return;
   }

   researchBenchComponent.isOccupied = true;
   researchBenchComponent.occupee = researcher;
   researchBenchComponent.preemptiveOccupeeID = 0;
}

export function deoccupyResearchBench(researchBench: EntityID, researcher: EntityID): void {
   const researchBenchComponent = ResearchBenchComponentArray.getComponent(researchBench);
   if (researcher !== researchBenchComponent.occupee) {
      return;
   }

   researchBenchComponent.isOccupied = false;
   // Reset orb complete progress
   researchBenchComponent.orbCompleteProgressTicks = 0;
}

export function canResearchAtBench(researchBench: EntityID, researcher: EntityID): boolean {
   const researchBenchComponent = ResearchBenchComponentArray.getComponent(researchBench);
   return researchBenchComponent.occupee === researcher;
}

/** Whether or not a tribesman should try to mvoe to research at this bench */
export function shouldMoveToResearchBench(researchBench: EntityID, researcher: EntityID): boolean {
   const researchBenchComponent = ResearchBenchComponentArray.getComponent(researchBench);

   // Try to move if it isn't occupied and isn't being preemprively moved to by another tribesman
   return !researchBenchComponent.isOccupied && (researchBenchComponent.preemptiveOccupeeID === 0 || researchBenchComponent.preemptiveOccupeeID === researcher.id);
}

export function markPreemptiveMoveToBench(researchBench: EntityID, researcher: EntityID): void {
   const researchBenchComponent = ResearchBenchComponentArray.getComponent(researchBench);
   researchBenchComponent.preemptiveOccupeeID = researcher;
}

const getResearchTimeMultiplier = (researcher: EntityID): number => {
   let multiplier = 1;

   if (hasTitle(researcher, TribesmanTitle.shrewd)) {
      multiplier *= 2/3;
   }
   
   if (Board.getEntityType(researcher) === EntityType.tribeWarrior) {
      multiplier *= 2;
   }

   return multiplier;
}

// @Cleanup: Should this be in tribesman.ts?
export function continueResearching(researchBench: Entity, researcher: Entity, tech: TechInfo): void {
   const researchBenchComponent = ResearchBenchComponentArray.getComponent(researchBench.id);

   researchBenchComponent.orbCompleteProgressTicks++;
   if (researchBenchComponent.orbCompleteProgressTicks >= ORB_COMPLETE_TICKS * getResearchTimeMultiplier(researcher)) {
      const size = getRandomResearchOrbSize();
      const amount = RESEARCH_ORB_AMOUNTS[size];

      const tribeComponent = TribeComponentArray.getComponent(researchBench.id);
      tribeComponent.tribe.studyTech(tech, researcher.position.x, researcher.position.y, amount);
      
      researchBenchComponent.orbCompleteProgressTicks = 0;

      // Make the tribesman slap the bench each time they complete an orb
      const inventoryUseComponent = InventoryUseComponentArray.getComponent(researcher.id);
      const useInfo = getInventoryUseInfo(inventoryUseComponent, InventoryName.hotbar);
      useInfo.lastAttackTicks = Board.ticks;
   }

   if (TribeMemberComponentArray.hasComponent(researcher.id) && Math.random() < TITLE_REWARD_CHANCES.SHREWD_REWARD_CHANCE / Settings.TPS) {
      awardTitle(researcher, TribesmanTitle.shrewd);
   }
}

function serialise(entityID: number): ResearchBenchComponentData {
   const researchBenchComponent = ResearchBenchComponentArray.getComponent(entityID);
   
   return {
      componentType: ServerComponentType.researchBench,
      isOccupied: researchBenchComponent.isOccupied
   };
}
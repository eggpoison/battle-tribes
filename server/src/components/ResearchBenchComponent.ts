import { ResearchBenchComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
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

const ORB_COMPLETE_TICKS = Math.floor(RESEARCH_ORB_COMPLETE_TIME * Settings.TPS);

export class ResearchBenchComponent {
   public isOccupied = false;
   public occupeeID = 0;

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
      if (TribesmanAIComponentArray.hasComponent(researchBenchComponent.occupeeID)) {
         const tribesmanComponent = TribesmanAIComponentArray.getComponent(researchBenchComponent.occupeeID);
         if (tribesmanComponent.targetResearchBenchID !== researchBench.id) {
            researchBenchComponent.occupeeID = 0;
            researchBenchComponent.isOccupied = false;
            researchBenchComponent.orbCompleteProgressTicks = 0;
         }
      } else {
         researchBenchComponent.occupeeID = 0;
         researchBenchComponent.isOccupied = false;
         researchBenchComponent.orbCompleteProgressTicks = 0;
      }
   }
}

export function attemptToOccupyResearchBench(researchBench: Entity, researcher: Entity): void {
   const researchBenchComponent = ResearchBenchComponentArray.getComponent(researchBench.id);
   if (researchBenchComponent.isOccupied) {
      return;
   }

   researchBenchComponent.isOccupied = true;
   researchBenchComponent.occupeeID = researcher.id;
   researchBenchComponent.preemptiveOccupeeID = 0;
}

export function deoccupyResearchBench(researchBench: Entity, researcher: Entity): void {
   const researchBenchComponent = ResearchBenchComponentArray.getComponent(researchBench.id);
   if (researcher.id !== researchBenchComponent.occupeeID) {
      return;
   }

   researchBenchComponent.isOccupied = false;
   // Reset orb complete progress
   researchBenchComponent.orbCompleteProgressTicks = 0;
}

export function canResearchAtBench(researchBench: Entity, researcher: Entity): boolean {
   const researchBenchComponent = ResearchBenchComponentArray.getComponent(researchBench.id);
   return researchBenchComponent.occupeeID === researcher.id;
}

/** Whether or not a tribesman should try to mvoe to research at this bench */
export function shouldMoveToResearchBench(researchBench: Entity, researcher: Entity): boolean {
   const researchBenchComponent = ResearchBenchComponentArray.getComponent(researchBench.id);

   // Try to move if it isn't occupied and isn't being preemprively moved to by another tribesman
   return !researchBenchComponent.isOccupied && (researchBenchComponent.preemptiveOccupeeID === 0 || researchBenchComponent.preemptiveOccupeeID === researcher.id);
}

export function markPreemptiveMoveToBench(researchBench: Entity, researcher: Entity): void {
   const researchBenchComponent = ResearchBenchComponentArray.getComponent(researchBench.id);
   researchBenchComponent.preemptiveOccupeeID = researcher.id;
}

const getResearchTimeMultiplier = (researcher: Entity): number => {
   let multiplier = 1;

   if (hasTitle(researcher.id, TribesmanTitle.shrewd)) {
      multiplier *= 2/3;
   }
   
   if (researcher.type === EntityType.tribeWarrior) {
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
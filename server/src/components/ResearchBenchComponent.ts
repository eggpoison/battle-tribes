import { ServerComponentType } from "battletribes-shared/components";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { TechInfo } from "battletribes-shared/techs";
import { TribesmanTitle } from "battletribes-shared/titles";
import { RESEARCH_ORB_AMOUNTS, RESEARCH_ORB_COMPLETE_TIME, getRandomResearchOrbSize } from "battletribes-shared/research";
import { ComponentArray } from "./ComponentArray";
import Layer from "../Layer";
import { InventoryUseComponentArray } from "./InventoryUseComponent";
import { TITLE_REWARD_CHANCES } from "../tribesman-title-generation";
import { TribeMemberComponentArray, awardTitle, hasTitle } from "./TribeMemberComponent";
import { TribeComponentArray } from "./TribeComponent";
import { TribesmanAIComponentArray } from "./TribesmanAIComponent";
import { InventoryName } from "battletribes-shared/items/items";
import { TransformComponentArray } from "./TransformComponent";
import { Packet } from "battletribes-shared/packets";
import { getEntityType, getGameTicks } from "../world";

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

export const ResearchBenchComponentArray = new ComponentArray<ResearchBenchComponent>(ServerComponentType.researchBench, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onTick(researchBenchComponent: ResearchBenchComponent, researchBench: EntityID): void {
   // @Speed: This runs every tick, but this condition only activates rarely when the bench is being used.
   if (researchBenchComponent.isOccupied) {
      // @Incomplete?
      if (TribesmanAIComponentArray.hasComponent(researchBenchComponent.occupee)) {
         const tribesmanComponent = TribesmanAIComponentArray.getComponent(researchBenchComponent.occupee);
         if (tribesmanComponent.targetResearchBenchID !== researchBench) {
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
   return !researchBenchComponent.isOccupied && (researchBenchComponent.preemptiveOccupeeID === 0 || researchBenchComponent.preemptiveOccupeeID === researcher);
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
   
   if (getEntityType(researcher) === EntityType.tribeWarrior) {
      multiplier *= 2;
   }

   return multiplier;
}

// @Cleanup: Should this be in tribesman.ts?
export function continueResearching(researchBench: EntityID, researcher: EntityID, tech: TechInfo): void {
   const researchBenchComponent = ResearchBenchComponentArray.getComponent(researchBench);

   researchBenchComponent.orbCompleteProgressTicks++;
   if (researchBenchComponent.orbCompleteProgressTicks >= ORB_COMPLETE_TICKS * getResearchTimeMultiplier(researcher)) {
      const size = getRandomResearchOrbSize();
      const amount = RESEARCH_ORB_AMOUNTS[size];
      
      const researcherTransformComponent = TransformComponentArray.getComponent(researcher);

      const tribeComponent = TribeComponentArray.getComponent(researchBench);
      tribeComponent.tribe.studyTech(tech, researcherTransformComponent.position.x, researcherTransformComponent.position.y, amount);
      
      researchBenchComponent.orbCompleteProgressTicks = 0;

      // Make the tribesman slap the bench each time they complete an orb
      const inventoryUseComponent = InventoryUseComponentArray.getComponent(researcher);
      const useInfo = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
      useInfo.lastAttackTicks = getGameTicks();
   }

   if (TribeMemberComponentArray.hasComponent(researcher) && Math.random() < TITLE_REWARD_CHANCES.SHREWD_REWARD_CHANCE / Settings.TPS) {
      awardTitle(researcher, TribesmanTitle.shrewd);
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const researchBenchComponent = ResearchBenchComponentArray.getComponent(entity);
   
   packet.addBoolean(researchBenchComponent.isOccupied);
   packet.padOffset(3);
}
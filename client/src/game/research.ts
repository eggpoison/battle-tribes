import { TribesmanTitle, Settings, Entity, EntityType, RESEARCH_ORB_AMOUNTS, RESEARCH_ORB_COMPLETE_TIME, getRandomResearchOrbSize, distance, randAngle } from "webgl-test-shared";
import { currentSnapshot } from "./client";
import { playHeadSound } from "./sound";
import { createMagicParticle, createStarParticle } from "./particles";
import { getRandomPositionInEntity, TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { getEntityType } from "./world";
import { InventoryUseComponentArray } from "./entity-components/server-components/InventoryUseComponent";
import { TribesmanComponentArray, tribesmanHasTitle } from "./entity-components/server-components/TribesmanComponent";
import { sendStudyTechPacket } from "./networking/packet-sending";
import { playerInstance } from "./player";
import { entitySelectionState } from "../ui-state/entity-selection-state.svelte";
import { cursorWorldPos } from "./camera";

export interface ResearchOrb {
   /* X position of the node in the world */
   readonly positionX: number;
   /* Y position of the node in the world */
   readonly positionY: number;
   readonly rotation: number;
   readonly size: number;
}

let currentBench: Entity = 0;
let currentResearchOrb: ResearchOrb | null = null;
let orbCompleteProgress = 0;

export const RESEARCH_ORB_SIZES = [20, 30, 40];
const ORB_NUM_PARTICLES = [2, 4, 7];
const ORB_COMPLETE_SOUND_PITCHES = [1, 0.85, 0.7];
const ORB_PARTICLES_PER_SECOND = [2, 3.5, 6];

const generateResearchOrb = (researchBench: Entity): ResearchOrb => {
   const transformComponent = TransformComponentArray.getComponent(researchBench);

   const hitbox = transformComponent.hitboxes[0];
   
   const position = getRandomPositionInEntity(transformComponent);
   position.subtract(hitbox.box.position);
   position.x *= 0.8;
   position.y *= 0.8;
   position.add(hitbox.box.position);
   
   return {
      positionX: position.x,
      positionY: position.y,
      rotation: randAngle(),
      size: getRandomResearchOrbSize()
   };
}

export function getResearchOrb(): ResearchOrb | null {
   return currentResearchOrb;
}

export function getResearchOrbCompleteProgress(): number {
   return orbCompleteProgress / RESEARCH_ORB_COMPLETE_TIME;
}

// export function updateActiveResearchBench(): void {
//    const selectedStructure = entitySelectionState.selectedEntity;
//    if (selectedStructure === null) {
//       currentResearchOrb = null;
//       currentBenchID = -1;
//       return;
//    }

//    if (getEntityType(selectedStructure) !== EntityType.researchBench) {
//       return;
//    }

//    currentBenchID = selectedStructure;
//    if (currentResearchOrb === null) {
//       currentResearchOrb = generateResearchOrb(selectedStructure);
//    }
// }

export function setActiveResearchBench(bench: Entity): void {
   currentBench = bench;
   if (currentResearchOrb === null) {
      currentResearchOrb = generateResearchOrb(bench);
   }
}

export function updateResearchOrb(): void {
   // Make sure the bench is still selected
   if (entitySelectionState.selectedEntity !== currentBench) {
      currentResearchOrb = null;
      return;
   }

   if (currentResearchOrb === null) {
      return;
   }

   if (Math.random() < ORB_PARTICLES_PER_SECOND[currentResearchOrb.size] * Settings.DT_S) {
      const offsetDirection = randAngle();
      const offsetMagnitude = RESEARCH_ORB_SIZES[currentResearchOrb.size] / 2 * 1.25 * Math.random();
      const x = currentResearchOrb.positionX + offsetMagnitude * Math.sin(offsetDirection);
      const y = currentResearchOrb.positionY + offsetMagnitude * Math.cos(offsetDirection);
      createMagicParticle(x, y);
   }
}

const completeOrb = (): void => {
   const studyAmount = RESEARCH_ORB_AMOUNTS[currentResearchOrb!.size];
   sendStudyTechPacket(studyAmount);

   for (let i = 0; i < ORB_NUM_PARTICLES[currentResearchOrb!.size]; i++) {
      const offsetDirection = randAngle();
      const offsetMagnitude = RESEARCH_ORB_SIZES[currentResearchOrb!.size] / 2 * 1.5 * Math.random();
      const x = currentResearchOrb!.positionX + offsetMagnitude * Math.sin(offsetDirection);
      const y = currentResearchOrb!.positionY + offsetMagnitude * Math.cos(offsetDirection);
      createStarParticle(x, y);
   }

   playHeadSound("orb-complete.mp3", 0.3, ORB_COMPLETE_SOUND_PITCHES[currentResearchOrb!.size]);

   // Make the player smack to the bench
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance!);
   const useInfo = inventoryUseComponent.limbInfos[0];
   useInfo.lastAttackTicks = currentSnapshot.tick;
   
   // @Hack: "!"
   const selectedStructure = entitySelectionState.selectedEntity!;
   currentResearchOrb = generateResearchOrb(selectedStructure);
   orbCompleteProgress = 0;
}

const getResearchSpeedMultiplier = (): number => {
   let multiplier = 1;

   const tribesmanComponent = TribesmanComponentArray.getComponent(playerInstance!);
   if (tribesmanHasTitle(tribesmanComponent, TribesmanTitle.shrewd)) {
      multiplier *= 1.5;
   }

   return multiplier;
}

export function attemptToResearch(): void {
   if (currentResearchOrb === null) {
      return;
   }
   
   const nodeSize = RESEARCH_ORB_SIZES[currentResearchOrb.size];

   const distFromOrb = distance(cursorWorldPos.x, cursorWorldPos.y, currentResearchOrb.positionX, currentResearchOrb.positionY);
   if (distFromOrb < nodeSize / 2) {
      orbCompleteProgress += getResearchSpeedMultiplier() * Settings.DT_S;
      if (orbCompleteProgress > RESEARCH_ORB_COMPLETE_TIME) {
         orbCompleteProgress = RESEARCH_ORB_COMPLETE_TIME;
      }
   } else {
      orbCompleteProgress = 0;
   }
}

export function attemptToCompleteNode(): void {
   if (orbCompleteProgress >= RESEARCH_ORB_COMPLETE_TIME) {
      completeOrb();
   }
}
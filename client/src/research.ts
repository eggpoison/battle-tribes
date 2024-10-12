import { distance } from "battletribes-shared/utils";
import { RESEARCH_ORB_AMOUNTS, RESEARCH_ORB_COMPLETE_TIME, getRandomResearchOrbSize } from "battletribes-shared/research";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { TribesmanTitle } from "battletribes-shared/titles";
import Player from "./entities/Player";
import Board from "./Board";
import Game from "./Game";
import Client from "./client/Client";
import { getSelectedEntityID } from "./entity-selection";
import { playSound } from "./sound";
import { createMagicParticle, createStarParticle } from "./particles";
import { getRandomPointInEntity, TransformComponentArray } from "./entity-components/TransformComponent";
import { entityExists, getEntityType } from "./world";
import { InventoryUseComponentArray } from "./entity-components/InventoryUseComponent";
import { TribeMemberComponentArray } from "./entity-components/TribeMemberComponent";

export interface ResearchOrb {
   /* X position of the node in the world */
   readonly positionX: number;
   /* Y position of the node in the world */
   readonly positionY: number;
   readonly rotation: number;
   readonly size: number;
}

let currentBenchID = -1;
let currentResearchOrb: ResearchOrb | null = null;
let orbCompleteProgress = 0;

export const RESEARCH_ORB_SIZES = [20, 30, 40];
const ORB_NUM_PARTICLES = [2, 4, 7];
const ORB_COMPLETE_SOUND_PITCHES = [1, 0.85, 0.7];
const ORB_PARTICLES_PER_SECOND = [2, 3.5, 6];

const generateResearchOrb = (researchBench: EntityID): ResearchOrb => {
   const transformComponent = TransformComponentArray.getComponent(researchBench);

   const position = getRandomPointInEntity(transformComponent);
   position.subtract(transformComponent.position);
   position.x *= 0.8;
   position.y *= 0.8;
   position.add(transformComponent.position);
   
   return {
      positionX: position.x,
      positionY: position.y,
      rotation: 2 * Math.PI * Math.random(),
      size: getRandomResearchOrbSize()
   };
}

export function getResearchOrb(): ResearchOrb | null {
   return currentResearchOrb;
}

export function getResearchOrbCompleteProgress(): number {
   return orbCompleteProgress / RESEARCH_ORB_COMPLETE_TIME;
}

export function updateActiveResearchBench(): void {
   const selectedStructure = getSelectedEntityID();
   if (!entityExists(selectedStructure)) {
      currentResearchOrb = null;
      currentBenchID = -1;
      return;
   }

   if (getEntityType(selectedStructure) !== EntityType.researchBench) {
      return;
   }

   currentBenchID = selectedStructure;
   if (currentResearchOrb === null) {
      currentResearchOrb = generateResearchOrb(selectedStructure);
   }
}

export function updateResearchOrb(): void {
   if (currentResearchOrb === null) {
      return;
   }

   if (Math.random() < ORB_PARTICLES_PER_SECOND[currentResearchOrb.size] / Settings.TPS) {
      const offsetDirection = 2 * Math.PI * Math.random();
      const offsetMagnitude = RESEARCH_ORB_SIZES[currentResearchOrb.size] / 2 * 1.25 * Math.random();
      const x = currentResearchOrb.positionX + offsetMagnitude * Math.sin(offsetDirection);
      const y = currentResearchOrb.positionY + offsetMagnitude * Math.cos(offsetDirection);
      createMagicParticle(x, y);
   }
}

const completeOrb = (): void => {
   const studyAmount = RESEARCH_ORB_AMOUNTS[currentResearchOrb!.size];
   Client.sendStudyTech(studyAmount);

   for (let i = 0; i < ORB_NUM_PARTICLES[currentResearchOrb!.size]; i++) {
      const offsetDirection = 2 * Math.PI * Math.random();
      const offsetMagnitude = RESEARCH_ORB_SIZES[currentResearchOrb!.size] / 2 * 1.5 * Math.random();
      const x = currentResearchOrb!.positionX + offsetMagnitude * Math.sin(offsetDirection);
      const y = currentResearchOrb!.positionY + offsetMagnitude * Math.cos(offsetDirection);
      createStarParticle(x, y);
   }

   const playerTransformComponent = TransformComponentArray.getComponent(Player.instance!.id);

   playSound("orb-complete.mp3", 0.3, ORB_COMPLETE_SOUND_PITCHES[currentResearchOrb!.size], playerTransformComponent.position);

   // Make the player smack to the bench
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(Player.instance!.id);
   const useInfo = inventoryUseComponent.limbInfos[0];
   useInfo.lastAttackTicks = Board.serverTicks;
   
   const selectedStructure = getSelectedEntityID();
   currentResearchOrb = generateResearchOrb(selectedStructure);
   orbCompleteProgress = 0;
}

const getResearchSpeedMultiplier = (): number => {
   let multiplier = 1;

   const tribeMemberComponent = TribeMemberComponentArray.getComponent(Player.instance!.id);
   if (tribeMemberComponent.hasTitle(TribesmanTitle.shrewd)) {
      multiplier *= 1.5;
   }

   return multiplier;
}

export function attemptToResearch(): void {
   if (currentResearchOrb === null || Game.cursorPositionX === null || Game.cursorPositionY === null) {
      return;
   }
   
   const nodeSize = RESEARCH_ORB_SIZES[currentResearchOrb.size];

   const distFromOrb = distance(Game.cursorPositionX, Game.cursorPositionY, currentResearchOrb.positionX, currentResearchOrb.positionY);
   if (distFromOrb < nodeSize / 2) {
      orbCompleteProgress += getResearchSpeedMultiplier() / Settings.TPS;
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
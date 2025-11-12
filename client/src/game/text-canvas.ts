import { EntityType, distance, lerp, randAngle, randFloat, Settings } from "webgl-test-shared";
import { halfWindowHeight, halfWindowWidth, windowHeight, windowWidth } from "./webgl";
import { getCurrentLayer, getEntityLayer, getEntityType } from "./world";
import { getBuildingSafeties } from "./building-safety";
import { getVisibleBuildingPlan, GhostBuildingPlan, VirtualBuildingSafetySimulation } from "./virtual-buildings";
import { TribeMemberComponentArray } from "./entity-components/server-components/TribeMemberComponent";
import { getHumanoidRadius } from "./entity-components/server-components/TribesmanComponent";
import { playerInstance } from "./player";
import { addGhostRenderInfo, removeGhostRenderInfo } from "./rendering/webgl/entity-ghost-rendering";
import { TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { calculateHitboxRenderPosition } from "./rendering/render-part-matrices";
import { FloorSignComponentArray } from "./entity-components/server-components/FloorSignComponent";
import { TamingComponentArray } from "./entity-components/server-components/TamingComponent";
import { cameraPosition, cameraZoom, cursorWorldPos } from "./camera";
import { debugDisplayState } from "../ui-state/debug-display-state.svelte";

// @Cleanup: The logic for damage, research and heal numbers is extremely similar, can probably be combined

interface TextNumber {
   textWidth: number;
   positionX: number;
   positionY: number;
   age: number;
}

interface ResearchNumber extends TextNumber {
   positionX: number;
   positionY: number;
   readonly amount: number;
   age: number;
}

interface HealNumber extends TextNumber {
   readonly healedEntityID: number;
   amount: number;
}

export interface PotentialPlanStats {
   readonly minSafety: number;
   readonly maxSafety: number;
}

const DAMAGE_NUMBER_LIFETIME = 1.75;
const RESEARCH_NUMBER_LIFETIME = 1.5;
const HEAL_NUMBER_LIFETIME = 1.75;

const damageColours: ReadonlyArray<string> = ["#ddd", "#fbff2b", "#ffc130", "#ff6430"];
const damageColourThresholds: ReadonlyArray<number> = [0, 3, 5, 7];

const researchNumbers = new Array<ResearchNumber>();
const healNumbers = new Array<HealNumber>();

let ctx: CanvasRenderingContext2D;

let damageNumberWidth = 0;
let accumulatedDamage = 0;
/** Time that the accumulated damage has existed */
let damageTime = 0;
let damageNumberX = -1;
let damageNumberY = -1;

export interface SpawnDistributionBlock {
   readonly x: number;
   readonly y: number;
   readonly currentDensity: number;
   readonly targetDensity: number;
}

let spawnDistributionBlocks = new Array<SpawnDistributionBlock>();

export function setSpawnDistributionBlocks(newSpawnDistributionBlocks: Array<SpawnDistributionBlock>): void {
   spawnDistributionBlocks = newSpawnDistributionBlocks;
}

export function createTextCanvasContext(): void {
   const textCanvas = document.getElementById("text-canvas") as HTMLCanvasElement;

   ctx = textCanvas.getContext("2d")!;
}

export function getTextContext(): CanvasRenderingContext2D {
   return ctx;
}

export function getXPosInTextCanvas(x: number): number {
   return (x - cameraPosition.x) * cameraZoom + halfWindowWidth;
}
export function getYPosInTextCanvas(y: number): number {
   return (-y + cameraPosition.y) * cameraZoom + halfWindowHeight;
}

const clearTextCanvas = (): void => {
   // Clear the canvas
   ctx.fillStyle = "transparent";
   ctx.clearRect(0, 0, windowWidth, windowHeight);
}

export function createDamageNumber(originX: number, originY: number, damage: number): void {
   // Add a random offset to the damage number
   const spawnOffsetDirection = randAngle();
   const spawnOffsetMagnitude = randFloat(0, 30);
   damageNumberX = originX + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
   damageNumberY = originY + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

   accumulatedDamage += damage;
   damageTime = DAMAGE_NUMBER_LIFETIME;
}

export function createResearchNumber(positionX: number, positionY: number, amount: number): void {
   researchNumbers.push({
      positionX: positionX,
      positionY: positionY,
      amount: amount,
      age: 0,
      // @Cleanup: Measure the text width here
      textWidth: 0
   });
}

export function createHealNumber(healedEntityID: number, positionX: number, positionY: number, healAmount: number): void {
   // If there is an existing heal number for that entity, update it
   for (let i = 0; i < healNumbers.length; i++) {
      const healNumber = healNumbers[i];
      if (healNumber.healedEntityID === healedEntityID) {
         healNumber.amount += healAmount;
         healNumber.positionX = positionX;
         healNumber.positionY = positionY;
         healNumber.age = 0;
         healNumber.textWidth = ctx.measureText("+" + healNumber.amount.toString()).width;
         return;
      }
   }
   
   // Otherwise make a new one
   healNumbers.push({
      healedEntityID: healedEntityID,
      positionX: positionX,
      positionY: positionY,
      amount: healAmount,
      age: 0,
      textWidth: 0
   });
}

export function updateTextNumbers(): void {
   damageTime -= 1 * Settings.DT_S;
   if (damageTime < 0) {
      damageTime = 0;
      accumulatedDamage = 0;
      damageNumberWidth = 0
   }

   // Update research numbers
   for (let i = 0; i < researchNumbers.length; i++) {
      const researchNumber = researchNumbers[i];

      researchNumber.age += 1 * Settings.DT_S;
      if (researchNumber.age >= RESEARCH_NUMBER_LIFETIME) {
         researchNumbers.splice(i, 1);
         i--;
         continue;
      }

      researchNumber.positionY += 8 * Settings.DT_S;
   }

   // Update heal numbers
   for (let i = 0; i < healNumbers.length; i++) {
      const healNumber = healNumbers[i];

      healNumber.age += 1 * Settings.DT_S;
      if (healNumber.age >= HEAL_NUMBER_LIFETIME) {
         healNumbers.splice(i, 1);
         i--;
         continue;
      }

      healNumber.positionY += 11 * Settings.DT_S;
   }
}

const getDamageNumberColour = (damage: number): string => {
   let colour = damageColours[0];
   for (let i = 1; i < damageColours.length; i++) {
      const threshold = damageColourThresholds[i];
      if (damage >= threshold) {
         colour = damageColours[i];
      } else {
         break;
      }
   }
   return colour;
}

const renderDamageNumbers = (): void => {
   if (accumulatedDamage === 0) {
      return;
   }
   
   ctx.lineWidth = 0;

   // Calculate position in camera
   const cameraX = getXPosInTextCanvas(damageNumberX);
   const cameraY = getYPosInTextCanvas(damageNumberY);

   ctx.font = "bold 35px sans-serif";
   ctx.lineJoin = "round";
   ctx.miterLimit = 2;

   const deathProgress = 1 - damageTime / DAMAGE_NUMBER_LIFETIME;
   ctx.globalAlpha = 1 - Math.pow(deathProgress, 3);

   const damageString = "-" + accumulatedDamage.toString();
   if (damageNumberWidth === 0) {
      damageNumberWidth = ctx.measureText(damageString).width;
   }

   const timeSinceDamage = DAMAGE_NUMBER_LIFETIME - damageTime;
   let scaleProgress = Math.min(timeSinceDamage * 2.5, 1);
   scaleProgress = 1 - ((1 - scaleProgress) * (1 - scaleProgress));
   const scaleX = lerp(1.3, 1, scaleProgress);
   
   ctx.save();
   ctx.scale(scaleX, 1);

   const scaleCenterOffset = -(scaleX - 1) * damageNumberWidth / 2;
   
   // Draw text outline
   ctx.globalAlpha = scaleProgress;
   const SHADOW_OFFSET = 3;
   ctx.fillStyle = "#000";
   ctx.fillText(damageString, (cameraX - damageNumberWidth / 2 + SHADOW_OFFSET) / scaleX + scaleCenterOffset, cameraY + SHADOW_OFFSET);
   ctx.globalAlpha = 1;
   
   // Draw text
   ctx.fillStyle = getDamageNumberColour(accumulatedDamage);
   ctx.fillText(damageString, (cameraX - damageNumberWidth / 2) / scaleX + scaleCenterOffset, cameraY);

   ctx.restore();

   ctx.globalAlpha = 1;
}

const renderResearchNumbers = (): void => {
   for (const researchNumber of researchNumbers) {
      ctx.lineWidth = 0;
   
      // Calculate position in camera
      const cameraX = getXPosInTextCanvas(researchNumber.positionX);
      const cameraY = getYPosInTextCanvas(researchNumber.positionY);
   
      ctx.font = "bold 35px sans-serif";
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
   
      const deathProgress = researchNumber.age / RESEARCH_NUMBER_LIFETIME;
      ctx.globalAlpha = 1 - Math.pow(deathProgress, 3);
   
      const textString = "+" + researchNumber.amount.toString();
      if (researchNumber.textWidth === 0) {
         researchNumber.textWidth = ctx.measureText(textString).width;
      }
   
      // Draw text outline
      const SHADOW_OFFSET = 3;
      ctx.fillStyle = "#000";
      ctx.fillText(textString, cameraX - researchNumber.textWidth / 2 + SHADOW_OFFSET, cameraY + SHADOW_OFFSET);
      
      // Draw text
      ctx.fillStyle = "#b730ff";
      ctx.fillText(textString, cameraX - researchNumber.textWidth / 2, cameraY);
   
      ctx.globalAlpha = 1;
   }
}

const renderHealNumbers = (): void => {
   for (const healNumber of healNumbers) {
      ctx.lineWidth = 0;
   
      // Calculate position in camera
      const cameraX = getXPosInTextCanvas(healNumber.positionX);
      const cameraY = getYPosInTextCanvas(healNumber.positionY);
   
      ctx.font = "bold 35px sans-serif";
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
   
      const deathProgress = healNumber.age / HEAL_NUMBER_LIFETIME;
      ctx.globalAlpha = 1 - Math.pow(deathProgress, 3);
   
      const textString = "+" + healNumber.amount.toString();
      if (healNumber.textWidth === 0) {
         healNumber.textWidth = ctx.measureText(textString).width;
      }
   
      // Draw text outline
      const SHADOW_OFFSET = 3;
      ctx.fillStyle = "#000";
      ctx.fillText(textString, cameraX - healNumber.textWidth / 2 + SHADOW_OFFSET, cameraY + SHADOW_OFFSET);
      
      // Draw text
      ctx.fillStyle = "#14f200";
      ctx.fillText(textString, cameraX - healNumber.textWidth / 2, cameraY);
   
      ctx.globalAlpha = 1;
   }
}

const renderName = (x: number, y: number, name: string, colour: string): void => {
   const cameraX = getXPosInTextCanvas(x);
   const cameraY = getYPosInTextCanvas(y);
   
   const width = ctx.measureText(name).width; // @Speed

   // Bg
   const bgWidthPadding = 4;
   const bgHeight = 12;
   const bgHeightPadding = 4;
   ctx.globalAlpha = 0.5;
   ctx.fillStyle = "#000";
   ctx.beginPath();
   ctx.rect(cameraX - width / 2 - bgWidthPadding, cameraY - bgHeight - bgHeightPadding, width + bgWidthPadding * 2, bgHeight + bgHeightPadding * 2);
   ctx.fill();
   ctx.globalAlpha = 1;
   
   // Draw text outline
   ctx.lineWidth = 6;
   ctx.strokeStyle = "#000";
   ctx.strokeText(name, cameraX - width / 2, cameraY);
   
   // Draw text
   ctx.fillStyle = colour;
   ctx.fillText(name, cameraX - width / 2, cameraY);
}

// @Speed
// @Speed
// @Speed
const renderNames = (tickInterp: number): void => {
   ctx.fillStyle = "#000";
   ctx.font = "400 20px Helvetica";
   ctx.lineJoin = "round";
   ctx.miterLimit = 2;

   const currentLayer = getCurrentLayer();

   for (let i = 0; i < TribeMemberComponentArray.entities.length; i++) {
      const entity = TribeMemberComponentArray.entities[i];
      if (entity === playerInstance || getEntityLayer(entity) !== currentLayer) {
         continue;
      }

      const tribeMemberComponent = TribeMemberComponentArray.components[i];

      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      const hitboxRenderPosition = calculateHitboxRenderPosition(hitbox, tickInterp);
      
      renderName(hitboxRenderPosition.x, hitboxRenderPosition.y + getHumanoidRadius(entity) + 4, tribeMemberComponent.name, getEntityType(entity) === EntityType.player ? "#fff" : "#bbb");
   }

   for (let i = 0; i < TamingComponentArray.entities.length; i++) {
      const entity = TamingComponentArray.entities[i];
      if (getEntityLayer(entity) !== currentLayer) {
         continue;
      }

      const tamingComponent = TamingComponentArray.components[i];
      const name = tamingComponent.name;
      if (name !== "") {
         const transformComponent = TransformComponentArray.getComponent(entity);
         const hitbox = transformComponent.hitboxes[1];
         const hitboxRenderPosition = calculateHitboxRenderPosition(hitbox, tickInterp);
         
         renderName(hitboxRenderPosition.x, hitboxRenderPosition.y + 16 + 4, name, "#ccc");
      }
   }

   // @CLeanup: these aren't names!!
   // Floor signs
   for (const entity of FloorSignComponentArray.entities) {
      const floorSignComponent = FloorSignComponentArray.getComponent(entity);
      if (floorSignComponent.message === "") {
         continue;
      }
      
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      const hitboxRenderPosition = calculateHitboxRenderPosition(hitbox, tickInterp);

      const x = hitboxRenderPosition.x;
      const y = hitboxRenderPosition.y;
      
      const cursorDist = distance(x, y, cursorWorldPos.x, cursorWorldPos.y);
      if (cursorDist < 96) {
         renderName(x, y, floorSignComponent.message, "#fff");
      }
}
}

const getPotentialPlanStats = (ghostBuildingPlan: GhostBuildingPlan): PotentialPlanStats => {
   let minPlanSafety = Number.MAX_SAFE_INTEGER;
   let maxPlanSafety = Number.MIN_SAFE_INTEGER;
   for (const pair of ghostBuildingPlan.virtualBuildingsMap) {
      const virtualBuildingSafetySimulation = pair[1];

      if (virtualBuildingSafetySimulation.safety < minPlanSafety) {
         minPlanSafety = virtualBuildingSafetySimulation.safety;
      } else if (virtualBuildingSafetySimulation.safety > maxPlanSafety) {
         maxPlanSafety = virtualBuildingSafetySimulation.safety;
      }
   }
   
   return {
      minSafety: minPlanSafety,
      maxSafety: maxPlanSafety
   };
}

const calculatePotentialPlanIdealness = (virtualBuildingSafetySimulation: VirtualBuildingSafetySimulation, potentialPlanStats: PotentialPlanStats): number => {
   let idealness = (virtualBuildingSafetySimulation.safety - potentialPlanStats.minSafety) / (potentialPlanStats.maxSafety - potentialPlanStats.minSafety);
   if (isNaN(idealness)) {
      idealness = 1;
   }
   return idealness;
}

let lastGhostBuildingPlan: GhostBuildingPlan | null = null;

const renderPotentialBuildingPlans = (): void => {
   if (!debugDisplayState.showBuildingPlans) {
      return;
   }
   
   const ghostBuildingPlan = getVisibleBuildingPlan();

   // @Speed
   if (lastGhostBuildingPlan !== null) {
      removeGhostRenderInfo(lastGhostBuildingPlan.virtualBuilding.renderInfo);
   }
   if (ghostBuildingPlan !== null) {
      addGhostRenderInfo(ghostBuildingPlan.virtualBuilding.renderInfo);
   }
   lastGhostBuildingPlan = ghostBuildingPlan;
   if (ghostBuildingPlan === null) {
      return;
   }

   const stats = getPotentialPlanStats(ghostBuildingPlan);
   for (const virtualBuildingSafetySimulation of ghostBuildingPlan.virtualBuildingsMap.values()) {
      const virtualBuilding = virtualBuildingSafetySimulation.virtualBuilding;
      
      // Calculate position in camera
      const cameraX = getXPosInTextCanvas(virtualBuilding.position.x);
      const cameraY = getYPosInTextCanvas(virtualBuilding.position.y);
      const height = 15;

      const idealness = calculatePotentialPlanIdealness(virtualBuildingSafetySimulation, stats);

      const textColour = idealness === 1 ? "#ff5252" : "#eee";

      ctx.font = "400 13px Helvetica";
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;

      const text = virtualBuildingSafetySimulation.safety.toFixed(2);
      const width = ctx.measureText(text).width; // @Speed

      // Draw text bg
      ctx.globalAlpha = lerp(0.3, 1, idealness);
      ctx.fillStyle = idealness === 1 ? "#444" : "#000";
      ctx.fillRect(cameraX - width/2, cameraY - height / 2, width, height);
      
      // Draw text
      ctx.globalAlpha = lerp(0.7, 1, idealness);
      ctx.fillStyle = textColour;
      ctx.fillText(text, cameraX - width / 2, cameraY + height / 2 - 3);
   }
   ctx.globalAlpha = 1;
}

// const renderBuildingPlanInfos = (): void => {
//    const hoveredPlan = getHoveredBuildingPlan();
//    const buildingPlans = getVisibleBuildingPlans();
//    for (let i = 0; i < buildingPlans.length; i++) {
//       const plan = buildingPlans[i];
//       if (plan === hoveredPlan) {
//          continue;
//       }

//       // Calculate position in camera
//       const cameraX = getXPosInCamera(plan.x);
//       const cameraY = getYPosInCamera(plan.y);
//       const fontSize = 13;
//       const height = fontSize * 2 + 2;

//       const textColour = "#fff";

//       const planNumText = "#" + i;
//       const planNumWidth = ctx.measureText(planNumText).width; // @Speed

//       ctx.font = "400 " + fontSize + "px Helvetica";
//       ctx.lineJoin = "round";
//       ctx.miterLimit = 2;

//       const assignedTribesmanIDText = "to=" + plan.assignedTribesmanID;
//       const assignedTribesmanIDWidth = ctx.measureText(assignedTribesmanIDText).width; // @Speed

//       const width = Math.max(planNumWidth, assignedTribesmanIDWidth);

//       // Draw text bg
//       ctx.globalAlpha = 1;
//       ctx.fillStyle = "#000";
//       ctx.fillRect(cameraX - width/2, cameraY - height / 2, width, height);
      
//       // Draw text
//       ctx.globalAlpha = 1;
//       ctx.fillStyle = textColour;
//       ctx.fillText(planNumText, cameraX - planNumWidth / 2, cameraY - height / 2 + fontSize);
      
//       // Draw text
//       ctx.globalAlpha = 1;
//       ctx.fillStyle = textColour;
//       ctx.fillText(assignedTribesmanIDText, cameraX - assignedTribesmanIDWidth / 2, cameraY - height / 2 + fontSize * 2);
//    }
//    ctx.globalAlpha = 1;
// }

// const renderHoveredBuildingPlanInfo = (): void => {
//    const ghostBuildingPlan = getVisibleBuildingPlan();
//    if (ghostBuildingPlan === null) {
//       return;
//    }

//    const planVirtualBuilding = ghostBuildingPlan.virtualBuilding;

//    let left = getXPosInCamera(planVirtualBuilding.position.x);
//    const top = getYPosInCamera(planVirtualBuilding.position.y);

//    const fontSize = 13;
//    const titleSpacing = 3;
//    const dataLeftMargin = 8;
//    const height = fontSize * 5 + titleSpacing;
   
//    const safetyInfo = ghostBuildingPlan.safetyInfo;
//    for (let i = 0; i < safetyInfo.buildingIDs.length; i++) {
//       const buildingID = safetyInfo.buildingIDs[i];
//       const buildingType = safetyInfo.buildingTypes[i];
//       const minSafety = safetyInfo.buildingMinSafetys[i];
//       const averageSafety = safetyInfo.buildingAverageSafetys[i];
//       const extendedAverageSafety = safetyInfo.buildingExtendedAverageSafetys[i];
//       const resultingSafety = safetyInfo.buildingResultingSafetys[i];

//       ctx.font = "400 " + fontSize + "px Helvetica";
//       ctx.lineJoin = "round";
//       ctx.miterLimit = 2;

//       const text = EntityType[buildingType] + " #" + buildingID;
//       const labelWidth = ctx.measureText(text).width; // @Speed

//       const minText = "min=" + minSafety.toFixed(2);
//       const minWidth = ctx.measureText(minText).width; // @Speed

//       const averageText = "avg=" + averageSafety.toFixed(2);
//       const averageWidth = ctx.measureText(averageText).width; // @Speed

//       const extendedAverageText = "xavg=" + extendedAverageSafety.toFixed(2);
//       const extendedAverageWidth = ctx.measureText(extendedAverageText).width; // @Speed

//       const resultText = "fin=" + resultingSafety.toFixed(2);
//       const resultWidth = ctx.measureText(resultText).width; // @Speed

//       const width = Math.max(labelWidth, minWidth, averageWidth, extendedAverageWidth, resultWidth);

//       ctx.fillStyle = "#000";
//       ctx.fillRect(left, top, width, height);

//       // Label text
//       ctx.fillStyle = "#fff";
//       ctx.fillText(text, left, top + fontSize);

//       // Min text
//       ctx.fillStyle = "#fff";
//       ctx.fillText(minText, left + dataLeftMargin, top + fontSize * 2 + titleSpacing);

//       // Average text
//       ctx.fillStyle = "#fff";
//       ctx.fillText(averageText, left + dataLeftMargin, top + fontSize * 3 + titleSpacing);

//       // Extended average text
//       ctx.fillStyle = "#fff";
//       ctx.fillText(extendedAverageText, left + dataLeftMargin, top + fontSize * 4 + titleSpacing);

//       // Resulting safety text
//       ctx.fillStyle = "#fff";
//       ctx.fillText(resultText, left + dataLeftMargin, top + fontSize * 5 + titleSpacing);

//       left += width + 3;
//    }
// }

const renderBuildingSafetys = (): void => {
   const fontSize = 18;

   const buildingSafeties = getBuildingSafeties();
   for (let i = 0; i < buildingSafeties.length; i++) {
      const buildingSafetyData = buildingSafeties[i];

      ctx.font = "400 " + fontSize + "px Helvetica";
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;

      const minText = "min=" + buildingSafetyData.minSafety.toFixed(2);
      const minWidth = ctx.measureText(minText).width; // @Speed

      const averageText = "avg=" + buildingSafetyData.averageSafety.toFixed(2);
      const averageWidth = ctx.measureText(averageText).width; // @Speed

      const extendedAverageText = "xavg=" + buildingSafetyData.extendedAverageSafety.toFixed(2);
      const extendedAverageWidth = ctx.measureText(extendedAverageText).width; // @Speed

      const resultText = "fin=" + buildingSafetyData.safety.toFixed(2);
      const resultWidth = ctx.measureText(resultText).width; // @Speed

      const width = Math.max(minWidth, averageWidth, extendedAverageWidth, resultWidth);

      // Calculate position in camera
      const height = fontSize * 4;
      const left = getXPosInTextCanvas(buildingSafetyData.x) - width/2;
      const top = getYPosInTextCanvas(buildingSafetyData.y) - height/2;

      ctx.fillStyle = "#000";
      ctx.fillRect(left, top, width, height);

      // Min text
      ctx.fillStyle = "#fff";
      ctx.fillText(minText, left, top + fontSize);

      // Average text
      ctx.fillStyle = "#fff";
      ctx.fillText(averageText, left, top + fontSize * 2);

      // Extended average text
      ctx.fillStyle = "#fff";
      ctx.fillText(extendedAverageText, left, top + fontSize * 3);

      // Resulting safety text
      ctx.fillStyle = "#fff";
      ctx.fillText(resultText, left, top + fontSize * 4);
   }
}

const renderChunkWeights = (): void => {
   const fontSize = 18;
   
   ctx.font = "400 " + fontSize + "px Helvetica";
   ctx.lineJoin = "round";
   ctx.miterLimit = 2;
   for (const block of spawnDistributionBlocks) {
      const left = getXPosInTextCanvas(block.x);
      const top = getYPosInTextCanvas(block.y);
      
      ctx.fillStyle = "#fff";
      ctx.fillText(block.currentDensity.toFixed(2).toString(), left, top + fontSize);
      ctx.fillText(block.targetDensity.toFixed(2).toString(), left, top + fontSize + fontSize + 4);

      const mult = block.currentDensity / block.targetDensity
      if (mult >= 1) {
         ctx.fillStyle = "#f00";
      }
      ctx.fillText(mult.toFixed(1) + "x", left, top + fontSize + fontSize + fontSize + 8);
   }
}

export function renderText(tickInterp: number): void {
   clearTextCanvas();
   renderNames(tickInterp);
   renderDamageNumbers();
   renderResearchNumbers();
   renderHealNumbers();
   if (debugDisplayState.showBuildingSafetys) {
      renderBuildingSafetys();
   }

   // if (debugDisplayState.showBuildingPlans) {
      // renderBuildingPlanInfos();
      renderPotentialBuildingPlans();
      // @Temporary @Incomplete
      // renderHoveredPotentialPlanInfo();
   // }

   renderChunkWeights();
}
import { BuildingSafetyData } from "battletribes-shared/ai-building-types";
import { Settings } from "battletribes-shared/settings";
import { lerp, randFloat } from "battletribes-shared/utils";
import Camera from "./Camera";
import { halfWindowHeight, halfWindowWidth, windowHeight, windowWidth } from "./webgl";
import OPTIONS from "./options";
import { calculatePotentialPlanIdealness, getHoveredBuildingPlan, getPotentialPlanStats, getVisibleBuildingPlans } from "./client/Client";
import Player from "./entities/Player";
import { PlayerComponentArray } from "./entity-components/PlayerComponent";
import { getEntityByID } from "./world";

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

let buildingSafetys: ReadonlyArray<BuildingSafetyData>;

export function setVisibleBuildingSafetys(newBuildingSafetys: ReadonlyArray<BuildingSafetyData>): void {
   // @Speed: Garbage collection
   buildingSafetys = newBuildingSafetys;
}

export function createTextCanvasContext(): void {
   const textCanvas = document.getElementById("text-canvas") as HTMLCanvasElement;

   ctx = textCanvas.getContext("2d")!;
}

const getXPosInCamera = (x: number): number => {
   return (x - Camera.position.x) * Camera.zoom + halfWindowWidth;
}
const getYPosInCamera = (y: number): number => {
   return (-y + Camera.position.y) * Camera.zoom + halfWindowHeight;
}

const clearTextCanvas = (): void => {
   // Clear the canvas
   ctx.fillStyle = "transparent";
   ctx.clearRect(0, 0, windowWidth, windowHeight);
}

export function createDamageNumber(originX: number, originY: number, damage: number): void {
   // Add a random offset to the damage number
   const spawnOffsetDirection = 2 * Math.PI * Math.random();
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
         healNumber.amount += healAmount;;
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
   damageTime -= 1 / Settings.TPS;
   if (damageTime < 0) {
      damageTime = 0;
      accumulatedDamage = 0;
      damageNumberWidth = 0
   }

   // Update research numbers
   for (let i = 0; i < researchNumbers.length; i++) {
      const researchNumber = researchNumbers[i];

      researchNumber.age += 1 / Settings.TPS;
      if (researchNumber.age >= RESEARCH_NUMBER_LIFETIME) {
         researchNumbers.splice(i, 1);
         i--;
         continue;
      }

      researchNumber.positionY += 8 / Settings.TPS;
   }

   // Update heal numbers
   for (let i = 0; i < healNumbers.length; i++) {
      const healNumber = healNumbers[i];

      healNumber.age += 1 / Settings.TPS;
      if (healNumber.age >= HEAL_NUMBER_LIFETIME) {
         healNumbers.splice(i, 1);
         i--;
         continue;
      }

      healNumber.positionY += 11 / Settings.TPS;
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
   const cameraX = getXPosInCamera(damageNumberX);
   const cameraY = getYPosInCamera(damageNumberY);

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
      const cameraX = getXPosInCamera(researchNumber.positionX);
      const cameraY = getYPosInCamera(researchNumber.positionY);
   
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
      const cameraX = getXPosInCamera(healNumber.positionX);
      const cameraY = getYPosInCamera(healNumber.positionY);
   
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

// @Speed
// @Speed
// @Speed
const renderPlayerNames = (): void => {
   ctx.fillStyle = "#000";
   ctx.font = "400 20px Helvetica";
   ctx.lineJoin = "round";
   ctx.miterLimit = 2;

   for (let i = 0; i < PlayerComponentArray.entities.length; i++) {
      const entityID = PlayerComponentArray.entities[i];
      if (Player.instance !== null && entityID === Player.instance.id) {
         continue;
      }

      const player = getEntityByID(entityID)!;
      const playerComponent = PlayerComponentArray.components[i];
      
      // Calculate position in camera
      const cameraX = getXPosInCamera(player.renderPosition.x);
      const cameraY = getYPosInCamera(player.renderPosition.y + 21);
      
      const username = playerComponent.username;

      const width = ctx.measureText(username).width; // @Speed

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
      ctx.strokeText(username, cameraX - width / 2, cameraY);
      
      // Draw text
      ctx.fillStyle = "#fff";
      ctx.fillText(username, cameraX - width / 2, cameraY);
   }
}

const renderPotentialBuildingPlans = (): void => {
   const hoveredBuildingPlan = getHoveredBuildingPlan();
   if (hoveredBuildingPlan === null) {
      return;
   }

   const potentialPlans = hoveredBuildingPlan.potentialBuildingPlans;
   if (potentialPlans.length === 0) {
      return;
   }

   const stats = getPotentialPlanStats(potentialPlans);
   for (let i = 0; i < potentialPlans.length; i++) {
      const potentialPlan = potentialPlans[i];

      // Calculate position in camera
      const cameraX = getXPosInCamera(potentialPlan.x);
      const cameraY = getYPosInCamera(potentialPlan.y);
      const height = 15;

      const idealness = calculatePotentialPlanIdealness(potentialPlan, stats);

      const textColour = idealness === 1 ? "#ff5252" : "#eee";

      ctx.font = "400 13px Helvetica";
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;

      const text = potentialPlan.safety.toFixed(2);
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

const renderBuildingPlanInfos = (): void => {
   const hoveredPlan = getHoveredBuildingPlan();
   const buildingPlans = getVisibleBuildingPlans();
   for (let i = 0; i < buildingPlans.length; i++) {
      const plan = buildingPlans[i];
      if (plan === hoveredPlan) {
         continue;
      }

      // Calculate position in camera
      const cameraX = getXPosInCamera(plan.x);
      const cameraY = getYPosInCamera(plan.y);
      const fontSize = 13;
      const height = fontSize * 2 + 2;

      const textColour = "#fff";

      const planNumText = "#" + plan.planNum;
      const planNumWidth = ctx.measureText(planNumText).width; // @Speed

      ctx.font = "400 " + fontSize + "px Helvetica";
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;

      const assignedTribesmanIDText = "to=" + plan.assignedTribesmanID;
      const assignedTribesmanIDWidth = ctx.measureText(assignedTribesmanIDText).width; // @Speed

      const width = Math.max(planNumWidth, assignedTribesmanIDWidth);

      // Draw text bg
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#000";
      ctx.fillRect(cameraX - width/2, cameraY - height / 2, width, height);
      
      // Draw text
      ctx.globalAlpha = 1;
      ctx.fillStyle = textColour;
      ctx.fillText(planNumText, cameraX - planNumWidth / 2, cameraY - height / 2 + fontSize);
      
      // Draw text
      ctx.globalAlpha = 1;
      ctx.fillStyle = textColour;
      ctx.fillText(assignedTribesmanIDText, cameraX - assignedTribesmanIDWidth / 2, cameraY - height / 2 + fontSize * 2);
   }
   ctx.globalAlpha = 1;
}

// @Temporary @Incomplete
// const getHoveredPotentialPlan = (): PotentialBuildingPlanData | null => {
//    if (Game.cursorPositionX === null || Game.cursorPositionY === null) {
//       return null;
//    }
   
//    const potentialBuildingPlans = getPotentialBuildingPlans();

//    let closestPlan: PotentialBuildingPlanData | undefined;
//    let minDist = 64;
//    for (let i = 0; i < potentialBuildingPlans.length; i++) {
//       const plan = potentialBuildingPlans[i];

//       const dist = distance(Game.cursorPositionX, Game.cursorPositionY, plan.x, plan.y);
//       if (dist < minDist) {
//          minDist = dist;
//          closestPlan = plan;
//       }
//    }

//    if (typeof closestPlan !== "undefined") {
//       return closestPlan;
//    }
//    return null;
// }

// @Incomplete
// const renderHoveredPotentialPlanInfo = (): void => {
//    const hoveredPlan = getHoveredPotentialPlan();
//    if (hoveredPlan === null) {
//       return;
//    }

//    let left = getXPosInCamera(hoveredPlan.x);
//    const top = getYPosInCamera(hoveredPlan.y);

//    const fontSize = 13;
//    const titleSpacing = 3;
//    const dataLeftMargin = 8;
//    const height = fontSize * 5 + titleSpacing;
   
//    const safetyInfo = hoveredPlan.safetyInfo;
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

   for (let i = 0; i < buildingSafetys.length; i++) {
      const buildingSafetyData = buildingSafetys[i];

      ctx.font = "400 " + fontSize + "px Helvetica";
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;

      const minText = "min=" + buildingSafetyData.minSafety.toFixed(2);
      const minWidth = ctx.measureText(minText).width; // @Speed

      const averageText = "avg=" + buildingSafetyData.averageSafety.toFixed(2);
      const averageWidth = ctx.measureText(averageText).width; // @Speed

      const extendedAverageText = "xavg=" + buildingSafetyData.extendedAverageSafety.toFixed(2);
      const extendedAverageWidth = ctx.measureText(extendedAverageText).width; // @Speed

      const resultText = "fin=" + buildingSafetyData.resultingSafety.toFixed(2);
      const resultWidth = ctx.measureText(resultText).width; // @Speed

      const width = Math.max(minWidth, averageWidth, extendedAverageWidth, resultWidth);

      // Calculate position in camera
      const height = fontSize * 4;
      const left = getXPosInCamera(buildingSafetyData.x) - width/2;
      const top = getYPosInCamera(buildingSafetyData.y) - height/2;

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

export function renderText(): void {
   clearTextCanvas();
   renderPlayerNames();
   renderDamageNumbers();
   renderResearchNumbers();
   renderHealNumbers();
   if (OPTIONS.showBuildingSafetys) {
      renderBuildingSafetys();
   }

   if (OPTIONS.showBuildingPlans) {
      renderBuildingPlanInfos();
      renderPotentialBuildingPlans();
      // @Temporary @Incomplete
      // renderHoveredPotentialPlanInfo();
   }
}
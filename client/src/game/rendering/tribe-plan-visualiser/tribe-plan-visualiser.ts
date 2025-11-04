import { BlueprintType } from "../../../../../shared/src/components";
import { Entity, EntityType } from "../../../../../shared/src/entities";
import { CRAFTING_RECIPES, CraftingRecipe } from "../../../../../shared/src/items/crafting-recipes";
import { ItemType } from "../../../../../shared/src/items/items";
import { PacketReader } from "../../../../../shared/src/packets";
import { StructureType } from "../../../../../shared/src/structures";
import { getTechByID, TechID, Tech } from "../../../../../shared/src/techs";
import { AIPlanType } from "../../../../../shared/src/utils";
import { TribePlanVisualiser_setPlan } from "../../../svelte/game/tribe-plan-visualiser/TribePlanVisualiser";
import { addMenuCloseFunction } from "../../menus";
import { ExtendedTribe, getTribeByID } from "../../tribes";

const enum Vars {
   NODE_DISPLAY_SIZE = 100
}

interface AIBasePlan {
   readonly type: AIPlanType;
   readonly assignedTribesman: Entity | null;
   readonly isComplete: boolean;
   readonly isCompletable: boolean;
   readonly childPlans: Array<AIPlan>;

   // Stuff for displaying the plan node
   displayWidth: number;
   readonly depth: number;
   xOffset: number;
}

export interface AIRootPlan extends AIBasePlan {
   readonly type: AIPlanType.root;
}

export interface AICraftRecipePlan extends AIBasePlan {
   readonly type: AIPlanType.craftRecipe;
   readonly recipe: CraftingRecipe;
   readonly productAmount: number;
}

export interface AIPlaceBuildingPlan extends AIBasePlan {
   readonly type: AIPlanType.placeBuilding;
   readonly entityType: EntityType;
}

export interface AIUpgradeBuildingPlan extends AIBasePlan {
   readonly type: AIPlanType.upgradeBuilding;
   readonly blueprintType: BlueprintType;
}

export interface AITechStudyPlan extends AIBasePlan {
   readonly type: AIPlanType.doTechStudy;
   readonly tech: Tech;
}

export interface AITechItemPlan extends AIBasePlan {
   readonly type: AIPlanType.doTechItems;
   readonly tech: Tech;
   readonly itemType: ItemType;
}

export interface AITechCompletePlan extends AIBasePlan {
   readonly type: AIPlanType.completeTech;
   readonly tech: Tech;
}

export interface AIGatherItemPlan extends AIBasePlan {
   readonly type: AIPlanType.gatherItem;
   readonly itemType: ItemType;
   readonly amount: number;
}

export type AIPlan = AIRootPlan | AICraftRecipePlan | AIPlaceBuildingPlan | AIUpgradeBuildingPlan | AITechStudyPlan | AITechItemPlan | AITechCompletePlan | AIGatherItemPlan;

export interface TribeAssignmentInfo {
   readonly tribeAssignment: AIPlan;
   readonly entityAssignments: Partial<Record<Entity, AIPlan>>;
}

let gl: WebGL2RenderingContext;

const tribePlanDataRecord: Record<number, TribeAssignmentInfo> = {};

let renderedTribeID: number | null = null;

// @Cleanup: Copy and paste
export function createTribePlanVisualiserGLContext(): void {
   const canvas = document.getElementById("tribe-plan-visualiser-canvas") as HTMLCanvasElement;
   const glAttempt = canvas.getContext("webgl2", { alpha: false });

   if (glAttempt === null) {
      alert("Your browser does not support WebGL.");
      throw new Error("Your browser does not support WebGL.");
   }
   gl = glAttempt;

   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
}

export function getTribePlanVisualiserGL(): WebGL2RenderingContext {
   return gl;
}

// @Incomplete: unused?
export function createTribePlanVisualiserShaders(): void {
   const vertexShaderText = `#version 300 es
   precision highp float;
   
   layout(location = 0) in vec2 a_position;

   void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);

      v_position = a_position;
   }
   `;
}

const readRootPlan = (reader: PacketReader, assignedTribesman: Entity | null, isComplete: boolean, isCompletable: boolean, depth: number): AIRootPlan => {
   return {
      type: AIPlanType.root,
      assignedTribesman: assignedTribesman,
      isComplete: isComplete,
      isCompletable: isCompletable,
      childPlans: [],
      displayWidth: 0,
      depth: depth,
      xOffset: 0
   };
}

const readCraftRecipePlan = (reader: PacketReader, assignedTribesman: Entity | null, isComplete: boolean, isCompletable: boolean, depth: number): AICraftRecipePlan => {
   const recipeIdx = reader.readNumber();
   const productAmount = reader.readNumber();
   
   return {
      type: AIPlanType.craftRecipe,
      assignedTribesman: assignedTribesman,
      isComplete: isComplete,
      isCompletable: isCompletable,
      childPlans: [],
      recipe: CRAFTING_RECIPES[recipeIdx],
      productAmount: productAmount,
      displayWidth: 0,
      depth: depth,
      xOffset: 0
   };
}

const readPlaceBuildingPlan = (reader: PacketReader, assignedTribesman: Entity | null, isComplete: boolean, isCompletable: boolean, depth: number): AIPlaceBuildingPlan => {
   const entityType = reader.readNumber() as StructureType;
   
   return {
      type: AIPlanType.placeBuilding,
      assignedTribesman: assignedTribesman,
      isComplete: isComplete,
      isCompletable: isCompletable,
      childPlans: [],
      entityType: entityType,
      displayWidth: 0,
      depth: depth,
      xOffset: 0
   };
}

const readUpgradeBuildingPlan = (reader: PacketReader, assignedTribesman: Entity | null, isComplete: boolean, isCompletable: boolean, depth: number): AIUpgradeBuildingPlan => {
   const blueprintType = reader.readNumber() as BlueprintType;
   
   return {
      type: AIPlanType.upgradeBuilding,
      assignedTribesman: assignedTribesman,
      isComplete: isComplete,
      isCompletable: isCompletable,
      childPlans: [],
      blueprintType: blueprintType,
      displayWidth: 0,
      depth: depth,
      xOffset: 0
   };
}

const readTechStudyPlan = (reader: PacketReader, assignedTribesman: Entity | null, isComplete: boolean, isCompletable: boolean, depth: number): AITechStudyPlan => {
   const techID = reader.readNumber() as TechID;
   
   return {
      type: AIPlanType.doTechStudy,
      assignedTribesman: assignedTribesman,
      isComplete: isComplete,
      isCompletable: isCompletable,
      childPlans: [],
      tech: getTechByID(techID),
      displayWidth: 0,
      depth: depth,
      xOffset: 0
   };
}

const readTechItemPlan = (reader: PacketReader, assignedTribesman: Entity | null, isComplete: boolean, isCompletable: boolean, depth: number): AITechItemPlan => {
   const techID = reader.readNumber() as TechID;
   const itemType = reader.readNumber() as ItemType;

   return {
      type: AIPlanType.doTechItems,
      assignedTribesman: assignedTribesman,
      isComplete: isComplete,
      isCompletable: isCompletable,
      childPlans: [],
      tech: getTechByID(techID),
      itemType: itemType,
      displayWidth: 0,
      depth: depth,
      xOffset: 0
   };
}

const readTechCompletePlan = (reader: PacketReader, assignedTribesman: Entity | null, isComplete: boolean, isCompletable: boolean, depth: number): AITechCompletePlan => {
   const techID = reader.readNumber() as TechID;
   
   return {
      type: AIPlanType.completeTech,
      assignedTribesman: assignedTribesman,
      isComplete: isComplete,
      isCompletable: isCompletable,
      childPlans: [],
      tech: getTechByID(techID),
      displayWidth: 0,
      depth: depth,
      xOffset: 0
   };
}

const readGatherItemPlan = (reader: PacketReader, assignedTribesman: Entity | null, isComplete: boolean, isCompletable: boolean, depth: number): AIGatherItemPlan => {
   const itemType = reader.readNumber() as ItemType;
   const amount = reader.readNumber();

   return {
      type: AIPlanType.gatherItem,
      assignedTribesman: assignedTribesman,
      isComplete: isComplete,
      isCompletable: isCompletable,
      childPlans: [],
      itemType: itemType,
      amount: amount,
      displayWidth: 0,
      depth: depth,
      xOffset: 0
   };
}

const readAssignmentData = (reader: PacketReader, depth: number): AIPlan => {
   const planType = reader.readNumber() as AIPlanType;
   let assignedEntity: Entity | null = reader.readNumber();
   if (assignedEntity === 0) {
      assignedEntity = null;
   }

   const isComplete = reader.readBool();
   const isCompletable = reader.readBool();

   let plan: AIPlan;
   switch (planType) {
      case AIPlanType.root:            plan = readRootPlan(reader, assignedEntity, isComplete, isCompletable, depth); break;
      case AIPlanType.craftRecipe:     plan = readCraftRecipePlan(reader, assignedEntity, isComplete, isCompletable, depth); break;
      case AIPlanType.placeBuilding:   plan = readPlaceBuildingPlan(reader, assignedEntity, isComplete, isCompletable, depth); break;
      case AIPlanType.upgradeBuilding: plan = readUpgradeBuildingPlan(reader, assignedEntity, isComplete, isCompletable, depth); break;
      case AIPlanType.doTechStudy:     plan = readTechStudyPlan(reader, assignedEntity, isComplete, isCompletable, depth); break;
      case AIPlanType.doTechItems:     plan = readTechItemPlan(reader, assignedEntity, isComplete, isCompletable, depth); break;
      case AIPlanType.completeTech:    plan = readTechCompletePlan(reader, assignedEntity, isComplete, isCompletable, depth); break;
      case AIPlanType.gatherItem:      plan = readGatherItemPlan(reader, assignedEntity, isComplete, isCompletable, depth); break;
   }

   const numChildren = reader.readNumber();
   for (let i = 0; i < numChildren; i++) {
      const childPlan = readAssignmentData(reader, depth + 1);
      plan.childPlans.push(childPlan);

      plan.displayWidth += childPlan.displayWidth;
   }

   if (numChildren === 0) {
      plan.displayWidth += Vars.NODE_DISPLAY_SIZE;
   }

   return plan;
}

const fillPlanChildrenXOffset = (plan: AIPlan): void => {
   let offsetCounter = -plan.displayWidth * 0.5;
   for (let i = 0; i < plan.childPlans.length; i++) {
      const childPlan = plan.childPlans[i];
      
      // Inherit parent x offset
      childPlan.xOffset = plan.xOffset;
      childPlan.xOffset += offsetCounter + childPlan.displayWidth * 0.5;

      fillPlanChildrenXOffset(childPlan);
      
      offsetCounter += childPlan.displayWidth;
   }
}

export function updateTribePlanData(reader: PacketReader, tribeID: number): void {
   const tribePlan = readAssignmentData(reader, 0);
   fillPlanChildrenXOffset(tribePlan);

   const tribeAssignmentInfo: TribeAssignmentInfo = {
      tribeAssignment: tribePlan,
      entityAssignments: {}
   };

   // Entity assignments
   const numEntityAssignments = reader.readNumber();
   for (let i = 0; i < numEntityAssignments; i++) {
      const entity = reader.readNumber() as Entity;

      const assignment = readAssignmentData(reader, 0);
      fillPlanChildrenXOffset(assignment);

      tribeAssignmentInfo.entityAssignments[entity] = assignment;
   }

   tribePlanDataRecord[tribeID] = tribeAssignmentInfo;
}

export function setRenderedTribePlanID(id: number | null): void {
   if (renderedTribeID === null) {
      addMenuCloseFunction(() => {
         renderedTribeID = null;
      });
   }
   
   renderedTribeID = id;
}

export function renderTribePlans(): void {
   const canvasElement = document.getElementById("tribe-plan-visualiser-canvas");
   if (canvasElement === null) {
      return;
   }
   
   if (renderedTribeID === null) {
      canvasElement.classList.add("hidden");
      TribePlanVisualiser_setPlan(null, null);
   } else {
      canvasElement.classList.remove("hidden");
      
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      
      const tribeAssignmentInfo = tribePlanDataRecord[renderedTribeID];
      TribePlanVisualiser_setPlan(tribeAssignmentInfo, getTribeByID(renderedTribeID) as ExtendedTribe);
   }
}
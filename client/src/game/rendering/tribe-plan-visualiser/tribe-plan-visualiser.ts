import { AIPlanType, getTechByID, TechID, Tech,StructureType, PacketReader, ItemType, CRAFTING_RECIPES, CraftingRecipe, Entity, EntityType, BlueprintType } from "webgl-test-shared";
import { tribePlanVisualiserState } from "../../../ui-state/tribe-plan-visualiser-state";
import { ExtendedTribe, getTribeByID } from "../../tribes";
import { MenuType, openMenu } from "../../../ui/menus";

const enum Var {
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

const tribePlanDataRecord: Record<number, TribeAssignmentInfo> = {};

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
      plan.displayWidth += Var.NODE_DISPLAY_SIZE;
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

// @Garbage: caused a 35ms long GC stutter
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

export function setRenderedTribePlanID(renderedTribeID: number | null): void {
   if (renderedTribeID === null) {
      tribePlanVisualiserState.setTribeAssignmentInfo(null);
      tribePlanVisualiserState.setTribe(null);
   } else {
      const tribeAssignmentInfo = tribePlanDataRecord[renderedTribeID];
      tribePlanVisualiserState.setTribeAssignmentInfo(tribeAssignmentInfo);
      tribePlanVisualiserState.setTribe(getTribeByID(renderedTribeID) as ExtendedTribe);
      
      openMenu(MenuType.tribePlanVisualiser);
   }
}
import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { InventoryName } from "../../../shared/src/items/items";
import { AIPlanType, assert } from "../../../shared/src/utils";
import { throwItem } from "../entities/tribes/tribe-member";
import { goCraftItem, craftGoalIsComplete } from "../entities/tribes/tribesman-ai/tribesman-crafting";
import { goResearchTech, techStudyIsComplete, useItemsInResearch } from "../entities/tribes/tribesman-ai/tribesman-researching";
import { gatherItemPlanIsComplete, workOnGatherPlan } from "../entities/tribes/tribesman-ai/tribesman-gathering";
import { goPlaceBuilding, goUpgradeBuilding } from "../entities/tribes/tribesman-ai/tribesman-structures";
import Tribe from "../Tribe";
import { checkForAvailableAssignment, AIPlanAssignment, createPersonalAssignment, getFirstAvailableAssignment, AIPlan } from "../tribesman-ai/tribesman-ai-planning";
import { ComponentArray } from "./ComponentArray";
import { getInventory, hasSpaceForRecipe, InventoryComponentArray } from "./InventoryComponent";
import { TransformComponentArray } from "./TransformComponent";
import { TribeComponentArray } from "./TribeComponent";

export class AIAssignmentComponent {
   public wholeAssignment: AIPlanAssignment | null = null;
   /** The currently assigned part of the whole assignment */
   public currentAssignment: AIPlanAssignment | null = null;
}

export const AIAssignmentComponentArray = new ComponentArray<AIAssignmentComponent>(ServerComponentType.aiAssignment, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

const findAssignmentWithChildPlan = (assignment: AIPlanAssignment, targetChildPlan: AIPlan): AIPlanAssignment | null => {
   for (const childAssignment of assignment.children) {
      if (childAssignment.plan === targetChildPlan) {
         return assignment;
      }

      // @Cleanup: var name
      const ya = findAssignmentWithChildPlan(childAssignment, targetChildPlan);
      if (ya !== null) {
         return ya;
      }
   }

   return null;
}

export function clearAssignment(aiAssignmentComponent: AIAssignmentComponent): void {
   aiAssignmentComponent.wholeAssignment = null;
   aiAssignmentComponent.currentAssignment = null;
}

const completeAssignment = (entity: Entity, aiAssignmentComponent: AIAssignmentComponent, assignment: AIPlanAssignment, tribe: Tribe): void => {
   assignment.plan.isComplete = true;

   assert(aiAssignmentComponent.wholeAssignment !== null);
   // Move on to the next part of the assignment
   aiAssignmentComponent.currentAssignment = getFirstAvailableAssignment(aiAssignmentComponent.wholeAssignment);
   
   // If all of the assignment was completed, note that in the whole assignment
   if (aiAssignmentComponent.currentAssignment === null) {
      aiAssignmentComponent.wholeAssignment = null;
   } else {
      aiAssignmentComponent.currentAssignment.assignedEntity = entity;
   }

   // If the plan was to place a building, the plan has an associated virutal buildling which
   // must be removed before the building is actually placed.
   const plan = assignment.plan;
   switch (plan.type) {
      case AIPlanType.placeBuilding: {
         // @Cleanup: instead do this when the building is placed
         
         const buildingLayer = tribe.buildingLayers[plan.virtualBuilding.layer.depth];
         buildingLayer.removeVirtualBuilding(plan.virtualBuilding);

         // @Hack
         const parent = findAssignmentWithChildPlan(tribe.rootAssignment, plan);
         if (parent !== null) {
            // @Cleanup: messy
            let idx: number | undefined;
            for (let i = 0; i < parent.children.length; i++) {
               const currentAssignment = parent.children[i];
               if (currentAssignment.plan === plan) {
                  idx = i;
                  break;
               }
            }
            assert(typeof idx !== "undefined");
            parent.children.splice(idx, 1);
         }

         break;
      }
   }
}

const clearAssigned = (assignment: AIPlanAssignment): void => {
   assignment.assignedEntity = null;
   
   for (const childAssignment of assignment.children) {
      clearAssigned(childAssignment);
   }
}

export function addAssignmentPart(aiAssignmentComponent: AIAssignmentComponent, newAssignmentPart: AIPlanAssignment): void {
   assert(aiAssignmentComponent.wholeAssignment !== null);
   aiAssignmentComponent.wholeAssignment.children.push(newAssignmentPart);

   // Refresh the current assignment part
   clearAssigned(aiAssignmentComponent.wholeAssignment);
   aiAssignmentComponent.currentAssignment = getFirstAvailableAssignment(aiAssignmentComponent.wholeAssignment);
   /** There should always be an available part of a new assignment */
   assert(aiAssignmentComponent.currentAssignment !== null);
}

export function runAssignmentAI(entity: Entity, visibleItemEntities: ReadonlyArray<Entity>): boolean {
   const aiAssignmentComponent = AIAssignmentComponentArray.getComponent(entity);
   const tribeComponent = TribeComponentArray.getComponent(entity);

   // If the entity doesn't have an assignment, attempt to assign one
   if (aiAssignmentComponent.wholeAssignment === null) {
      const availableAssignment = checkForAvailableAssignment(tribeComponent.tribe);
      if (availableAssignment !== null) {
         const assignment = createPersonalAssignment(entity, availableAssignment);
         
         aiAssignmentComponent.wholeAssignment = assignment;
         aiAssignmentComponent.currentAssignment = getFirstAvailableAssignment(assignment);
         /** There should always be an available part of a new assignment */
         assert(aiAssignmentComponent.currentAssignment !== null);
         
         aiAssignmentComponent.currentAssignment.assignedEntity = entity;
         availableAssignment.assignedEntity = entity;
      }
   }

   const assignment = aiAssignmentComponent.currentAssignment;

   // If they still don't have an assignment, don't run the assignment AI
   if (assignment === null) {
      return false;
   }

   const plan = assignment.plan;
   
   switch (plan.type) {
      case AIPlanType.craftRecipe: {
         // @Cleanup: do in the function
         // If not enough space, try to make space
         const inventoryComponent = InventoryComponentArray.getComponent(entity);
         if (!hasSpaceForRecipe(inventoryComponent, plan.recipe, InventoryName.hotbar)) {
            // Just throw out any item which isn't used in the recipe
            let hasThrown = false;
            const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);
            const transformComponent = TransformComponentArray.getComponent(entity);
            const entityHitbox = transformComponent.hitboxes[0];
            
            for (let i = 0; i < hotbarInventory.items.length; i++) {
               const item = hotbarInventory.items[i];

               if (plan.recipe.ingredients.getItemCount(item.type) === 0) {
                  const itemSlot = hotbarInventory.getItemSlot(item);
                  throwItem(entity, InventoryName.hotbar, itemSlot, item.count, entityHitbox.box.angle);
                  hasThrown = true;
                  break;
               }
            }

            if (!hasThrown) {
               console.warn("couldn't throw");
               console.log(hotbarInventory.itemSlots);
               console.log(plan.recipe);
               return false;
            }
         }

         goCraftItem(entity, plan, tribeComponent.tribe);
         if (craftGoalIsComplete(plan, inventoryComponent)) {
            completeAssignment(entity, aiAssignmentComponent, assignment, tribeComponent.tribe);
         }
         break;
      }
      case AIPlanType.placeBuilding: {
         // @Copynpaste
         const inventoryComponent = InventoryComponentArray.getComponent(entity);
         const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

         const isPlaced = goPlaceBuilding(entity, hotbarInventory, tribeComponent.tribe, plan);
         if (isPlaced) {
            completeAssignment(entity, aiAssignmentComponent, assignment, tribeComponent.tribe);
         }
         break;
      }
      case AIPlanType.upgradeBuilding: {
         goUpgradeBuilding(entity, plan);
         break;
      }
      case AIPlanType.doTechStudy: {
         goResearchTech(entity, plan.tech);
         if (techStudyIsComplete(tribeComponent.tribe, plan.tech)) {
            completeAssignment(entity, aiAssignmentComponent, assignment, tribeComponent.tribe);
         }
         break;
      }
      case AIPlanType.doTechItems: {
         // @Copynpaste
         const inventoryComponent = InventoryComponentArray.getComponent(entity);
         const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);
         
         // Use items in research
         const isComplete = useItemsInResearch(entity, plan.tech, plan.itemType, hotbarInventory);
         if (isComplete) {
            completeAssignment(entity, aiAssignmentComponent, assignment, tribeComponent.tribe);
         }
         break;
      }
      case AIPlanType.completeTech: {
         assert(tribeComponent.tribe.techIsComplete(plan.tech));

         tribeComponent.tribe.unlockTech(plan.tech);
         completeAssignment(entity, aiAssignmentComponent, assignment, tribeComponent.tribe);
         break;
      }
      case AIPlanType.gatherItem: {
         const inventoryComponent = InventoryComponentArray.getComponent(entity);
         if (gatherItemPlanIsComplete(inventoryComponent, plan)) {
            completeAssignment(entity, aiAssignmentComponent, assignment, tribeComponent.tribe);
         } else {
            workOnGatherPlan(entity, plan, visibleItemEntities);
         }
         break;
      }
   }

   return true;
}
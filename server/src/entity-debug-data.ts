import { EntityDebugData } from "webgl-test-shared/dist/client-server-types";
import { TribesmanAIType } from "webgl-test-shared/dist/components";
import { EntityTypeString } from "webgl-test-shared/dist/entities";
import { ItemType, ITEM_INFO_RECORD, PlaceableItemInfo } from "webgl-test-shared/dist/items";
import { getTechByID } from "webgl-test-shared/dist/techs";
import { Mutable } from "webgl-test-shared/dist/utils";
import Entity from "./Entity";
import { TribeComponentArray, TribesmanComponentArray } from "./components/ComponentArray";
import { TRIBESMAN_COMMUNICATION_RANGE, getTribesmanVisionRange } from "./entities/tribes/tribesman-ai/tribesman-ai";
import { TribesmanGoalType } from "./entities/tribes/tribesman-ai/tribesman-goals";
import Board from "./Board";
import { FenceConnectionComponentArray } from "./components/FenceConnectionComponent";

export function getEntityDebugData(entity: Entity): EntityDebugData {
   // @Cleanup: I really don't like this mutable partial type situation
   const debugData: Mutable<Partial<EntityDebugData>> = {
      entityID: entity.id,
      lines: [],
      circles: [],
      tileHighlights: [],
      debugEntries: []
   };

   if (TribesmanComponentArray.hasComponent(entity.id)) {
      const tribesmanComponent = TribesmanComponentArray.getComponent(entity.id);

      debugData.debugEntries!.push("Current AI type: " + TribesmanAIType[tribesmanComponent.currentAIType]);
      
      if (tribesmanComponent.path.length > 0 && tribesmanComponent.isPathfinding) {
         debugData.pathData = {
            pathNodes: tribesmanComponent.path,
            rawPathNodes: tribesmanComponent.rawPath
         };
      }

      // Vision range
      debugData.circles!.push({
         radius: getTribesmanVisionRange(entity),
         thickness: 8,
         colour: [0.3, 0, 1]
      });
      
      // Communication range
      debugData.circles!.push({
         radius: TRIBESMAN_COMMUNICATION_RANGE,
         thickness: 8,
         colour: [1, 0, 0.3]
      });

      // Display the goals of the tribesman
      const goalStrings = new Array<string>();
      for (let i = 0; i < tribesmanComponent.goals.length; i++) {
         const goal = tribesmanComponent.goals[i];
         
         let goalString = "";
         switch (goal.type) {
            case TribesmanGoalType.craftRecipe: {
               goalString = "Craft " + ItemType[goal.recipe.product];
               break;
            }
            case TribesmanGoalType.placeBuilding: {
               const buildingType = (ITEM_INFO_RECORD[goal.plan.buildingRecipe.product] as PlaceableItemInfo).entityType;
               goalString = "Place  " + EntityTypeString[buildingType];
               break;
            }
            case TribesmanGoalType.researchTech: {
               goalString = "Research " + goal.tech.name;
               break;
            }
            case TribesmanGoalType.gatherItems: {
               goalString = "Gather " + goal.itemTypesToGather.map(itemType => ItemType[itemType]).join(", ");
               break;
            }
            case TribesmanGoalType.upgradeBuilding: {
               const building = Board.entityRecord[goal.plan.baseBuildingID]!;
               goalString = "Upgrade " + EntityTypeString[building.type];
               break;
            }
         }

         goalStrings.push(goalString);
      }
      debugData.debugEntries!.push(goalStrings.join(" -> "));
   }

   if (TribeComponentArray.hasComponent(entity.id)) {
      const tribeComponent = TribeComponentArray.getComponent(entity.id);
      debugData.debugEntries!.push("Researched techs: " + tribeComponent.tribe.unlockedTechs.map(techID => getTechByID(techID).name).join(", "));
   }

   if (FenceConnectionComponentArray.hasComponent(entity.id)) {
      const fenceConnectionComponent = FenceConnectionComponentArray.getComponent(entity.id);

      const hasTopConnection = (fenceConnectionComponent.connectedSidesBitset & 0b0001) !== 0;
      const hasRightConnection = (fenceConnectionComponent.connectedSidesBitset & 0b0010) !== 0;
      const hasBottomConnection = (fenceConnectionComponent.connectedSidesBitset & 0b0100) !== 0;
      const hasLeftConnection = (fenceConnectionComponent.connectedSidesBitset & 0b1000) !== 0;
      
      debugData.debugEntries!.push("connectedSidesBitset: " + fenceConnectionComponent.connectedSidesBitset);
      debugData.debugEntries!.push("Connections:" + (hasTopConnection ? " top" : "") + (hasRightConnection ? " right" : "") + (hasBottomConnection ? " bottom" : "") + (hasLeftConnection ? " left" : ""));
   }

   return debugData as EntityDebugData;
}
import { CircleDebugData, EntityDebugData, LineDebugData, PathData, TileHighlightData } from "webgl-test-shared/dist/client-server-types";
import { TribesmanAIType } from "webgl-test-shared/dist/components";
import { EntityID, EntityTypeString } from "webgl-test-shared/dist/entities";
import { getTechByID } from "webgl-test-shared/dist/techs";
import { TRIBESMAN_COMMUNICATION_RANGE } from "./entities/tribes/tribesman-ai/tribesman-ai";
import { TribesmanGoalType } from "./entities/tribes/tribesman-ai/tribesman-goals";
import Board from "./Board";
import { StructureComponentArray } from "./components/StructureComponent";
import { TribeComponentArray } from "./components/TribeComponent";
import { TribesmanAIComponentArray } from "./components/TribesmanAIComponent";
import { getTribesmanVisionRange } from "./entities/tribes/tribesman-ai/tribesman-ai-utils";
import { ItemTypeString, ITEM_INFO_RECORD, PlaceableItemInfo } from "webgl-test-shared/dist/items/items";

export function getEntityDebugData(entity: EntityID): EntityDebugData {
   const lines = new Array<LineDebugData>();
   const circles = new Array<CircleDebugData>();
   const tileHighlights = new Array<TileHighlightData>();
   const debugEntries = new Array<string>();
   let pathData: PathData | undefined;

   if (TribesmanAIComponentArray.hasComponent(entity)) {
      const tribesmanComponent = TribesmanAIComponentArray.getComponent(entity);

      debugEntries.push("Current AI type: " + TribesmanAIType[tribesmanComponent.currentAIType]);
      
      if (tribesmanComponent.path.length > 0 && tribesmanComponent.isPathfinding) {
         pathData = {
            pathNodes: tribesmanComponent.path,
            rawPathNodes: tribesmanComponent.rawPath
         };
      }

      // Vision range
      circles.push({
         radius: getTribesmanVisionRange(entity),
         thickness: 8,
         colour: [0.3, 0, 1]
      });
      
      // Communication range
      circles.push({
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
               goalString = "Craft " + ItemTypeString[goal.recipe.product];
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
               goalString = "Gather " + goal.itemTypesToGather.map(itemType => ItemTypeString[itemType]).join(", ");
               break;
            }
            case TribesmanGoalType.upgradeBuilding: {
               goalString = "Upgrade " + EntityTypeString[Board.getEntityType(goal.plan.baseBuildingID)!];
               break;
            }
         }

         goalStrings.push(goalString);
      }
      debugEntries.push(goalStrings.join(" -> "));
   }

   if (TribeComponentArray.hasComponent(entity)) {
      const tribeComponent = TribeComponentArray.getComponent(entity);
      debugEntries.push("Researched techs: " + tribeComponent.tribe.unlockedTechs.map(techID => getTechByID(techID).name).join(", "));
   }

   if (StructureComponentArray.hasComponent(entity)) {
      const structureComponent = StructureComponentArray.getComponent(entity);

      const hasTopConnection = (structureComponent.connectedSidesBitset & 0b0001) !== 0;
      const hasRightConnection = (structureComponent.connectedSidesBitset & 0b0010) !== 0;
      const hasBottomConnection = (structureComponent.connectedSidesBitset & 0b0100) !== 0;
      const hasLeftConnection = (structureComponent.connectedSidesBitset & 0b1000) !== 0;
      
      debugEntries.push("connectedSidesBitset: " + structureComponent.connectedSidesBitset);
      debugEntries.push("Connections:" + (hasTopConnection ? " top" : "") + (hasRightConnection ? " right" : "") + (hasBottomConnection ? " bottom" : "") + (hasLeftConnection ? " left" : ""));
   }

   return {
      entityID: entity,
      lines: lines,
      circles: circles,
      tileHighlights: tileHighlights,
      debugEntries: debugEntries,
      pathData: pathData
   };
}
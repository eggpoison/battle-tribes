import { CircleDebugData, EntityDebugData, LineDebugData, PathData, TileHighlightData } from "battletribes-shared/client-server-types";
import { TribesmanAIType } from "battletribes-shared/components";
import { EntityID, EntityTypeString } from "battletribes-shared/entities";
import { getTechByID } from "battletribes-shared/techs";
import { TRIBESMAN_COMMUNICATION_RANGE } from "./entities/tribes/tribesman-ai/tribesman-ai";
import { TribesmanGoalType } from "./entities/tribes/tribesman-ai/tribesman-goals";
import Board from "./Board";
import { StructureComponentArray } from "./components/StructureComponent";
import { TribeComponentArray } from "./components/TribeComponent";
import { TribesmanAIComponentArray } from "./components/TribesmanAIComponent";
import { getTribesmanVisionRange } from "./entities/tribes/tribesman-ai/tribesman-ai-utils";
import { ItemTypeString, ITEM_INFO_RECORD, PlaceableItemInfo } from "battletribes-shared/items/items";
import { Packet } from "battletribes-shared/packets";

export function createEntityDebugData(entity: EntityID): EntityDebugData {
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

export function getEntityDebugDataLength(debugData: EntityDebugData): number {
   let lengthBytes = 2 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 6 * Float32Array.BYTES_PER_ELEMENT * debugData.lines.length;
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 5 * Float32Array.BYTES_PER_ELEMENT * debugData.circles.length;
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 5 * Float32Array.BYTES_PER_ELEMENT * debugData.tileHighlights.length;
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += (Float32Array.BYTES_PER_ELEMENT + 1000) * debugData.debugEntries.length;

   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;
   if (typeof debugData.pathData !== "undefined") {
      lengthBytes += Float32Array.BYTES_PER_ELEMENT * debugData.pathData.pathNodes.length;
      lengthBytes += Float32Array.BYTES_PER_ELEMENT * debugData.pathData.rawPathNodes.length;
   }

   return lengthBytes;
}

export function addEntityDebugDataToPacket(packet: Packet, entity: EntityID, debugData: EntityDebugData): void {
   packet.addNumber(entity);

   packet.addNumber(debugData.lines.length);
   for (const line of debugData.lines) {
      packet.addNumber(line.colour[0]);
      packet.addNumber(line.colour[1]);
      packet.addNumber(line.colour[2]);
      packet.addNumber(line.targetPosition[0]);
      packet.addNumber(line.targetPosition[1]);
      packet.addNumber(line.thickness);
   }

   packet.addNumber(debugData.circles.length);
   for (const circle of debugData.circles) {
      packet.addNumber(circle.colour[0]);
      packet.addNumber(circle.colour[1]);
      packet.addNumber(circle.colour[2]);
      packet.addNumber(circle.radius);
      packet.addNumber(circle.thickness);
   }

   packet.addNumber(debugData.tileHighlights.length);
   for (const tileHighlight of debugData.tileHighlights) {
      packet.addNumber(tileHighlight.colour[0]);
      packet.addNumber(tileHighlight.colour[1]);
      packet.addNumber(tileHighlight.colour[2]);
      packet.addNumber(tileHighlight.tilePosition[0]);
      packet.addNumber(tileHighlight.tilePosition[1]);
   }

   packet.addNumber(debugData.debugEntries.length);
   for (const string of debugData.debugEntries) {
      // @Hack: hardcoded
      packet.addString(string, 1000);
   }

   if (typeof debugData.pathData !== "undefined") {
      packet.addNumber(debugData.pathData.pathNodes.length);
      for (const nodeIndex of debugData.pathData.pathNodes) {
         packet.addNumber(nodeIndex);
      }

      packet.addNumber(debugData.pathData.rawPathNodes.length);
      for (const nodeIndex of debugData.pathData.rawPathNodes) {
         packet.addNumber(nodeIndex);
      }
   } else {
      packet.addNumber(0);
      packet.addNumber(0);
   }
}
import { CircleDebugData, EntityDebugData, LineDebugData, PathData, TileHighlightData } from "battletribes-shared/client-server-types";
import { TribesmanAIType } from "battletribes-shared/components";
import { Entity, EntityTypeString } from "battletribes-shared/entities";
import { TRIBESMAN_COMMUNICATION_RANGE } from "./entities/tribes/tribesman-ai/tribesman-ai";
import { TribeComponentArray } from "./components/TribeComponent";
import { TribesmanAIComponentArray } from "./components/TribesmanAIComponent";
import { ItemTypeString } from "battletribes-shared/items/items";
import { getStringLengthBytes, Packet } from "battletribes-shared/packets";
import { getEntityType } from "./world";
import { AIHelperComponentArray } from "./components/AIHelperComponent";
import { AIPlan } from "./tribesman-ai/tribesman-ai-planning";
import { AIPlanType, getTileX, getTileY } from "../../shared/src/utils";
import { AIAssignmentComponentArray } from "./components/AIAssignmentComponent";
import { YetiComponentArray } from "./components/YetiComponent";
import { EnergyStoreComponentArray } from "./components/EnergyStoreComponent";
import { EnergyStomachComponentArray } from "./components/EnergyStomachComponent";
import { OkrenComponentArray } from "./components/OkrenComponent";
import { AIPathfindingComponentArray } from "./components/AIPathfindingComponent";

const getPlanDebugString = (plan: AIPlan): string => {
   switch (plan.type) {
      case AIPlanType.craftRecipe: {
         return "Craft " + ItemTypeString[plan.recipe.product];
      }
      case AIPlanType.placeBuilding: {
         return "Place  " + EntityTypeString[plan.virtualBuilding.entityType];
      }
      case AIPlanType.doTechStudy: {
         return "Study " + plan.tech.name;
      }
      case AIPlanType.doTechItems: {
         return "Contribute " + ItemTypeString[plan.itemType] + " to " + plan.tech.name;
      }
      case AIPlanType.completeTech: {
         return "Complete " + plan.tech.name;
      }
      case AIPlanType.gatherItem: {
         return "Gather " + ItemTypeString[plan.itemType];
      }
      case AIPlanType.upgradeBuilding: {
         return "Upgrade " + EntityTypeString[getEntityType(plan.baseBuildingID)];
      }
      case AIPlanType.root: {
         return "Nothing left to do";
      }
   }
}

export function createEntityDebugData(entity: Entity): EntityDebugData {
   const lines = new Array<LineDebugData>();
   const circles = new Array<CircleDebugData>();
   const tileHighlights = new Array<TileHighlightData>();
   const debugEntries = new Array<string>();
   let pathData: PathData | undefined;

   if (AIHelperComponentArray.hasComponent(entity)) {
      const aiHelperComponent = AIHelperComponentArray.getComponent(entity);

      // Vision range
      circles.push({
         radius: aiHelperComponent.visionRange,
         thickness: 8,
         colour: [0.3, 0, 1]
      });
   }
   
   if (TribesmanAIComponentArray.hasComponent(entity)) {
      const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(entity);
      
      debugEntries.push("Current AI type: " + TribesmanAIType[tribesmanAIComponent.currentAIType]);
      
      // Communication range
      circles.push({
         radius: TRIBESMAN_COMMUNICATION_RANGE,
         thickness: 8,
         colour: [1, 0, 0.3]
      });
   }

   if (AIPathfindingComponentArray.hasComponent(entity)) {
      const aiPathfindingComponent = AIPathfindingComponentArray.getComponent(entity);
      if (aiPathfindingComponent.paths.length > 0) {
         const path = aiPathfindingComponent.paths[0];

         pathData = {
            goalX: path.goalX,
            goalY: path.goalY,
            pathNodes: path.smoothPath,
            rawPathNodes: path.rawPath,
            visitedNodes: path.visitedNodes
         };
      }
   }

   if (AIAssignmentComponentArray.hasComponent(entity)) {
      const aiAssignmentComponent = AIAssignmentComponentArray.getComponent(entity);
      if (aiAssignmentComponent.wholeAssignment !== null) {
         debugEntries.push("Tribesman plan: " + getPlanDebugString(aiAssignmentComponent.wholeAssignment.plan));
      } else {
         debugEntries.push("Tribesman plan: none");
      }
   }

   if (TribeComponentArray.hasComponent(entity)) {
      const tribeComponent = TribeComponentArray.getComponent(entity);
      debugEntries.push("Researched techs: " + tribeComponent.tribe.unlockedTechs.map(tech => tech.name).join(", "));
   }

   if (YetiComponentArray.hasComponent(entity)) {
      const yetiComponent = YetiComponentArray.getComponent(entity);
      for (const tileIndex of yetiComponent.territory) {
         const tileX = getTileX(tileIndex);
         const tileY = getTileY(tileIndex);
         tileHighlights.push({
            colour: [1, 0, 0],
            tilePosition: [tileX, tileY]
         });
      }
   }

   if (OkrenComponentArray.hasComponent(entity)) {
      const okrenComponent = OkrenComponentArray.getComponent(entity);
      debugEntries.push("Eggs ready: " + okrenComponent.numEggsReady);
   }

   if (EnergyStoreComponentArray.hasComponent(entity)) {
      const energyStoreComponent = EnergyStoreComponentArray.getComponent(entity);
      debugEntries.push("Base energy: " + energyStoreComponent.energyAmount);
   }

   if (EnergyStomachComponentArray.hasComponent(entity)) {
      const energyStomachComponent = EnergyStomachComponentArray.getComponent(entity);
      debugEntries.push("Stomach energy: " + energyStomachComponent.energy + "/" + energyStomachComponent.energyCapacity);
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
   for (const debugEntry of debugData.debugEntries) {
      lengthBytes += getStringLengthBytes(debugEntry);
   }

   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   if (typeof debugData.pathData !== "undefined") {
      lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;
      
      lengthBytes += Float32Array.BYTES_PER_ELEMENT;
      lengthBytes += Float32Array.BYTES_PER_ELEMENT * debugData.pathData.pathNodes.length;

      lengthBytes += Float32Array.BYTES_PER_ELEMENT;
      lengthBytes += Float32Array.BYTES_PER_ELEMENT * debugData.pathData.rawPathNodes.length;
      
      lengthBytes += Float32Array.BYTES_PER_ELEMENT;
      lengthBytes += Float32Array.BYTES_PER_ELEMENT * debugData.pathData.visitedNodes.length;
   }

   return lengthBytes;
}

export function addEntityDebugDataToPacket(packet: Packet, entity: Entity, debugData: EntityDebugData): void {
   packet.writeNumber(entity);

   packet.writeNumber(debugData.lines.length);
   for (const line of debugData.lines) {
      packet.writeNumber(line.colour[0]);
      packet.writeNumber(line.colour[1]);
      packet.writeNumber(line.colour[2]);
      packet.writeNumber(line.targetPosition[0]);
      packet.writeNumber(line.targetPosition[1]);
      packet.writeNumber(line.thickness);
   }

   packet.writeNumber(debugData.circles.length);
   for (const circle of debugData.circles) {
      packet.writeNumber(circle.colour[0]);
      packet.writeNumber(circle.colour[1]);
      packet.writeNumber(circle.colour[2]);
      packet.writeNumber(circle.radius);
      packet.writeNumber(circle.thickness);
   }

   packet.writeNumber(debugData.tileHighlights.length);
   for (const tileHighlight of debugData.tileHighlights) {
      packet.writeNumber(tileHighlight.colour[0]);
      packet.writeNumber(tileHighlight.colour[1]);
      packet.writeNumber(tileHighlight.colour[2]);
      packet.writeNumber(tileHighlight.tilePosition[0]);
      packet.writeNumber(tileHighlight.tilePosition[1]);
   }

   packet.writeNumber(debugData.debugEntries.length);
   for (const string of debugData.debugEntries) {
      packet.writeString(string);
   }

   if (typeof debugData.pathData !== "undefined") {
      packet.writeBool(true);

      packet.writeNumber(debugData.pathData.goalX);
      packet.writeNumber(debugData.pathData.goalY);

      packet.writeNumber(debugData.pathData.pathNodes.length);
      for (const nodeIndex of debugData.pathData.pathNodes) {
         packet.writeNumber(nodeIndex);
      }

      packet.writeNumber(debugData.pathData.rawPathNodes.length);
      for (const nodeIndex of debugData.pathData.rawPathNodes) {
         packet.writeNumber(nodeIndex);
      }

      packet.writeNumber(debugData.pathData.visitedNodes.length);
      for (const nodeIndex of debugData.pathData.visitedNodes) {
         packet.writeNumber(nodeIndex);
      }
   } else {
      packet.writeBool(false);
   }
}
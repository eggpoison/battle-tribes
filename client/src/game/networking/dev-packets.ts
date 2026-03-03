import { assert, PacketReader, CircleDebugData, EntityDebugData, LineDebugData, PathData, PathfindingNodeIndex, TileHighlightData, SafetyNodeData } from "webgl-test-shared";
import { hoverDebugState } from "../../ui-state/hover-debug-state";
import { readTribeBuildingSafeties, resetBuildingSafeties } from "../building-safety";
import { updateLightLevelsFromData } from "../light-levels";
import { updateLocalBiomesFromData } from "../local-biomes";
import { updateTribePlanData } from "../rendering/tribe-plan-visualiser/tribe-plan-visualiser";
import { setVisiblePathfindingNodeOccupances } from "../rendering/webgl/pathfinding-node-rendering";
import { setVisibleSafetyNodes } from "../rendering/webgl/safety-node-rendering";
import { SubtileSupportInfo, setVisibleSubtileSupports } from "../rendering/webgl/subtile-support-rendering";
import { setSpawnDistributionBlocks, SpawnDistributionBlock } from "../text-canvas";
import { readGhostVirtualBuildings, pruneGhostBuildingPlans } from "../virtual-buildings";

const updateEntityDebugInfoFromPacket = (reader: PacketReader): EntityDebugData => {
   const entityID = reader.readNumber();

   const lines = new Array<LineDebugData>();
   const numLines = reader.readNumber();
   for (let i = 0; i < numLines; i++) {
      const r = reader.readNumber();
      const g = reader.readNumber();
      const b = reader.readNumber();
      const targetX = reader.readNumber();
      const targetY = reader.readNumber();
      const thickness = reader.readNumber();

      lines.push({
         colour: [r, g, b],
         targetPosition: [targetX, targetY],
         thickness: thickness
      });
   }

   const circles = new Array<CircleDebugData>();
   const numCircles = reader.readNumber();
   for (let i = 0; i < numCircles; i++) {
      const r = reader.readNumber();
      const g = reader.readNumber();
      const b = reader.readNumber();
      const radius = reader.readNumber();
      const thickness = reader.readNumber();

      circles.push({
         colour: [r, g, b],
         radius: radius,
         thickness: thickness
      });
   }

   const tileHighlights = new Array<TileHighlightData>();
   const numTileHighlights = reader.readNumber();
   for (let i = 0; i < numTileHighlights; i++) {
      const r = reader.readNumber();
      const g = reader.readNumber();
      const b = reader.readNumber();
      const x = reader.readNumber();
      const y = reader.readNumber();

      tileHighlights.push({
         colour: [r, g, b],
         tilePosition: [x, y]
      });
   }
   
   const entries = new Array<string>();
   const numDebugEntries = reader.readNumber();
   for (let i = 0; i < numDebugEntries; i++) {
      const entry = reader.readString();
      entries.push(entry);
   }

   let pathData: PathData | undefined;

   const hasPathData = reader.readBool();
   if (hasPathData) {
      const goalX = reader.readNumber();
      const goalY = reader.readNumber();
      
      const pathNodes = new Array<PathfindingNodeIndex>();
      const numPathNodes = reader.readNumber();
      for (let i = 0; i < numPathNodes; i++) {
         const nodeIndex = reader.readNumber();
         pathNodes.push(nodeIndex);
      }
   
      const rawPathNodes = new Array<PathfindingNodeIndex>();
      const numRawPathNodes = reader.readNumber();
      for (let i = 0; i < numRawPathNodes; i++) {
         const nodeIndex = reader.readNumber();
         rawPathNodes.push(nodeIndex);
      }
   
      const visitedNodes = new Array<PathfindingNodeIndex>();
      const numVisitedNodes = reader.readNumber();
      for (let i = 0; i < numVisitedNodes; i++) {
         const nodeIndex = reader.readNumber();
         visitedNodes.push(nodeIndex);
      }
   
      if (numPathNodes > 0 || numRawPathNodes > 0 || numVisitedNodes > 0) {
         pathData = {
            goalX: goalX,
            goalY: goalY,
            pathNodes: pathNodes,
            rawPathNodes: rawPathNodes,
            visitedNodes: visitedNodes
         };
      }
   }
   
   return {
      entityID: entityID,
      lines: lines,
      circles: circles,
      tileHighlights: tileHighlights,
      debugEntries: entries,
      pathData: pathData
   };
}

export function processDevGameDataPacket(reader: PacketReader): void {
   // Subtile supports
   const numSubtiles = reader.readNumber();
   if (numSubtiles > 0) {
      const subtileSupports = new Array<SubtileSupportInfo>();
      
      for (let i = 0; i < numSubtiles; i++) {
         const subtileIndex = reader.readNumber();
         const support = reader.readNumber();

         subtileSupports.push({
            subtileIndex: subtileIndex,
            support: support
         });
      }

      setVisibleSubtileSupports(subtileSupports);
   }

   // Pathfinding node occupances
   const numPathfindingNodes = reader.readNumber();
   if (numPathfindingNodes > 0) {
      const visiblePathfindingNodeOccupances = new Array<PathfindingNodeIndex>();
      
      for (let i = 0; i < numPathfindingNodes; i++) {
         const node = reader.readNumber();
         visiblePathfindingNodeOccupances.push(node);
      }

      setVisiblePathfindingNodeOccupances(visiblePathfindingNodeOccupances);
   }

   // AI building safety nodes
   const numVisibleSafetyNodes = reader.readNumber();
   if (numVisibleSafetyNodes > 0) {
      const visibleSafetyNodes = new Array<SafetyNodeData>();

      for (let i = 0; i < numVisibleSafetyNodes; i++) {
         const index = reader.readNumber();
         const safety = reader.readNumber();
         const isOccupied = reader.readBool();
         const isContained = reader.readBool();

         const safetyNodeData: SafetyNodeData = {
            index: index,
            safety: safety,
            isOccupied: isOccupied,
            isContained: isContained
         };
         visibleSafetyNodes.push(safetyNodeData);
      }

      setVisibleSafetyNodes(visibleSafetyNodes);
   }

   updateLightLevelsFromData(reader);
   
   resetBuildingSafeties();
   
   const numTribes = reader.readNumber();
   assert(Number.isInteger(numTribes));
   for (let i = 0; i < numTribes; i++) {
      const tribeID = reader.readNumber();

      // Tribe plans
      updateTribePlanData(reader, tribeID);

      // Virtual buildings
      readGhostVirtualBuildings(reader);

      // Building safeties
      readTribeBuildingSafeties(reader);
   }

   pruneGhostBuildingPlans();

   updateLocalBiomesFromData(reader);

   const hasSpawnDistribution = reader.readBool();
   if (hasSpawnDistribution) {
      const chunkWeights = new Array<SpawnDistributionBlock>();
      
      const numBlocks = reader.readNumber();
      for (let i = 0; i < numBlocks; i++) {
         const x = reader.readNumber();
         const y = reader.readNumber();
         const currentDensity = reader.readNumber();
         const targetDensity = reader.readNumber();
         chunkWeights.push({
            x: x,
            y: y,
            currentDensity: currentDensity,
            targetDensity: targetDensity
         });
      }

      setSpawnDistributionBlocks(chunkWeights);
   } else {
      setSpawnDistributionBlocks([]);
   }

   const hasDebugData = reader.readBool();
   if (hasDebugData) {
      const debugData = updateEntityDebugInfoFromPacket(reader);
      hoverDebugState.setEntityDebugData(debugData);
   } else {
      hoverDebugState.setEntityDebugData(null);
   }
}
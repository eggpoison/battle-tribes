import { GameDataPacketOptions } from "../../../shared/src/client-server-types";
import { Packet, ServerPacketType } from "../../../shared/src/packets";
import { Settings } from "../../../shared/src/settings";
import { AIPlanType, clamp, clampToBoardDimensions, getTileIndexIncludingEdges, TileIndex } from "../../../shared/src/utils";
import { getSubtileSupport, getVisibleSubtileSupports } from "../collapses";
import { addEntityDebugDataToPacket, createEntityDebugData, getEntityDebugDataLength } from "../entity-debug-data";
import {getSpawnInfoForEntityType, SpawnDistribution } from "../entity-spawn-info";
import { addPlayerLightLevelsData, getPlayerLightLevelsDataLength } from "../lights";
import { getVisiblePathfindingNodeOccupances } from "../pathfinding";
import { addTribeAssignmentData, addTribeBuildingSafetyData, getTribeAssignmentDataLength, getTribeBuildingSafetyDataLength, getVisibleSafetyNodesData } from "../tribesman-ai/building-plans/ai-building-client-data";
import { addVirtualBuildingData, getVirtualBuildingDataLength } from "../tribesman-ai/building-plans/TribeBuildingLayer";
import { AIPlanAssignment } from "../tribesman-ai/tribesman-ai-planning";
import { getTribes } from "../world";
import { LocalBiome } from "../world-generation/terrain-generation-utils";
import PlayerClient from "./PlayerClient";
import { SERVER } from "./server";

interface VisibleLocalBiomeInfo {
   readonly visibleLocalBiomes: ReadonlyArray<LocalBiome>;
   readonly tileToLocalBiomeMap: Map<TileIndex, LocalBiome>;
}

const createTileToLocalBiomeMap = (playerClient: PlayerClient, localBiome: LocalBiome): Map<TileIndex, LocalBiome> => {
   const tileToLocalBiomeMap = new Map<TileIndex, LocalBiome>();
   
   let minTileX = Math.floor(playerClient.minVisibleX / Settings.TILE_SIZE);
   if (localBiome.minTileX > minTileX) {
      minTileX = localBiome.minTileX;
   }
   let maxTileX = Math.floor(playerClient.maxVisibleX / Settings.TILE_SIZE);
   if (localBiome.maxTileX < maxTileX) {
      maxTileX = localBiome.maxTileX;
   }
   let minTileY = Math.floor(playerClient.minVisibleY / Settings.TILE_SIZE);
   if (localBiome.minTileY > minTileY) {
      minTileY = localBiome.minTileY;
   }
   let maxTileY = Math.floor(playerClient.maxVisibleY / Settings.TILE_SIZE);
   if (localBiome.maxTileY < maxTileY) {
      maxTileY = localBiome.maxTileY;
   }
   for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         const localBiome = playerClient.lastLayer.getTileLocalBiome(tileIndex);

         tileToLocalBiomeMap.set(tileIndex, localBiome);
      }
   }

   return tileToLocalBiomeMap;
}

const getVisibleLocalBiomeInfo = (playerClient: PlayerClient): VisibleLocalBiomeInfo => {
   const localBiomes = new Array<LocalBiome>();
   const tileToLocalBiomeMap = new Map<TileIndex, LocalBiome>();
   
   const minTileX = clampToBoardDimensions(Math.floor(playerClient.minVisibleX / Settings.TILE_SIZE));
   const maxTileX = clampToBoardDimensions(Math.floor(playerClient.maxVisibleX / Settings.TILE_SIZE));
   const minTileY = clampToBoardDimensions(Math.floor(playerClient.minVisibleY / Settings.TILE_SIZE));
   const maxTileY = clampToBoardDimensions(Math.floor(playerClient.maxVisibleY / Settings.TILE_SIZE));
   for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         const localBiome = playerClient.lastLayer.getTileLocalBiome(tileIndex);

         if (localBiomes.indexOf(localBiome) === -1) {
            localBiomes.push(localBiome);
         }
      }
   }

   return {
      visibleLocalBiomes: localBiomes,
      tileToLocalBiomeMap: tileToLocalBiomeMap
   };
}

const getLocalBiomeDataLength = (playerClient: PlayerClient, localBiome: LocalBiome): number => {
   const tileToLocalBiomeMap = createTileToLocalBiomeMap(playerClient, localBiome);
   
   let lengthBytes = Float32Array.BYTES_PER_ELEMENT;
   
   let numTiles = 0;
   for (const pair of tileToLocalBiomeMap) {
      if (pair[1] === localBiome) {
         numTiles++;
      }
   }
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + Float32Array.BYTES_PER_ELEMENT * numTiles;

   lengthBytes += Float32Array.BYTES_PER_ELEMENT + 4 * Float32Array.BYTES_PER_ELEMENT * localBiome.entityCensus.size;
   return lengthBytes;
}

const addLocalBiomeDataToPacket = (packet: Packet, playerClient: PlayerClient, localBiome: LocalBiome): void => {
   const tileToLocalBiomeMap = createTileToLocalBiomeMap(playerClient, localBiome);

   packet.writeNumber(localBiome.id);

   let numTiles = 0;
   for (const pair of tileToLocalBiomeMap) {
      if (pair[1] === localBiome) {
         numTiles++;
      }
   }
   packet.writeNumber(numTiles);
   for (const pair of tileToLocalBiomeMap) {
      if (pair[1] === localBiome) {
         packet.writeNumber(pair[0]);
      }
   }

   packet.writeNumber(localBiome.entityCensus.size);
   for (const pair of localBiome.entityCensus) {
      const entityType = pair[0];
      const count = pair[1];

      packet.writeNumber(entityType);
      packet.writeNumber(count);

      const spawnInfo = getSpawnInfoForEntityType(entityType);
      if (spawnInfo !== null) {
         let numEligibleTiles = 0;
         for (const tileType of spawnInfo.tileTypes) {
            numEligibleTiles += localBiome.tileCensus[tileType] || 0;
         }
   
         const density = count / numEligibleTiles;
         packet.writeNumber(density);
   
         // @Temporary @Incomplete!
         // packet.writeNumber(spawnInfo.maxDensity);
         packet.writeNumber(0);
      } else {
         packet.writeNumber(0);
         packet.writeNumber(0);
      }
   }
}

const getVirtualBuildingGhostEntitiesLength = (assignment: AIPlanAssignment): number => {
   let lengthBytes = 0;
   if (assignment.plan.type === AIPlanType.placeBuilding) {
      lengthBytes += Float32Array.BYTES_PER_ELEMENT;
      
      lengthBytes += getVirtualBuildingDataLength(assignment.plan.virtualBuilding);

      lengthBytes += Float32Array.BYTES_PER_ELEMENT;
      for (const potentialPlan of assignment.plan.potentialPlans) {
         lengthBytes += getVirtualBuildingDataLength(potentialPlan.virtualBuilding);
         lengthBytes += Float32Array.BYTES_PER_ELEMENT;
      }
   }

   for (const childAssignment of assignment.children) {
      lengthBytes += getVirtualBuildingGhostEntitiesLength(childAssignment);
   }

   return lengthBytes;
}

const addVirtualBuildingGhostEntities = (packet: Packet, assignment: AIPlanAssignment): void => {
   if (assignment.plan.type === AIPlanType.placeBuilding) {
      packet.writeBool(true);
      
      const plan = assignment.plan;
      addVirtualBuildingData(packet, plan.virtualBuilding);

      // Add any potential plans
      packet.writeNumber(plan.potentialPlans.length);
      for (const potentialPlan of plan.potentialPlans) {
         addVirtualBuildingData(packet, potentialPlan.virtualBuilding);
         packet.writeNumber(potentialPlan.safety);
      }
   }

   for (const childAssignment of assignment.children) {
      addVirtualBuildingGhostEntities(packet, childAssignment);
   }
}

const getViewedSpawnDistributionDataLength = (playerClient: PlayerClient, distribution: SpawnDistribution): number => {
   // @Copynpaste
   const BLOCKS_IN_BOARD_DIMENSIONS = Settings.WORLD_SIZE_TILES / distribution.blockSize;
   
   const minBlockX = clamp(Math.floor(playerClient.minVisibleX / Settings.TILE_SIZE / distribution.blockSize), 0, BLOCKS_IN_BOARD_DIMENSIONS - 1);
   const maxBlockX = clamp(Math.floor(playerClient.maxVisibleX / Settings.TILE_SIZE / distribution.blockSize), 0, BLOCKS_IN_BOARD_DIMENSIONS - 1);
   const minBlockY = clamp(Math.floor(playerClient.minVisibleY / Settings.TILE_SIZE / distribution.blockSize), 0, BLOCKS_IN_BOARD_DIMENSIONS - 1);
   const maxBlockY = clamp(Math.floor(playerClient.maxVisibleY / Settings.TILE_SIZE / distribution.blockSize), 0, BLOCKS_IN_BOARD_DIMENSIONS - 1);

   const numVisibleBlocks = (maxBlockX + 1 - minBlockX) * (maxBlockY + 1 - minBlockY);
   return Float32Array.BYTES_PER_ELEMENT + 4 * Float32Array.BYTES_PER_ELEMENT * numVisibleBlocks;
}

const addViewedSpawnDistributionData = (packet: Packet, playerClient: PlayerClient, distribution: SpawnDistribution): void => {
   // @Copynpaste
   const BLOCKS_IN_BOARD_DIMENSIONS = Settings.WORLD_SIZE_TILES / distribution.blockSize;
   
   const minBlockX = clamp(Math.floor(playerClient.minVisibleX / Settings.TILE_SIZE / distribution.blockSize), 0, BLOCKS_IN_BOARD_DIMENSIONS - 1);
   const maxBlockX = clamp(Math.floor(playerClient.maxVisibleX / Settings.TILE_SIZE / distribution.blockSize), 0, BLOCKS_IN_BOARD_DIMENSIONS - 1);
   const minBlockY = clamp(Math.floor(playerClient.minVisibleY / Settings.TILE_SIZE / distribution.blockSize), 0, BLOCKS_IN_BOARD_DIMENSIONS - 1);
   const maxBlockY = clamp(Math.floor(playerClient.maxVisibleY / Settings.TILE_SIZE / distribution.blockSize), 0, BLOCKS_IN_BOARD_DIMENSIONS - 1);
   
   packet.writeNumber((maxBlockX + 1 - minBlockX) * (maxBlockY + 1 - minBlockY));
   for (let blockY = minBlockY; blockY <= maxBlockY; blockY++) {
      for (let blockX = minBlockX; blockX <= maxBlockX; blockX++) {
         const blockIdx = blockY * BLOCKS_IN_BOARD_DIMENSIONS + blockX;

         const x = (blockX + 0.5) * distribution.blockSize * Settings.TILE_SIZE;
         const y = (blockY + 0.5) * distribution.blockSize * Settings.TILE_SIZE;

         packet.writeNumber(x);
         packet.writeNumber(y);
         packet.writeNumber(distribution.currentDensities[blockIdx]);
         packet.writeNumber(distribution.targetDensities[blockIdx]);
      }
   }
}

export function createDevGameDataPacket(playerClient: PlayerClient): Packet {
   const tribes = getTribes();
   const visibleLocalBiomeInfo = getVisibleLocalBiomeInfo(playerClient);

   const viewedSpawnDistributionSpawnInfo = getSpawnInfoForEntityType(playerClient.viewedSpawnDistribution);
   const distribution = viewedSpawnDistributionSpawnInfo?.spawnDistribution;
   
   const trackedEntity = SERVER.trackedEntityID;
   const debugData = typeof trackedEntity !== "undefined" ? createEntityDebugData(trackedEntity) : null;
   
   let lengthBytes = 0;
   
   // Subtile supports
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   if (playerClient.hasPacketOption(GameDataPacketOptions.sendSubtileSupports)) {
      // @Speed: called twice
      const visibleSubtileSupports = getVisibleSubtileSupports(playerClient);
      lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT * visibleSubtileSupports.length;
   }

   // Pathfinding node occupances
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   if (playerClient.hasPacketOption(GameDataPacketOptions.sendVisiblePathfindingNodeOccupances)) {
      // @Speed: called twice
      const visiblePathfindingNodeOccupances = getVisiblePathfindingNodeOccupances(playerClient);
      lengthBytes += Float32Array.BYTES_PER_ELEMENT * visiblePathfindingNodeOccupances.length;
   }

   // AI building safety nodes
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   if (playerClient.hasPacketOption(GameDataPacketOptions.sendVisibleSafetyNodes)) {
      // @Speed: called twice
      const visibleSafetyNodes = getVisibleSafetyNodesData(playerClient);
      lengthBytes += visibleSafetyNodes.length * 4 * Float32Array.BYTES_PER_ELEMENT;
   }

   // Light levels
   if (playerClient.hasPacketOption(GameDataPacketOptions.sendLightLevels)) {
      lengthBytes += getPlayerLightLevelsDataLength(playerClient);
   } else {
      lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   }

   // Tribe assignments and virtual buildings
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   if (playerClient.isDev) {
      lengthBytes += Float32Array.BYTES_PER_ELEMENT;
      for (const tribe of tribes) {
         lengthBytes += Float32Array.BYTES_PER_ELEMENT;

         // Tribe assignments
         lengthBytes += getTribeAssignmentDataLength(tribe);

         // Virtual buildings
         lengthBytes += getVirtualBuildingGhostEntitiesLength(tribe.rootAssignment);
         lengthBytes += Float32Array.BYTES_PER_ELEMENT;

         // Building safeties
         lengthBytes += getTribeBuildingSafetyDataLength(playerClient);
      }
   }

   // Local biomes
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   for (const localBiome of visibleLocalBiomeInfo.visibleLocalBiomes) {
      lengthBytes += getLocalBiomeDataLength(playerClient, localBiome);
   }
   
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   if (typeof distribution !== "undefined") {
      lengthBytes += getViewedSpawnDistributionDataLength(playerClient, distribution);
   }
   
   // Debug data
   lengthBytes += Float32Array.BYTES_PER_ELEMENT; // Has debug data boolean
   lengthBytes += debugData !== null ? getEntityDebugDataLength(debugData) : 0;

   const packet = new Packet(ServerPacketType.devGameData, lengthBytes);
   
   // Subtile supports
   if (playerClient.hasPacketOption(GameDataPacketOptions.sendSubtileSupports)) {
      // @Speed: called twice
      const visibleSubtileSupports = getVisibleSubtileSupports(playerClient);

      packet.writeNumber(visibleSubtileSupports.length);
      for (const subtileIndex of visibleSubtileSupports) {
         const support = getSubtileSupport(playerClient.lastLayer, subtileIndex);
         
         packet.writeNumber(subtileIndex);
         packet.writeNumber(support);
      }
   } else {
      packet.writeNumber(0);
   }

   // Pathfinding node occupances
   if (playerClient.hasPacketOption(GameDataPacketOptions.sendVisiblePathfindingNodeOccupances)) {
      // @Speed: called twice
      const visiblePathfindingNodeOccupances = getVisiblePathfindingNodeOccupances(playerClient);
      
      packet.writeNumber(visiblePathfindingNodeOccupances.length);
      for (const node of visiblePathfindingNodeOccupances) {
         packet.writeNumber(node);
      }
   } else {
      packet.writeNumber(0);
   }

   // AI building safety nodes
   if (playerClient.hasPacketOption(GameDataPacketOptions.sendVisibleSafetyNodes)) {
      // @Speed: called twice
      const visibleSafetyNodes = getVisibleSafetyNodesData(playerClient);

      packet.writeNumber(visibleSafetyNodes.length);
      for (const safetyNodeData of visibleSafetyNodes) {
         packet.writeNumber(safetyNodeData.index);
         packet.writeNumber(safetyNodeData.safety);
         packet.writeBool(safetyNodeData.isOccupied);
         packet.writeBool(safetyNodeData.isContained);
      }
   } else {
      packet.writeNumber(0);
   }

   // Light levels
   if (playerClient.hasPacketOption(GameDataPacketOptions.sendLightLevels)) {
      addPlayerLightLevelsData(packet, playerClient)
   } else {
      packet.writeNumber(0);
   }
   
   packet.writeNumber(tribes.length);
   for (const tribe of tribes) {
      packet.writeNumber(tribe.id);

      // Tribe assignments
      addTribeAssignmentData(packet, tribe);

      // Virtual buildings
      addVirtualBuildingGhostEntities(packet, tribe.rootAssignment);
      packet.writeBool(false);

      // Building safetys
      addTribeBuildingSafetyData(packet, playerClient);
   }

   // Local biomes
   packet.writeNumber(visibleLocalBiomeInfo.visibleLocalBiomes.length);
   for (const localBiome of visibleLocalBiomeInfo.visibleLocalBiomes) {
      addLocalBiomeDataToPacket(packet, playerClient, localBiome);
   }

   packet.writeBool(typeof distribution !== "undefined");
   if (typeof distribution !== "undefined") {
      addViewedSpawnDistributionData(packet, playerClient, distribution);
   }

   // @Bug: Shared for all players
   if (debugData !== null) {
      packet.writeBool(true);
      addEntityDebugDataToPacket(packet, trackedEntity, debugData);
   } else {
      packet.writeBool(false);
   }

   return packet;
}
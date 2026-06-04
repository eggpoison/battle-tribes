import { GameDataPacketOptions } from "../../../shared/dist/client-server-types.js";
import { Packet, ServerPacketType } from "../../../shared/dist/packets.js";
import { Settings } from "../../../shared/dist/settings.js";
import { TileIndex, getTileIndexIncludingEdges, clampToBoardDimensions, AIPlanType, clamp } from "../../../shared/dist/utils.js";
import { Bytes } from "../../../shared/dist/constants.js";
import { getSubtileSupport, getVisibleSubtileSupports } from "../collapses.js";
import { addEntityDebugDataToPacket, createEntityDebugData, getEntityDebugDataLength } from "../entity-debug-data.js";
import {getSpawnInfoForEntityType, SpawnDistribution } from "../entity-spawn-info.js";
import { addPlayerLightLevelsData, getPlayerLightLevelsDataLength } from "../lights.js";
import { getVisiblePathfindingNodeOccupances } from "../pathfinding.js";
import { addTribeAssignmentData, addTribeBuildingSafetyData, getTribeAssignmentDataLength, getTribeBuildingSafetyDataLength, getVisibleSafetyNodesData } from "../tribesman-ai/building-plans/ai-building-client-data.js";
import { addVirtualBuildingData, getVirtualBuildingDataLength } from "../tribesman-ai/building-plans/TribeBuildingLayer.js";
import { AIPlanAssignment } from "../tribesman-ai/tribesman-ai-planning.js";
import { getTribes } from "../world.js";
import { LocalBiome } from "../world-generation/terrain-generation-utils.js";
import PlayerClient from "./PlayerClient.js";
import { SERVER } from "./server.js";

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
   const localBiomes: Array<LocalBiome> = [];
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
   
   let lengthBytes = Bytes.Float32;
   
   let numTiles = 0;
   for (const pair of tileToLocalBiomeMap) {
      if (pair[1] === localBiome) {
         numTiles++;
      }
   }
   lengthBytes += Bytes.Float32 + Bytes.Float32 * numTiles;

   lengthBytes += Bytes.Float32 + 4 * Bytes.Float32 * localBiome.entityCensus.size;
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
      lengthBytes += Bytes.Float32;
      
      lengthBytes += getVirtualBuildingDataLength(assignment.plan.virtualBuilding);

      lengthBytes += Bytes.Float32;
      for (const potentialPlan of assignment.plan.potentialPlans) {
         lengthBytes += getVirtualBuildingDataLength(potentialPlan.virtualBuilding);
         lengthBytes += Bytes.Float32;
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
   return Bytes.Float32 + 4 * Bytes.Float32 * numVisibleBlocks;
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
   const debugData = trackedEntity !== undefined ? createEntityDebugData(trackedEntity) : null;
   
   let lengthBytes = 0;
   
   // Subtile supports
   lengthBytes += Bytes.Float32;
   if (playerClient.hasPacketOption(GameDataPacketOptions.sendSubtileSupports)) {
      // @Speed: called twice
      const visibleSubtileSupports = getVisibleSubtileSupports(playerClient);
      lengthBytes += 2 * Bytes.Float32 * visibleSubtileSupports.length;
   }

   // Pathfinding node occupances
   lengthBytes += Bytes.Float32;
   if (playerClient.hasPacketOption(GameDataPacketOptions.sendVisiblePathfindingNodeOccupances)) {
      // @Speed: called twice
      const visiblePathfindingNodeOccupances = getVisiblePathfindingNodeOccupances(playerClient);
      lengthBytes += Bytes.Float32 * visiblePathfindingNodeOccupances.length;
   }

   // AI building safety nodes
   lengthBytes += Bytes.Float32;
   if (playerClient.hasPacketOption(GameDataPacketOptions.sendVisibleSafetyNodes)) {
      // @Speed: called twice
      const visibleSafetyNodes = getVisibleSafetyNodesData(playerClient);
      lengthBytes += visibleSafetyNodes.length * 4 * Bytes.Float32;
   }

   // Light levels
   if (playerClient.hasPacketOption(GameDataPacketOptions.sendLightLevels)) {
      lengthBytes += getPlayerLightLevelsDataLength(playerClient);
   } else {
      lengthBytes += Bytes.Float32;
   }

   // Tribe assignments and virtual buildings
   lengthBytes += Bytes.Float32;
   if (playerClient.isDev) {
      lengthBytes += Bytes.Float32;
      for (const tribe of tribes) {
         lengthBytes += Bytes.Float32;

         // Tribe assignments
         lengthBytes += getTribeAssignmentDataLength(tribe);

         // Virtual buildings
         lengthBytes += getVirtualBuildingGhostEntitiesLength(tribe.rootAssignment);
         lengthBytes += Bytes.Float32;

         // Building safeties
         lengthBytes += getTribeBuildingSafetyDataLength(playerClient);
      }
   }

   // Local biomes
   lengthBytes += Bytes.Float32;
   for (const localBiome of visibleLocalBiomeInfo.visibleLocalBiomes) {
      lengthBytes += getLocalBiomeDataLength(playerClient, localBiome);
   }
   
   lengthBytes += Bytes.Float32;
   if (distribution !== undefined) {
      lengthBytes += getViewedSpawnDistributionDataLength(playerClient, distribution);
   }
   
   // Debug data
   lengthBytes += Bytes.Float32; // Has debug data boolean
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

   packet.writeBool(distribution !== undefined);
   if (distribution !== undefined) {
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
import { EntityData, VisibleChunkBounds, GameDataPacket, GameDataPacketOptions, PlayerInventoryData, InitialGameDataPacket, ServerTileData, GameDataSyncPacket } from "webgl-test-shared/dist/client-server-types";
import { ComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import Board from "../Board";
import Tribe from "../Tribe";
import { ComponentArrays } from "../components/ComponentArray";
import { HealthComponentArray } from "../components/HealthComponent";
import { InventoryComponentArray, getInventory } from "../components/InventoryComponent";
import { InventoryUseComponentArray } from "../components/InventoryUseComponent";
import { PhysicsComponentArray } from "../components/PhysicsComponent";
import { SERVER } from "./server";
import { Settings } from "webgl-test-shared/dist/settings";
import { getVisibleSafetyNodesData, getVisibleBuildingPlans, getVisibleBuildingSafetys, getVisibleRestrictedBuildingAreas, getVisibleWallsData, getVisibleWallConnections, getVisibleTribes } from "../ai-tribe-building/ai-building-client-data";
import { getVisiblePathfindingNodeOccupances } from "../pathfinding";
import { EnemyTribeData, PlayerTribeData } from "webgl-test-shared/dist/techs";
import { GrassBlocker } from "webgl-test-shared/dist/grass-blockers";
import { getEntityDebugData } from "../entity-debug-data";
import PlayerClient from "./PlayerClient";
import { TribeComponentArray } from "../components/TribeComponent";
import { SpikesComponentArray } from "../components/SpikesComponent";
import { PlayerComponentArray } from "../components/PlayerComponent";
import { Inventory, InventoryName } from "webgl-test-shared/dist/items/items";
import { TransformComponentArray } from "../components/TransformComponent";
import { ComponentConfig } from "../components";

const serialiseEntityData = (entity: EntityID, player: EntityID | null): EntityData => {
   const components = new Array<ComponentData>();
   for (let i = 0; i < ComponentArrays.length; i++) {
      const componentArray = ComponentArrays[i];

      if (componentArray.hasComponent(entity)) {
         const componentData = componentArray.serialise(entity, player);
         components.push(componentData);
      }
   }

   return {
      id: entity,
      type: Board.getEntityType(entity)!,
      components: components
   };
}

const bundleEntityDataArray = (player: EntityID | null, playerTribe: Tribe, visibleChunkBounds: VisibleChunkBounds): Array<EntityData> => {
   const visibleEntities = getPlayerVisibleEntities(visibleChunkBounds, playerTribe);

   const entityDataArray = new Array<EntityData>();
   for (const entity of visibleEntities) {
      const entityData = serialiseEntityData(entity, player);
      entityDataArray.push(entityData);
   }

   return entityDataArray;
}

const entityIsHiddenFromPlayer = (entity: EntityID, playerTribe: Tribe): boolean => {
   if (SpikesComponentArray.hasComponent(entity) && TribeComponentArray.hasComponent(entity)) {
      const tribeComponent = TribeComponentArray.getComponent(entity);
      const spikesComponent = SpikesComponentArray.getComponent(entity);
      
      if (spikesComponent.isCovered && tribeComponent.tribe !== playerTribe) {
         return true;
      }
   }

   return false;
}

const getPlayerVisibleEntities = (chunkBounds: VisibleChunkBounds, playerTribe: Tribe): ReadonlyArray<EntityID> => {
   const entities = new Array<EntityID>();
   const seenIDs = new Set<number>();
   
   for (let chunkX = chunkBounds[0]; chunkX <= chunkBounds[1]; chunkX++) {
      for (let chunkY = chunkBounds[2]; chunkY <= chunkBounds[3]; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            if (entityIsHiddenFromPlayer(entity, playerTribe)) {
               continue;
            }

            if (!seenIDs.has(entity)) {
               entities.push(entity);
               seenIDs.add(entity);
            }
         }
      }
   }

   return entities;
}

const createNewPlayerInventories = (): PlayerInventoryData => {
   return {
      hotbar: new Inventory(Settings.INITIAL_PLAYER_HOTBAR_SIZE, 1, InventoryName.hotbar),
      backpackInventory: new Inventory(0, 0, InventoryName.backpack),
      backpackSlot: new Inventory(1, 1, InventoryName.backpackSlot),
      heldItemSlot: new Inventory(1, 1, InventoryName.heldItemSlot),
      craftingOutputItemSlot: new Inventory(1, 1, InventoryName.craftingOutputSlot),
      armourSlot: new Inventory(1, 1, InventoryName.armourSlot),
      offhand: new Inventory(1, 1, InventoryName.offhand),
      gloveSlot: new Inventory(1, 1, InventoryName.gloveSlot)
   }
}

const bundlePlayerInventoryData = (player: EntityID | null): PlayerInventoryData => {
   if (player === null) {
      return createNewPlayerInventories();
   }

   const inventoryComponent = InventoryComponentArray.getComponent(player);

   return {
      hotbar: getInventory(inventoryComponent, InventoryName.hotbar),
      backpackInventory: getInventory(inventoryComponent, InventoryName.backpack),
      backpackSlot: getInventory(inventoryComponent, InventoryName.backpackSlot),
      heldItemSlot: getInventory(inventoryComponent, InventoryName.heldItemSlot),
      craftingOutputItemSlot: getInventory(inventoryComponent, InventoryName.craftingOutputSlot),
      armourSlot: getInventory(inventoryComponent, InventoryName.armourSlot),
      offhand: getInventory(inventoryComponent, InventoryName.offhand),
      gloveSlot: getInventory(inventoryComponent, InventoryName.gloveSlot)
   };
}

const bundlePlayerTribeData = (playerClient: PlayerClient): PlayerTribeData => {
   return {
      name: playerClient.tribe.name,
      id: playerClient.tribe.id,
      tribeType: playerClient.tribe.tribeType,
      hasTotem: playerClient.tribe.totem !== null,
      numHuts: playerClient.tribe.getNumHuts(),
      tribesmanCap: playerClient.tribe.tribesmanCap,
      area: playerClient.tribe.getArea().map(tile => [tile.x, tile.y]),
      selectedTechID: playerClient.tribe.selectedTechID,
      unlockedTechs: playerClient.tribe.unlockedTechs,
      techTreeUnlockProgress: playerClient.tribe.techTreeUnlockProgress
   };
}

const bundleEnemyTribesData = (playerClient: PlayerClient): ReadonlyArray<EnemyTribeData> => {
   const enemyTribesData = new Array<EnemyTribeData>();
   for (const tribe of Board.tribes) {
      if (tribe.id === playerClient.tribe.id) {
         continue;
      }
      
      enemyTribesData.push({
         name: tribe.name,
         id: tribe.id,
         tribeType: tribe.tribeType
      });
   }
   return enemyTribesData;
}

const bundleHotbarCrossbowLoadProgressRecord = (player: EntityID | null): Partial<Record<number, number>> => {
   if (player === null) {
      return {};
   }
   
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player);
   const useInfo = inventoryUseComponent.getUseInfo(InventoryName.hotbar);

   return useInfo.crossbowLoadProgressRecord;
}

const getVisibleGrassBlockers = (visibleChunkBounds: VisibleChunkBounds): ReadonlyArray<GrassBlocker> => {
   const visibleGrassBlockers = new Array<GrassBlocker>();
   const seenBlockers = new Set<GrassBlocker>();
   
   for (let chunkX = visibleChunkBounds[0]; chunkX <= visibleChunkBounds[1]; chunkX++) {
      for (let chunkY = visibleChunkBounds[2]; chunkY <= visibleChunkBounds[3]; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const grassBlocker of chunk.grassBlockers) {
            if (seenBlockers.has(grassBlocker)) {
               continue;
            }
            
            seenBlockers.add(grassBlocker);
            visibleGrassBlockers.push(grassBlocker);
         }
      }
   }

   return visibleGrassBlockers;
}

export function createGameDataPacket(playerClient: PlayerClient): GameDataPacket {
   const player = Board.validateEntity(playerClient.instance);
   
   // @Cleanup: Shared for all players
   const trackedEntity = SERVER.trackedEntityID;
   const entityDebugData = typeof trackedEntity !== "undefined" ? getEntityDebugData(trackedEntity) : undefined;
   
   const tileUpdates = Board.popTileUpdates();
               
   // @Speed @Memory
   const extendedVisibleChunkBounds: VisibleChunkBounds = [
      Math.max(playerClient.visibleChunkBounds[0] - 1, 0),
      Math.min(playerClient.visibleChunkBounds[1] + 1, Settings.BOARD_SIZE - 1),
      Math.max(playerClient.visibleChunkBounds[2] - 1, 0),
      Math.min(playerClient.visibleChunkBounds[3] + 1, Settings.BOARD_SIZE - 1)
   ];
   const visibleTribes = getVisibleTribes(extendedVisibleChunkBounds);
   
   const gameDataPacket: GameDataPacket = {
      simulationIsPaused: !SERVER.isSimulating,
      entityDataArray: bundleEntityDataArray(player, playerClient.tribe, extendedVisibleChunkBounds),
      inventory: bundlePlayerInventoryData(player),
      visibleHits: playerClient.visibleHits,
      playerKnockbacks: playerClient.playerKnockbacks,
      heals: playerClient.heals,
      visibleEntityDeathIDs: playerClient.visibleEntityDeathIDs,
      orbCompletes: playerClient.orbCompletes,
      tileUpdates: tileUpdates,
      serverTicks: Board.ticks,
      serverTime: Board.time,
      playerHealth: player !== null ? HealthComponentArray.getComponent(player).health : 0,
      entityDebugData: entityDebugData,
      playerTribeData: bundlePlayerTribeData(playerClient),
      enemyTribesData: bundleEnemyTribesData(playerClient),
      // @Incomplete
      // hasFrostShield: player.immunityTimer === 0 && playerArmour !== null && playerArmour.type === ItemType.deepfrost_armour,
      hasFrostShield: false,
      pickedUpItem: playerClient.pickedUpItem,
      hotbarCrossbowLoadProgressRecord: bundleHotbarCrossbowLoadProgressRecord(player),
      titleOffer: player !== null ? PlayerComponentArray.getComponent(player).titleOffer : null,
      tickEvents: playerClient.entityTickEvents,
      // @Cleanup: Copy and paste
      visiblePathfindingNodeOccupances: (playerClient.gameDataOptions & GameDataPacketOptions.sendVisiblePathfindingNodeOccupances) ? getVisiblePathfindingNodeOccupances(extendedVisibleChunkBounds) : [],
      visibleSafetyNodes: (playerClient.gameDataOptions & GameDataPacketOptions.sendVisibleSafetyNodes) ? getVisibleSafetyNodesData(visibleTribes, extendedVisibleChunkBounds) : [],
      visibleBuildingPlans: (playerClient.gameDataOptions & GameDataPacketOptions.sendVisibleBuildingPlans) ? getVisibleBuildingPlans(visibleTribes, extendedVisibleChunkBounds) : [],
      visibleBuildingSafetys: (playerClient.gameDataOptions & GameDataPacketOptions.sendVisibleBuildingSafetys) ? getVisibleBuildingSafetys(visibleTribes, extendedVisibleChunkBounds) : [],
      visibleRestrictedBuildingAreas: (playerClient.gameDataOptions & GameDataPacketOptions.sendVisibleRestrictedBuildingAreas) ? getVisibleRestrictedBuildingAreas(visibleTribes, extendedVisibleChunkBounds) : [],
      visibleWalls: getVisibleWallsData(visibleTribes, extendedVisibleChunkBounds),
      visibleWallConnections: (playerClient.gameDataOptions & GameDataPacketOptions.sendVisibleWallConnections) ? getVisibleWallConnections(visibleTribes, extendedVisibleChunkBounds) : [],
      visibleGrassBlockers: getVisibleGrassBlockers(playerClient.visibleChunkBounds)
   };

   return gameDataPacket;
}

export function createInitialGameDataPacket(player: EntityID, playerConfig: ComponentConfig<ServerComponentType.transform>): InitialGameDataPacket {
   const serverTileData = new Array<ServerTileData>();
   for (let tileIndex = 0; tileIndex < Settings.BOARD_DIMENSIONS * Settings.BOARD_DIMENSIONS; tileIndex++) {
      const tile = Board.tiles[tileIndex];
      serverTileData.push({
         x: tile.x,
         y: tile.y,
         type: tile.type,
         biome: tile.biome,
         isWall: tile.isWall
      });
   }

   const edgeTileData = new Array<ServerTileData>();
   for (let i = 0; i < Board.edgeTiles.length; i++) {
      const tile = Board.edgeTiles[i];
      edgeTileData.push({
         x: tile.x,
         y: tile.y,
         type: tile.type,
         biome: tile.biome,
         isWall: tile.isWall
      });
   }

   const initialGameDataPacket: InitialGameDataPacket = {
      playerID: player,
      spawnPosition: playerConfig[ServerComponentType.transform].position.package(),
      tiles: serverTileData,
      waterRocks: Board.waterRocks,
      riverSteppingStones: Board.riverSteppingStones,
      riverFlowDirections: Board.getRiverFlowDirections(),
      edgeTiles: edgeTileData,
      edgeRiverFlowDirections: Board.edgeRiverFlowDirections,
      edgeRiverSteppingStones: Board.edgeRiverSteppingStones,
      grassInfo: Board.grassInfo,
      decorations: Board.decorations,
   };
   return initialGameDataPacket;
}

export function createGameDataSyncPacket(playerClient: PlayerClient): GameDataSyncPacket {
   const player = playerClient.instance;
   
   // If the player is dead, send a default packet
   if (Board.hasEntity(player)) {
      return {
         position: [0, 0],
         velocity: [0, 0],
         acceleration: [0, 0],
         rotation: 0,
         health: 0,
         inventory: bundlePlayerInventoryData(null)
      };
   }

   const transformComponent = TransformComponentArray.getComponent(player);
   const physicsComponent = PhysicsComponentArray.getComponent(player);

   return {
      position: transformComponent.position.package(),
      velocity: physicsComponent.velocity.package(),
      acceleration: physicsComponent.acceleration.package(),
      rotation: transformComponent.rotation,
      health: HealthComponentArray.getComponent(player).health,
      inventory: bundlePlayerInventoryData(player)
   };
}
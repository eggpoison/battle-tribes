import { VisibleChunkBounds, PlayerInventoryData } from "webgl-test-shared/dist/client-server-types";
import { ServerComponentType, ServerComponentTypeString } from "webgl-test-shared/dist/components";
import { EntityID } from "webgl-test-shared/dist/entities";
import { TechUnlockProgress } from "webgl-test-shared/dist/techs";
import Board from "../Board";
import { ComponentArrays } from "../components/ComponentArray";
import { HealthComponentArray } from "../components/HealthComponent";
import { InventoryComponentArray, getInventory } from "../components/InventoryComponent";
import { addCrossbowLoadProgressRecordToPacket, getCrossbowLoadProgressRecordLength, InventoryUseComponentArray } from "../components/InventoryUseComponent";
import { PhysicsComponentArray } from "../components/PhysicsComponent";
import { SERVER } from "./server";
import { Settings } from "webgl-test-shared/dist/settings";
import { GrassBlocker } from "webgl-test-shared/dist/grass-blockers";
import { addEntityDebugDataToPacket, createEntityDebugData, getEntityDebugDataLength } from "../entity-debug-data";
import PlayerClient from "./PlayerClient";
import { PlayerComponentArray } from "../components/PlayerComponent";
import { Inventory, InventoryName, ItemType } from "webgl-test-shared/dist/items/items";
import { TransformComponentArray } from "../components/TransformComponent";
import { ComponentConfig } from "../components";
import { alignLengthBytes, Packet, PacketType } from "webgl-test-shared/dist/packets";

export function getInventoryDataLength(inventory: Inventory): number {
   let lengthBytes = 4 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 4 * Float32Array.BYTES_PER_ELEMENT * inventory.items.length;
   return lengthBytes;
}

export function addInventoryDataToPacket(packet: Packet, inventory: Inventory): void {
   packet.addNumber(inventory.name);
   packet.addNumber(inventory.width);
   packet.addNumber(inventory.height);

   packet.addNumber(inventory.items.length);
   for (let j = 0; j < inventory.items.length; j++) {
      const item = inventory.items[j];
      const itemSlot = inventory.getItemSlot(item);
      
      packet.addNumber(itemSlot);
      packet.addNumber(item.id);
      packet.addNumber(item.type);
      packet.addNumber(item.count);
   }
}

const getEntityDataLength = (entity: EntityID, player: EntityID | null): number => {
   let lengthBytes = 3 * Float32Array.BYTES_PER_ELEMENT;

   for (let i = 0; i < ComponentArrays.length; i++) {
      const componentArray = ComponentArrays[i];

      if (componentArray.hasComponent(entity)) {
         lengthBytes += componentArray.getDataLength(entity, player);
      }
   }

   return lengthBytes;
}

const addEntityDataToPacket = (packet: Packet, entity: EntityID, player: EntityID | null): void => {
   // Entity ID
   packet.addNumber(entity);

   // Entity type
   packet.addNumber(Board.getEntityType(entity)!);

   // @Speed
   let numComponents = 0;
   for (let i = 0; i < ComponentArrays.length; i++) {
      const componentArray = ComponentArrays[i];
      if (componentArray.hasComponent(entity)) {
         numComponents++;
      }
   }

   // Components
   packet.addNumber(numComponents);
   for (let i = 0; i < ComponentArrays.length; i++) {
      const componentArray = ComponentArrays[i];

      // @Speed
      if (componentArray.hasComponent(entity)) {
         const start = packet.currentByteOffset;
         
         packet.addNumber(componentArray.componentType);
         componentArray.addDataToPacket(packet, entity, player);

         // @Speed
         if (packet.currentByteOffset - start !== componentArray.getDataLength(entity, player)) {
            throw new Error(`Component type '${ServerComponentTypeString[componentArray.componentType]}' has wrong data length.`)
         }
      }
   }
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

export function createGameDataPacket(playerClient: PlayerClient, entitiesToSend: Set<EntityID>): ArrayBuffer {
   const player = Board.validateEntity(playerClient.instance);

   const inventoryComponent = InventoryComponentArray.getComponent(player);
   // @Copynpaste @Robustness
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);
   const backpackInventory = getInventory(inventoryComponent, InventoryName.backpack);
   const backpackSlotInventory = getInventory(inventoryComponent, InventoryName.backpackSlot);
   const heldItemSlotInventory = getInventory(inventoryComponent, InventoryName.heldItemSlot);
   const craftingOutputSlotInventory = getInventory(inventoryComponent, InventoryName.craftingOutputSlot);
   const armourSlotInventory = getInventory(inventoryComponent, InventoryName.armourSlot);
   const offhandInventory = getInventory(inventoryComponent, InventoryName.offhand);
   const gloveSlotInventory = getInventory(inventoryComponent, InventoryName.gloveSlot);
   
   const tileUpdates = Board.popTileUpdates();

   const trackedEntity = SERVER.trackedEntityID;
   const debugData = typeof trackedEntity !== "undefined" ? createEntityDebugData(trackedEntity) : null;

   const area = playerClient.tribe.getArea();
   const unlockProgressEntries = Object.entries(playerClient.tribe.techTreeUnlockProgress).map(([a, b]) => [Number(a), b]) as Array<[number, TechUnlockProgress]>;

   const numEnemyTribes = Board.tribes.filter(tribe => tribe.id !== playerClient.tribe.id).length;

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerClient.instance);
   const hotbarUseInfo = inventoryUseComponent.getUseInfo(InventoryName.hotbar);

   const titleOffer = player !== null ? PlayerComponentArray.getComponent(player).titleOffer : null;
   
   // Packet type
   let lengthBytes = Float32Array.BYTES_PER_ELEMENT;
   // Is simulating
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   // Ticks, time
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;
   // Player tribe data
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + 100 + 5 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + 2 * Float32Array.BYTES_PER_ELEMENT * area.length;
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + Float32Array.BYTES_PER_ELEMENT * playerClient.tribe.unlockedTechs.length;
   // Tech tree unlock progress
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   for (const [, unlockProgress] of unlockProgressEntries) {
      lengthBytes += 3 * Float32Array.BYTES_PER_ELEMENT;
      
      const numItemRequirements = Object.keys(unlockProgress.itemProgress).length;
      lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT * numItemRequirements;
   }

   // Enemy tribes data
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + (Float32Array.BYTES_PER_ELEMENT + 100 + 2 * Float32Array.BYTES_PER_ELEMENT) * numEnemyTribes;

   // Entities
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   for (const entity of entitiesToSend) {
      lengthBytes += getEntityDataLength(entity, player);
   }

   // Removed entity IDs
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + Float32Array.BYTES_PER_ELEMENT * playerClient.visibleEntityDeathIDs.length;

   // Player inventories
   lengthBytes += getInventoryDataLength(hotbarInventory);
   lengthBytes += getInventoryDataLength(backpackInventory);
   lengthBytes += getInventoryDataLength(backpackSlotInventory);
   lengthBytes += getInventoryDataLength(heldItemSlotInventory);
   lengthBytes += getInventoryDataLength(craftingOutputSlotInventory);
   lengthBytes += getInventoryDataLength(armourSlotInventory);
   lengthBytes += getInventoryDataLength(offhandInventory);
   lengthBytes += getInventoryDataLength(gloveSlotInventory);

   // Visible hits
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + 7 * Float32Array.BYTES_PER_ELEMENT * playerClient.visibleHits.length;
   // Player knockback
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + 2 * Float32Array.BYTES_PER_ELEMENT * playerClient.playerKnockbacks.length;
   // Player heals
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + 5 * Float32Array.BYTES_PER_ELEMENT * playerClient.heals.length;
   // Visible entity deaths
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + Float32Array.BYTES_PER_ELEMENT * playerClient.visibleEntityDeathIDs.length;
   // Orb completes
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + 3 * Float32Array.BYTES_PER_ELEMENT * playerClient.orbCompletes.length;
   // Tile updates
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + 3 * Float32Array.BYTES_PER_ELEMENT * tileUpdates.length;
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;

   // Has debug data boolean
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   const debugDataLength = debugData !== null ? getEntityDebugDataLength(debugData) : 0;
   lengthBytes += debugDataLength;

   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += getCrossbowLoadProgressRecordLength(hotbarUseInfo);

   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   if (titleOffer !== null) {
      lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   }

   lengthBytes += Float32Array.BYTES_PER_ELEMENT + 3 * Float32Array.BYTES_PER_ELEMENT * playerClient.entityTickEvents.length;

   lengthBytes = alignLengthBytes(lengthBytes);

   const packet = new Packet(PacketType.gameData, lengthBytes);

   // Whether or not the simulation is paused
   packet.addBoolean(!SERVER.isSimulating);
   packet.padOffset(3);

   packet.addNumber(Board.ticks);
   packet.addNumber(Board.time);

   // 
   // Player tribe data
   // 
   // @Cleanup: move into a separate function

   packet.addString(playerClient.tribe.name, 100);
   packet.addNumber(playerClient.tribe.id);
   packet.addNumber(playerClient.tribe.tribeType);
   packet.addBoolean(playerClient.tribe.totem !== null);
   packet.padOffset(3);
   packet.addNumber(playerClient.tribe.getNumHuts());
   packet.addNumber(playerClient.tribe.tribesmanCap);

   packet.addNumber(area.length);
   for (const tileIndex of area) {
      const tileX = Board.getTileX(tileIndex);
      const tileY = Board.getTileY(tileIndex);
      packet.addNumber(tileX);
      packet.addNumber(tileY);
   }

   packet.addNumber(playerClient.tribe.selectedTechID !== null ? playerClient.tribe.selectedTechID : -1),

   packet.addNumber(playerClient.tribe.unlockedTechs.length);
   for (const techID of playerClient.tribe.unlockedTechs) {
      packet.addNumber(techID);
   }

   // Tech tree unlock progress
   packet.addNumber(unlockProgressEntries.length);
   for (const [techID, unlockProgress] of unlockProgressEntries) {
      packet.addNumber(techID);

      const itemRequirementEntries = Object.entries(unlockProgress.itemProgress).map(([a, b]) => [Number(a), b]) as Array<[ItemType, number]>;
      packet.addNumber(itemRequirementEntries.length);
      for (const [itemType, amount] of itemRequirementEntries) {
         packet.addNumber(itemType);
         packet.addNumber(amount);
      }
      
      packet.addNumber(unlockProgress.studyProgress);
   }

   // Enemy tribes data
   packet.addNumber(numEnemyTribes);
   for (const tribe of Board.tribes) {
      if (tribe.id === playerClient.tribe.id) {
         continue;
      }
      
      packet.addString(tribe.name, 100);
      packet.addNumber(tribe.id);
      packet.addNumber(tribe.tribeType);
   }

   // Add entities
   packet.addNumber(entitiesToSend.size);
   for (const entity of entitiesToSend) {
      addEntityDataToPacket(packet, entity, player);
   }

   // Removed entity IDs
   packet.addNumber(playerClient.visibleEntityDeathIDs.length);
   for (const entity of playerClient.visibleEntityDeathIDs) {
      packet.addNumber(entity);
   }

   // Add inventory data
   addInventoryDataToPacket(packet, hotbarInventory);
   addInventoryDataToPacket(packet, backpackInventory);
   addInventoryDataToPacket(packet, backpackSlotInventory);
   addInventoryDataToPacket(packet, heldItemSlotInventory);
   addInventoryDataToPacket(packet, craftingOutputSlotInventory);
   addInventoryDataToPacket(packet, armourSlotInventory);
   addInventoryDataToPacket(packet, offhandInventory);
   addInventoryDataToPacket(packet, gloveSlotInventory);
   
   // Add visible hits
   packet.addNumber(playerClient.visibleHits.length);
   for (let i = 0; i < playerClient.visibleHits.length; i++) {
      const hitData = playerClient.visibleHits[i];
      packet.addNumber(hitData.hitEntityID);
      packet.addNumber(hitData.hitPosition[0]);
      packet.addNumber(hitData.hitPosition[1]);
      packet.addNumber(hitData.attackEffectiveness);
      packet.addNumber(hitData.damage);
      packet.addBoolean(hitData.shouldShowDamageNumber);
      packet.padOffset(3);
      packet.addNumber(hitData.flags);
   }

   // Add player knockbacks
   packet.addNumber(playerClient.playerKnockbacks.length);
   for (let i = 0; i < playerClient.playerKnockbacks.length; i++) {
      const knockbackData = playerClient.playerKnockbacks[i];
      packet.addNumber(knockbackData.knockback);
      packet.addNumber(knockbackData.knockbackDirection);
   }

   // Add player heals
   packet.addNumber(playerClient.heals.length);
   for (let i = 0; i < playerClient.heals.length; i++) {
      const healData = playerClient.heals[i];
      packet.addNumber(healData.entityPositionX);
      packet.addNumber(healData.entityPositionY);
      packet.addNumber(healData.healedID);
      packet.addNumber(healData.healerID);
      packet.addNumber(healData.healAmount);
   }

   // Visible entity deaths
   packet.addNumber(playerClient.visibleEntityDeathIDs.length);
   for (let i = 0; i < playerClient.visibleEntityDeathIDs.length; i++) {
      const entity = playerClient.visibleEntityDeathIDs[i];
      packet.addNumber(entity);
   }

   // Orb completes
   packet.addNumber(playerClient.orbCompletes.length);
   for (let i = 0; i < playerClient.orbCompletes.length; i++) {
      const orbCompleteData = playerClient.orbCompletes[i];
      packet.addNumber(orbCompleteData.x);
      packet.addNumber(orbCompleteData.y);
      packet.addNumber(orbCompleteData.amount);
   }
   
   // Tile updates
   packet.addNumber(tileUpdates.length);
   for (let i = 0; i < tileUpdates.length; i++) {
      const tileUpdate = tileUpdates[i];
      packet.addNumber(tileUpdate.tileIndex);
      packet.addNumber(tileUpdate.type);
      packet.addBoolean(tileUpdate.isWall);
      packet.padOffset(3);
   }

   packet.addNumber(player !== null ? HealthComponentArray.getComponent(player).health : 0);

   // @Bug: Shared for all players
   if (debugData !== null) {
      packet.addBoolean(true);
      packet.padOffset(3);
      
      const start = packet.currentByteOffset;
      addEntityDebugDataToPacket(packet, trackedEntity, debugData);
      if (packet.currentByteOffset - start !== debugDataLength) {
         throw new Error(`Debug data had unexpected length. Expected: ${debugDataLength}. Got: ${packet.currentByteOffset - start}`);
      }
   } else {
      packet.addBoolean(false);
      packet.padOffset(3);
   }

   // @Incomplete
   // hasFrostShield: player.immunityTimer === 0 && playerArmour !== null && playerArmour.type === ItemType.deepfrost_armour,

   packet.addBoolean(false);
   packet.padOffset(3);

   packet.addBoolean(playerClient.hasPickedUpItem);
   packet.padOffset(3);

   addCrossbowLoadProgressRecordToPacket(packet, hotbarUseInfo);

   // Title offer
   packet.addBoolean(titleOffer !== null);
   packet.padOffset(3);
   if (titleOffer !== null) {
      packet.addNumber(titleOffer);
   }
   
   // Tick events
   packet.addNumber(playerClient.entityTickEvents.length);
   for (const tickEvent of playerClient.entityTickEvents) {
      packet.addNumber(tickEvent.entityID);
      packet.addNumber(tickEvent.type);
      packet.addNumber(tickEvent.data as number);
   }
   
   // const visibleTribes = getVisibleTribes(extendedVisibleChunkBounds);

   // const gameDataPacket: GameDataPacket = {
      // simulationIsPaused: !SERVER.isSimulating,
      // entityDataArray: bundleEntityDataArray(player, playerClient.tribe, extendedVisibleChunkBounds),
      // inventory: bundlePlayerInventoryData(player),
      // visibleHits: playerClient.visibleHits,
      // playerKnockbacks: playerClient.playerKnockbacks,
      // heals: playerClient.heals,
      // visibleEntityDeathIDs: playerClient.visibleEntityDeathIDs,
      // orbCompletes: playerClient.orbCompletes,
      // tileUpdates: tileUpdates,
      // serverTicks: Board.ticks,
      // serverTime: Board.time,
      // playerHealth: player !== null ? HealthComponentArray.getComponent(player).health : 0,
      // entityDebugData: entityDebugData,
      // playerTribeData: bundlePlayerTribeData(playerClient),
      // enemyTribesData: bundleEnemyTribesData(playerClient),
      // @Incomplete
      // hasFrostShield: player.immunityTimer === 0 && playerArmour !== null && playerArmour.type === ItemType.deepfrost_armour,
      // hasFrostShield: false,
      // pickedUpItem: playerClient.hasPickedUpItem,
      // hotbarCrossbowLoadProgressRecord: bundleHotbarCrossbowLoadProgressRecord(player),
      // titleOffer: player !== null ? PlayerComponentArray.getComponent(player).titleOffer : null,
      // tickEvents: playerClient.entityTickEvents,

      // @Incomplete
      // @Cleanup: Copy and paste
      // visiblePathfindingNodeOccupances: (playerClient.gameDataOptions & GameDataPacketOptions.sendVisiblePathfindingNodeOccupances) ? getVisiblePathfindingNodeOccupances(extendedVisibleChunkBounds) : [],
      // visibleSafetyNodes: (playerClient.gameDataOptions & GameDataPacketOptions.sendVisibleSafetyNodes) ? getVisibleSafetyNodesData(visibleTribes, extendedVisibleChunkBounds) : [],
      // visibleBuildingPlans: (playerClient.gameDataOptions & GameDataPacketOptions.sendVisibleBuildingPlans) ? getVisibleBuildingPlans(visibleTribes, extendedVisibleChunkBounds) : [],
      // visibleBuildingSafetys: (playerClient.gameDataOptions & GameDataPacketOptions.sendVisibleBuildingSafetys) ? getVisibleBuildingSafetys(visibleTribes, extendedVisibleChunkBounds) : [],
      // visibleRestrictedBuildingAreas: (playerClient.gameDataOptions & GameDataPacketOptions.sendVisibleRestrictedBuildingAreas) ? getVisibleRestrictedBuildingAreas(visibleTribes, extendedVisibleChunkBounds) : [],
      // visibleWalls: getVisibleWallsData(visibleTribes, extendedVisibleChunkBounds),
      // visibleWallConnections: (playerClient.gameDataOptions & GameDataPacketOptions.sendVisibleWallConnections) ? getVisibleWallConnections(visibleTribes, extendedVisibleChunkBounds) : [],
      // visibleGrassBlockers: getVisibleGrassBlockers(playerClient.visibleChunkBounds)
   // };

   return packet.buffer;
}

export function createInitialGameDataPacket(player: EntityID, playerConfig: ComponentConfig<ServerComponentType.transform>): ArrayBuffer {
   let lengthBytes = Float32Array.BYTES_PER_ELEMENT * 4;
   lengthBytes += Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS * 6 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + Board.waterRocks.length * 5 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + Board.riverSteppingStones.length * 5 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes = alignLengthBytes(lengthBytes);
   const packet = new Packet(PacketType.initialGameData, lengthBytes);
   
   packet.addNumber(player);
   
   const spawnPosition = playerConfig[ServerComponentType.transform].position;
   packet.addNumber(spawnPosition.x);
   packet.addNumber(spawnPosition.y);
   
   for (let tileIndex = 0; tileIndex < Settings.FULL_BOARD_DIMENSIONS * Settings.FULL_BOARD_DIMENSIONS; tileIndex++) {
      packet.addNumber(Board.tileTypes[tileIndex]);
      packet.addNumber(Board.tileBiomes[tileIndex]);
      packet.addBoolean(Board.tileIsWalls[tileIndex] === 1 ? true : false);
      packet.padOffset(3);
      packet.addNumber(Board.riverFlowDirections[tileIndex]);
      packet.addNumber(Board.tileTemperatures[tileIndex]);
      packet.addNumber(Board.tileHumidities[tileIndex]);
   }

   packet.addNumber(Board.waterRocks.length);
   for (let i = 0; i < Board.waterRocks.length; i++) {
      const waterRock = Board.waterRocks[i];

      packet.addNumber(waterRock.position[0]);
      packet.addNumber(waterRock.position[1]);
      packet.addNumber(waterRock.rotation);
      packet.addNumber(waterRock.size);
      packet.addNumber(waterRock.opacity);
   }

   packet.addNumber(Board.riverSteppingStones.length);
   for (let i = 0; i < Board.riverSteppingStones.length; i++) {
      const steppingStone = Board.riverSteppingStones[i];

      packet.addNumber(steppingStone.positionX);
      packet.addNumber(steppingStone.positionY);
      packet.addNumber(steppingStone.rotation);
      packet.addNumber(steppingStone.size);
      packet.addNumber(steppingStone.groupID);
   }

   return packet.buffer;
}

export  function createSyncPacket(): ArrayBuffer {
   const packet = new Packet(PacketType.sync, Float32Array.BYTES_PER_ELEMENT);
   return packet.buffer;
}

export function createSyncDataPacket(playerClient: PlayerClient): ArrayBuffer {
   const player = playerClient.instance;

   // @Copynpaste @Robustness
   const inventoryComponent = InventoryComponentArray.getComponent(player);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);
   const backpackInventory = getInventory(inventoryComponent, InventoryName.backpack);
   const backpackSlotInventory = getInventory(inventoryComponent, InventoryName.backpackSlot);
   const heldItemSlotInventory = getInventory(inventoryComponent, InventoryName.heldItemSlot);
   const craftingOutputSlotInventory = getInventory(inventoryComponent, InventoryName.craftingOutputSlot);
   const armourSlotInventory = getInventory(inventoryComponent, InventoryName.armourSlot);
   const offhandInventory = getInventory(inventoryComponent, InventoryName.offhand);
   const gloveSlotInventory = getInventory(inventoryComponent, InventoryName.gloveSlot);

   let lengthBytes = 9 * Float32Array.BYTES_PER_ELEMENT;
   
   // Player inventories
   lengthBytes += getInventoryDataLength(hotbarInventory);
   lengthBytes += getInventoryDataLength(backpackInventory);
   lengthBytes += getInventoryDataLength(backpackSlotInventory);
   lengthBytes += getInventoryDataLength(heldItemSlotInventory);
   lengthBytes += getInventoryDataLength(craftingOutputSlotInventory);
   lengthBytes += getInventoryDataLength(armourSlotInventory);
   lengthBytes += getInventoryDataLength(offhandInventory);
   lengthBytes += getInventoryDataLength(gloveSlotInventory);

   const packet = new Packet(PacketType.syncData, lengthBytes);
   
   const transformComponent = TransformComponentArray.getComponent(player);
   packet.addNumber(transformComponent.position.x);
   packet.addNumber(transformComponent.position.y);
   packet.addNumber(transformComponent.rotation);

   const physicsComponent = PhysicsComponentArray.getComponent(player);
   packet.addNumber(physicsComponent.velocity.x);
   packet.addNumber(physicsComponent.velocity.y);
   packet.addNumber(physicsComponent.acceleration.x);
   packet.addNumber(physicsComponent.acceleration.y);

   const healthComponent = HealthComponentArray.getComponent(player);
   packet.addNumber(healthComponent.health);

   // Add inventory data
   addInventoryDataToPacket(packet, hotbarInventory);
   addInventoryDataToPacket(packet, backpackInventory);
   addInventoryDataToPacket(packet, backpackSlotInventory);
   addInventoryDataToPacket(packet, heldItemSlotInventory);
   addInventoryDataToPacket(packet, craftingOutputSlotInventory);
   addInventoryDataToPacket(packet, armourSlotInventory);
   addInventoryDataToPacket(packet, offhandInventory);
   addInventoryDataToPacket(packet, gloveSlotInventory);

   return packet.buffer;
}
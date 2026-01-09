import { ServerComponentTypeString } from "battletribes-shared/components";
import { Entity, EntityTypeString } from "battletribes-shared/entities";
import Layer from "../Layer";
import { ComponentArrays, getComponentArrayRecord } from "../components/ComponentArray";
import { InventoryComponentArray, getInventory } from "../components/InventoryComponent";
import { Settings } from "battletribes-shared/settings";
import PlayerClient from "./PlayerClient";
import { PlayerComponentArray } from "../components/PlayerComponent";
import { Inventory, InventoryName } from "battletribes-shared/items/items";
import { TransformComponentArray } from "../components/TransformComponent";
import { alignLengthBytes, getStringLengthBytes, Packet, PacketType } from "battletribes-shared/packets";
import { entityExists, getEntityComponentTypes, getEntityLayer, getEntitySpawnTicks, getEntityType, getGameTicks, getGameTime, getTribes } from "../world";
import { getPlayerNearbyCollapses, getSubtileSupport, subtileIsCollapsing } from "../collapses";
import { getSubtileIndex } from "../../../shared/src/subtiles";
import { layers } from "../layers";
import { addExtendedTribeData, addShortTribeData, getExtendedTribeDataLength, getShortTribeDataLength, shouldAddTribeExtendedData } from "../Tribe";
import { addGrassBlockerToData, getGrassBlockerLengthBytes, GrassBlocker } from "../grass-blockers";
import { addTamingSpecToData, getTamingSpecDataLength, getTamingSpecsMap } from "../taming-specs";
import { Point } from "../../../shared/src/utils";
import { addLightData, getEntityHitboxLights, getLightDataLength } from "../lights";
import { getPlayerClients } from "./player-clients";

export function getInventoryDataLength(inventory: Inventory): number {
   let lengthBytes = 4 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 4 * Float32Array.BYTES_PER_ELEMENT * inventory.items.length;
   for (const item of inventory.items) {
      lengthBytes += getStringLengthBytes(item.nickname);
      lengthBytes += getStringLengthBytes(item.namer);
   }
   return lengthBytes;
}

export function addInventoryDataToPacket(packet: Packet, inventory: Inventory): void {
   packet.writeNumber(inventory.name);
   packet.writeNumber(inventory.width);
   packet.writeNumber(inventory.height);

   packet.writeNumber(inventory.items.length);
   for (let j = 0; j < inventory.items.length; j++) {
      const item = inventory.items[j];
      const itemSlot = inventory.getItemSlot(item);
      
      packet.writeNumber(itemSlot);
      packet.writeNumber(item.id);
      packet.writeNumber(item.type);
      packet.writeNumber(item.count);
      packet.writeString(item.nickname);
      packet.writeString(item.namer);
   }
}

export function getEntityDataLength(entity: Entity, player: Entity | null): number {
   let lengthBytes = 5 * Float32Array.BYTES_PER_ELEMENT;

   for (let i = 0; i < ComponentArrays.length; i++) {
      const componentArray = ComponentArrays[i];

      if (componentArray.hasComponent(entity)) {
         lengthBytes += Float32Array.BYTES_PER_ELEMENT; // Component type
         lengthBytes += componentArray.getDataLength(entity, player);
      }
   }

   return lengthBytes;
}

export function addEntityDataToPacket(packet: Packet, entity: Entity, player: Entity | null): void {
   // Entity ID, type, spawn time, and layer
   packet.writeNumber(entity);
   packet.writeNumber(getEntityType(entity));
   // @Bandwidth: Only include when client doesn't know about this information
   packet.writeNumber(getEntitySpawnTicks(entity));
   packet.writeNumber(layers.indexOf(getEntityLayer(entity)));

   const componentTypes = getEntityComponentTypes(entity);
   const componentArrayRecord = getComponentArrayRecord();

   // Components
   packet.writeNumber(componentTypes.length);
   for (let i = 0; i < componentTypes.length; i++) {
      const componentType = componentTypes[i];
      const componentArray = componentArrayRecord[componentType];

      // @Speed
      if (componentArray.hasComponent(entity)) {
         const start = packet.currentByteOffset;
         
         packet.writeNumber(componentType);
         componentArray.addDataToPacket(packet, entity, player);

         // @Speed
         if (packet.currentByteOffset - start !== (Float32Array.BYTES_PER_ELEMENT + componentArray.getDataLength(entity, player))) {
            throw new Error(`Component type '${ServerComponentTypeString[componentType]}' has wrong data length for entity type '${EntityTypeString[getEntityType(entity)]}'. (getDataLength returned ${Float32Array.BYTES_PER_ELEMENT + componentArray.getDataLength(entity, player)}, while the length of the added data was ${packet.currentByteOffset - start})`)
         }
      }
   }
}

const getVisibleGrassBlockers = (playerClient: PlayerClient): ReadonlyArray<GrassBlocker> => {
   const visibleGrassBlockers = new Array<GrassBlocker>();
   const seenBlockers = new Set<GrassBlocker>();
   
   for (let chunkX = playerClient.minVisibleChunkX; chunkX <= playerClient.maxVisibleChunkX; chunkX++) {
      for (let chunkY = playerClient.minVisibleChunkY; chunkY <= playerClient.maxVisibleChunkY; chunkY++) {
         const chunk = playerClient.lastLayer.getChunk(chunkX, chunkY);
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

const getVisibleMinedSubtiles = (playerClient: PlayerClient): ReadonlyArray<number> => {
   const minedSubtiles = new Array<number>();
   
   for (let chunkX = playerClient.minVisibleChunkX; chunkX <= playerClient.maxVisibleChunkX; chunkX++) {
      for (let chunkY = playerClient.minVisibleChunkY; chunkY <= playerClient.maxVisibleChunkY; chunkY++) {
         const minSubtileX = chunkX * Settings.CHUNK_SIZE * 4;
         const maxSubtileX = (chunkX + 1) * Settings.CHUNK_SIZE * 4 - 1;
         const minSubtileY = chunkY * Settings.CHUNK_SIZE * 4;
         const maxSubtileY = (chunkY + 1) * Settings.CHUNK_SIZE * 4 - 1;
         
         for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
            for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
               const subtile = getSubtileIndex(subtileX, subtileY);
               if (playerClient.lastLayer.subtileIsMined(subtile)) {
                  minedSubtiles.push(subtile);
               }
            }
         }
      }
   }

   return minedSubtiles;
}

export function createGameDataPacket(playerClient: PlayerClient, entitiesToSend: Set<Entity>, removedEntities: Array<Entity>): ArrayBuffer {
   // @Cleanup: The mined subtile system here exists really only to send particles. Can be entirely encompassed in a server particles system!

   const player = entityExists(playerClient.instance) ? playerClient.instance : null;
   const layer = playerClient.lastLayer;
   
   const tileUpdates = layer.popTileUpdates();

   const tribes = getTribes();

   const titleOffer = player !== null ? PlayerComponentArray.getComponent(player).titleOffer : null;

   const minedSubtiles = getVisibleMinedSubtiles(playerClient);
   const nearbyCollapses = getPlayerNearbyCollapses(playerClient);
   const visibleGrassBlockers = getVisibleGrassBlockers(playerClient);
   
   // Packet type
   let lengthBytes = Float32Array.BYTES_PER_ELEMENT;
   // Ticks, time
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;
   // Layer
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;

   // Entities
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   for (const entity of entitiesToSend) {
      lengthBytes += getEntityDataLength(entity, player);
   }

   // Removed entities
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + 2 * Float32Array.BYTES_PER_ELEMENT * removedEntities.length;

   // Tribes
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   for (const tribe of tribes) {
      if (shouldAddTribeExtendedData(playerClient, tribe)) {
         lengthBytes += getExtendedTribeDataLength(tribe);
      } else {
         lengthBytes += getShortTribeDataLength(tribe);
      }
   }
   
   // Player instance and camera subject
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;

   // Lights
   let numVisibleLights = 0;
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   for (const entity of playerClient.visibleEntities) {
      const hitboxLights = getEntityHitboxLights(entity);
      if (hitboxLights !== null) {
         for (const _pair of hitboxLights) {
            lengthBytes += getLightDataLength();
            numVisibleLights++;
         }
      }
   }

   // Visible hits
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + 8 * Float32Array.BYTES_PER_ELEMENT * playerClient.visibleHits.length;
   // Player knockback
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + 2 * Float32Array.BYTES_PER_ELEMENT * playerClient.playerKnockbacks.length;
   // Player heals
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + 5 * Float32Array.BYTES_PER_ELEMENT * playerClient.heals.length;
   // Visible entity deaths
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + Float32Array.BYTES_PER_ELEMENT * playerClient.visibleDestroyedEntities.length;
   // Orb completes
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + 3 * Float32Array.BYTES_PER_ELEMENT * playerClient.orbCompletes.length;
   // Tile updates
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + 2 * Float32Array.BYTES_PER_ELEMENT * tileUpdates.length;

   // Wall subtile updates
   for (const layer of layers) {
      lengthBytes += Float32Array.BYTES_PER_ELEMENT + 3 * layer.wallSubtileUpdates.length * Float32Array.BYTES_PER_ELEMENT;
   }
   
   // hasPickedUpItem
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;

   // Title offer
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   if (titleOffer !== null) {
      lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   }

   // Tick events
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + 3 * Float32Array.BYTES_PER_ELEMENT * playerClient.entityTickEvents.length;

   // Mined subtiles
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 4 * Float32Array.BYTES_PER_ELEMENT * minedSubtiles.length;

   // Collapses
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT * nearbyCollapses.length;

   // Grass blockers
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   for (const blocker of visibleGrassBlockers) {
      lengthBytes += getGrassBlockerLengthBytes(blocker);
   }

   lengthBytes = alignLengthBytes(lengthBytes);

   const packet = new Packet(PacketType.gameData, lengthBytes);

   packet.writeNumber(getGameTicks());
   packet.writeNumber(getGameTime());

   packet.writeNumber(layers.indexOf(layer));

   // Add entities
   packet.writeNumber(entitiesToSend.size);
   for (const entity of entitiesToSend) {
      addEntityDataToPacket(packet, entity, player);
   }

   // Removed/destroyed entities
   packet.writeNumber(removedEntities.length);
   for (const entity of removedEntities) {
      packet.writeNumber(entity);
      // @Bandwidth: we could split this into 2 instead and avoid having the bool for each one. But this likely won't matter and in fact will harm for small remove counts.
      packet.writeBool(playerClient.visibleDestroyedEntities.includes(entity));
   }

   // Tribes
   addExtendedTribeData(packet, playerClient.tribe);
   packet.writeNumber(tribes.length - 1); // minus one cuz the player is handled separately
   for (const tribe of tribes) {
      // Player tribe is already added
      if (tribe === playerClient.tribe) {
         continue;
      }

      if (shouldAddTribeExtendedData(playerClient, tribe)) {
         addExtendedTribeData(packet, tribe);
      } else {
         addShortTribeData(packet, tribe);
      }
   }

   packet.writeNumber(entityExists(playerClient.instance) ? playerClient.instance : 0);
   packet.writeNumber(entityExists(playerClient.cameraSubject) ? playerClient.cameraSubject : 0);

   // Lights
   packet.writeNumber(numVisibleLights);
   for (const entity of playerClient.visibleEntities) {
      const hitboxLights = getEntityHitboxLights(entity);
      if (hitboxLights !== null) {
         for (const pair of hitboxLights) {
            const hitbox = pair[0];
            const light = pair[1];
            addLightData(packet, hitbox, light);
         }
      }
   }
   
   // Add visible hits
   packet.writeNumber(playerClient.visibleHits.length);
   for (let i = 0; i < playerClient.visibleHits.length; i++) {
      const hitData = playerClient.visibleHits[i];
      packet.writeNumber(hitData.hitEntity);
      packet.writeNumber(hitData.hitHitbox.localID);
      packet.writeNumber(hitData.hitPosition.x);
      packet.writeNumber(hitData.hitPosition.y);
      packet.writeNumber(hitData.attackEffectiveness);
      packet.writeNumber(hitData.damage);
      packet.writeBool(hitData.shouldShowDamageNumber);
      packet.writeNumber(hitData.flags);
   }

   // Add player knockbacks
   packet.writeNumber(playerClient.playerKnockbacks.length);
   for (let i = 0; i < playerClient.playerKnockbacks.length; i++) {
      const knockbackData = playerClient.playerKnockbacks[i];
      packet.writeNumber(knockbackData.knockback);
      packet.writeNumber(knockbackData.knockbackDirection);
   }

   // Add player heals
   packet.writeNumber(playerClient.heals.length);
   for (let i = 0; i < playerClient.heals.length; i++) {
      const healData = playerClient.heals[i];
      packet.writeNumber(healData.entityPositionX);
      packet.writeNumber(healData.entityPositionY);
      packet.writeNumber(healData.healedID);
      packet.writeNumber(healData.healerID);
      packet.writeNumber(healData.healAmount);
   }

   // Orb completes
   packet.writeNumber(playerClient.orbCompletes.length);
   for (let i = 0; i < playerClient.orbCompletes.length; i++) {
      const orbCompleteData = playerClient.orbCompletes[i];
      packet.writeNumber(orbCompleteData.x);
      packet.writeNumber(orbCompleteData.y);
      packet.writeNumber(orbCompleteData.amount);
   }
   
   // Tile updates
   packet.writeNumber(tileUpdates.length);
   for (let i = 0; i < tileUpdates.length; i++) {
      const tileUpdate = tileUpdates[i];
      packet.writeNumber(tileUpdate.tileIndex);
      packet.writeNumber(tileUpdate.type);
   }

   // Wall subtile updates
   for (const layer of layers) {
      packet.writeNumber(layer.wallSubtileUpdates.length);
      for (const subtileUpdate of layer.wallSubtileUpdates) {
         packet.writeNumber(subtileUpdate.subtileIndex);
         packet.writeNumber(subtileUpdate.subtileType);
         packet.writeNumber(subtileUpdate.damageTaken);
      }
   }

   packet.writeBool(playerClient.hasPickedUpItem);

   // Title offer
   packet.writeBool(titleOffer !== null);
   if (titleOffer !== null) {
      packet.writeNumber(titleOffer);
   }
   
   // Tick events
   packet.writeNumber(playerClient.entityTickEvents.length);
   for (const tickEvent of playerClient.entityTickEvents) {
      packet.writeNumber(tickEvent.entityID);
      packet.writeNumber(tickEvent.type);
      packet.writeNumber(tickEvent.data as number);
   }

   // Mined subtiles
   packet.writeNumber(minedSubtiles.length);
   for (const subtileIndex of minedSubtiles) {
      packet.writeNumber(subtileIndex);

      const subtileType = layer.getMinedSubtileType(subtileIndex);
      packet.writeNumber(subtileType);
      
      const support = getSubtileSupport(layer, subtileIndex);
      packet.writeNumber(support);

      packet.writeBool(subtileIsCollapsing(subtileIndex));
   }

   // Collapses
   packet.writeNumber(nearbyCollapses.length);
   // @Cleanup: unused?
   for (const [collapse, subtileIndex] of nearbyCollapses) {
      packet.writeNumber(subtileIndex);
      packet.writeNumber(collapse.age);
   }

   // Grass blockers
   packet.writeNumber(visibleGrassBlockers.length);
   for (const blocker of visibleGrassBlockers) {
      addGrassBlockerToData(packet, blocker);
   }
   
   // @Cleanup: remove all this shit
   
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
      // pickedUpItem: playerClient.hasPickedUpItem,
      // hotbarCrossbowLoadProgressRecord: bundleHotbarCrossbowLoadProgressRecord(player),
      // titleOffer: player !== null ? PlayerComponentArray.getComponent(player).titleOffer : null,
      // tickEvents: playerClient.entityTickEvents,

      // @Incomplete
      // @Incomplete
      // @Incomplete
      // @Cleanup: Copy and paste
      // visibleSafetyNodes: (playerClient.gameDataOptions & GameDataPacketOptions.sendVisibleSafetyNodes) ? getVisibleSafetyNodesData(visibleTribes, extendedVisibleChunkBounds) : [],
      // visibleBuildingPlans: (playerClient.gameDataOptions & GameDataPacketOptions.sendVisibleBuildingPlans) ? getVisibleBuildingPlans(visibleTribes, extendedVisibleChunkBounds) : [],
      // visibleBuildingSafetys: (playerClient.gameDataOptions & GameDataPacketOptions.sendVisibleBuildingSafetys) ? getVisibleBuildingSafetys(visibleTribes, extendedVisibleChunkBounds) : [],
      // visibleRestrictedBuildingAreas: (playerClient.gameDataOptions & GameDataPacketOptions.sendVisibleRestrictedBuildingAreas) ? getVisibleRestrictedBuildingAreas(visibleTribes, extendedVisibleChunkBounds) : [],
      // visibleWalls: getVisibleWallsData(visibleTribes, extendedVisibleChunkBounds),
      // visibleWallConnections: (playerClient.gameDataOptions & GameDataPacketOptions.sendVisibleWallConnections) ? getVisibleWallConnections(visibleTribes, extendedVisibleChunkBounds) : [],
   // };

   return packet.buffer;
}

export function createInitialGameDataPacket(spawnLayer: Layer, spawnPosition: Point): ArrayBuffer {
   const tamingSpecsMap = getTamingSpecsMap();

   let lengthBytes = Float32Array.BYTES_PER_ELEMENT * 5;
   // Layer idx
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   // Per-tile data
   lengthBytes += layers.length * Settings.FULL_WORLD_SIZE_TILES * Settings.FULL_WORLD_SIZE_TILES * 7 * Float32Array.BYTES_PER_ELEMENT;
   // Subtile data
   lengthBytes += layers.length * Settings.FULL_WORLD_SIZE_TILES * Settings.FULL_WORLD_SIZE_TILES * 16 * Float32Array.BYTES_PER_ELEMENT;
   // Subtile damage taken
   for (const layer of layers) {
      lengthBytes += Float32Array.BYTES_PER_ELEMENT + layer.wallSubtileDamageTakenMap.size * 2 * Float32Array.BYTES_PER_ELEMENT;
   }
   // Water rocks
   lengthBytes += Float32Array.BYTES_PER_ELEMENT + spawnLayer.waterRocks.length * 5 * Float32Array.BYTES_PER_ELEMENT;
   // Taming specs
   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   for (const pair of tamingSpecsMap) {
      lengthBytes += Float32Array.BYTES_PER_ELEMENT;
      lengthBytes += getTamingSpecDataLength(pair[1]);
   }
   lengthBytes = alignLengthBytes(lengthBytes);
   const packet = new Packet(PacketType.initialGameData, lengthBytes);
   
   // Layer idx
   packet.writeNumber(layers.indexOf(spawnLayer));
   
   // Spawn position
   packet.writeNumber(spawnPosition.x);
   packet.writeNumber(spawnPosition.y);
   
   // Layers and their terrain data
   packet.writeNumber(layers.length);
   for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
      const layer = layers[layerIdx];
      // Per-tile data
      for (let tileIndex = 0; tileIndex < Settings.FULL_WORLD_SIZE_TILES * Settings.FULL_WORLD_SIZE_TILES; tileIndex++) {
         packet.writeNumber(layer.tileTypes[tileIndex]);
         packet.writeNumber(layer.tileBiomes[tileIndex]);
         packet.writeNumber(layer.riverFlowDirections[tileIndex]);
         packet.writeNumber(layer.tileTemperatures[tileIndex]);
         packet.writeNumber(layer.tileHumidities[tileIndex]);
         packet.writeNumber(layer.tileMithrilRichnesses[tileIndex]);
      }

      // Subtiles
      const subtiles = layer.wallSubtileTypes;
      for (let i = 0; i < Settings.FULL_WORLD_SIZE_TILES * Settings.FULL_WORLD_SIZE_TILES * 16; i++) {
         packet.writeNumber(subtiles[i]);
      }

      // Subtile damage taken
      packet.writeNumber(layer.wallSubtileDamageTakenMap.size);
      for (const [subtileIndex, damageTaken] of layer.wallSubtileDamageTakenMap) {
         packet.writeNumber(subtileIndex);
         packet.writeNumber(damageTaken);
      }
   }

   packet.writeNumber(spawnLayer.waterRocks.length);
   for (let i = 0; i < spawnLayer.waterRocks.length; i++) {
      const waterRock = spawnLayer.waterRocks[i];

      packet.writeNumber(waterRock.position[0]);
      packet.writeNumber(waterRock.position[1]);
      packet.writeNumber(waterRock.rotation);
      packet.writeNumber(waterRock.size);
      packet.writeNumber(waterRock.opacity);
   }

   // Taming specs
   packet.writeNumber(tamingSpecsMap.size);
   for (const pair of tamingSpecsMap) {
      packet.writeNumber(pair[0])
      addTamingSpecToData(packet, pair[1]);
   }

   return packet.buffer;
}

export function createSyncGameDataPacket(playerClient: PlayerClient): ArrayBuffer {
   const player = playerClient.instance;

   const lengthBytes = 9 * Float32Array.BYTES_PER_ELEMENT;
   
   const packet = new Packet(PacketType.syncGameData, lengthBytes);
   
   const transformComponent = TransformComponentArray.getComponent(player);
   const hitbox = transformComponent.hitboxes[0];
   packet.writeNumber(hitbox.box.position.x);
   packet.writeNumber(hitbox.box.position.y);
   packet.writeNumber(hitbox.box.angle);

   packet.writeNumber(hitbox.previousPosition.x);
   packet.writeNumber(hitbox.previousPosition.y);
   packet.writeNumber(hitbox.acceleration.x);
   packet.writeNumber(hitbox.acceleration.y);

   // @HACK @SPEED: would be way better to have a way to write the game data to the packet directly!!
   

   return packet.buffer;
}

const createSimulationStatusUpdatePacket = (isSimulating: boolean): Packet => {
   const packet = new Packet(PacketType.simulationStatusUpdate, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeBool(isSimulating);
   return packet;
}

export function broadcastSimulationStatus(isSimulating: boolean): void {
   const packet = createSimulationStatusUpdatePacket(isSimulating);

   // @Copynpaste
   const playerClients = getPlayerClients();
   for (let i = 0; i < playerClients.length; i++) {
      const playerClient = playerClients[i];
      if (!playerClient.isActive) {
         continue;
      }

      playerClient.socket.send(packet.buffer);
   }
}

export function createShieldKnockPacket(): Packet {
   const packet = new Packet(PacketType.shieldKnock, Float32Array.BYTES_PER_ELEMENT);
   return packet;
}
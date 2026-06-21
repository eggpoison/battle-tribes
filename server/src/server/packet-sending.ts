import { ServerComponentTypeString } from "../../../shared/dist/components.js";
import { Entity, EntityTypeString } from "../../../shared/dist/entities.js";
import { Inventory } from "../../../shared/dist/items/items.js";
import { getStringLengthBytes, Packet, alignLengthBytes, ServerPacketType } from "../../../shared/dist/packets.js";
import { Settings } from "../../../shared/dist/settings.js";
import { Point } from "../../../shared/dist/utils.js";
import { Bytes } from "../../../shared/dist/constants.js";
import Layer from "../Layer.js";
import { getComponentArrayRecord } from "../components/ComponentArray.js";
import PlayerClient from "./PlayerClient.js";
import { PlayerComponentArray } from "../components/PlayerComponent.js";
import { TransformComponentArray } from "../components/TransformComponent.js";
import { entityExists, getEntityLayer, getEntitySpawnTicks, getEntityType, getGameTicks, getGameTime, getTribes, layers, surfaceLayer } from "../world.js";
import { getPlayerNearbyCollapses, getSubtileSupport, subtileIsCollapsing } from "../collapses.js";
import { addExtendedTribeData, addShortTribeData, getExtendedTribeDataLength, getShortTribeDataLength, shouldAddTribeExtendedData } from "../Tribe.js";
import { addGrassBlockerToData, getGrassBlockerLengthBytes, GrassBlocker } from "../grass-blockers.js";
import { addTamingSpecToData, getTamingSpecDataLength, getTamingSpecsMap } from "../taming-specs.js";
import { addLightData, getEntityHitboxLights, getLightDataLength } from "../lights.js";
import { getPlayerClients } from "./player-clients.js";
import { ENTITY_COMPONENT_TYPES, getEntityComponentTypes } from "../entity-component-types.js";
import { getSubtileIndex } from "../../../shared/dist/subtiles.js";

export function getInventoryDataLength(inventory: Inventory): number {
   let lengthBytes = 4 * Bytes.Float32;
   lengthBytes += 4 * Bytes.Float32 * inventory.items.length;
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
   let lengthBytes = 4 * Bytes.Float32;

   const componentTypes = getEntityComponentTypes(getEntityType(entity));
   const componentArrayRecord = getComponentArrayRecord();

   for (const componentType of componentTypes) {
      const componentArray = componentArrayRecord[componentType];
      lengthBytes += componentArray.getDataLength(entity, player);
   }

   return lengthBytes;
}

export function addEntityDataToPacket(packet: Packet, entity: Entity, player: Entity | null): void {
   const entityType = getEntityType(entity);
   
   // Entity ID, type, spawn time, and layer
   packet.writeNumber(entity);
   packet.writeNumber(entityType);
   // @Bandwidth: Only include when client doesn't know about this information
   packet.writeNumber(getEntitySpawnTicks(entity));
   packet.writeNumber(getEntityLayer(entity).depth);

   const componentTypes = getEntityComponentTypes(entityType);
   const componentArrayRecord = getComponentArrayRecord();

   // Components
   for (let i = 0; i < componentTypes.length; i++) {
      const componentType = componentTypes[i];
      const componentArray = componentArrayRecord[componentType];

      const start = packet.currentByteOffset;
      
      componentArray.addDataToPacket(packet, entity, player);

      // @Speed
      if (packet.currentByteOffset - start !== componentArray.getDataLength(entity, player)) {
         throw new Error(`Component type '${ServerComponentTypeString[componentType]}' has wrong data length for entity type '${EntityTypeString[getEntityType(entity)]}'. (getDataLength returned ${Bytes.Float32 + componentArray.getDataLength(entity, player)}, while the length of the added data was ${packet.currentByteOffset - start})`)
      }
   }
}

const getVisibleGrassBlockers = (playerClient: PlayerClient): readonly GrassBlocker[] => {
   const visibleGrassBlockers: GrassBlocker[] = [];
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

const getVisibleMinedSubtiles = (playerClient: PlayerClient): readonly number[] => {
   const minedSubtiles: number[] = [];
   
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

export function createGameDataPacket(playerClient: PlayerClient, entitiesToSend: Set<Entity>, removedEntities: Entity[]): ArrayBufferLike {
   // @Cleanup: The mined subtile system here exists really only to send particles. Can be entirely encompassed in a server particles system!

   const player = entityExists(playerClient.instance) ? playerClient.instance : null;
   const layer = playerClient.lastLayer;
   
   const tribes = getTribes();

   const titleOffer = player !== null ? PlayerComponentArray.getComponent(player).titleOffer : null;

   const minedSubtiles = getVisibleMinedSubtiles(playerClient);
   const nearbyCollapses = getPlayerNearbyCollapses(playerClient);
   const visibleGrassBlockers = getVisibleGrassBlockers(playerClient);
   
   // Ticks, time
   let lengthBytes = 2 * Bytes.Float32;
   // Layer
   lengthBytes += Bytes.Float32;

   // Entities
   lengthBytes += Bytes.Float32;
   for (const entity of entitiesToSend) {
      lengthBytes += getEntityDataLength(entity, player);
   }

   // Removed entities
   lengthBytes += Bytes.Float32 + 2 * Bytes.Float32 * removedEntities.length;

   // Tribes
   lengthBytes += Bytes.Float32;
   for (const tribe of tribes) {
      if (shouldAddTribeExtendedData(playerClient, tribe)) {
         lengthBytes += getExtendedTribeDataLength(tribe);
      } else {
         lengthBytes += getShortTribeDataLength(tribe);
      }
   }
   
   // Player instance and camera subject
   lengthBytes += 2 * Bytes.Float32;

   // Lights
   let numVisibleLights = 0;
   lengthBytes += Bytes.Float32;
   for (const entity of playerClient.visibleEntities) {
      const hitboxLights = getEntityHitboxLights(entity);
      if (hitboxLights !== null) {
         for (const _ of hitboxLights) {
            lengthBytes += getLightDataLength();
            numVisibleLights++;
         }
      }
   }

   // Visible hits
   lengthBytes += Bytes.Float32 + 8 * Bytes.Float32 * playerClient.visibleHits.length;
   // Player knockback
   lengthBytes += Bytes.Float32 + 2 * Bytes.Float32 * playerClient.playerKnockbacks.length;
   // Player heals
   lengthBytes += Bytes.Float32 + 5 * Bytes.Float32 * playerClient.heals.length;
   // Visible entity deaths
   lengthBytes += Bytes.Float32 + Bytes.Float32 * playerClient.visibleDestroyedEntities.length;
   // Orb completes
   lengthBytes += Bytes.Float32 + 3 * Bytes.Float32 * playerClient.orbCompletes.length;
   // Tile updates
   for (const layer of layers) {
      lengthBytes += Bytes.Float32 + 3 * Bytes.Float32 * layer.tileUpdateCoordinates.size;
   }

   // Wall subtile updates
   for (const layer of layers) {
      lengthBytes += Bytes.Float32 + 3 * layer.wallSubtileUpdates.size * Bytes.Float32;
   }
   
   // hasPickedUpItem
   lengthBytes += Bytes.Float32;

   // Title offer
   lengthBytes += Bytes.Float32;
   if (titleOffer !== null) {
      lengthBytes += Bytes.Float32;
   }

   // Tick events
   lengthBytes += Bytes.Float32 + 3 * Bytes.Float32 * playerClient.entityTickEvents.length;

   // Mined subtiles
   lengthBytes += Bytes.Float32;
   lengthBytes += 4 * Bytes.Float32 * minedSubtiles.length;

   // Collapses
   lengthBytes += Bytes.Float32;
   lengthBytes += 2 * Bytes.Float32 * nearbyCollapses.length;

   // Grass blockers
   lengthBytes += Bytes.Float32;
   for (const blocker of visibleGrassBlockers) {
      lengthBytes += getGrassBlockerLengthBytes(blocker);
   }

   lengthBytes = alignLengthBytes(lengthBytes);

   const packet = new Packet(ServerPacketType.gameData, lengthBytes);

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
   for (const layer of layers) {
      const tileUpdates = layer.tileUpdateCoordinates;

      const layerIdx = layer.depth;

      packet.writeNumber(tileUpdates.size);
      for (const tileIndex of tileUpdates) {
         const tileType = layer.getTileType(tileIndex);
         
         packet.writeNumber(layerIdx);
         packet.writeNumber(tileIndex);
         packet.writeNumber(tileType);
      }
      
      // reset the tile update coordiantes
      layer.tileUpdateCoordinates.clear();
   }

   // Wall subtile updates
   for (const layer of layers) {
      packet.writeNumber(layer.wallSubtileUpdates.size);
      for (const subtileIndex of layer.wallSubtileUpdates) {
         const subtileType = layer.getSubtileType(subtileIndex);
         const damageTaken = layer.wallSubtileDamageTakenMap.get(subtileIndex) || 0;
         
         packet.writeNumber(subtileIndex);
         packet.writeNumber(subtileType);
         packet.writeNumber(damageTaken);
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

export function createInitialGameDataPacket(spawnLayer: Layer, spawnPosition: Point): ArrayBufferLike {
   const tamingSpecsMap = getTamingSpecsMap();

   let lengthBytes = Bytes.Float32 * 4;
   // Layer idx
   lengthBytes += Bytes.Float32;
   // Per-tile data
   lengthBytes += layers.length * Settings.FULL_WORLD_SIZE_TILES * Settings.FULL_WORLD_SIZE_TILES * 7 * Bytes.Float32;
   // Subtile data
   lengthBytes += layers.length * Settings.FULL_WORLD_SIZE_TILES * Settings.FULL_WORLD_SIZE_TILES * 16 * Bytes.Float32;
   // Subtile damage taken
   for (const layer of layers) {
      lengthBytes += Bytes.Float32 + layer.wallSubtileDamageTakenMap.size * 2 * Bytes.Float32;

      console.log(layer.wallSubtileUpdates.size);
   }
   // Water rocks
   lengthBytes += Bytes.Float32 + spawnLayer.waterRocks.length * 5 * Bytes.Float32;
   // Taming specs
   lengthBytes += Bytes.Float32;
   for (const pair of tamingSpecsMap) {
      lengthBytes += Bytes.Float32;
      lengthBytes += getTamingSpecDataLength(pair[1]);
   }
   // Entity component types
   lengthBytes += Bytes.Float32;
   for (const componentTypes of ENTITY_COMPONENT_TYPES) {
      lengthBytes += Bytes.Float32 + componentTypes.length * Bytes.Float32;
   }
   lengthBytes = alignLengthBytes(lengthBytes);
   const packet = new Packet(ServerPacketType.initialGameData, lengthBytes);
   
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

   // Entity component types
   packet.writeNumber(ENTITY_COMPONENT_TYPES.length);
   for (const componentTypes of ENTITY_COMPONENT_TYPES) {
      packet.writeNumber(componentTypes.length);
      for (const componentType of componentTypes) {
         packet.writeNumber(componentType);
      }
   }

   return packet.buffer;
}

export function createSyncGameDataPacket(playerClient: PlayerClient): ArrayBufferLike {
   const player = playerClient.instance;

   const packet = new Packet(ServerPacketType.syncGameData, 8 * Bytes.Float32);

   let pos: Point;
   let angle: number;
   let previousPos: Point;
   let acceleration: Point;
   
   if (TransformComponentArray.hasComponent(player)) {
      const transformComponent = TransformComponentArray.getComponent(player);
      const hitbox = transformComponent.hitboxes[0];

      pos = new Point(hitbox.box.posX, hitbox.box.posY);
      angle = hitbox.box.angle;
      previousPos = new Point(hitbox.previousPosX, hitbox.previousPosY);
      acceleration = new Point(hitbox.accelX, hitbox.accelY);
   } else {
      pos = new Point(playerClient.lastViewedPositionX, playerClient.lastViewedPositionY);
      angle = 0;
      previousPos = pos.copy();
      acceleration = new Point(0, 0);
   }
   
   packet.writePoint(pos);
   packet.writeNumber(angle);
   packet.writePoint(previousPos);
   packet.writePoint(acceleration);

   return packet.buffer;
}

const createSimulationStatusUpdatePacket = (isSimulating: boolean): Packet => {
   const packet = new Packet(ServerPacketType.simulationStatusUpdate, Bytes.Float32);
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
   const packet = new Packet(ServerPacketType.shieldKnock, 0);
   return packet;
}
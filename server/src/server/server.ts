import { VisibleChunkBounds } from "battletribes-shared/client-server-types";
import { Settings } from "battletribes-shared/settings";
import { TribeType } from "battletribes-shared/tribes";
import { Point, randInt } from "battletribes-shared/utils";
import { PacketReader, PacketType } from "battletribes-shared/packets";
import WebSocket, { Server } from "ws";
import { runSpawnAttempt, spawnInitialEntities } from "../entity-spawning";
import Tribe from "../Tribe";
import SRandom from "../SRandom";
import { updateDynamicPathfindingNodes } from "../pathfinding";
import { updateGrassBlockers } from "../grass-blockers";
import { broadcastSimulationStatus, createGameDataPacket, createSyncDataPacket, createSyncPacket } from "./packet-sending";
import PlayerClient, { PlayerClientVars } from "./PlayerClient";
import { addPlayerClient, generatePlayerSpawnPosition, getPlayerClients, handlePlayerDisconnect, processCommandPacket, resetDirtyEntities } from "./player-clients";
import { createPlayerConfig } from "../entities/tribes/player";
import { processAcquireTamingSkillPacket, processAnimalStaffFollowCommandPacket, processAscendPacket, processCloseEntityInventoryPacket, processCompleteTamingTierPacket, processDevChangeTribeTypePacket, processDevCreateTribePacket, processDevGiveItemPacket, processDevGiveTitlePacket, processDevRemoveTitlePacket, processDevSetViewedSpawnDistribution, processDismountCarrySlotPacket, processEntitySummonPacket, processForceAcquireTamingSkillPacket, processForceCompleteTamingTierPacket, processForceUnlockTechPacket, processItemDropPacket, processItemPickupPacket, processItemReleasePacket, processItemTransferPacket, processModifyBuildingPacket, processMountCarrySlotPacket, processOpenEntityInventoryPacket, processPickUpEntityPacket, processPlaceBlueprintPacket, processPlayerAttackPacket, processPlayerCraftingPacket, processPlayerDataPacket, processRecruitTribesmanPacket, processRenameAnimalPacket, processRespawnPacket, processRespondToTitleOfferPacket, processSelectTechPacket, processSetAttackTargetPacket, processSetAutogiveBaseResourcesPacket, processSetCarryTargetPacket, processSetMoveTargetPositionPacket, processSetSignMessagePacket, processSetSpectatingPositionPacket, processSpectateEntityPacket, processStartItemUsePacket, processStopItemUsePacket, processStructureInteractPacket, processStructureUninteractPacket, processTechStudyPacket, processTechUnlockPacket, processToggleSimulationPacket, processTPToEntityPacket, processUseItemPacket, receiveChatMessagePacket, receiveSelectRiderDepositLocation } from "./packet-receiving";
import { CowSpecies, Entity } from "battletribes-shared/entities";
import { SpikesComponentArray } from "../components/SpikesComponent";
import { TribeComponentArray } from "../components/TribeComponent";
import { TransformComponentArray } from "../components/TransformComponent";
import { forceMaxGrowAllIceSpikes } from "../components/IceSpikesComponent";
import { sortComponentArrays } from "../components/ComponentArray";
import { destroyFlaggedEntities, entityExists, getEntityLayer, pushEntityJoinBuffer, tickGameTime, tickEntities, generateLayers, preDestroyFlaggedEntities, createEntity, getGameTicks, tickIntervalHasPassed, destroyEntity } from "../world";
import { resolveEntityCollisions } from "../collision-detection";
import { runCollapses } from "../collapses";
import { updateTribes } from "../tribes";
import { surfaceLayer, layers } from "../layers";
import { generateReeds } from "../world-generation/reed-generation";
import { riverMainTiles } from "../world-generation/surface-layer-generation";
import { updateWind } from "../wind";
import { applyTethers } from "../tethers";
import { generateGrassStrands } from "../world-generation/grass-generation";
import { Hitbox } from "../hitboxes";
import { createCowConfig } from "../entities/mobs/cow";
import { generateDecorations } from "../world-generation/decoration-generation";
import { ServerComponentType } from "../../../shared/src/components";
import { getTamingSkill, TamingSkillID } from "../../../shared/src/taming";
import { createDevGameDataPacket } from "./dev-packets";
import { createTribeWorkerConfig } from "../entities/tribes/tribe-worker";
import OPTIONS from "../options";

/*

Reference for future self:
node --prof-process isolate-0xnnnnnnnnnnnn-v8.log > processed.txt

*/

const entityIsHiddenFromPlayer = (entity: Entity, playerTribe: Tribe): boolean => {
   if (SpikesComponentArray.hasComponent(entity) && TribeComponentArray.hasComponent(entity)) {
      const tribeComponent = TribeComponentArray.getComponent(entity);
      const spikesComponent = SpikesComponentArray.getComponent(entity);
      
      if (spikesComponent.isCovered && tribeComponent.tribe !== playerTribe) {
         return true;
      }
   }

   return false;
}

const addHitboxHeirarchyToEntities = (playerClient: PlayerClient, entitiesToSend: Set<Entity>, hitbox: Hitbox): void => {
   entitiesToSend.add(hitbox.entity);
   for (const child of hitbox.children) {
      addHitboxHeirarchyToEntities(playerClient, entitiesToSend, child);
   }
}

const getPlayerVisibleEntities = (playerClient: PlayerClient): Set<Entity> => {
   const layer = playerClient.lastLayer;

   const visibleEntities = new Set<Entity>();
   
   // @Copynpaste
   const minVisibleX = playerClient.lastViewedPositionX - playerClient.screenWidth * 0.5 - PlayerClientVars.VIEW_PADDING;
   const maxVisibleX = playerClient.lastViewedPositionX + playerClient.screenWidth * 0.5 + PlayerClientVars.VIEW_PADDING;
   const minVisibleY = playerClient.lastViewedPositionY - playerClient.screenHeight * 0.5 - PlayerClientVars.VIEW_PADDING;
   const maxVisibleY = playerClient.lastViewedPositionY + playerClient.screenHeight * 0.5 + PlayerClientVars.VIEW_PADDING;
   
   for (let chunkX = playerClient.minVisibleChunkX; chunkX <= playerClient.maxVisibleChunkX; chunkX++) {
      for (let chunkY = playerClient.minVisibleChunkY; chunkY <= playerClient.maxVisibleChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            if (entityIsHiddenFromPlayer(entity, playerClient.tribe)) {
               continue;
            }

            const transformComponent = TransformComponentArray.getComponent(entity);
            if (transformComponent.boundingAreaMinX <= maxVisibleX && transformComponent.boundingAreaMaxX >= minVisibleX && transformComponent.boundingAreaMinY <= maxVisibleY && transformComponent.boundingAreaMaxY >= minVisibleY) {
               // Add the roots of the entity
               for (const rootHitbox of transformComponent.rootHitboxes) {
                  const rootEntity = rootHitbox.rootEntity;
                  const rootTransformComponent = TransformComponentArray.getComponent(rootEntity);
                  // @Cleanup lolllllllll
                  for (const rootRootHitbox of rootTransformComponent.rootHitboxes) {
                     addHitboxHeirarchyToEntities(playerClient, visibleEntities, rootRootHitbox);
                  }
               }
            }
         }
      }
   }

   return visibleEntities;
}

const estimateVisibleChunkBounds = (spawnPosition: Point, screenWidth: number, screenHeight: number): VisibleChunkBounds => {
   const zoom = 1;

   const halfScreenWidth = screenWidth * 0.5;
   const halfScreenHeight = screenHeight * 0.5;
   
   const minChunkX = Math.max(Math.floor((spawnPosition.x - halfScreenWidth / zoom) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((spawnPosition.x + halfScreenWidth / zoom) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);
   const minChunkY = Math.max(Math.floor((spawnPosition.y - halfScreenHeight / zoom) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((spawnPosition.y + halfScreenHeight / zoom) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);

   return [minChunkX, maxChunkX, minChunkY, maxChunkY];
}

// @Cleanup: Remove class, just have functions
/** Communicates between the server and players */
class GameServer {
   private server: Server | null = null;

   private tickInterval: NodeJS.Timeout | undefined;

   public trackedEntityID = 0;

   public isRunning = false;
   public isSimulating = true;

   public setTrackedGameObject(id: number): void {
      SERVER.trackedEntityID = id;
   }

   public async start(): Promise<void> {
      // Seed the random number generator
      // if (OPTIONS.inBenchmarkMode) {
      //    SRandom.seed(40404040404);
      // } else {
      //    SRandom.seed(randInt(0, 9999999999));
      // }

      // Desert:
      // SRandom.seed(2767843904);

      // Tundra:
      SRandom.seed(2763196645);

      // Cave:
      // SRandom.seed(2950872542);

      const builtinRandomFunc = Math.random;
      Math.random = () => SRandom.next();

      let _SHITTYCUMMERY = performance.now();
      console.log("start",_SHITTYCUMMERY)

      // Setup
      sortComponentArrays();
      console.log("Generating terrain...")
      generateLayers();
      console.log("terrain",performance.now() - _SHITTYCUMMERY)
      _SHITTYCUMMERY = performance.now();

      console.log("resources",performance.now() - _SHITTYCUMMERY)
      _SHITTYCUMMERY = performance.now();
      
      generateReeds(surfaceLayer, riverMainTiles);

      console.log("Spawning entities...");
      spawnInitialEntities();
      console.log("initial entities",performance.now() - _SHITTYCUMMERY)
      _SHITTYCUMMERY = performance.now();
      forceMaxGrowAllIceSpikes();
      console.log("ice spikes",performance.now() - _SHITTYCUMMERY)
      _SHITTYCUMMERY = performance.now();
      generateGrassStrands();
      console.log("grass",performance.now() - _SHITTYCUMMERY)
      _SHITTYCUMMERY = performance.now();
      generateDecorations();
      console.log("decorations",performance.now() - _SHITTYCUMMERY)
      _SHITTYCUMMERY = performance.now();
      // spawnGuardians();
      // console.log("guardians",performance.now() - a)
      // a = performance.now();

      Math.random = builtinRandomFunc;

      this.server = new Server({
         port: Settings.SERVER_PORT
      });

      // Handle player connections
      this.server.on("connection", (socket: WebSocket) => {
         let playerClient: PlayerClient | undefined;

         socket.on("close", () => {
            // If the connection closes before the intial player data is sent then the player client will be undefined
            if (typeof playerClient !== "undefined") {
               handlePlayerDisconnect(playerClient);
            }
         });
         
         socket.on("message", (message: Buffer) => {
            const reader = new PacketReader(message.buffer, message.byteOffset);
            const packetType = reader.readNumber() as PacketType;

            if (packetType === PacketType.initialPlayerData) {
               const username = reader.readString();
               // @Temporary
               const tribeType = reader.readNumber() as TribeType;
               const screenWidth = reader.readNumber();
               const screenHeight = reader.readNumber();

               const isSpectating = reader.readBool();

               const spawnPosition = generatePlayerSpawnPosition(tribeType);
               // @Incomplete? Unused?
               const visibleChunkBounds = estimateVisibleChunkBounds(spawnPosition, screenWidth, screenHeight);
   
               const tribe = new Tribe(tribeType, false, spawnPosition.copy());
               // @TEMPORARY @HACK
               // const layer = isSpectating ? undergroundLayer : surfaceLayer;
               const layer = surfaceLayer;
   
               // @Temporary @Incomplete
               const isDev = true;

               playerClient = new PlayerClient(socket, tribe, layer, screenWidth, screenHeight, spawnPosition, 0, username, isSpectating, isDev);
   
               if (!isSpectating) {
                  const config = createPlayerConfig(spawnPosition, 0, tribe, playerClient);
                  createEntity(config, layer, 0);
               }

               // @SQUEAM
               setTimeout(() => {
                  if (username === "Clementus") {
                     // const config = createTribeWorkerConfig(new Point(spawnPosition.x + 200, spawnPosition.y), 0, new Tribe(TribeType.plainspeople, true, new Point(spawnPosition.x + 200, spawnPosition.y)));
                     const config = createCowConfig(new Point(spawnPosition.x + 200, spawnPosition.y), 0, CowSpecies.brown);
                     createEntity(config, layer, 0);
                  }
               }, 1000);

               // if (!isSpectating) {
               //    setTimeout(() => {
               //       if (typeof playerClient !== "undefined") {
               //          destroyEntity(playerClient.instance);
               //       }
               //    }, 20000);
               // }
               
               addPlayerClient(playerClient, surfaceLayer, spawnPosition);

               return;
            }

            if (typeof playerClient === "undefined") {
               return;
            }
            
            // @Cleanup: so weird to have this in server.ts
            switch (packetType) {
               case PacketType.playerData: {
                  processPlayerDataPacket(playerClient, reader);
                  break;
               }
               case PacketType.activate: {
                  playerClient.isActive = true;
                  break;
               }
               case PacketType.syncRequest: {
                  if (entityExists(playerClient.instance)) {
                     const buffer = createSyncDataPacket(playerClient);
                     socket.send(buffer);
                  } else {
                     const buffer = createSyncPacket();
                     socket.send(buffer);
                  }
                  break;
               }
               case PacketType.attack: {
                  processPlayerAttackPacket(playerClient, reader);
                  break;
               }
               case PacketType.devGiveItem: {
                  processDevGiveItemPacket(playerClient, reader);
                  break;
               }
               case PacketType.respawn: {
                  processRespawnPacket(playerClient);
                  break;
               }
               case PacketType.startItemUse: {
                  processStartItemUsePacket(playerClient, reader);
                  break;
               }
               case PacketType.useItem: {
                  processUseItemPacket(playerClient, reader);
                  break;
               }
               case PacketType.stopItemUse: {
                  processStopItemUsePacket(playerClient);
                  break;
               }
               case PacketType.dropItem: {
                  processItemDropPacket(playerClient, reader);
                  break;
               }
               case PacketType.itemPickup: {
                  processItemPickupPacket(playerClient, reader);
                  break;
               }
               case PacketType.itemTransfer: {
                  processItemTransferPacket(playerClient, reader);
                  break;
               }
               case PacketType.itemRelease: {
                  processItemReleasePacket(playerClient, reader);
                  break;
               }
               case PacketType.summonEntity: {
                  processEntitySummonPacket(playerClient, reader);
                  break;
               }
               case PacketType.toggleSimulation: {
                  processToggleSimulationPacket(playerClient, reader);
                  break;
               }
               case PacketType.placeBlueprint: {
                  processPlaceBlueprintPacket(playerClient, reader);
                  break;
               }
               case PacketType.craftItem: {
                  processPlayerCraftingPacket(playerClient, reader);
                  break;
               }
               case PacketType.ascend: {
                  processAscendPacket(playerClient);
                  break;
               }
               case PacketType.devSetDebugEntity: {
                  const entity: Entity = reader.readNumber();
                  // @Cleanup: shouldn't be in the server!
                  SERVER.setTrackedGameObject(entity);
                  break;
               }
               case PacketType.devTPToEntity: {
                  processTPToEntityPacket(playerClient, reader);
                  break;
               }
               case PacketType.devSpectateEntity: {
                  processSpectateEntityPacket(playerClient, reader);
                  break;
               }
               case PacketType.devSetAutogiveBaseResource: {
                  processSetAutogiveBaseResourcesPacket(reader);
                  break;
               }
               case PacketType.structureInteract: {
                  processStructureInteractPacket(playerClient, reader);
                  break;
               }
               case PacketType.unlockTech: {
                  processTechUnlockPacket(playerClient, reader);
                  break;
               }
               case PacketType.selectTech: {
                  processSelectTechPacket(playerClient, reader);
                  break;
               }
               case PacketType.studyTech: {
                  processTechStudyPacket(playerClient, reader);
                  break;
               }
               case PacketType.animalStaffFollowCommand: {
                  processAnimalStaffFollowCommandPacket(playerClient, reader);
                  break;
               }
               case PacketType.mountCarrySlot: {
                  processMountCarrySlotPacket(playerClient, reader);
                  break;
               }
               case PacketType.dismountCarrySlot: {
                  processDismountCarrySlotPacket(playerClient);
                  break;
               }
               case PacketType.pickUpEntity: {
                  processPickUpEntityPacket(playerClient, reader);
                  break;
               }
               case PacketType.modifyBuilding: {
                  processModifyBuildingPacket(playerClient, reader);
                  break;
               }
               case PacketType.setMoveTargetPosition: {
                  processSetMoveTargetPositionPacket(playerClient, reader);
                  break;
               }
               case PacketType.setCarryTarget: {
                  processSetCarryTargetPacket(playerClient, reader);
                  break;
               }
               case PacketType.selectRiderDepositLocation: {
                  receiveSelectRiderDepositLocation(reader);
                  break;
               }
               case PacketType.setAttackTarget: {
                  processSetAttackTargetPacket(playerClient, reader);
                  break;
               }
               case PacketType.completeTamingTier: {
                  processCompleteTamingTierPacket(playerClient, reader);
                  break;
               }
               case PacketType.forceCompleteTamingTier: {
                  processForceCompleteTamingTierPacket(playerClient, reader);
                  break;
               }
               case PacketType.acquireTamingSkill: {
                  processAcquireTamingSkillPacket(playerClient, reader);
                  break;
               }
               case PacketType.forceAcquireTamingSkill: {
                  processForceAcquireTamingSkillPacket(playerClient, reader);
                  break;
               }
               case PacketType.setSpectatingPosition: {
                  processSetSpectatingPositionPacket(playerClient, reader);
                  break;
               }
               case PacketType.devSetViewedSpawnDistribution: {
                  processDevSetViewedSpawnDistribution(playerClient, reader);
                  break;
               }
               case PacketType.setSignMessage: {
                  processSetSignMessagePacket(reader);
                  break;
               }
               case PacketType.renameAnimal: {
                  processRenameAnimalPacket(reader);
                  break;
               }
               case PacketType.chatMessage: {
                  receiveChatMessagePacket(reader, playerClient);
                  break;
               }
               case PacketType.forceUnlockTech: {
                  processForceUnlockTechPacket(playerClient, reader);
                  break;
               }
               case PacketType.structureUninteract: {
                  processStructureUninteractPacket(playerClient, reader);
                  break;
               }
               case PacketType.recruitTribesman: {
                  processRecruitTribesmanPacket(playerClient, reader);
                  break;
               }
               case PacketType.respondToTitleOffer: {
                  processRespondToTitleOfferPacket(playerClient, reader);
                  break;
               }
               case PacketType.devGiveTitle: {
                  processDevGiveTitlePacket(playerClient, reader);
                  break;
               }
               case PacketType.devRemoveTitle: {
                  processDevRemoveTitlePacket(playerClient, reader);
                  break;
               }
               case PacketType.devCreateTribe: {
                  processDevCreateTribePacket();
                  break;
               }
               case PacketType.devChangeTribeType: {
                  processDevChangeTribeTypePacket(reader);
                  break;
               }
               case PacketType.terminalCommand: {
                  processCommandPacket(playerClient, reader);
                  break;
               }
               case PacketType.openEntityInventory: {
                  processOpenEntityInventoryPacket(reader);
                  break;
               }
               case PacketType.closeEntityInventory: {
                  processCloseEntityInventoryPacket(reader);
                  break;
               }
               default: {
                  console.log("Unknown packet type: " + packetType);
               }
            }
         });
      });

      SERVER.isRunning = true;
      
      if (typeof SERVER.tickInterval === "undefined") {
         console.log("Server started on port " + Settings.SERVER_PORT);
         // @SQUEAM to test low TPS scenario
         setInterval(SERVER.tick, 1000 / Settings.TICK_RATE);
         // setInterval(SERVER.tick, 1000 / Settings.TICK_RATE * 2);
      }
   }

   private async tick(): Promise<void> {
      // These are done before each tick to account for player packets causing entities to be removed/added between ticks.
      pushEntityJoinBuffer(false);
      preDestroyFlaggedEntities();
      destroyFlaggedEntities();

      if (SERVER.isSimulating) {
         updateTribes();
         
         updateGrassBlockers();
         runCollapses();

         updateWind();
         
         tickEntities();
         applyTethers();
         updateDynamicPathfindingNodes();

         for (const layer of layers) {
            resolveEntityCollisions(layer);
         }
         
         // if (getGameTicks() % Settings.TICK_RATE === 0) {
            // @Incomplete
            // updateResourceDistributions();
            runSpawnAttempt();
         // }

         // @Bug @Incomplete: Called twice!!!!
         updateTribes();
         
         pushEntityJoinBuffer(true);
      } else {
         // If not simulating, regularly broadcast so to all players
         if (tickIntervalHasPassed(0.5)) {
            broadcastSimulationStatus(SERVER.isSimulating);
         }
      }
      preDestroyFlaggedEntities();

      // @HACKKK @HACK only works for this specific network send rate!!
      // seems to reduce jitters, cuz there were some moments when packets were sent at server ticks with a diff 3 instead of 2.
      if (getGameTicks() % 2 === 0) {
         SERVER.sendGameDataPackets();
      }
      // const deltaTime = tickTime - lastTickTime;
      // packetSendTimer -= deltaTime;
      // if (packetSendTimer <= 0) {
      //    SERVER.sendGameDataPackets();
      //    while (packetSendTimer <= 0) {
      //       packetSendTimer += 1000 / Settings.SERVER_PACKET_SEND_RATE;
      //    }
      // }

      destroyFlaggedEntities();

      // Update server ticks and time
      // This is done at the end of the tick so that information sent by players is associated with the next tick to run
      tickGameTime();
   }

   // @Cleanup: maybe move this function to player-clients?
   /** Send data about the server to all players */
   public sendGameDataPackets(): void {
      if (this.server === null) return;
      
      // @Cleanup: should this all be in this file?
      
      const playerClients = getPlayerClients();
      for (let i = 0; i < playerClients.length; i++) {
         const playerClient = playerClients[i];
         if (!playerClient.isActive) {
            continue;
         }

         const viewedEntity = playerClient.cameraSubject;

         // Update player client info
         if (entityExists(viewedEntity)) {
            const transformComponent = TransformComponentArray.getComponent(viewedEntity);
            const hitbox = transformComponent.hitboxes[0];
            playerClient.updatePosition(hitbox.box.position.x, hitbox.box.position.y);

            playerClient.lastLayer = getEntityLayer(viewedEntity);
         }
      
         const visibleEntities = getPlayerVisibleEntities(playerClient);
         
         const entitiesToSend = new Set<Entity>();

         // Always send the viewed entity (if alive)
         if (entityExists(viewedEntity)) {
            entitiesToSend.add(viewedEntity);
         }
         // Also always add the player instance. This is so that the player instance can fly far away from the spectated entity and not make the client die
         if (entityExists(playerClient.instance)) {
            entitiesToSend.add(playerClient.instance);
         }
         const removedEntities = new Array<Entity>();

         // Add newly visible entities
         for (const entity of visibleEntities) {
            if (!playerClient.visibleEntities.has(entity)) {
               entitiesToSend.add(entity);
            }
         }

         // Add removed entities
         for (const entity of playerClient.visibleEntities) {
            if (!visibleEntities.has(entity)) {
               removedEntities.push(entity);
            }
         }

         // Send dirty entities
         for (const entity of playerClient.visibleDirtiedEntities) {
            // Sometimes entities are simultaneously removed from the board and on the visible dirtied list, this catches that
            if (entityExists(entity)) {
               entitiesToSend.add(entity);
            }
         }
         
         // Send the game data to the player
         playerClient.visibleEntities = visibleEntities; // Done just before creating the game data packet, as adding the lights data requires .visibleEntities to be up-to-date.
         const gameDataPacket = createGameDataPacket(playerClient, entitiesToSend, removedEntities);
         playerClient.socket.send(gameDataPacket);

         // @Cleanup: should these be here?
         playerClient.visibleHits = [];
         playerClient.playerKnockbacks = [];
         playerClient.heals = [];
         playerClient.orbCompletes = [];
         playerClient.hasPickedUpItem = false;
         playerClient.entityTickEvents = [];
         playerClient.visibleDirtiedEntities = [];

         if (playerClient.isDev) {
            const packet = createDevGameDataPacket(playerClient);
            playerClient.socket.send(packet.buffer);
         }
      }

      // @Hack?
      for (const layer of layers) {
         layer.wallSubtileUpdates = [];
      }

      resetDirtyEntities();
   }
}

export const SERVER = new GameServer();
SERVER.start();
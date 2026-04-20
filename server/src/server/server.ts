import { VisibleChunkBounds } from "battletribes-shared/client-server-types";
import { Settings } from "battletribes-shared/settings";
import { TribeType } from "battletribes-shared/tribes";
import { Point } from "battletribes-shared/utils";
import { ClientPacketType, PacketReader } from "battletribes-shared/packets";
import WebSocket, { Server } from "ws";
import { runSpawnAttempt, spawnInitialEntities } from "../entity-spawning";
import Tribe from "../Tribe";
import SRandom from "../SRandom";
import { updateDynamicPathfindingNodes } from "../pathfinding";
import { updateGrassBlockers } from "../grass-blockers";
import { broadcastSimulationStatus, createGameDataPacket } from "./packet-sending";
import PlayerClient, { PlayerClientVars } from "./PlayerClient";
import { addPlayerClient, generatePlayerSpawnPosition, getPlayerClients, handlePlayerDisconnect, processCommandPacket, resetDirtyEntities } from "./player-clients";
import { createPlayerConfig } from "../entities/tribes/player";
import { processAcquireTamingSkillPacket, processActivatePacket, processAnimalStaffFollowCommandPacket, processAscendPacket, processEndEntityInteractionPacket, processCompleteTamingTierPacket, processDeactivatePacket, processDevChangeTribeTypePacket, processDevCreateTribePacket, processDevGiveItemPacket, processDevGiveTitlePacket, processDevRemoveTitlePacket, processDevSetViewedSpawnDistribution, processDismountCarrySlotPacket, processEntitySummonPacket, processForceAcquireTamingSkillPacket, processForceCompleteTamingTierPacket, processForceUnlockTechPacket, processItemDropPacket, processItemPickupPacket, processItemReleasePacket, processItemTransferPacket, processModifyBuildingPacket, processMountCarrySlotPacket, processStartEntityInteractionPacket, processPickUpEntityPacket, processPlaceBlueprintPacket, processPlayerAttackPacket, processPlayerCraftingPacket, processPlayerDataPacket, processRecruitTribesmanPacket, processRenameAnimalPacket, processRespawnPacket, processRespondToTitleOfferPacket, processScreenResizePacket, processSelectTechPacket, processSetAttackTargetPacket, processSetAutogiveBaseResourcesPacket, processSetCarryTargetPacket, processSetDebugEntityPacket, processSetMoveTargetPositionPacket, processSetSignMessagePacket, processSetSpectatingPositionPacket, processSpectateEntityPacket, processStartItemUsePacket, processStopItemUsePacket, processStructureInteractPacket, processStructureUninteractPacket, processSyncRequestPacket, processTechStudyPacket, processTechUnlockPacket, processToggleSimulationPacket, processTPToEntityPacket, processUseItemPacket, receiveChatMessagePacket, receiveSelectRiderDepositLocation } from "./packet-receiving";
import { CowSpecies, Entity } from "battletribes-shared/entities";
import { SpikesComponentArray } from "../components/SpikesComponent";
import { TribeComponentArray } from "../components/TribeComponent";
import { TransformComponentArray } from "../components/TransformComponent";
import { forceMaxGrowAllIceSpikes } from "../components/IceSpikesComponent";
import { sortComponentArrays } from "../components/ComponentArray";
import { destroyFlaggedEntities, entityExists, getEntityLayer, pushEntityJoinBuffer, tickGameTime, tickEntities, generateLayers, preDestroyFlaggedEntities, createEntity, getGameTicks, tickIntervalHasPassed, destroyEntity, getEntityType } from "../world";
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
import { DecorationType } from "../../../shared/src/components";
import { createDevGameDataPacket } from "./dev-packets";
import { createTribeWorkerConfig } from "../entities/tribes/tribe-worker";
import { InventoryName, QUIVER_ACCESS_TIME_TICKS, QUIVER_PULL_TIME_TICKS } from "../../../shared/src/items/items";
import { getCurrentLimbState, InventoryUseComponentArray } from "../components/InventoryUseComponent";
import { QUIVER_PULL_LIMB_STATE } from "../../../shared/src/attack-patterns";
import OPTIONS from "../options";
import { createDecorationConfig } from "../entities/decoration";
import { getEntitiesAtPosition } from "../layer-utils";
import { createTreeConfig } from "../entities/resources/tree";

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

      SRandom.seed(2845700342);

      // Desert:
      // SRandom.seed(2767843904);

      // Tundra:
      // SRandom.seed(2763196645);

      // Cave:
      // SRandom.seed(2950872542);

      // br river
      // SRandom.seed(9028422602);

      // slime goop
      // SRandom.seed(2965725785);

      const builtinRandomFunc = Math.random;
      Math.random = () => SRandom.next();

      // Setup
      sortComponentArrays();
      generateLayers();
      generateReeds(surfaceLayer, riverMainTiles);

      spawnInitialEntities();
      forceMaxGrowAllIceSpikes();
      generateGrassStrands();
      generateDecorations();
      // spawnGuardians();

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
            const reader = new PacketReader(message.buffer as ArrayBuffer, message.byteOffset);
            const packetType: ClientPacketType = reader.readNumber();

            if (packetType === ClientPacketType.initialPlayerData) {
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
                     const config = createCowConfig(new Point(spawnPosition.x + 200, spawnPosition.y), 0, CowSpecies.brown);
                     createEntity(config, layer, 0);
                  }

                  let ox = 1731.304931640625 + 10;
                  let oy = 1931.582763671875;
                  const fleur1 = createDecorationConfig(new Point(ox, oy), Math.PI * 0.225, DecorationType.flower3);
                  createEntity(fleur1, surfaceLayer, 0);
                  ox += 40 * 1.5
                  oy += 15
                  const fleur2 = createDecorationConfig(new Point(ox, oy), Math.PI * 0.355, DecorationType.flower3);
                  createEntity(fleur2, surfaceLayer, 0);
                  ox += 28 * 1.5
                  oy += 12
                  const fleur3 = createDecorationConfig(new Point(ox, oy), Math.PI * 0.255, DecorationType.flower3);
                  createEntity(fleur3, surfaceLayer, 0);
                  ox += 28 * 1.5
                  oy += 4
                  const fleur4 = createDecorationConfig(new Point(ox, oy), Math.PI * 0.425, DecorationType.flower3);
                  createEntity(fleur4, surfaceLayer, 0);
                  
                  
                  ox += 72;
                  oy -= 5;
                  const pebble1 = createDecorationConfig(new Point(ox, oy), Math.PI * 0.225, DecorationType.rock);
                  createEntity(pebble1, surfaceLayer, 0);
                  ox += 96;
                  oy -= 3;
                  const pebble2 = createDecorationConfig(new Point(ox, oy), Math.PI * 0.105, DecorationType.rock);
                  createEntity(pebble2, surfaceLayer, 0);
                  ox += 64;
                  oy -= 76;
                  const pebble3 = createDecorationConfig(new Point(ox, oy), Math.PI * 0.055, DecorationType.rock);
                  createEntity(pebble3, surfaceLayer, 0);
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
               case ClientPacketType.playerData:                    processPlayerDataPacket(playerClient, reader); break;
               case ClientPacketType.activate:                      processActivatePacket(playerClient); break;
               case ClientPacketType.deactivate:                    processDeactivatePacket(playerClient); break;
               case ClientPacketType.syncRequest:                   processSyncRequestPacket(playerClient); break;
               case ClientPacketType.attack:                        processPlayerAttackPacket(playerClient, reader); break;
               case ClientPacketType.devGiveItem:                   processDevGiveItemPacket(playerClient, reader); break;
               case ClientPacketType.respawn:                       processRespawnPacket(playerClient); break;
               case ClientPacketType.startItemUse:                  processStartItemUsePacket(playerClient, reader); break;
               case ClientPacketType.useItem:                       processUseItemPacket(playerClient, reader); break;
               case ClientPacketType.stopItemUse:                   processStopItemUsePacket(playerClient); break;
               case ClientPacketType.dropItem:                      processItemDropPacket(playerClient, reader); break;
               case ClientPacketType.itemPickup:                    processItemPickupPacket(playerClient, reader); break;
               case ClientPacketType.itemTransfer:                  processItemTransferPacket(playerClient, reader); break;
               case ClientPacketType.itemRelease:                   processItemReleasePacket(playerClient, reader); break;
               case ClientPacketType.summonEntity:                  processEntitySummonPacket(playerClient, reader); break;
               case ClientPacketType.toggleSimulation:              processToggleSimulationPacket(playerClient, reader); break;
               case ClientPacketType.placeBlueprint:                processPlaceBlueprintPacket(playerClient, reader); break;
               case ClientPacketType.craftItem:                     processPlayerCraftingPacket(playerClient, reader); break;
               case ClientPacketType.ascend:                        processAscendPacket(playerClient); break;
               case ClientPacketType.devSetDebugEntity:             processSetDebugEntityPacket(reader); break;
               case ClientPacketType.devTPToEntity:                 processTPToEntityPacket(playerClient, reader); break;
               case ClientPacketType.devSpectateEntity:             processSpectateEntityPacket(playerClient, reader); break;
               case ClientPacketType.devSetAutogiveBaseResource:    processSetAutogiveBaseResourcesPacket(reader); break;
               case ClientPacketType.structureInteract:             processStructureInteractPacket(playerClient, reader); break;
               case ClientPacketType.unlockTech:                    processTechUnlockPacket(playerClient, reader); break;
               case ClientPacketType.selectTech:                    processSelectTechPacket(playerClient, reader); break;
               case ClientPacketType.studyTech:                     processTechStudyPacket(playerClient, reader); break;
               case ClientPacketType.animalStaffFollowCommand:      processAnimalStaffFollowCommandPacket(playerClient, reader); break;
               case ClientPacketType.mountCarrySlot:                processMountCarrySlotPacket(playerClient, reader); break;
               case ClientPacketType.dismountCarrySlot:             processDismountCarrySlotPacket(playerClient); break;
               case ClientPacketType.pickUpEntity:                  processPickUpEntityPacket(playerClient, reader); break;
               case ClientPacketType.modifyBuilding:                processModifyBuildingPacket(playerClient, reader); break;
               case ClientPacketType.setMoveTargetPosition:         processSetMoveTargetPositionPacket(playerClient, reader); break;
               case ClientPacketType.setCarryTarget:                processSetCarryTargetPacket(playerClient, reader); break;
               case ClientPacketType.selectRiderDepositLocation:    receiveSelectRiderDepositLocation(reader); break;
               case ClientPacketType.setAttackTarget:               processSetAttackTargetPacket(playerClient, reader); break;
               case ClientPacketType.completeTamingTier:            processCompleteTamingTierPacket(playerClient, reader); break;
               case ClientPacketType.forceCompleteTamingTier:       processForceCompleteTamingTierPacket(playerClient, reader); break;
               case ClientPacketType.acquireTamingSkill:            processAcquireTamingSkillPacket(playerClient, reader); break;
               case ClientPacketType.forceAcquireTamingSkill:       processForceAcquireTamingSkillPacket(playerClient, reader); break;
               case ClientPacketType.setSpectatingPosition:         processSetSpectatingPositionPacket(playerClient, reader); break;
               case ClientPacketType.devSetViewedSpawnDistribution: processDevSetViewedSpawnDistribution(playerClient, reader); break;
               case ClientPacketType.setSignMessage:                processSetSignMessagePacket(reader); break;
               case ClientPacketType.renameAnimal:                  processRenameAnimalPacket(reader); break;
               case ClientPacketType.chatMessage:                   receiveChatMessagePacket(reader, playerClient); break;
               case ClientPacketType.forceUnlockTech:               processForceUnlockTechPacket(playerClient, reader); break;
               case ClientPacketType.structureUninteract:           processStructureUninteractPacket(playerClient, reader); break;
               case ClientPacketType.recruitTribesman:              processRecruitTribesmanPacket(playerClient, reader); break;
               case ClientPacketType.respondToTitleOffer:           processRespondToTitleOfferPacket(playerClient, reader); break;
               case ClientPacketType.devGiveTitle:                  processDevGiveTitlePacket(playerClient, reader); break;
               case ClientPacketType.devRemoveTitle:                processDevRemoveTitlePacket(playerClient, reader); break;
               case ClientPacketType.devCreateTribe:                processDevCreateTribePacket(); break;
               case ClientPacketType.devChangeTribeType:            processDevChangeTribeTypePacket(reader); break;
               case ClientPacketType.terminalCommand:               processCommandPacket(playerClient, reader); break;
               case ClientPacketType.startEntityInteraction:        processStartEntityInteractionPacket(playerClient, reader); break;
               case ClientPacketType.endEntityInteraction:          processEndEntityInteractionPacket(playerClient, reader); break;
               case ClientPacketType.screenResize:                  processScreenResizePacket(playerClient, reader); break;
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

         // Add newly visible entities
         for (const entity of visibleEntities) {
            if (!playerClient.visibleEntities.has(entity)) {
               entitiesToSend.add(entity);
            }
         }

         // Add removed entities - any entity that was previously visible but no longer.
         const removedEntities = new Array<Entity>();
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
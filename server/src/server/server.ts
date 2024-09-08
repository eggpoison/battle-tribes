import { VisibleChunkBounds } from "webgl-test-shared/dist/client-server-types";
import { Settings } from "webgl-test-shared/dist/settings";
import { TribeType } from "webgl-test-shared/dist/tribes";
import { Point, randInt } from "webgl-test-shared/dist/utils";
import { PacketReader, PacketType } from "webgl-test-shared/dist/packets";
import express from "express";
import WebSocket, { Server } from "ws";
import Board from "../Board";
import { runSpawnAttempt, spawnInitialEntities } from "../entity-spawning";
import Tribe from "../Tribe";
import OPTIONS from "../options";
import SRandom from "../SRandom";
import { updateDynamicPathfindingNodes } from "../pathfinding";
import { updateResourceDistributions } from "../resource-distributions";
import { updateGrassBlockers } from "../grass-blockers";
import { createGameDataPacket, createSyncDataPacket, createSyncPacket } from "./game-data-packets";
import PlayerClient, { PlayerClientVars } from "./PlayerClient";
import { addPlayerClient, generatePlayerSpawnPosition, getPlayerClients, resetDirtyEntities } from "./player-clients";
import { createPlayerConfig } from "../entities/tribes/player";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { createEntityFromConfig } from "../Entity";
import { generateGrassStrands } from "../world-generation/grass-generation";
import { processDevGiveItemPacket, processPlayerAttackPacket, processPlayerDataPacket, processRespawnPacket, processStopItemUsePacket, processUseItemPacket } from "./packet-processing";
import { EntityID } from "webgl-test-shared/dist/entities";
import { SpikesComponentArray } from "../components/SpikesComponent";
import { TribeComponentArray } from "../components/TribeComponent";
import { TransformComponentArray } from "../components/TransformComponent";
import { generateDecorations } from "../world-generation/decoration-generation";
import { generateReeds } from "../world-generation/reed-generation";
import generateTerrain from "../world-generation/terrain-generation";
import { generateLilypads } from "../world-generation/lilypad-generation";
import { forceMaxGrowAllIceSpikes } from "../components/IceSpikesComponent";
import { sortComponentArrays } from "../components/ComponentArray";
import { createCactusConfig } from "../entities/resources/cactus";

/*

Reference for future self:
node --prof-process isolate-0xnnnnnnnnnnnn-v8.log > processed.txt

*/

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

const getPlayerVisibleEntities = (playerClient: PlayerClient): Set<EntityID> => {
   const entities = new Set<EntityID>();
      
   // @Copynpaste
   const minVisibleX = playerClient.lastPlayerPositionX - playerClient.screenWidth * 0.5 - PlayerClientVars.VIEW_PADDING;
   const maxVisibleX = playerClient.lastPlayerPositionX + playerClient.screenWidth * 0.5 + PlayerClientVars.VIEW_PADDING;
   const minVisibleY = playerClient.lastPlayerPositionY - playerClient.screenHeight * 0.5 - PlayerClientVars.VIEW_PADDING;
   const maxVisibleY = playerClient.lastPlayerPositionY + playerClient.screenHeight * 0.5 + PlayerClientVars.VIEW_PADDING;
   
   for (let chunkX = playerClient.visibleChunkBounds[0]; chunkX <= playerClient.visibleChunkBounds[1]; chunkX++) {
      for (let chunkY = playerClient.visibleChunkBounds[2]; chunkY <= playerClient.visibleChunkBounds[3]; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            if (entityIsHiddenFromPlayer(entity, playerClient.tribe)) {
               continue;
            }

            const transformComponent = TransformComponentArray.getComponent(entity);
            if (transformComponent.boundingAreaMinX <= maxVisibleX && transformComponent.boundingAreaMaxX >= minVisibleX && transformComponent.boundingAreaMinY <= maxVisibleY && transformComponent.boundingAreaMaxY >= minVisibleY) {
               entities.add(entity);
            }
         }
      }
   }

   return entities;
}

const estimateVisibleChunkBounds = (spawnPosition: Point, screenWidth: number, screenHeight: number): VisibleChunkBounds => {
   const zoom = 1;

   const halfScreenWidth = screenWidth * 0.5;
   const halfScreenHeight = screenHeight * 0.5;
   
   const minChunkX = Math.max(Math.floor((spawnPosition.x - halfScreenWidth / zoom) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((spawnPosition.x + halfScreenWidth / zoom) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((spawnPosition.y - halfScreenHeight / zoom) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((spawnPosition.y + halfScreenHeight / zoom) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);

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

   private nextTickTime = 0;
   
   public setTrackedGameObject(id: number): void {
      SERVER.trackedEntityID = id;
   }

   public async start(): Promise<void> {
      // Seed the random number generator
      if (OPTIONS.inBenchmarkMode) {
         SRandom.seed(40404040404);
      } else {
         SRandom.seed(randInt(0, 9999999999));
      }

      // Setup
      sortComponentArrays();
      const generationInfo = generateTerrain();
      Board.setup(generationInfo);
      updateResourceDistributions();
      spawnInitialEntities();
      forceMaxGrowAllIceSpikes();
      generateGrassStrands();
      generateDecorations();
      generateReeds(generationInfo.riverMainTiles);
      generateLilypads();

      this.server = new Server({
         port: Settings.SERVER_PORT
      });

      // Handle player connections
      this.server.on("connection", (socket: WebSocket) => {
         let playerClient: PlayerClient;
         
         socket.on("message", (message: Buffer) => {
            const reader = new PacketReader(message.buffer, 6);
            const packetType = reader.readNumber() as PacketType;

            switch (packetType) {
               case PacketType.initialPlayerData: {
                  const username = reader.readString(24);
                  const tribeType = reader.readNumber() as TribeType;
                  const screenWidth = reader.readNumber();
                  const screenHeight = reader.readNumber();

                  const spawnPosition = generatePlayerSpawnPosition(tribeType);
                  // @Incomplete? Unused?
                  const visibleChunkBounds = estimateVisibleChunkBounds(spawnPosition, screenWidth, screenHeight);
      
                  const tribe = new Tribe(tribeType, false);
      
                  const config = createPlayerConfig();
                  config[ServerComponentType.transform].position.x = spawnPosition.x;
                  config[ServerComponentType.transform].position.y = spawnPosition.y;
                  config[ServerComponentType.tribe].tribe = tribe;
                  config[ServerComponentType.player].username = username;
                  const player = createEntityFromConfig(config);
      
                  playerClient = new PlayerClient(socket, tribe, screenWidth, screenHeight, spawnPosition, player, username);
                  addPlayerClient(playerClient, player, config);

                  setTimeout(() => {
                     const config = createCactusConfig();
                     config[ServerComponentType.transform].position.x = spawnPosition.x + 200;
                     config[ServerComponentType.transform].position.y = spawnPosition.y;
                     createEntityFromConfig(config);
                  }, 1000);

                  break;
               }
               case PacketType.playerData: {
                  processPlayerDataPacket(playerClient, reader);
                  break;
               }
               case PacketType.activate: {
                  playerClient.clientIsActive = true;
                  break;
               }
               case PacketType.syncRequest: {
                  if (Board.hasEntity(playerClient.instance)) {
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
               case PacketType.useItem: {
                  processUseItemPacket(playerClient, reader);
                  break;
               }
               case PacketType.stopItemUse: {
                  processStopItemUsePacket(playerClient);
                  break;
               }
               default: {
                  console.log("Unknown packet type: " + packetType);
               }
            }
         });
      });
      
      // if (SERVER.io === null) {
      //    // Start the server
      //    // SERVER.io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(Settings.SERVER_PORT);
      //    SERVER.io = new Server(Settings.SERVER_PORT, { transports: ["websocket"], allowUpgrades: false });
      //    SERVER.handlePlayerConnections();
      //    console.log("Server started on port " + Settings.SERVER_PORT);
      // }

      SERVER.isRunning = true;
      
      if (typeof SERVER.tickInterval === "undefined") {
         console.log("Server started on port " + Settings.SERVER_PORT);
         while (SERVER.isRunning) {
            await SERVER.tick();
         }
      }
   }

   private async tick(): Promise<void> {
      // These are done before each tick to account for player packets causing entities to be removed/added between ticks.
      Board.pushJoinBuffer();
      Board.destroyFlaggedEntities();

      if (this.isSimulating) {
         Board.updateTribes();
         
         updateGrassBlockers();
         
         Board.updateEntities();
         updateDynamicPathfindingNodes();
         Board.resolveEntityCollisions();
         
         runSpawnAttempt();
         
         Board.pushJoinBuffer();
         Board.destroyFlaggedEntities();
         // @Bug @Incomplete: Called twice!!!!
         Board.updateTribes();
      }

      await this.sendGameDataPackets();

      // Update server ticks and time
      // This is done at the end of the tick so that information sent by players is associated with the next tick to run
      Board.ticks++;
      Board.time += Settings.TIME_PASS_RATE / Settings.TPS / 3600;
      if (Board.time >= 24) {
         Board.time -= 24;
      }

      if (Board.ticks % Settings.TPS === 0) {
         updateResourceDistributions();
      }
   }

   // @Cleanup: maybe move this function to player-clients?
   /** Send data about the server to all players */
   public async sendGameDataPackets(): Promise<void> {
      if (this.server === null) return;
      
      return new Promise(async resolve => {
         const currentTime = performance.now();
         while (this.nextTickTime < currentTime) {
            this.nextTickTime += 1000 * Settings.I_TPS;
         }
         
         // @Speed: use while loop instead maybe?
         await (() => {
            return new Promise<void>(resolve => {
               // console.log(currentTime, this.nextTickTime, OPTIONS.warp ? 2 : this.nextTickTime - currentTime);
               setTimeout(() => {
                  resolve();
               }, OPTIONS.warp ? 2 : this.nextTickTime - currentTime);
            })
         })();

         // setTimeout(() => {
         // @Cleanup: should this all be in this file?
            const playerClients = getPlayerClients();
            for (let i = 0; i < playerClients.length; i++) {
               const playerClient = playerClients[i];
               if (!playerClient.clientIsActive) {
                  continue;
               }

               // Update player client position if player is alive
               if (Board.hasEntity(playerClient.instance)) {
                  const transformComponent = TransformComponentArray.getComponent(playerClient.instance);
                  playerClient.lastPlayerPositionX = transformComponent.position.x;
                  playerClient.lastPlayerPositionY = transformComponent.position.y;
               }

               // @Incomplete?
               // @Speed @Memory
               const extendedVisibleChunkBounds: VisibleChunkBounds = [
                  Math.max(playerClient.visibleChunkBounds[0] - 1, 0),
                  Math.min(playerClient.visibleChunkBounds[1] + 1, Settings.BOARD_SIZE - 1),
                  Math.max(playerClient.visibleChunkBounds[2] - 1, 0),
                  Math.min(playerClient.visibleChunkBounds[3] + 1, Settings.BOARD_SIZE - 1)
               ];
            
               const visibleEntities = getPlayerVisibleEntities(playerClient);
               
               const entitiesToSend = new Set<EntityID>();

               // Send all newly visible entities
               // @Speed
               for (const visibleEntity of visibleEntities) {
                  if (!playerClient.visibleEntities.has(visibleEntity)) {
                     entitiesToSend.add(visibleEntity);
                  }
               }

               // Send dirty entities
               for (const entity of playerClient.visibleDirtiedEntities) {
                  // Sometimes entities are simultaneously removed from the board and on the visible dirtied list, this catches that
                  if (Board.hasEntity(entity)) {
                     entitiesToSend.add(entity);
                  }
               }

               // Always send the player's data (if alive)
               if (Board.hasEntity(playerClient.instance)) {
                  entitiesToSend.add(playerClient.instance);
               }
               
               // Send the game data to the player
               const gameDataPacket = createGameDataPacket(playerClient, entitiesToSend);
               playerClient.socket.send(gameDataPacket);

               playerClient.visibleEntities = visibleEntities;
   
               // @Cleanup: should these be here?
               playerClient.visibleHits = [];
               playerClient.playerKnockbacks = [];
               playerClient.heals = [];
               playerClient.orbCompletes = [];
               playerClient.hasPickedUpItem = false;
               playerClient.entityTickEvents = [];
               playerClient.visibleDirtiedEntities = [];
            }

            // console.log(performance.now());
            resetDirtyEntities();

            resolve();
         // }, this.nextTickTime - currentTime);
      });
   }
}

export const SERVER = new GameServer();
SERVER.start();
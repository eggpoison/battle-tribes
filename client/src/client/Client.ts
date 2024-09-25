import { BuildingPlanData, PotentialBuildingPlanData, TribeWallData } from "battletribes-shared/ai-building-types";
import { CircularHitboxData, GameDataPacket, RectangularHitboxData, ServerTileUpdateData } from "battletribes-shared/client-server-types";
import { distance, Point } from "battletribes-shared/utils";
import { Settings } from "battletribes-shared/settings";
import { BlueprintType, ServerComponentType } from "battletribes-shared/components";
import { PlayerTribeData, TechID } from "battletribes-shared/techs";
import { STRUCTURE_TYPES } from "battletribes-shared/structures";
import { TribeType } from "battletribes-shared/tribes";
import { TribesmanTitle } from "battletribes-shared/titles";
import Player from "../entities/Player";
import Game from "../Game";
import { Tile } from "../Tile";
import { gameScreenSetIsDead } from "../components/game/GameScreen";
import { HealthBar_setHasFrostShield } from "../components/game/HealthBar";
import Camera from "../Camera";
import { isDev } from "../utils";
import { updateRenderChunkFromTileUpdate } from "../rendering/render-chunks";
import Board from "../Board";
import { definiteGameState, latencyGameState } from "../game-state/game-states";
import { createDamageNumber, createHealNumber, createResearchNumber, setVisibleBuildingSafetys } from "../text-canvas";
import { playSound } from "../sound";
import { updateTechTree } from "../components/game/tech-tree/TechTree";
import { TechInfocard_setSelectedTech } from "../components/game/TechInfocard";
import { setVisiblePathfindingNodeOccupances } from "../rendering/webgl/pathfinding-node-rendering";
import { setVisibleSafetyNodes } from "../rendering/webgl/safety-node-rendering";
import { setVisibleRestrictedBuildingAreas } from "../rendering/webgl/restricted-building-areas-rendering";
import { setVisibleWallConnections } from "../rendering/webgl/wall-connection-rendering";
import { Infocards_setTitleOffer } from "../components/game/infocards/Infocards";
import { GrassBlocker } from "battletribes-shared/grass-blockers";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { windowHeight, windowWidth } from "../webgl";
import { EntitySummonPacket } from "battletribes-shared/dev-packets";
import { InventoryName } from "battletribes-shared/items/items";
import { closeCurrentMenu } from "../menus";
import { TribesTab_refresh } from "../components/game/dev/tabs/TribesTab";
import { processTickEvents } from "../entity-tick-events";
import { Packet, PacketReader, PacketType } from "battletribes-shared/packets";
import { InitialGameDataPacket, processInitialGameDataPacket, processRespawnDataPacket, processSyncDataPacket } from "./packet-processing";
import { createActivatePacket, createPlayerDataPacket, createSyncRequestPacket } from "./packet-creation";
import Tribe from "../Tribe";
import { createHitbox, Hitbox } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { AppState } from "../components/App";
import { LoadingScreenStatus } from "../components/LoadingScreen";

export type GameData = {
   readonly gameTicks: number;
   readonly tiles: Array<Array<Tile>>;
   readonly playerID: number;
}

let visibleWalls: ReadonlyArray<TribeWallData>;
let buildingPlans: ReadonlyArray<BuildingPlanData>;

let queuedGameDataPackets = new Array<PacketReader>();

export function getQueuedGameDataPackets(): Array<PacketReader> {
   return queuedGameDataPackets;
}

export function getVisibleWalls(): ReadonlyArray<TribeWallData> {
   return visibleWalls;
}

export function getVisibleBuildingPlans(): ReadonlyArray<BuildingPlanData> {
   return buildingPlans;
}

export function getHoveredBuildingPlan(): BuildingPlanData | null {
   if (Game.cursorPositionX === null || Game.cursorPositionY === null) {
      return null;
   }
   
   let minDist = 64;
   let closestPlanToCursor: BuildingPlanData | null = null;
   for (let i = 0; i < buildingPlans.length; i++) {
      const plan = buildingPlans[i];
      
      const cursorDist = distance(plan.x, plan.y, Game.cursorPositionX, Game.cursorPositionY);
      if (cursorDist < minDist) {
         minDist = cursorDist;
         closestPlanToCursor = plan;
      }
   }

   return closestPlanToCursor;
}

export interface PotentialPlanStats {
   readonly minSafety: number;
   readonly maxSafety: number;
}

export function getPotentialPlanStats(potentialPlans: ReadonlyArray<PotentialBuildingPlanData>): PotentialPlanStats {
   const firstPlan = potentialPlans[0];
   let minPlanSafety = firstPlan.safety;
   let maxPlanSafety = firstPlan.safety;
   for (let i = 1; i < potentialPlans.length; i++) {
      const potentialPlan = potentialPlans[i];
      if (potentialPlan.safety < minPlanSafety) {
         minPlanSafety = potentialPlan.safety;
      } else if (potentialPlan.safety > maxPlanSafety) {
         maxPlanSafety = potentialPlan.safety;
      }
   }

   return {
      minSafety: minPlanSafety,
      maxSafety: maxPlanSafety
   };
}

export function calculatePotentialPlanIdealness(potentialPlan: PotentialBuildingPlanData, potentialPlanStats: PotentialPlanStats): number {
   let idealness = (potentialPlan.safety - potentialPlanStats.minSafety) / (potentialPlanStats.maxSafety - potentialPlanStats.minSafety);
   if (isNaN(idealness)) {
      idealness = 1;
   }
   return idealness;
}

// @Cleanup
let grassBlockers: ReadonlyArray<GrassBlocker>;
export function getGrassBlockers(): ReadonlyArray<GrassBlocker> {
   return grassBlockers;
}

// @Cleanup: put these 2 in a more appropriate file

export function createCircularHitboxFromData(data: CircularHitboxData): Hitbox {
   const offset = new Point(data.offsetX, data.offsetY);
   const box = new CircularBox(offset, 0, data.radius);
   return createHitbox(box, data.mass, data.collisionType, data.collisionBit, data.collisionMask, data.flags);
}

export function createRectangularHitboxFromData(data: RectangularHitboxData): Hitbox {
   const offset = new Point(data.offsetX, data.offsetY);
   const box = new RectangularBox(offset, data.width, data.height, data.rotation);
   return createHitbox(box, data.mass, data.collisionType, data.collisionBit, data.collisionMask, data.flags);
}

// @Cleanup: De-singleton-ify
abstract class Client {
   private static socket: WebSocket | null = null;

   public static initialGameDataResolve: ((value: InitialGameDataPacket) => void) | null = null;
   public static nextGameDataResolve: ((value: PacketReader) => void) | null = null;

   public static connectToServer(setAppState: (appState: AppState) => void, setLoadingScreenStatus: (status: LoadingScreenStatus) => void): Promise<boolean> {
      return new Promise(resolve => {
         this.socket = new WebSocket(`ws://10.0.0.15:${Settings.SERVER_PORT}`);
         // this.socket = new WebSocket(`ws://localhost:${Settings.SERVER_PORT}`);
         this.socket.binaryType = "arraybuffer";

         this.socket.onopen = () => {
            resolve(true);
         }

         // When the connection to the server fails
         this.socket.onclose = () => {
            // @Incomplete
            // // Don't show a connection error if the socket was disconnected manually
            // if (disconnectReason === "io client disconnect") return;

            Game.isRunning = false;
            
            setLoadingScreenStatus(LoadingScreenStatus.connectionError);
            setAppState(AppState.loading);

            Player.instance = null;
         }

         this.socket.onmessage = (message): void => {
            const reader = new PacketReader(message.data, 0);
            
            const packetType = reader.readNumber() as PacketType;
            switch (packetType) {
               case PacketType.initialGameData: {
                  if (this.initialGameDataResolve !== null) {
                     const initialGameDataPacket = processInitialGameDataPacket(reader);
                     this.initialGameDataResolve(initialGameDataPacket);
                     this.initialGameDataResolve = null;
                  }
                  break;
               }
               case PacketType.gameData: {
                  if (this.nextGameDataResolve !== null) {
                     this.nextGameDataResolve(reader);
                     this.nextGameDataResolve = null;
                     return;
                  }

                  // Only unload game packets when the game is running
                  if (!Game.isRunning || !Game.isSynced || document.visibilityState === "hidden") {
                     return;
                  }

                  queuedGameDataPackets.push(reader);

                  break;
               }
               case PacketType.syncData: {
                  processSyncDataPacket(reader);
                  break;
               }
               case PacketType.sync: {
                  Game.sync();
                  break;
               }
               case PacketType.respawnData: {
                  processRespawnDataPacket(reader);
                  break;
               }
            }
         }

         // let socketAlreadyExists = false;

         // // Don't add events if the socket already exists
         // if (this.socket !== null) {
         //    socketAlreadyExists = true;
            
         //    // Reconnect
         //    if (!this.socket.connected) {
         //       this.socket.connect();
         //    }

         //    this.socket.off("connect");
         //    this.socket.off("connect_error");
         // } else {
         //    // Create the socket
         //    this.socket = this.createSocket();
         //    this.socket.connect();
         // }

         // // If connection was successful, return true
         // this.socket.on("connect", () => {
         //    resolve(true);
         // });
         // // If couldn't connect to server, return false
         // this.socket.on("connect_error", (err) => {
         //    console.log(err);
         //    resolve(false);
         // });
         
         // if (!socketAlreadyExists) {
         //    this.socket.on("game_data_packet", gameDataPacket => {
         //       // Only unload game packets when the game is running
         //       if (Game.getIsPaused() || !Game.isRunning || !Game.isSynced || document.visibilityState === "hidden") return;

         //       registerServerTick();

         //       Game.queuedPackets.push(gameDataPacket);
         //    });

         //    this.socket.on("game_data_sync_packet", (gameDataSyncPacket: GameDataSyncPacket) => {
         //       this.registerGameDataSyncPacket(gameDataSyncPacket);
         //    });

         //    this.socket.on("force_position_update", (position: [number, number]): void => {
         //       if (Player.instance !== null) {
         //          const transformComponent = Player.instance.getServerComponent(ServerComponentType.transform);
         //          transformComponent.position.x = position[0];
         //          transformComponent.position.y = position[1];
         //       }
         //    })
         // }
      });
   }

   // public static async requestInitialGameData(): Promise<InitialGameDataPacket> {
   //    return new Promise(resolve => {
   //       if (this.socket === null) throw new Error("Socket hadn't been created when requesting game data")

   //       this.socket.emit("initial_game_data_request");
         
   //       this.socket.off("initial_game_data_packet");
   //       this.socket.on("initial_game_data_packet", (initialGameDataPacket: InitialGameDataPacket) => {
   //          resolve(initialGameDataPacket);
   //       });
   //    });
   // }

   // @Hack
   public static getInitialGameDataPacket(): Promise<InitialGameDataPacket> {
      return new Promise(resolve => {
         Client.initialGameDataResolve = resolve;
      });
   }

   // @Hack
   public static getNextGameDataPacket(): Promise<PacketReader> {
      return new Promise(resolve => {
         Client.nextGameDataResolve = resolve;
      })
   }

   public static disconnect(): void {
      if (this.socket === null) {
         throw new Error("Tried to disconnect a socket which doesn't exist");
      }

      this.socket.close();
      this.socket = null;
   }

   public static processGameDataPacket(gameDataPacket: GameDataPacket): void {
      if (isDev()) {
         Game.setGameObjectDebugData(gameDataPacket.entityDebugData);
      }

      // this.updateTribe(gameDataPacket.playerTribeData);
      // Game.enemyTribes = gameDataPacket.enemyTribesData;
      // @Hack: shouldn't do always
      TribesTab_refresh();

      Infocards_setTitleOffer(gameDataPacket.titleOffer);

      processTickEvents(gameDataPacket.tickEvents);

      // this.updateEntities(gameDataPacket.entityDataArray, gameDataPacket.visibleEntityDeathIDs);
      
      this.registerTileUpdates(gameDataPacket.tileUpdates);

      HealthBar_setHasFrostShield(gameDataPacket.hasFrostShield);

      // Register hits
      for (const hitData of gameDataPacket.visibleHits) {
         // Register hit
         const hitEntity = Board.entityRecord[hitData.hitEntityID];
         if (typeof hitEntity !== "undefined") {
            if (hitData.attackEffectiveness === AttackEffectiveness.stopped) {
               hitEntity.registerStoppedHit(hitData);
            } else {
               hitEntity.registerHit(hitData);
            }
         }

         if (hitData.damage > 0 && hitData.shouldShowDamageNumber) {
            createDamageNumber(hitData.hitPosition[0], hitData.hitPosition[1], hitData.damage);
         }
      }

      if (Player.instance !== null) {
         const physicsComponent = Player.instance.getServerComponent(ServerComponentType.physics);
         // Register player knockback
         for (let i = 0; i < gameDataPacket.playerKnockbacks.length; i++) {
            const knockbackData = gameDataPacket.playerKnockbacks[i];
            
            physicsComponent.selfVelocity.x *= 0.5;
            physicsComponent.selfVelocity.y *= 0.5;
   
            physicsComponent.selfVelocity.x += knockbackData.knockback * Math.sin(knockbackData.knockbackDirection);
            physicsComponent.selfVelocity.y += knockbackData.knockback * Math.cos(knockbackData.knockbackDirection);
         }
      }

      // Register heals
      for (const healData of gameDataPacket.heals) {
         if (healData.healAmount === 0) {
            continue;
         }

         if (Player.instance !== null && healData.healerID === Player.instance.id) {
            createHealNumber(healData.healedID, healData.entityPositionX, healData.entityPositionY, healData.healAmount);
         }

         const healedEntity = Board.entityRecord[healData.healedID];
         if (typeof healedEntity !== "undefined") {
            healedEntity.createHealingParticles(healData.healAmount);

            // @Hack @Incomplete: This will trigger the repair sound effect even if a hammer isn't the one healing the structure
            if (STRUCTURE_TYPES.includes(healedEntity.type as any)) { // @Cleanup
               playSound("repair.mp3", 0.4, 1, new Point(healData.entityPositionX, healData.entityPositionY));
            }
         }
      }

      // Register orb completes
      for (const orbCompleteData of gameDataPacket.orbCompletes) {
         createResearchNumber(orbCompleteData.x, orbCompleteData.y, orbCompleteData.amount);
      }

      if (gameDataPacket.pickedUpItem) {
         playSound("item-pickup.mp3", 0.3, 1, Camera.position);
      }

      if (typeof gameDataPacket.hotbarCrossbowLoadProgressRecord !== "undefined") {
         definiteGameState.hotbarCrossbowLoadProgressRecord = gameDataPacket.hotbarCrossbowLoadProgressRecord;
      }

      setVisiblePathfindingNodeOccupances(gameDataPacket.visiblePathfindingNodeOccupances);
      setVisibleSafetyNodes(gameDataPacket.visibleSafetyNodes);
      setVisibleBuildingSafetys(gameDataPacket.visibleBuildingSafetys);
      setVisibleRestrictedBuildingAreas(gameDataPacket.visibleRestrictedBuildingAreas);
      setVisibleWallConnections(gameDataPacket.visibleWallConnections);

      buildingPlans = gameDataPacket.visibleBuildingPlans;
      visibleWalls = gameDataPacket.visibleWalls;
      grassBlockers = gameDataPacket.visibleGrassBlockers;
   }

   public static updateTribe(tribeData: PlayerTribeData): void {
      // @Cleanup: the compile time type of Game.tribe is never undefined
      if (typeof Game.tribe === "undefined") {
         Game.tribe = new Tribe(tribeData.name, tribeData.id, tribeData.tribeType, tribeData.numHuts);
      }

      if (tribeData.unlockedTechs.length > Game.tribe.unlockedTechs.length) {
         // @Incomplete: attach to camera so it doesn't decrease in loudness. Or make 'global sounds'
         playSound("research.mp3", 0.4, 1, Camera.position);
      }
      
      Game.tribe.hasTotem = tribeData.hasTotem;
      Game.tribe.numHuts = tribeData.numHuts;
      Game.tribe.selectedTechID = tribeData.selectedTechID;
      Game.tribe.unlockedTechs = tribeData.unlockedTechs;
      Game.tribe.techTreeUnlockProgress = tribeData.techTreeUnlockProgress;

      updateTechTree();
      TechInfocard_setSelectedTech(Game.tribe.selectedTechID);
   }
   
   private static registerTileUpdates(tileUpdates: ReadonlyArray<ServerTileUpdateData>): void {
      for (const tileUpdate of tileUpdates) {
         const tileX = tileUpdate.tileIndex % Settings.BOARD_DIMENSIONS;
         const tileY = Math.floor(tileUpdate.tileIndex / Settings.BOARD_DIMENSIONS);
         const tile = Board.getTile(tileX, tileY);
         tile.type = tileUpdate.type;
         tile.isWall = tileUpdate.isWall;
         
         updateRenderChunkFromTileUpdate(tileUpdate);
      }
   }

   // @Incomplete
   public static sendChatMessage(message: string): void {
      // Send the chat message to the server
      if (this.socket !== null) {
         // this.socket.emit("chat_message", message);
      }
   }

   public static sendInitialPlayerData(username: string, tribeType: TribeType): void {
      // Send player data to the server
      if (this.socket !== null) {
         const maxUsernameUInt8Length = 24;
         
         const packet = new Packet(PacketType.initialPlayerData, Float32Array.BYTES_PER_ELEMENT * 4 + Float32Array.BYTES_PER_ELEMENT + maxUsernameUInt8Length);
         packet.addString(username, maxUsernameUInt8Length);
         packet.addNumber(tribeType);
         packet.addNumber(windowWidth);
         packet.addNumber(windowHeight);

         this.socket.send(packet.buffer);
      }
   }

   public static sendPlayerDataPacket(): void {
      if (Game.isRunning && this.socket !== null && Player.instance !== null) {
         const buffer = createPlayerDataPacket();
         this.socket.send(buffer);
      }
   }

   public static sendCraftingPacket(recipeIndex: number): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("crafting_packet", recipeIndex);
      }
   }

   public static sendHeldItemDropPacket(dropAmount: number, dropDirection: number): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("held_item_drop", dropAmount, dropDirection);
      }
   }

   public static sendDeactivatePacket(): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("deactivate");
      }
   }

   public static sendActivatePacket(): void {
      if (this.socket !== null) {
         const buffer = createActivatePacket();
         this.socket.send(buffer);
      }
   }

   public static sendSyncRequestPacket(): void {
      if (Game.isRunning && this.socket !== null) {
         const buffer = createSyncRequestPacket();
         this.socket.send(buffer);
      }
   }

   public static sendCommand(command: string): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("command", command);
      }
   }

   public static sendTrackEntity(id: number): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("track_game_object", id);
      }
   }

   public static killPlayer(): void {
      // Remove the player from the game
      Board.removeEntity(Player.instance!, true);
      Player.instance = null;

      latencyGameState.resetFlags();
      definiteGameState.resetFlags();

      gameScreenSetIsDead(true);
      closeCurrentMenu();
   }

   public static sendPacket(data: ArrayBuffer): void {
      if (Game.isRunning && this.socket !== null) {
         this.socket.send(data);
      }
   }

   public static sendSelectTech(techID: TechID): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("select_tech", techID);
      }
   }

   public static sendUnlockTech(techID: TechID): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("unlock_tech", techID);
      }
   }

   public static sendForceUnlockTech(techID: TechID): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("force_unlock_tech", techID);
      }
   }

   public static sendStudyTech(studyAmount: number): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("study_tech", studyAmount);
      }
   }

   // @Cleanup: either make this.socket always not null or use a decorator.

   public static sendPlaceBlueprint(structureID: number, blueprintType: BlueprintType): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("place_blueprint", structureID, blueprintType);
      }
   }

   public static sendModifyBuilding(structureID: number, data: number): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("modify_building", structureID, data);
      }
   }

   public static sendDeconstructBuilding(structureID: number): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("deconstruct_building", structureID);
      }
   }

   public static sendStructureInteract(structureID: number, interactData: number): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("structure_interact", structureID, interactData);
      }
   }

   public static sendStructureUninteract(structureID: number): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("structure_uninteract", structureID);
      }
   }

   public static sendRecruitTribesman(tribesmanID: number): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("recruit_tribesman", tribesmanID);
      }
   }

   public static respondToTitleOffer(title: TribesmanTitle, isAccepted: boolean): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("respond_to_title_offer", title, isAccepted);
      }
   }

   public static sendEntitySummonPacket(summonPacket: EntitySummonPacket): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("dev_summon_entity", summonPacket);
      }
   }

   public static sendDevGiveTitlePacket(title: TribesmanTitle): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("dev_give_title", title);
      }
   }

   public static sendDevRemoveTitlePacket(title: TribesmanTitle): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("dev_remove_title", title);
      }
   }

   public static sendDevPauseSimulation(): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("dev_pause_simulation");
      }
   }

   public static sendDevUnpauseSimulation(): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("dev_unpause_simulation");
      }
   }

   public static sendDevCreateTribe(): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("dev_create_tribe");
      }
   }

   public static sendDevChangeTribeType(tribeID: number, newTribeType: TribeType): void {
      if (Game.isRunning && this.socket !== null) {
         // this.socket.emit("dev_change_tribe_type", tribeID, newTribeType);
      }
   }
}

export default Client;
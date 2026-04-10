import { Settings } from "webgl-test-shared";
import Board from "./Board";
import { updateTextNumbers } from "./text-canvas";
import { resizeCanvas } from "./webgl";
import { createAudioContext, getNumSounds, playRiverSounds, updateSounds } from "./sound";
import { attemptToResearch, updateResearchOrb } from "./research";
import { updateEntitySelections } from "./entity-selection";
import { updateTechTreeItems } from "./rendering/webgl/tech-tree-item-rendering";
import { entityUsesClientInterp } from "./rendering/render-part-matrices";
import { createCollapseParticles } from "./collapses";
import { updateSlimeTrails } from "./rendering/webgl/slime-trail-rendering";
import { updateDebugEntity } from "./entity-debugging";
import { playerInstance, setIsSpectating, setPlayerInstance, setPlayerUsername, updatePlayerDirection } from "./player";
import { callEntityOnUpdateFunctions } from "./entity-components/ComponentArray";
import { resolvePlayerCollisions } from "./collision";
import { decodeSnapshotFromGameDataPacket, PacketSnapshot, updateGameStateToSnapshot } from "./networking/packet-snapshots";
import { sendActivatePacket, sendDeactivatePacket, sendInitialPlayerDataPacket, sendPlayerDataPacket, sendSyncRequestPacket } from "./networking/packet-sending";
import { processForcePositionUpdatePacket, processInitialGameDataPacket, processShieldKnockPacket, processSimulationStatusUpdatePacket, processSyncGameDataPacket, receiveChatMessagePacket } from "./networking/packet-receiving";
import { renderGame, setupRendering } from "./rendering/render";
import { processDevGameDataPacket } from "./networking/dev-packets";
import { LoadingScreenStage, loadingScreenState } from "../ui-state/loading-screen-state.svelte";
import { appState, AppState } from "../ui-state/app-state.svelte";
import { registerFrame, renderFrameGraph, resetFrameGraph } from "./rendering/webgl/frame-graph-rendering";
import { updateSpamFilter } from "./chat";
import { updatePlayerMovement } from "./player-action-handling";
import { PacketReader, PacketType, Packet, TribeType } from "webgl-test-shared";
import { debugDisplayState } from "../ui-state/debug-display-state.svelte";

const SNAPSHOT_BUFFER_LENGTH = 2;
/** The number of ticks it takes for the measured server packet interval to fully adjust (if going from a constant tps of A to a constant tps of B) */
const PACKET_INTERVAL_ADJUST_TIME = 10;

let socket: WebSocket | null = null;

export let gameIsRunning = false;
/** If the game has recevied up-to-date game data from the server. Set to false when paused */
// @Cleanup: unused???
let gameIsSynced = true;

// @Location: completely unused by all the client netcode stuff in here.
export let gameIsFocused = true;

let lastFrameTime = 0;

let clientTick = 0;
let clientTickInterp = 0;

// @Garbage: I could create a set fixed number of packet snapshots, and then just override their data!
const snapshotBuffer = new Array<PacketSnapshot>();
export let currentSnapshot: PacketSnapshot;
export let nextSnapshot: PacketSnapshot;

let lastPacketTime = 0;
let measuredServerPacketIntervalMS = 1000 / Settings.SERVER_PACKET_SEND_RATE; // Start it off at the value we expect it to be at

let playerPacketAccumulator = 0;

document.addEventListener("visibilitychange", () => {
   if (document.visibilityState === "visible") {
      gameIsFocused = true;
      lastPacketTime = performance.now();

      if (!gameIsSynced) {
         // @Investigate: what if this request fails??? This is the only request sent, so will the client just be stuck?
         sendSyncRequestPacket();
      }
   } else if (document.visibilityState === "hidden") {
      gameIsFocused = false;
      unsyncGame();
      sendDeactivatePacket();
   }
});

export function resyncGame(): void {
   gameIsSynced = true;
}

function unsyncGame(): void {
   gameIsSynced = false;
   // So that when the player returns to the game the dev frame graph doesn't show a maaassive frame
   resetFrameGraph();
}

const onSuccessfulConnection = (username: string, tribeType: TribeType, isSpectating: boolean): void => {
   loadingScreenState.setStage(LoadingScreenStage.sendingPlayerData);
   sendInitialPlayerDataPacket(username, tribeType, isSpectating);

   setPlayerUsername(username);
   setIsSpectating(isSpectating);
}

const onFailedConnection = (): void => {
   gameIsRunning = false;
   appState.setState(AppState.loading);
   loadingScreenState.setStage(LoadingScreenStage.connectionError);

   setPlayerInstance(null);
}

const startGame = (): void => {
   gameIsRunning = true;
   gameIsSynced = true;
   appState.setState(AppState.game);

   resizeCanvas();

   // Initial player direction
   updatePlayerDirection(0, 0);
            
   lastFrameTime = performance.now();
   requestAnimationFrame(runFrame);
}

export function quitGame(): void {
   gameIsRunning = false;
   appState.setState(AppState.mainMenu);
   
   if (socket !== null) {
      socket.close();
      socket = null;
   }
}

const onInitialGameDataPacket = async (reader: PacketReader): Promise<void> => {
   processInitialGameDataPacket(reader);
   
   // Initialise game

   loadingScreenState.setStage(LoadingScreenStage.initialisingGame);
   
   await setupRendering();
   
   sendActivatePacket();
}

const onPacket = (msg: MessageEvent): void => {
   const reader = new PacketReader(msg.data, 0);
   
   const packetType = reader.readNumber() as PacketType;
   switch (packetType) {
      case PacketType.initialGameData: onInitialGameDataPacket(reader); break;
      case PacketType.gameData: {
         if (!gameIsRunning && snapshotBuffer.length < SNAPSHOT_BUFFER_LENGTH) {
            if (typeof currentSnapshot === "undefined") {
               receiveInitialPacket(reader);
            } else {
               receivePacket(reader);
            }
            
            // Once enough packets are received to show the gameplay, start the game
            if (snapshotBuffer.length === SNAPSHOT_BUFFER_LENGTH) {
               startGame();
            }
         } else if (gameIsRunning && gameIsSynced) {
            receivePacket(reader);
         }
         break;
      }
      case PacketType.syncGameData: processSyncGameDataPacket(reader); break;
      case PacketType.forcePositionUpdate: processForcePositionUpdatePacket(reader); break;
      case PacketType.serverToClientChatMessage: receiveChatMessagePacket(reader); break;
      case PacketType.simulationStatusUpdate: processSimulationStatusUpdatePacket(reader); break;
      case PacketType.devGameData: processDevGameDataPacket(reader); break;
      case PacketType.shieldKnock: processShieldKnockPacket(); break;
   }
}

export function establishNetworkConnection(username: string, tribeType: TribeType, isSpectating: boolean): void {
   if (socket !== null) {
      return;
   }
   
   // @SQUEAM
   // socket = new WebSocket(`ws://10.0.0.10:${Settings.SERVER_PORT}`);
   socket = new WebSocket(`ws://127.0.0.1:${Settings.SERVER_PORT}`);
   // socket = new WebSocket(`ws://localhost:${Settings.SERVER_PORT}`);
   socket.binaryType = "arraybuffer";

   socket.onopen = () => onSuccessfulConnection(username, tribeType, isSpectating);
   socket.onclose = onFailedConnection;
   socket.onmessage = onPacket;

   // This is guaranteed to have occurred after a mouse press
   createAudioContext();
}

const receivePacket = (reader: PacketReader): PacketSnapshot => {
   const previousSnapshot = snapshotBuffer.length > 0 ? snapshotBuffer[snapshotBuffer.length - 1] : null;
   const snapshot = decodeSnapshotFromGameDataPacket(reader, previousSnapshot);
   
   snapshotBuffer.push(snapshot);
   debugDisplayState.snapshotBufferSize = snapshotBuffer.length;

   const timeNow = performance.now();
   
   const delta = timeNow - lastPacketTime;

   // Calculate new server packet interval using la "Exponential Moving Average"
   const smoothingFactor = 2 / (PACKET_INTERVAL_ADJUST_TIME + 1);
   measuredServerPacketIntervalMS = measuredServerPacketIntervalMS * (1 - smoothingFactor) + smoothingFactor * delta;
   debugDisplayState.measuredServerTPS = 1000 / measuredServerPacketIntervalMS;
   
   lastPacketTime = timeNow;

   return snapshot;
}

export function receiveInitialPacket(reader: PacketReader): void {
   lastPacketTime = performance.now();
   
   const snapshot = receivePacket(reader);

   updateGameStateToSnapshot(snapshot);
   currentSnapshot = snapshot;
   clientTick = snapshot.tick; // Start the client tick off at the tick of the very first packet received.
}

export function sendPacket(packet: Packet): void {
   if (socket !== null) {
      socket.send(packet.buffer);
   }
}

export function setCurrentSnapshot(snapshot: PacketSnapshot): void {
   currentSnapshot = snapshot;
   debugDisplayState.currentSnapshot = snapshot;
}

export function tickIntervalHasPassed(intervalSeconds: number): boolean {
   const currentTick = Math.floor(clientTick);
   
   const ticksPerInterval = intervalSeconds * Settings.TICK_RATE;
   
   const previousCheck = (currentTick - 1) / ticksPerInterval;
   const check = currentTick / ticksPerInterval;
   return Math.floor(previousCheck) !== Math.floor(check);
}

const runFrame = (frameStartTime: number): void => {
   const deltaTimeMS = frameStartTime - lastFrameTime;
   lastFrameTime = frameStartTime;

   // Calculate the client tick's error
   const serverTick = snapshotBuffer[snapshotBuffer.length - 1].tick;
   const delayTicks = serverTick - clientTick;
   const errorTicks = delayTicks + Settings.TICK_RATE / Settings.SERVER_PACKET_SEND_RATE;

   const timeDilationFactor = (errorTicks < -0.5 || errorTicks > 0.5) ? 1 + 0.15 * errorTicks : 1;
   
   // Delta tick accounting for the MEASURED tps of the server
   const deltaTick = deltaTimeMS / measuredServerPacketIntervalMS * Settings.TICK_RATE / Settings.SERVER_PACKET_SEND_RATE;

   clientTick += deltaTick * timeDilationFactor;
   
   // Calculate the subtick time to render at (render tick)
   const renderTick = clientTick - SNAPSHOT_BUFFER_LENGTH * Settings.TICK_RATE / Settings.SERVER_PACKET_SEND_RATE;

   // Make sure the current snapshot is the snapshot just below the currently rendered tick
   let i = 0;
   for (; i < snapshotBuffer.length; i++) {
      const snapshot = snapshotBuffer[i];
      if (snapshot.tick < renderTick) {
         if (snapshot.tick > currentSnapshot.tick) {
            updateGameStateToSnapshot(snapshot);
            currentSnapshot = snapshot;
         }
      } else {
         break;
      }
   }
   // Snapshots older than the current one are now useless
   if (i > 0) {
      snapshotBuffer.splice(0, i - 1);
   }
   debugDisplayState.snapshotBufferSize = snapshotBuffer.length;

   // @Cleanup kinda unclear at a glance
   nextSnapshot = (snapshotBuffer[snapshotBuffer.indexOf(currentSnapshot) + 1]) || currentSnapshot;

   const snapshotTickDiff = nextSnapshot.tick - currentSnapshot.tick;
   const serverTickInterp = snapshotTickDiff > 0 ? (renderTick - currentSnapshot.tick) / snapshotTickDiff : 0;

   // Send player packets to server
   playerPacketAccumulator += deltaTick;
   while (playerPacketAccumulator >= Settings.TICK_RATE / Settings.CLIENT_PACKET_SEND_RATE) {
      sendPlayerDataPacket();
      playerPacketAccumulator -= Settings.TICK_RATE / Settings.CLIENT_PACKET_SEND_RATE;
   }

   // Tick the player (independently from all other entities)
   // A loop to run at the proper tick rate
   clientTickInterp += deltaTick;
   while (clientTickInterp >= 1) {
      // Call this outside of the check which makes sure the player is in-client, cuz we want the movement intention to update too!
      updatePlayerMovement();
      
      // @Cleanup: this function name i think is a lil weird for something which the contents of the if updates the player.
      if (playerInstance !== null && entityUsesClientInterp(playerInstance)) {
         callEntityOnUpdateFunctions(playerInstance);
         resolvePlayerCollisions();
      }

      clientTickInterp--;

      // Tick all entities (cuz the client interp loop is based on the network update rate not the tick rate)
      Board.tickEntities();
      
      updateSpamFilter(deltaTimeMS);

      updateResearchOrb();
      attemptToResearch();

      updateEntitySelections();

      updateTechTreeItems();
      
      updateSounds();
      playRiverSounds();

      createCollapseParticles();
      updateSlimeTrails();

      updateDebugEntity();
   }

   if (gameIsSynced) {
      renderGame(clientTickInterp, serverTickInterp, deltaTimeMS);

      const frameEndTime = performance.now();
      registerFrame(frameStartTime, frameEndTime);

      renderFrameGraph(frameEndTime);
   }

   updateTextNumbers();
   Board.updateTickCallbacks();
   Board.updateParticles();

   if (gameIsRunning) {
      requestAnimationFrame(runFrame);
   }
}
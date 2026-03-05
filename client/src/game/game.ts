import { Settings } from "webgl-test-shared";
import { updateTextNumbers } from "./text-canvas";
import { resizeCanvas } from "./webgl";
import { playRiverSounds, updateSounds } from "./sound";
import { attemptToResearch, updateResearchOrb } from "./research";
import { updateEntitySelections } from "./entity-selection";
import { updateTechTreeItems } from "./rendering/webgl/tech-tree-item-rendering";
import { entityUsesClientInterp } from "./rendering/render-part-matrices";
import { createCollapseParticles } from "./collapses";
import { updateSlimeTrails } from "./rendering/webgl/slime-trail-rendering";
import { updateDebugEntity } from "./entity-debugging";
import { playerInstance, updatePlayerDirection } from "./player";
import { resolvePlayerCollisions } from "./collision";
import { decodeSnapshotFromGameDataPacket, PacketSnapshot, updateGameStateToSnapshot } from "./networking/packet-snapshots";
import { sendDeactivatePacket, sendSyncRequestPacket } from "./networking/packet-sending/packet-sending";
import { renderGame } from "./rendering/render";
import { registerFrame, renderFrameGraph, resetFrameGraph } from "./rendering/webgl/frame-graph-rendering";
import { updateSpamFilter } from "./chat";
import { updatePlayerMovement } from "./player-action-handling";
import { PacketReader } from "webgl-test-shared";
import { sendPlayerDataPacket } from "./networking/packet-sending/player-data-packet";
import { updateParticles } from "./rendering/webgl/particle-rendering";
import { callEntityOnUpdateFunctions } from "./entity-components/component-arrays";
import { debugInfoDisplay } from "../ui/game/dev/debug-info-display-funcs";
import { getComponentArrays } from "./entity-components/ComponentArray";
import { closeLoadingScreen } from "../ui/LoadingScreen";
import { openGameScreen } from "../ui/GameScreen";

interface TickCallback {
   time: number;
   readonly callback: () => void;
}

const SNAPSHOT_BUFFER_LENGTH = 2;
/** The number of ticks it takes for the measured server packet interval to fully adjust (if going from a constant tps of A to a constant tps of B) */
const PACKET_INTERVAL_ADJUST_TIME = 10;

export let gameIsRunning = false;

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

const tickCallbacks = new Array<TickCallback>();

document.addEventListener("visibilitychange", () => {
   if (document.visibilityState === "visible") {
      gameIsFocused = true;
      lastPacketTime = performance.now();

      if (!gameIsRunning) {
         // @Investigate: what if this request fails??? This is the only request sent, so will the client just be stuck?
         sendSyncRequestPacket();
      }
   } else { // Now hidden!
      gameIsFocused = false;
      unsyncGame();
      sendDeactivatePacket();
   }
});

export function resyncGame(): void {
   gameIsRunning = true;
}

function unsyncGame(): void {
   gameIsRunning = false;
   // @Cleanup: unnecessary??
   // So that when the player returns to the game the dev frame graph doesn't show a maaassive frame
   resetFrameGraph();
}

function startGame(): void {
   gameIsRunning = true;
   // @Cleanup weird to touch UI here. Also, this is redundant work if the game is resyncing instead of just starting.
   closeLoadingScreen();
   openGameScreen();

   resizeCanvas();

   // Initial player direction
   // @Cleanup: shouldn't this be the default state, and this be unnecessary?
   updatePlayerDirection(0, 0);
            
   lastFrameTime = performance.now();
   requestAnimationFrame(runFrame);
}

export function stopGame(): void {
   gameIsRunning = false;
}

function receivePacket(reader: PacketReader): void {
   const previousSnapshot = snapshotBuffer.length > 0 ? snapshotBuffer[snapshotBuffer.length - 1] : null;
   const snapshot = decodeSnapshotFromGameDataPacket(reader, previousSnapshot);
   
   snapshotBuffer.push(snapshot);
   debugInfoDisplay.updateSnapshotBufferSize(snapshotBuffer.length);

   const timeNow = performance.now();
   
   const delta = timeNow - lastPacketTime;

   // Calculate new server packet interval using la "Exponential Moving Average"
   const smoothingFactor = 2 / (PACKET_INTERVAL_ADJUST_TIME + 1);
   measuredServerPacketIntervalMS = measuredServerPacketIntervalMS * (1 - smoothingFactor) + smoothingFactor * delta;
   debugInfoDisplay.updateServerTPS(1000 / measuredServerPacketIntervalMS);
   
   lastPacketTime = timeNow;

   // First game packet
   if (typeof currentSnapshot === "undefined") {
      lastPacketTime = performance.now();
      // Set currentSnapshot, and the game state, to the first game packet received.
      updateGameStateToSnapshot(snapshot);
      clientTick = snapshot.tick; // Start the client tick off at the tick of the very first packet received.
   }
}

export function onGameDataPacket(reader: PacketReader): void {
   receivePacket(reader);
      
   // Once enough packets are received to show the gameplay, start the game
   if (!gameIsRunning && snapshotBuffer.length >= SNAPSHOT_BUFFER_LENGTH) {
      startGame();
   }
}

export function setCurrentSnapshot(snapshot: PacketSnapshot): void {
   currentSnapshot = snapshot;
   debugInfoDisplay.updateCurrentSnapshot(snapshot);
}

// @TEmporary? only for a hack
export function setNextSnapshot(snapshot: PacketSnapshot): void {
   nextSnapshot = snapshot;
}

export function tickIntervalHasPassed(intervalSeconds: number): boolean {
   const currentTick = Math.floor(clientTick);
   
   const ticksPerInterval = intervalSeconds * Settings.TICK_RATE;
   
   const previousCheck = (currentTick - 1) / ticksPerInterval;
   const check = currentTick / ticksPerInterval;
   return Math.floor(previousCheck) !== Math.floor(check);
}

export function getSecondsSinceTickTimestamp(ticks: number): number {
   const ticksSince = currentSnapshot.tick - ticks;
   let secondsSince = ticksSince * Settings.DT_S;

   return secondsSince;
}

export function getElapsedTimeInSeconds(elapsedTicks: number): number {
   return elapsedTicks * Settings.DT_S;
}

export function addTickCallback(time: number, callback: () => void): void {
   tickCallbacks.push({
      time: time,
      callback: callback
   });
}

export function updateTickCallbacks(): void {
   for (let i = tickCallbacks.length - 1; i >= 0; i--) {
      const tickCallbackInfo = tickCallbacks[i];
      tickCallbackInfo.time -= 1 * Settings.DT_S;
      if (tickCallbackInfo.time <= 0) {
         tickCallbackInfo.callback();
         tickCallbacks.splice(i, 1);
      }
   }
}
function tickEntities(): void {
   const componentArrays = getComponentArrays();
   for (const componentArray of componentArrays) {
      if (typeof componentArray.onTick !== "undefined") {
         for (const entity of componentArray.activeEntities) {
            componentArray.onTick(entity);
         }
      }
      
      componentArray.deactivateQueue();
   }
}

function runFrame(frameStartTime: number): void {
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
   debugInfoDisplay.updateSnapshotBufferSize(snapshotBuffer.length);

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
      tickEntities();
      
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

   renderGame(clientTickInterp, serverTickInterp, deltaTimeMS);

   const frameEndTime = performance.now();
   registerFrame(frameStartTime, frameEndTime);

   renderFrameGraph(frameEndTime);

   updateTextNumbers();
   updateTickCallbacks();
   updateParticles();
   debugInfoDisplay.refreshTickDebugData();

   if (gameIsRunning) {
      requestAnimationFrame(runFrame);
   }
}

if (import.meta.hot) {
   import.meta.hot.accept();
}
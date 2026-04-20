import { Entity, Settings } from "webgl-test-shared";
import { updateTextNumbers } from "./text-canvas";
import { playRiverSounds, updateSounds } from "./sound";
import { attemptToResearch, updateResearchOrb } from "./research";
import { updateEntitySelections } from "./entity-selection";
import { updateTechTreeItems } from "./rendering/webgl/tech-tree-item-rendering";
import { entityUsesClientInterp } from "./rendering/render-part-matrices";
import { createCollapseParticles } from "./collapses";
import { updateSlimeTrails } from "./rendering/webgl/slime-trail-rendering";
import { updateDebugEntity } from "./entity-debugging";
import { playerInstance } from "./player";
import { resolveCollisions } from "./collision";
import { decodeSnapshotFromGameDataPacket, TickSnapshot, updateGameStateToSnapshot } from "./networking/packet-snapshots";
import { gameFramebuffer, renderGame } from "./rendering/render";
import { updateFrameMetrics } from "./rendering/webgl/frame-graph-rendering";
import { updatePlayerMovement } from "./player-action-handling";
import { PacketReader } from "webgl-test-shared";
import { sendPlayerDataPacket } from "./networking/packet-sending/player-data-packet";
import { updateParticles } from "./rendering/webgl/particle-rendering";
import { debugInfoDisplay } from "../ui/game/dev/debug-info-display-funcs";
import { getEntityComponentArrays } from "./entity-component-types";
import { getEntityType, } from "./world";
import { cleanupEvents, gameIsFocused, setupEvents } from "./event-handling";
import { COMPONENT_ARRAYS } from "./entity-components/ComponentArray";
import { gl, windowHeight, windowWidth } from "./webgl";

const enum Var {
   SNAPSHOT_BUFFER_TARGET_SIZE = 2,
   // SNAPSHOT_BUFFER_LENGTH = 10,
   /** The number of ticks it takes for the measured server packet interval to fully adjust (if going from a constant tps of A to a constant tps of B) */
   PACKET_INTERVAL_ADJUST_TIME = 10,
   /*/ Controls how aggressively the client catches up to server */
   TIME_DILATION_STRENGTH = 0.15
}

interface TickCallback {
   time: number;
   readonly callback: () => void;
}

let lastFrameTime = 0;

let clientTick = 0;
let clientInterp = 0;

// @Garbage: I could create a set fixed number of snapshots, and then just override their data!
const snapshotBuffer: Array<TickSnapshot> = [];
export let currentSnapshot: TickSnapshot;
export let nextSnapshot: TickSnapshot;

let lastPacketTime = 0;
let measuredServerPacketIntervalMS = 1000 / Settings.SERVER_PACKET_SEND_RATE; // Start it off at the value we expect it to be at

let playerPacketAccumulator = 0;

// @CLEANUP this system is awful. kill it
const tickCallbacks: Array<TickCallback> = [];

let runFrameHandle: number;

export function startGame(time: number): void {
   setupEvents();
   frameLoop(time); // Start the game loop
}

export function stopGame(): void {
   cleanupEvents();
   cancelAnimationFrame(runFrameHandle);
}

export function onGameDataPacket(reader: PacketReader): void {
   const snapshot = decodeSnapshotFromGameDataPacket(reader);
   snapshotBuffer.push(snapshot);
   
   const timeNow = performance.now();
   const deltaMS = timeNow - lastPacketTime;
   lastPacketTime = timeNow;

   // Calculate new server packet interval using la "Exponential Moving Average"
   const smoothingFactor = 2 / (Var.PACKET_INTERVAL_ADJUST_TIME + 1);
   measuredServerPacketIntervalMS = measuredServerPacketIntervalMS * (1 - smoothingFactor) + smoothingFactor * deltaMS;
   
   // When the game isn't focused, there is no animation loop to consume snapshots. So this has to be done to keep the game state updated and prevent snapshots from queuing up endlessly.
   // @BUG: If gameIsFocused changes mid-frame, updateGame could be called twice
   if (!gameIsFocused) {
      updateGame(deltaMS);
   }

   // First game packet
   // @SPEED @Hack only needed for the first packet.
   if (currentSnapshot === undefined) {
      // Set currentSnapshot, and the game state, to the first game packet received.
      updateGameStateToSnapshot(snapshot);
      clientTick = snapshot.tick; // Start the client tick off at the tick of the very first packet received.
   }
   
   if (__DEV__) {
      debugInfoDisplay.updateSnapshotBufferSize(snapshotBuffer.length);
      debugInfoDisplay.updateServerTPS(1000 / measuredServerPacketIntervalMS);
   }
}

export function bufferHasEnoughForGameStart(): boolean {
   return snapshotBuffer.length >= Var.SNAPSHOT_BUFFER_TARGET_SIZE;
}

// @Cleanup: this is weird. This file imports updateGameDataToSnapshot, and that function imports this from this file.
export function setCurrentSnapshot(snapshot: TickSnapshot): void {
   currentSnapshot = snapshot;
   if (__DEV__) {
      debugInfoDisplay.updateCurrentSnapshot(snapshot);
   }
}

// @TEmporary? only for a hack
export function setNextSnapshot(snapshot: TickSnapshot): void {
   nextSnapshot = snapshot;
}

export function tickIntervalHasPassed(intervalTicks: number): boolean {
   const currentTick = Math.floor(clientTick);
   return (currentTick % intervalTicks) < 1;
}

export function getSecondsSinceTickTimestamp(ticks: number): number {
   const ticksSince = currentSnapshot.tick - ticks;
   const secondsSince = ticksSince * Settings.DT_S;
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
      tickCallbackInfo.time -= Settings.DT_S;
      if (tickCallbackInfo.time <= 0) {
         tickCallbackInfo.callback();
         tickCallbacks.splice(i, 1);
      }
   }
}
function tickEntities(): void {
   for (const componentArray of COMPONENT_ARRAYS) {
      if (componentArray.onTick !== undefined) {
         for (const entity of componentArray.activeEntities) {
            componentArray.onTick(entity);
         }
      }
      
      componentArray.deactivateQueue();
   }
}

function callEntityOnUpdateFunctions(entity: Entity): void {
   const componentArrays = getEntityComponentArrays(getEntityType(entity));
   for (const componentArray of componentArrays) {
      if (componentArray.onUpdate !== undefined) {
         componentArray.onUpdate(entity);
      }
   }
}

function updateGame(deltaTimeMS: number): number {
   // Delta tick accounting for the MEASURED tps of the server
   const deltaTick = deltaTimeMS / measuredServerPacketIntervalMS * Settings.TICK_RATE / Settings.SERVER_PACKET_SEND_RATE;

   // Calculate the client tick's error
   const serverTick = snapshotBuffer[snapshotBuffer.length - 1].tick;
   const delayTicks = serverTick - clientTick;
   const errorTicks = delayTicks + Settings.TICK_RATE / Settings.SERVER_PACKET_SEND_RATE;

   const timeDilationFactor = 1 + Var.TIME_DILATION_STRENGTH * errorTicks * (Math.abs(errorTicks) > 0.5 ? 1 : 0);
   clientTick += deltaTick * timeDilationFactor;
   
   const renderSubtick = clientTick - Var.SNAPSHOT_BUFFER_TARGET_SIZE * Settings.TICK_RATE / Settings.SERVER_PACKET_SEND_RATE;

   // Make sure the current snapshot is the snapshot just below the currently rendered tick
   let i = 0;
   for (; i < snapshotBuffer.length; i++) {
      const snapshot = snapshotBuffer[i];
      if (snapshot.tick < renderSubtick) {
         if (snapshot.tick > currentSnapshot.tick) {
            updateGameStateToSnapshot(snapshot);
         }
      } else {
         break;
      }
   }
   // Snapshots older than the current one are now useless
   if (i > 1) {
      snapshotBuffer.splice(0, i - 1);
   }

   // @Cleanup kinda unclear at a glance
   nextSnapshot = (snapshotBuffer[snapshotBuffer.indexOf(currentSnapshot) + 1]) || currentSnapshot;

   // Packet send loop
   playerPacketAccumulator += deltaTick;
   while (playerPacketAccumulator >= Settings.TICK_RATE / Settings.CLIENT_PACKET_SEND_RATE) {
      sendPlayerDataPacket();
      playerPacketAccumulator -= Settings.TICK_RATE / Settings.CLIENT_PACKET_SEND_RATE;
   }

   // Tick the player (independently from all other entities)
   // A loop to run at the proper tick rate
   clientInterp += deltaTick;
   const numUpdates = Math.floor(clientInterp);
   for (let i = 0; i < numUpdates; i++) {
      // Call this outside of the check which makes sure the player is in-client, cuz we want the movement intention to update too!
      updatePlayerMovement();
      
      // @Cleanup: this function name i think is a lil weird for something which the contents of the if updates the player.
      if (playerInstance !== null && entityUsesClientInterp(playerInstance)) {
         callEntityOnUpdateFunctions(playerInstance);
      }

      // Tick all entities (cuz the client interp loop is based on the network update rate not the tick rate)
      // @Incomplete @Bug THAT"S ACTUALLY BAD, the fact that the client interp loop is based on the network update rate. Cuz it means when the server is lagging the player is still moving at the same speeds when they should be being slowed.
      tickEntities();

      resolveCollisions();
      
      updateResearchOrb();
      attemptToResearch();

      updateEntitySelections();

      updateTechTreeItems();
      
      updateSounds();
      playRiverSounds();

      createCollapseParticles();
      updateSlimeTrails();

      updateTextNumbers();
      updateTickCallbacks();
      updateParticles();

      if (__DEV__) {
         updateDebugEntity();
      }
   }
   clientInterp -= numUpdates;

   return renderSubtick;
}

function checkAndResizeCanvas(): void {
   const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;

   const displayWidth = windowWidth;
   const displayHeight = windowHeight;
   
   if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      console.log("runtime check")
      canvas.width = displayWidth;
      canvas.height = displayHeight;

      gl.bindFramebuffer(gl.FRAMEBUFFER, gameFramebuffer);
      gl.viewport(0, 0, displayWidth, displayHeight);
      
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, displayWidth, displayHeight);
   }
}

function frameLoop(frameStartTime: number): void {
   checkAndResizeCanvas();
   
   const deltaTimeMS = frameStartTime - lastFrameTime;
   lastFrameTime = frameStartTime;

   const renderSubtick = updateGame(deltaTimeMS);

   const snapshotTickDiff = nextSnapshot.tick - currentSnapshot.tick;
   const serverInterp = snapshotTickDiff > 0 ? (renderSubtick - currentSnapshot.tick) / snapshotTickDiff : 0;

   renderGame(clientInterp, serverInterp);

   if (__DEV__) {
      debugInfoDisplay.updateSnapshotBufferSize(snapshotBuffer.length);
      debugInfoDisplay.refreshTickDebugData();

      const frameEndTime = performance.now();
      updateFrameMetrics(frameStartTime, frameEndTime);
   }

   runFrameHandle = requestAnimationFrame(frameLoop);
}

if (import.meta.hot) {
   import.meta.hot.accept();
}
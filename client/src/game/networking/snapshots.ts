import { PacketReader, Settings } from "../../../../shared/src";
import { debugInfoDisplay } from "../../ui/game/dev/debug-info-display-funcs";
import { gameIsFocused } from "../event-handling";
import { TickSnapshot, decodeSnapshotFromGameDataPacket, updateGameStateToSnapshot } from "./snapshot-processing";

const enum Var {
   SNAPSHOT_BUFFER_TARGET_SIZE = 2,
   // SNAPSHOT_BUFFER_LENGTH = 10,
   /** The number of ticks it takes for the measured server packet interval to fully adjust (if going from a constant tps of A to a constant tps of B) */
   PACKET_INTERVAL_ADJUST_TIME = 10,
   /*/ Controls how aggressively the client catches up to server */
   TIME_DILATION_STRENGTH = 0.15
}

export interface SnapshotUpdateInfo {
   readonly clientInterp: number;
   readonly serverInterp: number;
   readonly deltaTick: number;
   readonly numGameUpdates: number;
}

let clientTick = 0;
let clientInterp = 0;

let lastPacketTime = 0;
let measuredServerPacketIntervalMS = 1000 / Settings.SERVER_PACKET_SEND_RATE; // Start it off at the value we expect it to be at

// @Garbage: I could create a set fixed number of snapshots, and then just override their data!
const snapshotBuffer: Array<TickSnapshot> = [];

export let currentSnapshot: TickSnapshot;
export let nextSnapshot: TickSnapshot;

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

export function bufferHasEnoughForGameStart(): boolean {
   return snapshotBuffer.length >= Var.SNAPSHOT_BUFFER_TARGET_SIZE;
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

export function updateSnapshots(deltaTimeMS: number): SnapshotUpdateInfo {
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

   const snapshotTickDiff = nextSnapshot.tick - currentSnapshot.tick;
   const serverInterp = snapshotTickDiff > 0 ? (renderSubtick - currentSnapshot.tick) / snapshotTickDiff : 0;

   clientInterp += deltaTick;
   const numUpdates = Math.floor(clientInterp);
   clientInterp -= numUpdates;

   if (__DEV__) {
      debugInfoDisplay.updateSnapshotBufferSize(snapshotBuffer.length);
      debugInfoDisplay.refreshTickDebugData();
   }

   return {
      deltaTick,
      clientInterp,
      serverInterp,
      numGameUpdates: numUpdates
   };
}

export function tickIntervalHasPassed(intervalTicks: number): boolean {
   const currentTick = Math.floor(clientTick);
   return (currentTick % intervalTicks) < 1;
}
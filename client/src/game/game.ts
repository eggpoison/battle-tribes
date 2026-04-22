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
import { renderGame } from "./rendering/render";
import { updateFrameMetrics } from "./rendering/webgl/frame-graph-rendering";
import { updatePlayerMovement } from "./player-action-handling";
import { sendPlayerDataPacket } from "./networking/packet-sending/player-data-packet";
import { updateParticles } from "./rendering/webgl/particle-rendering";
import { getEntityComponentArrays } from "./entity-component-types";
import { getEntityType, } from "./world";
import { cleanupEvents, setupEvents } from "./event-handling";
import { updateSnapshots } from "./networking/snapshots";
import { updateTickCallbacks } from "./tick-callbacks";
import { COMPONENT_ARRAYS } from "./entity-components/component-registry";

let lastFrameTime = 0;

let playerPacketAccumulator = 0;

let runFrameHandle: number;

export function startGame(time: number): void {
   setupEvents();
   frameLoop(time); // Start the game loop
}

export function stopGame(): void {
   cleanupEvents();
   cancelAnimationFrame(runFrameHandle);
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

export function updateGame(): void {
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

function frameLoop(frameStartTime: number): void {
   const deltaTimeMS = frameStartTime - lastFrameTime;
   lastFrameTime = frameStartTime;

   const info = updateSnapshots(deltaTimeMS);

   // Packet send loop
   playerPacketAccumulator += info.deltaTick;
   while (playerPacketAccumulator >= Settings.TICK_RATE / Settings.CLIENT_PACKET_SEND_RATE) {
      sendPlayerDataPacket();
      playerPacketAccumulator -= Settings.TICK_RATE / Settings.CLIENT_PACKET_SEND_RATE;
   }

   for (let i = 0; i < info.numGameUpdates; i++) {
      updateGame();
   }

   renderGame(info.clientInterp, info.serverInterp);

   if (__DEV__) {
      const frameEndTime = performance.now();
      updateFrameMetrics(frameStartTime, frameEndTime);
   }

   runFrameHandle = requestAnimationFrame(frameLoop);
}
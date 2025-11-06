<script lang="ts">
   import { roundNum } from "webgl-test-shared";
   import Board from "../../../game/Board";
   import { TransformComponentArray } from "../../../game/entity-components/server-components/TransformComponent";
   import { sendDevSetViewedSpawnDistributionPacket, sendSpectateEntityPacket, sendToggleSimulationPacket } from "../../../game/networking/packet-sending";
   import { getCurrentLayer } from "../../../game/world";
   import { playerInstance } from "../../../game/player";
   import { getNumLights } from "../../../game/lights";
   import { getMeasuredServerTPS } from "../../../game/client";
   import { setCameraZoom } from "../../../game/camera";
   import { getNumActiveSounds } from "../../../game/sound";
   import { debugDisplayState } from "../../../ui-state/debug-display-state.svelte";
   import { GameInteractState, gameUIState } from "../../../ui-state/game-ui-state.svelte";

   const currentSnapshot = debugDisplayState.currentSnapshot;

   function toggleAIBuilding(): void {
      const toggleResult = !debugDisplayState.showSafetyNodes || !debugDisplayState.showBuildingSafetys || !debugDisplayState.showBuildingPlans || !debugDisplayState.showRestrictedAreas || !debugDisplayState.showWallConnections;
      
      debugDisplayState.setShowSafetyNodes(toggleResult);
      debugDisplayState.setShowBuildingSafetys(toggleResult);
      debugDisplayState.setShowBuildingPlans(toggleResult);
      debugDisplayState.setShowRestrictedAreas(toggleResult);
      debugDisplayState.setShowWallConnections(toggleResult);
   }

   function changeZoom(e: Event & { currentTarget: HTMLInputElement }): void {
      const zoom = Number(e.currentTarget.value);
      setCameraZoom(zoom);
   }
   
   function toggleSimulation(): void {
      sendToggleSimulationPacket(!gameUIState.isSimulating);
   }

   function enterSpectatingState(): void {
      gameUIState.setGameInteractState(GameInteractState.spectateEntity);
   }

   // @Cleanup: unused???
   const onChange = (e: Event): void => {
      const target = e.target as HTMLSelectElement;
      const entityType = Number(target.options[target.selectedIndex].value);
      sendDevSetViewedSpawnDistributionPacket(entityType);
   }
</script>
   
<div id="game-info-display" class="devmode-container">
   <p>Time: {currentSnapshot.time.toFixed(2)}</p>
   <p>Ticks: {roundNum(currentSnapshot.tick, 2)}</p>
   <p>Server TPS: {getMeasuredServerTPS().toFixed(2)}</p>
   <p>Buffer size: {debugDisplayState.snapshotBufferSize}</p>
   <p>Active sounds: {getNumActiveSounds()}</p>

   <button onclick={toggleSimulation}>{gameUIState.isSimulating ? "Pause" : "Resume"} Simulation</button>

   <button onclick={enterSpectatingState}>Spectate Entity</button>
   <button onclick={() => { playerInstance !== null ? sendSpectateEntityPacket(playerInstance) : undefined }}>Clear Spectate</button>

   <ul class="area options">
      <li>
         <label class:enabled={debugDisplayState.nightVisionIsEnabled}>
            <input bind:checked={debugDisplayState.nightVisionIsEnabled} name="nightvision-checkbox" type="checkbox" />
            Nightvision
         </label>
      </li>
      <li>
         <label class:enabled={debugDisplayState.showHitboxes}>
            <input bind:checked={debugDisplayState.showHitboxes} name="hitboxes-checkbox" type="checkbox" />
            Hitboxes
         </label>
      </li>
      <li>
         <label class:enabled={debugDisplayState.showChunkBorders}>
            <input bind:checked={debugDisplayState.showChunkBorders} name="chunk-borders-checkbox" type="checkbox" />
            Chunk borders
         </label>
      </li>
      <li>
         <label class:enabled={debugDisplayState.showRenderChunkBorders}>
            <input bind:checked={debugDisplayState.showRenderChunkBorders} name="render-chunk-borders-checkbox" type="checkbox" />
            Render chunk borders
         </label>
      </li>
      <li>
         <label class:enabled={debugDisplayState.hideEntities}>
            <input bind:checked={debugDisplayState.hideEntities} name="hide-entities-checkbox" type="checkbox" />
            Hide entities
         </label>
      </li>
      <li>
         <label class:enabled={debugDisplayState.showPathfindingNodes}>
            <input bind:checked={debugDisplayState.showPathfindingNodes} name="show-pathfinding-nodes-checkbox" type="checkbox" />
            Show pathfinding nodes
         </label>
      </li>
      <li>
         <label class:enabled={debugDisplayState.debugLights}>
            <input bind:checked={debugDisplayState.debugLights} name="debug-lights-checkbox" type="checkbox" />
            Debug lights
         </label>
      </li>
      <li>
         <label class:enabled={debugDisplayState.showSubtileSupports}>
            <input bind:checked={debugDisplayState.showSubtileSupports} name="show-subtile-supports-checkbox" type="checkbox" />
            Subtile supports
         </label>
      </li>
      <li>
         <label class:enabled={debugDisplayState.showLightLevels}>
            <input bind:checked={debugDisplayState.showLightLevels} name="show-light-levels-checkbox" type="checkbox" />
            Light levels
         </label>
      </li>
      <li>
         <label class:enabled={debugDisplayState.debugTethers}>
            <input bind:checked={debugDisplayState.debugTethers} name="debug-tethers-checkbox" type="checkbox" />
            Debug tethers
         </label>
      </li>
   </ul>

   <ul class="area">
      <li>{TransformComponentArray.entities.length} Entities</li>
      <li>{Board.lowMonocolourParticles.length + Board.lowTexturedParticles.length + Board.highMonocolourParticles.length + Board.highTexturedParticles.length} Particles</li>
      <li>{getCurrentLayer().lights.length} ({getNumLights()}) Lights</li>
   </ul>

   <ul class="area">
      <li>
         <label>
            <input type="range" name="zoom-input" defaultValue={debugDisplayState.cameraZoom} min={1} max={2.5} step={0.1} onchange={e => changeZoom(e)} />
            <br />Zoom ({debugDisplayState.cameraZoom})
         </label>
      </li>
   </ul>

   <!-- @SQUEAM @INCOMPLETE -->
   <!-- <ul class="area">
      <select onchange={onChange}>
         {#each }
         {(() => {
            const elems = new Array<JSX.Element>();

            elems.push(
               <option key={0} value={-1}>None</option>
            )
            
            for (let entityType: EntityType = 0; entityType < NUM_ENTITY_TYPES; entityType++) {
               const clientEntityInfo = CLIENT_ENTITY_INFO_RECORD[entityType];
               elems.push(
                  <option key={entityType + 1} value={entityType}>{clientEntityInfo.name}</option>
               );
            }
            return elems;
         })()}
      </select>
   </ul> -->

   <div class="area">
      <label class="title" class:enabled={debugDisplayState.showSafetyNodes && debugDisplayState.showBuildingSafetys && debugDisplayState.showBuildingPlans && debugDisplayState.showRestrictedAreas && debugDisplayState.showWallConnections}>
         AI Building
         <input checked={debugDisplayState.showSafetyNodes && debugDisplayState.showBuildingSafetys && debugDisplayState.showBuildingPlans && debugDisplayState.showRestrictedAreas && debugDisplayState.showWallConnections} type="checkbox" onchange={toggleAIBuilding} />
      </label>
      <div>
         <label class:enabled={debugDisplayState.showSafetyNodes}>
            <input bind:checked={debugDisplayState.showSafetyNodes} name="show-safety-nodes-checkbox" type="checkbox" />
            Show safety nodes
         </label>
      </div>
      <div>
         <label class:enabled={debugDisplayState.showBuildingSafetys}>
            <input bind:checked={debugDisplayState.showBuildingSafetys} name="show-building-safetys-checkbox" type="checkbox" />
            Show building safety
         </label>
      </div>
      <div>
         <label class:enabled={debugDisplayState.showBuildingPlans}>
            <input bind:checked={debugDisplayState.showBuildingPlans} name="show-building-plans-checkbox" type="checkbox" />
            Show building plans
         </label>
      </div>
      <div>
         <label class:enabled={debugDisplayState.showRestrictedAreas}>
            <input bind:checked={debugDisplayState.showRestrictedAreas} name="show-restricted-areas-checkbox" type="checkbox" />
            Show restricted areas
         </label>
      </div>
      <div>
         <label class:enabled={debugDisplayState.showWallConnections}>
            <input bind:checked={debugDisplayState.showWallConnections} name="show-wall-connections-checkbox" type="checkbox" />
            Show wall connections
         </label>
      </div>
      <div>
         <label>
            <input type="range" name="zoom-input" bind:value={debugDisplayState.maxGreenSafety} min={25} max={250} step={5} />
            <br />Max green safety ({debugDisplayState.maxGreenSafety})
         </label>
      </div>
   </div>
</div>
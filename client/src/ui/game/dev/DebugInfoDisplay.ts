import { roundNum, Settings } from "webgl-test-shared";
import { TransformComponentArray } from "../../../game/entity-components/server-components/TransformComponent";
import { getCurrentLayer } from "../../../game/world";
import { setCameraZoom } from "../../../game/camera";
import { GameInteractState, gameUIState } from "../../../ui-state/game-ui-state";
import { debugDisplayState } from "../../../ui-state/debug-display-state";
import { TickSnapshot } from "../../../game/networking/packet-snapshots";
import { lowMonocolourParticles, lowTexturedParticles, highMonocolourParticles, highTexturedParticles } from "../../../game/rendering/webgl/particle-rendering";
import { getNumSounds } from "../../../game/sound";
import { debugInfoDisplay } from "./debug-info-display-funcs";
import { sendToggleSimulationPacket, sendDevSetViewedSpawnDistributionPacket, sendSpectateEntityPacket } from "../../../game/networking/packet-sending/packet-sending";
import { getNetworkBufferedBytes } from "../../../game/networking/networking";

let timeNode: Text | null = null;
let ticksNode: Text | null = null;
let serverTPSNode: Text | null = null;
let bufferSizeNode: Text | null = null;
let networkBufferedBytesNode: Text | null = null;
let numActiveSoundsNode: Text | null = null;
let numEntitiesNode: Text | null = null;
let numParticlesNode: Text | null = null;
let numLightsNode: Text | null = null;

let time = "0";
let ticks = "0";
let serverTPS = Settings.SERVER_PACKET_SEND_RATE.toString();
let bufferSize = "0";
let networkBufferedBytes = "0";
let numActiveSounds = "0";
let numEntities = "0";
let numParticles = "0";
let numLights = "0";

// @Incomplete
let maxGreenSafety = "100";

debugInfoDisplay.updateCurrentSnapshot = (snapshot: TickSnapshot): void => {
   time = roundNum(snapshot.time, 2).toString();
   if (timeNode) timeNode.data = time;
   ticks = roundNum(snapshot.tick, 2).toString();
   if (ticksNode) ticksNode.data = ticks;
}

debugInfoDisplay.updateServerTPS = (tps: number): void => {
   serverTPS = roundNum(tps, 2).toString();
   if (serverTPSNode) serverTPSNode.data = serverTPS;
}

debugInfoDisplay.updateSnapshotBufferSize = (snapshotBufferSize: number): void => {
   bufferSize = snapshotBufferSize.toString();
   if (bufferSizeNode) bufferSizeNode.data = bufferSize;
}

debugInfoDisplay.refreshTickDebugData = (): void => {
   networkBufferedBytes = getNetworkBufferedBytes().toString();
   if (networkBufferedBytesNode) networkBufferedBytesNode.data = networkBufferedBytes;
   
   numActiveSounds = getNumSounds().toString();
   if (numActiveSoundsNode) numActiveSoundsNode.data = numActiveSounds;
   numEntities = TransformComponentArray.entities.length.toString();
   if (numEntitiesNode) numEntitiesNode.data = numEntities;
   numParticles = (lowMonocolourParticles.length + lowTexturedParticles.length + highMonocolourParticles.length + highTexturedParticles.length).toString();
   if (numParticlesNode) numParticlesNode.data = numParticles;
   numLights = getCurrentLayer().lights.length.toString();
   if (numLightsNode) numLightsNode.data = numLights;
}

function toggleAIBuilding(): void {
   const toggleResult = !debugDisplayState.showSafetyNodes || !debugDisplayState.showBuildingSafetys || !debugDisplayState.showBuildingPlans || !debugDisplayState.showRestrictedAreas || !debugDisplayState.showWallConnections;
   
   debugDisplayState.showSafetyNodes = toggleResult;
   debugDisplayState.showBuildingSafetys = toggleResult;
   debugDisplayState.showBuildingPlans = toggleResult;
   debugDisplayState.showRestrictedAreas = toggleResult;
   debugDisplayState.showWallConnections = toggleResult;
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
function onChange(e: Event): void {
   const target = e.target as HTMLSelectElement;
   const entityType = Number(target.options[target.selectedIndex].value);
   sendDevSetViewedSpawnDistributionPacket(entityType);
}
   
export function openDebugInfoDisplay(parent: HTMLElement): void {
   const debugInfoElem = document.createElement("div");
   debugInfoElem.id = "debug-info-display";
   debugInfoElem.className = "devmode-container";

   debugInfoElem.innerHTML = `
      <p>Time: <span class="time">${time}</span></p>
      <p>Ticks: <span class="ticks">${ticks}</span></p>
      <p>Server TPS: <span class="tps">${serverTPS}</span></p>
      <p>Buffer size: <span class="buffer-size">${bufferSize}</span></p>
      <p>Network buffered bytes: <span class="network-buffered-bytes">${networkBufferedBytes}</span></p>
      <p>Active sounds: <span class="active-sounds">${numActiveSounds}</span></p>

      <button class="toggle-simulation-btn">${gameUIState.isSimulating ? "Pause" : "Resume"} Simulation</button>

      <button class="spectate-btn">Spectate Entity</button>
      <button class="clear-spectate-btn">Clear Spectate</button>

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
         <li><span class="num-entities">${numEntities}</span> Entities</li>
         <li><span class="num-particles">${numParticles}</span> Particles</li>
         <li>${getCurrentLayer().lights.length} (<span class="num-lights">{getNumLights()}</span>) Lights</li>
      </ul>

      <ul class="area">
         <li>
            <label>
               <input type="range" name="zoom-input" defaultValue=${debugDisplayState.cameraZoom} min={0.7} max={2.5} step={0.1} onchange={e => changeZoom(e)} />
               <br />Zoom (${debugDisplayState.cameraZoom})
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
               <br />Max green safety (${maxGreenSafety})
            </label>
         </div>
         <p>potato9</p>
      </div>
   `;

   timeNode = debugInfoElem.querySelector(".time")!.firstChild as Text;
   ticksNode = debugInfoElem.querySelector(".ticks")!.firstChild as Text;
   serverTPSNode = debugInfoElem.querySelector(".tps")!.firstChild as Text;
   bufferSizeNode = debugInfoElem.querySelector(".buffer-size")!.firstChild as Text;
   networkBufferedBytesNode = debugInfoElem.querySelector(".network-buffered-bytes")!.firstChild as Text;
   numActiveSoundsNode = debugInfoElem.querySelector(".active-sounds")!.firstChild as Text;
   numEntitiesNode = debugInfoElem.querySelector(".num-entities")!.firstChild as Text;
   numParticlesNode = debugInfoElem.querySelector(".num-particles")!.firstChild as Text;
   numLightsNode = debugInfoElem.querySelector(".num-lights")!.firstChild as Text;

   debugInfoElem.querySelector(".toggle-simulation-btn")!.addEventListener("click", toggleSimulation);
   debugInfoElem.querySelector(".spectate-btn")!.addEventListener("click", enterSpectatingState);
   debugInfoElem.querySelector(".clear-spectate-btn")!.addEventListener("click", () => { sendSpectateEntityPacket(0); });

   parent.appendChild(debugInfoElem);
}

if (import.meta.hot) {
   const parent = document.getElementById("nerd-vision-wrapper");
   if (parent) {
      openDebugInfoDisplay(parent);
   }

   import.meta.hot.dispose(() => {
      document.getElementById("debug-info-display")?.remove();
   });
   
   import.meta.hot.accept();
}
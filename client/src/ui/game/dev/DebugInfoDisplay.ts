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
import { getNetworkBufferedBytes } from "../../../game/networking/socket";

let lastTime = 0;

// @Incomplete
let maxGreenSafety = "100";

function toggleAIBuilding(): void {
   const toggleResult = !debugDisplayState.showSafetyNodes || !debugDisplayState.showBuildingSafetys || !debugDisplayState.showBuildingPlans || !debugDisplayState.showRestrictedAreas || !debugDisplayState.showWallConnections;
   
   debugDisplayState.showSafetyNodes = toggleResult;
   debugDisplayState.showBuildingSafetys = toggleResult;
   debugDisplayState.showBuildingPlans = toggleResult;
   debugDisplayState.showRestrictedAreas = toggleResult;
   debugDisplayState.showWallConnections = toggleResult;
}

function changeZoom(e: Event): void {
   const zoom = Number((e.currentTarget as HTMLInputElement).value);
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
   function addText(label: string): Text {
      const elem = document.createElement("p");
      elem.appendChild(
         document.createTextNode(label)
      );
      const node = document.createTextNode("0");
      elem.appendChild(node);
      rootElem.appendChild(elem);

      return node;
   }

   function addCheckboxOption(parent: HTMLElement, inputName: string, label: string, onChange: (e: InputEvent) => void): void {
      const listElem = document.createElement("li");
      parent.appendChild(listElem);

      const labelElem = document.createElement("label");
      listElem.appendChild(labelElem);
      
      const inputElem = document.createElement("input");
      inputElem.name = inputName;
      inputElem.type = "checkbox";
      inputElem.onchange = onChange as (e: Event) => void;
      labelElem.appendChild(inputElem);

      const textNode = document.createTextNode(label);
      labelElem.appendChild(textNode);
   }

   function addRangeOption(parent: HTMLElement, inputName: string, label: string, min: string, max: string, step: string, defaultValue: string, onChange: (e: InputEvent) => void): void {
      const listElem = document.createElement("li");
      parent.appendChild(listElem);

      const labelElem = document.createElement("label");
      listElem.appendChild(labelElem);

      const inputElem = document.createElement("input");
      inputElem.name = inputName;
      inputElem.type = "range";
      inputElem.min = min;
      inputElem.max = max;
      inputElem.step = step;
      inputElem.defaultValue = defaultValue;
      inputElem.onchange = onChange as (e: Event) => void;
      labelElem.appendChild(inputElem);

      const brElem = document.createElement("br");
      labelElem.appendChild(brElem);

      const textNode = document.createTextNode(label);
      labelElem.appendChild(textNode);

      const node = document.createTextNode(defaultValue);
      labelElem.appendChild(node);
   }

   const rootElem = document.createElement("div");
   rootElem.id = "debug-info-display";
   rootElem.className = "devmode-container";

   const timeNode = addText("Time: ");
   const ticksNode = addText("Ticks: ");
   const serverTPSNode = addText("Server TPS: ");
   const bufferSizeNode = addText("Buffer size: ");
   const networkBufferedBytesNode = addText("Network buffered bytes: ");
   const numActiveSoundsNode = addText("Active sounds: ");
   const numEntitiesNode = addText("Entities: ");
   const numParticlesNode = addText("Particles: ");
   const numLightsNode = addText("Lights: ");

   const toggleSimulationButton = document.createElement("button");
   toggleSimulationButton.textContent = "Pause Simulation";
   toggleSimulationButton.onclick = toggleSimulation;
   rootElem.appendChild(toggleSimulationButton);

   const spectateButton = document.createElement("button");
   spectateButton.textContent = "Spectate Entity";
   spectateButton.onclick = enterSpectatingState;
   rootElem.appendChild(spectateButton);

   const clearSpectateButton = document.createElement("button");
   clearSpectateButton.textContent = "Clear Spectate";
   clearSpectateButton.onclick = () => { sendSpectateEntityPacket(0); };
   rootElem.appendChild(clearSpectateButton);

   const checkboxOptionsElem = document.createElement("ul");
   checkboxOptionsElem.className = "area options";
   rootElem.appendChild(checkboxOptionsElem);
   
   addCheckboxOption(checkboxOptionsElem, "nightvision-checkbox", "Nightvision", e => { debugDisplayState.nightVisionIsEnabled = (e.target as HTMLInputElement).checked; });
   addCheckboxOption(checkboxOptionsElem, "hitboxes-checkbox", "Hitboxes", e => { debugDisplayState.showHitboxes = (e.target as HTMLInputElement).checked; });
   addCheckboxOption(checkboxOptionsElem, "chunk-borders-checkbox", "Chunk borders", e => { debugDisplayState.showChunkBorders = (e.target as HTMLInputElement).checked; });
   addCheckboxOption(checkboxOptionsElem, "render-chunk-borders-checkbox", "Render chunk borders", e => { debugDisplayState.showRenderChunkBorders = (e.target as HTMLInputElement).checked; });
   addCheckboxOption(checkboxOptionsElem, "hide-entities-checkbox", "Hide entities", e => { debugDisplayState.hideEntities = (e.target as HTMLInputElement).checked; });
   addCheckboxOption(checkboxOptionsElem, "show-pathfinding-nodes-checkbox", "Show pathfinding nodes", e => { debugDisplayState.showPathfindingNodes = (e.target as HTMLInputElement).checked; });
   addCheckboxOption(checkboxOptionsElem, "debug-lights-checkbox", "Debug lights", e => { debugDisplayState.debugLights = (e.target as HTMLInputElement).checked; });
   addCheckboxOption(checkboxOptionsElem, "show-subtile-supports-checkbox", "Subtile supports", e => { debugDisplayState.showSubtileSupports = (e.target as HTMLInputElement).checked; });
   addCheckboxOption(checkboxOptionsElem, "show-light-levels-checkbox", "Light levels", e => { debugDisplayState.showLightLevels = (e.target as HTMLInputElement).checked; });
   addCheckboxOption(checkboxOptionsElem, "debug-tethers-checkbox", "Debug tethers", e => { debugDisplayState.debugTethers = (e.target as HTMLInputElement).checked; });

   const cameraOptionsElem = document.createElement("ul");
   cameraOptionsElem.className = "area";
   rootElem.appendChild(cameraOptionsElem);

   addRangeOption(cameraOptionsElem, "zoom-input", "Zoom: ", "0.7", "2.5", "0.1", debugDisplayState.cameraZoom.toString(), changeZoom);

   const aiOptionsElem = document.createElement("ul");
   aiOptionsElem.className = "area";
   rootElem.appendChild(aiOptionsElem);

   addCheckboxOption(aiOptionsElem, "ai-building-checkbox", "AI Building", e => { debugDisplayState.nightVisionIsEnabled = (e.target as HTMLInputElement).checked; });
   addCheckboxOption(aiOptionsElem, "show-safety-nodes-checkbox", "Show safety nodes", e => { debugDisplayState.nightVisionIsEnabled = (e.target as HTMLInputElement).checked; });
   addCheckboxOption(aiOptionsElem, "show-building-safetys-checkbox", "Show building safety", e => { debugDisplayState.nightVisionIsEnabled = (e.target as HTMLInputElement).checked; });
   addCheckboxOption(aiOptionsElem, "show-building-plans-checkbox", "Show building plans", e => { debugDisplayState.nightVisionIsEnabled = (e.target as HTMLInputElement).checked; });
   addCheckboxOption(aiOptionsElem, "show-restricted-areas-checkbox", "Show restricted areas", e => { debugDisplayState.nightVisionIsEnabled = (e.target as HTMLInputElement).checked; });
   addCheckboxOption(aiOptionsElem, "show-wall-connections-checkbox", "Show wall connections", e => { debugDisplayState.nightVisionIsEnabled = (e.target as HTMLInputElement).checked; });
   addRangeOption(aiOptionsElem, "max-green-safety-input", "Max green safety: ", "25", "250", "5", debugDisplayState.cameraZoom.toString(), changeZoom);
   
   // debugInfoElem.innerHTML += `

   //    <div class="area">
   //       <label class="title" class:enabled={debugDisplayState.showSafetyNodes && debugDisplayState.showBuildingSafetys && debugDisplayState.showBuildingPlans && debugDisplayState.showRestrictedAreas && debugDisplayState.showWallConnections}>
   //          AI Building
   //          <input checked={debugDisplayState.showSafetyNodes && debugDisplayState.showBuildingSafetys && debugDisplayState.showBuildingPlans && debugDisplayState.showRestrictedAreas && debugDisplayState.showWallConnections} type="checkbox" onchange={toggleAIBuilding} />
   //       </label>
   //       <div>
   //          <label class:enabled={debugDisplayState.showSafetyNodes}>
   //             <input bind:checked={debugDisplayState.showSafetyNodes} name="show-safety-nodes-checkbox" type="checkbox" />
   //             Show safety nodes
   //          </label>
   //       </div>
   //       <div>
   //          <label class:enabled={debugDisplayState.showBuildingSafetys}>
   //             <input bind:checked={debugDisplayState.showBuildingSafetys} name="show-building-safetys-checkbox" type="checkbox" />
   //             Show building safety
   //          </label>
   //       </div>
   //       <div>
   //          <label class:enabled={debugDisplayState.showBuildingPlans}>
   //             <input bind:checked={debugDisplayState.showBuildingPlans} name="show-building-plans-checkbox" type="checkbox" />
   //             Show building plans
   //          </label>
   //       </div>
   //       <div>
   //          <label class:enabled={debugDisplayState.showRestrictedAreas}>
   //             <input bind:checked={debugDisplayState.showRestrictedAreas} name="show-restricted-areas-checkbox" type="checkbox" />
   //             Show restricted areas
   //          </label>
   //       </div>
   //       <div>
   //          <label class:enabled={debugDisplayState.showWallConnections}>
   //             <input bind:checked={debugDisplayState.showWallConnections} name="show-wall-connections-checkbox" type="checkbox" />
   //             Show wall connections
   //          </label>
   //       </div>
   //       <div>
   //          <label>
   //             <input type="range" name="zoom-input" bind:value={debugDisplayState.maxGreenSafety} min={25} max={250} step={5} />
   //             <br />Max green safety (${maxGreenSafety})
   //          </label>
   //       </div>
   //       <p>potato9</p>
   //    </div>
   // `;

   parent.appendChild(rootElem);

   debugInfoDisplay.updateCurrentSnapshot = (snapshot: TickSnapshot): void => {
      const newTime = Math.round(snapshot.time * 100) * 0.01;
      if (newTime !== lastTime) {
         timeNode.data = newTime.toString();
         lastTime = newTime;
      }

      ticksNode.data = snapshot.tick.toString();
   }

   debugInfoDisplay.updateServerTPS = (tps: number): void => {
      serverTPSNode.data = tps.toFixed(2);
   }

   debugInfoDisplay.updateSnapshotBufferSize = (snapshotBufferSize: number): void => {
      bufferSizeNode.data = snapshotBufferSize.toString();
   }

   debugInfoDisplay.refreshTickDebugData = (): void => {
      networkBufferedBytesNode.data = getNetworkBufferedBytes().toString();
      numActiveSoundsNode.data = getNumSounds().toString();
      numEntitiesNode.data = TransformComponentArray.entities.length.toString();
      numParticlesNode.data = (lowMonocolourParticles.length + lowTexturedParticles.length + highMonocolourParticles.length + highTexturedParticles.length).toString();
      numLightsNode.data = getCurrentLayer().lights.length.toString();
   }
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
   //    <!-- @SQUEAM @INCOMPLETE -->
   //    <!-- <ul class="area">
   //       <select onchange={onChange}>
   //          {#each }
   //          {(() => {
   //             const elems = new Array<JSX.Element>();

   //             elems.push(
   //                <option key={0} value={-1}>None</option>
   //             )
               
   //             for (let entityType: EntityType = 0; entityType < NUM_ENTITY_TYPES; entityType++) {
   //                const clientEntityInfo = CLIENT_ENTITY_INFO_RECORD[entityType];
   //                elems.push(
   //                   <option key={entityType + 1} value={entityType}>{clientEntityInfo.name}</option>
   //                );
   //             }
   //             return elems;
   //          })()}
   //       </select>
   //    </ul> -->
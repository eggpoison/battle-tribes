import { roundNum } from "battletribes-shared/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import OPTIONS from "../../../options";
import Board from "../../../Board";
import Camera from "../../../Camera";
import Client from "../../../client/Client";
import { TransformComponentArray } from "../../../entity-components/server-components/TransformComponent";
import Game from "../../../Game";
import { sendToggleSimulationPacket } from "../../../client/packet-creation";

// @Cleanup: shouldn't be able to interact with the info display, all the interactable stuff should be in tabs

let serverTicks = 0;

let tps = -1;

export let updateDebugScreenCurrentTime: (time: number) => void = () => {};
export let updateDebugScreenTicks: (time: number) => void = () => {};
export let updateDebugScreenFPS: () => void = () => {};
export let updateDebugScreenRenderTime: (renderTime: number) => void = () => {};
export let updateDebugScreenIsPaused: (isPaused: boolean) => void = () => {};

export function registerServerTick(): void {
   serverTicks++;
}

export function clearServerTicks(): void {
   tps = serverTicks;
   serverTicks = 0;
}

const GameInfoDisplay = () => {
   const rangeInputRef = useRef<HTMLInputElement | null>(null);
   const maxGreenSafetyInputRef = useRef<HTMLInputElement | null>(null);
   
   const [currentTime, setCurrentTime] = useState(0);
   const [ticks, setTicks] = useState(Board.serverTicks);
   const [zoom, setZoom] = useState(Camera.zoom);
   const [isPaused, setIsPaused] = useState(false);

   const [nightVisionIsEnabled, setNightvisionIsEnabled] = useState(OPTIONS.nightVisionIsEnabled);
   const [showHitboxes, setShowEntityHitboxes] = useState(OPTIONS.showHitboxes);
   const [showDamageBoxes, setShowDamageBoxes] = useState(OPTIONS.showDamageBoxes);
   const [showChunkBorders, setShowChunkBorders] = useState(OPTIONS.showChunkBorders);
   const [showRenderChunkBorders, setShowRenderChunkBorders] = useState(OPTIONS.showRenderChunkBorders);
   const [showPathfindingNodes, setShowPathfindingNodes] = useState(OPTIONS.showPathfindingNodes);
   const [showSafetyNodes, setShowSafetyNodes] = useState(OPTIONS.showSafetyNodes);
   const [showBuildingSafetys, setShowBuildingSafetys] = useState(OPTIONS.showBuildingSafetys);
   const [showBuildingPlans, setShowBuildingPlans] = useState(OPTIONS.showBuildingPlans);
   const [showRestrictedAreas, setShowRestrictedAreas] = useState(OPTIONS.showRestrictedAreas);
   const [showWallConnections, setShowWallConnections] = useState(OPTIONS.showWallConnections);
   const [maxGreenSafety, setMaxGreenSafety] = useState(OPTIONS.maxGreenSafety);
   const [debugLights, setDebugLights] = useState(OPTIONS.debugLights);
   
   useEffect(() => {
      if (typeof Board.time !== "undefined") {
         setCurrentTime(Board.time);
      }

      updateDebugScreenCurrentTime = (time: number): void => {
         setCurrentTime(time);
      }
      updateDebugScreenTicks = (ticks: number): void => {
         setTicks(ticks);
      }

      updateDebugScreenIsPaused = setIsPaused;
   }, []);

   const toggleNightvision = useCallback(() => {
      OPTIONS.nightVisionIsEnabled = !nightVisionIsEnabled;
      setNightvisionIsEnabled(!nightVisionIsEnabled);
   }, [nightVisionIsEnabled]);

   const toggleShowHitboxes = useCallback(() => {
      OPTIONS.showHitboxes = !showHitboxes;
      setShowEntityHitboxes(!showHitboxes);
   }, [showHitboxes]);

   const toggleShowDamageBoxes = useCallback(() => {
      OPTIONS.showDamageBoxes = !showDamageBoxes;
      setShowDamageBoxes(!showDamageBoxes);
   }, [showDamageBoxes]);

   const toggleShowChunkBorders = useCallback(() => {
      OPTIONS.showChunkBorders = !showChunkBorders;
      setShowChunkBorders(!showChunkBorders);
   }, [showChunkBorders]);

   const toggleShowRenderChunkBorders = useCallback(() => {
      OPTIONS.showRenderChunkBorders = !showRenderChunkBorders;
      setShowRenderChunkBorders(!showRenderChunkBorders);
   }, [showRenderChunkBorders]);

   const toggleShowPathfindingNodes = useCallback(() => {
      OPTIONS.showPathfindingNodes = !showPathfindingNodes;
      setShowPathfindingNodes(!showPathfindingNodes);
   }, [showPathfindingNodes]);

   const toggleShowSafetyNodes = useCallback(() => {
      OPTIONS.showSafetyNodes = !showSafetyNodes;
      setShowSafetyNodes(!showSafetyNodes);
   }, [showSafetyNodes]);

   const toggleShowBuildingSafetys = useCallback(() => {
      OPTIONS.showBuildingSafetys = !showBuildingSafetys;
      setShowBuildingSafetys(!showBuildingSafetys);
   }, [showBuildingSafetys]);

   const toggleShowBuildingPlans = useCallback(() => {
      OPTIONS.showBuildingPlans = !showBuildingPlans;
      setShowBuildingPlans(!showBuildingPlans);
   }, [showBuildingPlans]);

   const toggleShowRestrictedAreas = useCallback(() => {
      OPTIONS.showRestrictedAreas = !showRestrictedAreas;
      setShowRestrictedAreas(!showRestrictedAreas);
   }, [showRestrictedAreas]);

   const toggleShowWallConnections = useCallback(() => {
      OPTIONS.showWallConnections = !showWallConnections;
      setShowWallConnections(!showWallConnections);
   }, [showWallConnections]);

   const toggleDebugLights = useCallback(() => {
      OPTIONS.debugLights = !debugLights;
      setDebugLights(!debugLights);
   }, [debugLights]);

   const toggleAIBuilding = useCallback(() => {
      const toggleResult = !showSafetyNodes || !showBuildingSafetys || !showBuildingPlans || !showRestrictedAreas || !showWallConnections;
      
      setShowSafetyNodes(toggleResult);
      setShowBuildingSafetys(toggleResult);
      setShowBuildingPlans(toggleResult);
      setShowRestrictedAreas(toggleResult);
      setShowWallConnections(toggleResult);

      OPTIONS.showSafetyNodes = toggleResult;
      OPTIONS.showBuildingSafetys = toggleResult;
      OPTIONS.showBuildingPlans = toggleResult;
      OPTIONS.showRestrictedAreas = toggleResult;
      OPTIONS.showWallConnections = showWallConnections;
   }, [showSafetyNodes, showBuildingSafetys, showBuildingPlans, showRestrictedAreas, showWallConnections]);

   const changeZoom = () => {
      if (rangeInputRef.current === null) {
         return;
      }

      const rangeInputVal = Number(rangeInputRef.current.value);
      Camera.zoom = rangeInputVal;
      setZoom(rangeInputVal);
   }
   
   const changeMaxGreenSafety = () => {
      if (maxGreenSafetyInputRef.current === null) {
         return;
      }

      const value = Number(maxGreenSafetyInputRef.current.value);
      OPTIONS.maxGreenSafety = value;
      setMaxGreenSafety(value);
   }

   const toggleSimulation = useCallback((): void => {
      if (isPaused) {
         sendToggleSimulationPacket(true);
      } else {
         sendToggleSimulationPacket(false);
      }
   }, [isPaused]);
   
   return <div id="game-info-display" className="devmode-container">
      <p>Time: {currentTime.toFixed(2)}</p>
      <p>Ticks: {roundNum(ticks, 2)}</p>
      <p>Server TPS: {tps}</p>

      <button onClick={toggleSimulation}>{isPaused ? "Resume" : "Pause"} Simulation</button>

      <ul className="area options">
         <li>
            <label className={nightVisionIsEnabled ? "enabled" : undefined}>
               <input checked={nightVisionIsEnabled} name="nightvision-checkbox" type="checkbox" onChange={toggleNightvision} />
               Nightvision
            </label>
         </li>
         <li>
            <label className={showHitboxes ? "enabled" : undefined}>
               <input checked={showHitboxes} name="hitboxes-checkbox" type="checkbox" onChange={toggleShowHitboxes} />
               Hitboxes
            </label>
         </li>
         <li>
            <label className={showDamageBoxes ? "enabled" : undefined}>
               <input checked={showDamageBoxes} name="damage-boxes-checkbox" type="checkbox" onChange={toggleShowDamageBoxes} />
               Damage boxes
            </label>
         </li>
         <li>
            <label className={showChunkBorders ? "enabled" : undefined}>
               <input checked={showChunkBorders} name="chunk-borders-checkbox" type="checkbox" onChange={toggleShowChunkBorders} />
               Chunk borders
            </label>
         </li>
         <li>
            <label className={showRenderChunkBorders ? "enabled" : undefined}>
               <input checked={showRenderChunkBorders} name="render-chunk-borders-checkbox" type="checkbox" onChange={toggleShowRenderChunkBorders} />
               Render chunk borders
            </label>
         </li>
         <li>
            <label className={showPathfindingNodes ? "enabled" : undefined}>
               <input checked={showPathfindingNodes} name="show-pathfinding-nodes-checkbox" type="checkbox" onChange={toggleShowPathfindingNodes} />
               Show pathfinding nodes
            </label>
         </li>
         <li>
            <label className={debugLights ? "enabled" : undefined}>
               <input checked={debugLights} name="debug-lights-checkbox" type="checkbox" onChange={toggleDebugLights} />
               Debug lights
            </label>
         </li>
      </ul>

      <ul className="area">
         <li>{TransformComponentArray.entities.length} Entities</li>
         <li>{Board.lowMonocolourParticles.length + Board.lowTexturedParticles.length + Board.highMonocolourParticles.length + Board.highTexturedParticles.length} Particles</li>
      </ul>

      <ul className="area">
         <li>
            <label>
               <input ref={rangeInputRef} type="range" name="zoom-input" defaultValue={Camera.zoom} min={1} max={2.25} step={0.25} onChange={changeZoom} />
               <br></br>Zoom ({zoom})
            </label>
         </li>
      </ul>

      <div className="area">
         <label className={"title" + ((showSafetyNodes && showBuildingSafetys && showBuildingPlans && showRestrictedAreas && showWallConnections) ? " enabled" : "")}>
            AI Building
            <input checked={showSafetyNodes && showBuildingSafetys && showBuildingPlans && showRestrictedAreas && showWallConnections} type="checkbox" onChange={toggleAIBuilding} />
         </label>
         <div>
            <label className={showSafetyNodes ? "enabled" : undefined}>
               <input checked={showSafetyNodes} name="show-safety-nodes-checkbox" type="checkbox" onChange={toggleShowSafetyNodes} />
               Show safety nodes
            </label>
         </div>
         <div>
            <label className={showBuildingSafetys ? "enabled" : undefined}>
               <input checked={showBuildingSafetys} name="show-building-safetys-checkbox" type="checkbox" onChange={toggleShowBuildingSafetys} />
               Show building safety
            </label>
         </div>
         <div>
            <label className={showBuildingPlans ? "enabled" : undefined}>
               <input checked={showBuildingPlans} name="show-building-plans-checkbox" type="checkbox" onChange={toggleShowBuildingPlans} />
               Show building plans
            </label>
         </div>
         <div>
            <label className={showRestrictedAreas ? "enabled" : undefined}>
               <input checked={showRestrictedAreas} name="show-restricted-areas-checkbox" type="checkbox" onChange={toggleShowRestrictedAreas} />
               Show restricted areas
            </label>
         </div>
         <div>
            <label className={showWallConnections ? "enabled" : undefined}>
               <input checked={showWallConnections} name="show-wall-connections-checkbox" type="checkbox" onChange={toggleShowWallConnections} />
               Show wall connections
            </label>
         </div>
         <div>
            <label>
               <input ref={maxGreenSafetyInputRef} type="range" name="zoom-input" defaultValue={OPTIONS.maxGreenSafety} min={25} max={250} step={5} onChange={changeMaxGreenSafety} />
               <br></br>Max green safety ({maxGreenSafety})
            </label>
         </div>
      </div>
   </div>;
}

export default GameInfoDisplay;
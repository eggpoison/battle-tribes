import { roundNum } from "battletribes-shared/utils";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import OPTIONS from "../../../game/options";
import Board from "../../../game/Board";
import { TransformComponentArray } from "../../../game/entity-components/server-components/TransformComponent";
import { sendDevSetViewedSpawnDistributionPacket, sendSpectateEntityPacket, sendToggleSimulationPacket } from "../../../game/networking/packet-sending";
import { getCurrentLayer } from "../../../game/world";
import { GameInteractState } from "../GameScreen";
import { playerInstance } from "../../../game/player";
import { EntityType, NUM_ENTITY_TYPES } from "../../../../../shared/src/entities";
import CLIENT_ENTITY_INFO_RECORD from "../../../game/client-entity-info";
import { getNumLights } from "../../../game/lights";
import { getMeasuredServerTPS, currentSnapshot } from "../../../game/client";
import { cameraZoom, setCameraZoom } from "../../../game/camera";
import { PacketSnapshot } from "../../../game/networking/packet-snapshots";
import { getNumActiveSounds } from "../../../game/sound";

interface GameInfoDisplayProps {
   readonly isSimulating: boolean;
   setGameInteractState(state: GameInteractState): void;
}

// @Cleanup: shouldn't be able to interact with the info display, all the interactable stuff should be in tabs

export let updateDebugScreenCurrentSnapshot: (snapshot: PacketSnapshot) => void = () => {};
export let updateDebugScreen: () => void = () => {};
export let updateDebugScreenRenderTime: (renderTime: number) => void = () => {};
export let GameInfoDisplay_setBufferSize: (size: number) => void = () => {};

const GameInfoDisplay = (props: GameInfoDisplayProps) => {
   const rangeInputRef = useRef<HTMLInputElement | null>(null);
   const maxGreenSafetyInputRef = useRef<HTMLInputElement | null>(null);
   
   const [currentTime, setCurrentTime] = useState(0);
   const [ticks, setTicks] = useState(currentSnapshot.tick);
   const [zoom, setZoom] = useState(cameraZoom);
   const [bufferSize, setBufferSize] = useState(0);

   const [_, forceUpdate] = useReducer(x => x + 1, 0);

   const [nightVisionIsEnabled, setNightvisionIsEnabled] = useState(OPTIONS.nightVisionIsEnabled);
   const [showHitboxes, setShowEntityHitboxes] = useState(OPTIONS.showHitboxes);
   const [showChunkBorders, setShowChunkBorders] = useState(OPTIONS.showChunkBorders);
   const [showRenderChunkBorders, setShowRenderChunkBorders] = useState(OPTIONS.showRenderChunkBorders);
   const [hideEntities, setHideEntities] = useState(OPTIONS.hideEntities);
   const [showPathfindingNodes, setShowPathfindingNodes] = useState(OPTIONS.showPathfindingNodes);
   const [showSafetyNodes, setShowSafetyNodes] = useState(OPTIONS.showSafetyNodes);
   const [showBuildingSafetys, setShowBuildingSafetys] = useState(OPTIONS.showBuildingSafetys);
   const [showBuildingPlans, setShowBuildingPlans] = useState(OPTIONS.showBuildingPlans);
   const [showRestrictedAreas, setShowRestrictedAreas] = useState(OPTIONS.showRestrictedAreas);
   const [showWallConnections, setShowWallConnections] = useState(OPTIONS.showWallConnections);
   const [maxGreenSafety, setMaxGreenSafety] = useState(OPTIONS.maxGreenSafety);
   const [debugLights, setDebugLights] = useState(OPTIONS.debugLights);
   const [showSubtileSupport, setShowSubtileSupport] = useState(OPTIONS.showSubtileSupports);
   const [showLightLevels, setShowLightLevels] = useState(OPTIONS.showLightLevels);
   const [debugTethers, setDebugTethers] = useState(OPTIONS.debugTethers);
   
   useEffect(() => {
      updateDebugScreenCurrentSnapshot = (snapshot: PacketSnapshot): void => {
         setTicks(snapshot.tick);
         setCurrentTime(snapshot.time);
      }

      updateDebugScreen = forceUpdate;

      GameInfoDisplay_setBufferSize = setBufferSize;
   }, []);

   const toggleNightvision = useCallback(() => {
      OPTIONS.nightVisionIsEnabled = !nightVisionIsEnabled;
      setNightvisionIsEnabled(!nightVisionIsEnabled);
   }, [nightVisionIsEnabled]);

   const toggleShowHitboxes = useCallback(() => {
      OPTIONS.showHitboxes = !showHitboxes;
      setShowEntityHitboxes(!showHitboxes);
   }, [showHitboxes]);

   const toggleShowChunkBorders = useCallback(() => {
      OPTIONS.showChunkBorders = !showChunkBorders;
      setShowChunkBorders(!showChunkBorders);
   }, [showChunkBorders]);

   const toggleShowRenderChunkBorders = useCallback(() => {
      OPTIONS.showRenderChunkBorders = !showRenderChunkBorders;
      setShowRenderChunkBorders(!showRenderChunkBorders);
   }, [showRenderChunkBorders]);

   const toggleHideEntities = useCallback(() => {
      OPTIONS.hideEntities = !hideEntities;
      setHideEntities(!hideEntities);
   }, [hideEntities]);

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

   const toggleShowSubtileSupport = useCallback(() => {
      OPTIONS.showSubtileSupports = !showSubtileSupport;
      setShowSubtileSupport(!showSubtileSupport);
   }, [showSubtileSupport]);

   const toggleShowLightLevels = useCallback(() => {
      OPTIONS.showLightLevels = !showLightLevels;
      setShowLightLevels(!showLightLevels);
   }, [showLightLevels]);

   const toggleDebugTethers = useCallback(() => {
      OPTIONS.debugTethers = !debugTethers;
      setDebugTethers(!debugTethers);
   }, [debugTethers]);

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

      const zoom = Number(rangeInputRef.current.value);
      setCameraZoom(zoom);
      setZoom(zoom);
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
      if (props.isSimulating) {
         sendToggleSimulationPacket(false);
      } else {
         sendToggleSimulationPacket(true);
      }
   }, [props.isSimulating]);

   const onChange = (e: Event): void => {
      const target = e.target as HTMLSelectElement;
      const entityType = Number(target.options[target.selectedIndex].value);
      sendDevSetViewedSpawnDistributionPacket(entityType);
   }
   
   return <div id="game-info-display" className="devmode-container">
      <p>Time: {currentTime.toFixed(2)}</p>
      <p>Ticks: {roundNum(ticks, 2)}</p>
      <p>Server TPS: {getMeasuredServerTPS().toFixed(2)}</p>
      <p>Buffer size: {bufferSize}</p>
      <p>Active sounds: {getNumActiveSounds()}</p>

      <button onClick={toggleSimulation}>{props.isSimulating ? "Pause" : "Resume"} Simulation</button>

      <button onClick={() => props.setGameInteractState(GameInteractState.spectateEntity)}>Spectate Entity</button>
      <button onClick={() => { playerInstance !== null ? sendSpectateEntityPacket(playerInstance) : undefined }}>Clear Spectate</button>

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
            <label className={hideEntities ? "enabled" : undefined}>
               <input checked={hideEntities} name="hide-entities-checkbox" type="checkbox" onChange={toggleHideEntities} />
               Hide entities
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
         <li>
            <label className={showSubtileSupport ? "enabled" : undefined}>
               <input checked={showSubtileSupport} name="show-subtile-support-checkbox" type="checkbox" onChange={toggleShowSubtileSupport} />
               Subtile support
            </label>
         </li>
         <li>
            <label className={showLightLevels ? "enabled" : undefined}>
               <input checked={showLightLevels} name="show-light-levels-checkbox" type="checkbox" onChange={toggleShowLightLevels} />
               Light levels
            </label>
         </li>
         <li>
            <label className={debugTethers ? "enabled" : undefined}>
               <input checked={debugTethers} name="debug-tethers-checkbox" type="checkbox" onChange={toggleDebugTethers} />
               Debug tethers
            </label>
         </li>
      </ul>

      <ul className="area">
         <li>{TransformComponentArray.entities.length} Entities</li>
         <li>{Board.lowMonocolourParticles.length + Board.lowTexturedParticles.length + Board.highMonocolourParticles.length + Board.highTexturedParticles.length} Particles</li>
         <li>{getCurrentLayer().lights.length} ({getNumLights()}) Lights</li>
      </ul>

      <ul className="area">
         <li>
            <label>
               <input ref={rangeInputRef} type="range" name="zoom-input" defaultValue={cameraZoom} min={1} max={2.5} step={0.1} onChange={changeZoom} />
               <br></br>Zoom ({zoom})
            </label>
         </li>
      </ul>

      <ul className="area">
         <select onChange={e => onChange(e.nativeEvent)}>
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
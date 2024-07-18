import { EntityDebugData, GameDataPacket } from "webgl-test-shared/dist/client-server-types";
import { EnemyTribeData } from "webgl-test-shared/dist/techs";
import { Settings } from "webgl-test-shared/dist/settings";
import Board from "./Board";
import Player, { updatePlayerRotation } from "./entities/Player";
import { isDev } from "./utils";
import { createTextCanvasContext, updateTextNumbers, renderText } from "./text-canvas";
import Camera from "./Camera";
import { updateSpamFilter } from "./components/game/ChatBox";
import { createEntityShaders } from "./rendering/webgl/entity-rendering";
import Client from "./client/Client";
import { calculateCursorWorldPositionX, calculateCursorWorldPositionY, cursorX, cursorY, getMouseTargetEntity, handleMouseMovement, renderCursorTooltip } from "./mouse";
import { refreshDebugInfo, setDebugInfoDebugData } from "./components/game/dev/DebugInfo";
import { createWebGLContext, gl, resizeCanvas } from "./webgl";
import { loadTextures } from "./textures";
import { hidePauseScreen, showPauseScreen, toggleSettingsMenu } from "./components/game/GameScreen";
import { App_setGameInteractState, getGameState } from "./components/App";
import { clearPressedKeys } from "./keyboard-input";
import { createHitboxShaders, renderEntityHitboxes } from "./rendering/webgl/hitbox-rendering";
import { updatePlayerItems, updatePlayerMovement } from "./player-input";
import { clearServerTicks, updateDebugScreenFPS, updateDebugScreenRenderTime } from "./components/game/dev/GameInfoDisplay";
import { createWorldBorderShaders, renderWorldBorder } from "./rendering/webgl/world-border-rendering";
import { createSolidTileShaders, renderSolidTiles } from "./rendering/webgl/solid-tile-rendering";
import { createRiverShaders, createRiverSteppingStoneData, renderRivers } from "./rendering/webgl/river-rendering";
import { createChunkBorderShaders, renderChunkBorders } from "./rendering/webgl/chunk-border-rendering";
import { nerdVisionIsVisible } from "./components/game/dev/NerdVision";
import { createDebugDataShaders, renderLineDebugData, renderTriangleDebugData } from "./rendering/webgl/debug-data-rendering";
import { createAmbientOcclusionShaders, renderAmbientOcclusion } from "./rendering/webgl/ambient-occlusion-rendering";
import { createWallBorderShaders, renderWallBorders } from "./rendering/webgl/wall-border-rendering";
import { ParticleRenderLayer, createParticleShaders, renderMonocolourParticles, renderTexturedParticles } from "./rendering/webgl/particle-rendering";
import Tribe from "./Tribe";
import OPTIONS from "./options";
import { RENDER_CHUNK_SIZE, createRenderChunks } from "./rendering/render-chunks";
import { registerFrame, updateFrameGraph } from "./components/game/dev/FrameGraph";
import { createNightShaders, renderNight } from "./rendering/webgl/light-rendering";
import { createPlaceableItemProgram, renderGhostEntities } from "./rendering/webgl/entity-ghost-rendering";
import { setupFrameGraph } from "./rendering/webgl/frame-graph-rendering";
import { createTextureAtlases } from "./texture-atlases/texture-atlases";
import { createFishShaders } from "./rendering/webgl/fish-rendering";
import { createForcefieldShaders, renderForcefield } from "./rendering/webgl/world-border-forcefield-rendering";
import { createDecorationShaders, renderDecorations } from "./rendering/webgl/decoration-rendering";
import { playRiverSounds, setupAudio, updateSoundEffectVolumes } from "./sound";
import { createTechTreeGLContext, createTechTreeShaders, renderTechTree } from "./rendering/webgl/tech-tree-rendering";
import { createResearchOrbShaders, renderResearchOrb } from "./rendering/webgl/research-orb-rendering";
import { attemptToResearch, updateActiveResearchBench, updateResearchOrb } from "./research";
import { resetInteractableEntityIDs, updateHighlightedAndHoveredEntities, updateSelectedStructure } from "./entity-selection";
import { createStructureHighlightShaders, renderEntitySelection } from "./rendering/webgl/entity-selection-rendering";
import { InventorySelector_forceUpdate } from "./components/game/inventories/InventorySelector";
import { createTurretRangeShaders, renderTurretRange } from "./rendering/webgl/turret-range-rendering";
import { createPathfindNodeShaders, renderPathfindingNodes } from "./rendering/webgl/pathfinding-node-rendering";
import { updateInspectHealthBar } from "./components/game/InspectHealthBar";
import { createSafetyNodeShaders, renderSafetyNodes } from "./rendering/webgl/safety-node-rendering";
import { createRestrictedBuildingAreaShaders, renderRestrictedBuildingAreas } from "./rendering/webgl/restricted-building-areas-rendering";
import { createWallConnectionShaders, renderWallConnections } from "./rendering/webgl/wall-connection-rendering";
import { createHealingBeamShaders, renderHealingBeams } from "./rendering/webgl/healing-beam-rendering";
import { BuildMenu_refreshBuildingID, BuildMenu_updateBuilding } from "./components/game/BuildMenu";
import { createGrassBlockerShaders, renderGrassBlockers } from "./rendering/webgl/grass-blocker-rendering";
import { createTechTreeItemShaders, renderTechTreeItems, updateTechTreeItems } from "./rendering/webgl/tech-tree-item-rendering";
import { createUBOs, updateUBOs } from "./rendering/ubos";
import { createEntityOverlayShaders } from "./rendering/webgl/overlay-rendering";
import { updateRenderPartMatrices } from "./rendering/render-part-matrices";
import { EntitySummonPacket } from "webgl-test-shared/dist/dev-packets";
import { Mutable } from "webgl-test-shared/dist/utils";
import { renderRenderables } from "./rendering/render-loop";
import { InitialGameDataPacket } from "./client/packet-processing";

export const enum GameInteractState {
   none,
   summonEntity
}

// @Cleanup: remove.
let _frameProgress = Number.EPSILON;

let listenersHaveBeenCreated = false;

// @Cleanup: remove.
export function getFrameProgress(): number {
   return _frameProgress;
}

const createEventListeners = (): void => {
   if (listenersHaveBeenCreated) return;
   listenersHaveBeenCreated = true;

   window.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Escape" && getGameState() === "game") {
         toggleSettingsMenu();
      }
   });
   
   window.addEventListener("focus", () => {
      Game.unpause();
   });
   window.addEventListener("blur", () => {
      Game.pause();
   });

   window.addEventListener("mousemove", handleMouseMovement);
}

let lastRenderTime = Math.floor(new Date().getTime() / 1000);

abstract class Game {
   private static interactState = GameInteractState.none;
   public static summonPacket: Mutable<EntitySummonPacket> | null = null;
   
   private static lastTime = 0;

   private static numSkippablePackets = 0;
   
   public static queuedPackets = new Array<GameDataPacket>();
   
   public static isRunning = false;
   private static isPaused = false;

   /** If the game has recevied up-to-date game data from the server. Set to false when paused */
   // @Cleanup: We might be able to remove this whole system by just always sending player data. But do we want to do that???
   public static isSynced = true;

   public static hasInitialised = false;

   /** Amount of time the game is through the current frame */
   private static lag = 0;

   // @Cleanup: Make these not be able to be null, just number
   public static cursorPositionX: number | null = null;
   public static cursorPositionY: number | null = null;

   public static entityDebugData: EntityDebugData | null = null;

   public static tribe: Tribe;
   public static enemyTribes: ReadonlyArray<EnemyTribeData>;

   // @Hack @Cleanup
   public static playerID: number;

   public static setInteractState(interactState: GameInteractState): void {
      App_setGameInteractState(interactState);
      this.interactState = interactState;
   }

   public static getInteractState(): GameInteractState {
      return this.interactState;
   }
   
   public static setGameObjectDebugData(entityDebugData: EntityDebugData | undefined): void {
      if (typeof entityDebugData === "undefined") {
         this.entityDebugData = null;
         setDebugInfoDebugData(null);
      } else {
         this.entityDebugData = entityDebugData;
         setDebugInfoDebugData(entityDebugData);
      }
   }

   public static getGameObjectDebugData(): EntityDebugData | null {
      return this.entityDebugData || null;
   }

   /** Starts the game */
   public static start(): void {
      createEventListeners();
      resizeCanvas();

      // Set the player's initial rotation
      if (cursorX !== null && cursorY !== null) {
         updatePlayerRotation(cursorX, cursorY);
      }
               
      // Start the game loop
      this.isSynced = true;
      this.isRunning = true;
      this.lastTime = performance.now();
      requestAnimationFrame(time => this.main(time));
   }

   public static stop(): void {
      this.isRunning = false;
   }

   public static pause(): void {
      this.isPaused = true;
      showPauseScreen();

      this.isSynced = false;

      clearPressedKeys();

      Client.sendDeactivatePacket();
   }
   
   public static unpause(): void {
      this.isPaused = false;
      hidePauseScreen();

      Client.sendActivatePacket();
   }

   public static getIsPaused(): boolean {
      return this.isPaused;
   }
   
   public static sync(): void {
      Game.lastTime = performance.now();
      this.isSynced = true;
   }
   
   /**
    * Prepares the game to be played. Called once just before the game starts.
    */
   public static async initialise(initialGameDataPacket: InitialGameDataPacket): Promise<void> {
      Game.enemyTribes = [];

      // Clear any queued packets from previous games
      Game.queuedPackets = [];

      resetInteractableEntityIDs();
      
      if (!Game.hasInitialised) {
         return new Promise(async resolve => {
            createWebGLContext();
            createTechTreeGLContext();
            createTextCanvasContext();

            Board.initialise(initialGameDataPacket);
            Board.addRiverSteppingStonesToChunks(initialGameDataPacket.riverSteppingStones);
         
            createRiverSteppingStoneData(initialGameDataPacket.riverSteppingStones);

            createUBOs();
            
            // We load the textures before we create the shaders because some shader initialisations stitch textures together
            await loadTextures();
            await createTextureAtlases();
            
            // Create shaders
            createSolidTileShaders();
            createRiverShaders();
            createFishShaders();
            createEntityShaders();
            await createEntityOverlayShaders();
            createWorldBorderShaders();
            createPlaceableItemProgram();
            createChunkBorderShaders();
            createHitboxShaders();
            createDebugDataShaders();
            createNightShaders();
            createParticleShaders();
            createWallBorderShaders();
            createAmbientOcclusionShaders();
            createForcefieldShaders();
            createDecorationShaders();
            createTechTreeShaders();
            createTechTreeItemShaders();
            createResearchOrbShaders();
            createStructureHighlightShaders();
            createTurretRangeShaders();
            createPathfindNodeShaders();
            createSafetyNodeShaders();
            createRestrictedBuildingAreaShaders();
            createWallConnectionShaders();
            createHealingBeamShaders();
            createGrassBlockerShaders();

            await setupAudio();

            if (isDev()) {
               setupFrameGraph();
            }

            createRenderChunks(initialGameDataPacket.decorations, initialGameDataPacket.waterRocks, initialGameDataPacket.riverSteppingStones);

            this.hasInitialised = true;
   
            resolve();
         });
      } else {
         Board.initialise(initialGameDataPacket);
         Board.addRiverSteppingStonesToChunks(initialGameDataPacket.riverSteppingStones);

         createRenderChunks(initialGameDataPacket.decorations, initialGameDataPacket.waterRocks, initialGameDataPacket.riverSteppingStones);
      }
   }

   public static main(currentTime: number): void {
      if (this.isSynced) {
         const deltaTime = currentTime - Game.lastTime;
         Game.lastTime = currentTime;
      
         this.lag += deltaTime;
         while (this.lag >= 1000 / Settings.TPS) {
            if (this.queuedPackets.length > 0) {
               // Done before so that server data can override particles
               Board.updateParticles();
               
               // If there is a backlog of packets and none are able to be skipped, skip to the final packet
               if (this.numSkippablePackets === 0 && this.queuedPackets.length >= 2) {
                  // Unload all the packets so that things like hits taken aren't skipped
                  for (let i = 0; i < this.queuedPackets.length; i++) {
                     Client.processGameDataPacket(this.queuedPackets[i]);
                  }
                  this.queuedPackets.splice(0, this.queuedPackets.length);
               } else {
                  Client.processGameDataPacket(this.queuedPackets[0]);
                  this.queuedPackets.splice(0, 1);
                  this.numSkippablePackets--;
                  
                  if (this.queuedPackets.length === 0 || this.numSkippablePackets < 0) {
                     this.numSkippablePackets = 0;
                  }
               }

               updateTextNumbers();
               Board.updateTickCallbacks();
               Board.tickEntities();
               this.update();

               if (Player.instance !== null) {
                  Player.instance.update();
               }
            } else {
               this.numSkippablePackets++;
               
               updateTextNumbers();
               Board.updateTickCallbacks();
               Board.updateParticles();
               Board.updateEntities();
               this.update();
            }
            Client.sendPlayerDataPacket();
            this.lag -= 1000 / Settings.TPS;
         }

         const renderStartTime = performance.now();

         const frameProgress = this.lag / 1000 * Settings.TPS;
         this.render(frameProgress);

         const renderEndTime = performance.now();

         const renderTime = renderEndTime - renderStartTime;
         registerFrame(renderStartTime, renderEndTime);
         updateFrameGraph();
         updateDebugScreenRenderTime(renderTime);
      }

      if (this.isRunning) {
         requestAnimationFrame(time => this.main(time));
      }
   }

   private static update(): void {
      updateSpamFilter();

      updatePlayerMovement();
      // @Temporary
      // updateAvailableCraftingRecipes();
      
      updatePlayerItems();
      updateActiveResearchBench();
      updateResearchOrb();
      attemptToResearch();

      updateHighlightedAndHoveredEntities();
      updateSelectedStructure();
      BuildMenu_updateBuilding();
      BuildMenu_refreshBuildingID();
      // @Incomplete?
      // updateInspectHealthBar();
      InventorySelector_forceUpdate();

      updateTechTreeItems();
      
      updateSoundEffectVolumes();
      playRiverSounds();

      this.cursorPositionX = calculateCursorWorldPositionX(cursorX!);
      this.cursorPositionY = calculateCursorWorldPositionY(cursorY!);
      renderCursorTooltip();

      if (isDev()) refreshDebugInfo();
   }

   /**
    * 
    * @param frameProgress How far the game is into the current frame (0 = frame just started, 0.99 means frame is about to end)
    */
   private static render(frameProgress: number): void {
      // Player rotation is updated each render, but only sent each update
      if (cursorX !== null && cursorY !== null) {
         updatePlayerRotation(cursorX, cursorY);
      }
      
      const currentRenderTime = Math.floor(new Date().getTime() / 1000);
      if (currentRenderTime !== lastRenderTime) {
         clearServerTicks();
      }
      lastRenderTime = currentRenderTime;

      // Clear the canvas
      gl.clearColor(1, 1, 1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      // @Cleanup: weird. shouldn't be global anyway
      _frameProgress = frameProgress;

      // @Cleanup: move to update function in camera
      // Update the camera
      if (Player.instance !== null) {
         const frameProgress = getFrameProgress();
         Player.instance.updateRenderPosition(frameProgress);
         Camera.updatePosition();
         Camera.updateVisibleChunkBounds();
         Camera.updateVisibleRenderChunkBounds();
      }

      updateUBOs();

      renderText();

      renderSolidTiles(false);
      renderGrassBlockers();
      renderRivers(frameProgress);
      renderDecorations();
      renderTurretRange();
      renderAmbientOcclusion();
      if (nerdVisionIsVisible() && this.entityDebugData !== null && typeof Board.entityRecord[this.entityDebugData.entityID] !== "undefined") {
         renderTriangleDebugData(this.entityDebugData);
      }
      renderForcefield();
      renderWorldBorder();
      renderRestrictedBuildingAreas();
      if (nerdVisionIsVisible() && OPTIONS.showChunkBorders) {
         renderChunkBorders(Camera.minVisibleChunkX, Camera.maxVisibleChunkX, Camera.minVisibleChunkY, Camera.maxVisibleChunkY, Settings.CHUNK_SIZE, 1);
      }
      if (nerdVisionIsVisible() && OPTIONS.showRenderChunkBorders) {
         renderChunkBorders(Camera.minVisibleRenderChunkX, Camera.maxVisibleRenderChunkX, Camera.minVisibleRenderChunkY, Camera.maxVisibleRenderChunkY, RENDER_CHUNK_SIZE, 2);
      }

      if (OPTIONS.showParticles) {
         renderMonocolourParticles(ParticleRenderLayer.low);
         renderTexturedParticles(ParticleRenderLayer.low);
      }

      renderHealingBeams();

      updateRenderPartMatrices(frameProgress);

      renderRenderables(frameProgress);

      // renderGameObjects(frameProgress);
      // renderEntityOverlays();

      renderSolidTiles(true);
      renderWallBorders();

      renderEntitySelection();
      
      if (OPTIONS.showParticles) {
         renderMonocolourParticles(ParticleRenderLayer.high);
         renderTexturedParticles(ParticleRenderLayer.high);
      }

      renderPathfindingNodes();
      renderSafetyNodes();
      renderWallConnections();
      renderResearchOrb();

      if (nerdVisionIsVisible() && OPTIONS.showHitboxes) {
         renderEntityHitboxes();
      }
      if (nerdVisionIsVisible() && this.entityDebugData !== null && typeof Board.entityRecord[this.entityDebugData.entityID] !== "undefined") {
         renderLineDebugData(this.entityDebugData);
      }

      if (isDev()) {
         const trackedEntity = Board.entityRecord[Camera.trackedEntityID];
         if (typeof trackedEntity !== "undefined" && Camera.trackedEntityID !== Player.instance?.id) {
            Client.sendTrackEntity(Camera.trackedEntityID);
         } else if (nerdVisionIsVisible()) {
            const targettedEntity = getMouseTargetEntity();
            Client.sendTrackEntity(targettedEntity !== null ? targettedEntity.id : 0);
         } else {
            Client.sendTrackEntity(0);
         }
      }

      renderGhostEntities();
      
      renderNight();

      updateDebugScreenFPS();
      updateInspectHealthBar();
      
      renderTechTree();
      renderTechTreeItems();
   }

   public static getEnemyTribeData(tribeID: number): EnemyTribeData {
      for (const tribeData of Game.enemyTribes) {
         if (tribeData.id === tribeID) {
            return tribeData;
         }
      }
      throw new Error("No tribe data for tribe with ID " + tribeID);
   }
}

export default Game;
import { EntityDebugData } from "battletribes-shared/client-server-types";
import { EnemyTribeData } from "battletribes-shared/techs";
import { Settings } from "battletribes-shared/settings";
import Board from "./Board";
import Player, { updatePlayerRotation } from "./entities/Player";
import { isDev } from "./utils";
import { createTextCanvasContext, updateTextNumbers, renderText } from "./text-canvas";
import Camera from "./Camera";
import { updateSpamFilter } from "./components/game/ChatBox";
import { createEntityShaders } from "./rendering/webgl/entity-rendering";
import Client, { popGameDataPacket } from "./client/Client";
import { calculateCursorWorldPositionX, calculateCursorWorldPositionY, cursorX, cursorY, getMouseTargetEntity, handleMouseMovement, renderCursorTooltip } from "./mouse";
import { refreshDebugInfo, setDebugInfoDebugData } from "./components/game/dev/DebugInfo";
import { createWebGLContext, gl, resizeCanvas } from "./webgl";
import { loadTextures, preloadTextureImages } from "./textures";
import { toggleSettingsMenu } from "./components/game/GameScreen";
import { createHitboxShaders, renderDamageBoxes, renderHitboxes } from "./rendering/webgl/box-wireframe-rendering";
import { clearServerTicks, updateDebugScreenFPS, updateDebugScreenRenderTime } from "./components/game/dev/GameInfoDisplay";
import { createWorldBorderShaders, renderWorldBorder } from "./rendering/webgl/world-border-rendering";
import { createSolidTileShaders, renderSolidTiles } from "./rendering/webgl/solid-tile-rendering";
import { calculateVisibleRiverInfo, createRiverShaders, createRiverSteppingStoneData, renderLowerRiverFeatures, renderUpperRiverFeatures } from "./rendering/webgl/river-rendering";
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
import { createForcefieldShaders, renderForcefield } from "./rendering/webgl/world-border-forcefield-rendering";
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
import { renderNextRenderables, resetRenderOrder } from "./rendering/render-loop";
import { InitialGameDataPacket, processGameDataPacket } from "./client/packet-processing";
import { MAX_RENDER_LAYER, RenderLayer } from "./render-layers";
import { updateEntity } from "./entity-components/ComponentArray";
import { resolveEntityCollisions, resolvePlayerCollisions } from "./collision";
import { preloadTextureAtlasImages } from "./texture-atlases/texture-atlas-stitching";
import { updatePlayerMovement, updatePlayerItems } from "./components/game/GameInteractableLayer";

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
      if (e.key === "Escape" && Game.isRunning) {
         toggleSettingsMenu();
      }
   });

   window.addEventListener("mousemove", handleMouseMovement);
}

let lastRenderTime = Math.floor(new Date().getTime() / 1000);

const main = (currentTime: number): void => {
   if (Game.isSynced) {
      const deltaTime = currentTime - Game.lastTime;
      Game.lastTime = currentTime;
   
      Game.lag += deltaTime;
      while (Game.lag >= 1000 / Settings.TPS) {
         const packet = popGameDataPacket();
         if (packet !== null) {
            // Done before so that server data can override particles
            Board.updateParticles();

            processGameDataPacket(packet);

            updateTextNumbers();
            Board.updateTickCallbacks();
            if (Player.instance !== null) {
               updateEntity(Player.instance);
            }
            Board.tickEntities();
            if (Player.instance !== null) {
               resolvePlayerCollisions();
            }
            Game.update();
         } else {
            updateTextNumbers();
            Board.updateTickCallbacks();
            Board.updateParticles();
            Board.updateEntities();
            Board.tickEntities();
            resolveEntityCollisions();
            Game.update();
         }
         
         Client.sendPlayerDataPacket();

         Game.lag -= 1000 / Settings.TPS;
      }

      const renderStartTime = performance.now();

      const frameProgress = Game.lag / 1000 * Settings.TPS;
      Game.render(frameProgress);

      const renderEndTime = performance.now();

      const renderTime = renderEndTime - renderStartTime;
      registerFrame(renderStartTime, renderEndTime);
      updateFrameGraph();
      updateDebugScreenRenderTime(renderTime);
   }

   if (Game.isRunning) {
      requestAnimationFrame(main);
   }
}

abstract class Game {
   public static lastTime = 0;

   public static isRunning = false;

   /** If the game has recevied up-to-date game data from the server. Set to false when paused */
   // @Cleanup: We might be able to remove this whole system by just always sending player data. But do we want to do that???
   public static isSynced = true;

   public static hasInitialised = false;

   /** Amount of time the game is through the current frame */
   public static lag = 0;

   // @Cleanup: Make these not be able to be null, just number
   public static cursorPositionX: number | null = null;
   public static cursorPositionY: number | null = null;

   public static entityDebugData: EntityDebugData | null = null;

   public static tribe: Tribe;
   public static enemyTribes: ReadonlyArray<EnemyTribeData>;

   // @Hack @Cleanup: remove this!
   public static playerID: number;
   
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
      requestAnimationFrame(main);
   }

   public static stop(): void {
      this.isRunning = false;
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
      popGameDataPacket();

      resetInteractableEntityIDs();
      
      if (!Game.hasInitialised) {
         return new Promise(async resolve => {
            const start = performance.now();
            let l = performance.now();
            createWebGLContext();
            createTechTreeGLContext();
            createTextCanvasContext();

            console.log("creating contexts",performance.now() - l);
            l = performance.now();
            Board.initialise(initialGameDataPacket);
            Board.addRiverSteppingStonesToChunks(initialGameDataPacket.riverSteppingStones);
         
            createRiverSteppingStoneData(initialGameDataPacket.riverSteppingStones);

            createUBOs();
            
            console.log("initialising board",performance.now() - l);
            l = performance.now();
            preloadTextureAtlasImages();
            const textureImages = preloadTextureImages();

            console.log("preloading images",performance.now() - l);
            l = performance.now();
            // @Speed
            await setupAudio();
            
            console.log("audio",performance.now() - l);
            l = performance.now();
            // We load the textures before we create the shaders because some shader initialisations stitch textures together
            await loadTextures(textureImages);
            console.log("loading textures",performance.now() - l);
            // @Hack
            await new Promise<void>(resolve => {
               setTimeout(() => {
                  resolve();
               }, 1000)
            });
            l = performance.now();
            // @Speed
            await createTextureAtlases();
            console.log("texture atlases",performance.now() - l);
            l = performance.now();

            // Create shaders
            createSolidTileShaders();
            createRiverShaders();
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
            if (isDev()) {
               setupFrameGraph();
            }

            console.log("shader stuff",performance.now() - l);
            l = performance.now();
            createRenderChunks(initialGameDataPacket.waterRocks, initialGameDataPacket.riverSteppingStones);

            console.log("render chunks",performance.now() - l);
            console.log(performance.now() - start);
            this.hasInitialised = true;
   
            resolve();
         });
      } else {
         Board.initialise(initialGameDataPacket);
         Board.addRiverSteppingStonesToChunks(initialGameDataPacket.riverSteppingStones);

         createRenderChunks(initialGameDataPacket.waterRocks, initialGameDataPacket.riverSteppingStones);
      }
   }

   public static update(): void {
      Board.clientTicks++;
      
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
   public static render(frameProgress: number): void {
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

      renderHealingBeams();

      updateRenderPartMatrices(frameProgress);

      const visibleRiverRenderChunks = calculateVisibleRiverInfo();
      resetRenderOrder();

      renderLowerRiverFeatures(visibleRiverRenderChunks);
      // Render everything up to fish
      renderNextRenderables(RenderLayer.fish);
      renderUpperRiverFeatures(visibleRiverRenderChunks);
      if (OPTIONS.showParticles) {
         renderMonocolourParticles(ParticleRenderLayer.low);
         renderTexturedParticles(ParticleRenderLayer.low);
      }
      // Render the rest
      renderNextRenderables(MAX_RENDER_LAYER);

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

      if (OPTIONS.showHitboxes) {
         renderHitboxes();
      }
      if (OPTIONS.showDamageBoxes) {
         renderDamageBoxes();
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

if (module.hot) {
   module.hot.dispose(data => {
      data.tribe = Game.tribe;
      data.playerID = Game.playerID;
   });

   if (module.hot.data) {
      Game.tribe = module.hot.data.tribe;
      Game.playerID = module.hot.data.playerID;
   }
}
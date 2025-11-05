import { Settings } from "../../../../shared/src/settings";
import { maxVisibleChunkX, maxVisibleChunkY, maxVisibleRenderChunkX, maxVisibleRenderChunkY, minVisibleChunkX, minVisibleChunkY, minVisibleRenderChunkX, minVisibleRenderChunkY, refreshCameraPosition, refreshCameraView } from "../camera";
import { getHighlightedRenderInfo } from "../entity-selection";
import Layer from "../Layer";
import { updatePlayerRotation } from "../player";
import { RenderLayer, MAX_RENDER_LAYER } from "../render-layers";
import { loadSoundEffects } from "../sound";
import { createTextCanvasContext, renderText } from "../text-canvas";
import { preloadTextureAtlasImages } from "../texture-atlases/texture-atlas-stitching";
import { createTextureAtlases } from "../texture-atlases/texture-atlases";
import { preloadTextureImages, loadTextures } from "../textures";
import { isDev } from "../utils";
import { gl, windowWidth, windowHeight, createTexture, createWebGLContext } from "../webgl";
import { layers, getCurrentLayer, entityExists, getEntityRenderInfo } from "../world";
import { renderLightLevelsText } from "./light-levels-text-rendering";
import { createRenderChunks, RENDER_CHUNK_SIZE } from "./render-chunks";
import { resetRenderOrder, renderNextRenderables } from "./render-loop";
import { updateRenderPartMatrices } from "./render-part-matrices";
import { createTribePlanVisualiserGLContext, renderTribePlans } from "./tribe-plan-visualiser/tribe-plan-visualiser";
import { createUBOs, updateUBOs } from "./ubos";
import { createHitboxShaders, renderHitboxes } from "./webgl/box-wireframe-rendering";
import { createBuildingBlockingTileShaders, renderBuildingBlockingTiles } from "./webgl/building-blocking-tiles-rendering";
import { createChunkBorderShaders, renderChunkBorders } from "./webgl/chunk-border-rendering";
import { refreshChunkedEntityRenderingBuffers } from "./webgl/chunked-entity-rendering";
import { renderTriangleDebugData, renderLineDebugData, createDebugDataShaders } from "./webgl/debug-data-rendering";
import { createDebugImageShaders, renderDebugImages } from "./webgl/debug-image-rendering";
import { renderGhostEntities } from "./webgl/entity-ghost-rendering";
import { createEntityShaders } from "./webgl/entity-rendering";
import { createStructureHighlightShaders, renderEntitySelection } from "./webgl/entity-selection-rendering";
import { setupFrameGraph } from "./webgl/frame-graph-rendering";
import { createGrassBlockerShaders, renderGrassBlockers } from "./webgl/grass-blocker-rendering";
import { createHealingBeamShaders, renderHealingBeams } from "./webgl/healing-beam-rendering";
import { createDarkeningShaders, renderLayerDarkening } from "./webgl/layer-darkening-rendering";
import { createLightDebugShaders, renderLightingDebug } from "./webgl/light-debug-rendering";
import { createLightLevelsBGShaders, renderLightLevelsBG } from "./webgl/light-levels-bg-rendering";
import { createNightShaders, renderLighting } from "./webgl/lighting-rendering";
import { createMithrilRichTileRenderingShaders, renderMithrilRichTileOverlays } from "./webgl/mithril-rich-tile-rendering";
import { createEntityOverlayShaders } from "./webgl/overlay-rendering";
import { renderMonocolourParticles, ParticleRenderLayer, renderTexturedParticles, createParticleShaders } from "./webgl/particle-rendering";
import { createPathfindNodeShaders, renderPathfindingNodes } from "./webgl/pathfinding-node-rendering";
import { createResearchOrbShaders, renderResearchOrb } from "./webgl/research-orb-rendering";
import { createRestrictedBuildingAreaShaders, renderRestrictedBuildingAreas } from "./webgl/restricted-building-areas-rendering";
import { calculateVisibleRiverInfo, createRiverShaders, renderLowerRiverFeatures, renderUpperRiverFeatures } from "./webgl/river-rendering";
import { createSafetyNodeShaders, renderSafetyNodes } from "./webgl/safety-node-rendering";
import { createSlimeTrailShaders, renderSlimeTrails } from "./webgl/slime-trail-rendering";
import { clearSolidTileRenderingData, createSolidTileShaders, renderSolidTiles } from "./webgl/solid-tile-rendering";
import { createSubtileSupportShaders, renderSubtileSupports } from "./webgl/subtile-support-rendering";
import { createTechTreeItemShaders, renderTechTreeItems } from "./webgl/tech-tree-item-rendering";
import { createTechTreeGLContext, createTechTreeShaders, renderTechTree } from "./webgl/tech-tree-rendering";
import { createTileBreakProgressShaders, renderTileBreakProgress } from "./webgl/tile-break-progress-rendering";
import { createTileShadowShaders, renderTileShadows, TileShadowType } from "./webgl/tile-shadow-rendering";
import { createTurretRangeShaders, renderTurretRange } from "./webgl/turret-range-rendering";
import { createWallBorderShaders, renderWallBorders } from "./webgl/wall-border-rendering";
import { createWallConnectionShaders, renderWallConnections } from "./webgl/wall-connection-rendering";
import { createForcefieldShaders, renderForcefield } from "./webgl/world-border-forcefield-rendering";
import { createWorldBorderShaders, renderWorldBorder } from "./webgl/world-border-rendering";
import { playerIsHoldingPlaceableItem } from "../player-action-handler";
import { entityInteractionState } from "../../ui-state/entity-interaction-state.svelte";
import { debugDisplayState } from "../../ui-state/debug-display-state.svelte";
import { nerdVisionState } from "../../ui-state/nerd-vision-state.svelte";
import { hoverDebugState } from "../../ui-state/hover-debug-state.svelte";

export let gameFramebuffer: WebGLFramebuffer;
export let gameFramebufferTexture: WebGLTexture;

// @Cleanup: this is ambiguous... what texture?
let lastTextureWidth = 0;
let lastTextureHeight = 0;

let hasSetupRendering = false;

export async function setupRendering(): Promise<void> {
   if (!hasSetupRendering) {
      return new Promise(async resolve => {
         const start = performance.now();
         let l = performance.now();
         createWebGLContext();
         createTechTreeGLContext();
         createTextCanvasContext();
         createTribePlanVisualiserGLContext();

         console.log("creating contexts",performance.now() - l);
         l = performance.now();
         
         clearSolidTileRenderingData();
         for (const layer of layers) {
            createRenderChunks(layer, layer.waterRocks);
         }

         preloadTextureAtlasImages();
         const textureImages = preloadTextureImages();

         console.log("preloading images",performance.now() - l);
         l = performance.now();
         // @Speed
         await loadSoundEffects();
         
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
         
         // Done after creating texture atlases as the data from them is used in a ubo
         createUBOs();

         // @Cleanup: Move to separate function
         gameFramebuffer = gl.createFramebuffer()!;

         // Create shaders
         createSolidTileShaders();
         createRiverShaders();
         createEntityShaders();
         await createEntityOverlayShaders();
         createWorldBorderShaders();
         createChunkBorderShaders();
         createHitboxShaders();
         createDebugDataShaders();
         createNightShaders();
         createParticleShaders();
         createWallBorderShaders();
         createDarkeningShaders();
         createTileShadowShaders();
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
         createLightDebugShaders();
         createTileBreakProgressShaders();
         createSubtileSupportShaders();
         createSlimeTrailShaders();
         createBuildingBlockingTileShaders();
         createLightLevelsBGShaders();
         createMithrilRichTileRenderingShaders();
         createDebugImageShaders();
         if (isDev()) {
            setupFrameGraph();
         }

         console.log("shader stuff",performance.now() - l);
         l = performance.now();

         console.log("render chunks",performance.now() - l);
         console.log(performance.now() - start);
         
         hasSetupRendering = true;
         resolve();
      });
   } else {
      clearSolidTileRenderingData();
      for (const layer of layers) {
         createRenderChunks(layer, layer.waterRocks);
      }
   }
}

const renderLayer = (layer: Layer, frameProgress: number): void => {
   if (layer === getCurrentLayer()) {
      renderText(frameProgress);
   }
   
   resetRenderOrder();

   gl.bindFramebuffer(gl.FRAMEBUFFER, gameFramebuffer);

   // @Incomplete: A whole lot of these are not layer specific

   renderTileShadows(layer, TileShadowType.dropdownShadow);

   renderSolidTiles(layer, false);
   renderMithrilRichTileOverlays(layer, false);
   renderGrassBlockers();

   renderTurretRange();

   const entityDebugData = hoverDebugState.entityDebugData;
   if (nerdVisionState.isVisible && entityDebugData !== null && entityExists(entityDebugData.entityID)) {
      renderTriangleDebugData(entityDebugData);
   }
   renderRestrictedBuildingAreas();
   if (nerdVisionState.isVisible && debugDisplayState.showChunkBorders) {
      renderChunkBorders(minVisibleChunkX, maxVisibleChunkX, minVisibleChunkY, maxVisibleChunkY, Settings.CHUNK_SIZE, 1);
   }
   if (nerdVisionState.isVisible && debugDisplayState.showRenderChunkBorders) {
      renderChunkBorders(minVisibleRenderChunkX, maxVisibleRenderChunkX, minVisibleRenderChunkY, maxVisibleRenderChunkY, RENDER_CHUNK_SIZE, 2);
   }

   // @Incomplete: Not layer specific
   renderHealingBeams();

   renderSlimeTrails(layer);

   refreshChunkedEntityRenderingBuffers(layer);

   const visibleRiverRenderChunks = calculateVisibleRiverInfo(layer);

   renderLowerRiverFeatures(layer, visibleRiverRenderChunks);
   // Render everything up to fish
   renderNextRenderables(layer, RenderLayer.fish);
   renderUpperRiverFeatures(layer, visibleRiverRenderChunks);
   if (debugDisplayState.showParticles) {
      renderMonocolourParticles(ParticleRenderLayer.low);
      renderTexturedParticles(ParticleRenderLayer.low);
   }
   // Render up to walls
   renderNextRenderables(layer, RenderLayer.WALL_SEPARATOR);

   // Render walls
   renderTileShadows(layer, TileShadowType.wallShadow);
   renderSolidTiles(layer, true);
   renderMithrilRichTileOverlays(layer, true);
   renderTileBreakProgress(layer);
   renderWallBorders(layer);

   // Render everything else
   renderNextRenderables(layer, MAX_RENDER_LAYER);

   if (layer === getCurrentLayer()) {
      // @Cleanup: should this only be for the current layer?
      // @Cleanup this is so messy
      if (entityInteractionState.selectedEntity !== null) {
         const renderInfo = getEntityRenderInfo(entityInteractionState.selectedEntity);
         renderEntitySelection(renderInfo, frameProgress, true);
      }
      const renderInfo = getHighlightedRenderInfo();
      // @INCOMPLETE @SQUEAM: This should be highlighted
      if (renderInfo !== null && entityInteractionState.hoveredEntity !== entityInteractionState.selectedEntity) {
         renderEntitySelection(renderInfo, frameProgress, false);
      }
   }
   
   renderForcefield();
   renderWorldBorder();
   
   if (debugDisplayState.showParticles) {
      renderMonocolourParticles(ParticleRenderLayer.high);
      renderTexturedParticles(ParticleRenderLayer.high);
   }

   renderPathfindingNodes();
   renderSafetyNodes();
   renderWallConnections();
   renderResearchOrb();

   if (debugDisplayState.showHitboxes) {
      renderHitboxes(layer);
   }
   if (nerdVisionState.isVisible && entityDebugData !== null && entityExists(entityDebugData.entityID)) {
      renderLineDebugData(entityDebugData);
   }

   renderGhostEntities();

   // Should be before lighting so that the player can't use building blocking tiles to see in the dark
   if (layer === getCurrentLayer() && playerIsHoldingPlaceableItem()) {
      renderBuildingBlockingTiles();
   }
      
   gl.bindFramebuffer(gl.FRAMEBUFFER, null);

   renderLighting(layer);
   if (debugDisplayState.debugLights) {
      renderLightingDebug(layer);
   }

   if (debugDisplayState.debugTethers) {
      // @Incomplete: not per layer
      renderDebugImages();
   }
}

export function renderGame(clientTickInterp: number, serverTickInterp: number): void {
   // Player rotation is updated each render, but only sent each update
   updatePlayerRotation();
   
   gl.bindFramebuffer(gl.FRAMEBUFFER, gameFramebuffer);

   if (lastTextureWidth !== windowWidth || lastTextureHeight !== windowHeight) {
      gameFramebufferTexture = createTexture(windowWidth, windowHeight);

      lastTextureWidth = windowWidth;
      lastTextureHeight = windowHeight;
   
      // Attach the texture as the first color attachment
      const attachmentPoint = gl.COLOR_ATTACHMENT0;
      gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, gameFramebufferTexture, 0);
   }

   // Reset the framebuffer
   gl.clearColor(1, 1, 1, 1);
   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

   updateUBOs();

   updateRenderPartMatrices(clientTickInterp, serverTickInterp);

   refreshCameraPosition(clientTickInterp, serverTickInterp)
   refreshCameraView();

   // Render layers
   // @Hack
   if (layers.indexOf(getCurrentLayer()) === 0) {
      renderLayer(layers[1], serverTickInterp);
      renderLayerDarkening();
      renderLayer(layers[0], serverTickInterp);
   } else {
      renderLayer(layers[1], serverTickInterp);
   }

   if (debugDisplayState.showSubtileSupports) {
      renderSubtileSupports();
   }

   if (debugDisplayState.showLightLevels) {
      renderLightLevelsBG();
      renderLightLevelsText();
   }

   // @INCOMPLETE @SQUEAM
   // updateInspectHealthBar();
   
   renderTechTree();
   renderTechTreeItems();

   renderTribePlans();
}
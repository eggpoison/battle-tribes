import Particle from "../Particle";
import { cleanupEntityRendering, renderEntity, setupEntityRendering } from "./webgl/entity-rendering";
import { RenderPartOverlayGroup, renderEntityOverlay } from "./webgl/overlay-rendering";
import { NUM_RENDER_LAYERS, RenderLayer } from "../render-layers";
import { renderChunkedEntities, renderLayerIsChunkRendered } from "./webgl/chunked-entity-rendering";
import { getEntityRenderInfo, getEntityType, layers } from "../world";
import Layer from "../Layer";
import { Entity, EntityType } from "webgl-test-shared";
import { gl } from "../webgl";
import { debugDisplayState } from "../../ui-state/debug-display-state";

export const enum RenderableType {
   entity,
   particle,
   overlay
}

type Renderable = Entity | Particle | RenderPartOverlayGroup;

type RenderableArrays = Array<Array<RenderableInfo>>;

interface RenderableInfo {
   readonly type: RenderableType;
   readonly renderable: Renderable;
   readonly renderHeight: number;
}

let currentRenderLayer: RenderLayer = 0;
const layerRenderableArrays = new Array<RenderableArrays>();

export function initialiseRenderables(): void {
   for (let i = 0; i < layers.length; i++) {
      const renderableArrays: RenderableArrays = [];
      for (let i = 0; i < NUM_RENDER_LAYERS; i++) {
         renderableArrays.push([]);
      }
      layerRenderableArrays.push(renderableArrays);
   }
}

const getRenderableInsertIdx = (renderables: ReadonlyArray<RenderableInfo>, renderHeight: number): number => {
   let left = 0;
   let right = renderables.length - 1;
   while (left <= right) {
      const midIdx = Math.floor((left + right) * 0.5);
      const mid = renderables[midIdx];
      const midDepth = mid.renderHeight;

      if (midDepth < renderHeight) {
         left = midIdx + 1;
      } else if (midDepth > renderHeight) {
         right = midIdx - 1;
      } else {
         return midIdx;
      }
   }
   
   return left;
}

export function addRenderable(layer: Layer, type: RenderableType, renderable: Renderable, renderLayer: RenderLayer, renderHeight: number): void {
   const renderableArrays = layerRenderableArrays[layer.idx];
   const renderables = renderableArrays[renderLayer];
   
   // Use binary search to find index in array
   const idx = getRenderableInsertIdx(renderables, renderHeight);

   const renderableInfo: RenderableInfo = {
      type: type,
      renderable: renderable,
      renderHeight: renderHeight
   };
   renderables.splice(idx, 0, renderableInfo);
}

export function removeRenderable(layer: Layer, renderable: Renderable, renderLayer: RenderLayer): void {
   const renderableArrays = layerRenderableArrays[layer.idx];
   const renderables = renderableArrays[renderLayer];

   // @Speed
   let idx = -1;
   for (let i = 0; i < renderables.length; i++) {
      const renderableInfo = renderables[i];
      if (renderableInfo.renderable === renderable) {
         idx = i;
         break;
      }
   }

   if (idx !== -1) {
      renderables.splice(idx, 1);
   } else {
      console.log(renderable, renderLayer);
      throw new Error();
   }
}

const renderRenderablesBatch = (renderableType: RenderableType, renderables: ReadonlyArray<Renderable>, layer: Layer, renderLayer: RenderLayer): void => {
   if (renderables.length === 0) {
      // @Hack: chunk-rendered entities don't use renderables. The ideal fix for this would be to not create the renderables array for chunk rendered entities
      if (!renderLayerIsChunkRendered(renderLayer)) {
         return;
      }
   }
   
   switch (renderableType) {
      case RenderableType.entity: {
         if (renderLayerIsChunkRendered(renderLayer)) {
            // @Bug: this always renders the whole render layer...
            renderChunkedEntities(layer, renderLayer);
         } else {
            gl.enable(gl.BLEND);
            // @Hack :DarkTransparencyBug
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

            setupEntityRendering();
            for (const renderable of renderables) {
               const entity = renderable as Entity;
               if (debugDisplayState.hideEntities && getEntityType(entity) !== EntityType.grassStrand) {
                  continue;
               }
               
               // @Cleanup: cast
               const renderInfo = getEntityRenderInfo(entity);
               renderEntity(renderInfo);
            }
            cleanupEntityRendering();

            gl.disable(gl.BLEND);
            gl.blendFunc(gl.ONE, gl.ZERO);
         }
         break;
      }
      case RenderableType.particle: {
         // @Incomplete
         break;
      }
      case RenderableType.overlay: {
         // @Cleanup: remove need for cast
         for (let i = 0; i < renderables.length; i++) {
            const overlay = renderables[i] as RenderPartOverlayGroup;
            renderEntityOverlay(overlay);
         }
         break;
      }
   }
}

export function resetRenderOrder(): void {
   currentRenderLayer = 0;
}

export function renderNextRenderables(layer: Layer, maxRenderLayer: RenderLayer): void {
   if (currentRenderLayer >= NUM_RENDER_LAYERS) {
      return;
   }

   const renderableArrays = layerRenderableArrays[layer.idx];
   
   for (; currentRenderLayer <= maxRenderLayer; currentRenderLayer++) {
      const renderables = renderableArrays[currentRenderLayer];

      let currentRenderableType = RenderableType.entity;
      let currentRenderables = new Array<Renderable>();

      for (let idx = 0; idx < renderables.length; idx++) {
         const renderableInfo = renderables[idx];
   
         if (renderableInfo.type === currentRenderableType) {
            currentRenderables.push(renderableInfo.renderable);
         } else {
            renderRenderablesBatch(currentRenderableType, currentRenderables, layer, currentRenderLayer);
            
            currentRenderableType = renderableInfo.type;
            currentRenderables = [renderableInfo.renderable];
         }
      }
   
      renderRenderablesBatch(currentRenderableType, currentRenderables, layer, currentRenderLayer);
   }
}
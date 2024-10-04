import Entity from "../Entity";
import Particle from "../Particle";
import { calculateRenderPartDepth, getEntityHeight, renderEntities } from "./webgl/entity-rendering";
import { RenderPartOverlayGroup, renderEntityOverlay } from "./webgl/overlay-rendering";
import { NUM_RENDER_LAYERS, RenderLayer } from "../render-layers";
import { renderChunkedEntities, renderLayerIsChunkRendered } from "./webgl/chunked-entity-rendering";

export const enum RenderableType {
   entity,
   particle,
   overlay
}

type Renderable = Entity | Particle | RenderPartOverlayGroup;

// @Incomplete: z-index
interface RenderableInfo {
   readonly type: RenderableType;
   readonly renderable: Renderable;
}

let currentRenderLayer: RenderLayer = 0;
const renderableArrays = new Array<Array<RenderableInfo>>();
for (let i = 0; i < NUM_RENDER_LAYERS; i++) {
   renderableArrays.push([]);
}

const getRenderableRenderHeight = (type: RenderableType, renderable: Renderable): number => {
   switch (type) {
      case RenderableType.entity: {
         // @Cleanup: remove cast
         return getEntityHeight(renderable as Entity);
      }
      // @Incomplete
      case RenderableType.particle: {
         return 0;
      }
      case RenderableType.overlay: {
         // @Cleanup: cast
         const overlay = renderable as RenderPartOverlayGroup;
         
         let minDepth = 999999;
         for (let i = 0; i < overlay.renderParts.length; i++) {
            const renderPart = overlay.renderParts[i];
            const depth = calculateRenderPartDepth(renderPart, overlay.entity);
            if (depth < minDepth) {
               minDepth = depth;
            }
         }
      
         return minDepth - 0.0001;
      }
   }
}

const getRenderableInsertIdx = (type: RenderableType, renderable: Renderable, renderables: ReadonlyArray<RenderableInfo>): number => {
   const depth = getRenderableRenderHeight(type, renderable);

   let left = 0;
   let right = renderables.length - 1;
   while (left <= right) {
      const midIdx = Math.floor((left + right) * 0.5);
      const mid = renderables[midIdx];
      const midDepth = getRenderableRenderHeight(mid.type, mid.renderable);

      if (midDepth < depth) {
         left = midIdx + 1;
      } else if (midDepth > depth) {
         right = midIdx - 1;
      } else {
         return midIdx;
      }
   }
   
   return left;
}

export function addRenderable(type: RenderableType, renderable: Renderable, renderLayer: RenderLayer): void {
   const renderables = renderableArrays[renderLayer];
   
   // Use binary search to find index in array
   const idx = getRenderableInsertIdx(type, renderable, renderables);

   const renderableInfo: RenderableInfo = {
      type: type,
      renderable: renderable
   };
   renderables.splice(idx, 0, renderableInfo);

   let previousRenderHeight = -99999;
   for (let i = 0; i < renderables.length; i++) {
      const renderable = renderables[i];
      const renderHeight = getRenderableRenderHeight(renderable.type, renderable.renderable);
      if (renderHeight < previousRenderHeight) {
         throw new Error();
      }
      previousRenderHeight = renderHeight;
   }
}

export function removeRenderable(renderable: Renderable, renderLayer: RenderLayer): void {
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

const renderRenderablesBatch = (renderableType: RenderableType, renderables: ReadonlyArray<Renderable>, renderLayer: RenderLayer): void => {
   if (renderables.length === 0) {
      return;
   }
   
   switch (renderableType) {
      case RenderableType.entity: {
         if (renderLayerIsChunkRendered(renderLayer)) {
            // @Bug: this always renders the whole render layer...
            renderChunkedEntities(renderLayer);
         } else {
            // @Cleanup: remove need for cast
            renderEntities(renderables as Array<Entity>);
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

export function renderNextRenderables(maxRenderLayer: RenderLayer): void {
   if (currentRenderLayer >= NUM_RENDER_LAYERS) {
      return;
   }

   for (; currentRenderLayer <= maxRenderLayer; currentRenderLayer++) {
      const renderables = renderableArrays[currentRenderLayer];

      let currentRenderableType = RenderableType.entity;
      let currentRenderables = new Array<Renderable>();

      for (let idx = 0; idx < renderables.length; idx++) {
         const renderableInfo = renderables[idx];
   
         if (renderableInfo.type === currentRenderableType) {
            currentRenderables.push(renderableInfo.renderable);
         } else {
            renderRenderablesBatch(currentRenderableType, currentRenderables, currentRenderLayer);
            
            currentRenderableType = renderableInfo.type;
            currentRenderables = [renderableInfo.renderable];
         }
      }
   
      renderRenderablesBatch(currentRenderableType, currentRenderables, currentRenderLayer);
   }
}
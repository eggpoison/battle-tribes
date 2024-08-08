import Entity from "../Entity";
import Particle from "../Particle";
import { calculateRenderPartDepth, getEntityHeight, renderEntities } from "./webgl/entity-rendering";
import { RenderPartOverlayGroup, renderEntityOverlay } from "./webgl/overlay-rendering";

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

let currentRenderableIdx = 0;
const renderables = new Array<RenderableInfo>();

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

const getRenderableInsertIdx = (type: RenderableType, renderable: Renderable): number => {
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

export function addRenderable(type: RenderableType, renderable: Renderable): void {
   // Use binary search to find index in array
   const idx = getRenderableInsertIdx(type, renderable);

   const renderableInfo: RenderableInfo = {
      type: type,
      renderable: renderable
   };
   renderables.splice(idx, 0, renderableInfo);
}

export function removeRenderable(renderable: Renderable): void {
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
   }
}

const renderRenderablesBatch = (renderableType: RenderableType, startIdx: number, endIdx: number): void => {
   switch (renderableType) {
      case RenderableType.entity: {
         // @Cleanup: remove need for cast
         const startEntity = renderables[startIdx].renderable as Entity;
         const endEntity = renderables[endIdx].renderable as Entity;
         
         renderEntities(startEntity.id, endEntity.id);
         break;
      }
      case RenderableType.particle: {
         // @Incomplete
         break;
      }
      case RenderableType.overlay: {
         // @Cleanup: remove need for cast
         for (let idx = startIdx; idx <= endIdx; idx++) {
            const overlay = renderables[idx].renderable as RenderPartOverlayGroup;
            renderEntityOverlay(overlay);
         }
         break;
      }
   }
}

export function resetRenderOrder(): void {
   currentRenderableIdx = 0;
}

export function renderNextRenderables(maxRenderHeight: number): void {
   // @Temporary
   // @Hack: shouldn't be done here
   // for (const entity of Board.sortedEntities) {
   //    entity.updateRenderPosition(frameProgress);

   //    // Calculate render info for all render parts
   //    // Update render parts from parent -> child
   //    const remainingRenderParts: Array<RenderPart> = [];
   //    for (const child of entity.children) {
   //       remainingRenderParts.push(child);
   //    }
   //    while (remainingRenderParts.length > 0) {
   //       const renderObject = remainingRenderParts[0];
   //       renderObject.update();

   //       for (const child of renderObject.children) {
   //          remainingRenderParts.push(child);
   //       }

   //       remainingRenderParts.splice(0, 1);
   //    }
   // }

   const firstRenderable = renderables[currentRenderableIdx];
   const firstRenderableRenderHeight = getRenderableRenderHeight(firstRenderable.type, firstRenderable.renderable);
   if (firstRenderableRenderHeight > maxRenderHeight) {
      return;
   }

   // @Speed: all we are doing here is finding the next entity with a render height as high to the max render height as possible.
   // Which probably means that we can do a log(n) type of binary search to find it.
   
   let currentRenderableType = RenderableType.entity;
   let startIdx = currentRenderableIdx;
   for (; currentRenderableIdx < renderables.length; currentRenderableIdx++) {
      const renderableInfo = renderables[currentRenderableIdx];

      const renderHeight = getRenderableRenderHeight(renderableInfo.type, renderableInfo.renderable);
      if (renderHeight > maxRenderHeight) {
         break;
      }

      if (renderableInfo.type !== currentRenderableType) {
         renderRenderablesBatch(currentRenderableType, startIdx, currentRenderableIdx - 1);
         
         currentRenderableType = renderableInfo.type;
         startIdx = currentRenderableIdx + 1;
      }
   }

   renderRenderablesBatch(currentRenderableType, startIdx, currentRenderableIdx - 1);
}
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

const renderables = new Array<RenderableInfo>();

const getRenderableDepth = (type: RenderableType, renderable: Renderable): number => {
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

const getRenderableIdx = (type: RenderableType, renderable: Renderable): number => {
   const depth = getRenderableDepth(type, renderable);

   let left = 0;
   let right = renderables.length - 1;
   while (left <= right) {
      const midIdx = Math.floor((left + right) * 0.5);
      const mid = renderables[midIdx];
      const midDepth = getRenderableDepth(mid.type, mid.renderable);

      if (midDepth < depth) {
         left = midIdx + 1;
      } else if (midDepth > depth) {
         right = midIdx - 1;
      } else {
         return midIdx;
      }
   }
   
   return left + 1;
}

export function addRenderable(type: RenderableType, renderable: Renderable): void {
   // Use binary search to find index in array
   const idx = getRenderableIdx(type, renderable);

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

const renderRenderablesBatch = (renderableType: RenderableType, renderables: ReadonlyArray<Renderable>): void => {
   switch (renderableType) {
      case RenderableType.entity: {
         // @Cleanup: remove need for cast
         renderEntities(renderables as Array<Entity>);
         break;
      }
      case RenderableType.particle: {
         // @Incomplete
         break;
      }
      case RenderableType.overlay: {
         // @Cleanup: remove need for cast
         for (const overlay of renderables as Array<RenderPartOverlayGroup>) {
            renderEntityOverlay(overlay);
         }
         break;
      }
   }
}

export function renderRenderables(frameProgress: number): void {
   if (renderables.length === 0) {
      return;
   }
   
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
   
   let currentRenderableType = RenderableType.entity;
   let currentRenderables = new Array<Renderable>();
   for (let i = 0; i < renderables.length; i++) {
      const renderableInfo = renderables[i];

      if (renderableInfo.type === currentRenderableType) {
         currentRenderables.push(renderableInfo.renderable);
      } else {
         renderRenderablesBatch(currentRenderableType, currentRenderables);
         
         currentRenderableType = renderableInfo.type;
         currentRenderables = [renderableInfo.renderable];
      }
   }

   renderRenderablesBatch(currentRenderableType, currentRenderables);
}
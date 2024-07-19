import Entity from "../Entity";
import Particle from "../Particle";
import { RenderPart } from "../render-parts/render-parts";
import { calculateRenderPartDepth, renderEntities } from "./webgl/entity-rendering";
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
         // @Cleanup: cast
         const entity = renderable as Entity;
         return entity.renderDepth;
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

export function addRenderable(type: RenderableType, renderable: Renderable): void {
   const depth = getRenderableDepth(type, renderable);
   
   let idx = renderables.length;
   for (let i = 0; i < renderables.length; i++) {
      const renderableInfo = renderables[i];
      const currentDepth = getRenderableDepth(renderableInfo.type, renderableInfo.renderable);
      
      if (depth > currentDepth) {
         idx = i;
         break;
      }
   }

   const renderableInfo: RenderableInfo = {
      type: type,
      renderable: renderable
   };
   renderables.splice(idx, 0, renderableInfo);

   // switch (type) {
   //    case RenderableType.entity: {
   //       addEntityToBuffer(renderable as Entity);
   //       break;
   //    }
   // }
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
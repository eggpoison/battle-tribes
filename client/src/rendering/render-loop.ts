import Board from "../Board";
import Entity from "../Entity";
import Particle from "../Particle";
import RenderPart from "../render-parts/RenderPart";
import { calculateEntityVertices, calculateRenderPartDepth, renderEntity } from "./webgl/entity-rendering";
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

export function renderRenderables(frameProgress: number): void {
   // @Hack: shouldn't be done here
   for (const entity of Board.sortedEntities) {
      entity.updateRenderPosition(frameProgress);

      // Calculate render info for all render parts
      // Update render parts from parent -> child
      const remainingRenderParts: Array<RenderPart> = [];
      for (const child of entity.children) {
         remainingRenderParts.push(child);
      }
      while (remainingRenderParts.length > 0) {
         const renderObject = remainingRenderParts[0];
         renderObject.update();

         for (const child of renderObject.children) {
            remainingRenderParts.push(child);
         }

         remainingRenderParts.splice(0, 1);
      }
   }

   // for (let i = 0; i < Board.sortedEntities.length; i++) {
   //    const entity = Board.sortedEntities[i];
   //    const vertexData = calculateEntityVertices(entity);
   //    renderEntity(vertexData);
   // }
   
   for (let i = 0; i < renderables.length; i++) {
      const renderableInfo = renderables[i];

      // @Speed: batch
      switch (renderableInfo.type) {
         case RenderableType.entity: {
            // @Cleanup: remove need for cast
            const entity = renderableInfo.renderable as Entity;
            const vertexData = calculateEntityVertices(entity);
            renderEntity(vertexData);
            break;
         }
         case RenderableType.particle: {
            // @Incomplete
            break;
         }
         case RenderableType.overlay: {
            // @Cleanup: remove need for cast
            const overlay = renderableInfo.renderable as RenderPartOverlayGroup;
            renderEntityOverlay(overlay);
            break;
         }
      }
   }
}
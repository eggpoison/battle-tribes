import Board from "../Board";
import Entity from "../Entity";
import Particle from "../Particle";
import RenderPart from "../render-parts/RenderPart";
import { calculateEntityVertices, renderEntity } from "./webgl/entity-rendering";

export const enum RenderableType {
   entity,
   particle
}

type Renderable = Entity | Particle;

// @Incomplete: z-index
interface RenderableInfo {
   readonly type: RenderableType;
   readonly renderable: Renderable;
}

const renderables = new Array<RenderableInfo>();

export function addRenderable(type: RenderableType, renderable: Renderable): void {
   // @Temporary
   const entity = renderable as Entity;
   
   let idx = renderables.length;
   for (let i = 0; i < renderables.length; i++) {
      const renderableInfo = renderables[i];
      // @Temporary
      const currentEntity = renderableInfo.renderable as Entity;
      if (entity.renderDepth > currentEntity.renderDepth) {
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

   for (let i = 0; i < Board.sortedEntities.length; i++) {
      const entity = Board.sortedEntities[i];
      const vertexData = calculateEntityVertices(entity);
      renderEntity(vertexData);
   }
   
   // for (let i = 0; i < renderables.length; i++) {
   //    const renderableInfo = renderables[i];

   //    // @Speed: batch
   //    switch (renderableInfo.type) {
   //       case RenderableType.entity: {
   //          // @Cleanup: remove need for cast
   //          const entity = renderableInfo.renderable as Entity;
   //          const vertexData = calculateEntityVertices(entity);
   //          renderEntity(vertexData);
   //          break;
   //       }
   //       case RenderableType.particle: {
   //          break;
   //       }
   //    }
   // }
}
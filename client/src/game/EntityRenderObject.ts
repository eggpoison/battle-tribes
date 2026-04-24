import { Entity, assert } from "webgl-test-shared";
import { RenderPartOverlayGroup } from "./rendering/webgl/overlay-rendering";
import { removeRenderable } from "./rendering/render-loop";
import { renderParentIsHitbox, RenderPart } from "./render-parts/render-parts";
import { RenderLayer } from "./render-layers";
import { getEntityLayer, getEntityType } from "./world";
import { gl } from "./webgl";
import { createEntityRenderData, setRenderObjectInVertexData } from "./rendering/webgl/entity-rendering";
import { registerDirtyRenderObject } from "./rendering/render-part-matrices";
import { renderLayerIsChunkRendered } from "./rendering/webgl/chunked-entity-rendering";
import { getEntityComponentArrays } from "./entity-components/component-types";

export interface ComponentTint {
   readonly tintR: number;
   readonly tintG: number;
   readonly tintB: number;
}

export function createComponentTint(tintR: number, tintG: number, tintB: number): ComponentTint {
   return {
      tintR: tintR,
      tintG: tintG,
      tintB: tintB
   };
}

/** Contains all the information required to render an entity to the screen. */
export class EntityRenderObject {
   // @Cleanup @Hack: this is such a hacke (Also if I remove this then i can rename this to RenderObject)
   public readonly entity: Entity;
   public readonly renderLayer: RenderLayer;
   public readonly renderHeight: number;

   /** Stores all render parts attached to the object, sorted ascending based on zIndex. (So that render part with smallest zIndex is rendered first) */
   public readonly renderPartsByZIndex: Array<RenderPart> = [];
   /** Render parts attached to hitboxes. */
   public readonly rootRenderParts: Array<RenderPart> = [];

   public readonly renderPartOverlayGroups: Array<RenderPartOverlayGroup> = [];
   
   // @Memory: bruh
   /** Amount the entity's render parts will shake */
   public shakeAmount = 0;

   /** Whether or not the entity has changed visually at all since its last dirty check */
   public renderPartsAreDirty = false;
   public renderPositionIsDirty = false;

   public tintR = 0;
   public tintG = 0;
   public tintB = 0;

   private readonly maxRenderParts: number;

   public readonly vao: WebGLVertexArrayObject | null;
   public readonly vertexBuffer: WebGLBuffer | null;
   public readonly vertexData: Float32Array | null;

   public isClientInterp: boolean;

   constructor(associatedEntity: Entity, renderLayer: RenderLayer, renderHeight: number, maxRenderParts: number, isClientInterp: boolean) {
      this.entity = associatedEntity;
      this.renderLayer = renderLayer;
      this.renderHeight = renderHeight;
      this.maxRenderParts = maxRenderParts;
      this.isClientInterp = isClientInterp;

      if (!renderLayerIsChunkRendered(renderLayer)) {
         const entityRenderData = createEntityRenderData(maxRenderParts);
         this.vao = entityRenderData.vao;
         this.vertexBuffer = entityRenderData.vertexBuffer;
         this.vertexData = entityRenderData.vertexData;
      } else {
         this.vao = null;
         this.vertexBuffer = null;
         this.vertexData = null;
      }
   }

   public attachRenderPart(renderPart: RenderPart): void {
      assert(this.renderPartsByZIndex.indexOf(renderPart) === -1);
      assert(this.renderPartsByZIndex.length < this.maxRenderParts);

      // @Temporary?
      // @Incomplete: Check with the first render part up the chain
      // Make sure the render part has a higher z-index than its parent
      // if (thing.parent !== null && thing.zIndex <= thing.parent.zIndex) {
      //    throw new Error("Render part less-than-or-equal z-index compared to its parent.");
      // }

      // Insert just before the first render part with a greater z-index
      let i = 0;
      for (i = 0; i < this.renderPartsByZIndex.length; i++) {
         const currentRenderPart = this.renderPartsByZIndex[i];
         if (currentRenderPart.zIndex > renderPart.zIndex) {
            break;
         }
      }

      if (i === this.renderPartsByZIndex.length) {
         this.renderPartsByZIndex.push(renderPart);
      } else {
         this.renderPartsByZIndex.splice(i, 0, renderPart);
      }

      if (renderParentIsHitbox(renderPart.parent)) {
         this.rootRenderParts.push(renderPart);
      } else {
         renderPart.parent.children.push(renderPart);
      }

      registerDirtyRenderObject(this.entity, this);
   }

   public removeRenderPart(renderPart: RenderPart): void {
      // Don't remove if already removed
      const idx = this.renderPartsByZIndex.indexOf(renderPart);
      if (idx === -1) {
         console.warn("Tried to remove when already removed!");
         return;
      }
      
      // Remove from the root array
      this.renderPartsByZIndex.splice(this.renderPartsByZIndex.indexOf(renderPart), 1);
   }

   public removeOverlayGroup(overlayGroup: RenderPartOverlayGroup): void {
      const idx = this.renderPartOverlayGroups.indexOf(overlayGroup);
      if (idx !== -1) {
         this.renderPartOverlayGroups.splice(idx, 1);
      }
      
      removeRenderable(getEntityLayer(this.entity), overlayGroup, this.renderLayer);
   }

   public recalculateTint(): void {
      this.tintR = 0;
      this.tintG = 0;
      this.tintB = 0;

      const componentArrays = getEntityComponentArrays(getEntityType(this.entity));
      for (const componentArray of componentArrays) {
         if (componentArray.calculateTint !== undefined) {
            const tint = componentArray.calculateTint(this.entity);

            this.tintR += tint.tintR;
            this.tintG += tint.tintG;
            this.tintB += tint.tintB;
         }
      }
   }
}

export function recalculateRenderObjectVertexData(renderObject: EntityRenderObject): void {
   assert(renderObject.vertexData !== null);
   
   // @Hack @Speed: only need to override places where there were render parts that no longer exist
   for (let i = 0; i < renderObject.vertexData.length; i++) {
      renderObject.vertexData[i] = 0;
   }
   
   setRenderObjectInVertexData(renderObject, renderObject.vertexData, 0);

   gl.bindBuffer(gl.ARRAY_BUFFER, renderObject.vertexBuffer);
   gl.bufferSubData(gl.ARRAY_BUFFER, 0, renderObject.vertexData);
}
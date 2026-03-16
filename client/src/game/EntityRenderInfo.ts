import { Entity, EntityTypeString, assert } from "webgl-test-shared";
import { RenderPartOverlayGroup } from "./rendering/webgl/overlay-rendering";
import { removeRenderable } from "./rendering/render-loop";
import { renderParentIsHitbox, RenderPart } from "./render-parts/render-parts";
import { RenderLayer } from "./render-layers";
import { getEntityLayer, getEntityType } from "./world";
import { gl } from "./webgl";
import { createEntityRenderData, setRenderInfoInVertexData } from "./rendering/webgl/entity-rendering";
import { registerDirtyRenderInfo } from "./rendering/render-part-matrices";
import { renderLayerIsChunkRendered } from "./rendering/webgl/chunked-entity-rendering";
import { getEntityComponentArrays } from "./entity-component-types";

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

/** Internally contains all the information required to render an entity to the screen. */
export class EntityRenderInfo {
   // @Cleanup @Hack: this is such a hacke
   public readonly entity: Entity;
   public readonly renderLayer: RenderLayer;
   public readonly renderHeight: number;

   /** Stores all render parts attached to the object, sorted ascending based on zIndex. (So that render part with smallest zIndex is rendered first) */
   public readonly renderPartsByZIndex = new Array<RenderPart>();
   /** Render parts attached to hitboxes. */
   public readonly rootRenderParts = new Array<RenderPart>();

   public readonly renderPartOverlayGroups = new Array<RenderPartOverlayGroup>();
   
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

   constructor(associatedEntity: Entity, renderLayer: RenderLayer, renderHeight: number, maxRenderParts: number) {
      this.entity = associatedEntity;
      this.renderLayer = renderLayer;
      this.renderHeight = renderHeight;
      this.maxRenderParts = maxRenderParts;

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

      // @Incomplete
      // Add to the array just after its parent

      // Add to the array of all render parts
      let idx = this.renderPartsByZIndex.length;
      for (let i = 0; i < this.renderPartsByZIndex.length; i++) {
         const currentRenderPart = this.renderPartsByZIndex[i];
         if (renderPart.zIndex < currentRenderPart.zIndex) {
            idx = i;
            break;
         }
      }
      this.renderPartsByZIndex.splice(idx, 0, renderPart);

      if (renderParentIsHitbox(renderPart.parent)) {
         this.rootRenderParts.push(renderPart);
      } else {
         renderPart.parent.children.push(renderPart);
      }

      registerDirtyRenderInfo(this);
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

   public getRenderThing(tag: string): RenderPart {
      for (const renderThing of this.renderPartsByZIndex) {
         if (renderThing.tags.includes(tag)) {
            return renderThing;
         }
      }

      throw new Error("No render part with tag '" + tag + "' could be found on entity type " + EntityTypeString[getEntityType(this.entity)]);
   }

   public getRenderThings(tag: string, expectedAmount?: number): Array<RenderPart> {
      const renderThings = new Array<RenderPart>();
      for (const renderThing of this.renderPartsByZIndex) {
         if (renderThing.tags.includes(tag)) {
            renderThings.push(renderThing);
         }
      }

      if (typeof expectedAmount !== "undefined" && renderThings.length !== expectedAmount) {
         throw new Error("Expected " + expectedAmount + " render parts with tag '" + tag + "' on " + EntityTypeString[getEntityType(this.entity)] + " but got " + renderThings.length);
      }
      
      return renderThings;
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
         if (typeof componentArray.calculateTint !== "undefined") {
            const tint = componentArray.calculateTint(this.entity);

            this.tintR += tint.tintR;
            this.tintG += tint.tintG;
            this.tintB += tint.tintB;
         }
      }
   }
}

export function updateEntityRenderInfoRenderData(renderInfo: EntityRenderInfo): void {
   assert(renderInfo.vertexData);
   
   // @Hack @Speed: only need to override places where there were render parts that no longer exist
   for (let i = 0; i < renderInfo.vertexData.length; i++) {
      renderInfo.vertexData[i] = 0;
   }
   
   setRenderInfoInVertexData(renderInfo, renderInfo.vertexData, 0);

   gl.bindBuffer(gl.ARRAY_BUFFER, renderInfo.vertexBuffer);
   gl.bufferSubData(gl.ARRAY_BUFFER, 0, renderInfo.vertexData);
}
import { assert } from "battletribes-shared/utils";
import { Entity, EntityTypeString } from "battletribes-shared/entities";
import { RenderPartOverlayGroup } from "./rendering/webgl/overlay-rendering";
import { removeRenderable } from "./rendering/render-loop";
import { renderParentIsHitbox, RenderPart } from "./render-parts/render-parts";
import { RenderLayer } from "./render-layers";
import { getEntityLayer, getEntityType } from "./world";
import { getServerComponentArrays } from "./entity-components/ComponentArray";
import { gl } from "./webgl";
import { EntityRenderingVars, setRenderInfoInVertexData } from "./rendering/webgl/entity-rendering";
import { registerDirtyRenderInfo } from "./rendering/render-part-matrices";

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

   public readonly vao: WebGLVertexArrayObject;
   public readonly indexBuffer: WebGLBuffer;
   public readonly indicesData: Uint16Array;
   public readonly vertexBuffer: WebGLBuffer;
   public readonly vertexData: Float32Array;

   constructor(associatedEntity: Entity, renderLayer: RenderLayer, renderHeight: number, maxRenderParts: number) {
      this.entity = associatedEntity;
      this.renderLayer = renderLayer;
      this.renderHeight = renderHeight;
      this.maxRenderParts = maxRenderParts;

      this.vao = gl.createVertexArray()!;
      gl.bindVertexArray(this.vao);
      
      this.vertexData = new Float32Array(maxRenderParts * 4 * EntityRenderingVars.ATTRIBUTES_PER_VERTEX);
   
      this.indicesData = new Uint16Array(maxRenderParts * 6);
      for (let i = 0; i < maxRenderParts; i++) {
         const dataOffset = i * 6;
         
         this.indicesData[dataOffset] = i * 4;
         this.indicesData[dataOffset + 1] = i * 4 + 1;
         this.indicesData[dataOffset + 2] = i * 4 + 2;
         this.indicesData[dataOffset + 3] = i * 4 + 2;
         this.indicesData[dataOffset + 4] = i * 4 + 1;
         this.indicesData[dataOffset + 5] = i * 4 + 3;
      }
   
      this.vertexBuffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.vertexData, gl.DYNAMIC_DRAW);
   
      this.indexBuffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indicesData, gl.DYNAMIC_DRAW);
   
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 0);
      gl.vertexAttribPointer(1, 1, gl.FLOAT, false, EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(2, 1, gl.FLOAT, false, EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(3, 3, gl.FLOAT, false, EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(4, 1, gl.FLOAT, false, EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 7 * Float32Array.BYTES_PER_ELEMENT);
   
      gl.vertexAttribPointer(5, 3, gl.FLOAT, false, EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 8 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(6, 3, gl.FLOAT, false, EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 11 * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(7, 3, gl.FLOAT, false, EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 14 * Float32Array.BYTES_PER_ELEMENT);
      
      gl.enableVertexAttribArray(0);
      gl.enableVertexAttribArray(1);
      gl.enableVertexAttribArray(2);
      gl.enableVertexAttribArray(3);
      gl.enableVertexAttribArray(4);
      gl.enableVertexAttribArray(5);
      gl.enableVertexAttribArray(6);
      gl.enableVertexAttribArray(7);

      gl.bindVertexArray(null);
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
      for (let i = 0; i < this.renderPartsByZIndex.length; i++) {
         const renderThing = this.renderPartsByZIndex[i];

         if (renderThing.tags.includes(tag)) {
            return renderThing;
         }
      }

      throw new Error("No render part with tag '" + tag + "' could be found on entity type " + EntityTypeString[getEntityType(this.entity)]);
   }

   public getRenderThings(tag: string, expectedAmount?: number): Array<RenderPart> {
      const renderThings = new Array<RenderPart>();
      for (let i = 0; i < this.renderPartsByZIndex.length; i++) {
         const renderThing = this.renderPartsByZIndex[i];

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

      // @Speed
      const serverComponentArrays = getServerComponentArrays();
      for (let i = 0; i < serverComponentArrays.length; i++) {
         const componentArray = serverComponentArrays[i];
         if (componentArray.hasComponent(this.entity) && typeof componentArray.calculateTint !== "undefined") {
            const tint = componentArray.calculateTint!(this.entity);

            this.tintR += tint.tintR;
            this.tintG += tint.tintG;
            this.tintB += tint.tintB;
         }
      }
   }
}

export function updateEntityRenderInfoRenderData(renderInfo: EntityRenderInfo): void {
   // @Hack @Speed: only need to override places where there were render parts that no longer exist
   for (let i = 0; i < renderInfo.vertexData.length; i++) {
      renderInfo.vertexData[i] = 0;
   }
   
   setRenderInfoInVertexData(renderInfo, renderInfo.vertexData, renderInfo.indicesData, 0);

   gl.bindBuffer(gl.ARRAY_BUFFER, renderInfo.vertexBuffer);
   gl.bufferSubData(gl.ARRAY_BUFFER, 0, renderInfo.vertexData);
}
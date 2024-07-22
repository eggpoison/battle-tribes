import { createWebGLProgram, gl } from "../../webgl";
import { getEntityTextureAtlas } from "../../texture-atlases/texture-atlases";
import { bindUBOToProgram, ENTITY_TEXTURE_ATLAS_UBO, UBOBindingIndex } from "../ubos";
import Entity from "../../Entity";
import { RenderPart } from "../../render-parts/render-parts";
import { EntityID } from "webgl-test-shared/dist/entities";
import Board from "../../Board";

const enum Vars {
   ATTRIBUTES_PER_VERTEX = 17,
   MAX_RENDER_PARTS = 65536
}

let program: WebGLProgram;
let vao: WebGLVertexArrayObject;
let buffer: WebGLBuffer;
let indexBuffer: WebGLBuffer;

let vertexBuffer: WebGLBuffer;

let depthData: Float32Array;
let depthBuffer: WebGLBuffer;
let textureArrayIndexData: Float32Array;
let textureArrayIndexBuffer: WebGLBuffer;
let tintData: Float32Array;
let tintBuffer: WebGLBuffer;
let opacityData: Float32Array;
let opacityBuffer: WebGLBuffer;
let modelMatrixData: Float32Array;
let modelMatrixBuffer: WebGLBuffer;

/** Maps entity IDs to indexes in the buffers */
const entityIDToBufferIndexRecord: Partial<Record<EntityID, number>> = {};
const bufferIndexToEntityRecord: Partial<Record<number, EntityID>> = {};
const bufferIndexToOffsetAmount: Partial<Record<number, number>> = {};

export function createEntityShaders(): void {
   const vertexShaderText = `#version 300 es
   precision highp float;

   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };

   ${ENTITY_TEXTURE_ATLAS_UBO}
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in float a_depth;
   layout(location = 2) in float a_textureArrayIndex;
   layout(location = 3) in vec3 a_tint;
   layout(location = 4) in float a_opacity;
   layout(location = 5) in mat3 a_modelMatrix;
   
   out vec2 v_texCoord;
   out float v_textureArrayIndex;
   out vec3 v_tint;
   out float v_opacity;
    
   void main() {
      vec2 textureSize;
      if (a_textureArrayIndex == -1.0) {
         // @Temporary
         // textureSize = vec2(2.0, 2.0);
         textureSize = vec2(1.5, 1.5);
      } else {
         int textureArrayIndex = int(a_textureArrayIndex);
         float textureIndex = u_textureSlotIndexes[textureArrayIndex];
         textureSize = u_textureSizes[textureArrayIndex];
      }

      vec2 worldPos = (a_modelMatrix * vec3(a_position * textureSize * 4.0, 1.0)).xy;

      vec2 screenPos = (worldPos - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, a_depth, 1.0);
   
      v_texCoord = a_position + 0.5;
      v_textureArrayIndex = a_textureArrayIndex;
      v_tint = a_tint;
      v_opacity = a_opacity;
   }
   `;
   
   const fragmentShaderText = `#version 300 es
   precision highp float;

   uniform sampler2D u_textureAtlas;
   ${ENTITY_TEXTURE_ATLAS_UBO}
   
   in vec2 v_texCoord;
   in float v_textureArrayIndex;
   in vec3 v_tint;
   in float v_opacity;
   
   out vec4 outputColour;
   
   void main() {
      if (v_textureArrayIndex == -1.0) {
         outputColour = vec4(v_tint, 1.0);
      } else {
         int textureArrayIndex = int(v_textureArrayIndex);
         float textureIndex = u_textureSlotIndexes[textureArrayIndex];
         vec2 textureSize = u_textureSizes[textureArrayIndex];
         
         float atlasPixelSize = u_atlasSize * ATLAS_SLOT_SIZE;
         
         // Calculate the coordinates of the top left corner of the texture
         float textureX = mod(textureIndex, u_atlasSize) * ATLAS_SLOT_SIZE;
         // float textureX = mod(textureIndex * ATLAS_SLOT_SIZE, atlasPixelSize);
         float textureY = floor(textureIndex / u_atlasSize) * ATLAS_SLOT_SIZE;
         
         // @Incomplete: This is very hacky, the - 0.2 and + 0.1 shenanigans are to prevent texture bleeding but it causes tiny bits of the edge of the textures to get cut off.

         // float u = (textureX + v_texCoord.x * (textureSize.x - 0.2) + 0.1) / atlasPixelSize;
         // float v = 1.0 - ((textureY + (1.0 - v_texCoord.y) * (textureSize.y - 0.2) + 0.1) / atlasPixelSize);

         // We add 0.5 for half-pixel correction
         // float u = (textureX + v_texCoord.x * textureSize.x / ATLAS_SLOT_SIZE + 0.5 / ATLAS_SLOT_SIZE) / u_atlasSize;
         // float u = (textureX + v_texCoord.x * textureSize.x + 0.5) / atlasPixelSize;
         float x = floor(textureX + v_texCoord.x * textureSize.x);
         float y = floor(textureY + (1.0 - v_texCoord.y) * textureSize.y);
         float u = (x + 0.5) / atlasPixelSize;
         float v = 1.0 - (y + 0.5) / atlasPixelSize;
         // float v = 1.0 - ((textureY + (1.0 - v_texCoord.y) * textureSize.y) / atlasPixelSize);

         outputColour = texture(u_textureAtlas, vec2(u, v));
      
         if (v_tint.r > 0.0) {
            outputColour.r = mix(outputColour.r, 1.0, v_tint.r);
         } else {
            outputColour.r = mix(outputColour.r, 0.0, -v_tint.r);
         }
         if (v_tint.g > 0.0) {
            outputColour.g = mix(outputColour.g, 1.0, v_tint.g);
         } else {
            outputColour.g = mix(outputColour.g, 0.0, -v_tint.g);
         }
         if (v_tint.b > 0.0) {
            outputColour.b = mix(outputColour.b, 1.0, v_tint.b);
         } else {
            outputColour.b = mix(outputColour.b, 0.0, -v_tint.b);
         }
      }
   
      outputColour.a *= v_opacity;
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   bindUBOToProgram(gl, program, UBOBindingIndex.CAMERA);
   bindUBOToProgram(gl, program, UBOBindingIndex.ENTITY_TEXTURE_ATLAS);

   const textureUniformLocation = gl.getUniformLocation(program, "u_textureAtlas")!;

   gl.useProgram(program);
   gl.uniform1i(textureUniformLocation, 0);

   // 
   // Create VAO
   // 

   vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, Vars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 1, gl.FLOAT, false, Vars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 1, gl.FLOAT, false, Vars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(3, 3, gl.FLOAT, false, Vars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(4, 1, gl.FLOAT, false, Vars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 7 * Float32Array.BYTES_PER_ELEMENT);

   gl.vertexAttribPointer(5, 3, gl.FLOAT, false, Vars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 8 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(6, 3, gl.FLOAT, false, Vars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 11 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(7, 3, gl.FLOAT, false, Vars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 14 * Float32Array.BYTES_PER_ELEMENT);
   
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);
   gl.enableVertexAttribArray(3);
   gl.enableVertexAttribArray(4);
   gl.enableVertexAttribArray(5);
   gl.enableVertexAttribArray(6);
   gl.enableVertexAttribArray(7);

   indexBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

   gl.bindVertexArray(null);

   const vertexData = new Float32Array(12);
   vertexData[0] = -0.5;
   vertexData[1] = -0.5;
   vertexData[2] = 0.5;
   vertexData[3] = -0.5;
   vertexData[4] = -0.5;
   vertexData[5] = 0.5;
   vertexData[6] = -0.5;
   vertexData[7] = 0.5;
   vertexData[8] = 0.5;
   vertexData[9] = -0.5;
   vertexData[10] = 0.5;
   vertexData[11] = 0.5;

   vertexBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   depthData = new Float32Array(Vars.MAX_RENDER_PARTS);
   depthBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, depthBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, depthData, gl.DYNAMIC_DRAW);

   textureArrayIndexData = new Float32Array(Vars.MAX_RENDER_PARTS);
   textureArrayIndexBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, textureArrayIndexBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, textureArrayIndexData, gl.DYNAMIC_DRAW);

   tintData = new Float32Array(3 * Vars.MAX_RENDER_PARTS);
   tintBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, tintBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, tintData, gl.DYNAMIC_DRAW);

   opacityData = new Float32Array(Vars.MAX_RENDER_PARTS);
   opacityBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, opacityBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, opacityData, gl.DYNAMIC_DRAW);

   modelMatrixData = new Float32Array(9 * Vars.MAX_RENDER_PARTS);
   modelMatrixBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, modelMatrixBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, modelMatrixData, gl.DYNAMIC_DRAW);
}

const setData = (entity: Entity, bufferIndex: number): void => {
   // @Temporary
   if (entityIDToBufferIndexRecord[entity.id] !== bufferIndex) {
      throw new Error("1");
   }
   
   const offsetAmount = bufferIndexToOffsetAmount[bufferIndex];
   if (typeof offsetAmount === "undefined") {
      throw new Error();
   }
   
   depthData.set(entity.depthData, offsetAmount);
   textureArrayIndexData.set(entity.textureArrayIndexData, offsetAmount);
   tintData.set(entity.tintData, 3 * offsetAmount);
   opacityData.set(entity.opacityData, offsetAmount);
   modelMatrixData.set(entity.modelMatrixData, 9 * offsetAmount);

   // // Depth buffer
   // gl.bindBuffer(gl.ARRAY_BUFFER, depthBuffer);
   // gl.bufferSubData(gl.ARRAY_BUFFER, offsetAmount * Float32Array.BYTES_PER_ELEMENT, entity.depthData);
   // // Texture array index
   // gl.bindBuffer(gl.ARRAY_BUFFER, textureArrayIndexBuffer);
   // gl.bufferSubData(gl.ARRAY_BUFFER, offsetAmount * Float32Array.BYTES_PER_ELEMENT, entity.textureArrayIndexData);
   // // Tint
   // gl.bindBuffer(gl.ARRAY_BUFFER, tintBuffer);
   // gl.bufferSubData(gl.ARRAY_BUFFER, offsetAmount * 3 * Float32Array.BYTES_PER_ELEMENT, entity.tintData);
   // // Opacity
   // gl.bindBuffer(gl.ARRAY_BUFFER, opacityBuffer);
   // gl.bufferSubData(gl.ARRAY_BUFFER, offsetAmount * Float32Array.BYTES_PER_ELEMENT, entity.opacityData);
   // // Model matrix
   // gl.bindBuffer(gl.ARRAY_BUFFER, modelMatrixBuffer);
   // gl.bufferSubData(gl.ARRAY_BUFFER, offsetAmount * 9 * Float32Array.BYTES_PER_ELEMENT, entity.modelMatrixData);
}

const getBufferIndex = (entity: Entity): number => {
   // @Speed: do we have to start at 0 every time?
   // Find the first empty buffer index or a buffer index with a greater renderDepth
   let bufferIndex = 0;
   for (; bufferIndex < Vars.MAX_RENDER_PARTS; bufferIndex++) {
      const entityID = bufferIndexToEntityRecord[bufferIndex];
      if (typeof entityID === "undefined") {
         // console.log("(undefined)")
         break;
      } else {
         const currentEntity = Board.entityRecord[entityID]!;
         // @Temporary?
         if (typeof currentEntity === "undefined") {
            throw new Error();
         }
         if (currentEntity.renderDepth >= entity.renderDepth) {
            // console.log("(currentEntity.renderDepth >= entity.renderDepth)")
            break;
         }
      }
   }
   return bufferIndex;
}

/** Gets the buffer index of the last entity in the buffer */
const getFinalBufferIndex = (): number => {
   // @Speed?
   let finalBufferIndex = 0;
   for (;;) {
      const entityID = bufferIndexToEntityRecord[finalBufferIndex];
      if (typeof entityID === "undefined") {
         finalBufferIndex--;
         break;
      }
      finalBufferIndex++;
   }
   return finalBufferIndex;
}

// @Temporary
const catalogue = (): Record<number, number> => {
   const c: Record<number, number> = {};
   for (let bufferIndex = 0; bufferIndex < Vars.MAX_RENDER_PARTS; bufferIndex++) {
      const entityID = bufferIndexToEntityRecord[bufferIndex];
      if (typeof entityID !== "undefined") {
         if (typeof c[entityID] === "undefined") {
            c[entityID] = 1;
         } else {
            c[entityID]++;
         }
      }
   }
   return c;
}

// @Temporary
const getNum = (entityID: number): number => {
   let n = 0;
   for (let bufferIndex = 0; bufferIndex < Vars.MAX_RENDER_PARTS; bufferIndex++) {
      const curentEntityID = bufferIndexToEntityRecord[bufferIndex];
      if (curentEntityID === entityID) {
         n++;
      }
   }
   return n;
}

// @Temporary
const getNumBuffs = (bufferIndex: number): number => {
   let n = 0;
   for (const entity of Board.entities) {
      const currentBufferIndex = entityIDToBufferIndexRecord[entity.id];
      if (currentBufferIndex === bufferIndex) {
         n++;
      }
   }
   return n;
}

// @Temporary
const entityIsBad = (queuedEntityIDs: Array<EntityID>, entityID: EntityID): boolean => {
   let n = 0;
   for (const e of queuedEntityIDs) {
      if (e === entityID) {
         n++;
      }
   }
   for (let bufferIndex = 0; bufferIndex < Vars.MAX_RENDER_PARTS; bufferIndex++) {
      const curentEntityID = bufferIndexToEntityRecord[bufferIndex];
      if (curentEntityID === entityID) {
         n++;
      }
   }

   return n > 1;
}

// @Temporary
const checkEntity = (queuedEntityIDs: Array<EntityID>, entityID: EntityID): void => {
   if (entityIsBad(queuedEntityIDs, entityID)) {
      throw new Error();
   }
}

// @Temporary
const validateRenderDepths = (): void => {
   let lastRenderDepth = -999999;
   for (let b = 0; b < Vars.MAX_RENDER_PARTS; b++) {
      const eID = bufferIndexToEntityRecord[b];
      if (typeof eID !== "undefined") {
         const e = Board.entityRecord[eID]!;
         if (e.renderDepth < lastRenderDepth) {
            console.log("entity id " + eID + " is less deep than previous (buffer index = " + b + ")");
            throw new Error();
         }
         lastRenderDepth = e.renderDepth;
      }
   }
}

// @Temporary
const validateQueuePush = (queuedEntityIDs: Array<EntityID>, entityID: number): void => {
   const entity = Board.entityRecord[entityID]!;
   for (let i = 0; i < queuedEntityIDs.length; i++) {
      const id = queuedEntityIDs[i];
      const currentEntity = Board.entityRecord[id]!;
      if (entity.renderDepth < currentEntity.renderDepth) {
         console.warn("checked entity (id:" + entityID + ") had less render depth");
         console.warn("bad previous id:",currentEntity.id,currentEntity.renderDepth);
         throw new Error("Tried to add an entity to the queue which had less render depth than the previous thing in the queue!")
      }
   }
}

export function addEntitiesToBuffer(entities: Array<Entity>): void {
   if (entities.length === 0) {
      return;
   }

   // console.log("-=-=-=-=-=-=---=-=-=-=-=--");

   // const a = entities.length <= 4000;
   // if(a)console.log("-=-=-=-=-=-=---=-=-=-=-=--");
   // if(a)console.log("-=-=-=-=-=-=---=-=-=-=-=--");
   // if(a)console.log("-=-=-=-=-=-=---=-=-=-=-=--");

   const before = catalogue();

   // Sort entities from lowest render depth to highest render depth
   // @Speed
   const entitiesToAddSorted = entities.sort((a: Entity, b: Entity) => a.renderDepth - b.renderDepth);
   const queuedEntityIDs = new Array<EntityID>();

   for (let i = 1; i < entitiesToAddSorted.length; i++) {
      const p = entitiesToAddSorted[i - 1];
      const c = entitiesToAddSorted[i];
      if (c.renderDepth < p.renderDepth) {
         throw new Error(":STAR");
      }
   }

   let idx = 0;

   // Update in-place
   for (; idx < entitiesToAddSorted.length; idx++) {
      const entity = entitiesToAddSorted[idx];

      const bufferIndex = entityIDToBufferIndexRecord[entity.id];
      if (typeof bufferIndex !== "undefined") {
         // @Cleanup: there has to be a better way to do this
         if (bufferIndex === 0) {
            entityIDToBufferIndexRecord[entity.id] = bufferIndex;
            bufferIndexToEntityRecord[bufferIndex] = entity.id;
            bufferIndexToOffsetAmount[bufferIndex] = 0;
            setData(entity, bufferIndex);
         } else {
            const previousOffsetAmount = bufferIndexToOffsetAmount[bufferIndex - 1]!;
            const previousEntityID = bufferIndexToEntityRecord[bufferIndex - 1]!;
   
            const prevousEntity = Board.entityRecord[previousEntityID]!;
   
            entityIDToBufferIndexRecord[entity.id] = bufferIndex;
            bufferIndexToEntityRecord[bufferIndex] = entity.id;
            // @Speed: can probably just fill in with current entity amount, and subtract/use previous amount
            bufferIndexToOffsetAmount[bufferIndex] = previousOffsetAmount + prevousEntity.allRenderParts.length;
            setData(entity, bufferIndex);
         }
      } else {
         break;
      }
   }

   // If all entities were updated, return
   if (idx >= entitiesToAddSorted.length) {
      return;
   }

   // @Copynpaste
   let bufferIndex: number;
   const existingBufferIndex = entityIDToBufferIndexRecord[entitiesToAddSorted[idx].id];
   if (typeof existingBufferIndex !== "undefined") {
      bufferIndex = existingBufferIndex;
   } else {
      bufferIndex = getBufferIndex(entitiesToAddSorted[idx]);
   }
   
   for (; idx < entitiesToAddSorted.length; idx++) {
      const entity = entitiesToAddSorted[idx];
      // console.log("-=-=--=--=--");
      // console.log("new (id=" + entity.id + "). render depth:",entity.renderDepth,idx);
      // console.log("current buffer index:",bufferIndex);
   
      // @Cleanup: Copy and paste
      // Do the first swap
      // validateRenderDepths();
      {
         // console.log("do first swap");
         // checkEntity(queuedEntityIDs, entity.id);
         // If the entity isn't in the buffer whatsoever, add them to the queue.
         // @Copynpaste
         if (typeof entityIDToBufferIndexRecord[entity.id] === "undefined" && !queuedEntityIDs.includes(entity.id)) {
            // if (getNum(entity.id) === 1) {
            //    throw new Error("apple");
            // }
            // if (queuedEntityIDs.indexOf(entity.id) !== -1) {
            //    throw new Error("A!!!");
            // }
            // console.log("add entity to queued, id:",entity.id);
            // validateQueuePush(queuedEntityIDs, entity.id);
            // queuedEntityIDs.push(entity.id);

            let insertIdx = 0;
            for (; insertIdx < queuedEntityIDs.length; insertIdx++) {
               const currentEntityID = queuedEntityIDs[insertIdx];
               const currentEntity = Board.entityRecord[currentEntityID]!;
               if (entity.renderDepth < currentEntity.renderDepth) {
                  break;
               }
            }
            queuedEntityIDs.splice(insertIdx, 0, entity.id);
         }
         
         const overriddenEntityID = bufferIndexToEntityRecord[bufferIndex];

         // @Temporary?
         if (queuedEntityIDs.length === 0) {
            throw new Error();
         }
         const currentEntityID = queuedEntityIDs.shift()!;
         const currentEntity = Board.entityRecord[currentEntityID]!;

         // const exis = entityIDToBufferIndexRecord[currentEntity.id];
         
         if (bufferIndex === 0) {
            entityIDToBufferIndexRecord[currentEntityID] = bufferIndex;
            bufferIndexToEntityRecord[bufferIndex] = currentEntityID;
            bufferIndexToOffsetAmount[bufferIndex] = 0;
            setData(currentEntity, bufferIndex);
            // if (getNum(currentEntity.id) > 1) {
            //    console.warn("found bad!!");
            //    throw new Error("2");
            // }
         } else {
            const previousOffsetAmount = bufferIndexToOffsetAmount[bufferIndex - 1]!;
            const previousEntityID = bufferIndexToEntityRecord[bufferIndex - 1]!;
   
            const prevousEntity = Board.entityRecord[previousEntityID]!;
   
            entityIDToBufferIndexRecord[currentEntityID] = bufferIndex;
            bufferIndexToEntityRecord[bufferIndex] = currentEntityID;
            // @Speed: can probably just fill in with current entity amount, and subtract/use previous amount
            bufferIndexToOffsetAmount[bufferIndex] = previousOffsetAmount + prevousEntity.allRenderParts.length;
            setData(currentEntity, bufferIndex);
            // if (getNum(currentEntity.id) > 1) {
            //    console.warn("found bad!!");
            //    console.log("entity id:",currentEntityID);
            //    console.log("overridden:",overriddenEntityID);
            //    console.log(bufferIndex);
            //    console.log(exis);
            //    throw new Error("3");
            // }
         }
         
         if (typeof overriddenEntityID !== "undefined") {
            // console.log("add overridden",overriddenEntityID);
            const overriddenEntity = Board.entityRecord[overriddenEntityID]!;
            // console.log("overridden render depth:",overriddenEntity.renderDepth)
            queuedEntityIDs.push(overriddenEntityID);
            // validateQueuePush(queuedEntityIDs, overriddenEntityID);
            // @Temporary?
            delete entityIDToBufferIndexRecord[overriddenEntityID];
            // if (getNum(overriddenEntityID) === 1) {
            //    throw new Error("banana");
            // }
            // @Incomplete: THIS THROWS!!! Fix.
            // @Temporary
            // for (let i = idx + 1; i < entitiesToAddSorted.length; i++) {
            //    const ENTITI = entitiesToAddSorted[i];
            //    if (ENTITI.id === overriddenEntityID) {
            //       // Problem: pushing future entity onto queue.
            //       console.log("bad entity id:",ENTITI.id);
            //       console.log("bad render depth:",ENTITI.renderDepth);
            //       console.log("current index:",idx);
            //       console.log("error index:",i);
            //       console.log("-=-=-=-=-")
            //       throw new Error("Temp.");
            //    }
            // }
         }
            // @Temporary
         // if (entityIsBad(queuedEntityIDs, entity.id)) {
         //    console.log("entity:",entity.id);
         //    console.log("overridden:",overriddenEntityID);
         //    console.log(queuedEntityIDs);
         //    throw new Error();
         // }
      }
      // validateRenderDepths();

      /** Buffer index of the next entity data to be updated/inserted (from entitiesToAddSorted) */
      let nextBufferIndex: number;
      if (bufferIndex >= getFinalBufferIndex()) {
         // If we're inserting into an empty buffer slot, just set the next as the following buffer index
         nextBufferIndex = bufferIndex + 1;
         // console.log("A");
      } else if (idx < entitiesToAddSorted.length - 1) {
         const nextEntity = entitiesToAddSorted[idx + 1];
         // console.log("next entity render depth:",nextEntity.renderDepth);

         const existingBufferIndex = entityIDToBufferIndexRecord[nextEntity.id];
         if (typeof existingBufferIndex !== "undefined") {
            nextBufferIndex = existingBufferIndex;
            // console.log("Found next entity (id " + nextEntity.id + "), already in buffer at index " + existingBufferIndex);
         } else {
            nextBufferIndex = getBufferIndex(nextEntity);
            // console.log("Calculated next entity (id " + nextEntity.id + "), at",nextBufferIndex);
         }
      } else {
         // We are at the final entity, so we want to swap all remaining entities
         nextBufferIndex = getFinalBufferIndex() + 1;
         // console.log("D");
      }
      // console.log("next buffer index:",nextBufferIndex);

      // console.log("id:",entity.id,"cur:",bufferIndex,"next:",nextBufferIndex);

      // @Incomplete: Throws
      if (nextBufferIndex < bufferIndex) {
         console.log("#####################");
         console.log(bufferIndex, nextBufferIndex);
         for (let b = 0; b <= nextBufferIndex + 5; b++) {
            const eID = bufferIndexToEntityRecord[b]!;
            const e = Board.entityRecord[eID]!;
            console.log(b, e.id, e.renderDepth)
         }
         throw new Error("ASDASDASD");
      }

      // @Speed: experiment with doing one big data swap for the whole lot
      // Swap until just before the next buffer
      for (let currentBufferIndex = bufferIndex + 1; currentBufferIndex < nextBufferIndex; currentBufferIndex++) {
         // Put the first queued entity into this buffer index, and the entity which was there into the buffer index onto the end of the queue
         // validateRenderDepths();

         const overriddenEntityID = bufferIndexToEntityRecord[currentBufferIndex];

         // @Temporary?
         if (queuedEntityIDs.length === 0) {
            throw new Error();
         }
         const currentEntityID = queuedEntityIDs.shift()!;
         const currentEntity = Board.entityRecord[currentEntityID]!;

         // console.log("current entity id:",currentEntityID,"render depth:",currentEntity.renderDepth);
         
         if (currentBufferIndex === 0) {
            entityIDToBufferIndexRecord[currentEntityID] = currentBufferIndex;
            bufferIndexToEntityRecord[currentBufferIndex] = currentEntityID;
            bufferIndexToOffsetAmount[currentBufferIndex] = 0;
            setData(currentEntity, currentBufferIndex);
            // if (getNum(currentEntity.id) > 1) {
            //    console.warn("found bad!!");
            //    throw new Error("2");
            // }
         } else {
            const previousOffsetAmount = bufferIndexToOffsetAmount[currentBufferIndex - 1]!;
            const previousEntityID = bufferIndexToEntityRecord[currentBufferIndex - 1]!;
   
            const prevousEntity = Board.entityRecord[previousEntityID]!;
   
            entityIDToBufferIndexRecord[currentEntityID] = currentBufferIndex;
            bufferIndexToEntityRecord[currentBufferIndex] = currentEntityID;
            // @Speed: can probably just fill in with current entity amount, and subtract/use previous amount
            bufferIndexToOffsetAmount[currentBufferIndex] = previousOffsetAmount + prevousEntity.allRenderParts.length;
            setData(currentEntity, currentBufferIndex);
            // if (getNum(currentEntity.id) > 1) {
            //    console.warn("found bad!!");
            //    console.log("entity id:",currentEntityID);
            //    throw new Error("3");
            // }
         }
         
         if (typeof overriddenEntityID !== "undefined") {
            queuedEntityIDs.push(overriddenEntityID);
            // @Temporary?
            delete entityIDToBufferIndexRecord[overriddenEntityID];
            // if (getNum(overriddenEntityID) === 1) {
            //    throw new Error("carrot");
            // }
            // checkEntity(queuedEntityIDs, overriddenEntityID);
         }

         // console.log("swap: buffer index",currentBufferIndex);
         // checkEntity(queuedEntityIDs, currentEntityID);

         // if (getNumBuffs(currentBufferIndex) > 1) {
         //    throw new Error("6");
         // }
         // validateRenderDepths();
      }

      bufferIndex = nextBufferIndex;
   }
   // validateRenderDepths();

   // Add any remaining queued entities to the end of the buffer
   // console.log("num queued:",queuedEntityIDs.length);
   for (let i = 0; i < queuedEntityIDs.length; i++) {
      // console.log("__________");
      const entityID = queuedEntityIDs[i];
      const entity = Board.entityRecord[entityID]!;
      const bufferIndex = getFinalBufferIndex() + 1;
      // console.log("adding new queued entity. id:",entityID);
      // console.log("buffer index:",bufferIndex);
      // console.log("render depth:",entity.renderDepth)
      // console.log(bufferIndexToEntityRecord[bufferIndex - 2]);
      // console.log(bufferIndexToEntityRecord[bufferIndex - 1]);
      // console.log(bufferIndexToEntityRecord[bufferIndex]);
      // if (getNum(entity.id) > 1) {
      //    console.warn("found bad!!");
      //    console.log("entity id:",entity);
      //    throw new Error("4.1");
      // }

      const previousOffsetAmount = bufferIndexToOffsetAmount[bufferIndex - 1]!;
      const previousEntityID = bufferIndexToEntityRecord[bufferIndex - 1]!;

      const prevousEntity = Board.entityRecord[previousEntityID]!

      // @Bug: these seem to all be the same????
      // if(a)console.log("add queued entity into buffer index " + bufferIndex);
      entityIDToBufferIndexRecord[entityID] = bufferIndex;
      bufferIndexToEntityRecord[bufferIndex] = entityID;
      bufferIndexToOffsetAmount[bufferIndex] = previousOffsetAmount + prevousEntity.allRenderParts.length;
      setData(entity, bufferIndex);
      // if (getNum(entity.id) > 1) {
      //    console.warn("found bad!!");
      //    console.log("entity id:",entity);
      //    throw new Error("4.2");
      // }
      // if (getNumBuffs(bufferIndex) > 1) {
      //    throw new Error("7");
      // }
   }
   // validateRenderDepths();

   const after = catalogue();
   for (const entity of entitiesToAddSorted) {
      const be = before[entity.id];
      const ae = after[entity.id];
      if (ae !== 1) {
         console.log("bad entity id:",entity.id);
         console.log(be);
         console.log(ae);
         throw new Error();
      }
   }
   
   // const a = entities.length <= 4000;
   // // if(a)return;
   // // if(a)console.log("-=-=-=-=-=-=---=-=-=-=-=--");
   // // if(a)console.log("-=-=-=-=-=-=---=-=-=-=-=--");
   // // if(a)console.log("-=-=-=-=-=-=---=-=-=-=-=--");

   // // Sort entities from lowest render depth to highest render depth
   // // @Speed
   // const entitiesToAddSorted = entities.sort((a: Entity, b: Entity) => a.renderDepth - b.renderDepth);

   // /** Entities which got displaced as a result of shifting data */
   // const queuedEntityIDs = new Array<EntityID>();
   
   // let bufferIndex = getBufferIndex(entitiesToAddSorted[0]);
   // for (let i = 0; i < entitiesToAddSorted.length; i++) {
   //    const entity = entitiesToAddSorted[i];
      
   //    /** Buffer index of the next entity data to be updated/inserted */
   //    let nextBufferIndex: number;
   //    if (i < entitiesToAddSorted.length - 1) {
   //       const nextEntity = entitiesToAddSorted[i + 1];
   //       const existingBufferIndex = entityIDToBufferIndexRecord[nextEntity.id];
   //       if (typeof existingBufferIndex !== "undefined") {
   //          // If the next entity is being updated, then we use their existing buffer index
   //          nextBufferIndex = existingBufferIndex;
   //       } else {
   //          nextBufferIndex = getBufferIndex(nextEntity);
   //       }
         
   //       // We add 1 to simulate the current entity being added
   //       nextBufferIndex++;
   //    } else {
   //       // Final buffer index
   //       nextBufferIndex = getFinalBufferIndex();
   //    }

   //    // If the entity is already in the buffer, update its data
   //    const existingBufferIndex = entityIDToBufferIndexRecord[entity.id];
   //    if (typeof existingBufferIndex !== "undefined") {
   //       if (queuedEntityIDs.length > 0) {
   //          // 
   //          // Insert all queued packets before the entity
   //          // 
            
   //          // Shift all from bufferIndex to (bufferIndex + queuedEntityIDs.length - 1)
   //          for (let currentBufferIndex = bufferIndex; currentBufferIndex < bufferIndex + queuedEntityIDs.length; currentBufferIndex++) {
   //             setData()
   //          }
            
   //          // Queue all entities which would be overridden
   //       }
         
   //       // if(a)console.log("update existing data at " + existingBufferIndex + " for entity id " + entity.id);
   //       setData(entity, existingBufferIndex);
   //       continue;
   //    }

   //    const overriddenEntityID = bufferIndexToEntityRecord[nextBufferIndex - 1];
      
   //    // Shift all following entities until just before the next entity to insert or the end of the buffer
   //    // Start the swap 2 before the next index, so it doesn't get overridden
   //    // if(a)console.log("now shifting up all from " + bufferIndex + " to " + (nextBufferIndex - 2));
   //    const entityOffsetAmount = entity.allRenderParts.length;
   //    for (let currentBufferIndex = nextBufferIndex - 2; currentBufferIndex >= bufferIndex; currentBufferIndex--) {
   //       // Always >= 0
   //       const shiftIndex = currentBufferIndex - bufferIndex;

   //       let currentEntityID: EntityID;
   //       if (shiftIndex <= queuedEntityIDs.length - 1) {
   //          currentEntityID = queuedEntityIDs[shiftIndex];
   //          queuedEntityIDs.splice(shiftIndex, 1);
   //       } else {
   //          currentEntityID = bufferIndexToEntityRecord[currentBufferIndex - queuedEntityIDs.length]!;
   //       }

   //       const currentEntity = Board.entityRecord[currentEntityID]!;
   //       // if(a)console.log("shift up " + currentBufferIndex + " to " + (currentBufferIndex + 1));

   //       entityIDToBufferIndexRecord[currentEntityID] = currentBufferIndex + 1;
   //       bufferIndexToEntityRecord[currentBufferIndex + 1] = currentEntityID;
   //       bufferIndexToOffsetAmount[currentBufferIndex + 1] = bufferIndexToOffsetAmount[bufferIndex]! + entityOffsetAmount;
   //       setData(currentEntity, currentBufferIndex + 1);
   
   //       if (currentBufferIndex === bufferIndex) {
   //          break;
   //       }
   //    }

   //    // Queue the overridden entity.
   //    // We do this after shifting so that adding this to the queued entities doesn't mess up the shifting.
   //    if (typeof overriddenEntityID !== "undefined") {
   //       queuedEntityIDs.push(overriddenEntityID);
   //       delete entityIDToBufferIndexRecord[overriddenEntityID];
   //       // console.log("override id" + overriddenEntityID + " at buffer index " + oB);
   //    }

   //    // Update offset amount record
   //    // Exploit the fact that when inserting into the buffer, it is either first or directly after an entity
   //    if (bufferIndex === 0) {
   //       bufferIndexToOffsetAmount[0] = 0;
   //    } else {
   //       const previousOffsetAmount = bufferIndexToOffsetAmount[bufferIndex - 1]!;
   //       const previousEntityID = bufferIndexToEntityRecord[bufferIndex - 1]!;

   //       const prevousEntity = Board.entityRecord[previousEntityID]!
   //       bufferIndexToOffsetAmount[bufferIndex] = previousOffsetAmount + prevousEntity.allRenderParts.length;
   //    }

   //    // Insert into the buffer
   //    // if(a)console.log("add into buffer index " + bufferIndex + ". next buffer index: " + nextBufferIndex + " (" + queuedEntityIDs.length + " queued, next ID = " + queuedEntityIDs[0] + ")");
   //    entityIDToBufferIndexRecord[entity.id] = bufferIndex;
   //    bufferIndexToEntityRecord[bufferIndex] = entity.id;
   //    setData(entity, bufferIndex);

   //    bufferIndex = nextBufferIndex;
   // }

   // // Add any remaining queued entities to the end of the buffer
   // for (let i = 0; i < queuedEntityIDs.length; i++) {
   //    const entityID = queuedEntityIDs[i];
   //    const entity = Board.entityRecord[entityID]!;
   //    const bufferIndex = getFinalBufferIndex();

   //    const previousOffsetAmount = bufferIndexToOffsetAmount[bufferIndex - 1]!;
   //    const previousEntityID = bufferIndexToEntityRecord[bufferIndex - 1]!;

   //    const prevousEntity = Board.entityRecord[previousEntityID]!

   //    // @Bug: these seem to all be the same????
   //    if(a)console.log("add queued entity into buffer index " + bufferIndex);
   //    entityIDToBufferIndexRecord[entityID] = bufferIndex;
   //    bufferIndexToEntityRecord[bufferIndex] = entityID;
   //    bufferIndexToOffsetAmount[bufferIndex] = previousOffsetAmount + prevousEntity.allRenderParts.length;
   //    setData(entity, bufferIndex);
   // }

   
   // console.log(bufferIndex);

   
   // // Shift up all entities at >= bufferIndex
   // let currentBufferIndex = finalBufferIndex;
   // for (;;) {
   //    const entityID = bufferIndexToEntityRecord[currentBufferIndex];
   //    if (typeof entityID === "undefined") {
   //       break;
   //    }
      
   //    const entity = Board.entityRecord[entityID]!;
   //    bufferIndexToEntityRecord[currentBufferIndex + 1] = entityID;
   //    setData(entity, currentBufferIndex + 1);

   //    if (currentBufferIndex === bufferIndex) {
   //       break;
   //    }
   //    currentBufferIndex--;
   // }
   
   // // Insert into the buffer
   // bufferIndexToEntityRecord[bufferIndex] = entity.id;

   // setData(entity, bufferIndex);
}

export function calculateRenderPartDepth(renderPart: RenderPart, entity: Entity): number {
   return entity.renderDepth - renderPart.zIndex * 0.0001;
}

export function renderEntities(entities: ReadonlyArray<Entity>): void {
   let numRenderParts = 0;
   for (const entity of entities) {
      numRenderParts += entity.allRenderParts.length;
   }
   
   // let currentDepthDataOffset = 0;
   // let currentTextureArrayIndexDataOffset = 0;
   // let currentTintDataOffset = 0;
   // let currentOpacityDataOffset = 0;
   // let currentModelMatrixDataOffset = 0;

   // const depthData = new Float32Array(numRenderParts);
   // const textureArrayIndexData = new Float32Array(numRenderParts);
   // const tintData = new Float32Array(3 * numRenderParts);
   // const opacityData = new Float32Array(numRenderParts);
   // const modelMatrixData = new Float32Array(9 * numRenderParts);
   
   // for (let i = 0; i < entities.length; i++) {
   //    const entity = entities[i];

   //    depthData.set(entity.depthData, currentDepthDataOffset);
   //    currentDepthDataOffset += entity.depthData.length;

   //    textureArrayIndexData.set(entity.textureArrayIndexData, currentTextureArrayIndexDataOffset);
   //    currentTextureArrayIndexDataOffset += entity.textureArrayIndexData.length;

   //    tintData.set(entity.tintData, currentTintDataOffset);
   //    currentTintDataOffset += entity.tintData.length;

   //    opacityData.set(entity.opacityData, currentOpacityDataOffset);
   //    currentOpacityDataOffset += entity.opacityData.length;

   //    modelMatrixData.set(entity.modelMatrixData, currentModelMatrixDataOffset);
   //    currentModelMatrixDataOffset += entity.modelMatrixData.length;
   //    // for (let j = 0; j < entity.allRenderParts.length; j++) {
   //    //    const renderPart = entity.allRenderParts[j];
   //    //    const depth = calculateRenderPartDepth(renderPart, entity);
   
   //    //    const textureArrayIndex = renderPartIsTextured(renderPart) ? renderPart.textureArrayIndex : -1;
   
   //    //    let tintR = entity.tintR + renderPart.tintR;
   //    //    let tintG = entity.tintG + renderPart.tintG;
   //    //    let tintB = entity.tintB + renderPart.tintB;
   //    //    if (!renderPartIsTextured(renderPart)) {
   //    //       tintR = renderPart.colour.r;
   //    //       tintG = renderPart.colour.g;
   //    //       tintB = renderPart.colour.b;
   //    //    }
   
   //    //    depthData[idx] = depth;
   
   //    //    textureArrayIndexData[idx] = textureArrayIndex;
   
   //    //    tintData[idx * 3] = tintR;
   //    //    tintData[idx * 3 + 1] = tintG;
   //    //    tintData[idx * 3 + 2] = tintB;
   
   //    //    opacityData[idx] = renderPart.opacity;
   
   //    //    modelMatrixData[idx * 9] = renderPart.modelMatrix[0];
   //    //    modelMatrixData[idx * 9 + 1] = renderPart.modelMatrix[1];
   //    //    modelMatrixData[idx * 9 + 2] = renderPart.modelMatrix[2];
   //    //    modelMatrixData[idx * 9 + 3] = renderPart.modelMatrix[3];
   //    //    modelMatrixData[idx * 9 + 4] = renderPart.modelMatrix[4];
   //    //    modelMatrixData[idx * 9 + 5] = renderPart.modelMatrix[5];
   //    //    modelMatrixData[idx * 9 + 6] = renderPart.modelMatrix[6];
   //    //    modelMatrixData[idx * 9 + 7] = renderPart.modelMatrix[7];
   //    //    modelMatrixData[idx * 9 + 8] = renderPart.modelMatrix[8];

   //    //    idx++;
   //    // }
   // }

   // gl.bindBuffer(gl.ARRAY_BUFFER, depthBuffer);
   // gl.bufferSubData(gl.ARRAY_BUFFER, offsetAmount * Float32Array.BYTES_PER_ELEMENT, entity.depthData);
   // // Texture array index
   // gl.bindBuffer(gl.ARRAY_BUFFER, textureArrayIndexBuffer);
   // gl.bufferSubData(gl.ARRAY_BUFFER, offsetAmount * Float32Array.BYTES_PER_ELEMENT, entity.textureArrayIndexData);
   // // Tint
   // gl.bindBuffer(gl.ARRAY_BUFFER, tintBuffer);
   // gl.bufferSubData(gl.ARRAY_BUFFER, offsetAmount * 3 * Float32Array.BYTES_PER_ELEMENT, entity.tintData);
   // // Opacity
   // gl.bindBuffer(gl.ARRAY_BUFFER, opacityBuffer);
   // gl.bufferSubData(gl.ARRAY_BUFFER, offsetAmount * Float32Array.BYTES_PER_ELEMENT, entity.opacityData);
   // // Model matrix
   // gl.bindBuffer(gl.ARRAY_BUFFER, modelMatrixBuffer);
   // gl.bufferSubData(gl.ARRAY_BUFFER, offsetAmount * 9 * Float32Array.BYTES_PER_ELEMENT, entity.modelMatrixData);

   const textureAtlas = getEntityTextureAtlas();

   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   // Bind texture atlas
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, textureAtlas.texture);

   gl.bindVertexArray(vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(0);

   // Depth buffer
   gl.bindBuffer(gl.ARRAY_BUFFER, depthBuffer);
   gl.bufferSubData(gl.ARRAY_BUFFER, 0, depthData);
   gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(1);
   gl.vertexAttribDivisor(1, 1);

   // Texture array index buffer
   gl.bindBuffer(gl.ARRAY_BUFFER, textureArrayIndexBuffer);
   gl.bufferSubData(gl.ARRAY_BUFFER, 0, textureArrayIndexData);
   gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(2);
   gl.vertexAttribDivisor(2, 1);

   // Tint buffer
   gl.bindBuffer(gl.ARRAY_BUFFER, tintBuffer);
   gl.bufferSubData(gl.ARRAY_BUFFER, 0, tintData);
   gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(3);
   gl.vertexAttribDivisor(3, 1);

   // Opacity buffer
   gl.bindBuffer(gl.ARRAY_BUFFER, opacityBuffer);
   gl.bufferSubData(gl.ARRAY_BUFFER, 0, opacityData);
   gl.vertexAttribPointer(4, 1, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(4);
   gl.vertexAttribDivisor(4, 1);

   // Model matrix buffer
   gl.bindBuffer(gl.ARRAY_BUFFER, modelMatrixBuffer);
   gl.bufferSubData(gl.ARRAY_BUFFER, 0, modelMatrixData);
   gl.vertexAttribPointer(5, 3, gl.FLOAT, false, 9 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.enableVertexAttribArray(5);
   gl.vertexAttribDivisor(5, 1);
   gl.vertexAttribPointer(6, 3, gl.FLOAT, false, 9 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
   gl.enableVertexAttribArray(6);
   gl.vertexAttribDivisor(6, 1);
   gl.vertexAttribPointer(7, 3, gl.FLOAT, false, 9 * Float32Array.BYTES_PER_ELEMENT, 6 * Float32Array.BYTES_PER_ELEMENT);
   gl.enableVertexAttribArray(7);
   gl.vertexAttribDivisor(7, 1);

   gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, numRenderParts);
   
   gl.vertexAttribDivisor(1, 0);
   gl.vertexAttribDivisor(2, 0);
   gl.vertexAttribDivisor(3, 0);
   gl.vertexAttribDivisor(4, 0);
   gl.vertexAttribDivisor(5, 0);
   gl.vertexAttribDivisor(6, 0);
   gl.vertexAttribDivisor(7, 0);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);

   gl.bindVertexArray(null);
}
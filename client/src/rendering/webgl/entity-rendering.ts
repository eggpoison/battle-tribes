import { createWebGLProgram, gl } from "../../webgl";
import { getEntityTextureAtlas } from "../../texture-atlases/texture-atlases";
import { bindUBOToProgram, ENTITY_TEXTURE_ATLAS_UBO, UBOBindingIndex } from "../ubos";
import Entity from "../../Entity";
import { RenderPart } from "../../render-parts/render-parts";
import { EntityID, EntityTypeString } from "webgl-test-shared/dist/entities";
import Board from "../../Board";
import { calculateEntityRenderHeight } from "../../render-layers";

const TEMPNONE = 123456789;

const LOW_LEVEL_DEBUGGING = true;

const enum Vars {
   ATTRIBUTES_PER_VERTEX = 17,
   MAX_RENDER_PARTS = 131072
}

let program: WebGLProgram;
let vao: WebGLVertexArrayObject;
let indexBuffer: WebGLBuffer;

let vertexBuffer: WebGLBuffer;
const indicesData = new Uint16Array(6 * Vars.MAX_RENDER_PARTS);
// @Incomplete: investigate
// const indicesData = new Uint16Array([0, 1, 2, 2, 1, 3]);

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

// @Temporary
let entityIDData: Uint32Array;

/** Maps entity IDs to indexes in the buffers */
const entityIDToBufferIndexRecord: Partial<Record<EntityID, number>> = {};
const bufferIndexToEntityRecord: Partial<Record<number, EntityID>> = {};
/** For any given buffer index, counts the number of render parts of all entities up to and including the entity at the specified buffer index */
const bufferIndexToOffsetAmount: Partial<Record<number, number>> = {};

const entityRenderHeightMap = new WeakMap<Entity, number>();

let previousRenderStartBufferOffset = 0;
let previousRenderEndBufferOffset = 0;

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

   uint pcg_hash(uint val) {
      uint state = val * 747796405u + 2891336453u;
      uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
      return (word >> 22u) ^ word;
   }
    
   void main() {
      vec2 textureSize;
      if (a_textureArrayIndex == -1.0) {
         uint vertexID = uint(gl_VertexID);
         uint hash = pcg_hash(vertexID);
         float rand = fract(float(hash) / 10000.0);

         // @Temporary
         // textureSize = vec2(2.0, 2.0);
         // textureSize = vec2(1.5, 1.5);
         float size = mix(1.4, 1.6, rand);
         textureSize = vec2(size, size);
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
         float textureXOffset = mod(textureIndex, u_atlasSize) * ATLAS_SLOT_SIZE;
         float textureYOffset = floor(textureIndex / u_atlasSize) * ATLAS_SLOT_SIZE;

         float textureX = floor(v_texCoord.x * textureSize.x);
         textureX = min(textureX, textureSize.x - 1.0);
         textureX = max(textureX, 0.0);
         float textureY = floor(v_texCoord.y * textureSize.y);
         textureY = min(textureY, textureSize.y - 1.0);
         textureY = max(textureY, 0.0);
         
         float x = textureXOffset + textureX;
         float y = textureYOffset + textureY;
         float u = (x + 0.5) / atlasPixelSize;
         float v = (y + 0.5) / atlasPixelSize;

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

   vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   indexBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

   const vertexData = new Float32Array(8);
   vertexData[0] = -0.5;
   vertexData[1] = -0.5;
   vertexData[2] = 0.5;
   vertexData[3] = -0.5;
   vertexData[4] = -0.5;
   vertexData[5] = 0.5;
   vertexData[6] = 0.5;
   vertexData[7] = 0.5;

   vertexBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
   gl.enableVertexAttribArray(0);
   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

   // Depth buffer
   depthData = new Float32Array(Vars.MAX_RENDER_PARTS);
   depthBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, depthBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, depthData, gl.DYNAMIC_DRAW);
   gl.enableVertexAttribArray(1);
   gl.vertexAttribPointer(1, 1, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribDivisor(1, 1);

   // Texture array index buffer
   textureArrayIndexData = new Float32Array(Vars.MAX_RENDER_PARTS);
   textureArrayIndexBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, textureArrayIndexBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, textureArrayIndexData, gl.DYNAMIC_DRAW);
   gl.enableVertexAttribArray(2);
   gl.vertexAttribPointer(2, 1, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribDivisor(2, 1);

   // Tint buffer
   tintData = new Float32Array(3 * Vars.MAX_RENDER_PARTS);
   tintBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, tintBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, tintData, gl.DYNAMIC_DRAW);
   gl.enableVertexAttribArray(3);
   gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribDivisor(3, 1);

   // Opacity buffer
   opacityData = new Float32Array(Vars.MAX_RENDER_PARTS);
   opacityBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, opacityBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, opacityData, gl.DYNAMIC_DRAW);
   gl.enableVertexAttribArray(4);
   gl.vertexAttribPointer(4, 1, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribDivisor(4, 1);

   // Model matrix buffer
   modelMatrixData = new Float32Array(9 * Vars.MAX_RENDER_PARTS);
   modelMatrixBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, modelMatrixBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, modelMatrixData, gl.DYNAMIC_DRAW);
   gl.enableVertexAttribArray(5);
   gl.vertexAttribPointer(5, 3, gl.FLOAT, false, 9 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribDivisor(5, 1);
   gl.enableVertexAttribArray(6);
   gl.vertexAttribPointer(6, 3, gl.FLOAT, false, 9 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribDivisor(6, 1);
   gl.enableVertexAttribArray(7);
   gl.vertexAttribPointer(7, 3, gl.FLOAT, false, 9 * Float32Array.BYTES_PER_ELEMENT, 6 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribDivisor(7, 1);

   gl.bindVertexArray(null);

   // @Temporary
   entityIDData = new Uint32Array(Vars.MAX_RENDER_PARTS);
   for (let i = 0; i < Vars.MAX_RENDER_PARTS; i++) {
      entityIDData[i] = TEMPNONE;
      if (i < 10) console.log(entityIDData[i] === TEMPNONE);
   }
}

export function addEntityToRenderHeightMap(entity: Entity): void {
   const renderHeight = calculateEntityRenderHeight(entity);
   entityRenderHeightMap.set(entity, renderHeight);
}

export function getEntityHeight(entity: Entity): number {
   const height = entityRenderHeightMap.get(entity);
   if (typeof height === "undefined") {
      throw new Error();
   }
   return height;
}

const setData = (entity: Entity, bufferIndex: number): void => {
   const offsetAmount = bufferIndex > 0 ? bufferIndexToOffsetAmount[bufferIndex - 1] : 0;
   // @Temporary?
   if (typeof offsetAmount === "undefined") {
      throw new Error();
   }
   
   depthData.set(entity.depthData, offsetAmount);
   textureArrayIndexData.set(entity.textureArrayIndexData, offsetAmount);
   tintData.set(entity.tintData, 3 * offsetAmount);
   opacityData.set(entity.opacityData, offsetAmount);
   modelMatrixData.set(entity.modelMatrixData, 9 * offsetAmount);

   // @Temporary
   entityIDData[offsetAmount] = entity.id;

   indicesData[offsetAmount * 6] = 0;
   indicesData[offsetAmount * 6 + 1] = 1;
   indicesData[offsetAmount * 6 + 2] = 2;
   indicesData[offsetAmount * 6 + 3] = 2;
   indicesData[offsetAmount * 6 + 4] = 1;
   indicesData[offsetAmount * 6 + 5] = 3;
}

const clearData = (bufferIndex: number): void => {
   let offsetAmount = bufferIndex > 0 ? bufferIndexToOffsetAmount[bufferIndex - 1] : 0;
   // @Temporary?
   if (typeof offsetAmount === "undefined") {
      throw new Error();
   }
   
   depthData[offsetAmount] = 0;

   textureArrayIndexData[offsetAmount] = 0;

   tintData[offsetAmount * 3] = 0;
   tintData[offsetAmount * 3 + 1] = 0;
   tintData[offsetAmount * 3 + 2] = 0;

   opacityData[offsetAmount] = 0;

   modelMatrixData[offsetAmount * 9] = 0;
   modelMatrixData[offsetAmount * 9 + 1] = 0;
   modelMatrixData[offsetAmount * 9 + 2] = 0;
   modelMatrixData[offsetAmount * 9 + 3] = 0;
   modelMatrixData[offsetAmount * 9 + 4] = 0;
   modelMatrixData[offsetAmount * 9 + 5] = 0;
   modelMatrixData[offsetAmount * 9 + 6] = 0;
   modelMatrixData[offsetAmount * 9 + 7] = 0;
   modelMatrixData[offsetAmount * 9 + 8] = 0;

   // @Temporary
   entityIDData[offsetAmount] = TEMPNONE;
}

const getBufferIndex = (entityRenderHeight: number, minBufferIndex: number): number => {
   // Find the first empty buffer index or a buffer index with a greater renderDepth
   let bufferIndex = minBufferIndex;
   for (; bufferIndex < Vars.MAX_RENDER_PARTS; bufferIndex++) {
      const entityID = bufferIndexToEntityRecord[bufferIndex];
      if (typeof entityID === "undefined") {
         break;
      } else {
         const currentEntity = Board.entityRecord[entityID]!;
         const renderHeight = entityRenderHeightMap.get(currentEntity)!;
         if (renderHeight >= entityRenderHeight) {
            break;
         }
      }
   }
   return bufferIndex;
}

const checkBuffer = (): void => {
   const r: Record<number, number> = {};
   let last = 0;
   for (let bufferIndex = 0; bufferIndex <= getFinalOccupiedBufferIndex(); bufferIndex++) {
      const id = bufferIndexToEntityRecord[bufferIndex];
      if (typeof id !== "undefined") {
         const offset = bufferIndexToOffsetAmount[bufferIndex]!;

         // @Hack?
         const entity = Board.entityRecord[id]!;
         const num = entity.allRenderParts.length;
         // const num = offset - last;
         // const num = offset - last;
         if (typeof r[id] === "undefined") {
            r[id] = num;
         } else {
            r[id] += num;
         }

         last = offset;
      }
   }

   const ids = Object.keys(r).map(Number);
   for (const id of ids) {
      const e = Board.entityRecord[id]!;
      if (typeof e === "undefined") {
         throw new Error("UNEXPECTED!!!! DID NOT EXIST!!!!!");
      }
      
      const count = r[id];
      if (count !== e.allRenderParts.length) {
         console.warn("-=-=--==-=-=-=--==-");
         console.log("Problematic entity id=" + e.id);
         console.log(EntityTypeString[e.type]);
         console.log("Count in buffer: " + (count || 0) + ", count in entity: " + e.allRenderParts.length);
         console.log(entityIDData);
         throw new Error();
      }
   }
}

/** Gets the buffer index of the last entity in the buffer */
const getFinalOccupiedBufferIndex = (): number => {
   // @Speed?
   let finalOccupiedBufferIndex = 0;
   for (let bufferIndex = 0; bufferIndex < Vars.MAX_RENDER_PARTS; bufferIndex++) {
      const entityID = bufferIndexToEntityRecord[bufferIndex];
      if (typeof entityID !== "undefined") {
         finalOccupiedBufferIndex = bufferIndex;
      }

   }
   return finalOccupiedBufferIndex;
   
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

export function removeEntityFromBuffer(entity: Entity): void {
   const bufferIndex = entityIDToBufferIndexRecord[entity.id];
   if (typeof bufferIndex !== "undefined") {
      console.warn("remove entity id=" + entity.id + " from buffer index " + bufferIndex);
      clearData(bufferIndex);
      delete bufferIndexToEntityRecord[bufferIndex];
      delete entityIDToBufferIndexRecord[entity.id];
      // delete bufferIndexToOffsetAmount[bufferIndex];
   }
}

// @Temporary
let overriddenRecord = {} as any;

// @Speed: Can split each render layer into its own buffer

export function addEntitiesToBuffer(entities: Array<Entity>): void {
   if (entities.length === 0) {
      return;
   }
   if(LOW_LEVEL_DEBUGGING)console.log("-=-==-=--=--------=-=-=-==-=-");
   if(LOW_LEVEL_DEBUGGING)console.log("(beginning of addEntitiesToBuffer function)")

   // Sort entities from lowest render depth to highest render depth
   // @Speed?
   const entitiesToAddSorted = entities.sort((a: Entity, b: Entity) => entityRenderHeightMap.get(a)! - entityRenderHeightMap.get(b)!);
   const queuedEntityIDs = new Array<EntityID>();

   let idx = 0;
   let bufferIndex = 0;

   // Update in-place
   for (; idx < entitiesToAddSorted.length; idx++) {
      const entity = entitiesToAddSorted[idx];

      const tentativeBufferIndex = entityIDToBufferIndexRecord[entity.id];
      if (typeof tentativeBufferIndex !== "undefined") {
         bufferIndex = tentativeBufferIndex;
         
         // @Cleanup: there has to be a better way to do this
         if (bufferIndex === 0) {
            entityIDToBufferIndexRecord[entity.id] = bufferIndex;
            bufferIndexToEntityRecord[bufferIndex] = entity.id;
            bufferIndexToOffsetAmount[bufferIndex] = entity.allRenderParts.length;
            setData(entity, bufferIndex);
         } else {
            const previousOffsetAmount = bufferIndexToOffsetAmount[bufferIndex - 1]!;
   
            entityIDToBufferIndexRecord[entity.id] = bufferIndex;
            bufferIndexToEntityRecord[bufferIndex] = entity.id;
            bufferIndexToOffsetAmount[bufferIndex] = previousOffsetAmount + entity.allRenderParts.length;
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

   // const before = catalogue();

   // @Copynpaste
   const existingBufferIndex = entityIDToBufferIndexRecord[entitiesToAddSorted[idx].id];
   if (typeof existingBufferIndex !== "undefined") {
      bufferIndex = existingBufferIndex;
   } else {
      const entity = entitiesToAddSorted[idx];
      bufferIndex = getBufferIndex(entityRenderHeightMap.get(entity)!, bufferIndex);
      // console.log("first:",entity.id);
   }

   for (; idx < entitiesToAddSorted.length; idx++) {
      const entity = entitiesToAddSorted[idx];
      const entityRenderHeight = entityRenderHeightMap.get(entity)!;
      
      if(LOW_LEVEL_DEBUGGING)console.log("___________");
      if(LOW_LEVEL_DEBUGGING)console.log("new. entity id=" + entity.id + ", buffer index:",bufferIndex);

      // @Cleanup? @Hack?
      // Update in-place
      if (typeof entityIDToBufferIndexRecord[entity.id] !== "undefined" && queuedEntityIDs.length === 0) {
         if(LOW_LEVEL_DEBUGGING)console.log("update in place at buffer index b=" + bufferIndex);
         // @Copynpaste
         if (bufferIndex === 0) {
            entityIDToBufferIndexRecord[entity.id] = bufferIndex;
            bufferIndexToEntityRecord[bufferIndex] = entity.id;
            bufferIndexToOffsetAmount[bufferIndex] = entity.allRenderParts.length;
            setData(entity, bufferIndex);
         } else {
            const previousOffsetAmount = bufferIndexToOffsetAmount[bufferIndex - 1]!;
   
            entityIDToBufferIndexRecord[entity.id] = bufferIndex;
            bufferIndexToEntityRecord[bufferIndex] = entity.id;
            bufferIndexToOffsetAmount[bufferIndex] = previousOffsetAmount + entity.allRenderParts.length;
            setData(entity, bufferIndex);
         }
         continue;
      }
      
      // @Cleanup: Copy and paste
      // Do the first swap
      {
         if(LOW_LEVEL_DEBUGGING)console.log("doing first swap");
         // If the entity isn't in the buffer or the queue, add them to the queue.
         // @Copynpaste
         if (typeof entityIDToBufferIndexRecord[entity.id] === "undefined" && !queuedEntityIDs.includes(entity.id)) {
            let insertIdx = 0;
            for (; insertIdx < queuedEntityIDs.length; insertIdx++) {
               const currentEntityID = queuedEntityIDs[insertIdx];
               const currentEntity = Board.entityRecord[currentEntityID]!;
               const renderHeight = entityRenderHeightMap.get(currentEntity)!;
               if (entityRenderHeight < renderHeight) {
                  break;
               }
            }
            queuedEntityIDs.splice(insertIdx, 0, entity.id);
            // @Temporary
            if (typeof Board.entityRecord[entity.id] === "undefined") {
               console.log("buffer index:",bufferIndex);
               console.log(entity.id);
               throw new Error();
            }
            // console.log("add entity into queued")
         } else {
            if (typeof entityIDToBufferIndexRecord[entity.id] !== "undefined") {
               // console.log("already in buffer! at buffer index " + entityIDToBufferIndexRecord[entity.id]);
            }
            if (queuedEntityIDs.includes(entity.id)) {
               // console.log("already in queue!");
            }
         }
         
         const overriddenEntityID = bufferIndexToEntityRecord[bufferIndex];

         if (queuedEntityIDs.length === 0) {
            throw new Error("GRUG");
         }
         const currentEntityID = queuedEntityIDs.shift()!;
         const currentEntity = Board.entityRecord[currentEntityID]!;
         if (typeof currentEntity === "undefined") {
            
            console.log(currentEntityID);
            throw new Error();
         }

         if (bufferIndex === 0) {
            entityIDToBufferIndexRecord[currentEntityID] = bufferIndex;
            bufferIndexToEntityRecord[bufferIndex] = currentEntityID;
            bufferIndexToOffsetAmount[bufferIndex] = currentEntity.allRenderParts.length;
            setData(currentEntity, bufferIndex);
         } else {
            const previousOffsetAmount = bufferIndexToOffsetAmount[bufferIndex - 1]!;
   
            entityIDToBufferIndexRecord[currentEntityID] = bufferIndex;
            bufferIndexToEntityRecord[bufferIndex] = currentEntityID;
            bufferIndexToOffsetAmount[bufferIndex] = previousOffsetAmount + currentEntity.allRenderParts.length;
            setData(currentEntity, bufferIndex);
         }
         
         if (typeof overriddenEntityID !== "undefined") {
            if (LOW_LEVEL_DEBUGGING) console.log("add overridden. id:",overriddenEntityID);
            queuedEntityIDs.push(overriddenEntityID);
            // @Temporary?
            delete entityIDToBufferIndexRecord[overriddenEntityID];
            // @Temporary
            if (typeof Board.entityRecord[overriddenEntityID] === "undefined") {
               throw new Error();
            }
         } else {
            if (LOW_LEVEL_DEBUGGING) console.log("added into empty slot")
         }
      }

      /** Buffer index of the next entity data to be updated/inserted (from entitiesToAddSorted) */
      let nextBufferIndex: number;
      if (bufferIndex >= getFinalOccupiedBufferIndex()) {
         // @Cleanup: Does this really make sense?
         // If we're inserting into an empty buffer slot, just set the next as the following buffer index
         nextBufferIndex = bufferIndex + 1;
      } else if (idx < entitiesToAddSorted.length - 1) {
         const nextEntity = entitiesToAddSorted[idx + 1];

         const existingBufferIndex = entityIDToBufferIndexRecord[nextEntity.id];
         if (typeof existingBufferIndex !== "undefined") {
            nextBufferIndex = existingBufferIndex;
         } else {
            const renderHeight = entityRenderHeightMap.get(nextEntity)!;
            nextBufferIndex = getBufferIndex(renderHeight, bufferIndex);
         }
      } else {
         // We are at the final entity, so we want to swap all remaining entities
         nextBufferIndex = getFinalOccupiedBufferIndex() + 1;
      }
      if(LOW_LEVEL_DEBUGGING)console.log("buffer index:",bufferIndex,"next buffer index:",nextBufferIndex);

      if (queuedEntityIDs.length > 0) {
         // @Speed: experiment with doing one big data swap for the whole lot
         // Swap until just before the next buffer
         for (let currentBufferIndex = bufferIndex + 1; currentBufferIndex < nextBufferIndex; currentBufferIndex++) {
            // Put the first queued entity into this buffer index, and the entity which was there into the buffer index onto the end of the queue
   
            const overriddenEntityID = bufferIndexToEntityRecord[currentBufferIndex];
   
            // @Temporary?
            if (queuedEntityIDs.length === 0) {
               // break;
               throw new Error();
            }
            const currentEntityID = queuedEntityIDs.shift()!;
            const currentEntity = Board.entityRecord[currentEntityID]!;
            if(LOW_LEVEL_DEBUGGING)console.log("add entity from queue into buffer index " + currentBufferIndex + ", id=" + currentEntityID);
            
            overriddenRecord[currentEntityID] = currentBufferIndex;
            if (currentBufferIndex === 0) {
               entityIDToBufferIndexRecord[currentEntityID] = currentBufferIndex;
               bufferIndexToEntityRecord[currentBufferIndex] = currentEntityID;
               bufferIndexToOffsetAmount[currentBufferIndex] = currentEntity.allRenderParts.length;
               setData(currentEntity, currentBufferIndex);
            } else {
               const previousOffsetAmount = bufferIndexToOffsetAmount[currentBufferIndex - 1]!;
      
               entityIDToBufferIndexRecord[currentEntityID] = currentBufferIndex;
               bufferIndexToEntityRecord[currentBufferIndex] = currentEntityID;
               bufferIndexToOffsetAmount[currentBufferIndex] = previousOffsetAmount + currentEntity.allRenderParts.length;
               setData(currentEntity, currentBufferIndex);
            }
            
            if (typeof overriddenEntityID !== "undefined") {
               if(LOW_LEVEL_DEBUGGING)console.log("override entity id=" + overriddenEntityID + ", adding to queue");
               queuedEntityIDs.push(overriddenEntityID);
               // @Temporary: Is this really necessary?
               delete entityIDToBufferIndexRecord[overriddenEntityID];
               // @Temporary
               if (typeof Board.entityRecord[overriddenEntityID] === "undefined") {
                  throw new Error();
               }
            } else if (queuedEntityIDs.length === 0) {
               if(LOW_LEVEL_DEBUGGING)console.log("break early!");
               break;
            }
         }
         if(LOW_LEVEL_DEBUGGING)console.log("following num queued:",queuedEntityIDs.length);
      }

      bufferIndex = nextBufferIndex;
   }

   // Add any remaining queued entities to the end of the buffer
   for (let i = 0; i < queuedEntityIDs.length; i++) {
      const entityID = queuedEntityIDs[i];
      const entity = Board.entityRecord[entityID]!;
      const bufferIndex = getFinalOccupiedBufferIndex() + 1;

      const previousOffsetAmount = bufferIndexToOffsetAmount[bufferIndex - 1]!;

      entityIDToBufferIndexRecord[entityID] = bufferIndex;
      bufferIndexToEntityRecord[bufferIndex] = entityID;
      bufferIndexToOffsetAmount[bufferIndex] = previousOffsetAmount + entity.allRenderParts.length;
      setData(entity, bufferIndex);
      // console.log("added from queue, id=" + entityID);
   }

   checkBuffer();

   // Make sure every entity in the board appears once
   const appearances: Record<number, number> = {};
   for (let bufferIndex = 0; bufferIndex <= getFinalOccupiedBufferIndex(); bufferIndex++) {
      const e = bufferIndexToEntityRecord[bufferIndex];
      if (typeof e !== "undefined") {
         if (typeof appearances[e] === "undefined") {
            appearances[e] = 1;
         } else {
            appearances[e]++;
         }
      }
   }
   for (const entity of Board.entities) {
      const num = appearances[entity.id] || 0;
      if (num !== 1) {
         throw new Error();
      }
   }
   
   // const b: Record<number, number> = {};
   // for (const entity of Board.entities) {
   //    console.log(entityIDToBufferIndexRecord[entity.id]);
   //    let a = 0;
   //    for (let bufferIndex = 0; bufferIndex <= getFinalOccupiedBufferIndex(); bufferIndex++) {
   //       const currentEntityID = bufferIndexToEntityRecord[bufferIndex];
   //       if (currentEntityID === entity.id) {
   //          a++;
   //       }
   //    }
   //    if (a !== 1) {
   //       console.log("entity id=" + entity.id + " appeared " + a + " times");
   //       const badBufferIndex = overriddenRecord[entity.id];
   //       console.log(badBufferIndex);
   //       console.log(bufferIndexToEntityRecord[badBufferIndex]);
   //       throw new Error("missing or extra");
   //    }
   // }

   if(LOW_LEVEL_DEBUGGING) {
      console.log(entityIDData);
   }

   // console.log("-=-==-=--=--------=-=-=-==-=-");
   // console.log("-=-==-=--=--------=-=-=-==-=-");
}

export function calculateRenderPartDepth(renderPart: RenderPart, entity: Entity): number {
   const renderHeight = entityRenderHeightMap.get(entity)!;
   return renderHeight + renderPart.zIndex * 0.0001;
}

// @Speed: VBO
export function renderEntities(startEntityID: EntityID, endEntityID: EntityID): void {
   const numPrevousRenderedRenderParts = previousRenderEndBufferOffset - previousRenderStartBufferOffset + 1;
   
   const startEntity = Board.entityRecord[startEntityID]!;
   const startBufferIndex = entityIDToBufferIndexRecord[startEntityID]!;
   const startBufferOffset = bufferIndexToOffsetAmount[startBufferIndex]! - startEntity.allRenderParts.length;

   const endBufferIndex = entityIDToBufferIndexRecord[endEntityID]!;
   const endBufferOffset = bufferIndexToOffsetAmount[endBufferIndex]! - 1;
   if (startBufferOffset > endBufferOffset) {
      throw new Error("greater!");
   }

   const textureAtlas = getEntityTextureAtlas();

   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   // Bind texture atlas
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, textureAtlas.texture);

   gl.bindVertexArray(vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

   // @Speed
   const indexBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
   gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesData, gl.STATIC_DRAW);

   // Depth buffer
   gl.bindBuffer(gl.ARRAY_BUFFER, depthBuffer);
   gl.bufferSubData(gl.ARRAY_BUFFER, Float32Array.BYTES_PER_ELEMENT * previousRenderStartBufferOffset, new Float32Array(numPrevousRenderedRenderParts));
   gl.bufferSubData(gl.ARRAY_BUFFER, 0, depthData.subarray(startBufferOffset, endBufferOffset + 1));

   // Texture array index buffer
   gl.bindBuffer(gl.ARRAY_BUFFER, textureArrayIndexBuffer);
   gl.bufferSubData(gl.ARRAY_BUFFER, Float32Array.BYTES_PER_ELEMENT * previousRenderStartBufferOffset, new Float32Array(numPrevousRenderedRenderParts));
   gl.bufferSubData(gl.ARRAY_BUFFER, 0, textureArrayIndexData.subarray(startBufferOffset, endBufferOffset + 1));

   // Tint buffer
   gl.bindBuffer(gl.ARRAY_BUFFER, tintBuffer);
   gl.bufferSubData(gl.ARRAY_BUFFER, Float32Array.BYTES_PER_ELEMENT * 3 * previousRenderStartBufferOffset, new Float32Array(numPrevousRenderedRenderParts * 3));
   gl.bufferSubData(gl.ARRAY_BUFFER, 0, tintData.subarray(startBufferOffset * 3, (endBufferOffset + 1) * 3));

   // Opacity buffer
   gl.bindBuffer(gl.ARRAY_BUFFER, opacityBuffer);
   gl.bufferSubData(gl.ARRAY_BUFFER, Float32Array.BYTES_PER_ELEMENT * previousRenderStartBufferOffset, new Float32Array(numPrevousRenderedRenderParts));
   gl.bufferSubData(gl.ARRAY_BUFFER, 0, opacityData.subarray(startBufferOffset, endBufferOffset + 1));

   // Model matrix buffer
   gl.bindBuffer(gl.ARRAY_BUFFER, modelMatrixBuffer);
   gl.bufferSubData(gl.ARRAY_BUFFER, Float32Array.BYTES_PER_ELEMENT * 9 * previousRenderStartBufferOffset, new Float32Array(numPrevousRenderedRenderParts * 9));
   gl.bufferSubData(gl.ARRAY_BUFFER, 0, modelMatrixData.subarray(startBufferOffset * 9, (endBufferOffset + 1) * 9));

   console.log("calling drawElementsInstanced. buffer offsets:", startBufferOffset, endBufferOffset);
   gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0, endBufferOffset - startBufferOffset + 1);
   
   gl.bindVertexArray(null);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);

   previousRenderStartBufferOffset = startBufferOffset;
   previousRenderEndBufferOffset = endBufferOffset;
}
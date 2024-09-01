import { createWebGLProgram, gl } from "../../webgl";
import { getEntityTextureAtlas } from "../../texture-atlases/texture-atlases";
import { bindUBOToProgram, ENTITY_TEXTURE_ATLAS_UBO, UBOBindingIndex } from "../ubos";
import Entity from "../../Entity";
import { RenderPart, renderPartIsTextured, thingIsRenderPart } from "../../render-parts/render-parts";
import { calculateEntityRenderHeight } from "../../render-layers";

const enum Vars {
   ATTRIBUTES_PER_VERTEX = 17
}

export const enum EntityRenderingVars {
   ATTRIBUTES_PER_VERTEX = Vars.ATTRIBUTES_PER_VERTEX
}

let program: WebGLProgram;
let vao: WebGLVertexArrayObject;
let indexBuffer: WebGLBuffer;

let vertexBuffer: WebGLBuffer;

const entityRenderHeightMap = new WeakMap<Entity, number>();

export function getEntityRenderingProgram(): WebGLProgram {
   return program;
}

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

   gl.bindVertexArray(null);
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

export function calculateRenderPartDepth(renderPart: RenderPart, entity: Entity): number {
   const renderHeight = entityRenderHeightMap.get(entity)!;
   return renderHeight + renderPart.zIndex * 0.0001;
}

const countRenderParts = (entities: ReadonlyArray<Entity>): number => {
   let numRenderParts = 0;
   for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      numRenderParts += entity.allRenderThings.length;
   }
   return numRenderParts;
}

export function setEntityInVertexData(entity: Entity, vertexData: Float32Array, indicesData: Uint16Array | null, renderPartIdx: number): number {
   const baseTintR = entity.tintR;
   const baseTintG = entity.tintG;
   const baseTintB = entity.tintB;

   for (let j = 0; j < entity.allRenderThings.length; j++) {
      const renderPart = entity.allRenderThings[j];
      if (!thingIsRenderPart(renderPart)) {
         continue;
      }
      
      const depth = calculateRenderPartDepth(renderPart, entity);
      
      const textureArrayIndex = renderPartIsTextured(renderPart) ? renderPart.textureArrayIndex : -1;

      let tintR = baseTintR + renderPart.tintR;
      let tintG = baseTintG + renderPart.tintG;
      let tintB = baseTintB + renderPart.tintB;

      if (!renderPartIsTextured(renderPart)) {
         tintR = renderPart.colour.r;
         tintG = renderPart.colour.g;
         tintB = renderPart.colour.b;
      }
      
      const vertexDataOffset = renderPartIdx * 4 * Vars.ATTRIBUTES_PER_VERTEX;

      vertexData[vertexDataOffset] = -0.5;
      vertexData[vertexDataOffset + 1] = -0.5;
      vertexData[vertexDataOffset + 2] = depth;
      vertexData[vertexDataOffset + 3] = textureArrayIndex;
      vertexData[vertexDataOffset + 4] = tintR;
      vertexData[vertexDataOffset + 5] = tintG;
      vertexData[vertexDataOffset + 6] = tintB;
      vertexData[vertexDataOffset + 7] = renderPart.opacity;
      vertexData[vertexDataOffset + 8] = renderPart.modelMatrix[0];
      vertexData[vertexDataOffset + 9] = renderPart.modelMatrix[1];
      vertexData[vertexDataOffset + 10] = renderPart.modelMatrix[2];
      vertexData[vertexDataOffset + 11] = renderPart.modelMatrix[3];
      vertexData[vertexDataOffset + 12] = renderPart.modelMatrix[4];
      vertexData[vertexDataOffset + 13] = renderPart.modelMatrix[5];
      vertexData[vertexDataOffset + 14] = renderPart.modelMatrix[6];
      vertexData[vertexDataOffset + 15] = renderPart.modelMatrix[7];
      vertexData[vertexDataOffset + 16] = renderPart.modelMatrix[8];

      vertexData[vertexDataOffset + 17] = 0.5;
      vertexData[vertexDataOffset + 18] = -0.5;
      vertexData[vertexDataOffset + 19] = depth;
      vertexData[vertexDataOffset + 20] = textureArrayIndex;
      vertexData[vertexDataOffset + 21] = tintR;
      vertexData[vertexDataOffset + 22] = tintG;
      vertexData[vertexDataOffset + 23] = tintB;
      vertexData[vertexDataOffset + 24] = renderPart.opacity;
      vertexData[vertexDataOffset + 25] = renderPart.modelMatrix[0];
      vertexData[vertexDataOffset + 26] = renderPart.modelMatrix[1];
      vertexData[vertexDataOffset + 27] = renderPart.modelMatrix[2];
      vertexData[vertexDataOffset + 28] = renderPart.modelMatrix[3];
      vertexData[vertexDataOffset + 29] = renderPart.modelMatrix[4];
      vertexData[vertexDataOffset + 30] = renderPart.modelMatrix[5];
      vertexData[vertexDataOffset + 31] = renderPart.modelMatrix[6];
      vertexData[vertexDataOffset + 32] = renderPart.modelMatrix[7];
      vertexData[vertexDataOffset + 33] = renderPart.modelMatrix[8];

      vertexData[vertexDataOffset + 34] = -0.5;
      vertexData[vertexDataOffset + 35] = 0.5;
      vertexData[vertexDataOffset + 36] = depth;
      vertexData[vertexDataOffset + 37] = textureArrayIndex;
      vertexData[vertexDataOffset + 38] = tintR;
      vertexData[vertexDataOffset + 39] = tintG;
      vertexData[vertexDataOffset + 40] = tintB;
      vertexData[vertexDataOffset + 41] = renderPart.opacity;
      vertexData[vertexDataOffset + 42] = renderPart.modelMatrix[0];
      vertexData[vertexDataOffset + 43] = renderPart.modelMatrix[1];
      vertexData[vertexDataOffset + 44] = renderPart.modelMatrix[2];
      vertexData[vertexDataOffset + 45] = renderPart.modelMatrix[3];
      vertexData[vertexDataOffset + 46] = renderPart.modelMatrix[4];
      vertexData[vertexDataOffset + 47] = renderPart.modelMatrix[5];
      vertexData[vertexDataOffset + 48] = renderPart.modelMatrix[6];
      vertexData[vertexDataOffset + 49] = renderPart.modelMatrix[7];
      vertexData[vertexDataOffset + 50] = renderPart.modelMatrix[8];

      vertexData[vertexDataOffset + 51] = 0.5;
      vertexData[vertexDataOffset + 52] = 0.5;
      vertexData[vertexDataOffset + 53] = depth;
      vertexData[vertexDataOffset + 54] = textureArrayIndex;
      vertexData[vertexDataOffset + 55] = tintR;
      vertexData[vertexDataOffset + 56] = tintG;
      vertexData[vertexDataOffset + 57] = tintB;
      vertexData[vertexDataOffset + 58] = renderPart.opacity;
      vertexData[vertexDataOffset + 59] = renderPart.modelMatrix[0];
      vertexData[vertexDataOffset + 60] = renderPart.modelMatrix[1];
      vertexData[vertexDataOffset + 61] = renderPart.modelMatrix[2];
      vertexData[vertexDataOffset + 62] = renderPart.modelMatrix[3];
      vertexData[vertexDataOffset + 63] = renderPart.modelMatrix[4];
      vertexData[vertexDataOffset + 64] = renderPart.modelMatrix[5];
      vertexData[vertexDataOffset + 65] = renderPart.modelMatrix[6];
      vertexData[vertexDataOffset + 66] = renderPart.modelMatrix[7];
      vertexData[vertexDataOffset + 67] = renderPart.modelMatrix[8];

      if (indicesData !== null) {
         const indicesDataOffset = renderPartIdx * 6;
   
         indicesData[indicesDataOffset] = renderPartIdx * 4;
         indicesData[indicesDataOffset + 1] = renderPartIdx * 4 + 1;
         indicesData[indicesDataOffset + 2] = renderPartIdx * 4 + 2;
         indicesData[indicesDataOffset + 3] = renderPartIdx * 4 + 2;
         indicesData[indicesDataOffset + 4] = renderPartIdx * 4 + 1;
         indicesData[indicesDataOffset + 5] = renderPartIdx * 4 + 3;
      }

      renderPartIdx++;
   }

   return renderPartIdx;
}

export function clearEntityInVertexData(entity: Entity, vertexData: Float32Array, renderPartIdx: number): void {
   for (let j = 0; j < entity.allRenderThings.length; j++) {
      const renderPart = entity.allRenderThings[j];
      if (!thingIsRenderPart(renderPart)) {
         continue;
      }
      
      const vertexDataOffset = renderPartIdx * 4 * Vars.ATTRIBUTES_PER_VERTEX;

      vertexData[vertexDataOffset] = 0;
      vertexData[vertexDataOffset + 1] = 0;
      vertexData[vertexDataOffset + 2] = 0;
      vertexData[vertexDataOffset + 3] = 0;
      vertexData[vertexDataOffset + 4] = 0;
      vertexData[vertexDataOffset + 5] = 0;
      vertexData[vertexDataOffset + 6] = 0;
      vertexData[vertexDataOffset + 7] = 0;
      vertexData[vertexDataOffset + 8] = 0;
      vertexData[vertexDataOffset + 9] = 0;
      vertexData[vertexDataOffset + 10] = 0;
      vertexData[vertexDataOffset + 11] = 0;
      vertexData[vertexDataOffset + 12] = 0;
      vertexData[vertexDataOffset + 13] = 0;
      vertexData[vertexDataOffset + 14] = 0;
      vertexData[vertexDataOffset + 15] = 0;
      vertexData[vertexDataOffset + 16] = 0;

      vertexData[vertexDataOffset + 17] = 0;
      vertexData[vertexDataOffset + 18] = 0;
      vertexData[vertexDataOffset + 19] = 0;
      vertexData[vertexDataOffset + 20] = 0;
      vertexData[vertexDataOffset + 21] = 0;
      vertexData[vertexDataOffset + 22] = 0;
      vertexData[vertexDataOffset + 23] = 0;
      vertexData[vertexDataOffset + 24] = 0;
      vertexData[vertexDataOffset + 25] = 0;
      vertexData[vertexDataOffset + 26] = 0;
      vertexData[vertexDataOffset + 27] = 0;
      vertexData[vertexDataOffset + 28] = 0;
      vertexData[vertexDataOffset + 29] = 0;
      vertexData[vertexDataOffset + 30] = 0;
      vertexData[vertexDataOffset + 31] = 0;
      vertexData[vertexDataOffset + 32] = 0;
      vertexData[vertexDataOffset + 33] = 0;

      vertexData[vertexDataOffset + 34] = 0;
      vertexData[vertexDataOffset + 35] = 0;
      vertexData[vertexDataOffset + 36] = 0;
      vertexData[vertexDataOffset + 37] = 0;
      vertexData[vertexDataOffset + 38] = 0;
      vertexData[vertexDataOffset + 39] = 0;
      vertexData[vertexDataOffset + 40] = 0;
      vertexData[vertexDataOffset + 41] = 0;
      vertexData[vertexDataOffset + 42] = 0;
      vertexData[vertexDataOffset + 43] = 0;
      vertexData[vertexDataOffset + 44] = 0;
      vertexData[vertexDataOffset + 45] = 0;
      vertexData[vertexDataOffset + 46] = 0;
      vertexData[vertexDataOffset + 47] = 0;
      vertexData[vertexDataOffset + 48] = 0;
      vertexData[vertexDataOffset + 49] = 0;
      vertexData[vertexDataOffset + 50] = 0;

      vertexData[vertexDataOffset + 51] = 0;
      vertexData[vertexDataOffset + 52] = 0;
      vertexData[vertexDataOffset + 53] = 0;
      vertexData[vertexDataOffset + 54] = 0;
      vertexData[vertexDataOffset + 55] = 0;
      vertexData[vertexDataOffset + 56] = 0;
      vertexData[vertexDataOffset + 57] = 0;
      vertexData[vertexDataOffset + 58] = 0;
      vertexData[vertexDataOffset + 59] = 0;
      vertexData[vertexDataOffset + 60] = 0;
      vertexData[vertexDataOffset + 61] = 0;
      vertexData[vertexDataOffset + 62] = 0;
      vertexData[vertexDataOffset + 63] = 0;
      vertexData[vertexDataOffset + 64] = 0;
      vertexData[vertexDataOffset + 65] = 0;
      vertexData[vertexDataOffset + 66] = 0;
      vertexData[vertexDataOffset + 67] = 0;

      renderPartIdx++;
   }
}

export function renderEntities(entities: ReadonlyArray<Entity>): void {
   const textureAtlas = getEntityTextureAtlas();

   const numRenderParts = countRenderParts(entities);
   const vertexData = new Float32Array(numRenderParts * 4 * Vars.ATTRIBUTES_PER_VERTEX);
   const indicesData = new Uint16Array(numRenderParts * 6);

   let renderPartIdx = 0;
   for (const entity of entities) {
      renderPartIdx = setEntityInVertexData(entity, vertexData, indicesData, renderPartIdx);
   }
   
   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   // Bind texture atlas
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, textureAtlas.texture);

   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

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

   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
   gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesData, gl.STATIC_DRAW);
   
<<<<<<< HEAD
   depthData.set(entity.depthData, offsetAmount);
   textureArrayIndexData.set(entity.textureArrayIndexData, offsetAmount);
   tintData.set(entity.tintData, 3 * offsetAmount);
   opacityData.set(entity.opacityData, offsetAmount);
   modelMatrixData.set(entity.modelMatrixData, 9 * offsetAmount);
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

export function removeEntityFromBuffer(entity: Entity): void {
   console.log("(!!!) remove an entity from the buffer. id=" + entity.id);
   const bufferIndex = entityIDToBufferIndexRecord[entity.id];
   if (typeof bufferIndex !== "undefined") {
      console.log("remove from " + bufferIndex);
      clearData(bufferIndex);
      delete bufferIndexToEntityRecord[bufferIndex];
      delete entityIDToBufferIndexRecord[entity.id];
      // delete bufferIndexToOffsetAmount[bufferIndex];
   }
}

const catalogue = (): Record<EntityID, number> => {
   const c: Record<EntityID, number> = {};
   for (let b = 0; b <= getFinalBufferIndex(); b++) {
      const eID = bufferIndexToEntityRecord[b];
      if (typeof eID !== "undefined") {
         if (typeof c[eID] === "undefined") {
            c[eID] = 1;
         } else {
            c[eID]++;
         }
      }
   }
   return c;
}

let tempIsGood = false;

const checkCatalogue = (before: Record<EntityID, number>, queued: ReadonlyArray<EntityID>): void => {
   const newc = catalogue();

   for (let entityID = 0; entityID < Vars.MAX_RENDER_PARTS; entityID++) {
      const numBefore = before[entityID];
      const numAfter = newc[entityID];
      if (typeof numBefore !== "undefined" && (numAfter === 0 || typeof numAfter === "undefined") && typeof Board.entityRecord[entityID] !== "undefined" && !queued.includes(entityID)) {
         console.warn("bad entity ID:",entityID);
         console.log("Before:",numBefore,", num after:",numAfter);
         throw new Error();
      }
      if (typeof Board.entityRecord[entityID] !== "undefined" && typeof numAfter === "undefined") {
         console.warn("didn't find",entityID);
         throw new Error();
      }
   }
}

export function addEntitiesToBuffer(entities: Array<Entity>): void {
   if (entities.length === 0) {
      return;
   }

   console.log("-=-=-=-=--=--=-");

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

   const before = catalogue();

   // @Copynpaste
   const existingBufferIndex = entityIDToBufferIndexRecord[entitiesToAddSorted[idx].id];
   if (typeof existingBufferIndex !== "undefined") {
      bufferIndex = existingBufferIndex;
   } else {
      const entity = entitiesToAddSorted[idx];
      bufferIndex = getBufferIndex(entityRenderHeightMap.get(entity)!, bufferIndex);
   }

   for (; idx < entitiesToAddSorted.length; idx++) {
      const entity = entitiesToAddSorted[idx];
      const entityRenderHeight = entityRenderHeightMap.get(entity)!;
      console.log("___________");

      console.log("new. entity id=" + entity.id + ", buffer index:",bufferIndex);

      // @Cleanup? @Hack?
      // Update in-place
      if (typeof entityIDToBufferIndexRecord[entity.id] !== "undefined" && queuedEntityIDs.length === 0) {
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
         checkCatalogue(before, queuedEntityIDs);
         console.log("doing first swap");
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
               throw new Error();
            }
            console.log("add entity into queued")
         } else {
            if (typeof entityIDToBufferIndexRecord[entity.id] !== "undefined") {
               console.log("already in buffer! at buffer index " + entityIDToBufferIndexRecord[entity.id]);
            }
            if (queuedEntityIDs.includes(entity.id)) {
               console.log("already in queue!");
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
            console.log("add overridden. id:",overriddenEntityID);
            queuedEntityIDs.push(overriddenEntityID);
            // @Temporary?
            delete entityIDToBufferIndexRecord[overriddenEntityID];
            // @Temporary
            if (typeof Board.entityRecord[overriddenEntityID] === "undefined") {
               throw new Error();
            }
         } else {
            console.log("added into empty slot")
         }
         checkCatalogue(before, queuedEntityIDs);
      }

      /** Buffer index of the next entity data to be updated/inserted (from entitiesToAddSorted) */
      let nextBufferIndex: number;
      if (bufferIndex >= getFinalBufferIndex()) {
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
         nextBufferIndex = getFinalBufferIndex() + 1;
      }
      console.log("buffer index:",bufferIndex,"next buffer index:",nextBufferIndex);

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
               queuedEntityIDs.push(overriddenEntityID);
               // @Temporary: Is this really necessary?
               delete entityIDToBufferIndexRecord[overriddenEntityID];
               // @Temporary
               if (typeof Board.entityRecord[overriddenEntityID] === "undefined") {
                  throw new Error();
               }
            } else if (queuedEntityIDs.length === 0) {
               console.log("break early!");
               break;
            }
         }
         console.log("following num queued:",queuedEntityIDs.length);
      }

      bufferIndex = nextBufferIndex;
   }

   // Add any remaining queued entities to the end of the buffer
   for (let i = 0; i < queuedEntityIDs.length; i++) {
      const entityID = queuedEntityIDs[i];
      const entity = Board.entityRecord[entityID]!;
      const bufferIndex = getFinalBufferIndex() + 1;

      const previousOffsetAmount = bufferIndexToOffsetAmount[bufferIndex - 1]!;

      entityIDToBufferIndexRecord[entityID] = bufferIndex;
      bufferIndexToEntityRecord[bufferIndex] = entityID;
      bufferIndexToOffsetAmount[bufferIndex] = previousOffsetAmount + entity.allRenderParts.length;
      setData(entity, bufferIndex);
   }
}

export function calculateRenderPartDepth(renderPart: RenderPart, entity: Entity): number {
   const renderHeight = entityRenderHeightMap.get(entity)!;
   return renderHeight + renderPart.zIndex * 0.0001;
}

// @Speed: VBO
export function renderEntities(entities: ReadonlyArray<Entity>): void {
   // @Incomplete: do in the specified range
   
   const finalBufferIndex = getFinalBufferIndex();
   const finalBufferOffset = bufferIndexToOffsetAmount[finalBufferIndex]!;

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

   // @Speed: not all parts of these buffers are updated every frame!

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

   gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, finalBufferOffset);
   
   gl.vertexAttribDivisor(1, 0);
   gl.vertexAttribDivisor(2, 0);
   gl.vertexAttribDivisor(3, 0);
   gl.vertexAttribDivisor(4, 0);
   gl.vertexAttribDivisor(5, 0);
   gl.vertexAttribDivisor(6, 0);
   gl.vertexAttribDivisor(7, 0);
=======
   gl.drawElements(gl.TRIANGLES, numRenderParts * 6, gl.UNSIGNED_SHORT, 0);
>>>>>>> dc29c70f26f0d7da3b3ec39ca14cd43b4722bc5b

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}
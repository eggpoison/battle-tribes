import { createWebGLProgram, gl } from "../../webgl";
import { getEntityTextureAtlas } from "../../texture-atlases/texture-atlases";
import { bindUBOToProgram, ENTITY_TEXTURE_ATLAS_UBO, UBOBindingIndex } from "../ubos";
import { EntityRenderInfo } from "../../Entity";
import { RenderPart, renderPartIsTextured, thingIsRenderPart } from "../../render-parts/render-parts";
import { calculateEntityRenderHeight } from "../../render-layers";
import { getEntityRenderInfo } from "../../world";
import { EntityID } from "../../../../shared/src/entities";

const enum Vars {
   ATTRIBUTES_PER_VERTEX = 17,
   /** Maximum number of render parts that the rendering supports */
   MAX_RENDER_PARTS = 8192
}

export const enum EntityRenderingVars {
   ATTRIBUTES_PER_VERTEX = Vars.ATTRIBUTES_PER_VERTEX
}

let program: WebGLProgram;
let vao: WebGLVertexArrayObject;

let indexBuffer: WebGLBuffer;
let indicesData: Uint16Array;

let vertexBuffer: WebGLBuffer;
let vertexData: Float32Array;

// @Hack @Cleanup: remove
const entityRenderHeightMap = new WeakMap<EntityRenderInfo, number>();

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

   vertexData = new Float32Array(Vars.MAX_RENDER_PARTS * 4 * Vars.ATTRIBUTES_PER_VERTEX);

   indicesData = new Uint16Array(Vars.MAX_RENDER_PARTS * 6);
   for (let i = 0; i < Vars.MAX_RENDER_PARTS; i++) {
      const dataOffset = i * 6;
      
      indicesData[dataOffset] = i * 4;
      indicesData[dataOffset + 1] = i * 4 + 1;
      indicesData[dataOffset + 2] = i * 4 + 2;
      indicesData[dataOffset + 3] = i * 4 + 2;
      indicesData[dataOffset + 4] = i * 4 + 1;
      indicesData[dataOffset + 5] = i * 4 + 3;
   }

   vertexBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);

   indexBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
   gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesData, gl.DYNAMIC_DRAW);

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

   gl.bindVertexArray(null);
}

export function addEntityToRenderHeightMap(renderInfo: EntityRenderInfo): void {
   const renderHeight = calculateEntityRenderHeight(renderInfo.associatedEntity);
   entityRenderHeightMap.set(renderInfo, renderHeight);
}

export function getEntityHeight(renderInfo: EntityRenderInfo): number {
   const height = entityRenderHeightMap.get(renderInfo);
   if (typeof height === "undefined") {
      throw new Error();
   }
   return height;
}

export function calculateRenderPartDepth(renderPart: RenderPart, renderInfo: EntityRenderInfo): number {
   const renderHeight = entityRenderHeightMap.get(renderInfo)!;
   return renderHeight + renderPart.zIndex * 0.0001;
}

export function setEntityInVertexData(renderInfo: EntityRenderInfo, vertexData: Float32Array, indicesData: Uint16Array | null, renderPartIdx: number): number {
   const baseTintR = renderInfo.tintR;
   const baseTintG = renderInfo.tintG;
   const baseTintB = renderInfo.tintB;

   for (let j = 0; j < renderInfo.allRenderThings.length; j++) {
      const renderPart = renderInfo.allRenderThings[j];
      if (!thingIsRenderPart(renderPart)) {
         continue;
      }
      
      const depth = calculateRenderPartDepth(renderPart, renderInfo);
      
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

const clearRenderPartInVertexData = (vertexData: Float32Array, renderPartIdx: number): void => {
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
}

export function clearEntityInVertexData(renderInfo: EntityRenderInfo, vertexData: Float32Array, renderPartIdx: number): void {
   for (let j = 0; j < renderInfo.allRenderThings.length; j++) {
      const renderPart = renderInfo.allRenderThings[j];
      if (!thingIsRenderPart(renderPart)) {
         continue;
      }

      clearRenderPartInVertexData(vertexData, renderPartIdx);
      renderPartIdx++;
   }
}

export function renderEntities(entities: ReadonlyArray<EntityID>): void {
   const textureAtlas = getEntityTextureAtlas();

   // Set data
   let renderPartIdx = 0;
   for (const entity of entities) {
      const renderInfo = getEntityRenderInfo(entity);
      renderPartIdx = setEntityInVertexData(renderInfo, vertexData, null, renderPartIdx);
   }

   // renderPartIdx is now the idx of the final render part we want to render + 1. A.k.a the number of render parts we're rendering
   const numRenderParts = renderPartIdx;
   
   if (numRenderParts > Vars.MAX_RENDER_PARTS) {
      console.warn("Exceeded maximum buffer size for non-chunked entity rendering.");
   }

   gl.useProgram(program);
   gl.bindVertexArray(vao);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   // Bind texture atlas
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, textureAtlas.texture);

   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
   // const length = Math.max(previousNumRenderParts, numRenderParts) * EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT;
   const length = numRenderParts * EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT;
   gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertexData, 0, length);

   gl.drawElements(gl.TRIANGLES, numRenderParts * 6, gl.UNSIGNED_SHORT, 0);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);

   gl.bindVertexArray(null);
}
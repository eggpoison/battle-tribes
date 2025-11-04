import { createWebGLProgram, gl } from "../../webgl";
import { getEntityTextureAtlas } from "../../texture-atlases/texture-atlases";
import { bindUBOToProgram, getEntityTextureAtlasUBO, UBOBindingIndex } from "../ubos";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { VisualRenderPart, renderPartIsTextured, thingIsVisualRenderPart } from "../../render-parts/render-parts";

const enum Vars {
   ATTRIBUTES_PER_VERTEX = 17
}

export const enum EntityRenderingVars {
   ATTRIBUTES_PER_VERTEX = Vars.ATTRIBUTES_PER_VERTEX
}

export interface EntityRenderingOptions {
   readonly overrideAlphaWithOne?: boolean;
}

let program: WebGLProgram;
let overrideAlphaWithOneUniformLocation: WebGLUniformLocation;

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

   ${getEntityTextureAtlasUBO()}
   
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
   ${getEntityTextureAtlasUBO()}
   
   uniform float u_overrideAlphaWithOne;
   
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
   
      if (u_overrideAlphaWithOne > 0.5 && outputColour.a > 0.0) {
         outputColour.a = 1.0;
      } else {
         outputColour.a *= v_opacity;
      }

      // @Hack :DarkTransparencyBug
      outputColour.rgb *= outputColour.a;
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   bindUBOToProgram(gl, program, UBOBindingIndex.CAMERA);
   bindUBOToProgram(gl, program, UBOBindingIndex.ENTITY_TEXTURE_ATLAS);

   const textureUniformLocation = gl.getUniformLocation(program, "u_textureAtlas")!;

   gl.useProgram(program);
   gl.uniform1i(textureUniformLocation, 0);

   overrideAlphaWithOneUniformLocation = gl.getUniformLocation(program, "u_overrideAlphaWithOne")!;

   gl.bindVertexArray(null);
}

export function calculateRenderPartDepth(renderPart: VisualRenderPart, renderInfo: EntityRenderInfo): number {
   return renderInfo.renderHeight + renderPart.zIndex * 0.0001;
}

export function setRenderInfoInVertexData(renderInfo: EntityRenderInfo, vertexData: Float32Array, indicesData: Uint16Array | null, renderPartIdx: number): number {
   const baseTintR = renderInfo.tintR;
   const baseTintG = renderInfo.tintG;
   const baseTintB = renderInfo.tintB;

   for (let j = 0; j < renderInfo.renderPartsByZIndex.length; j++) {
      const renderPart = renderInfo.renderPartsByZIndex[j];
      if (!thingIsVisualRenderPart(renderPart)) {
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
      vertexData[vertexDataOffset + 10] = 0;
      vertexData[vertexDataOffset + 11] = renderPart.modelMatrix[2];
      vertexData[vertexDataOffset + 12] = renderPart.modelMatrix[3];
      vertexData[vertexDataOffset + 13] = 0;
      vertexData[vertexDataOffset + 14] = renderPart.modelMatrix[4];
      vertexData[vertexDataOffset + 15] = renderPart.modelMatrix[5];
      vertexData[vertexDataOffset + 16] = 1;

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
      vertexData[vertexDataOffset + 27] = 0;
      vertexData[vertexDataOffset + 28] = renderPart.modelMatrix[2];
      vertexData[vertexDataOffset + 29] = renderPart.modelMatrix[3];
      vertexData[vertexDataOffset + 30] = 0;
      vertexData[vertexDataOffset + 31] = renderPart.modelMatrix[4];
      vertexData[vertexDataOffset + 32] = renderPart.modelMatrix[5];
      vertexData[vertexDataOffset + 33] = 1;

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
      vertexData[vertexDataOffset + 44] = 0;
      vertexData[vertexDataOffset + 45] = renderPart.modelMatrix[2];
      vertexData[vertexDataOffset + 46] = renderPart.modelMatrix[3];
      vertexData[vertexDataOffset + 47] = 0;
      vertexData[vertexDataOffset + 48] = renderPart.modelMatrix[4];
      vertexData[vertexDataOffset + 49] = renderPart.modelMatrix[5];
      vertexData[vertexDataOffset + 50] = 1;

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
      vertexData[vertexDataOffset + 61] = 0;
      vertexData[vertexDataOffset + 62] = renderPart.modelMatrix[2];
      vertexData[vertexDataOffset + 63] = renderPart.modelMatrix[3];
      vertexData[vertexDataOffset + 64] = 0;
      vertexData[vertexDataOffset + 65] = renderPart.modelMatrix[4];
      vertexData[vertexDataOffset + 66] = renderPart.modelMatrix[5];
      vertexData[vertexDataOffset + 67] = 1;

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
   for (let j = 0; j < renderInfo.renderPartsByZIndex.length; j++) {
      const renderPart = renderInfo.renderPartsByZIndex[j];
      if (!thingIsVisualRenderPart(renderPart)) {
         continue;
      }

      clearRenderPartInVertexData(vertexData, renderPartIdx);
      renderPartIdx++;
   }
}

export function setupEntityRendering(): void {
   gl.useProgram(program);

   // Bind texture atlas
   const textureAtlas = getEntityTextureAtlas();
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, textureAtlas.texture);
}

/** NOTE: Callers must control the blending. */
export function renderEntity(renderInfo: Readonly<EntityRenderInfo>, options?: EntityRenderingOptions): void {
   gl.uniform1f(overrideAlphaWithOneUniformLocation, options?.overrideAlphaWithOne ? 1 : 0);

   const numRenderParts = renderInfo.renderPartsByZIndex.length;
   
   gl.bindVertexArray(renderInfo.vao);
   gl.drawElements(gl.TRIANGLES, numRenderParts * 6, gl.UNSIGNED_SHORT, 0);
}

export function cleanupEntityRendering(): void {
   gl.bindVertexArray(null);
}
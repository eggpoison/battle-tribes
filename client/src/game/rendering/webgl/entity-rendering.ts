import { createWebGLProgram, gl } from "../../webgl";
import { getEntityTextureAtlas } from "../../texture-atlases/texture-atlases";
import { bindUBOToProgram, getEntityTextureAtlasUBO, UBOBindingIndex } from "../ubos";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { VisualRenderPart, renderPartIsTextured, thingIsVisualRenderPart } from "../../render-parts/render-parts";

const enum Vars {
   ATTRIBUTES_PER_VERTEX = 19
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
   layout(location = 2) in float a_textureIndex;
   layout(location = 3) in vec2 a_textureSize;
   layout(location = 4) in vec3 a_tint;
   layout(location = 5) in float a_opacity;
   layout(location = 6) in mat3 a_modelMatrix;
   
   out vec2 v_texCoord;
   out float v_textureIndex;
   out vec2 v_textureSize;
   out vec3 v_tint;
   out float v_opacity;

   uint pcg_hash(uint val) {
      uint state = val * 747796405u + 2891336453u;
      uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
      return (word >> 22u) ^ word;
   }
   
   void main() {
      vec2 textureSize;
      if (a_textureIndex == -1.0) {
         // Non-textured render parts

         uint vertexID = uint(gl_VertexID);
         uint hash = pcg_hash(vertexID);
         float rand = fract(float(hash) / 10000.0);

         float size = mix(1.4, 1.6, rand);
         textureSize = vec2(size, size);
      } else {
         textureSize = a_textureSize;
      }

      vec2 worldPos = (a_modelMatrix * vec3(a_position * textureSize * 4.0, 1.0)).xy;

      vec2 screenPos = (worldPos - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, a_depth, 1.0);
   
      v_texCoord = a_position + 0.5;
      v_textureIndex = a_textureIndex;
      v_textureSize = a_textureSize;
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
   in float v_textureIndex;
   in vec2 v_textureSize;
   in vec3 v_tint;
   in float v_opacity;
   
   out vec4 outputColour;
   
   void main() {
      if (v_textureIndex == -1.0) {
         // Monocolour textures
         outputColour = vec4(v_tint, 1.0);
      } else {
         float atlasPixelSize = u_atlasSize * ATLAS_SLOT_SIZE;
         
         // Calculate the coordinates of the top left corner of the texture
         float textureXOffset = mod(v_textureIndex, u_atlasSize) * ATLAS_SLOT_SIZE;
         float textureYOffset = floor(v_textureIndex / u_atlasSize) * ATLAS_SLOT_SIZE;

         float textureX = floor(v_texCoord.x * v_textureSize.x);
         textureX = min(textureX, v_textureSize.x - 1.0);
         textureX = max(textureX, 0.0);
         float textureY = floor(v_texCoord.y * v_textureSize.y);
         textureY = min(textureY, v_textureSize.y - 1.0);
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

export interface EntityRenderData {
   readonly vao: WebGLVertexArrayObject;
   readonly indexBuffer: WebGLBuffer;
   readonly indicesData: Uint16Array;
   readonly vertexBuffer: WebGLBuffer;
   readonly vertexData: Float32Array;
}

export function createEntityRenderData(maxRenderParts: number): EntityRenderData {
   const vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);
   
   const vertexData = new Float32Array(maxRenderParts * 4 * EntityRenderingVars.ATTRIBUTES_PER_VERTEX);

   const indicesData = new Uint16Array(maxRenderParts * 6);
   for (let i = 0; i < maxRenderParts; i++) {
      const dataOffset = i * 6;
      
      indicesData[dataOffset] = i * 4;
      indicesData[dataOffset + 1] = i * 4 + 1;
      indicesData[dataOffset + 2] = i * 4 + 2;
      indicesData[dataOffset + 3] = i * 4 + 2;
      indicesData[dataOffset + 4] = i * 4 + 1;
      indicesData[dataOffset + 5] = i * 4 + 3;
   }

   const vertexBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);

   const indexBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
   gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesData, gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 1, gl.FLOAT, false, EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 1, gl.FLOAT, false, EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(3, 2, gl.FLOAT, false, EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(4, 3, gl.FLOAT, false, EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 6 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(5, 1, gl.FLOAT, false, EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 9 * Float32Array.BYTES_PER_ELEMENT);

   gl.vertexAttribPointer(6, 3, gl.FLOAT, false, EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 10 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(7, 3, gl.FLOAT, false, EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 13 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(8, 3, gl.FLOAT, false, EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 16 * Float32Array.BYTES_PER_ELEMENT);
   
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);
   gl.enableVertexAttribArray(3);
   gl.enableVertexAttribArray(4);
   gl.enableVertexAttribArray(5);
   gl.enableVertexAttribArray(6);
   gl.enableVertexAttribArray(7);
   gl.enableVertexAttribArray(8);

   gl.bindVertexArray(null);

   return {
      vao: vao,
      indexBuffer: indexBuffer,
      indicesData: indicesData,
      vertexBuffer: vertexBuffer,
      vertexData: vertexData
   };
}

export function calculateRenderPartDepth(renderPart: VisualRenderPart, renderInfo: EntityRenderInfo): number {
   return renderInfo.renderHeight + renderPart.zIndex * 0.0001;
}

export function setRenderInfoInVertexData(renderInfo: EntityRenderInfo, vertexData: Float32Array, indicesData: Uint16Array | null, renderPartIdx: number): number {
   const textureAtlas = getEntityTextureAtlas();

   const baseTintR = renderInfo.tintR;
   const baseTintG = renderInfo.tintG;
   const baseTintB = renderInfo.tintB;

   for (const renderPart of renderInfo.renderPartsByZIndex) {
      if (!thingIsVisualRenderPart(renderPart)) {
         continue;
      }
      
      const depth = calculateRenderPartDepth(renderPart, renderInfo);
      
      let textureIndex: number;
      let textureWidth: number;
      let textureHeight: number;
      if (renderPartIsTextured(renderPart)) {
         const textureArrayIndex = renderPart.textureArrayIndex;
         textureIndex = textureAtlas.textureSlotIndexes[textureArrayIndex];
         textureWidth = textureAtlas.textureWidths[textureArrayIndex];
         textureHeight = textureAtlas.textureHeights[textureArrayIndex];
      } else {
         textureIndex = -1;
         textureWidth = -1;
         textureHeight = -1;
      }

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
      vertexData[vertexDataOffset + 3] = textureIndex;
      vertexData[vertexDataOffset + 4] = textureWidth;
      vertexData[vertexDataOffset + 5] = textureHeight;
      vertexData[vertexDataOffset + 6] = tintR;
      vertexData[vertexDataOffset + 7] = tintG;
      vertexData[vertexDataOffset + 8] = tintB;
      vertexData[vertexDataOffset + 9] = renderPart.opacity;
      vertexData[vertexDataOffset + 10] = renderPart.modelMatrix[0];
      vertexData[vertexDataOffset + 11] = renderPart.modelMatrix[1];
      vertexData[vertexDataOffset + 12] = 0;
      vertexData[vertexDataOffset + 13] = renderPart.modelMatrix[2];
      vertexData[vertexDataOffset + 14] = renderPart.modelMatrix[3];
      vertexData[vertexDataOffset + 15] = 0;
      vertexData[vertexDataOffset + 16] = renderPart.modelMatrix[4];
      vertexData[vertexDataOffset + 17] = renderPart.modelMatrix[5];
      vertexData[vertexDataOffset + 18] = 1;

      vertexData[vertexDataOffset + 19] = 0.5;
      vertexData[vertexDataOffset + 20] = -0.5;
      vertexData[vertexDataOffset + 21] = depth;
      vertexData[vertexDataOffset + 22] = textureIndex;
      vertexData[vertexDataOffset + 23] = textureWidth;
      vertexData[vertexDataOffset + 24] = textureHeight;
      vertexData[vertexDataOffset + 25] = tintR;
      vertexData[vertexDataOffset + 26] = tintG;
      vertexData[vertexDataOffset + 27] = tintB;
      vertexData[vertexDataOffset + 28] = renderPart.opacity;
      vertexData[vertexDataOffset + 29] = renderPart.modelMatrix[0];
      vertexData[vertexDataOffset + 30] = renderPart.modelMatrix[1];
      vertexData[vertexDataOffset + 31] = 0;
      vertexData[vertexDataOffset + 32] = renderPart.modelMatrix[2];
      vertexData[vertexDataOffset + 33] = renderPart.modelMatrix[3];
      vertexData[vertexDataOffset + 34] = 0;
      vertexData[vertexDataOffset + 35] = renderPart.modelMatrix[4];
      vertexData[vertexDataOffset + 36] = renderPart.modelMatrix[5];
      vertexData[vertexDataOffset + 37] = 1;

      vertexData[vertexDataOffset + 38] = -0.5;
      vertexData[vertexDataOffset + 39] = 0.5;
      vertexData[vertexDataOffset + 40] = depth;
      vertexData[vertexDataOffset + 41] = textureIndex;
      vertexData[vertexDataOffset + 42] = textureWidth;
      vertexData[vertexDataOffset + 43] = textureHeight;
      vertexData[vertexDataOffset + 44] = tintR;
      vertexData[vertexDataOffset + 45] = tintG;
      vertexData[vertexDataOffset + 46] = tintB;
      vertexData[vertexDataOffset + 47] = renderPart.opacity;
      vertexData[vertexDataOffset + 48] = renderPart.modelMatrix[0];
      vertexData[vertexDataOffset + 49] = renderPart.modelMatrix[1];
      vertexData[vertexDataOffset + 50] = 0;
      vertexData[vertexDataOffset + 51] = renderPart.modelMatrix[2];
      vertexData[vertexDataOffset + 52] = renderPart.modelMatrix[3];
      vertexData[vertexDataOffset + 53] = 0;
      vertexData[vertexDataOffset + 54] = renderPart.modelMatrix[4];
      vertexData[vertexDataOffset + 55] = renderPart.modelMatrix[5];
      vertexData[vertexDataOffset + 56] = 1;

      vertexData[vertexDataOffset + 57] = 0.5;
      vertexData[vertexDataOffset + 58] = 0.5;
      vertexData[vertexDataOffset + 59] = depth;
      vertexData[vertexDataOffset + 60] = textureIndex;
      vertexData[vertexDataOffset + 61] = textureWidth;
      vertexData[vertexDataOffset + 62] = textureHeight;
      vertexData[vertexDataOffset + 63] = tintR;
      vertexData[vertexDataOffset + 64] = tintG;
      vertexData[vertexDataOffset + 65] = tintB;
      vertexData[vertexDataOffset + 66] = renderPart.opacity;
      vertexData[vertexDataOffset + 67] = renderPart.modelMatrix[0];
      vertexData[vertexDataOffset + 68] = renderPart.modelMatrix[1];
      vertexData[vertexDataOffset + 69] = 0;
      vertexData[vertexDataOffset + 70] = renderPart.modelMatrix[2];
      vertexData[vertexDataOffset + 71] = renderPart.modelMatrix[3];
      vertexData[vertexDataOffset + 72] = 0;
      vertexData[vertexDataOffset + 73] = renderPart.modelMatrix[4];
      vertexData[vertexDataOffset + 74] = renderPart.modelMatrix[5];
      vertexData[vertexDataOffset + 75] = 1;

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

function clearRenderPartInVertexData(vertexData: Float32Array, renderPartIdx: number): void {
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
   vertexData[vertexDataOffset + 68] = 0;
   vertexData[vertexDataOffset + 69] = 0;
   vertexData[vertexDataOffset + 70] = 0;
   vertexData[vertexDataOffset + 71] = 0;
   vertexData[vertexDataOffset + 72] = 0;
   vertexData[vertexDataOffset + 73] = 0;
   vertexData[vertexDataOffset + 74] = 0;
   vertexData[vertexDataOffset + 75] = 0;
}

export function clearEntityInVertexData(renderInfo: EntityRenderInfo, vertexData: Float32Array, renderPartIdx: number): void {
   for (const renderPart of renderInfo.renderPartsByZIndex) {
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
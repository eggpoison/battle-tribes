import { createWebGLProgram, gl } from "../../webgl";
import { getEntityTextureAtlas } from "../../texture-atlases/texture-atlases";
import { bindUBOToProgram, getEntityTextureAtlasUBO, UBOBindingIndex } from "../ubos";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { VisualRenderPart, renderPartIsTextured, thingIsVisualRenderPart } from "../../render-parts/render-parts";

const enum Vars {
   ATTRIBUTES_PER_VERTEX = 16
}

export const enum EntityRenderingVars {
   ATTRIBUTES_PER_VERTEX = Vars.ATTRIBUTES_PER_VERTEX
}

export interface EntityRenderingOptions {
   readonly overrideAlphaWithOne?: boolean;
}

export interface EntityRenderData {
   readonly vao: WebGLVertexArrayObject;
   readonly vertexBuffer: WebGLBuffer;
   readonly vertexData: Float32Array;
   readonly indexBuffer: WebGLBuffer;
}

let program: WebGLProgram;
let overrideAlphaWithOneUniformLocation: WebGLUniformLocation;

let previousOverrideAlphaWithOne = false;

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
   layout(location = 6) in vec2 a_modelMatrix_col0;
   layout(location = 7) in vec2 a_modelMatrix_col1;
   layout(location = 8) in vec2 a_modelMatrix_col2;
   
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

      mat3 modelMatrix = mat3(
         a_modelMatrix_col0.x, a_modelMatrix_col0.y, 0.0,
         a_modelMatrix_col1.x, a_modelMatrix_col1.y, 0.0,
         a_modelMatrix_col2.x, a_modelMatrix_col2.y, 1.0
      );

      vec2 worldPos = (modelMatrix * vec3(a_position * textureSize * 4.0, 1.0)).xy;

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

         float textureX = clamp(floor(v_texCoord.x * v_textureSize.x), 0.0, v_textureSize.x - 1.0);
         float textureY = clamp(floor(v_texCoord.y * v_textureSize.y), 0.0, v_textureSize.y - 1.0);
         
         float x = textureXOffset + textureX;
         float y = textureYOffset + textureY;
         float u = (x + 0.5) / atlasPixelSize;
         float v = (y + 0.5) / atlasPixelSize;

         outputColour = texture(u_textureAtlas, vec2(u, v));
      
         outputColour.rgb = mix(outputColour.rgb, step(vec3(0.0), v_tint), abs(v_tint));
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
   gl.uniform1f(overrideAlphaWithOneUniformLocation, previousOverrideAlphaWithOne ? 1 : 0);

   gl.bindVertexArray(null);
}

export function createEntityRenderData(maxRenderParts: number): EntityRenderData {
   // The Uint16 index buffer puts a cap on maxRenderParts before the indices wrap around silently, a limit of 65535 / 4
   if (maxRenderParts >= 16383) {
      throw new Error();
   }
   
   const vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);
   
   const vertexData = new Float32Array(maxRenderParts * 4 * EntityRenderingVars.ATTRIBUTES_PER_VERTEX);

   const vertexBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);

   const TOTAL_BYTES = EntityRenderingVars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT;
   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, TOTAL_BYTES, 0); // floatOffset=0
   gl.vertexAttribPointer(1, 1, gl.FLOAT, false, TOTAL_BYTES, 8); // floatOffset=2
   gl.vertexAttribPointer(2, 1, gl.FLOAT, false, TOTAL_BYTES, 12); // floatOffset=3
   gl.vertexAttribPointer(3, 2, gl.FLOAT, false, TOTAL_BYTES, 16); // floatOffset=4
   gl.vertexAttribPointer(4, 3, gl.FLOAT, false, TOTAL_BYTES, 24); // floatOffset=6
   gl.vertexAttribPointer(5, 1, gl.FLOAT, false, TOTAL_BYTES, 36); // floatOffset=9

   gl.vertexAttribPointer(6, 2, gl.FLOAT, false, TOTAL_BYTES, 40); // floatOffset=10
   gl.vertexAttribPointer(7, 2, gl.FLOAT, false, TOTAL_BYTES, 48); // floatOffset=12
   gl.vertexAttribPointer(8, 2, gl.FLOAT, false, TOTAL_BYTES, 56); // floatOffset=14
   
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);
   gl.enableVertexAttribArray(3);
   gl.enableVertexAttribArray(4);
   gl.enableVertexAttribArray(5);

   gl.enableVertexAttribArray(6);
   gl.enableVertexAttribArray(7);
   gl.enableVertexAttribArray(8);

   const indicesData = new Uint16Array(maxRenderParts * 6);
   for (let i = 0; i < maxRenderParts; i++) {
      const dataOffset = i * 6;
      const indexOffset = i * 4;
      
      indicesData[dataOffset] = indexOffset;
      indicesData[dataOffset + 1] = indexOffset + 1;
      indicesData[dataOffset + 2] = indexOffset + 2;
      indicesData[dataOffset + 3] = indexOffset + 2;
      indicesData[dataOffset + 4] = indexOffset + 1;
      indicesData[dataOffset + 5] = indexOffset + 3;
   }

   const indexBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
   gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesData, gl.STATIC_DRAW);

   gl.bindVertexArray(null);

   return {
      vao: vao,
      vertexBuffer: vertexBuffer,
      vertexData: vertexData,
      indexBuffer: indexBuffer
   };
}

export function calculateRenderPartDepth(renderPart: VisualRenderPart, renderInfo: EntityRenderInfo): number {
   return renderInfo.renderHeight + renderPart.zIndex * 0.0001;
}

export function setRenderInfoInVertexData(renderInfo: EntityRenderInfo, vertexData: Float32Array, renderPartIdx: number): number {
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
      let tintR: number;
      let tintG: number;
      let tintB: number;
      if (renderPartIsTextured(renderPart)) {
         const textureArrayIndex = renderPart.textureArrayIndex;
         textureIndex = textureAtlas.textureSlotIndexes[textureArrayIndex];
         textureWidth = textureAtlas.textureWidths[textureArrayIndex];
         textureHeight = textureAtlas.textureHeights[textureArrayIndex];
         tintR = baseTintR + renderPart.tintR;
         tintG = baseTintG + renderPart.tintG;
         tintB = baseTintB + renderPart.tintB;
      } else {
         textureIndex = -1;
         textureWidth = -1;
         textureHeight = -1;
         tintR = renderPart.colour.r;
         tintG = renderPart.colour.g;
         tintB = renderPart.colour.b;
      }

      const vertexDataOffset = renderPartIdx * 4 * Vars.ATTRIBUTES_PER_VERTEX;

      const mm0 = renderPart.modelMatrix[0];
      const mm1 = renderPart.modelMatrix[1];
      const mm2 = renderPart.modelMatrix[2];
      const mm3 = renderPart.modelMatrix[3];
      const mm4 = renderPart.modelMatrix[4];
      const mm5 = renderPart.modelMatrix[5];

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
      vertexData[vertexDataOffset + 10] = mm0;
      vertexData[vertexDataOffset + 11] = mm1;
      vertexData[vertexDataOffset + 12] = mm2;
      vertexData[vertexDataOffset + 13] = mm3;
      vertexData[vertexDataOffset + 14] = mm4;
      vertexData[vertexDataOffset + 15] = mm5;

      vertexData[vertexDataOffset + 16] = 0.5;
      vertexData[vertexDataOffset + 17] = -0.5;
      vertexData[vertexDataOffset + 18] = depth;
      vertexData[vertexDataOffset + 19] = textureIndex;
      vertexData[vertexDataOffset + 20] = textureWidth;
      vertexData[vertexDataOffset + 21] = textureHeight;
      vertexData[vertexDataOffset + 22] = tintR;
      vertexData[vertexDataOffset + 23] = tintG;
      vertexData[vertexDataOffset + 24] = tintB;
      vertexData[vertexDataOffset + 25] = renderPart.opacity;
      vertexData[vertexDataOffset + 26] = mm0;
      vertexData[vertexDataOffset + 27] = mm1;
      vertexData[vertexDataOffset + 28] = mm2;
      vertexData[vertexDataOffset + 29] = mm3;
      vertexData[vertexDataOffset + 30] = mm4;
      vertexData[vertexDataOffset + 31] = mm5;

      vertexData[vertexDataOffset + 32] = -0.5;
      vertexData[vertexDataOffset + 33] = 0.5;
      vertexData[vertexDataOffset + 34] = depth;
      vertexData[vertexDataOffset + 35] = textureIndex;
      vertexData[vertexDataOffset + 36] = textureWidth;
      vertexData[vertexDataOffset + 37] = textureHeight;
      vertexData[vertexDataOffset + 38] = tintR;
      vertexData[vertexDataOffset + 39] = tintG;
      vertexData[vertexDataOffset + 40] = tintB;
      vertexData[vertexDataOffset + 41] = renderPart.opacity;
      vertexData[vertexDataOffset + 42] = mm0;
      vertexData[vertexDataOffset + 43] = mm1;
      vertexData[vertexDataOffset + 44] = mm2;
      vertexData[vertexDataOffset + 45] = mm3;
      vertexData[vertexDataOffset + 46] = mm4;
      vertexData[vertexDataOffset + 47] = mm5;

      vertexData[vertexDataOffset + 48] = 0.5;
      vertexData[vertexDataOffset + 49] = 0.5;
      vertexData[vertexDataOffset + 50] = depth;
      vertexData[vertexDataOffset + 51] = textureIndex;
      vertexData[vertexDataOffset + 52] = textureWidth;
      vertexData[vertexDataOffset + 53] = textureHeight;
      vertexData[vertexDataOffset + 54] = tintR;
      vertexData[vertexDataOffset + 55] = tintG;
      vertexData[vertexDataOffset + 56] = tintB;
      vertexData[vertexDataOffset + 57] = renderPart.opacity;
      vertexData[vertexDataOffset + 58] = mm0;
      vertexData[vertexDataOffset + 59] = mm1;
      vertexData[vertexDataOffset + 60] = mm2;
      vertexData[vertexDataOffset + 61] = mm3;
      vertexData[vertexDataOffset + 62] = mm4;
      vertexData[vertexDataOffset + 63] = mm5;

      renderPartIdx++;
   }

   return renderPartIdx;
}

function clearRenderPartInVertexData(vertexData: Float32Array, renderPartIdx: number): void {
   const vertexDataOffset = renderPartIdx * 4 * Vars.ATTRIBUTES_PER_VERTEX;
   for (let i = vertexDataOffset; i < vertexDataOffset + 4 * Vars.ATTRIBUTES_PER_VERTEX; i++) {
      vertexData[i] = 0;
   }
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
   const overrideAlphaWithOne = options?.overrideAlphaWithOne || false;
   if (overrideAlphaWithOne !== previousOverrideAlphaWithOne) {
      previousOverrideAlphaWithOne = overrideAlphaWithOne;
      gl.uniform1f(overrideAlphaWithOneUniformLocation, overrideAlphaWithOne ? 1 : 0);
   }

   const numRenderParts = renderInfo.renderPartsByZIndex.length;
   
   gl.bindVertexArray(renderInfo.vao);
   gl.drawElements(gl.TRIANGLES, numRenderParts * 6, gl.UNSIGNED_SHORT, 0);
}

export function cleanupEntityRendering(): void {
   gl.bindVertexArray(null);
}
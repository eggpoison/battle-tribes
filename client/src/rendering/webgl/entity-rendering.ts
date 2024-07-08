import { createWebGLProgram, gl } from "../../webgl";
import Board from "../../Board";
import RenderPart from "../../render-parts/RenderPart";
import { getEntityTextureAtlas } from "../../texture-atlases/texture-atlases";
import { bindUBOToProgram, ENTITY_TEXTURE_ATLAS_UBO, UBOBindingIndex } from "../ubos";
import Entity from "../../Entity";
import { EntityType } from "webgl-test-shared/dist/entities";

const enum Vars {
   ATTRIBUTES_PER_VERTEX = 17
}

let program: WebGLProgram;
let vao: WebGLVertexArrayObject;
let buffer: WebGLBuffer;
let indexBuffer: WebGLBuffer;

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
      int textureArrayIndex = int(a_textureArrayIndex);
      float textureIndex = u_textureSlotIndexes[textureArrayIndex];
      vec2 textureSize = u_textureSizes[textureArrayIndex];

      vec2 worldPos = (a_modelMatrix * vec3(a_position * textureSize * 4.0, 1.0)).xy;

      vec2 screenPos = (worldPos - u_playerPos) * u_zoom + u_halfWindowSize;
      // vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
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
}

export function calculateRenderPartDepth(renderPart: RenderPart, entity: Entity): number {
   return entity.renderDepth - renderPart.zIndex * 0.0001;
}

export function calculateEntityVertices(entity: Entity): Float32Array {
   const vertexData = new Float32Array(6 * Vars.ATTRIBUTES_PER_VERTEX * entity.allRenderParts.length);
   
   for (let i = 0; i < entity.allRenderParts.length; i++) {
      const renderPart = entity.allRenderParts[i];
      const depth = calculateRenderPartDepth(renderPart, entity);

      const vertexDataOffset = i * 6 * Vars.ATTRIBUTES_PER_VERTEX;

      const tintR = entity.tintR + renderPart.tintR;
      const tintG = entity.tintG + renderPart.tintG;
      const tintB = entity.tintB + renderPart.tintB;

      vertexData[vertexDataOffset] = -0.5;
      vertexData[vertexDataOffset + 1] = -0.5;
      vertexData[vertexDataOffset + 2] = depth;
      vertexData[vertexDataOffset + 3] = renderPart.textureArrayIndex;
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
      vertexData[vertexDataOffset + 20] = renderPart.textureArrayIndex;
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
      vertexData[vertexDataOffset + 37] = renderPart.textureArrayIndex;
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

      vertexData[vertexDataOffset + 51] = -0.5;
      vertexData[vertexDataOffset + 52] = 0.5;
      vertexData[vertexDataOffset + 53] = depth;
      vertexData[vertexDataOffset + 54] = renderPart.textureArrayIndex;
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

      vertexData[vertexDataOffset + 68] = 0.5;
      vertexData[vertexDataOffset + 69] = -0.5;
      vertexData[vertexDataOffset + 70] = depth;
      vertexData[vertexDataOffset + 71] = renderPart.textureArrayIndex;
      vertexData[vertexDataOffset + 72] = tintR;
      vertexData[vertexDataOffset + 73] = tintG;
      vertexData[vertexDataOffset + 74] = tintB;
      vertexData[vertexDataOffset + 75] = renderPart.opacity;
      vertexData[vertexDataOffset + 76] = renderPart.modelMatrix[0];
      vertexData[vertexDataOffset + 77] = renderPart.modelMatrix[1];
      vertexData[vertexDataOffset + 78] = renderPart.modelMatrix[2];
      vertexData[vertexDataOffset + 79] = renderPart.modelMatrix[3];
      vertexData[vertexDataOffset + 80] = renderPart.modelMatrix[4];
      vertexData[vertexDataOffset + 81] = renderPart.modelMatrix[5];
      vertexData[vertexDataOffset + 82] = renderPart.modelMatrix[6];
      vertexData[vertexDataOffset + 83] = renderPart.modelMatrix[7];
      vertexData[vertexDataOffset + 84] = renderPart.modelMatrix[8];

      vertexData[vertexDataOffset + 85] = 0.5;
      vertexData[vertexDataOffset + 86] = 0.5;
      vertexData[vertexDataOffset + 87] = depth;
      vertexData[vertexDataOffset + 88] = renderPart.textureArrayIndex;
      vertexData[vertexDataOffset + 89] = tintR;
      vertexData[vertexDataOffset + 90] = tintG;
      vertexData[vertexDataOffset + 91] = tintB;
      vertexData[vertexDataOffset + 92] = renderPart.opacity;
      vertexData[vertexDataOffset + 93] = renderPart.modelMatrix[0];
      vertexData[vertexDataOffset + 94] = renderPart.modelMatrix[1];
      vertexData[vertexDataOffset + 95] = renderPart.modelMatrix[2];
      vertexData[vertexDataOffset + 96] = renderPart.modelMatrix[3];
      vertexData[vertexDataOffset + 97] = renderPart.modelMatrix[4];
      vertexData[vertexDataOffset + 98] = renderPart.modelMatrix[5];
      vertexData[vertexDataOffset + 99] = renderPart.modelMatrix[6];
      vertexData[vertexDataOffset + 100] = renderPart.modelMatrix[7];
      vertexData[vertexDataOffset + 101] = renderPart.modelMatrix[8];
   }
   if (entity.type === EntityType.player) {
      // console.log(vertexData.length / Vars.ATTRIBUTES_PER_VERTEX);
   }

   return vertexData;
}

export function renderGameObjects(frameProgress: number): void {
   if (Board.sortedEntities.length === 0) return;

   const numRenderParts = Board.numVisibleRenderParts - Board.fish.length;
   const textureAtlas = getEntityTextureAtlas();
   
   const vertexData = new Float32Array(numRenderParts * 4 * Vars.ATTRIBUTES_PER_VERTEX);
   const indicesData = new Uint16Array(numRenderParts * 6);
   
   let i = 0;
   for (const entity of Board.sortedEntities) {
      // @Hack: shouldn't be done here
      entity.updateRenderPosition(frameProgress);

      // Calculate render info for all render parts
      // Update render parts from parent -> child
      const remainingRenderParts: Array<RenderPart> = [];
      for (const child of entity.children) {
         remainingRenderParts.push(child);
      }
      while (remainingRenderParts.length > 0) {
         const renderObject = remainingRenderParts[0];
         renderObject.update();

         for (const child of renderObject.children) {
            remainingRenderParts.push(child);
         }

         remainingRenderParts.splice(0, 1);
      }

      for (const renderPart of entity.allRenderParts) {
         const depth = calculateRenderPartDepth(renderPart, entity);

         const vertexDataOffset = i * 4 * Vars.ATTRIBUTES_PER_VERTEX;

         const tintR = entity.tintR + renderPart.tintR;
         const tintG = entity.tintG + renderPart.tintG;
         const tintB = entity.tintB + renderPart.tintB;

         vertexData[vertexDataOffset] = -0.5;
         vertexData[vertexDataOffset + 1] = -0.5;
         vertexData[vertexDataOffset + 2] = depth;
         vertexData[vertexDataOffset + 3] = renderPart.textureArrayIndex;
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
         vertexData[vertexDataOffset + 20] = renderPart.textureArrayIndex;
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
         vertexData[vertexDataOffset + 37] = renderPart.textureArrayIndex;
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
         vertexData[vertexDataOffset + 54] = renderPart.textureArrayIndex;
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

         const indicesDataOffset = i * 6;

         indicesData[indicesDataOffset] = i * 4;
         indicesData[indicesDataOffset + 1] = i * 4 + 1;
         indicesData[indicesDataOffset + 2] = i * 4 + 2;
         indicesData[indicesDataOffset + 3] = i * 4 + 2;
         indicesData[indicesDataOffset + 4] = i * 4 + 1;
         indicesData[indicesDataOffset + 5] = i * 4 + 3;

         i++;
      }
   }

   if (i !== numRenderParts) {
      throw new Error("Detected missing or extra render parts!");
   }

   gl.useProgram(program);

   gl.enable(gl.DEPTH_TEST);
   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
   gl.depthMask(true);

   // Bind texture atlas
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, textureAtlas.texture);

   gl.bindVertexArray(vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
   gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesData, gl.STATIC_DRAW);
   
   gl.drawElements(gl.TRIANGLES, numRenderParts * 6, gl.UNSIGNED_SHORT, 0);

   gl.disable(gl.DEPTH_TEST);
   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
   gl.depthMask(false);

   gl.bindVertexArray(null);
}

export function renderEntity(vertexData: Float32Array): void {
   const textureAtlas = getEntityTextureAtlas();

   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   // Bind texture atlas
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, textureAtlas.texture);

   gl.bindVertexArray(vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
   
   gl.drawArrays(gl.TRIANGLES, 0, vertexData.length / Vars.ATTRIBUTES_PER_VERTEX);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);

   gl.bindVertexArray(null);
}
import { createWebGLProgram, gl } from "../../webgl";
import { getEntityTextureAtlas } from "../../texture-atlases/texture-atlases";
import { bindUBOToProgram, ENTITY_TEXTURE_ATLAS_UBO, UBOBindingIndex } from "../ubos";
import Entity from "../../Entity";
import { RenderPart, renderPartIsTextured } from "../../render-parts/render-parts";

const enum Vars {
   ATTRIBUTES_PER_VERTEX = 17
}

let program: WebGLProgram;
let vao: WebGLVertexArrayObject;
let buffer: WebGLBuffer;
let indexBuffer: WebGLBuffer;

let vertexBuffer: WebGLBuffer;

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
}

export function calculateRenderPartDepth(renderPart: RenderPart, entity: Entity): number {
   return entity.renderDepth - renderPart.zIndex * 0.0001;
}

export function renderEntities(entities: ReadonlyArray<Entity>): void {
   let numRenderParts = 0;
   for (const entity of entities) {
      numRenderParts += entity.allRenderParts.length;
   }
   
   const depthData = new Float32Array(numRenderParts);
   const textureArrayIndexData = new Float32Array(numRenderParts);
   const tintData = new Float32Array(3 * numRenderParts);
   const opacityData = new Float32Array(numRenderParts);
   const modelMatrixData = new Float32Array(9 * numRenderParts);
   
   let idx = 0;
   for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];

      for (let j = 0; j < entity.allRenderParts.length; j++) {
         const renderPart = entity.allRenderParts[j];
         const depth = calculateRenderPartDepth(renderPart, entity);
   
         const textureArrayIndex = renderPartIsTextured(renderPart) ? renderPart.textureArrayIndex : -1;
   
         let tintR = entity.tintR + renderPart.tintR;
         let tintG = entity.tintG + renderPart.tintG;
         let tintB = entity.tintB + renderPart.tintB;
         if (!renderPartIsTextured(renderPart)) {
            tintR = renderPart.colour.r;
            tintG = renderPart.colour.g;
            tintB = renderPart.colour.b;
         }
   
         depthData[idx] = depth;
   
         textureArrayIndexData[idx] = textureArrayIndex;
   
         tintData[idx * 3] = tintR;
         tintData[idx * 3 + 1] = tintG;
         tintData[idx * 3 + 2] = tintB;
   
         opacityData[idx] = renderPart.opacity;
   
         modelMatrixData[idx * 9] = renderPart.modelMatrix[0];
         modelMatrixData[idx * 9 + 1] = renderPart.modelMatrix[1];
         modelMatrixData[idx * 9 + 2] = renderPart.modelMatrix[2];
         modelMatrixData[idx * 9 + 3] = renderPart.modelMatrix[3];
         modelMatrixData[idx * 9 + 4] = renderPart.modelMatrix[4];
         modelMatrixData[idx * 9 + 5] = renderPart.modelMatrix[5];
         modelMatrixData[idx * 9 + 6] = renderPart.modelMatrix[6];
         modelMatrixData[idx * 9 + 7] = renderPart.modelMatrix[7];
         modelMatrixData[idx * 9 + 8] = renderPart.modelMatrix[8];

         idx++;
      }
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
   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(0);

   const depthBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, depthBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, depthData, gl.STATIC_DRAW);
   gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(1);
   gl.vertexAttribDivisor(1, 1);

   const textureArrayIndexBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, textureArrayIndexBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, textureArrayIndexData, gl.STATIC_DRAW);
   gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(2);
   gl.vertexAttribDivisor(2, 1);

   const tintBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, tintBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, tintData, gl.STATIC_DRAW);
   gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(3);
   gl.vertexAttribDivisor(3, 1);

   const opacityBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, opacityBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, opacityData, gl.STATIC_DRAW);
   gl.vertexAttribPointer(4, 1, gl.FLOAT, false, 0, 0);
   gl.enableVertexAttribArray(4);
   gl.vertexAttribDivisor(4, 1);

   const modelMatrixBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, modelMatrixBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, modelMatrixData, gl.STATIC_DRAW);
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
import { getSubtileX, getSubtileY, Settings } from "webgl-test-shared";
import { minVisibleX, maxVisibleX, minVisibleY, maxVisibleY } from "../../camera";
import Layer from "../../Layer";
import { createWebGLProgram, gl, createTextureArray } from "../../webgl";
import { bindUBOToProgram, UBOBindingIndex } from "../ubos";

// @Memory
export const BREAK_PROGRESS_TEXTURE_SOURCES: ReadonlyArray<string> = [
   "miscellaneous/tile-break-progress-1.png",
   "miscellaneous/tile-break-progress-2.png"
];

let program: WebGLProgram;
// @Incomplete
let vao: WebGLVertexArrayObject;

let textureArray: WebGLTexture;

export function createTileBreakProgressShaders(): void {
   const vertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in vec2 a_texCoord;
   layout(location = 2) in float a_textureIndex;
   
   out vec2 v_texCoord;
   out float v_textureIndex;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);
   
      v_texCoord = a_texCoord;
      v_textureIndex = a_textureIndex;
   }
   `;
   
   const fragmentShaderText = `#version 300 es
   precision highp float;
   
   uniform highp sampler2DArray u_sampler;
   
   in vec2 v_texCoord;
   in float v_textureIndex;
   
   out vec4 outputColour;
   
   void main() {
      outputColour = texture(u_sampler, vec3(v_texCoord, v_textureIndex));
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   bindUBOToProgram(gl, program, UBOBindingIndex.CAMERA);

   gl.useProgram(program);
   
   const samplerUniformLocation = gl.getUniformLocation(program, "u_sampler")!;
   gl.uniform1i(samplerUniformLocation, 0);

   // Create texture array
   textureArray = createTextureArray(BREAK_PROGRESS_TEXTURE_SOURCES, 4, 4, 3);
}

export function renderTileBreakProgress(layer: Layer): void {
   const minSubtileX = Math.max(Math.floor(minVisibleX / Settings.SUBTILE_SIZE), -Settings.EDGE_GENERATION_DISTANCE * 4);
   const maxSubtileX = Math.min(Math.floor(maxVisibleX / Settings.SUBTILE_SIZE), (Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) * 4);
   const minSubtileY = Math.max(Math.floor(minVisibleY / Settings.SUBTILE_SIZE), -Settings.EDGE_GENERATION_DISTANCE * 4);
   const maxSubtileY = Math.min(Math.floor(maxVisibleY / Settings.SUBTILE_SIZE), (Settings.WORLD_SIZE_TILES + Settings.EDGE_GENERATION_DISTANCE) * 4);

   gl.useProgram(program);

   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D_ARRAY, textureArray);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   // @Speed
   const vertices = new Array<number>();
   for (const pair of layer.wallSubtileDamageTakenMap) {
      const subtileIndex = pair[0];
      const damageTaken = pair[0];

      const subtileX = getSubtileX(subtileIndex);
      const subtileY = getSubtileY(subtileIndex);

      const x1 = subtileX * Settings.SUBTILE_SIZE;
      const x2 = x1 + Settings.SUBTILE_SIZE;
      const y1 = subtileY * Settings.SUBTILE_SIZE;
      const y2 = y1 + Settings.SUBTILE_SIZE;

      if (x2 >= minVisibleX || x1 <= maxVisibleX || y2 >= minVisibleY || y1 <= maxVisibleY) {
         const textureIdx = damageTaken - 1;
      
         vertices.push(x1);
         vertices.push(y1);
         vertices.push(0);
         vertices.push(0);
         vertices.push(textureIdx);
         
         vertices.push(x2);
         vertices.push(y1);
         vertices.push(1);
         vertices.push(0);
         vertices.push(textureIdx);
         
         vertices.push(x1);
         vertices.push(y2);
         vertices.push(0);
         vertices.push(1);
         vertices.push(textureIdx);
         
         vertices.push(x1);
         vertices.push(y2);
         vertices.push(0);
         vertices.push(1);
         vertices.push(textureIdx);
         
         vertices.push(x2);
         vertices.push(y1);
         vertices.push(1);
         vertices.push(0);
         vertices.push(textureIdx);
         
         vertices.push(x2);
         vertices.push(y2);
         vertices.push(1);
         vertices.push(1);
         vertices.push(textureIdx);
      }
   }

   const vertexData = new Float32Array(vertices);

   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
   
   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);

   gl.drawArrays(gl.TRIANGLES, 0, vertexData.length / 5);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}
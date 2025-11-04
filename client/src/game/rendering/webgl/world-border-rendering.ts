import { Settings } from "battletribes-shared/settings";
import { createWebGLProgram, gl } from "../../webgl";
import { bindUBOToProgram, UBOBindingIndex } from "../ubos";
import { minVisibleChunkX, maxVisibleChunkX, minVisibleChunkY, maxVisibleChunkY } from "../../camera";

let program: WebGLProgram;
let buffer: WebGLBuffer;

export function createWorldBorderShaders(): void {
   const vertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   
   out vec2 v_position;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);
   
      v_position = a_position;
   }`;
   
   const fragmentShaderText = `#version 300 es
   precision mediump float;
   
   #define RANGE 200.0
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   in vec2 v_position;
   
   out vec4 outputColour;
   
   float roundPixel(float num) {
      return ceil(num / 4.0) * 4.0;
   }
   
   void main() {
      float x = roundPixel(v_position.x);
      float y = roundPixel(v_position.y);
   
      float dist = distance(vec2(x, y), u_playerPos);
      // Subtract the radius of the player so the wall is fully opaque when they hit it
      dist -= 32.0;
   
      if (dist < RANGE) {
         float distMultiplier = 1.0 - dist / RANGE;
         distMultiplier = pow(distMultiplier, 0.35);

         float progress = 1.0 - dist / RANGE;
         progress = mix(0.7, 1.0, progress);
         outputColour = vec4(61.0/255.0 * progress, 215.0/255.0 * progress, 255.0/255.0 * progress, distMultiplier);
      } else {
         outputColour = vec4(0.0, 0.0, 0.0, 0.0);
      }
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   bindUBOToProgram(gl, program, UBOBindingIndex.CAMERA);

   buffer = gl.createBuffer()!;
}

export function renderWorldBorder(): void {
   const BORDER_WIDTH = 16;

   const minChunkXPos = minVisibleChunkX * Settings.CHUNK_UNITS;
   const maxChunkXPos = (maxVisibleChunkX + 1) * Settings.CHUNK_UNITS;
   const minChunkYPos = minVisibleChunkY * Settings.CHUNK_UNITS;
   const maxChunkYPos = (maxVisibleChunkY + 1) * Settings.CHUNK_UNITS;

   const leftBorderIsVisible = minVisibleChunkX === 0;
   const rightBorderIsVisible = maxVisibleChunkX === Settings.WORLD_SIZE_CHUNKS - 1;
   const bottomBorderIsVisible = minVisibleChunkY === 0;
   const topBorderIsVisible = maxVisibleChunkY === Settings.WORLD_SIZE_CHUNKS - 1;

   let numVisibleBorders = 0;
   if (leftBorderIsVisible) {
      numVisibleBorders++;
   }
   if (rightBorderIsVisible) {
      numVisibleBorders++;
   }
   if (bottomBorderIsVisible) {
      numVisibleBorders++;
   }
   if (topBorderIsVisible) {
      numVisibleBorders++;
   }

   if (numVisibleBorders === 0) {
      return;
   }

   const vertexData = new Float32Array(numVisibleBorders * 6 * 2);

   // Left border
   if (leftBorderIsVisible) {
      const x1 = -BORDER_WIDTH;
      const x2 = 0;
      const y1 = minChunkYPos - BORDER_WIDTH;
      const y2 = maxChunkYPos + BORDER_WIDTH;

      vertexData[0] = x1;
      vertexData[1] = y1;
      vertexData[2] = x2;
      vertexData[3] = y1;
      vertexData[4] = x2;
      vertexData[5] = y2;
      vertexData[6] = x1;
      vertexData[7] = y1;
      vertexData[8] = x2;
      vertexData[9] = y2;
      vertexData[10] = x1;
      vertexData[11] = y2;
   }

   // Right border
   if (rightBorderIsVisible) {
      const x1 = maxChunkXPos;
      const x2 = maxChunkXPos + BORDER_WIDTH;
      const y1 = minChunkYPos - BORDER_WIDTH;
      const y2 = maxChunkYPos + BORDER_WIDTH;

      const arrayOffset = leftBorderIsVisible ? 12 : 0;

      vertexData[arrayOffset] = x1;
      vertexData[arrayOffset + 1] = y1;
      vertexData[arrayOffset + 2] = x2;
      vertexData[arrayOffset + 3] = y1;
      vertexData[arrayOffset + 4] = x2;
      vertexData[arrayOffset + 5] = y2;
      vertexData[arrayOffset + 6] = x1;
      vertexData[arrayOffset + 7] = y1;
      vertexData[arrayOffset + 8] = x2;
      vertexData[arrayOffset + 9] = y2;
      vertexData[arrayOffset + 10] = x1;
      vertexData[arrayOffset + 11] = y2;
   }

   // Bottom border
   if (bottomBorderIsVisible) {
      const x1 = minChunkXPos - BORDER_WIDTH;
      const x2 = maxChunkXPos + BORDER_WIDTH;
      const y1 = -BORDER_WIDTH;
      const y2 = 0;

      let arrayOffset = 0;
      if (leftBorderIsVisible) {
         arrayOffset += 12;
      }
      if (rightBorderIsVisible) {
         arrayOffset += 12;
      }

      vertexData[arrayOffset] = x1;
      vertexData[arrayOffset + 1] = y1;
      vertexData[arrayOffset + 2] = x2;
      vertexData[arrayOffset + 3] = y1;
      vertexData[arrayOffset + 4] = x2;
      vertexData[arrayOffset + 5] = y2;
      vertexData[arrayOffset + 6] = x1;
      vertexData[arrayOffset + 7] = y1;
      vertexData[arrayOffset + 8] = x2;
      vertexData[arrayOffset + 9] = y2;
      vertexData[arrayOffset + 10] = x1;
      vertexData[arrayOffset + 11] = y2;
   }

   // Top border
   if (topBorderIsVisible) {
      const x1 = minChunkXPos - BORDER_WIDTH;
      const x2 = maxChunkXPos + BORDER_WIDTH;
      const y1 = maxChunkYPos;
      const y2 = maxChunkYPos + BORDER_WIDTH;

      let arrayOffset = 0;
      if (leftBorderIsVisible) {
         arrayOffset += 12;
      }
      if (rightBorderIsVisible) {
         arrayOffset += 12;
      }
      if (bottomBorderIsVisible) {
         arrayOffset += 12;
      }

      vertexData[arrayOffset] = x1;
      vertexData[arrayOffset + 1] = y1;
      vertexData[arrayOffset + 2] = x2;
      vertexData[arrayOffset + 3] = y1;
      vertexData[arrayOffset + 4] = x2;
      vertexData[arrayOffset + 5] = y2;
      vertexData[arrayOffset + 6] = x1;
      vertexData[arrayOffset + 7] = y1;
      vertexData[arrayOffset + 8] = x2;
      vertexData[arrayOffset + 9] = y2;
      vertexData[arrayOffset + 10] = x1;
      vertexData[arrayOffset + 11] = y2;
   }

   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);

   // Enable the attributes
   gl.enableVertexAttribArray(0);

   gl.drawArrays(gl.TRIANGLES, 0, numVisibleBorders * 6);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}
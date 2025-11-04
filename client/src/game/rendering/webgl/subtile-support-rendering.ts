import { createWebGLProgram, gl } from "../../webgl";
import { bindUBOToProgram, UBOBindingIndex } from "../ubos";
import { getSubtileX } from "../../Layer";
import { getSubtileY } from "../../../../../shared/src/subtiles";
import { Settings } from "../../../../../shared/src/settings";

export interface SubtileSupportInfo {
   readonly subtileIndex: number;
   readonly support: number;
}

const NODE_THICKNESS = 3;
const NODE_RADIUS = 8;
const NODE_CIRCLE_VERTEX_COUNT = 10;

let nodeProgram: WebGLProgram;

let visibleSubtileSupports: ReadonlyArray<SubtileSupportInfo> = [];

export function setVisibleSubtileSupports(newVisibleSubtileSupports: ReadonlyArray<SubtileSupportInfo>): void {
   visibleSubtileSupports = newVisibleSubtileSupports;
}

export function createSubtileSupportShaders(): void {
   const nodeVertexShaderText = `#version 300 es
   precision mediump float;
   precision mediump int;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in float a_support;

   out float v_support;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);

      v_support = a_support;
   }
   `;
   const nodeFragmentShaderText = `#version 300 es
   precision mediump float;
   
   in float v_support;
   
   out vec4 outputColour;
   
   void main() {
      float supportFrac = v_support / 100.0;
      outputColour = vec4(1.0 - supportFrac, supportFrac, 0.0, 1.0);
   }
   `;

   nodeProgram = createWebGLProgram(gl, nodeVertexShaderText, nodeFragmentShaderText);
   bindUBOToProgram(gl, nodeProgram, UBOBindingIndex.CAMERA);
}

export function renderSubtileSupports(): void {
   if (visibleSubtileSupports.length === 0) {
      return;
   }
   
   gl.useProgram(nodeProgram);

   // Calculate vertices
   let trigIdx = 0;
   const vertexData = new Float32Array(visibleSubtileSupports.length * NODE_CIRCLE_VERTEX_COUNT * 6 * 3);
   for (let i = 0; i < visibleSubtileSupports.length; i++) {
      const supportInfo = visibleSubtileSupports[i];

      const x = (getSubtileX(supportInfo.subtileIndex) + 0.5) * Settings.TILE_SIZE / 4;
      const y = (getSubtileY(supportInfo.subtileIndex) + 0.5) * Settings.TILE_SIZE / 4;
      
      const step = 2 * Math.PI / NODE_CIRCLE_VERTEX_COUNT;
   
      // Add the outer vertices
      for (let radians = 0, n = 0; n < NODE_CIRCLE_VERTEX_COUNT; radians += step, n++) {
         // @Speed: Garbage collection

         const sinRadians = Math.sin(radians);
         const cosRadians = Math.cos(radians);
         const sinNextRadians = Math.sin(radians + step);
         const cosNextRadians = Math.cos(radians + step);

         const blX = x + (NODE_RADIUS - NODE_THICKNESS) * sinRadians;
         const blY = y + (NODE_RADIUS - NODE_THICKNESS) * cosRadians;
         const brX = x + (NODE_RADIUS - NODE_THICKNESS) * sinNextRadians;
         const brY = y + (NODE_RADIUS - NODE_THICKNESS) * cosNextRadians;
         const tlX = x + (NODE_RADIUS) * sinRadians;
         const tlY = y + (NODE_RADIUS) * cosRadians;
         const trX = x + (NODE_RADIUS) * sinNextRadians;
         const trY = y + (NODE_RADIUS) * cosNextRadians;

         const vertexOffset = trigIdx * 6 * 3;
         trigIdx++;

         vertexData[vertexOffset] = blX;
         vertexData[vertexOffset + 1] = blY;
         vertexData[vertexOffset + 2] = supportInfo.support;

         vertexData[vertexOffset + 3] = brX;
         vertexData[vertexOffset + 4] = brY;
         vertexData[vertexOffset + 5] = supportInfo.support;

         vertexData[vertexOffset + 6] = tlX;
         vertexData[vertexOffset + 7] = tlY;
         vertexData[vertexOffset + 8] = supportInfo.support;

         vertexData[vertexOffset + 9] = tlX;
         vertexData[vertexOffset + 10] = tlY;
         vertexData[vertexOffset + 11] = supportInfo.support;

         vertexData[vertexOffset + 12] = brX;
         vertexData[vertexOffset + 13] = brY;
         vertexData[vertexOffset + 14] = supportInfo.support;

         vertexData[vertexOffset + 15] = trX;
         vertexData[vertexOffset + 16] = trY;
         vertexData[vertexOffset + 17] = supportInfo.support;
      }
   }

   const buffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);

   gl.drawArrays(gl.TRIANGLES, 0, trigIdx * 6);
}
import { getLightPositionMatrix, getLights } from "../../lights";
import { createWebGLProgram, gl } from "../../webgl";
import { bindUBOToProgram, UBOBindingIndex } from "../ubos";

let program: WebGLProgram;

export function createLightDebugShaders(): void {
   const vertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in mat3 a_modelMatrix;

   void main() {
      vec2 worldPos = (a_modelMatrix * vec3(a_position * 2.0, 1.0)).xy;
   
      vec2 screenPos = (worldPos - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);
   }
   `;
   
   const fragmentShaderText = `#version 300 es
   precision mediump float;
   
   in float v_colour;
   
   out vec4 outputColour;
   
   void main() {
      outputColour = vec4(1.0, 1.0, 1.0, 1.0);
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   bindUBOToProgram(gl, program, UBOBindingIndex.CAMERA);
}

export function renderLightingDebug(): void {
   const lights = getLights();

   const vertexData = new Float32Array(lights.length * 11 * 6);
   for (let i = 0; i < lights.length; i++) {
      const modelMatrix = getLightPositionMatrix(i);

      const dataOffset = i * 11 * 6;

      vertexData[dataOffset] = -1;
      vertexData[dataOffset + 1] = -1;
      vertexData[dataOffset + 2] = modelMatrix[0];
      vertexData[dataOffset + 3] = modelMatrix[1];
      vertexData[dataOffset + 4] = modelMatrix[2];
      vertexData[dataOffset + 5] = modelMatrix[3];
      vertexData[dataOffset + 6] = modelMatrix[4];
      vertexData[dataOffset + 7] = modelMatrix[5];
      vertexData[dataOffset + 8] = modelMatrix[6];
      vertexData[dataOffset + 9] = modelMatrix[7];
      vertexData[dataOffset + 10] = modelMatrix[8];

      vertexData[dataOffset + 11] = 1;
      vertexData[dataOffset + 12] = -1;
      vertexData[dataOffset + 13] = modelMatrix[0];
      vertexData[dataOffset + 14] = modelMatrix[1];
      vertexData[dataOffset + 15] = modelMatrix[2];
      vertexData[dataOffset + 16] = modelMatrix[3];
      vertexData[dataOffset + 17] = modelMatrix[4];
      vertexData[dataOffset + 18] = modelMatrix[5];
      vertexData[dataOffset + 19] = modelMatrix[6];
      vertexData[dataOffset + 20] = modelMatrix[7];
      vertexData[dataOffset + 21] = modelMatrix[8];

      vertexData[dataOffset + 22] = -1;
      vertexData[dataOffset + 23] = 1;
      vertexData[dataOffset + 24] = modelMatrix[0];
      vertexData[dataOffset + 25] = modelMatrix[1];
      vertexData[dataOffset + 26] = modelMatrix[2];
      vertexData[dataOffset + 27] = modelMatrix[3];
      vertexData[dataOffset + 28] = modelMatrix[4];
      vertexData[dataOffset + 29] = modelMatrix[5];
      vertexData[dataOffset + 30] = modelMatrix[6];
      vertexData[dataOffset + 31] = modelMatrix[7];
      vertexData[dataOffset + 32] = modelMatrix[8];

      vertexData[dataOffset + 33] = -1;
      vertexData[dataOffset + 34] = 1;
      vertexData[dataOffset + 35] = modelMatrix[0];
      vertexData[dataOffset + 36] = modelMatrix[1];
      vertexData[dataOffset + 37] = modelMatrix[2];
      vertexData[dataOffset + 38] = modelMatrix[3];
      vertexData[dataOffset + 39] = modelMatrix[4];
      vertexData[dataOffset + 40] = modelMatrix[5];
      vertexData[dataOffset + 41] = modelMatrix[6];
      vertexData[dataOffset + 42] = modelMatrix[7];
      vertexData[dataOffset + 43] = modelMatrix[8];

      vertexData[dataOffset + 44] = 1;
      vertexData[dataOffset + 45] = -1;
      vertexData[dataOffset + 46] = modelMatrix[0];
      vertexData[dataOffset + 47] = modelMatrix[1];
      vertexData[dataOffset + 48] = modelMatrix[2];
      vertexData[dataOffset + 49] = modelMatrix[3];
      vertexData[dataOffset + 50] = modelMatrix[4];
      vertexData[dataOffset + 51] = modelMatrix[5];
      vertexData[dataOffset + 52] = modelMatrix[6];
      vertexData[dataOffset + 53] = modelMatrix[7];
      vertexData[dataOffset + 54] = modelMatrix[8];

      vertexData[dataOffset + 55] = 1;
      vertexData[dataOffset + 56] = 1;
      vertexData[dataOffset + 57] = modelMatrix[0];
      vertexData[dataOffset + 58] = modelMatrix[1];
      vertexData[dataOffset + 59] = modelMatrix[2];
      vertexData[dataOffset + 60] = modelMatrix[3];
      vertexData[dataOffset + 61] = modelMatrix[4];
      vertexData[dataOffset + 62] = modelMatrix[5];
      vertexData[dataOffset + 63] = modelMatrix[6];
      vertexData[dataOffset + 64] = modelMatrix[7];
      vertexData[dataOffset + 65] = modelMatrix[8];
   }

   gl.useProgram(program);

   const vertexBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 11 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 11 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 11 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 11 * Float32Array.BYTES_PER_ELEMENT, 8 * Float32Array.BYTES_PER_ELEMENT);
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);
   gl.enableVertexAttribArray(3);

   gl.drawArrays(gl.TRIANGLES, 0, lights.length * 6);
}
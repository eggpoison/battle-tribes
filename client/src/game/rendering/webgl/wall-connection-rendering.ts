import { rotateXAroundOrigin, rotateYAroundOrigin } from "battletribes-shared/utils";
import { WallConnectionData } from "battletribes-shared/ai-building-types";
import { createWebGLProgram, gl } from "../../webgl";
import OPTIONS from "../../options";
import { UBOBindingIndex, bindUBOToProgram } from "../ubos";

const CONNECTION_WIDTH = 4;
const CONNECTION_HEIGHT = 8;

let program: WebGLProgram;

let wallConnections: ReadonlyArray<WallConnectionData> = [];

export function setVisibleWallConnections(newWallConnections: ReadonlyArray<WallConnectionData>): void {
   // @Speed: Garbage collection 
   wallConnections = newWallConnections;
}

export function createWallConnectionShaders(): void {
   const vertexShaderText = `#version 300 es
   precision mediump float;
   precision mediump int;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;

   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);
   }
   `;
   const fragmentShaderText = `#version 300 es
   precision mediump float;

   out vec4 outputColour;
   
   void main() {
      outputColour = vec4(1.0, 1.0, 0.0, 1.0);
   }
   `;
   
   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   bindUBOToProgram(gl, program, UBOBindingIndex.CAMERA);
}

export function renderWallConnections(): void {
   if (!OPTIONS.showWallConnections) {
      return;
   }
   
   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   // @Speed
   const vertices = new Array<number>();
   for (let i = 0; i < wallConnections.length; i++) {
      const connection = wallConnections[i];

      // Create transparent back
      
      const blX = connection.x + rotateXAroundOrigin(-CONNECTION_WIDTH, -CONNECTION_HEIGHT, connection.rotation);
      const blY = connection.y + rotateYAroundOrigin(-CONNECTION_WIDTH, -CONNECTION_HEIGHT, connection.rotation);
      const brX = connection.x + rotateXAroundOrigin(CONNECTION_WIDTH, -CONNECTION_HEIGHT, connection.rotation);
      const brY = connection.y + rotateYAroundOrigin(CONNECTION_WIDTH, -CONNECTION_HEIGHT, connection.rotation);
      const tlX = connection.x + rotateXAroundOrigin(-CONNECTION_WIDTH, CONNECTION_HEIGHT, connection.rotation);
      const tlY = connection.y + rotateYAroundOrigin(-CONNECTION_WIDTH, CONNECTION_HEIGHT, connection.rotation);
      const trX = connection.x + rotateXAroundOrigin(CONNECTION_WIDTH, CONNECTION_HEIGHT, connection.rotation);
      const trY = connection.y + rotateYAroundOrigin(CONNECTION_WIDTH, CONNECTION_HEIGHT, connection.rotation);

      vertices.push(
         blX, blY,
         brX, brY,
         tlX, tlY,
         tlX, tlY,
         brX, brY,
         trX, trY
      );
   }

   const buffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);

   gl.enableVertexAttribArray(0);

   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}
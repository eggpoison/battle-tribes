import { lerp } from "webgl-test-shared/dist/utils";
import { FrameInfo } from "../../components/game/dev/FrameGraph";
import { createWebGLProgram } from "../../webgl";

const TARGET_FRAME_RENDER_TIME = 16 / 1000; // 16 milliseconds
const MAX_FRAME_RENDER_TIME = 24 / 1000; // 24 milliseconds

/** Thickness of the target render line in clip space */
const TARGET_RENDER_LINE_THICKNESS = 0.02;

/** Time that frames are recorded for */
export const FRAME_GRAPH_RECORD_TIME = 1;

let frameGraphGL: WebGL2RenderingContext;

let program: WebGLProgram;
let buffer: WebGLBuffer;

const createGLContext = (): void => {
   const canvas = document.getElementById("frame-graph-canvas") as HTMLCanvasElement;
   const glAttempt = canvas.getContext("webgl2");

   if (glAttempt === null) {
      alert("Your browser does not support WebGL.");
      throw new Error("Your browser does not support WebGL.");
   }
   frameGraphGL = glAttempt;

   frameGraphGL.pixelStorei(frameGraphGL.UNPACK_FLIP_Y_WEBGL, true);
}

const createShaders = (): void => {
   const vertexShaderText = `#version 300 es
   precision highp float;
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in vec3 a_colour;
   
   out vec3 v_colour;
   
   void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
   
      v_colour = a_colour;
   }
   `;
   
   const fragmentShaderText = `#version 300 es
   precision highp float;
   
   in vec3 v_colour;
   
   out vec4 outputColour;
   
   void main() {
      outputColour = vec4(v_colour, 1.0);
   }
   `;

   program = createWebGLProgram(frameGraphGL, vertexShaderText, fragmentShaderText);

   buffer = frameGraphGL.createBuffer()!;
}

export function setupFrameGraph(): void {
   createGLContext();
   createShaders();
}

export function renderFrameGraph(renderTime: number, frames: ReadonlyArray<FrameInfo>): void {
   const vertexData = new Float32Array(frames.length * 6 * 5 + 6 * 5);

   // Add 16ms line
   {
      const lineCenterY = lerp(-1, 1, TARGET_FRAME_RENDER_TIME / MAX_FRAME_RENDER_TIME);
      
      const x1 = -1;
      const x2 = 1;
      const y1 = lineCenterY - TARGET_RENDER_LINE_THICKNESS;
      const y2 = lineCenterY + TARGET_RENDER_LINE_THICKNESS;

      const r = 1;
      const g = 0.64;
      const b = 0;

      vertexData[0] = x1;
      vertexData[1] = y1;
      vertexData[2] = r;
      vertexData[3] = g;
      vertexData[4] = b;

      vertexData[5] = x2;
      vertexData[6] = y1;
      vertexData[7] = r;
      vertexData[8] = g;
      vertexData[9] = b;

      vertexData[10] = x1;
      vertexData[11] = y2;
      vertexData[12] = r;
      vertexData[13] = g;
      vertexData[14] = b;

      vertexData[15] = x1;
      vertexData[16] = y2;
      vertexData[17] = r;
      vertexData[18] = g;
      vertexData[19] = b;

      vertexData[20] = x2;
      vertexData[21] = y1;
      vertexData[22] = r;
      vertexData[23] = g;
      vertexData[24] = b;

      vertexData[25] = x2;
      vertexData[26] = y2;
      vertexData[27] = r;
      vertexData[28] = g;
      vertexData[29] = b;
   }
   
   const currentTimeSeconds = renderTime / 1000;

   let previousX = -1;
   
   // Calculate vertices
   for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const secondsSinceFrameStartTime = currentTimeSeconds - frame.startTime / 1000;
      const secondsSinceFrameEndTime = currentTimeSeconds - frame.endTime / 1000;

      const frameRenderTime = secondsSinceFrameStartTime - secondsSinceFrameEndTime;
      const percentageHeight = frameRenderTime / MAX_FRAME_RENDER_TIME;

      const x1 = previousX;
      const x2 = lerp(1, -1, secondsSinceFrameEndTime / FRAME_GRAPH_RECORD_TIME);
      const y1 = -1;
      const y2 = lerp(-1, 1, percentageHeight);

      previousX = lerp(1, -1, secondsSinceFrameStartTime / FRAME_GRAPH_RECORD_TIME);

      const r = 1;
      const g = 0;
      const b = 0;

      const dataOffset = i + 1; // +1 to account for the 16ms line

      vertexData[dataOffset * 6 * 5] = x1;
      vertexData[dataOffset * 6 * 5 + 1] = y1;
      vertexData[dataOffset * 6 * 5 + 2] = r;
      vertexData[dataOffset * 6 * 5 + 3] = g;
      vertexData[dataOffset * 6 * 5 + 4] = b;

      vertexData[dataOffset * 6 * 5 + 5] = x2;
      vertexData[dataOffset * 6 * 5 + 6] = y1;
      vertexData[dataOffset * 6 * 5 + 7] = r;
      vertexData[dataOffset * 6 * 5 + 8] = g;
      vertexData[dataOffset * 6 * 5 + 9] = b;

      vertexData[dataOffset * 6 * 5 + 10] = x1;
      vertexData[dataOffset * 6 * 5 + 11] = y2;
      vertexData[dataOffset * 6 * 5 + 12] = r;
      vertexData[dataOffset * 6 * 5 + 13] = g;
      vertexData[dataOffset * 6 * 5 + 14] = b;

      vertexData[dataOffset * 6 * 5 + 15] = x1;
      vertexData[dataOffset * 6 * 5 + 16] = y2;
      vertexData[dataOffset * 6 * 5 + 17] = r;
      vertexData[dataOffset * 6 * 5 + 18] = g;
      vertexData[dataOffset * 6 * 5 + 19] = b;

      vertexData[dataOffset * 6 * 5 + 20] = x2;
      vertexData[dataOffset * 6 * 5 + 21] = y1;
      vertexData[dataOffset * 6 * 5 + 22] = r;
      vertexData[dataOffset * 6 * 5 + 23] = g;
      vertexData[dataOffset * 6 * 5 + 24] = b;

      vertexData[dataOffset * 6 * 5 + 25] = x2;
      vertexData[dataOffset * 6 * 5 + 26] = y2;
      vertexData[dataOffset * 6 * 5 + 27] = r;
      vertexData[dataOffset * 6 * 5 + 28] = g;
      vertexData[dataOffset * 6 * 5 + 29] = b;
   }
   
   frameGraphGL.useProgram(program);

   frameGraphGL.bindBuffer(frameGraphGL.ARRAY_BUFFER, buffer);
   frameGraphGL.bufferData(frameGraphGL.ARRAY_BUFFER, vertexData, frameGraphGL.STATIC_DRAW);

   frameGraphGL.vertexAttribPointer(0, 2, frameGraphGL.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
   frameGraphGL.vertexAttribPointer(1, 3, frameGraphGL.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

   frameGraphGL.enableVertexAttribArray(0);
   frameGraphGL.enableVertexAttribArray(1);

   frameGraphGL.drawArrays(frameGraphGL.TRIANGLES, 0, frames.length * 6);
}
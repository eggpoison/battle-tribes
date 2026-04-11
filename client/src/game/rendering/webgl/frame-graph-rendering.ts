import { lerp } from "webgl-test-shared";
import { createWebGLProgram } from "../../webgl";
import { frameGraph } from "../../../ui-state/frame-graph-funcs";

export interface FrameInfo {
   readonly startTime: number;
   readonly endTime: number;
}

const TARGET_FRAME_RENDER_TIME = 16 / 1000; // 16 milliseconds
const MAX_FRAME_RENDER_TIME = 24 / 1000; // 24 milliseconds

/** Thickness of the target render line in clip space */
const TARGET_RENDER_LINE_THICKNESS = 0.02;

/** Time that frames are recorded for */
export const FRAME_GRAPH_RECORD_TIME = 1;

let gl: WebGL2RenderingContext;

let program: WebGLProgram;
let buffer: WebGLBuffer;

// @Garbage: turn into array of always fixed length
const frames: Array<FrameInfo> = [];

let rectIdx = 0;

export function resetFrameGraph(): void {
   frames.length = 0;
}

/** Registers that a frame has occured for use in showing the fps counter */
export function registerFrame(frameStartTime: number, frameEndTime: number): void {
   frames.push({
      startTime: frameStartTime,
      endTime: frameEndTime
   });

   const now = frameEndTime / 1000;
   
   // Remove old frames
   let lastOldIdx = -1;
   for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const timeSince = now - (frame.endTime / 1000);
      if (timeSince > FRAME_GRAPH_RECORD_TIME) {
         lastOldIdx = i;
      } else {
         break;
      }
   }
   if (lastOldIdx !== -1) {
      frames.splice(0, lastOldIdx + 1);
   }
   
   frameGraph.setFPS(frames.length / FRAME_GRAPH_RECORD_TIME);

   if (frames.length > 0) {
      frameGraph.setAverage(0);
      frameGraph.setMin(0);
      frameGraph.setMax(0);
   } else {
      let totalDuration = 0;
      let min = Infinity;
      let max = -Infinity;

      for (const frame of frames) {
         const duration = frame.endTime - frame.startTime;

         totalDuration += duration;
         if (duration < min) {
            min = duration;
         }
         if (duration > max) {
            max = duration;
         }
      }

      const average = totalDuration / frames.length;

      frameGraph.setAverage(average);
      frameGraph.setMin(min);
      frameGraph.setMax(max);
   }
}

const createGLContext = (): void => {
   const canvas = document.createElement("canvas");
   canvas.id = "frame-graph-canvas";
   document.body.appendChild(canvas);
   
   const glAttempt = canvas.getContext("webgl2");

   if (glAttempt === null) {
      alert("Your browser does not support WebGL.");
      throw new Error("Your browser does not support WebGL.");
   }
   gl = glAttempt;

   gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
}

const createShaders = (): void => {
   const vertexShaderText = `#version 300 es
   precision highp float;
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in vec3 a_colour;
   layout(location = 2) in float a_opacity;
   
   out vec3 v_colour;
   out float v_opacity;
   
   void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
   
      v_colour = a_colour;
      v_opacity = a_opacity;
   }
   `;
   
   const fragmentShaderText = `#version 300 es
   precision highp float;
   
   in vec3 v_colour;
   in float v_opacity;
   
   out vec4 outputColour;
   
   void main() {
      outputColour = vec4(v_colour, v_opacity);
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);

   buffer = gl.createBuffer();
}

export function setupFrameGraph(): void {
   createGLContext();
   createShaders();
}

const addRectData = (vertexData: Float32Array, x1: number, y1: number, x2: number, y2: number, r: number, g: number, b: number, a: number): void => {
   const dataOffset = rectIdx * 6 * 6;

   vertexData[dataOffset] = x1;
   vertexData[dataOffset + 1] = y1;
   vertexData[dataOffset + 2] = r;
   vertexData[dataOffset + 3] = g;
   vertexData[dataOffset + 4] = b;
   vertexData[dataOffset + 5] = a;

   vertexData[dataOffset + 6] = x2;
   vertexData[dataOffset + 7] = y1;
   vertexData[dataOffset + 8] = r;
   vertexData[dataOffset + 9] = g;
   vertexData[dataOffset + 10] = b;
   vertexData[dataOffset + 11] = a;

   vertexData[dataOffset + 12] = x1;
   vertexData[dataOffset + 13] = y2;
   vertexData[dataOffset + 14] = r;
   vertexData[dataOffset + 15] = g;
   vertexData[dataOffset + 16] = b;
   vertexData[dataOffset + 17] = a;

   vertexData[dataOffset + 18] = x1;
   vertexData[dataOffset + 19] = y2;
   vertexData[dataOffset + 20] = r;
   vertexData[dataOffset + 21] = g;
   vertexData[dataOffset + 22] = b;
   vertexData[dataOffset + 23] = a;

   vertexData[dataOffset + 24] = x2;
   vertexData[dataOffset + 25] = y1;
   vertexData[dataOffset + 26] = r;
   vertexData[dataOffset + 27] = g;
   vertexData[dataOffset + 28] = b;
   vertexData[dataOffset + 29] = a;

   vertexData[dataOffset + 30] = x2;
   vertexData[dataOffset + 31] = y2;
   vertexData[dataOffset + 32] = r;
   vertexData[dataOffset + 33] = g;
   vertexData[dataOffset + 34] = b;
   vertexData[dataOffset + 35] = a;
   
   rectIdx++;
}

export function renderFrameGraph(renderTime: number): void {
   if (frames.length === 0) {
      return;
   }
   
   const numRects = (frames.length * 3 + 1);
   const vertexData = new Float32Array(numRects * 6 * 6);
   rectIdx = 0;

   // Draw the 16ms line
   {
      const lineCenterY = lerp(-1, 1, TARGET_FRAME_RENDER_TIME / MAX_FRAME_RENDER_TIME);
      
      const x1 = -1;
      const x2 = 1;
      const y1 = lineCenterY - TARGET_RENDER_LINE_THICKNESS;
      const y2 = lineCenterY + TARGET_RENDER_LINE_THICKNESS;
      addRectData(vertexData, x1, y1, x2, y2, 1, 0.64, 0, 1);
   }
   
   const currentTimeSeconds = renderTime / 1000;

   let previousX = lerp(1, -1, currentTimeSeconds - frames[0].startTime / 1000);
   
   // Calculate vertices
   for (const frame of frames) {
      const secondsSinceFrameStartTime = currentTimeSeconds - frame.startTime / 1000;
      const secondsSinceFrameEndTime = currentTimeSeconds - frame.endTime / 1000;

      const frameRenderTime = secondsSinceFrameStartTime - secondsSinceFrameEndTime;
      const percentageHeight = frameRenderTime / MAX_FRAME_RENDER_TIME;

      const x1 = previousX;
      const x2 = lerp(1, -1, secondsSinceFrameEndTime / FRAME_GRAPH_RECORD_TIME);
      const y1 = -1;
      const y2 = lerp(-1, 1, percentageHeight);

      previousX = x2;

      // Body
      addRectData(vertexData, x1, y1, x2, y2, 0.5, 0, 0, 0.5);
      // Left border
      addRectData(vertexData, x1, y1, x1 + 4 / gl.drawingBufferWidth, y2, 1, 0, 0, 1);
      // Top border
      addRectData(vertexData, x1, y2 - 4 / gl.drawingBufferHeight, x2, y2, 1, 0, 0, 1);
   }
   
   gl.useProgram(program);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);

   const numTrigs = numRects * 6;
   gl.drawArrays(gl.TRIANGLES, 0, numTrigs);
}
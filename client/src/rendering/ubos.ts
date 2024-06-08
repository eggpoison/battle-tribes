import Camera from "../Camera";
import { gl, halfWindowHeight, halfWindowWidth } from "../webgl";
import { getTechTreeGL } from "./webgl/tech-tree-rendering";

export const enum UBOBindingIndexes {
   CAMERA = 0,
   TIME = 1
}

export const UBO_NAME_RECORD: Record<UBOBindingIndexes, string> = {
   [UBOBindingIndexes.CAMERA]: "Camera",
   [UBOBindingIndexes.TIME]: "Time"
};

const cameraData = new Float32Array(8);
let cameraBuffer: WebGLBuffer;

// @Cleanup: Copy and paste
const cameraDataTechTree = new Float32Array(8);
let cameraBufferTechTree: WebGLBuffer;

const timeData = new Float32Array(4);
let timeBuffer: WebGLBuffer;

export function createUBOs(): void {
   // Camera uniform buffer
   cameraBuffer = gl.createBuffer()!;
   gl.bindBufferBase(gl.UNIFORM_BUFFER, UBOBindingIndexes.CAMERA, cameraBuffer);
   gl.bufferData(gl.UNIFORM_BUFFER, cameraData.byteLength, gl.DYNAMIC_DRAW);

   // Time uniform buffer
   timeBuffer = gl.createBuffer()!;
   gl.bindBufferBase(gl.UNIFORM_BUFFER, UBOBindingIndexes.TIME, timeBuffer);
   gl.bufferData(gl.UNIFORM_BUFFER, timeData.byteLength, gl.DYNAMIC_DRAW);

   // Camera uniform buffer (for the tech tree)
   {
      const gl = getTechTreeGL();
      cameraBufferTechTree = gl.createBuffer()!;
      gl.bindBufferBase(gl.UNIFORM_BUFFER, UBOBindingIndexes.CAMERA, cameraBufferTechTree);
      gl.bufferData(gl.UNIFORM_BUFFER, cameraDataTechTree.byteLength, gl.DYNAMIC_DRAW);
   }
}

export function updateUBOs(): void {
   // Update the camera buffer
   gl.bindBuffer(gl.UNIFORM_BUFFER, cameraBuffer);
   cameraData[0] = Camera.position.x;
   cameraData[1] = Camera.position.y;
   cameraData[2] = halfWindowWidth;
   cameraData[3] = halfWindowHeight;
   cameraData[4] = Camera.zoom;
   gl.bufferSubData(gl.UNIFORM_BUFFER, 0, cameraData);

   // Update the time buffer
   gl.bindBuffer(gl.UNIFORM_BUFFER, timeBuffer);
   timeData[0] = performance.now();
   gl.bufferSubData(gl.UNIFORM_BUFFER, 0, timeData);

   {
      const gl = getTechTreeGL();
      gl.bindBuffer(gl.UNIFORM_BUFFER, cameraBufferTechTree);
      cameraDataTechTree[0] = Camera.position.x;
      cameraDataTechTree[1] = Camera.position.y;
      cameraDataTechTree[2] = halfWindowWidth;
      cameraDataTechTree[3] = halfWindowHeight;
      cameraDataTechTree[4] = Camera.zoom;
      gl.bufferSubData(gl.UNIFORM_BUFFER, 0, cameraDataTechTree);
   }
}

export function bindUBOToProgram(gl: WebGL2RenderingContext, program: WebGLProgram, bindingIndex: UBOBindingIndexes): void {
   const name = UBO_NAME_RECORD[bindingIndex];
   const blockIndex = gl.getUniformBlockIndex(program, name);
   gl.uniformBlockBinding(program, blockIndex, bindingIndex);
}
import { getLightLevelNodeX, getLightLevelNodeY, LightLevelNode, LightLevelVars } from "../../../../../shared/src/light-levels";
import { Settings } from "../../../../../shared/src/settings";
import { assert, mod } from "../../../../../shared/src/utils";
import { createWebGLProgram, gl } from "../../webgl";
import { bindUBOToProgram, UBOBindingIndex } from "../ubos";

const enum Vars {
   SQUARE_SIZE = 6,
   NODES_IN_RENDERING_CHUNK = 16,
   RENDERING_CHUNK_SIZE = LightLevelVars.LIGHT_NODE_SIZE * NODES_IN_RENDERING_CHUNK,
   // @Bug: doesn't account for light nodes outside world border
   RENDERING_CHUNKS_IN_WORLD_WIDTH = Settings.WORLD_UNITS / RENDERING_CHUNK_SIZE,
   ATTRIBUTES_PER_VERTEX = 3
}

interface RenderingChunk {
   readonly vao: WebGLVertexArrayObject;
   readonly vertexBuffer: WebGLBuffer;
   readonly vertexData: Float32Array;
   numNodes: number;
}

export interface LightLevelNodeAddInfo {
   readonly node: LightLevelNode;
   readonly lightLevel: number;
}

export interface LightLevelBGUpdateInfo {
   readonly addedNodeInfos: Array<LightLevelNodeAddInfo>;
   readonly removedNodeInfos: Array<LightLevelNodeAddInfo>;
}

const renderingChunks = new Map<number, RenderingChunk>();

let program: WebGLProgram;

export function createLightLevelsBGShaders(): void {
   const vertexShaderText = `#version 300 es
   precision mediump float;
   precision mediump int;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in float a_lightLevel;

   out float v_lightLevel;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);

      v_lightLevel = a_lightLevel;
   }
   `;
   const fragmentShaderText = `#version 300 es
   precision mediump float;
   precision mediump int;
   
   #define DARK_COLOUR vec4(93.0/255.0, 0.0, 1.0, 0.35)
   #define LIGHT_COLOUR vec4(0.0, 1.0, 110.0/255.0, 0.35)
   
   in float v_lightLevel;
   
   out vec4 outputColour;
   
   void main() {
      outputColour = mix(DARK_COLOUR, LIGHT_COLOUR, v_lightLevel);

      // @Hack :DarkTransparencyBug
      outputColour.rgb *= outputColour.a;
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   bindUBOToProgram(gl, program, UBOBindingIndex.CAMERA);
}

export function getLightLevelRenderingChunkIndex(node: LightLevelNode): number {
   const nodeX = getLightLevelNodeX(node);
   const nodeY = getLightLevelNodeY(node);

   const x = nodeX * LightLevelVars.LIGHT_NODE_SIZE;
   const y = nodeY * LightLevelVars.LIGHT_NODE_SIZE;

   const renderingChunkX = Math.floor(x / Vars.RENDERING_CHUNK_SIZE);
   const renderingChunkY = Math.floor(y / Vars.RENDERING_CHUNK_SIZE);

   return renderingChunkY * Vars.RENDERING_CHUNKS_IN_WORLD_WIDTH + renderingChunkX;
}

/** Each node in a rendering chunk has a unique instance idx, this function calculates that. */
const getNodeInstanceIdx = (node: LightLevelNode): number => {
   const nodeX = getLightLevelNodeX(node);
   const nodeY = getLightLevelNodeY(node);

   const localNodeX = mod(nodeX, Vars.NODES_IN_RENDERING_CHUNK);
   const localNodeY = mod(nodeY, Vars.NODES_IN_RENDERING_CHUNK);

   return localNodeY * Vars.NODES_IN_RENDERING_CHUNK + localNodeX;
}

const setNodeRenderingChunkData = (vertexData: Float32Array, nodeInfo: LightLevelNodeAddInfo): void => {
   const node = nodeInfo.node;
   const lightLevel = nodeInfo.lightLevel;
   
   const instanceIdx = getNodeInstanceIdx(node);
   const dataOffset = instanceIdx * 6 * Vars.ATTRIBUTES_PER_VERTEX;
      
   const nodeX = getLightLevelNodeX(node);
   const nodeY = getLightLevelNodeY(node);
   const x = (nodeX + 0.5) * LightLevelVars.LIGHT_NODE_SIZE;
   const y = (nodeY + 0.5) * LightLevelVars.LIGHT_NODE_SIZE;

   const x1 = x - Vars.SQUARE_SIZE * 0.5;
   const x2 = x + Vars.SQUARE_SIZE * 0.5;
   const y1 = y - Vars.SQUARE_SIZE * 0.5;
   const y2 = y + Vars.SQUARE_SIZE * 0.5;
   
   vertexData[dataOffset] = x1;
   vertexData[dataOffset + 1] = y1;
   vertexData[dataOffset + 2] = lightLevel;
   vertexData[dataOffset + 3] = x2;
   vertexData[dataOffset + 4] = y1;
   vertexData[dataOffset + 5] = lightLevel;
   vertexData[dataOffset + 6] = x1;
   vertexData[dataOffset + 7] = y2;
   vertexData[dataOffset + 8] = lightLevel;
   vertexData[dataOffset + 9] = x1;
   vertexData[dataOffset + 10] = y2;
   vertexData[dataOffset + 11] = lightLevel;
   vertexData[dataOffset + 12] = x2;
   vertexData[dataOffset + 13] = y1;
   vertexData[dataOffset + 14] = lightLevel;
   vertexData[dataOffset + 15] = x2;
   vertexData[dataOffset + 16] = y2;
   vertexData[dataOffset + 17] = lightLevel;
}

const clearNodeRenderingChunkData = (vertexData: Float32Array, nodeInfo: LightLevelNodeAddInfo): void => {
   const instanceIdx = getNodeInstanceIdx(nodeInfo.node);
   const dataOffset = instanceIdx * 6 * Vars.ATTRIBUTES_PER_VERTEX;
      
   vertexData[dataOffset] = 0;
   vertexData[dataOffset + 1] = 0;
   vertexData[dataOffset + 2] = 0;
   vertexData[dataOffset + 3] = 0;
   vertexData[dataOffset + 4] = 0;
   vertexData[dataOffset + 5] = 0;
   vertexData[dataOffset + 6] = 0;
   vertexData[dataOffset + 7] = 0;
   vertexData[dataOffset + 8] = 0;
   vertexData[dataOffset + 9] = 0;
   vertexData[dataOffset + 10] = 0;
   vertexData[dataOffset + 11] = 0;
   vertexData[dataOffset + 12] = 0;
   vertexData[dataOffset + 13] = 0;
   vertexData[dataOffset + 14] = 0;
   vertexData[dataOffset + 15] = 0;
   vertexData[dataOffset + 16] = 0;
   vertexData[dataOffset + 17] = 0;
}

export function updateLightLevelRenderingChunks(bgUpdateInfos: Map<number, LightLevelBGUpdateInfo>): void {
   let didBindVertexArray = false;
   
   for (const pair of bgUpdateInfos) {
      const renderingChunkIndex = pair[0];
      const bgUpdateInfo = pair[1];

      const renderingChunk = renderingChunks.get(renderingChunkIndex);
      if (typeof renderingChunk === "undefined") {
         const vao = gl.createVertexArray()!;
         gl.bindVertexArray(vao);
         didBindVertexArray = true;
      
         // Create vertex data
         const vertexData = new Float32Array(Vars.NODES_IN_RENDERING_CHUNK * Vars.NODES_IN_RENDERING_CHUNK * 6 * Vars.ATTRIBUTES_PER_VERTEX);
         for (let i = 0; i < bgUpdateInfo.addedNodeInfos.length; i++) {
            const nodeInfo = bgUpdateInfo.addedNodeInfos[i];
            setNodeRenderingChunkData(vertexData, nodeInfo);
         }
         
         const vertexBuffer = gl.createBuffer()!;
         gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
         gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);
   
         gl.vertexAttribPointer(0, 2, gl.FLOAT, false, Vars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 0);
         gl.vertexAttribPointer(1, 1, gl.FLOAT, false, Vars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
         
         gl.enableVertexAttribArray(0);
         gl.enableVertexAttribArray(1);
         
         const renderingChunk: RenderingChunk = {
            vao: vao,
            vertexBuffer: vertexBuffer,
            vertexData: vertexData,
            numNodes: bgUpdateInfo.addedNodeInfos.length
         };
         renderingChunks.set(renderingChunkIndex, renderingChunk);
      } else {
         assert(typeof renderingChunk !== "undefined");
         renderingChunk.numNodes += bgUpdateInfo.addedNodeInfos.length;
         renderingChunk.numNodes -= bgUpdateInfo.removedNodeInfos.length;

         if (renderingChunk.numNodes > 0) {
            // Update vertex data
            for (const nodeInfo of bgUpdateInfo.addedNodeInfos) {
               setNodeRenderingChunkData(renderingChunk.vertexData, nodeInfo);
            }
            for (const nodeInfo of bgUpdateInfo.removedNodeInfos) {
               clearNodeRenderingChunkData(renderingChunk.vertexData, nodeInfo);
            }

            gl.bindVertexArray(renderingChunk.vao);
            gl.bindBuffer(gl.ARRAY_BUFFER, renderingChunk.vertexBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, renderingChunk.vertexData);
            didBindVertexArray = true;
         } else {
            // Remove rendering chunk
            renderingChunks.delete(renderingChunkIndex);
         }
      }
   }

   if (didBindVertexArray) {
      gl.bindVertexArray(null);
   }
}

export function renderLightLevelsBG() {
   gl.useProgram(program);

   gl.enable(gl.BLEND);
   // @Hack :DarkTransparencyBug
   gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

   for (const pair of renderingChunks) {
      const renderingChunk = pair[1];
      gl.bindVertexArray(renderingChunk.vao);
      gl.drawArrays(gl.TRIANGLES, 0, renderingChunk.vertexData.length / 3);
   }

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}
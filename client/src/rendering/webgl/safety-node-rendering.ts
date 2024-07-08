import { rotateXAroundOrigin, rotateYAroundOrigin } from "webgl-test-shared/dist/utils";
import { Settings } from "webgl-test-shared/dist/settings";
import { SafetyNodeData, WallSideNodeData } from "webgl-test-shared/dist/ai-building-types";
import { createWebGLProgram, gl } from "../../webgl";
import OPTIONS from "../../options";
import { getVisibleWalls } from "../../client/Client";
import { getHoveredEntityID } from "../../entity-selection";
import { bindUBOToProgram, UBOBindingIndex } from "../ubos";

const OCCUPIED_NODE_THICKNESS = 3;
const OCCUPIED_NODE_FREE_THICKNESS = 4.5;
const OCCUPIED_NODE_RADIUS = 8;

const FREE_NODE_RADIUS = 4;
const FREE_NODE_INSIDE_RADIUS = 6;
const NODE_CIRCLE_VERTEX_COUNT = 10;

const HIGHLIGHTED_NODE_SIZE = 12;
const HIGHLIGHTED_NODE_THICKNESS = 3;

let program: WebGLProgram;

let safetyNodes: ReadonlyArray<SafetyNodeData>;

export function setVisibleSafetyNodes(newSafetyNodes: ReadonlyArray<SafetyNodeData>): void {
   // @Speed: Garbage collection
   safetyNodes = newSafetyNodes;
}

export function createSafetyNodeShaders(): void {
   const vertexShaderText = `#version 300 es
   precision mediump float;
   precision mediump int;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in float a_safetyIdealness;

   out float v_safetyIdealness;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);

      v_safetyIdealness = a_safetyIdealness;
   }
   `;
   const fragmentShaderText = `#version 300 es
   precision mediump float;
   precision mediump int;

   #define MAX_SAFETY_COLOUR vec4(0.0, 1.0, 0.0, 1.0)
   #define MIN_SAFETY_COLOUR vec4(1.0, 0.0, 0.0, 1.0)
   
   in float v_safetyIdealness;
   
   out vec4 outputColour;
   
   void main() {
      outputColour = mix(MIN_SAFETY_COLOUR, MAX_SAFETY_COLOUR, v_safetyIdealness);
   }
   `;
   
   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   bindUBOToProgram(gl, program, UBOBindingIndex.CAMERA);
}

const getHighlightedNodes = (): ReadonlyArray<WallSideNodeData> => {
   const hoveredEntityID = getHoveredEntityID();
   if (hoveredEntityID === -1) {
      return [];
   }

   const visibleWalls = getVisibleWalls();

   const highlightedNodes = new Array<WallSideNodeData>();
   for (const wallData of visibleWalls) {
      if (wallData.wallID === hoveredEntityID) {
         for (let k = 0; k < wallData.topSideNodes.length; k++) {
            const nodeData = wallData.topSideNodes[k];
            highlightedNodes.push(nodeData);
         }
         for (let k = 0; k < wallData.rightSideNodes.length; k++) {
            const nodeData = wallData.rightSideNodes[k];
            highlightedNodes.push(nodeData);
         }
         for (let k = 0; k < wallData.bottomSideNodes.length; k++) {
            const nodeData = wallData.bottomSideNodes[k];
            highlightedNodes.push(nodeData);
         }
         for (let k = 0; k < wallData.leftSideNodes.length; k++) {
            const nodeData = wallData.leftSideNodes[k];
            highlightedNodes.push(nodeData);
         }
      }
   }

   return highlightedNodes;
}

export function renderSafetyNodes(): void {
   if (!OPTIONS.showSafetyNodes) {
      return;
   }

   const highlightedNodes = getHighlightedNodes();
   
   // Count num vertices
   let numVertices = 0;
   for (let i = 0; i < safetyNodes.length; i++) {
      const nodeData = safetyNodes[i];
      numVertices += nodeData.isOccupied ? 6 * NODE_CIRCLE_VERTEX_COUNT : 3 * NODE_CIRCLE_VERTEX_COUNT;
   }
   numVertices += highlightedNodes.length * 24;

   if (numVertices === 0) {
      return;
   }

   gl.useProgram(program);

   // Calculate vertices
   let currentVertexCount = 0;
   const vertexData = new Float32Array(numVertices * 3);
   for (let i = 0; i < safetyNodes.length; i++) {
      const nodeData = safetyNodes[i];

      let safetyIdealness = nodeData.safety / OPTIONS.maxGreenSafety;
      if (safetyIdealness > 1) {
         safetyIdealness = 1;
      }

      const x = nodeData.index % Settings.SAFETY_NODES_IN_WORLD_WIDTH * Settings.SAFETY_NODE_SEPARATION;
      const y = Math.floor(nodeData.index / Settings.SAFETY_NODES_IN_WORLD_WIDTH) * Settings.SAFETY_NODE_SEPARATION;
      
      if (nodeData.isOccupied) {
         // Rings for occupied nodes

         const step = 2 * Math.PI / NODE_CIRCLE_VERTEX_COUNT;
         const thickness = nodeData.isContained ? OCCUPIED_NODE_FREE_THICKNESS : OCCUPIED_NODE_THICKNESS;

         // Add the outer vertices
         for (let radians = 0, n = 0; n < NODE_CIRCLE_VERTEX_COUNT; radians += step, n++) {
            // @Speed: can carry over
            const sinRadians = Math.sin(radians);
            const cosRadians = Math.cos(radians);
            const sinNextRadians = Math.sin(radians + step);
            const cosNextRadians = Math.cos(radians + step);

            const blX = x + (OCCUPIED_NODE_RADIUS - thickness) * sinRadians;
            const blY = y + (OCCUPIED_NODE_RADIUS - thickness) * cosRadians;
            const brX = x + (OCCUPIED_NODE_RADIUS - thickness) * sinNextRadians;
            const brY = y + (OCCUPIED_NODE_RADIUS - thickness) * cosNextRadians;
            const tlX = x + (OCCUPIED_NODE_RADIUS) * sinRadians;
            const tlY = y + (OCCUPIED_NODE_RADIUS) * cosRadians;
            const trX = x + (OCCUPIED_NODE_RADIUS) * sinNextRadians;
            const trY = y + (OCCUPIED_NODE_RADIUS) * cosNextRadians;
            
            const vertexOffset = currentVertexCount * 3;

            vertexData[vertexOffset] = blX;
            vertexData[vertexOffset + 1] = blY;
            vertexData[vertexOffset + 2] = safetyIdealness;

            vertexData[vertexOffset + 3] = brX;
            vertexData[vertexOffset + 4] = brY;
            vertexData[vertexOffset + 5] = safetyIdealness;

            vertexData[vertexOffset + 6] = tlX;
            vertexData[vertexOffset + 7] = tlY;
            vertexData[vertexOffset + 8] = safetyIdealness;

            vertexData[vertexOffset + 9] = tlX;
            vertexData[vertexOffset + 10] = tlY;
            vertexData[vertexOffset + 11] = safetyIdealness;

            vertexData[vertexOffset + 12] = brX;
            vertexData[vertexOffset + 13] = brY;
            vertexData[vertexOffset + 14] = safetyIdealness;

            vertexData[vertexOffset + 15] = trX;
            vertexData[vertexOffset + 16] = trY;
            vertexData[vertexOffset + 17] = safetyIdealness;

            currentVertexCount += 6;
         }
      } else {
         // Dots for free nodes

         const step = 2 * Math.PI / NODE_CIRCLE_VERTEX_COUNT;
         const radius = nodeData.isContained ? FREE_NODE_INSIDE_RADIUS : FREE_NODE_RADIUS;

         // Add the outer vertices
         for (let radians = 0, n = 0; n < NODE_CIRCLE_VERTEX_COUNT; radians += step, n++) {
            // @Speed: can carry over
            const sinRadians = Math.sin(radians);
            const cosRadians = Math.cos(radians);
            const sinNextRadians = Math.sin(radians + step);
            const cosNextRadians = Math.cos(radians + step);

            const currentX = x + radius * sinRadians;
            const currentY = y + radius * cosRadians;
            const nextX = x + radius * sinNextRadians;
            const nextY = y + radius * cosNextRadians;

            const vertexOffset = currentVertexCount * 3;

            vertexData[vertexOffset] = nextX;
            vertexData[vertexOffset + 1] = nextY;
            vertexData[vertexOffset + 2] = safetyIdealness;

            vertexData[vertexOffset + 3] = x;
            vertexData[vertexOffset + 4] = y;
            vertexData[vertexOffset + 5] = safetyIdealness;

            vertexData[vertexOffset + 6] = currentX;
            vertexData[vertexOffset + 7] = currentY;
            vertexData[vertexOffset + 8] = safetyIdealness;

            currentVertexCount += 3;
         }
      }
   }
   for (let i = 0; i < highlightedNodes.length; i++) {
      const nodeData = highlightedNodes[i];

      const x = nodeData.nodeIndex % Settings.SAFETY_NODES_IN_WORLD_WIDTH * Settings.SAFETY_NODE_SEPARATION;
      const y = Math.floor(nodeData.nodeIndex / Settings.SAFETY_NODES_IN_WORLD_WIDTH) * Settings.SAFETY_NODE_SEPARATION;

      // Create the 4 borders
      for (let i = 0; i < 4; i++) {
         const direction = i * Math.PI / 2;

         const blX = x + rotateXAroundOrigin(HIGHLIGHTED_NODE_SIZE * -0.5 + HIGHLIGHTED_NODE_THICKNESS, HIGHLIGHTED_NODE_SIZE * 0.5 - HIGHLIGHTED_NODE_THICKNESS, direction);
         const blY = y + rotateYAroundOrigin(HIGHLIGHTED_NODE_SIZE * -0.5 + HIGHLIGHTED_NODE_THICKNESS, HIGHLIGHTED_NODE_SIZE * 0.5 - HIGHLIGHTED_NODE_THICKNESS, direction);
         const brX = x + rotateXAroundOrigin(HIGHLIGHTED_NODE_SIZE * 0.5 - HIGHLIGHTED_NODE_THICKNESS, HIGHLIGHTED_NODE_SIZE * 0.5 - HIGHLIGHTED_NODE_THICKNESS, direction);
         const brY = y + rotateYAroundOrigin(HIGHLIGHTED_NODE_SIZE * 0.5 - HIGHLIGHTED_NODE_THICKNESS, HIGHLIGHTED_NODE_SIZE * 0.5 - HIGHLIGHTED_NODE_THICKNESS, direction);
         const tlX = x + rotateXAroundOrigin(HIGHLIGHTED_NODE_SIZE * -0.5, HIGHLIGHTED_NODE_SIZE * 0.5, direction);
         const tlY = y + rotateYAroundOrigin(HIGHLIGHTED_NODE_SIZE * -0.5, HIGHLIGHTED_NODE_SIZE * 0.5, direction);
         const trX = x + rotateXAroundOrigin(HIGHLIGHTED_NODE_SIZE * 0.5, HIGHLIGHTED_NODE_SIZE * 0.5, direction);
         const trY = y + rotateYAroundOrigin(HIGHLIGHTED_NODE_SIZE * 0.5, HIGHLIGHTED_NODE_SIZE * 0.5, direction);

         const vertexOffset = currentVertexCount * 3;

         const safety = nodeData.side / 3;

         vertexData[vertexOffset] = blX;
         vertexData[vertexOffset + 1] = blY;
         vertexData[vertexOffset + 2] = safety;

         vertexData[vertexOffset + 3] = brX;
         vertexData[vertexOffset + 4] = brY;
         vertexData[vertexOffset + 5] = safety;

         vertexData[vertexOffset + 6] = tlX;
         vertexData[vertexOffset + 7] = tlY;
         vertexData[vertexOffset + 8] = safety;

         vertexData[vertexOffset + 9] = tlX;
         vertexData[vertexOffset + 10] = tlY;
         vertexData[vertexOffset + 11] = safety;

         vertexData[vertexOffset + 12] = brX;
         vertexData[vertexOffset + 13] = brY;
         vertexData[vertexOffset + 14] = safety;

         vertexData[vertexOffset + 15] = trX;
         vertexData[vertexOffset + 16] = trY;
         vertexData[vertexOffset + 17] = safety;

         currentVertexCount += 6;
      }
   }

   const buffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);

   gl.drawArrays(gl.TRIANGLES, 0, currentVertexCount * 6);
}
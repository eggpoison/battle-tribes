import { createWebGLProgram, gl } from "../../webgl";
import { EntityDebugData, PathData, PathfindingNodeIndex, angle, PathfindingSettings } from "webgl-test-shared";
import { bindUBOToProgram, UBOBindingIndex } from "../ubos";
import { entityExists } from "../../world";
import { TransformComponentArray } from "../../entity-components/server-components/TransformComponent";
import { debugDisplayState } from "../../../ui-state/debug-display-state";
import { hoverDebugState } from "../../../ui-state/hover-debug-state";
import { nerdVision } from "../../../ui-state/nerd-vision-funcs";

enum NodeType {
   occupied,
   inPath,
   inRawPath,
   visited
}

const NODE_THICKNESS = 3;
const NODE_RADIUS = 8;
const NODE_CIRCLE_VERTEX_COUNT = 10;

const CONNECTOR_THICKNESS = 8;

let nodeProgram: WebGLProgram;

let connectorProgram: WebGLProgram;

let visiblePathfindingNodeOccupances: ReadonlyArray<PathfindingNodeIndex> = [];

export function setVisiblePathfindingNodeOccupances(newVisiblePathfindingNodeOccupances: ReadonlyArray<PathfindingNodeIndex>): void {
   // @Speed: Garbage collection
   visiblePathfindingNodeOccupances = newVisiblePathfindingNodeOccupances;
}

export function createPathfindNodeShaders(): void {
   const nodeVertexShaderText = `#version 300 es
   precision mediump float;
   precision mediump int;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in float a_nodeType;

   out float v_nodeType;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);

      v_nodeType = a_nodeType;
   }
   `;
   const nodeFragmentShaderText = `#version 300 es
   precision mediump float;
   precision mediump int;
   
   in float v_nodeType;
   
   out vec4 outputColour;
   
   void main() {
      if (v_nodeType == ${NodeType.occupied.toFixed(1)}) {
         // Red for occupied
         outputColour = vec4(1.0, 0.0, 0.0, 1.0);
      } else if (v_nodeType == ${NodeType.inPath.toFixed(1)}) {
         // Blue for path
         outputColour = vec4(0.0, 0.0, 1.0, 1.0);
      } else if (v_nodeType == ${NodeType.visited.toFixed(1)}) {
         // Yellow for visited
         outputColour = vec4(225.0/255.0, 235.0/255.0, 52.0/255.0, 1.0);
      } else {
         // Orange for raw path
         outputColour = vec4(1.0, 0.5, 0.0, 1.0);
      }
   }
   `;
   
   const connectorVertexShaderText = `#version 300 es
   precision mediump float;
   
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
   const connectorFragmentShaderText = `#version 300 es
   precision mediump float;
   
   out vec4 outputColour;
   
   void main() {
      outputColour = vec4(0.0, 0.3, 1.0, 1.0);
   }
   `;

   nodeProgram = createWebGLProgram(gl, nodeVertexShaderText, nodeFragmentShaderText);
   bindUBOToProgram(gl, nodeProgram, UBOBindingIndex.CAMERA);

   connectorProgram = createWebGLProgram(gl, connectorVertexShaderText, connectorFragmentShaderText);
   bindUBOToProgram(gl, connectorProgram, UBOBindingIndex.CAMERA);
}

const addConnector = (vertices: Array<number>, startX: number, startY: number, endX: number, endY: number): void => {
   const connectDirection = angle(endX - startX, endY - startY);
      
   // To the left of the start node
   const x1 = startX + CONNECTOR_THICKNESS / 2 * Math.sin(connectDirection - Math.PI/2);
   const y1 = startY + CONNECTOR_THICKNESS / 2 * Math.cos(connectDirection - Math.PI/2);
   // To the right of the start node
   const x2 = startX + CONNECTOR_THICKNESS / 2 * Math.sin(connectDirection + Math.PI/2);
   const y2 = startY + CONNECTOR_THICKNESS / 2 * Math.cos(connectDirection + Math.PI/2);
   // To the left of the end node
   const x3 = endX + CONNECTOR_THICKNESS / 2 * Math.sin(connectDirection - Math.PI/2);
   const y3 = endY + CONNECTOR_THICKNESS / 2 * Math.cos(connectDirection - Math.PI/2);
   // To the right of the end node
   const x4 = endX + CONNECTOR_THICKNESS / 2 * Math.sin(connectDirection + Math.PI/2);
   const y4 = endY + CONNECTOR_THICKNESS / 2 * Math.cos(connectDirection + Math.PI/2);

   vertices.push(
      x1, y1,
      x2, y2,
      x3, y3,
      x3, y3,
      x2, y2,
      x4, y4
   );
}

const renderConnectors = (pathData: PathData): void => {
   const debugEntity = hoverDebugState.entityDebugData!.entityID;
   if (!entityExists(debugEntity)) {
      return;
   }

   const transformComponent = TransformComponentArray.getComponent(debugEntity);
   const entityHitbox = transformComponent.hitboxes[0];
   
   const vertices = new Array<number>();
   let lastNodeX = entityHitbox.box.position.x;
   let lastNodeY = entityHitbox.box.position.y;
   for (let i = 0; i < pathData.pathNodes.length; i++) {
      const node = pathData.pathNodes[i];

      const nodeX = (node % PathfindingSettings.NODES_IN_WORLD_WIDTH - 1) * PathfindingSettings.NODE_SEPARATION;
      const nodeY = (Math.floor(node / PathfindingSettings.NODES_IN_WORLD_WIDTH) - 1) * PathfindingSettings.NODE_SEPARATION;
      
      addConnector(vertices, lastNodeX, lastNodeY, nodeX, nodeY);
      
      lastNodeX = nodeX;
      lastNodeY = nodeY;
   }

   addConnector(vertices, entityHitbox.box.position.x, entityHitbox.box.position.y, pathData.goalX, pathData.goalY);

   gl.useProgram(connectorProgram);

   const buffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);

   gl.enableVertexAttribArray(0);

   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
}

const renderNodes = (vertexData: Float32Array): void => {
   gl.useProgram(nodeProgram);

   const buffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);

   gl.drawArrays(gl.TRIANGLES, 0, vertexData.length / 3);
}

const getDebuggedPath = (entityDebugData: EntityDebugData | null): PathData | undefined => {
   if (nerdVision.isVisible() && entityDebugData !== null && entityExists(entityDebugData.entityID)) {
      return entityDebugData.pathData;
   }
}

const addNodeData = (vertexData: Float32Array, segmentIdx: number, node: PathfindingNodeIndex, type: NodeType): number => {
   const x = (node % PathfindingSettings.NODES_IN_WORLD_WIDTH - 1) * PathfindingSettings.NODE_SEPARATION;
   const y = (Math.floor(node / PathfindingSettings.NODES_IN_WORLD_WIDTH) - 1) * PathfindingSettings.NODE_SEPARATION;
   
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

      const vertexOffset = segmentIdx * 6 * 3;
      segmentIdx++;

      vertexData[vertexOffset] = blX;
      vertexData[vertexOffset + 1] = blY;
      vertexData[vertexOffset + 2] = type;

      vertexData[vertexOffset + 3] = brX;
      vertexData[vertexOffset + 4] = brY;
      vertexData[vertexOffset + 5] = type;

      vertexData[vertexOffset + 6] = tlX;
      vertexData[vertexOffset + 7] = tlY;
      vertexData[vertexOffset + 8] = type;

      vertexData[vertexOffset + 9] = tlX;
      vertexData[vertexOffset + 10] = tlY;
      vertexData[vertexOffset + 11] = type;

      vertexData[vertexOffset + 12] = brX;
      vertexData[vertexOffset + 13] = brY;
      vertexData[vertexOffset + 14] = type;

      vertexData[vertexOffset + 15] = trX;
      vertexData[vertexOffset + 16] = trY;
      vertexData[vertexOffset + 17] = type;
   }

   return segmentIdx;
}

export function renderPathfindingNodes(): void {
   const entityDebugData = hoverDebugState.entityDebugData;

   const showEntityPathfindingNodes = nerdVision.isVisible() && entityDebugData !== null && entityExists(entityDebugData.entityID);
   if (!debugDisplayState.showPathfindingNodes && !showEntityPathfindingNodes) {
      return;
   }
   
   if (nerdVision.isVisible() && entityDebugData !== null && typeof entityDebugData.pathData !== "undefined") {
      renderConnectors(entityDebugData.pathData);
   }

   const debuggedPath = getDebuggedPath(entityDebugData);

   let numNodes = visiblePathfindingNodeOccupances.length;
   if (typeof debuggedPath !== "undefined") {
      numNodes += debuggedPath.pathNodes.length + debuggedPath.rawPathNodes.length + debuggedPath.visitedNodes.length;
   }
   
   if (numNodes > 0) {
      const vertexData = new Float32Array(numNodes * NODE_CIRCLE_VERTEX_COUNT * 6 * 3);
      let segmentIdx = 0;
      
      // @Speed: Remove duplicates (nodes with same position)
      
      if (debugDisplayState.showPathfindingNodes) {
         for (const node of visiblePathfindingNodeOccupances) {
            segmentIdx = addNodeData(vertexData, segmentIdx, node, NodeType.occupied);
         }
      }
   
      if (showEntityPathfindingNodes) {
         const pathData = entityDebugData.pathData;
         if (typeof pathData !== "undefined") {
            for (const node of pathData.visitedNodes) {
               segmentIdx = addNodeData(vertexData, segmentIdx, node, NodeType.visited);
            }

            for (const node of pathData.rawPathNodes) {
               segmentIdx = addNodeData(vertexData, segmentIdx, node, NodeType.inRawPath);
            }
      
            for (const node of pathData.pathNodes) {
               segmentIdx = addNodeData(vertexData, segmentIdx, node, NodeType.inPath);
            }
         }
      }
   
      renderNodes(vertexData);
   }
}
import { Settings } from "../../../../../shared/src/settings";
import { getSubtileX, getSubtileY } from "../../../../../shared/src/subtiles";
import { Bytes } from "../../../../../shared/src/constants";
import { maxVisibleRenderChunkX, maxVisibleRenderChunkY, minVisibleRenderChunkX, minVisibleRenderChunkY } from "../../camera";
import { createWebGLProgram, gl } from "../../webgl";
import { EdgeMarkerBit, RenderChunkEdgeInfo, RenderChunkWallBorderInfo, getRenderChunkIndex, getRenderChunkWallBorderInfo, setRenderChunkWallBorderInfo } from "../render-chunks";
import { bindUBOToProgram, UBOBindingIndex } from "../ubos";
import Layer from "../../Layer";

const enum Var {
   ATTRIBUTES_PER_VERTEX = 3,
   BORDER_THICKNESS = 4
}

let program: WebGLProgram;

// @INCOMPLETE!
// const visibleWallBorderInfos: Array<RenderChunkWallBorderInfo> = [];

export function createWallBorderShaders(): void {
   const vertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in float a_colour;

   out float v_colour;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);

      v_colour = a_colour;
   }
   `;
   
   const fragmentShaderText = `#version 300 es
   precision mediump float;
   
   in float v_colour;
   
   out vec4 outputColour;
   
   void main() {
      if (v_colour == 0.0) {
         outputColour = vec4(0.15, 0.15, 0.15, 1.0);
      } else {
         outputColour = vec4(0.15, 0.15, 0.15, 0.3);
      }
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   bindUBOToProgram(gl, program, UBOBindingIndex.CAMERA);
}

const setVertices = (vertexData: Float32Array, dataOffset: number, tlX: number, tlY: number, trX: number, trY: number, blX: number, blY: number, brX: number, brY: number, isBackColour: boolean): void => {
   const isBackColourInt = isBackColour ? 1 : 0;

   vertexData[dataOffset] = blX;
   vertexData[dataOffset + 1] = blY;
   vertexData[dataOffset + 2] = isBackColourInt;

   vertexData[dataOffset + 3] = brX;
   vertexData[dataOffset + 4] = brY;
   vertexData[dataOffset + 5] = isBackColourInt;

   vertexData[dataOffset + 6] = tlX;
   vertexData[dataOffset + 7] = tlY;
   vertexData[dataOffset + 8] = isBackColourInt;

   vertexData[dataOffset + 9] = tlX;
   vertexData[dataOffset + 10] = tlY;
   vertexData[dataOffset + 11] = isBackColourInt;

   vertexData[dataOffset + 12] = brX;
   vertexData[dataOffset + 13] = brY;
   vertexData[dataOffset + 14] = isBackColourInt;

   vertexData[dataOffset + 15] = trX;
   vertexData[dataOffset + 16] = trY;
   vertexData[dataOffset + 17] = isBackColourInt;
}

const addTopVertices = (vertexData: Float32Array, dataOffset: number, floorMarkers: number, subtileX: number, subtileY: number, isBackColour: boolean): number => {
   const hasLeftWall = (floorMarkers & EdgeMarkerBit.left) === 0;
   const hasRightWall = (floorMarkers & EdgeMarkerBit.right) === 0;

   const leftOvershoot = hasLeftWall ? Var.BORDER_THICKNESS : 0;
   const rightOvershoot = hasRightWall ? Var.BORDER_THICKNESS : 0;

   let tlX = subtileX * Settings.SUBTILE_SIZE - leftOvershoot;
   let blX = tlX;
   let trX = (subtileX + 1) * Settings.SUBTILE_SIZE + rightOvershoot;
   let brX = trX
   let blY = (subtileY + 1) * Settings.SUBTILE_SIZE - Var.BORDER_THICKNESS;
   let brY = blY;
   let tlY = (subtileY + 1) * Settings.SUBTILE_SIZE;
   let trY = tlY;

   if (isBackColour) {
      const leftOvershoot = hasLeftWall ? Var.BORDER_THICKNESS :-Var.BORDER_THICKNESS;
      const rightOvershoot = hasRightWall ? Var.BORDER_THICKNESS : -Var.BORDER_THICKNESS

      tlX -= leftOvershoot;
      blX -= leftOvershoot;
      trX += rightOvershoot;
      brX += rightOvershoot;
      blY -= Var.BORDER_THICKNESS;
      brY -= Var.BORDER_THICKNESS;
      tlY -= Var.BORDER_THICKNESS;
      trY -= Var.BORDER_THICKNESS;

      // If no wall to the left, create an indent
      if (!hasLeftWall) {
         blX += Var.BORDER_THICKNESS;
      // If continuing straight, don't overlap with the wall to the left
      } else if ((floorMarkers & EdgeMarkerBit.topLeft) !== 0) {
         // Don't overlap with wall to the left
         blX += Var.BORDER_THICKNESS * 2;
         tlX += Var.BORDER_THICKNESS * 2;
      // If creating an internal corner, add an indent
      } else {
         tlX += Var.BORDER_THICKNESS;
      }

      // If no wall to the right, create an indent
      if (!hasRightWall) {
         brX -= Var.BORDER_THICKNESS;
      // If continuing straight, don't overlap with the wall to the right
      } else if ((floorMarkers & EdgeMarkerBit.topRight) !== 0) {
         // Don't overlap with wall to the right
         brX -= Var.BORDER_THICKNESS * 2;
         trX -= Var.BORDER_THICKNESS * 2;
      // If creating an internal corner, add an indent
      } else {
         trX -= Var.BORDER_THICKNESS;
      }
   }
   setVertices(vertexData, dataOffset, tlX, tlY, trX, trY, blX, blY, brX, brY, isBackColour);
   return dataOffset + 6 * Var.ATTRIBUTES_PER_VERTEX;
}

const addRightVertices = (vertexData: Float32Array, dataOffset: number, floorMarkers: number, subtileX: number, subtileY: number, isBackColour: boolean): number => {
   const hasTopWall = (floorMarkers & EdgeMarkerBit.top) === 0;
   const hasBottomWall = (floorMarkers & EdgeMarkerBit.bottom) === 0;
   
   const topOvershoot = hasTopWall ? Var.BORDER_THICKNESS : 0;
   const bottomOvershoot = hasBottomWall ? Var.BORDER_THICKNESS : 0;

   let tlX = (subtileX + 1) * Settings.SUBTILE_SIZE - Var.BORDER_THICKNESS;
   let blX = tlX;
   let trX = (subtileX + 1) * Settings.SUBTILE_SIZE;
   let brX = trX;
   let blY = subtileY * Settings.SUBTILE_SIZE - bottomOvershoot;
   let brY = blY;
   let tlY = (subtileY + 1) * Settings.SUBTILE_SIZE + topOvershoot;
   let trY = tlY;
   if (isBackColour) {
      const topOvershoot = hasTopWall ? Var.BORDER_THICKNESS : -Var.BORDER_THICKNESS;
      const bottomOvershoot = hasBottomWall ? Var.BORDER_THICKNESS : -Var.BORDER_THICKNESS;

      tlX -= Var.BORDER_THICKNESS;
      blX -= Var.BORDER_THICKNESS;
      trX -= Var.BORDER_THICKNESS;
      brX -= Var.BORDER_THICKNESS;
      blY -= bottomOvershoot;
      brY -= bottomOvershoot;
      tlY += topOvershoot;
      trY += topOvershoot;

      // If no wall to the bottom, create an indent
      if (!hasBottomWall) {
         blY += Var.BORDER_THICKNESS;
      // If continuing straight, don't overlap with the wall to the bottom
      } else if ((floorMarkers & EdgeMarkerBit.bottomRight) !== 0) {
         blY += Var.BORDER_THICKNESS * 2;
         brY += Var.BORDER_THICKNESS * 2;
      // If creating an internal corner, add an indent
      } else {
         brY += Var.BORDER_THICKNESS;
      }

      // If no wall to the top, create an indent
      if (!hasTopWall) {
         tlY -= Var.BORDER_THICKNESS;
      // If continuing straight, don't overlap with the wall to the top
      } else if ((floorMarkers & EdgeMarkerBit.topRight) !== 0) {
         tlY -= Var.BORDER_THICKNESS * 2;
         trY -= Var.BORDER_THICKNESS * 2;
      // If creating an internal corner, add an indent
      } else {
         trY -= Var.BORDER_THICKNESS;
      }
   }
   setVertices(vertexData, dataOffset, tlX, tlY, trX, trY, blX, blY, brX, brY, isBackColour);
   return dataOffset + 6 * Var.ATTRIBUTES_PER_VERTEX;
}

const addBottomVertices = (vertexData: Float32Array, dataOffset: number, floorMarkers: number, subtileX: number, subtileY: number, isBackColour: boolean): number => {
   const hasLeftWall = (floorMarkers & EdgeMarkerBit.left) === 0;
   const hasRightWall = (floorMarkers & EdgeMarkerBit.right) === 0;
   
   const leftOvershoot = hasLeftWall ? Var.BORDER_THICKNESS : 0;
   const rightOvershoot = hasRightWall ? Var.BORDER_THICKNESS : 0;

   let tlX = subtileX * Settings.SUBTILE_SIZE - leftOvershoot;
   let blX = tlX;
   let trX = (subtileX + 1) * Settings.SUBTILE_SIZE + rightOvershoot;
   let brX = trX;
   let blY = subtileY * Settings.SUBTILE_SIZE;
   let brY = blY;
   let tlY = subtileY * Settings.SUBTILE_SIZE + Var.BORDER_THICKNESS;
   let trY = tlY;
   if (isBackColour) {
      const leftOvershoot = hasLeftWall ? Var.BORDER_THICKNESS : -Var.BORDER_THICKNESS;
      const rightOvershoot = hasRightWall ? Var.BORDER_THICKNESS : -Var.BORDER_THICKNESS;

      tlX -= leftOvershoot;
      blX -= leftOvershoot;
      trX += rightOvershoot;
      brX += rightOvershoot;
      blY += Var.BORDER_THICKNESS;
      brY += Var.BORDER_THICKNESS;
      tlY += Var.BORDER_THICKNESS;
      trY += Var.BORDER_THICKNESS;

      // If no wall to the left, create an indent
      if (!hasLeftWall) {
         tlX += Var.BORDER_THICKNESS;
      // If continuing straight, don't overlap with the wall to the left
      } else if ((floorMarkers & EdgeMarkerBit.bottomLeft) !== 0) {
         tlX += Var.BORDER_THICKNESS * 2;
         blX += Var.BORDER_THICKNESS * 2;
      // If creating an internal corner, add an indent
      } else {
         blX += Var.BORDER_THICKNESS;
      }

      // If no wall to the right, create an indent
      if (!hasRightWall) {
         trX -= Var.BORDER_THICKNESS;
      // If continuing straight, don't overlap with the wall to the right
      } else if ((floorMarkers & EdgeMarkerBit.bottomRight) !== 0) {
         trX -= Var.BORDER_THICKNESS * 2;
         brX -= Var.BORDER_THICKNESS * 2;
      // If creating an internal corner, add an indent
      } else {
         brX -= Var.BORDER_THICKNESS;
      }
   }
   setVertices(vertexData, dataOffset, tlX, tlY, trX, trY, blX, blY, brX, brY, isBackColour);
   return dataOffset + 6 * Var.ATTRIBUTES_PER_VERTEX;
}

const addLeftVertices = (vertexData: Float32Array, dataOffset: number, floorMarkers: number, subtileX: number, subtileY: number, isBackColour: boolean): number => {
   const hasTopWall = (floorMarkers & EdgeMarkerBit.top) === 0;
   const hasBottomWall = (floorMarkers & EdgeMarkerBit.bottom) === 0;
   
   const topOvershoot = hasTopWall ? Var.BORDER_THICKNESS : 0;
   const bottomOvershoot = hasBottomWall ? Var.BORDER_THICKNESS : 0;

   let tlX = subtileX * Settings.SUBTILE_SIZE;
   let blX = tlX;
   let trX = subtileX * Settings.SUBTILE_SIZE + Var.BORDER_THICKNESS;
   let brX = trX;
   let blY = subtileY * Settings.SUBTILE_SIZE - bottomOvershoot;
   let brY = blY;
   let tlY = (subtileY + 1) * Settings.SUBTILE_SIZE + topOvershoot;
   let trY = tlY;
   if (isBackColour) {
      const topOvershoot = hasTopWall ? Var.BORDER_THICKNESS : -Var.BORDER_THICKNESS;
      const bottomOvershoot = hasBottomWall ? Var.BORDER_THICKNESS : -Var.BORDER_THICKNESS;

      tlX += Var.BORDER_THICKNESS;
      blX += Var.BORDER_THICKNESS;
      trX += Var.BORDER_THICKNESS;
      brX += Var.BORDER_THICKNESS;
      blY -= bottomOvershoot;
      brY -= bottomOvershoot;
      tlY += topOvershoot;
      trY += topOvershoot;

      // If no wall to the bottom, create an indent
      if (!hasBottomWall) {
         brY += Var.BORDER_THICKNESS;
      // If continuing straight, don't overlap with the wall to the bottom
      } else if ((floorMarkers & EdgeMarkerBit.bottomLeft) !== 0) {
         brY += Var.BORDER_THICKNESS * 2;
         blY += Var.BORDER_THICKNESS * 2;
      // If creating an internal corner, add an indent
      } else {
         blY += Var.BORDER_THICKNESS;
      }

      // If no wall to the top, create an indent
      if (!hasTopWall) {
         trY -= Var.BORDER_THICKNESS;
      // If continuing straight, don't overlap with the wall to the top
      } else if ((floorMarkers & EdgeMarkerBit.topLeft) !== 0) {
         trY -= Var.BORDER_THICKNESS * 2;
         tlY -= Var.BORDER_THICKNESS * 2;
      // If creating an internal corner, add an indent
      } else {
         tlY -= Var.BORDER_THICKNESS;
      }
   }
   setVertices(vertexData, dataOffset, tlX, tlY, trX, trY, blX, blY, brX, brY, isBackColour);
   return dataOffset + 6 * Var.ATTRIBUTES_PER_VERTEX;
}

const calculateVertexData = (info: RenderChunkEdgeInfo): Float32Array => {
   // @SPEEDD!! waaay overshoot this (hacky * 8) cuz currently can't tell the actual number of edges
   const vertexData = new Float32Array(info.length * 6 * Var.ATTRIBUTES_PER_VERTEX * 8);
   
   let dataOffset = 0;
   for (let i = 0; i < info.length; i++) {
      const data = info[i];
      const subtileIndex = data >> 8;
      const floorMarkers = data & 0xFF;

      const subtileX = getSubtileX(subtileIndex);
      const subtileY = getSubtileY(subtileIndex);

      // Top border
      if ((floorMarkers & EdgeMarkerBit.top) !== 0) {
         dataOffset = addTopVertices(vertexData, dataOffset, floorMarkers, subtileX, subtileY, true);
         dataOffset = addTopVertices(vertexData, dataOffset, floorMarkers, subtileX, subtileY, false);
      }
      // Right border
      if ((floorMarkers & EdgeMarkerBit.right) !== 0) {
         dataOffset = addRightVertices(vertexData, dataOffset, floorMarkers, subtileX, subtileY, true);
         dataOffset = addRightVertices(vertexData, dataOffset, floorMarkers, subtileX, subtileY, false);
      }
      // Bottom border
      if ((floorMarkers & EdgeMarkerBit.bottom) !== 0) {
         dataOffset = addBottomVertices(vertexData, dataOffset, floorMarkers, subtileX, subtileY, true);
         dataOffset = addBottomVertices(vertexData, dataOffset, floorMarkers, subtileX, subtileY, false);
      }
      // Left border
      if ((floorMarkers & EdgeMarkerBit.left) !== 0) {
         dataOffset = addLeftVertices(vertexData, dataOffset, floorMarkers, subtileX, subtileY, true);
         dataOffset = addLeftVertices(vertexData, dataOffset, floorMarkers, subtileX, subtileY, false);
      }
   }

   return vertexData;
}

export function calculateWallBorderInfo(edgeInfo: RenderChunkEdgeInfo): RenderChunkWallBorderInfo | null {
   const vertexData = calculateVertexData(edgeInfo);
   if (vertexData.length === 0) {
      return null;
   }

   const vao = gl.createVertexArray();
   gl.bindVertexArray(vao);

   const buffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 3 * Bytes.Float32, 0);
   gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 3 * Bytes.Float32, 2 * Bytes.Float32);
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);

   gl.bindVertexArray(null);

   return {
      vao: vao,
      buffer: buffer,
      vertexData: vertexData
   };
}

export function recalculateWallBorders(layer: Layer, renderChunkIdx: number, edgeInfo: RenderChunkEdgeInfo): void {
   const wallBorderInfo = getRenderChunkWallBorderInfo(layer, renderChunkIdx);
   if (wallBorderInfo !== null) {
      wallBorderInfo.vertexData = calculateVertexData(edgeInfo);
      
      gl.bindVertexArray(wallBorderInfo.vao);
      
      gl.bindBuffer(gl.ARRAY_BUFFER, wallBorderInfo.buffer);
      // @Speed
      gl.bufferData(gl.ARRAY_BUFFER, wallBorderInfo.vertexData, gl.STATIC_DRAW);
      
      gl.bindVertexArray(null);
   } else {
      const data = calculateWallBorderInfo(edgeInfo);
      if (data !== null) {
         setRenderChunkWallBorderInfo(layer, renderChunkIdx, data);
      }
   }
}

export function renderWallBorders(layer: Layer): void {
   // @Hack @Speed
   let hasVisibleWallBorder = false;
   
   for (let renderChunkY = minVisibleRenderChunkY; renderChunkY <= maxVisibleRenderChunkY; renderChunkY++) {
      for (let renderChunkX = minVisibleRenderChunkX; renderChunkX <= maxVisibleRenderChunkX; renderChunkX++) {
         const renderChunkIdx = getRenderChunkIndex(renderChunkX, renderChunkY);

         const wallBorderInfo = getRenderChunkWallBorderInfo(layer, renderChunkIdx);
         if (wallBorderInfo !== null) {
            hasVisibleWallBorder = true;
            break;
         }
      }
   }
   if (!hasVisibleWallBorder) {
      return;
   }

   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
   
   // @Speed: Lots of continues!
   for (let renderChunkY = minVisibleRenderChunkY; renderChunkY <= maxVisibleRenderChunkY; renderChunkY++) {
      for (let renderChunkX = minVisibleRenderChunkX; renderChunkX <= maxVisibleRenderChunkX; renderChunkX++) {
         const renderChunkIdx = getRenderChunkIndex(renderChunkX, renderChunkY);

         const wallBorderInfo = getRenderChunkWallBorderInfo(layer, renderChunkIdx);
         if (wallBorderInfo === null) {
            continue;
         }

         gl.bindVertexArray(wallBorderInfo.vao);
         gl.drawArrays(gl.TRIANGLES, 0, wallBorderInfo.vertexData.length / Var.ATTRIBUTES_PER_VERTEX);
      }
   }

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);

   gl.bindVertexArray(null);
}
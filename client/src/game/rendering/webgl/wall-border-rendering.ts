import { Settings } from "battletribes-shared/settings";
import { maxVisibleRenderChunkX, maxVisibleRenderChunkY, minVisibleRenderChunkX, minVisibleRenderChunkY } from "../../camera";
import { createWebGLProgram, gl } from "../../webgl";
import { RenderChunkWallBorderInfo, getRenderChunkMaxTileX, getRenderChunkMaxTileY, getRenderChunkMinTileX, getRenderChunkMinTileY, getRenderChunkWallBorderInfo } from "../render-chunks";
import { bindUBOToProgram, UBOBindingIndex } from "../ubos";
import Layer, { subtileIsInWorld } from "../../Layer";

const enum Vars {
   ATTRIBUTES_PER_VERTEX = 3
}

const BORDER_THICKNESS = 4;

let program: WebGLProgram;

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
      //  @Temporary
         outputColour = vec4(0.15, 0.15, 0.15, 0.3);
         // outputColour = vec4(1.0, 0.0, 0.0, 0.);
      }
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   bindUBOToProgram(gl, program, UBOBindingIndex.CAMERA);
}

const addVertices = (vertices: Array<number>, tlX: number, tlY: number, trX: number, trY: number, blX: number, blY: number, brX: number, brY: number, isBackColour: boolean): void => {
   const isBackColourInt = isBackColour ? 1 : 0;
   vertices.push(
      blX, blY, isBackColourInt,
      brX, brY, isBackColourInt,
      tlX, tlY, isBackColourInt,
      tlX, tlY, isBackColourInt,
      brX, brY, isBackColourInt,
      trX, trY, isBackColourInt
   );
}

const addTopVertices = (vertices: Array<number>, layer: Layer, subtileX: number, subtileY: number, isBackColour: boolean): void => {
   const leftOvershoot = subtileIsInWorld(subtileX - 1, subtileY) && layer.subtileIsWall(subtileX - 1, subtileY) ? BORDER_THICKNESS : 0;
   const rightOvershoot = subtileIsInWorld(subtileX + 1, subtileY) && layer.subtileIsWall(subtileX + 1, subtileY) ? BORDER_THICKNESS : 0;

   let tlX = subtileX * Settings.SUBTILE_SIZE - leftOvershoot;
   let blX = tlX;
   let trX = (subtileX + 1) * Settings.SUBTILE_SIZE + rightOvershoot;
   let brX = trX
   let blY = (subtileY + 1) * Settings.SUBTILE_SIZE - BORDER_THICKNESS;
   let brY = blY;
   let tlY = (subtileY + 1) * Settings.SUBTILE_SIZE;
   let trY = tlY;

   if (isBackColour) {
      const leftOvershoot = subtileIsInWorld(subtileX - 1, subtileY) && layer.subtileIsWall(subtileX - 1, subtileY) ? BORDER_THICKNESS : -BORDER_THICKNESS;
      const rightOvershoot = subtileIsInWorld(subtileX + 1, subtileY) && layer.subtileIsWall(subtileX + 1, subtileY) ? BORDER_THICKNESS : -BORDER_THICKNESS;

      tlX -= leftOvershoot;
      blX -= leftOvershoot;
      trX += rightOvershoot;
      brX += rightOvershoot;
      blY -= BORDER_THICKNESS;
      brY -= BORDER_THICKNESS;
      tlY -= BORDER_THICKNESS;
      trY -= BORDER_THICKNESS;

      // If no wall to the left, create an indent
      if (!layer.subtileIsWall(subtileX - 1, subtileY)) {
         blX += BORDER_THICKNESS;
      // If continuing straight, don't overlap with the wall to the left
      } else if (!layer.subtileIsWall(subtileX - 1, subtileY + 1)) {
         // Don't overlap with wall to the left
         blX += BORDER_THICKNESS * 2;
         tlX += BORDER_THICKNESS * 2;
      // If creating an internal corner, add an indent
      } else {
         tlX += BORDER_THICKNESS;
      }

      // If no wall to the right, create an indent
      if (!layer.subtileIsWall(subtileX + 1, subtileY)) {
         brX -= BORDER_THICKNESS;
      // If continuing straight, don't overlap with the wall to the right
      } else if (!layer.subtileIsWall(subtileX + 1, subtileY + 1)) {
         // Don't overlap with wall to the right
         brX -= BORDER_THICKNESS * 2;
         trX -= BORDER_THICKNESS * 2;
      // If creating an internal corner, add an indent
      } else {
         trX -= BORDER_THICKNESS;
      }
   }
   addVertices(vertices, tlX, tlY, trX, trY, blX, blY, brX, brY, isBackColour);
}

const addRightVertices = (vertices: Array<number>, layer: Layer, subtileX: number, subtileY: number, isBackColour: boolean): void => {
   const topOvershoot = subtileIsInWorld(subtileX, subtileY + 1) && layer.subtileIsWall(subtileX, subtileY + 1) ? BORDER_THICKNESS : 0;
   const bottomOvershoot = subtileIsInWorld(subtileX, subtileY - 1) && layer.subtileIsWall(subtileX, subtileY - 1) ? BORDER_THICKNESS : 0;

   let tlX = (subtileX + 1) * Settings.SUBTILE_SIZE - BORDER_THICKNESS;
   let blX = tlX;
   let trX = (subtileX + 1) * Settings.SUBTILE_SIZE;
   let brX = trX;
   let blY = subtileY * Settings.SUBTILE_SIZE - bottomOvershoot;
   let brY = blY;
   let tlY = (subtileY + 1) * Settings.SUBTILE_SIZE + topOvershoot;
   let trY = tlY;
   if (isBackColour) {
      const topOvershoot = subtileIsInWorld(subtileX, subtileY + 1) && layer.subtileIsWall(subtileX, subtileY + 1) ? BORDER_THICKNESS : -BORDER_THICKNESS;
      const bottomOvershoot = subtileIsInWorld(subtileX, subtileY - 1) && layer.subtileIsWall(subtileX, subtileY - 1) ? BORDER_THICKNESS : -BORDER_THICKNESS;

      tlX -= BORDER_THICKNESS;
      blX -= BORDER_THICKNESS;
      trX -= BORDER_THICKNESS;
      brX -= BORDER_THICKNESS;
      blY -= bottomOvershoot;
      brY -= bottomOvershoot;
      tlY += topOvershoot;
      trY += topOvershoot;

      // If no wall to the bottom, create an indent
      if (!layer.subtileIsWall(subtileX, subtileY - 1)) {
         blY += BORDER_THICKNESS;
      // If continuing straight, don't overlap with the wall to the bottom
      } else if (!layer.subtileIsWall(subtileX + 1, subtileY - 1)) {
         blY += BORDER_THICKNESS * 2;
         brY += BORDER_THICKNESS * 2;
      // If creating an internal corner, add an indent
      } else {
         brY += BORDER_THICKNESS;
      }

      // If no wall to the top, create an indent
      if (!layer.subtileIsWall(subtileX, subtileY + 1)) {
         tlY -= BORDER_THICKNESS;
      // If continuing straight, don't overlap with the wall to the top
      } else if (!layer.subtileIsWall(subtileX + 1, subtileY + 1)) {
         tlY -= BORDER_THICKNESS * 2;
         trY -= BORDER_THICKNESS * 2;
      // If creating an internal corner, add an indent
      } else {
         trY -= BORDER_THICKNESS;
      }
   }
   addVertices(vertices, tlX, tlY, trX, trY, blX, blY, brX, brY, isBackColour);
}

const addBottomVertices = (vertices: Array<number>, layer: Layer, subtileX: number, subtileY: number, isBackColour: boolean): void => {
   const leftOvershoot = subtileIsInWorld(subtileX - 1, subtileY) && layer.subtileIsWall(subtileX - 1, subtileY) ? BORDER_THICKNESS : 0;
   const rightOvershoot = subtileIsInWorld(subtileX + 1, subtileY) && layer.subtileIsWall(subtileX + 1, subtileY) ? BORDER_THICKNESS : 0;

   let tlX = subtileX * Settings.SUBTILE_SIZE - leftOvershoot;
   let blX = tlX;
   let trX = (subtileX + 1) * Settings.SUBTILE_SIZE + rightOvershoot;
   let brX = trX;
   let blY = subtileY * Settings.SUBTILE_SIZE;
   let brY = blY;
   let tlY = subtileY * Settings.SUBTILE_SIZE + BORDER_THICKNESS;
   let trY = tlY;
   if (isBackColour) {
      const leftOvershoot = subtileIsInWorld(subtileX - 1, subtileY) && layer.subtileIsWall(subtileX - 1, subtileY) ? BORDER_THICKNESS : -BORDER_THICKNESS;
      const rightOvershoot = subtileIsInWorld(subtileX + 1, subtileY) && layer.subtileIsWall(subtileX + 1, subtileY) ? BORDER_THICKNESS : -BORDER_THICKNESS;

      tlX -= leftOvershoot;
      blX -= leftOvershoot;
      trX += rightOvershoot;
      brX += rightOvershoot;
      blY += BORDER_THICKNESS;
      brY += BORDER_THICKNESS;
      tlY += BORDER_THICKNESS;
      trY += BORDER_THICKNESS;

      // If no wall to the left, create an indent
      if (!layer.subtileIsWall(subtileX - 1, subtileY)) {
         tlX += BORDER_THICKNESS;
      // If continuing straight, don't overlap with the wall to the left
      } else if (!layer.subtileIsWall(subtileX - 1, subtileY - 1)) {
         tlX += BORDER_THICKNESS * 2;
         blX += BORDER_THICKNESS * 2;
      // If creating an internal corner, add an indent
      } else {
         blX += BORDER_THICKNESS;
      }

      // If no wall to the right, create an indent
      if (!layer.subtileIsWall(subtileX + 1, subtileY)) {
         trX -= BORDER_THICKNESS;
      // If continuing straight, don't overlap with the wall to the right
      } else if (!layer.subtileIsWall(subtileX + 1, subtileY - 1)) {
         trX -= BORDER_THICKNESS * 2;
         brX -= BORDER_THICKNESS * 2;
      // If creating an internal corner, add an indent
      } else {
         brX -= BORDER_THICKNESS;
      }
   }
   addVertices(vertices, tlX, tlY, trX, trY, blX, blY, brX, brY, isBackColour);
}

const addLeftVertices = (vertices: Array<number>, layer: Layer, subtileX: number, subtileY: number, isBackColour: boolean): void => {
   const topOvershoot = subtileIsInWorld(subtileX, subtileY + 1) && layer.subtileIsWall(subtileX, subtileY + 1) ? BORDER_THICKNESS : 0;
   const bottomOvershoot = subtileIsInWorld(subtileX, subtileY - 1) && layer.subtileIsWall(subtileX, subtileY - 1) ? BORDER_THICKNESS : 0;

   let tlX = subtileX * Settings.SUBTILE_SIZE;
   let blX = tlX;
   let trX = subtileX * Settings.SUBTILE_SIZE + BORDER_THICKNESS;
   let brX = trX;
   let blY = subtileY * Settings.SUBTILE_SIZE - bottomOvershoot;
   let brY = blY;
   let tlY = (subtileY + 1) * Settings.SUBTILE_SIZE + topOvershoot;
   let trY = tlY;
   if (isBackColour) {
      const topOvershoot = subtileIsInWorld(subtileX, subtileY + 1) && layer.subtileIsWall(subtileX, subtileY + 1) ? BORDER_THICKNESS : -BORDER_THICKNESS;
      const bottomOvershoot = subtileIsInWorld(subtileX, subtileY - 1) && layer.subtileIsWall(subtileX, subtileY - 1) ? BORDER_THICKNESS : -BORDER_THICKNESS;

      tlX += BORDER_THICKNESS;
      blX += BORDER_THICKNESS;
      trX += BORDER_THICKNESS;
      brX += BORDER_THICKNESS;
      blY -= bottomOvershoot;
      brY -= bottomOvershoot;
      tlY += topOvershoot;
      trY += topOvershoot;

      // If no wall to the bottom, create an indent
      if (!layer.subtileIsWall(subtileX, subtileY - 1)) {
         brY += BORDER_THICKNESS;
      // If continuing straight, don't overlap with the wall to the bottom
      } else if (!layer.subtileIsWall(subtileX - 1, subtileY - 1)) {
         brY += BORDER_THICKNESS * 2;
         blY += BORDER_THICKNESS * 2;
      // If creating an internal corner, add an indent
      } else {
         blY += BORDER_THICKNESS;
      }

      // If no wall to the top, create an indent
      if (!layer.subtileIsWall(subtileX, subtileY + 1)) {
         trY -= BORDER_THICKNESS;
      // If continuing straight, don't overlap with the wall to the top
      } else if (!layer.subtileIsWall(subtileX - 1, subtileY + 1)) {
         trY -= BORDER_THICKNESS * 2;
         tlY -= BORDER_THICKNESS * 2;
      // If creating an internal corner, add an indent
      } else {
         tlY -= BORDER_THICKNESS;
      }
   }
   addVertices(vertices, tlX, tlY, trX, trY, blX, blY, brX, brY, isBackColour);
}

const calculateVertexData = (layer: Layer, renderChunkX: number, renderChunkY: number): Float32Array => {
   const minTileX = getRenderChunkMinTileX(renderChunkX);
   const maxTileX = getRenderChunkMaxTileX(renderChunkX);
   const minTileY = getRenderChunkMinTileY(renderChunkY);
   const maxTileY = getRenderChunkMaxTileY(renderChunkY);
   
   const minSubtileX = minTileX * 4;
   const maxSubtileX = maxTileX * 4 + 3;
   const minSubtileY = minTileY * 4;
   const maxSubtileY = maxTileY * 4 + 3;

   // Find all wall tiles in the render chunk, and categorise them based on what borders they have
   const vertices = new Array<number>();
   for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
      for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
         if (!layer.subtileIsWall(subtileX, subtileY)) {
            continue;
         }

         // Top border
         if (subtileIsInWorld(subtileX, subtileY + 1) && !layer.subtileIsWall(subtileX, subtileY + 1)) {
            addTopVertices(vertices, layer, subtileX, subtileY, true);
            addTopVertices(vertices, layer, subtileX, subtileY, false);
         }
         // Right border
         if (subtileIsInWorld(subtileX + 1, subtileY) && !layer.subtileIsWall(subtileX + 1, subtileY)) {
            addRightVertices(vertices, layer, subtileX, subtileY, true);
            addRightVertices(vertices, layer, subtileX, subtileY, false);
         }
         // Bottom border
         if (subtileIsInWorld(subtileX, subtileY - 1) && !layer.subtileIsWall(subtileX, subtileY - 1)) {
            addBottomVertices(vertices, layer, subtileX, subtileY, true);
            addBottomVertices(vertices, layer, subtileX, subtileY, false);
         }
         // Left border
         if (subtileIsInWorld(subtileX - 1, subtileY) && !layer.subtileIsWall(subtileX - 1, subtileY)) {
            addLeftVertices(vertices, layer, subtileX, subtileY, true);
            addLeftVertices(vertices, layer, subtileX, subtileY, false);
         }
      }
   }

   return new Float32Array(vertices);
}

export function calculateWallBorderInfo(layer: Layer, renderChunkX: number, renderChunkY: number): RenderChunkWallBorderInfo {
   const vertexData = calculateVertexData(layer, renderChunkX, renderChunkY);

   const vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);

   gl.bindVertexArray(null);

   return {
      vao: vao,
      buffer: buffer,
      vertexData: vertexData
   };
}

export function recalculateWallBorders(layer: Layer, renderChunkX: number, renderChunkY: number): void {
   const wallBorderInfo = getRenderChunkWallBorderInfo(layer, renderChunkX, renderChunkY);

   wallBorderInfo.vertexData = calculateVertexData(layer, renderChunkX, renderChunkY);

   gl.bindVertexArray(wallBorderInfo.vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, wallBorderInfo.buffer);
   // @Speed
   gl.bufferData(gl.ARRAY_BUFFER, wallBorderInfo.vertexData, gl.STATIC_DRAW);
   
   gl.bindVertexArray(null);
}

export function renderWallBorders(layer: Layer): void {
   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
   
   // @Speed: Lots of continues!
   for (let renderChunkX = minVisibleRenderChunkX; renderChunkX <= maxVisibleRenderChunkX; renderChunkX++) {
      for (let renderChunkY = minVisibleRenderChunkY; renderChunkY <= maxVisibleRenderChunkY; renderChunkY++) {
         const wallBorderInfo = getRenderChunkWallBorderInfo(layer, renderChunkX, renderChunkY);
         if (wallBorderInfo === null) {
            continue;
         }

         gl.bindVertexArray(wallBorderInfo.vao);
         gl.drawArrays(gl.TRIANGLES, 0, wallBorderInfo.vertexData.length / Vars.ATTRIBUTES_PER_VERTEX);
      }
   }

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);

   gl.bindVertexArray(null);
}
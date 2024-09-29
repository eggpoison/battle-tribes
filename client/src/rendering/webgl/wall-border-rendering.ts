import { Settings } from "battletribes-shared/settings";
import Camera from "../../Camera";
import { createWebGLProgram, gl } from "../../webgl";
import { RenderChunkWallBorderInfo, getRenderChunkMaxTileX, getRenderChunkMaxTileY, getRenderChunkMinTileX, getRenderChunkMinTileY, getRenderChunkWallBorderInfo } from "../render-chunks";
import { bindUBOToProgram, UBOBindingIndex } from "../ubos";
import Layer, { tileIsInWorld, tileIsWithinEdge } from "../../Layer";

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
         outputColour = vec4(0.15, 0.15, 0.15, 0.4);
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

const addTopVertices = (vertices: Array<number>, layer: Layer, tileX: number, tileY: number, isBackColour: boolean): void => {
   const leftOvershoot = tileIsInWorld(tileX - 1, tileY) && layer.getTileFromCoords(tileX - 1, tileY).isWall ? BORDER_THICKNESS : 0;
   const rightOvershoot = tileIsInWorld(tileX + 1, tileY) && layer.getTileFromCoords(tileX + 1, tileY).isWall ? BORDER_THICKNESS : 0;

   let tlX = tileX * Settings.TILE_SIZE - leftOvershoot;
   let blX = tlX;
   let trX = (tileX + 1) * Settings.TILE_SIZE + rightOvershoot;
   let brX = trX
   let blY = (tileY + 1) * Settings.TILE_SIZE - BORDER_THICKNESS;
   let brY = blY;
   let tlY = (tileY + 1) * Settings.TILE_SIZE;
   let trY = tlY;

   if (isBackColour) {
      const leftOvershoot = tileIsInWorld(tileX - 1, tileY) && layer.getTileFromCoords(tileX - 1, tileY).isWall ? BORDER_THICKNESS : -BORDER_THICKNESS;
      const rightOvershoot = tileIsInWorld(tileX + 1, tileY) && layer.getTileFromCoords(tileX + 1, tileY).isWall ? BORDER_THICKNESS : -BORDER_THICKNESS;

      tlX -= leftOvershoot;
      blX -= leftOvershoot;
      trX += rightOvershoot;
      brX += rightOvershoot;
      blY -= BORDER_THICKNESS;
      brY -= BORDER_THICKNESS;
      tlY -= BORDER_THICKNESS;
      trY -= BORDER_THICKNESS;

      // If no wall to the left, create an indent
      if (!layer.tileIsWallFromCoords(tileX - 1, tileY)) {
         blX += BORDER_THICKNESS;
      // If continuing straight, don't overlap with the wall to the left
      } else if (!layer.tileIsWallFromCoords(tileX - 1, tileY + 1)) {
         // Don't overlap with wall to the left
         blX += BORDER_THICKNESS * 2;
         tlX += BORDER_THICKNESS * 2;
      // If creating an internal corner, add an indent
      } else {
         tlX += BORDER_THICKNESS;
      }

      // If no wall to the right, create an indent
      if (!layer.tileIsWallFromCoords(tileX + 1, tileY)) {
         brX -= BORDER_THICKNESS;
      // If continuing straight, don't overlap with the wall to the right
      } else if (!layer.tileIsWallFromCoords(tileX + 1, tileY + 1)) {
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

const addRightVertices = (vertices: Array<number>, layer: Layer, tileX: number, tileY: number, isBackColour: boolean): void => {
   const topOvershoot = tileIsWithinEdge(tileX, tileY + 1) && layer.getTileFromCoords(tileX, tileY + 1)?.isWall ? BORDER_THICKNESS : 0;
   const bottomOvershoot = tileIsWithinEdge(tileX, tileY - 1) && layer.getTileFromCoords(tileX, tileY - 1)?.isWall ? BORDER_THICKNESS : 0;

   let tlX = (tileX + 1) * Settings.TILE_SIZE - BORDER_THICKNESS;
   let blX = tlX;
   let trX = (tileX + 1) * Settings.TILE_SIZE;
   let brX = trX;
   let blY = tileY * Settings.TILE_SIZE - bottomOvershoot;
   let brY = blY;
   let tlY = (tileY + 1) * Settings.TILE_SIZE + topOvershoot;
   let trY = tlY;
   if (isBackColour) {
      const topOvershoot = tileIsWithinEdge(tileX, tileY + 1) && layer.getTileFromCoords(tileX, tileY + 1)?.isWall ? BORDER_THICKNESS : -BORDER_THICKNESS;
      const bottomOvershoot = tileIsWithinEdge(tileX, tileY - 1) && layer.getTileFromCoords(tileX, tileY - 1)?.isWall ? BORDER_THICKNESS : -BORDER_THICKNESS;

      tlX -= BORDER_THICKNESS;
      blX -= BORDER_THICKNESS;
      trX -= BORDER_THICKNESS;
      brX -= BORDER_THICKNESS;
      blY -= bottomOvershoot;
      brY -= bottomOvershoot;
      tlY += topOvershoot;
      trY += topOvershoot;

      // If no wall to the bottom, create an indent
      if (!layer.tileIsWallFromCoords(tileX, tileY - 1)) {
         blY += BORDER_THICKNESS;
      // If continuing straight, don't overlap with the wall to the bottom
      } else if (!layer.tileIsWallFromCoords(tileX + 1, tileY - 1)) {
         blY += BORDER_THICKNESS * 2;
         brY += BORDER_THICKNESS * 2;
      // If creating an internal corner, add an indent
      } else {
         brY += BORDER_THICKNESS;
      }

      // If no wall to the top, create an indent
      if (!layer.tileIsWallFromCoords(tileX, tileY + 1)) {
         tlY -= BORDER_THICKNESS;
      // If continuing straight, don't overlap with the wall to the top
      } else if (!layer.tileIsWallFromCoords(tileX + 1, tileY + 1)) {
         tlY -= BORDER_THICKNESS * 2;
         trY -= BORDER_THICKNESS * 2;
      // If creating an internal corner, add an indent
      } else {
         trY -= BORDER_THICKNESS;
      }
   }
   addVertices(vertices, tlX, tlY, trX, trY, blX, blY, brX, brY, isBackColour);
}

const addBottomVertices = (vertices: Array<number>, layer: Layer, tileX: number, tileY: number, isBackColour: boolean): void => {
   const leftOvershoot = tileIsWithinEdge(tileX - 1, tileY) && layer.getTileFromCoords(tileX - 1, tileY)?.isWall ? BORDER_THICKNESS : 0;
   const rightOvershoot = tileIsWithinEdge(tileX + 1, tileY) && layer.getTileFromCoords(tileX + 1, tileY)?.isWall ? BORDER_THICKNESS : 0;

   let tlX = tileX * Settings.TILE_SIZE - leftOvershoot;
   let blX = tlX;
   let trX = (tileX + 1) * Settings.TILE_SIZE + rightOvershoot;
   let brX = trX;
   let blY = tileY * Settings.TILE_SIZE;
   let brY = blY;
   let tlY = tileY * Settings.TILE_SIZE + BORDER_THICKNESS;
   let trY = tlY;
   if (isBackColour) {
      const leftOvershoot = tileIsWithinEdge(tileX - 1, tileY) && layer.getTileFromCoords(tileX - 1, tileY)?.isWall ? BORDER_THICKNESS : -BORDER_THICKNESS;
      const rightOvershoot = tileIsWithinEdge(tileX + 1, tileY) && layer.getTileFromCoords(tileX + 1, tileY)?.isWall ? BORDER_THICKNESS : -BORDER_THICKNESS;

      tlX -= leftOvershoot;
      blX -= leftOvershoot;
      trX += rightOvershoot;
      brX += rightOvershoot;
      blY += BORDER_THICKNESS;
      brY += BORDER_THICKNESS;
      tlY += BORDER_THICKNESS;
      trY += BORDER_THICKNESS;

      // If no wall to the left, create an indent
      if (!layer.tileIsWallFromCoords(tileX - 1, tileY)) {
         tlX += BORDER_THICKNESS;
      // If continuing straight, don't overlap with the wall to the left
      } else if (!layer.tileIsWallFromCoords(tileX - 1, tileY - 1)) {
         tlX += BORDER_THICKNESS * 2;
         blX += BORDER_THICKNESS * 2;
      // If creating an internal corner, add an indent
      } else {
         blX += BORDER_THICKNESS;
      }

      // If no wall to the right, create an indent
      if (!layer.tileIsWallFromCoords(tileX + 1, tileY)) {
         trX -= BORDER_THICKNESS;
      // If continuing straight, don't overlap with the wall to the right
      } else if (!layer.tileIsWallFromCoords(tileX + 1, tileY - 1)) {
         trX -= BORDER_THICKNESS * 2;
         brX -= BORDER_THICKNESS * 2;
      // If creating an internal corner, add an indent
      } else {
         brX -= BORDER_THICKNESS;
      }
   }
   addVertices(vertices, tlX, tlY, trX, trY, blX, blY, brX, brY, isBackColour);
}

const addLeftVertices = (vertices: Array<number>, layer: Layer, tileX: number, tileY: number, isBackColour: boolean): void => {
   const topOvershoot = tileIsInWorld(tileX, tileY + 1) && layer.getTileFromCoords(tileX, tileY + 1).isWall ? BORDER_THICKNESS : 0;
   const bottomOvershoot = tileIsInWorld(tileX, tileY - 1) && layer.getTileFromCoords(tileX, tileY - 1).isWall ? BORDER_THICKNESS : 0;

   let tlX = tileX * Settings.TILE_SIZE;
   let blX = tlX;
   let trX = tileX * Settings.TILE_SIZE + BORDER_THICKNESS;
   let brX = trX;
   let blY = tileY * Settings.TILE_SIZE - bottomOvershoot;
   let brY = blY;
   let tlY = (tileY + 1) * Settings.TILE_SIZE + topOvershoot;
   let trY = tlY;
   if (isBackColour) {
      const topOvershoot = tileIsInWorld(tileX, tileY + 1) && layer.getTileFromCoords(tileX, tileY + 1).isWall ? BORDER_THICKNESS : -BORDER_THICKNESS;
      const bottomOvershoot = tileIsInWorld(tileX, tileY - 1) && layer.getTileFromCoords(tileX, tileY - 1).isWall ? BORDER_THICKNESS : -BORDER_THICKNESS;

      tlX += BORDER_THICKNESS;
      blX += BORDER_THICKNESS;
      trX += BORDER_THICKNESS;
      brX += BORDER_THICKNESS;
      blY -= bottomOvershoot;
      brY -= bottomOvershoot;
      tlY += topOvershoot;
      trY += topOvershoot;

      // If no wall to the bottom, create an indent
      if (!layer.tileIsWallFromCoords(tileX, tileY - 1)) {
         brY += BORDER_THICKNESS;
      // If continuing straight, don't overlap with the wall to the bottom
      } else if (!layer.tileIsWallFromCoords(tileX - 1, tileY - 1)) {
         brY += BORDER_THICKNESS * 2;
         blY += BORDER_THICKNESS * 2;
      // If creating an internal corner, add an indent
      } else {
         blY += BORDER_THICKNESS;
      }

      // If no wall to the top, create an indent
      if (!layer.tileIsWallFromCoords(tileX, tileY + 1)) {
         trY -= BORDER_THICKNESS;
      // If continuing straight, don't overlap with the wall to the top
      } else if (!layer.tileIsWallFromCoords(tileX - 1, tileY + 1)) {
         trY -= BORDER_THICKNESS * 2;
         tlY -= BORDER_THICKNESS * 2;
      // If creating an internal corner, add an indent
      } else {
         tlY -= BORDER_THICKNESS;
      }
   }
   addVertices(vertices, tlX, tlY, trX, trY, blX, blY, brX, brY, isBackColour);
}

export function calculateWallBorderInfo(layer: Layer, renderChunkX: number, renderChunkY: number): RenderChunkWallBorderInfo {
   const minTileX = getRenderChunkMinTileX(renderChunkX);
   const maxTileX = getRenderChunkMaxTileX(renderChunkX);
   const minTileY = getRenderChunkMinTileY(renderChunkY);
   const maxTileY = getRenderChunkMaxTileY(renderChunkY);

   // Find all wall tiles in the render chunk, and categorise them based on what borders they have
   const vertices = new Array<number>();
   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const tile = layer.getTileFromCoords(tileX, tileY);
         if (!tile.isWall) {
            continue;
         }

         // Top border
         if (tileIsWithinEdge(tileX, tileY + 1) && !layer.getTileFromCoords(tileX, tileY + 1).isWall) {
            addTopVertices(vertices, layer, tile.x, tile.y, true);
            addTopVertices(vertices, layer, tile.x, tile.y, false);
         }
         // Right border
         if (tileIsWithinEdge(tileX + 1, tileY) && !layer.getTileFromCoords(tileX + 1, tileY).isWall) {
            addRightVertices(vertices, layer, tile.x, tile.y, true);
            addRightVertices(vertices, layer, tile.x, tile.y, false);
         }
         // Bottom border
         if (tileIsWithinEdge(tileX, tileY - 1) && !layer.getTileFromCoords(tileX, tileY - 1).isWall) {
            addBottomVertices(vertices, layer, tile.x, tile.y, true);
            addBottomVertices(vertices, layer, tile.x, tile.y, false);
         }
         // Left border
         if (tileIsWithinEdge(tileX - 1, tileY) && !layer.getTileFromCoords(tileX - 1, tileY).isWall) {
            addLeftVertices(vertices, layer, tile.x, tile.y, true);
            addLeftVertices(vertices, layer, tile.x, tile.y, false);
         }
      }
   }

   const vertexData = new Float32Array(vertices);

   const vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);

   return {
      vao: vao,
      vertexCount: vertices.length / 3
   };
}

export function renderWallBorders(layer: Layer): void {
   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
   
   // @Speed: Lots of continues!
   for (let renderChunkX = Camera.minVisibleRenderChunkX; renderChunkX <= Camera.maxVisibleRenderChunkX; renderChunkX++) {
      for (let renderChunkY = Camera.minVisibleRenderChunkY; renderChunkY <= Camera.maxVisibleRenderChunkY; renderChunkY++) {
         const wallBorderInfo = getRenderChunkWallBorderInfo(layer, renderChunkX, renderChunkY);
         if (wallBorderInfo === null) {
            continue;
         }

         gl.bindVertexArray(wallBorderInfo.vao);
         gl.drawArrays(gl.TRIANGLES, 0, wallBorderInfo.vertexCount);
      }
   }

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);

   gl.bindVertexArray(null);
}
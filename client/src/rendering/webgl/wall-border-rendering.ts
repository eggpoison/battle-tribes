import { Settings } from "webgl-test-shared/dist/settings";
import Camera from "../../Camera";
import { Tile } from "../../Tile";
import { createWebGLProgram, gl } from "../../webgl";
import Board from "../../Board";
import { RenderChunkWallBorderInfo, getRenderChunkMaxTileX, getRenderChunkMaxTileY, getRenderChunkMinTileX, getRenderChunkMinTileY, getRenderChunkWallBorderInfo } from "../render-chunks";
import { bindUBOToProgram, UBOBindingIndexes } from "../ubos";

const BORDER_THICKNESS = 5;

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
      outputColour = vec4(0.15, 0.15, 0.15, 1.0);
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   bindUBOToProgram(gl, program, UBOBindingIndexes.CAMERA);
}

export function calculateWallBorderInfo(renderChunkX: number, renderChunkY: number): RenderChunkWallBorderInfo {
   const minTileX = getRenderChunkMinTileX(renderChunkX);
   const maxTileX = getRenderChunkMaxTileX(renderChunkX);
   const minTileY = getRenderChunkMinTileY(renderChunkY);
   const maxTileY = getRenderChunkMaxTileY(renderChunkY);

   // Find all wall tiles in the render chunk, and categorise them based on what borders they have
   const topBorderTiles = new Array<Tile>();
   const rightBorderTiles = new Array<Tile>();
   const bottomBorderTiles = new Array<Tile>();
   const leftBorderTiles = new Array<Tile>();
   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const tile = Board.getTile(tileX, tileY);
         if (!tile.isWall) {
            continue;
         }

         // Top border
         if (Board.tileIsWithinEdge(tileX, tileY + 1) && !Board.getTile(tileX, tileY + 1)?.isWall) {
            topBorderTiles.push(tile);
         }
         // Right border
         if (Board.tileIsWithinEdge(tileX + 1, tileY) && !Board.getTile(tileX + 1, tileY)?.isWall) {
            rightBorderTiles.push(tile);
         }
         // Bottom border
         if (Board.tileIsWithinEdge(tileX, tileY - 1) && !Board.getTile(tileX, tileY - 1)?.isWall) {
            bottomBorderTiles.push(tile);
         }
         // Left border
         if (Board.tileIsWithinEdge(tileX - 1, tileY) && !Board.getTile(tileX - 1, tileY)?.isWall) {
            leftBorderTiles.push(tile);
         }
      }
   }

   // 
   // Calculate vertices
   // 

   let i = 0;
   const numBorders = topBorderTiles.length + rightBorderTiles.length + bottomBorderTiles.length + leftBorderTiles.length;
   const vertexData = new Float32Array(numBorders * 2 * 6);

   // Top borders
   for (const tile of topBorderTiles) {
      const leftOvershoot = Board.tileIsInBoard(tile.x - 1, tile.y) && Board.getTile(tile.x - 1, tile.y).isWall ? BORDER_THICKNESS : 0;
      const rightOvershoot = Board.tileIsInBoard(tile.x + 1, tile.y) && Board.getTile(tile.x + 1, tile.y).isWall ? BORDER_THICKNESS : 0;

      const x1 = tile.x * Settings.TILE_SIZE - leftOvershoot;
      const x2 = (tile.x + 1) * Settings.TILE_SIZE + rightOvershoot;
      const y1 = (tile.y + 1) * Settings.TILE_SIZE - BORDER_THICKNESS;
      const y2 = (tile.y + 1) * Settings.TILE_SIZE;

      const dataOffset = i * 2 * 6;
      vertexData[dataOffset] = x1;
      vertexData[dataOffset + 1] = y1;
      vertexData[dataOffset + 2] = x2;
      vertexData[dataOffset + 3] = y1;
      vertexData[dataOffset + 4] = x1;
      vertexData[dataOffset + 5] = y2;
      vertexData[dataOffset + 6] = x1;
      vertexData[dataOffset + 7] = y2;
      vertexData[dataOffset + 8] = x2;
      vertexData[dataOffset + 9] = y1;
      vertexData[dataOffset + 10] = x2;
      vertexData[dataOffset + 11] = y2;

      i++;
   }

   // Right borders
   for (const tile of rightBorderTiles) {
      const topOvershoot = Board.tileIsWithinEdge(tile.x, tile.y + 1) && Board.getTile(tile.x, tile.y + 1)?.isWall ? BORDER_THICKNESS : 0;
      const bottomOvershoot = Board.tileIsWithinEdge(tile.x, tile.y - 1) && Board.getTile(tile.x, tile.y - 1)?.isWall ? BORDER_THICKNESS : 0;

      const x1 = (tile.x + 1) * Settings.TILE_SIZE - BORDER_THICKNESS;
      const x2 = (tile.x + 1) * Settings.TILE_SIZE;
      const y1 = tile.y * Settings.TILE_SIZE - bottomOvershoot;
      const y2 = (tile.y + 1) * Settings.TILE_SIZE + topOvershoot;

      const dataOffset = i * 2 * 6;
      vertexData[dataOffset] = x1;
      vertexData[dataOffset + 1] = y1;
      vertexData[dataOffset + 2] = x2;
      vertexData[dataOffset + 3] = y1;
      vertexData[dataOffset + 4] = x1;
      vertexData[dataOffset + 5] = y2;
      vertexData[dataOffset + 6] = x1;
      vertexData[dataOffset + 7] = y2;
      vertexData[dataOffset + 8] = x2;
      vertexData[dataOffset + 9] = y1;
      vertexData[dataOffset + 10] = x2;
      vertexData[dataOffset + 11] = y2;

      i++;
   }

   // Bottom borders
   for (const tile of bottomBorderTiles) {
      const leftOvershoot = Board.tileIsWithinEdge(tile.x - 1, tile.y) && Board.getTile(tile.x - 1, tile.y)?.isWall ? BORDER_THICKNESS : 0;
      const rightOvershoot = Board.tileIsWithinEdge(tile.x + 1, tile.y) && Board.getTile(tile.x + 1, tile.y)?.isWall ? BORDER_THICKNESS : 0;

      const x1 = tile.x * Settings.TILE_SIZE - leftOvershoot;
      const x2 = (tile.x + 1) * Settings.TILE_SIZE + rightOvershoot;
      const y1 = tile.y * Settings.TILE_SIZE;
      const y2 = tile.y * Settings.TILE_SIZE + BORDER_THICKNESS;

      const dataOffset = i * 2 * 6;
      vertexData[dataOffset] = x1;
      vertexData[dataOffset + 1] = y1;
      vertexData[dataOffset + 2] = x2;
      vertexData[dataOffset + 3] = y1;
      vertexData[dataOffset + 4] = x1;
      vertexData[dataOffset + 5] = y2;
      vertexData[dataOffset + 6] = x1;
      vertexData[dataOffset + 7] = y2;
      vertexData[dataOffset + 8] = x2;
      vertexData[dataOffset + 9] = y1;
      vertexData[dataOffset + 10] = x2;
      vertexData[dataOffset + 11] = y2;

      i++;
   }

   // Left borders
   for (const tile of leftBorderTiles) {
      const topOvershoot = Board.tileIsInBoard(tile.x, tile.y + 1) && Board.getTile(tile.x, tile.y + 1).isWall ? BORDER_THICKNESS : 0;
      const bottomOvershoot = Board.tileIsInBoard(tile.x, tile.y - 1) && Board.getTile(tile.x, tile.y - 1).isWall ? BORDER_THICKNESS : 0;

      const x1 = tile.x * Settings.TILE_SIZE;
      const x2 = tile.x * Settings.TILE_SIZE + BORDER_THICKNESS;
      const y1 = tile.y * Settings.TILE_SIZE - bottomOvershoot;
      const y2 = (tile.y + 1) * Settings.TILE_SIZE + topOvershoot;

      const dataOffset = i * 2 * 6;
      vertexData[dataOffset] = x1;
      vertexData[dataOffset + 1] = y1;
      vertexData[dataOffset + 2] = x2;
      vertexData[dataOffset + 3] = y1;
      vertexData[dataOffset + 4] = x1;
      vertexData[dataOffset + 5] = y2;
      vertexData[dataOffset + 6] = x1;
      vertexData[dataOffset + 7] = y2;
      vertexData[dataOffset + 8] = x2;
      vertexData[dataOffset + 9] = y1;
      vertexData[dataOffset + 10] = x2;
      vertexData[dataOffset + 11] = y2;

      i++;
   }

   const vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.enableVertexAttribArray(0);

   return {
      vao: vao,
      vertexCount: numBorders * 6
   };
}

export function renderWallBorders(): void {
   gl.useProgram(program);
   
   for (let renderChunkX = Camera.minVisibleRenderChunkX; renderChunkX <= Camera.maxVisibleRenderChunkX; renderChunkX++) {
      for (let renderChunkY = Camera.minVisibleRenderChunkY; renderChunkY <= Camera.maxVisibleRenderChunkY; renderChunkY++) {
         const wallBorderInfo = getRenderChunkWallBorderInfo(renderChunkX, renderChunkY);
         if (wallBorderInfo === null) {
            continue;
         }

         gl.bindVertexArray(wallBorderInfo.vao);
         gl.drawArrays(gl.TRIANGLES, 0, wallBorderInfo.vertexCount);
      }
   }

   gl.bindVertexArray(null);
}
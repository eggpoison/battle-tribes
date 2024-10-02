import { Settings } from "battletribes-shared/settings";
import Camera from "../../Camera";
import { createWebGLProgram, gl } from "../../webgl";
import { RenderChunkTileShadowInfo, getRenderChunkTileShadowInfo, getRenderChunkMaxTileX, getRenderChunkMaxTileY, getRenderChunkMinTileX, getRenderChunkMinTileY } from "../render-chunks";
import { UBOBindingIndex, bindUBOToProgram } from "../ubos";
import Layer, { tileIsWithinEdge } from "../../Layer";
import { TileType } from "../../../../shared/src/tiles";

export const enum TileShadowType {
   dropdownShadow,
   wallShadow
}

interface TileShadowInfo {
   readonly tileX: number;
   readonly tileY: number;
   readonly bottomLeftMarker: number;
   readonly bottomRightMarker: number;
   readonly topLeftMarker: number;
   readonly topRightMarker: number;
   readonly topMarker: number;
   readonly rightMarker: number;
   readonly leftMarker: number;
   readonly bottomMarker: number;
}

let program: WebGLProgram;

export function createTileShadowShaders(): void {
   const vertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in vec2 a_texCoord;
   layout(location = 2) in float a_topLeftMarker;
   layout(location = 3) in float a_topRightMarker;
   layout(location = 4) in float a_bottomLeftMarker;
   layout(location = 5) in float a_bottomRightMarker;
   layout(location = 6) in float a_topMarker;
   layout(location = 7) in float a_rightMarker;
   layout(location = 8) in float a_leftMarker;
   layout(location = 9) in float a_bottomMarker;
   
   out vec2 v_texCoord;
   out float v_topLeftMarker;
   out float v_topRightMarker;
   out float v_bottomLeftMarker;
   out float v_bottomRightMarker;
   out float v_topMarker;
   out float v_rightMarker;
   out float v_leftMarker;
   out float v_bottomMarker;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);
   
      v_texCoord = a_texCoord;
      v_topLeftMarker = a_topLeftMarker;
      v_topRightMarker = a_topRightMarker;
      v_bottomLeftMarker = a_bottomLeftMarker;
      v_bottomRightMarker = a_bottomRightMarker;
      v_topMarker = a_topMarker;
      v_rightMarker = a_rightMarker;
      v_leftMarker = a_leftMarker;
      v_bottomMarker = a_bottomMarker;
   }
   `;
   
   const fragmentShaderText = `#version 300 es
   precision mediump float;
    
   in vec2 v_texCoord;
   in float v_topLeftMarker;
   in float v_topRightMarker;
   in float v_bottomLeftMarker;
   in float v_bottomRightMarker;
   in float v_topMarker;
   in float v_rightMarker;
   in float v_leftMarker;
   in float v_bottomMarker;
   
   out vec4 outputColour;
   
   void main() {
      float dist = 0.0;
      if (v_topLeftMarker > 0.5) {
         float topLeftDist = 1.0 - distance(vec2(0.0, 1.0), v_texCoord);
         dist = max(dist, topLeftDist - 0.5);
      }
      if (v_topRightMarker > 0.5) {
         float topRightDist = 1.0 - distance(vec2(1.0, 1.0), v_texCoord);
         dist = max(dist, topRightDist - 0.5);
      }
      if (v_bottomLeftMarker > 0.5) {
         float bottomLeftDist = 1.0 - distance(vec2(0.0, 0.0), v_texCoord);
         dist = max(dist, bottomLeftDist - 0.5);
      }
      if (v_bottomRightMarker > 0.5) {
         float bottomRightDist = 1.0 - distance(vec2(1.0, 0.0), v_texCoord);
         dist = max(dist, bottomRightDist - 0.5);
      }
   
      if (v_topMarker > 0.5) {
         float topDist = v_texCoord.y;
         dist = max(dist, topDist - 0.5);
      }
      if (v_rightMarker > 0.5) {
         float rightDist = v_texCoord.x;
         dist = max(dist, rightDist - 0.5);
      }
      if (v_leftMarker > 0.5) {
         float leftDist = 1.0 - v_texCoord.x;
         dist = max(dist, leftDist - 0.5);
      }
      if (v_bottomMarker > 0.5) {
         float bottomDist = (1.0 - v_texCoord.y);
         dist = max(dist, bottomDist - 0.5);
      }
   
      dist -= 0.2;
   
      outputColour = vec4(0.0, 0.0, 0.0, dist);
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   bindUBOToProgram(gl, program, UBOBindingIndex.CAMERA);
}

const tileIsWallInt = (layer: Layer, tileX: number, tileY: number): number => {
   if (tileIsWithinEdge(tileX, tileY)) {
      const tile = layer.getTileFromCoords(tileX, tileY);
      return tile.isWall ? 1 : 0;
   }

   return 0;
}

const tileIsNotDropdownInt = (layer: Layer, tileX: number, tileY: number): number => {
   if (tileIsWithinEdge(tileX, tileY)) {
      const tile = layer.getTileFromCoords(tileX, tileY);
      return tile.type !== TileType.dropdown ? 1 : 0;
   }

   return 0;
}

const getChunkTileShadows = (layer: Layer, renderChunkX: number, renderChunkY: number, tileShadowType: TileShadowType): ReadonlyArray<TileShadowInfo> => {
   const minTileX = getRenderChunkMinTileX(renderChunkX);
   const maxTileX = getRenderChunkMaxTileX(renderChunkX);
   const minTileY = getRenderChunkMinTileY(renderChunkY);
   const maxTileY = getRenderChunkMaxTileY(renderChunkY);

   const tileShadows = new Array<TileShadowInfo>();

   if (tileShadowType === TileShadowType.wallShadow) {
      // Find all tiles bordering a wall in the render chunk
      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
         for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
            const tile = layer.getTileFromCoords(tileX, tileY);
            if (!tile.isWall && tile.bordersWall) {
               const bottomLeftMarker = tileIsWallInt(layer, tile.x - 1, tile.y - 1);
               const bottomRightMarker = tileIsWallInt(layer, tile.x + 1, tile.y - 1);
               const topLeftMarker = tileIsWallInt(layer, tile.x - 1, tile.y + 1);
               const topRightMarker = tileIsWallInt(layer, tile.x + 1, tile.y + 1);
         
               const topMarker = tileIsWallInt(layer, tile.x, tile.y + 1);
               const rightMarker = tileIsWallInt(layer, tile.x + 1, tile.y);
               const leftMarker = tileIsWallInt(layer, tile.x - 1, tile.y);
               const bottomMarker = tileIsWallInt(layer, tile.x, tile.y - 1);
   
               tileShadows.push({
                  tileX: tileX,
                  tileY: tileY,
                  bottomLeftMarker: bottomLeftMarker,
                  bottomRightMarker: bottomRightMarker,
                  topLeftMarker: topLeftMarker,
                  topRightMarker: topRightMarker,
                  topMarker: topMarker,
                  rightMarker: rightMarker,
                  leftMarker: leftMarker,
                  bottomMarker: bottomMarker
               });
            }
         }
      }
   } else {
      // Find all dropdown shadows
      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
         for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
            const tile = layer.getTileFromCoords(tileX, tileY);
            if (tile.type !== TileType.dropdown) {
               continue;
            }

            const bottomLeftMarker = tileIsNotDropdownInt(layer, tile.x - 1, tile.y - 1);
            const bottomRightMarker = tileIsNotDropdownInt(layer, tile.x + 1, tile.y - 1);
            const topLeftMarker = tileIsNotDropdownInt(layer, tile.x - 1, tile.y + 1);
            const topRightMarker = tileIsNotDropdownInt(layer, tile.x + 1, tile.y + 1);
      
            const topMarker = tileIsNotDropdownInt(layer, tile.x, tile.y + 1);
            const rightMarker = tileIsNotDropdownInt(layer, tile.x + 1, tile.y);
            const leftMarker = tileIsNotDropdownInt(layer, tile.x - 1, tile.y);
            const bottomMarker = tileIsNotDropdownInt(layer, tile.x, tile.y - 1);

            if (bottomLeftMarker || bottomRightMarker || topLeftMarker || topRightMarker || topMarker || rightMarker || leftMarker || bottomMarker) {
               tileShadows.push({
                  tileX: tileX,
                  tileY: tileY,
                  bottomLeftMarker: bottomLeftMarker,
                  bottomRightMarker: bottomRightMarker,
                  topLeftMarker: topLeftMarker,
                  topRightMarker: topRightMarker,
                  topMarker: topMarker,
                  rightMarker: rightMarker,
                  leftMarker: leftMarker,
                  bottomMarker: bottomMarker
               });
            }
         }
      }
   }

   return tileShadows;
}

export function calculateTileShadowInfo(layer: Layer, renderChunkX: number, renderChunkY: number, tileShadowType: TileShadowType): RenderChunkTileShadowInfo | null {
   const tileShadows = getChunkTileShadows(layer, renderChunkX, renderChunkY, tileShadowType);
   if (tileShadows.length === 0) {
      return null;
   }

   const vertexData = new Float32Array(tileShadows.length * 6 * 12);
   for (let i = 0; i < tileShadows.length; i++) {
      const tileShadowInfo = tileShadows[i];

      let x1 = tileShadowInfo.tileX * Settings.TILE_SIZE;
      let x2 = (tileShadowInfo.tileX + 1) * Settings.TILE_SIZE;
      let y1 = tileShadowInfo.tileY * Settings.TILE_SIZE;
      let y2 = (tileShadowInfo.tileY + 1) * Settings.TILE_SIZE;
      
      const dataOffset = i * 6 * 12;

      vertexData[dataOffset] = x1;
      vertexData[dataOffset + 1] = y1;
      vertexData[dataOffset + 2] = 0;
      vertexData[dataOffset + 3] = 0;
      vertexData[dataOffset + 4] = tileShadowInfo.topLeftMarker;
      vertexData[dataOffset + 5] = tileShadowInfo.topRightMarker;
      vertexData[dataOffset + 6] = tileShadowInfo.bottomLeftMarker;
      vertexData[dataOffset + 7] = tileShadowInfo.bottomRightMarker;
      vertexData[dataOffset + 8] = tileShadowInfo.topMarker;
      vertexData[dataOffset + 9] = tileShadowInfo.rightMarker;
      vertexData[dataOffset + 10] = tileShadowInfo.leftMarker;
      vertexData[dataOffset + 11] = tileShadowInfo.bottomMarker;

      vertexData[dataOffset + 12] = x2;
      vertexData[dataOffset + 13] = y1;
      vertexData[dataOffset + 14] = 1;
      vertexData[dataOffset + 15] = 0;
      vertexData[dataOffset + 16] = tileShadowInfo.topLeftMarker;
      vertexData[dataOffset + 17] = tileShadowInfo.topRightMarker;
      vertexData[dataOffset + 18] = tileShadowInfo.bottomLeftMarker;
      vertexData[dataOffset + 19] = tileShadowInfo.bottomRightMarker;
      vertexData[dataOffset + 20] = tileShadowInfo.topMarker;
      vertexData[dataOffset + 21] = tileShadowInfo.rightMarker;
      vertexData[dataOffset + 22] = tileShadowInfo.leftMarker;
      vertexData[dataOffset + 23] = tileShadowInfo.bottomMarker;

      vertexData[dataOffset + 24] = x1;
      vertexData[dataOffset + 25] = y2;
      vertexData[dataOffset + 26] = 0;
      vertexData[dataOffset + 27] = 1;
      vertexData[dataOffset + 28] = tileShadowInfo.topLeftMarker;
      vertexData[dataOffset + 29] = tileShadowInfo.topRightMarker;
      vertexData[dataOffset + 30] = tileShadowInfo.bottomLeftMarker;
      vertexData[dataOffset + 31] = tileShadowInfo.bottomRightMarker;
      vertexData[dataOffset + 32] = tileShadowInfo.topMarker;
      vertexData[dataOffset + 33] = tileShadowInfo.rightMarker;
      vertexData[dataOffset + 34] = tileShadowInfo.leftMarker;
      vertexData[dataOffset + 35] = tileShadowInfo.bottomMarker;

      vertexData[dataOffset + 36] = x1;
      vertexData[dataOffset + 37] = y2;
      vertexData[dataOffset + 38] = 0;
      vertexData[dataOffset + 39] = 1;
      vertexData[dataOffset + 40] = tileShadowInfo.topLeftMarker;
      vertexData[dataOffset + 41] = tileShadowInfo.topRightMarker;
      vertexData[dataOffset + 42] = tileShadowInfo.bottomLeftMarker;
      vertexData[dataOffset + 43] = tileShadowInfo.bottomRightMarker;
      vertexData[dataOffset + 44] = tileShadowInfo.topMarker;
      vertexData[dataOffset + 45] = tileShadowInfo.rightMarker;
      vertexData[dataOffset + 46] = tileShadowInfo.leftMarker;
      vertexData[dataOffset + 47] = tileShadowInfo.bottomMarker;

      vertexData[dataOffset + 48] = x2;
      vertexData[dataOffset + 49] = y1;
      vertexData[dataOffset + 50] = 1;
      vertexData[dataOffset + 51] = 0;
      vertexData[dataOffset + 52] = tileShadowInfo.topLeftMarker;
      vertexData[dataOffset + 53] = tileShadowInfo.topRightMarker;
      vertexData[dataOffset + 54] = tileShadowInfo.bottomLeftMarker;
      vertexData[dataOffset + 55] = tileShadowInfo.bottomRightMarker;
      vertexData[dataOffset + 56] = tileShadowInfo.topMarker;
      vertexData[dataOffset + 57] = tileShadowInfo.rightMarker;
      vertexData[dataOffset + 58] = tileShadowInfo.leftMarker;
      vertexData[dataOffset + 59] = tileShadowInfo.bottomMarker;

      vertexData[dataOffset + 60] = x2;
      vertexData[dataOffset + 61] = y2;
      vertexData[dataOffset + 62] = 1;
      vertexData[dataOffset + 63] = 1;
      vertexData[dataOffset + 64] = tileShadowInfo.topLeftMarker;
      vertexData[dataOffset + 65] = tileShadowInfo.topRightMarker;
      vertexData[dataOffset + 66] = tileShadowInfo.bottomLeftMarker;
      vertexData[dataOffset + 67] = tileShadowInfo.bottomRightMarker;
      vertexData[dataOffset + 68] = tileShadowInfo.topMarker;
      vertexData[dataOffset + 69] = tileShadowInfo.rightMarker;
      vertexData[dataOffset + 70] = tileShadowInfo.leftMarker;
      vertexData[dataOffset + 71] = tileShadowInfo.bottomMarker;
   }

   const vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(4, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 6 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(5, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 7 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(6, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 8 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(7, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 9 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(8, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 10 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(9, 1, gl.FLOAT, false, 12 * Float32Array.BYTES_PER_ELEMENT, 11 * Float32Array.BYTES_PER_ELEMENT);
   
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);
   gl.enableVertexAttribArray(3);
   gl.enableVertexAttribArray(4);
   gl.enableVertexAttribArray(5);
   gl.enableVertexAttribArray(6);
   gl.enableVertexAttribArray(7);
   gl.enableVertexAttribArray(8);
   gl.enableVertexAttribArray(9);

   gl.bindVertexArray(null);

   return {
      vao: vao,
      vertexCount: tileShadows.length * 6
   };
}

export function renderTileShadows(layer: Layer, tileShadowType: TileShadowType): void {
   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   for (let renderChunkX = Camera.minVisibleRenderChunkX; renderChunkX <= Camera.maxVisibleRenderChunkX; renderChunkX++) {
      for (let renderChunkY = Camera.minVisibleRenderChunkY; renderChunkY <= Camera.maxVisibleRenderChunkY; renderChunkY++) {
         const ambientOcclusionInfo = getRenderChunkTileShadowInfo(layer, renderChunkX, renderChunkY, tileShadowType);
         if (ambientOcclusionInfo === null) {
            continue;
         }

         gl.bindVertexArray(ambientOcclusionInfo.vao);

         gl.drawArrays(gl.TRIANGLES, 0, ambientOcclusionInfo.vertexCount);
      }
   }

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);

   gl.bindVertexArray(null);
}
import { Settings } from "battletribes-shared/settings";
import Camera from "../../Camera";
import { createWebGLProgram, gl } from "../../webgl";
import { RenderChunkTileShadowInfo, getRenderChunkTileShadowInfo, getRenderChunkMaxTileX, getRenderChunkMaxTileY, getRenderChunkMinTileX, getRenderChunkMinTileY } from "../render-chunks";
import { UBOBindingIndex, bindUBOToProgram } from "../ubos";
import Layer, { subtileIsInWorld, tileIsWithinEdge } from "../../Layer";
import { TileType } from "../../../../shared/src/tiles";

export const enum TileShadowType {
   dropdownShadow,
   wallShadow
}

interface TileShadowInfo {
   readonly x1: number;
   readonly x2: number;
   readonly y1: number;
   readonly y2: number;
   readonly u1: number;
   readonly u2: number;
   readonly v1: number;
   readonly v2: number;
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
      float edgeCloseness = 0.0;
      if (v_topLeftMarker > 0.5) {
         float topLeftCloseness = 1.0 - distance(vec2(0.0, 1.0), v_texCoord);
         edgeCloseness = max(edgeCloseness, topLeftCloseness);
      }
      if (v_topRightMarker > 0.5) {
         float topRightCloseness = 1.0 - distance(vec2(1.0, 1.0), v_texCoord);
         edgeCloseness = max(edgeCloseness, topRightCloseness);
      }
      if (v_bottomLeftMarker > 0.5) {
         float bottomLeftCloseness = 1.0 - distance(vec2(0.0, 0.0), v_texCoord);
         edgeCloseness = max(edgeCloseness, bottomLeftCloseness);
      }
      if (v_bottomRightMarker > 0.5) {
         float bottomRightCloseness = 1.0 - distance(vec2(1.0, 0.0), v_texCoord);
         edgeCloseness = max(edgeCloseness, bottomRightCloseness);
      }
   
      if (v_topMarker > 0.5) {
         float topCloseness = v_texCoord.y;
         edgeCloseness = max(edgeCloseness, topCloseness);
      }
      if (v_rightMarker > 0.5) {
         float rightCloseness = v_texCoord.x;
         edgeCloseness = max(edgeCloseness, rightCloseness);
      }
      if (v_leftMarker > 0.5) {
         float leftCloseness = 1.0 - v_texCoord.x;
         edgeCloseness = max(edgeCloseness, leftCloseness);
      }
      if (v_bottomMarker > 0.5) {
         float bottomCloseness = (1.0 - v_texCoord.y);
         edgeCloseness = max(edgeCloseness, bottomCloseness);
      }

      edgeCloseness *= edgeCloseness;
      
      float alpha = edgeCloseness * 0.4;
      outputColour = vec4(0.0, 0.0, 0.0, alpha);
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   bindUBOToProgram(gl, program, UBOBindingIndex.CAMERA);
}

const subtileIsWallInt = (layer: Layer, subtileX: number, subtileY: number): number => {
   return (subtileIsInWorld(subtileX, subtileY) && layer.subtileIsWall(subtileX, subtileY)) ? 1 : 0;
}

const tileIsNotDropdownInt = (layer: Layer, tileX: number, tileY: number): number => {
   if (tileIsWithinEdge(tileX, tileY)) {
      const tile = layer.getTileFromCoords(tileX, tileY);
      return tile.type !== TileType.dropdown ? 1 : 0;
   }

   return 0;
}

const getChunkWallShadows = (layer: Layer, renderChunkX: number, renderChunkY: number): ReadonlyArray<TileShadowInfo> => {
   const minTileX = getRenderChunkMinTileX(renderChunkX);
   const maxTileX = getRenderChunkMaxTileX(renderChunkX);
   const minTileY = getRenderChunkMinTileY(renderChunkY);
   const maxTileY = getRenderChunkMaxTileY(renderChunkY);
   
   const minSubtileX = minTileX * 4;
   const maxSubtileX = maxTileX * 4 + 3;
   const minSubtileY = minTileY * 4;
   const maxSubtileY = maxTileY * 4 + 3;

   const tileShadows = new Array<TileShadowInfo>();

   // Find all tiles bordering a wall in the render chunk
   for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
      for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
         if (layer.subtileIsWall(subtileX, subtileY)) {
            continue;
         }

         const bottomLeftMarker = subtileIsWallInt(layer, subtileX - 1, subtileY - 1);
         const bottomRightMarker = subtileIsWallInt(layer, subtileX + 1, subtileY - 1);
         const topLeftMarker = subtileIsWallInt(layer, subtileX - 1, subtileY + 1);
         const topRightMarker = subtileIsWallInt(layer, subtileX + 1, subtileY + 1);
   
         const topMarker = subtileIsWallInt(layer, subtileX, subtileY + 1);
         const rightMarker = subtileIsWallInt(layer, subtileX + 1, subtileY);
         const leftMarker = subtileIsWallInt(layer, subtileX - 1, subtileY);
         const bottomMarker = subtileIsWallInt(layer, subtileX, subtileY - 1);

         if (bottomLeftMarker !== 0
          || bottomRightMarker !== 0
          || topLeftMarker !== 0
          || topRightMarker !== 0
          || topMarker !== 0
          || rightMarker !== 0
          || leftMarker !== 0
          || bottomMarker !== 0) {
            let u1 = 0;
            let u2 = 1;
            let v1 = 0;
            let v2 = 1;

            // if (bottomMarker === 0 && leftMarker === 0 && bottomLeftMarker !== 0) {
            //    u2 = 0.25;
            //    v2 = 0.25;
            // }
            // if (bottomMarker === 0 && rightMarker === 0 && bottomRightMarker !== 0) {
            //    u1 = 0.75;
            //    v2 = 0.25;
            // }
            // if (topMarker === 0 && leftMarker === 0 && topLeftMarker !== 0) {
            //    u2 = 0.25;
            //    v1 = 0.75;
            // }
            // if (topMarker === 0 && rightMarker === 0 && topRightMarker !== 0) {
            //    u1 = 0.75;
            //    v1 = 0.75;
            // }
            // if (rightMarker !== 0) {
            //    u1 = 0.75;
            // }
            // if (leftMarker !== 0) {
            //    u2 = 0.25;
            // }
            // if (topMarker !== 0) {
            //    v1 = 0.75;
            // }
            // if (bottomMarker !== 0) {
            //    v2 = 0.25;
            // }
            
            tileShadows.push({
               x1: subtileX * Settings.SUBTILE_SIZE,
               x2: (subtileX + 1) * Settings.SUBTILE_SIZE,
               y1: subtileY * Settings.SUBTILE_SIZE,
               y2: (subtileY + 1) * Settings.SUBTILE_SIZE,
               u1: u1,
               u2: u2,
               v1: v1,
               v2: v2,
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

   return tileShadows;
}

const getChunkDropdownShadows = (layer: Layer, renderChunkX: number, renderChunkY: number): ReadonlyArray<TileShadowInfo> => {
   const minTileX = getRenderChunkMinTileX(renderChunkX);
   const maxTileX = getRenderChunkMaxTileX(renderChunkX);
   const minTileY = getRenderChunkMinTileY(renderChunkY);
   const maxTileY = getRenderChunkMaxTileY(renderChunkY);

   const tileShadows = new Array<TileShadowInfo>();

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
               x1: tile.x * Settings.TILE_SIZE,
               x2: (tile.x + 1) * Settings.TILE_SIZE,
               y1: tile.y * Settings.TILE_SIZE,
               y2: (tile.y + 1) * Settings.TILE_SIZE,
               u1: 0,
               u2: 1,
               v1: 0,
               v2: 1,
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

   return tileShadows;
}

const calculateVertexData = (tileShadows: ReadonlyArray<TileShadowInfo>): Float32Array => {
   const vertexData = new Float32Array(tileShadows.length * 72);
   
   for (let i = 0; i < tileShadows.length; i++) {
      const tileShadowInfo = tileShadows[i];

      const dataOffset = i * 6 * 12;

      vertexData[dataOffset] = tileShadowInfo.x1;
      vertexData[dataOffset + 1] = tileShadowInfo.y1;
      vertexData[dataOffset + 2] = tileShadowInfo.u1;
      vertexData[dataOffset + 3] = tileShadowInfo.v1;
      vertexData[dataOffset + 4] = tileShadowInfo.topLeftMarker;
      vertexData[dataOffset + 5] = tileShadowInfo.topRightMarker;
      vertexData[dataOffset + 6] = tileShadowInfo.bottomLeftMarker;
      vertexData[dataOffset + 7] = tileShadowInfo.bottomRightMarker;
      vertexData[dataOffset + 8] = tileShadowInfo.topMarker;
      vertexData[dataOffset + 9] = tileShadowInfo.rightMarker;
      vertexData[dataOffset + 10] = tileShadowInfo.leftMarker;
      vertexData[dataOffset + 11] = tileShadowInfo.bottomMarker;

      vertexData[dataOffset + 12] = tileShadowInfo.x2;
      vertexData[dataOffset + 13] = tileShadowInfo.y1;
      vertexData[dataOffset + 14] = tileShadowInfo.u2;
      vertexData[dataOffset + 15] = tileShadowInfo.v1;
      vertexData[dataOffset + 16] = tileShadowInfo.topLeftMarker;
      vertexData[dataOffset + 17] = tileShadowInfo.topRightMarker;
      vertexData[dataOffset + 18] = tileShadowInfo.bottomLeftMarker;
      vertexData[dataOffset + 19] = tileShadowInfo.bottomRightMarker;
      vertexData[dataOffset + 20] = tileShadowInfo.topMarker;
      vertexData[dataOffset + 21] = tileShadowInfo.rightMarker;
      vertexData[dataOffset + 22] = tileShadowInfo.leftMarker;
      vertexData[dataOffset + 23] = tileShadowInfo.bottomMarker;

      vertexData[dataOffset + 24] = tileShadowInfo.x1;
      vertexData[dataOffset + 25] = tileShadowInfo.y2;
      vertexData[dataOffset + 26] = tileShadowInfo.u1;
      vertexData[dataOffset + 27] = tileShadowInfo.v2;
      vertexData[dataOffset + 28] = tileShadowInfo.topLeftMarker;
      vertexData[dataOffset + 29] = tileShadowInfo.topRightMarker;
      vertexData[dataOffset + 30] = tileShadowInfo.bottomLeftMarker;
      vertexData[dataOffset + 31] = tileShadowInfo.bottomRightMarker;
      vertexData[dataOffset + 32] = tileShadowInfo.topMarker;
      vertexData[dataOffset + 33] = tileShadowInfo.rightMarker;
      vertexData[dataOffset + 34] = tileShadowInfo.leftMarker;
      vertexData[dataOffset + 35] = tileShadowInfo.bottomMarker;

      vertexData[dataOffset + 36] = tileShadowInfo.x1;
      vertexData[dataOffset + 37] = tileShadowInfo.y2;
      vertexData[dataOffset + 38] = tileShadowInfo.u1;
      vertexData[dataOffset + 39] = tileShadowInfo.v2;
      vertexData[dataOffset + 40] = tileShadowInfo.topLeftMarker;
      vertexData[dataOffset + 41] = tileShadowInfo.topRightMarker;
      vertexData[dataOffset + 42] = tileShadowInfo.bottomLeftMarker;
      vertexData[dataOffset + 43] = tileShadowInfo.bottomRightMarker;
      vertexData[dataOffset + 44] = tileShadowInfo.topMarker;
      vertexData[dataOffset + 45] = tileShadowInfo.rightMarker;
      vertexData[dataOffset + 46] = tileShadowInfo.leftMarker;
      vertexData[dataOffset + 47] = tileShadowInfo.bottomMarker;

      vertexData[dataOffset + 48] = tileShadowInfo.x2;
      vertexData[dataOffset + 49] = tileShadowInfo.y1;
      vertexData[dataOffset + 50] = tileShadowInfo.u2;
      vertexData[dataOffset + 51] = tileShadowInfo.v1;
      vertexData[dataOffset + 52] = tileShadowInfo.topLeftMarker;
      vertexData[dataOffset + 53] = tileShadowInfo.topRightMarker;
      vertexData[dataOffset + 54] = tileShadowInfo.bottomLeftMarker;
      vertexData[dataOffset + 55] = tileShadowInfo.bottomRightMarker;
      vertexData[dataOffset + 56] = tileShadowInfo.topMarker;
      vertexData[dataOffset + 57] = tileShadowInfo.rightMarker;
      vertexData[dataOffset + 58] = tileShadowInfo.leftMarker;
      vertexData[dataOffset + 59] = tileShadowInfo.bottomMarker;

      vertexData[dataOffset + 60] = tileShadowInfo.x2;
      vertexData[dataOffset + 61] = tileShadowInfo.y2;
      vertexData[dataOffset + 62] = tileShadowInfo.u2;
      vertexData[dataOffset + 63] = tileShadowInfo.v2;
      vertexData[dataOffset + 64] = tileShadowInfo.topLeftMarker;
      vertexData[dataOffset + 65] = tileShadowInfo.topRightMarker;
      vertexData[dataOffset + 66] = tileShadowInfo.bottomLeftMarker;
      vertexData[dataOffset + 67] = tileShadowInfo.bottomRightMarker;
      vertexData[dataOffset + 68] = tileShadowInfo.topMarker;
      vertexData[dataOffset + 69] = tileShadowInfo.rightMarker;
      vertexData[dataOffset + 70] = tileShadowInfo.leftMarker;
      vertexData[dataOffset + 71] = tileShadowInfo.bottomMarker;
   }

   return vertexData;
}

export function calculateShadowInfo(layer: Layer, renderChunkX: number, renderChunkY: number, tileShadowType: TileShadowType): RenderChunkTileShadowInfo | null {
   const tileShadows = tileShadowType === TileShadowType.wallShadow ? getChunkWallShadows(layer, renderChunkX, renderChunkY) : getChunkDropdownShadows(layer, renderChunkX, renderChunkY);
   const vertexData = calculateVertexData(tileShadows);

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
      buffer: buffer,
      vertexData: vertexData
   };
}

export function recalculateTileShadows(layer: Layer, renderChunkX: number, renderChunkY: number, shadowType: TileShadowType): void {
   const renderChunkShadowInfo = getRenderChunkTileShadowInfo(layer, renderChunkX, renderChunkY, shadowType);
   if (renderChunkShadowInfo === null) {
      throw new Error();
   }

   const tileShadows = shadowType === TileShadowType.wallShadow ? getChunkWallShadows(layer, renderChunkX, renderChunkY) : getChunkDropdownShadows(layer, renderChunkX, renderChunkY);
   renderChunkShadowInfo.vertexData = calculateVertexData(tileShadows);

   gl.bindVertexArray(renderChunkShadowInfo.vao);
   
   gl.bindBuffer(gl.ARRAY_BUFFER, renderChunkShadowInfo.buffer);
   gl.bufferData(gl.ARRAY_BUFFER, renderChunkShadowInfo.vertexData, gl.STATIC_DRAW);
   
   gl.bindVertexArray(null);
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

         gl.drawArrays(gl.TRIANGLES, 0, ambientOcclusionInfo.vertexData.length / 12);
      }
   }

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);

   gl.bindVertexArray(null);
}
import { Settings } from "../../../../../shared/src/settings";
import { subtileIsInWorldIncludingEdges } from "../../../../../shared/src/subtiles";
import { TileType } from "../../../../../shared/src/tiles";
import { tileIsInWorldIncludingEdges } from "../../../../../shared/src/utils";
import { createWebGLProgram, gl } from "../../webgl";
import { RenderChunkTileShadowInfo, getRenderChunkTileShadowInfo, getRenderChunkMaxTileX, getRenderChunkMaxTileY, getRenderChunkMinTileX, getRenderChunkMinTileY } from "../render-chunks";
import { UBOBindingIndex, bindUBOToProgram } from "../ubos";
import Layer from "../../Layer";
import { minVisibleRenderChunkX, maxVisibleRenderChunkX, minVisibleRenderChunkY, maxVisibleRenderChunkY } from "../../camera";

const enum Var {
   ATTRIBUTES_PER_VERTEX = 5
}

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
   readonly markers: number;
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
   layout(location = 2) in uint a_markers;
   
   out vec2 v_texCoord;
   flat out uint v_markers;

   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);
   
      v_texCoord = a_texCoord;
      v_markers = a_markers;
   }
   `;
   
   const fragmentShaderText = `#version 300 es
   precision mediump float;
    
   in vec2 v_texCoord;
   flat in uint v_markers;
   
   out vec4 outputColour;
   
   void main() {
      float edgeCloseness = 0.0;

      // Bottom left
      if ((v_markers & 1u) != 0u) {
         float bottomLeftCloseness = 1.0 - distance(vec2(0.0, 0.0), v_texCoord);
         edgeCloseness = max(edgeCloseness, bottomLeftCloseness);
      }
      // Bottom right
      if ((v_markers & 2u) != 0u) {
         float bottomRightCloseness = 1.0 - distance(vec2(1.0, 0.0), v_texCoord);
         edgeCloseness = max(edgeCloseness, bottomRightCloseness);
      }
      // Top left
      if ((v_markers & 4u) != 0u) {
         float topLeftCloseness = 1.0 - distance(vec2(0.0, 1.0), v_texCoord);
         edgeCloseness = max(edgeCloseness, topLeftCloseness);
      }
      // Top right
      if ((v_markers & 8u) != 0u) {
         float topRightCloseness = 1.0 - distance(vec2(1.0, 1.0), v_texCoord);
         edgeCloseness = max(edgeCloseness, topRightCloseness);
      }
   
      // Top
      if ((v_markers & 16u) != 0u) {
         float topCloseness = v_texCoord.y;
         edgeCloseness = max(edgeCloseness, topCloseness);
      }
      // Right
      if ((v_markers & 32u) != 0u) {
         float rightCloseness = v_texCoord.x;
         edgeCloseness = max(edgeCloseness, rightCloseness);
      }
      // Left
      if ((v_markers & 64u) != 0u) {
         float leftCloseness = 1.0 - v_texCoord.x;
         edgeCloseness = max(edgeCloseness, leftCloseness);
      }
      // Bottom
      if ((v_markers & 128u) != 0u) {
         float bottomCloseness = 1.0 - v_texCoord.y;
         edgeCloseness = max(edgeCloseness, bottomCloseness);
      }

      edgeCloseness *= edgeCloseness;
      
      float alpha = edgeCloseness * 0.28;
      outputColour = vec4(0.0, 0.0, 0.0, alpha);
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   bindUBOToProgram(gl, program, UBOBindingIndex.CAMERA);
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

   const tileShadows: Array<TileShadowInfo> = [];

   // Find all tiles bordering a wall in the render chunk
   for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
      for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
         if (layer.subtileIsWall(subtileX, subtileY)) {
            continue;
         }

         let markers = 0;

         // Bottom left
         if (subtileIsInWorldIncludingEdges(subtileX - 1, subtileY - 1) && layer.subtileIsWall(subtileX - 1, subtileY - 1)) {
            markers |= 1;
         }
         // Bottom right
         if (subtileIsInWorldIncludingEdges(subtileX + 1, subtileY - 1) && layer.subtileIsWall(subtileX + 1, subtileY - 1)) {
            markers |= 2;
         }
         // Top left
         if (subtileIsInWorldIncludingEdges(subtileX - 1, subtileY + 1) && layer.subtileIsWall(subtileX - 1, subtileY + 1)) {
            markers |= 4;
         }
         // Top right
         if (subtileIsInWorldIncludingEdges(subtileX + 1, subtileY + 1) && layer.subtileIsWall(subtileX + 1, subtileY + 1)) {
            markers |= 8;
         }

         // Top
         if (subtileIsInWorldIncludingEdges(subtileX, subtileY + 1) && layer.subtileIsWall(subtileX, subtileY + 1)) {
            markers |= 16;
         }
         // Right
         if (subtileIsInWorldIncludingEdges(subtileX + 1, subtileY) && layer.subtileIsWall(subtileX + 1, subtileY)) {
            markers |= 32;
         }
         // Left
         if (subtileIsInWorldIncludingEdges(subtileX - 1, subtileY) && layer.subtileIsWall(subtileX - 1, subtileY)) {
            markers |= 64;
         }
         // Bottom
         if (subtileIsInWorldIncludingEdges(subtileX, subtileY - 1) && layer.subtileIsWall(subtileX, subtileY - 1)) {
            markers |= 128;
         }
   
         if (markers !== 0) {
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
               markers: markers
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

   const tileShadows: Array<TileShadowInfo> = [];

   // Find all dropdown shadows
   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const tile = layer.getTileFromCoords(tileX, tileY);
         if (tile.type !== TileType.dropdown) {
            continue;
         }

         let markers = 0;

         // Bottom left
         if (tileIsInWorldIncludingEdges(tileX - 1, tileY - 1) && layer.getTileFromCoords(tileX - 1, tileY - 1).type !== TileType.dropdown) {
            markers |= 1;
         }
         // Bottom right
         if (tileIsInWorldIncludingEdges(tileX + 1, tileY - 1) && layer.getTileFromCoords(tileX + 1, tileY - 1).type !== TileType.dropdown) {
            markers |= 2;
         }
         // Top left
         if (tileIsInWorldIncludingEdges(tileX - 1, tileY + 1) && layer.getTileFromCoords(tileX - 1, tileY + 1).type !== TileType.dropdown) {
            markers |= 4;
         }
         // Top right
         if (tileIsInWorldIncludingEdges(tileX + 1, tileY + 1) && layer.getTileFromCoords(tileX + 1, tileY + 1).type !== TileType.dropdown) {
            markers |= 8;
         }

         // Top
         if (tileIsInWorldIncludingEdges(tileX, tileY + 1) && layer.getTileFromCoords(tileX, tileY + 1).type !== TileType.dropdown) {
            markers |= 16;
         }
         // Right
         if (tileIsInWorldIncludingEdges(tileX + 1, tileY) && layer.getTileFromCoords(tileX + 1, tileY).type !== TileType.dropdown) {
            markers |= 32;
         }
         // Left
         if (tileIsInWorldIncludingEdges(tileX - 1, tileY) && layer.getTileFromCoords(tileX - 1, tileY).type !== TileType.dropdown) {
            markers |= 64;
         }
         // Bottom
         if (tileIsInWorldIncludingEdges(tileX, tileY - 1) && layer.getTileFromCoords(tileX, tileY - 1).type !== TileType.dropdown) {
            markers |= 128;
         }

         if (markers !== 0) {
            tileShadows.push({
               x1: tile.x * Settings.TILE_SIZE,
               x2: (tile.x + 1) * Settings.TILE_SIZE,
               y1: tile.y * Settings.TILE_SIZE,
               y2: (tile.y + 1) * Settings.TILE_SIZE,
               u1: 0,
               u2: 1,
               v1: 0,
               v2: 1,
               markers: markers
            });
         }
      }
   }

   return tileShadows;
}

const calculateVertexData = (tileShadows: ReadonlyArray<TileShadowInfo>): ArrayBuffer => {
   const vertexData = new ArrayBuffer(tileShadows.length * 6 * Var.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT);
   const floatView = new Float32Array(vertexData);
   const uintView = new Uint32Array(vertexData);
   
   for (let i = 0; i < tileShadows.length; i++) {
      const tileShadowInfo = tileShadows[i];

      const dataOffset = i * 6 * Var.ATTRIBUTES_PER_VERTEX;

      floatView[dataOffset] = tileShadowInfo.x1;
      floatView[dataOffset + 1] = tileShadowInfo.y1;
      floatView[dataOffset + 2] = tileShadowInfo.u1;
      floatView[dataOffset + 3] = tileShadowInfo.v1;
      uintView[dataOffset + 4] = tileShadowInfo.markers;

      floatView[dataOffset + 5] = tileShadowInfo.x2;
      floatView[dataOffset + 6] = tileShadowInfo.y1;
      floatView[dataOffset + 7] = tileShadowInfo.u2;
      floatView[dataOffset + 8] = tileShadowInfo.v1;
      uintView[dataOffset + 9] = tileShadowInfo.markers;

      floatView[dataOffset + 10] = tileShadowInfo.x1;
      floatView[dataOffset + 11] = tileShadowInfo.y2;
      floatView[dataOffset + 12] = tileShadowInfo.u1;
      floatView[dataOffset + 13] = tileShadowInfo.v2;
      uintView[dataOffset + 14] = tileShadowInfo.markers;

      floatView[dataOffset + 15] = tileShadowInfo.x1;
      floatView[dataOffset + 16] = tileShadowInfo.y2;
      floatView[dataOffset + 17] = tileShadowInfo.u1;
      floatView[dataOffset + 18] = tileShadowInfo.v2;
      uintView[dataOffset + 19] = tileShadowInfo.markers;

      floatView[dataOffset + 20] = tileShadowInfo.x2;
      floatView[dataOffset + 21] = tileShadowInfo.y1;
      floatView[dataOffset + 22] = tileShadowInfo.u2;
      floatView[dataOffset + 23] = tileShadowInfo.v1;
      uintView[dataOffset + 24] = tileShadowInfo.markers;

      floatView[dataOffset + 25] = tileShadowInfo.x2;
      floatView[dataOffset + 26] = tileShadowInfo.y2;
      floatView[dataOffset + 27] = tileShadowInfo.u2;
      floatView[dataOffset + 28] = tileShadowInfo.v2;
      uintView[dataOffset + 29] = tileShadowInfo.markers;
   }

   return vertexData;
}

export function calculateShadowInfo(layer: Layer, renderChunkX: number, renderChunkY: number, tileShadowType: TileShadowType): RenderChunkTileShadowInfo | null {
   const tileShadows = tileShadowType === TileShadowType.wallShadow ? getChunkWallShadows(layer, renderChunkX, renderChunkY) : getChunkDropdownShadows(layer, renderChunkX, renderChunkY);

   const vertexData = calculateVertexData(tileShadows);

   const vao = gl.createVertexArray();
   gl.bindVertexArray(vao);

   const vertexBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, Var.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, Var.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribIPointer(2, 1, gl.UNSIGNED_INT, Var.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);

   // @speed
   gl.bindVertexArray(null);

   return {
      vao: vao,
      buffer: vertexBuffer,
      vertexData: vertexData,
      vertexCount: tileShadows.length * 6
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
   
   // @Speed
   gl.bindVertexArray(null);
}

export function renderTileShadows(layer: Layer, tileShadowType: TileShadowType): void {
   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   for (let renderChunkX = minVisibleRenderChunkX; renderChunkX <= maxVisibleRenderChunkX; renderChunkX++) {
      for (let renderChunkY = minVisibleRenderChunkY; renderChunkY <= maxVisibleRenderChunkY; renderChunkY++) {
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
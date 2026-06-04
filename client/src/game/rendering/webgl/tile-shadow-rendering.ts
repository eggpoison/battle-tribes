import { Bytes } from "../../../../../shared/src/constants";
import { createWebGLProgram, gl } from "../../webgl";
import { RenderChunkShadowInfo, getRenderChunkTileShadowInfo, RenderChunkEdgeInfo, setRenderChunkTileShadowInfo, getRenderChunkIndex, EdgeMarkerBit } from "../render-chunks";
import { UBOBindingIndex, bindUBOToProgram } from "../ubos";
import Layer from "../../Layer";
import { minVisibleRenderChunkX, maxVisibleRenderChunkX, minVisibleRenderChunkY, maxVisibleRenderChunkY } from "../../camera";
import { Settings } from "../../../../../shared/src/settings";

const enum Var {
   ATTRIBUTES_PER_VERTEX = 2
}

export const enum TileShadowType {
   dropdownShadow,
   wallShadow
}

let program: WebGLProgram;
let shadowTypeUniformLocation: WebGLUniformLocation;

export function createTileShadowShaders(): void {
   const vertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };

   uniform int u_shadowType;
   
   layout(location = 0) in uint a_index;
   layout(location = 1) in uint a_markers;
   
   out vec2 v_texCoord;
   flat out uint v_markers;
   
   uint getTileX(uint tileIndex) {
      return tileIndex % ${Settings.FULL_WORLD_SIZE_TILES}u - ${Settings.EDGE_GENERATION_DISTANCE}u;
   }

   uint getTileY(uint tileIndex) {
      return tileIndex / ${Settings.FULL_WORLD_SIZE_TILES}u - ${Settings.EDGE_GENERATION_DISTANCE}u;
   }
   
   uint getSubtileX(uint subtileIndex) {
      return subtileIndex % ${Settings.FULL_WORLD_SIZE_SUBTILES}u - ${Settings.EDGE_GENERATION_DISTANCE}u * 4u;
   }

   uint getSubtileY(uint subtileIndex) {
      return subtileIndex / ${Settings.FULL_WORLD_SIZE_SUBTILES}u - ${Settings.EDGE_GENERATION_DISTANCE}u * 4u;
   }

   void main() {
      int vertexID = gl_VertexID % 6;
      int u = vertexID & 1;
      int v = ((vertexID % 3) + (vertexID / 4)) >> 1;
      vec2 vertPosition = vec2(u, v);

      vec2 tilePosition;
      uint tileSize;
      if (u_shadowType == ${TileShadowType.dropdownShadow}) {
         uint tileX = getTileX(a_index);
         uint tileY = getTileY(a_index);
         tilePosition = vec2(tileX, tileY);
         tileSize = ${Settings.TILE_SIZE}u;
      } else {
         uint subtileX = getSubtileX(a_index);
         uint subtileY = getSubtileY(a_index);
         tilePosition = vec2(subtileX, subtileY);
         tileSize = ${Settings.SUBTILE_SIZE}u;
      }

      vec2 position = (tilePosition + vertPosition) * float(tileSize);

      vec2 screenPos = (position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);
   
      v_texCoord = vertPosition;
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
      if ((v_markers & ${EdgeMarkerBit.bottomLeft}u) != 0u) {
         float bottomLeftCloseness = 1.0 - distance(vec2(0.0, 0.0), v_texCoord);
         edgeCloseness = max(edgeCloseness, bottomLeftCloseness);
      }
      // Bottom right
      if ((v_markers & ${EdgeMarkerBit.bottomRight}u) != 0u) {
         float bottomRightCloseness = 1.0 - distance(vec2(1.0, 0.0), v_texCoord);
         edgeCloseness = max(edgeCloseness, bottomRightCloseness);
      }
      // Top left
      if ((v_markers & ${EdgeMarkerBit.topLeft}u) != 0u) {
         float topLeftCloseness = 1.0 - distance(vec2(0.0, 1.0), v_texCoord);
         edgeCloseness = max(edgeCloseness, topLeftCloseness);
      }
      // Top right
      if ((v_markers & ${EdgeMarkerBit.topRight}u) != 0u) {
         float topRightCloseness = 1.0 - distance(vec2(1.0, 1.0), v_texCoord);
         edgeCloseness = max(edgeCloseness, topRightCloseness);
      }
   
      // Top
      if ((v_markers & ${EdgeMarkerBit.top}u) != 0u) {
         float topCloseness = v_texCoord.y;
         edgeCloseness = max(edgeCloseness, topCloseness);
      }
      // Right
      if ((v_markers & ${EdgeMarkerBit.right}u) != 0u) {
         float rightCloseness = v_texCoord.x;
         edgeCloseness = max(edgeCloseness, rightCloseness);
      }
      // Left
      if ((v_markers & ${EdgeMarkerBit.left}u) != 0u) {
         float leftCloseness = 1.0 - v_texCoord.x;
         edgeCloseness = max(edgeCloseness, leftCloseness);
      }
      // Bottom
      if ((v_markers & ${EdgeMarkerBit.bottom}u) != 0u) {
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

   gl.useProgram(program);

   shadowTypeUniformLocation = gl.getUniformLocation(program, "u_shadowType")!;
}

const calculateVertexData = (info: RenderChunkEdgeInfo): Uint32Array => {
   const chunkIndexes = info.indexes;
   const chunkMarkers = info.markers;
   
   const vertexData = new Uint32Array(chunkIndexes.length * 6 * Var.ATTRIBUTES_PER_VERTEX);
   
   for (let i = 0; i < chunkIndexes.length; i++) {
      const index = chunkIndexes[i];
      const markers = chunkMarkers[i];
      
      const dataOffset = i * 6 * Var.ATTRIBUTES_PER_VERTEX;
      
      vertexData[dataOffset] = index;
      vertexData[dataOffset + 1] = markers;

      vertexData[dataOffset + 2] = index;
      vertexData[dataOffset + 3] = markers;

      vertexData[dataOffset + 4] = index;
      vertexData[dataOffset + 5] = markers;

      vertexData[dataOffset + 6] = index;
      vertexData[dataOffset + 7] = markers;

      vertexData[dataOffset + 8] = index;
      vertexData[dataOffset + 9] = markers;

      vertexData[dataOffset + 10] = index;
      vertexData[dataOffset + 11] = markers;
   }

   return vertexData;
}

export function calculateShadowInfo(info: RenderChunkEdgeInfo): RenderChunkShadowInfo | null {
   const vertexData = calculateVertexData(info);
   if (vertexData.byteLength === 0) {
      return null;
   }

   const vao = gl.createVertexArray();
   gl.bindVertexArray(vao);

   const vertexBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.vertexAttribIPointer(0, 1, gl.UNSIGNED_INT, Var.ATTRIBUTES_PER_VERTEX * Bytes.Float32, 0);
   gl.vertexAttribIPointer(1, 1, gl.UNSIGNED_INT, Var.ATTRIBUTES_PER_VERTEX * Bytes.Float32, 1 * Bytes.Float32);
   
   // gl.vertexAttribDivisor(0, 1);
   // gl.vertexAttribDivisor(1, 1);
   
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);

   return {
      vao: vao,
      buffer: vertexBuffer,
      vertexData: vertexData,
      numElements: info.indexes.length * 6
   };
}

export function recalculateTileShadows(layer: Layer, renderChunkIdx: number, info: RenderChunkEdgeInfo, tileShadowType: TileShadowType): void {
   const renderChunkShadowInfo = getRenderChunkTileShadowInfo(layer, renderChunkIdx, tileShadowType);
   if (renderChunkShadowInfo === null) {
      setRenderChunkTileShadowInfo(layer, renderChunkIdx, tileShadowType, calculateShadowInfo(info));
      return;
   }

   renderChunkShadowInfo.vertexData = calculateVertexData(info);
   renderChunkShadowInfo.numElements = info.indexes.length * 6;

   gl.bindVertexArray(renderChunkShadowInfo.vao);
   
   gl.bindBuffer(gl.ARRAY_BUFFER, renderChunkShadowInfo.buffer);
   gl.bufferData(gl.ARRAY_BUFFER, renderChunkShadowInfo.vertexData, gl.STATIC_DRAW);
}

export function renderTileShadows(layer: Layer, tileShadowType: TileShadowType): void {
   gl.useProgram(program);

   gl.uniform1i(shadowTypeUniformLocation, tileShadowType);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   for (let renderChunkY = minVisibleRenderChunkY; renderChunkY <= maxVisibleRenderChunkY; renderChunkY++) {
      for (let renderChunkX = minVisibleRenderChunkX; renderChunkX <= maxVisibleRenderChunkX; renderChunkX++) {
         const renderChunkIdx = getRenderChunkIndex(renderChunkX, renderChunkY);
         const shadowInfo = getRenderChunkTileShadowInfo(layer, renderChunkIdx, tileShadowType);
         if (shadowInfo === null) {
            continue;
         }

         gl.bindVertexArray(shadowInfo.vao);
         gl.drawArrays(gl.TRIANGLES, 0, shadowInfo.numElements);
      }
   }

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}
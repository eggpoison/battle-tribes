import { clampToBoardDimensions, SubtileType, Settings, getTileIndexIncludingEdges, getSubtileIndex } from "webgl-test-shared";
import { minVisibleX, maxVisibleX, minVisibleY, maxVisibleY } from "../../camera";
import Layer from "../../Layer";
import { createWebGLProgram, gl } from "../../webgl";
import { getCurrentLayer, surfaceLayer } from "../../world";
import { bindUBOToProgram, UBOBindingIndex } from "../ubos";

let program: WebGLProgram;

export function createMithrilRichTileRenderingShaders(): void {
   const vertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in float a_overlayOpacity;
   
   out float v_overlayOpacity;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);
   
      v_overlayOpacity = a_overlayOpacity;
   }
   `;
   
   const fragmentShaderText = `#version 300 es
   precision highp float;
   
   #define OVERLAY_COLOUR vec4(35.0/255.0, 152.0/255.0, 158.0/255.0, 0.2)
   
   uniform highp sampler2DArray u_sampler;
   
   in float v_overlayOpacity;
   
   out vec4 outputColour;
    
   void main() {
      outputColour = OVERLAY_COLOUR;
      outputColour.a *= v_overlayOpacity;

      // @Hack :DarkTransparencyBug
      outputColour.rgb *= outputColour.a;
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   bindUBOToProgram(gl, program, UBOBindingIndex.CAMERA);
}

// @Garbage
const getFloorVertices = (layer: Layer): Array<number> => {
   const vertices = new Array<number>();

   const minTileX = clampToBoardDimensions(Math.floor(minVisibleX / Settings.TILE_SIZE));
   const maxTileX = clampToBoardDimensions(Math.floor(maxVisibleX / Settings.TILE_SIZE));
   const minTileY = clampToBoardDimensions(Math.floor(minVisibleY / Settings.TILE_SIZE));
   const maxTileY = clampToBoardDimensions(Math.floor(maxVisibleY / Settings.TILE_SIZE));

   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         const tile = layer.getTile(tileIndex);
         if (tile.mithrilRichness === 0) {
            continue;
         }

         const x1 = tileX * Settings.TILE_SIZE;
         const x2 = (tileX + 1) * Settings.TILE_SIZE;
         const y1 = tileY * Settings.TILE_SIZE;
         const y2 = (tileY + 1) * Settings.TILE_SIZE;

         const mithrilRichness = tile.mithrilRichness;

         vertices.push(
            x1, y1, mithrilRichness,
            x2, y1, mithrilRichness,
            x1, y2, mithrilRichness,
            x1, y2, mithrilRichness,
            x2, y1, mithrilRichness,
            x2, y2, mithrilRichness
         );
      }
   }

   return vertices;
}

// @Garbage
const getWallVertices = (layer: Layer): Array<number> => {
   const vertices = new Array<number>();

   const minSubtileX = clampToBoardDimensions(Math.floor(minVisibleX / Settings.SUBTILE_SIZE));
   const maxSubtileX = clampToBoardDimensions(Math.floor(maxVisibleX / Settings.SUBTILE_SIZE));
   const minSubtileY = clampToBoardDimensions(Math.floor(minVisibleY / Settings.SUBTILE_SIZE));
   const maxSubtileY = clampToBoardDimensions(Math.floor(maxVisibleY / Settings.SUBTILE_SIZE));

   for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
      for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
         const subtileIndex = getSubtileIndex(subtileX, subtileY);
         if (layer.getSubtileType(subtileIndex) === SubtileType.none) {
            continue;
         }
         
         const tileX = Math.floor(subtileX / 4);
         const tileY = Math.floor(subtileY / 4);
         const tile = layer.getTileFromCoords(tileX, tileY);
         const mithrilRichness = tile.mithrilRichness;
         if (mithrilRichness === 0) {
            continue;
         }

         const x1 = subtileX * Settings.SUBTILE_SIZE;
         const x2 = (subtileX + 1) * Settings.SUBTILE_SIZE;
         const y1 = subtileY * Settings.SUBTILE_SIZE;
         const y2 = (subtileY + 1) * Settings.SUBTILE_SIZE;


         vertices.push(
            x1, y1, mithrilRichness,
            x2, y1, mithrilRichness,
            x1, y2, mithrilRichness,
            x1, y2, mithrilRichness,
            x2, y1, mithrilRichness,
            x2, y2, mithrilRichness
         );
      }
   }

   return vertices;
}

// @Speed: SO BAD. like 1/33rd of CPU time... but it's about 1/10000th of the gameplay
export function renderMithrilRichTileOverlays(layer: Layer, isWallTiles: boolean): void {
   // @HACK
   if (getCurrentLayer()===surfaceLayer)return;
   
   const vertices = isWallTiles ? getWallVertices(layer) : getFloorVertices(layer);
   
   gl.useProgram(program);

   gl.enable(gl.BLEND);
   // @Hack :DarkTransparencyBug
   gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

   const vertexBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
   
   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);

   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}
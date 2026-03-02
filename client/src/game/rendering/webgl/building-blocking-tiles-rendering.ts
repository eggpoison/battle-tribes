import { Settings } from "webgl-test-shared";
import { minVisibleX, maxVisibleX, minVisibleY, maxVisibleY } from "../../camera";
import { getTileIndexIncludingEdges } from "../../Layer";
import { createWebGLProgram, gl } from "../../webgl";
import { getCurrentLayer } from "../../world";
import { bindUBOToProgram, UBOBindingIndex } from "../ubos";

let program: WebGLProgram;

export function createBuildingBlockingTileShaders(): void {
   const vertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };

   layout(location = 0) in vec2 a_position;

   out vec2 v_position;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);

      v_position = a_position;
   }
   `;

   const fragmentShaderText = `#version 300 es
   precision highp float;
   
   #define INTERVAL 32.0
   #define PIXEL_SIZE 4.0

   layout(std140) uniform Time {
      uniform float u_time;
   };

   in vec2 v_position;
   
   out vec4 outputColour;
   
   float roundPixel(float num) {
      return ceil(num / PIXEL_SIZE) * PIXEL_SIZE;
   }

   void main() {
      float timeOffset = u_time / 50.0;
      
      float x = roundPixel(v_position.x - timeOffset);
      float y = roundPixel(v_position.y - timeOffset);
      
      float remainder = fract((x + y) / INTERVAL);
      if (remainder < 0.5) {
         float progress = remainder / 0.5;

         float r = mix(0.7, 1.0, progress);
         outputColour = vec4(r, 0.0, 0.0, 0.75);
      } else {
         outputColour = vec4(0.0, 0.0, 0.0, 0.0);
      }

      // @Hack :DarkTransparencyBug
      outputColour.rgb *= outputColour.a;
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   bindUBOToProgram(gl, program, UBOBindingIndex.CAMERA);
   bindUBOToProgram(gl, program, UBOBindingIndex.TIME);
}

export function renderBuildingBlockingTiles(): void {
   // @Speed

   const layer = getCurrentLayer();
   
   const minVisibleTileX = Math.floor(minVisibleX / Settings.TILE_SIZE);
   const maxVisibleTileX = Math.floor(maxVisibleX / Settings.TILE_SIZE);
   const minVisibleTileY = Math.floor(minVisibleY / Settings.TILE_SIZE);
   const maxVisibleTileY = Math.floor(maxVisibleY / Settings.TILE_SIZE);
   
   const vertices = new Array<number>();
   for (let tileX = minVisibleTileX; tileX <= maxVisibleTileX; tileX++) {
      for (let tileY = minVisibleTileY; tileY <= maxVisibleTileY; tileY++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         if (!layer.buildingBlockingTiles.has(tileIndex)) {
            continue;
         }

         const x1 = tileX * Settings.TILE_SIZE;
         const x2 = (tileX + 1) * Settings.TILE_SIZE;
         const y1 = tileY * Settings.TILE_SIZE;
         const y2 = (tileY + 1) * Settings.TILE_SIZE;

         vertices.push(
            x1, y1,
            x2, y1,
            x1, y2,
            x1, y2,
            x2, y1,
            x2, y2
         );
      }
   }

   if (vertices.length === 0) {
      return;
   }

   gl.useProgram(program);

   gl.enable(gl.BLEND);
   // @Hack :DarkTransparencyBug
   gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
   
   const buffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.enableVertexAttribArray(0);

   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}
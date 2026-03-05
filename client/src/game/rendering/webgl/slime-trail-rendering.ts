import { distBetweenPointAndRectangularBox, Settings, RectangularBox, CircularBox, Box, boxIsCircular, _bounds } from "webgl-test-shared";
import Layer from "../../Layer";
import { createWebGLProgram, gl } from "../../webgl";
import { layers } from "../../world";
import { bindUBOToProgram, UBOBindingIndex } from "../ubos";

const enum Vars {
   SLIME_LAST_TIME_SECONDS = 1,
   SLIME_BUILD_TIME_SECONDS = 1.2
}

let program: WebGLProgram;

const convertToGamePixel = (x: number): number => {
   return x >> 2;
}

const getGamePixelIndex = (gamePixelX: number, gamePixelY: number): number => {
   return (gamePixelY + Settings.EDGE_GENERATION_DISTANCE * 16) * Settings.FULL_WORLD_SIZE_TILES * 16 + gamePixelX + Settings.EDGE_GENERATION_DISTANCE * 16;
}

export function getGamePixelX(gamePixelIndex: number): number {
   return gamePixelIndex % (Settings.FULL_WORLD_SIZE_TILES * 16) - Settings.EDGE_GENERATION_DISTANCE * 16;
}

export function getGamePixelY(gamePixelIndex: number): number {
   return Math.floor(gamePixelIndex / (Settings.FULL_WORLD_SIZE_TILES * 16)) - Settings.EDGE_GENERATION_DISTANCE * 16;
}

export function createSlimeTrailShaders(): void {
   const vertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in float a_opacity;

   out float v_opacity;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);

      v_opacity = a_opacity;
   }
   `;
   const fragmentShaderText = `#version 300 es
   precision mediump float;

   in float v_opacity;
   
   out vec4 outputColour;
   
   void main() {
      outputColour = vec4(0.96, 0.26, 0.77, v_opacity * 0.45);

      // @Hack :DarkTransparencyBug
      outputColour.rgb *= outputColour.a;
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   bindUBOToProgram(gl, program, UBOBindingIndex.CAMERA);
}

const coatFromCircularBox = (layer: Layer, box: CircularBox): void => {
   const centerX = box.position.x / 4;
   const centerY = box.position.y / 4;
   
   box.calculateBounds();
   const minGamePixelX = convertToGamePixel(_bounds.minX);
   const maxGamePixelX = convertToGamePixel(_bounds.maxX);
   const minGamePixelY = convertToGamePixel(_bounds.minY);
   const maxGamePixelY = convertToGamePixel(_bounds.maxY);

   const pixelRadiusSquared = box.radius * box.radius / 16;

   for (let gamePixelX = minGamePixelX; gamePixelX <= maxGamePixelX; gamePixelX++) {
      for (let gamePixelY = minGamePixelY; gamePixelY <= maxGamePixelY; gamePixelY++) {
         const xDiff = gamePixelX - centerX;
         const yDiff = gamePixelY - centerY;
         if (xDiff * xDiff + yDiff * yDiff <= pixelRadiusSquared) {
            const gamePixelIndex = getGamePixelIndex(gamePixelX, gamePixelY);
            
            const previousOpacity = layer.slimeTrailPixels.get(gamePixelIndex) || 0;
            const newOpacity = Math.min(previousOpacity + Settings.DT_S / Vars.SLIME_BUILD_TIME_SECONDS, 1);
            layer.slimeTrailPixels.set(gamePixelIndex, newOpacity);
         }
      }
   }
}

const coatFromRectangularBox = (layer: Layer, box: RectangularBox): void => {
   box.calculateBounds();
   const minGamePixelX = convertToGamePixel(_bounds.minX);
   const maxGamePixelX = convertToGamePixel(_bounds.maxX);
   const minGamePixelY = convertToGamePixel(_bounds.minY);
   const maxGamePixelY = convertToGamePixel(_bounds.maxY);

   for (let gamePixelX = minGamePixelX; gamePixelX <= maxGamePixelX; gamePixelX++) {
      for (let gamePixelY = minGamePixelY; gamePixelY <= maxGamePixelY; gamePixelY++) {
         const x = gamePixelX * 4;
         const y = gamePixelY * 4;
         
         if (distBetweenPointAndRectangularBox(x, y, box) <= 0) {
            const gamePixelIndex = getGamePixelIndex(gamePixelX, gamePixelY);
            layer.slimeTrailPixels.set(gamePixelIndex, 1);
         }
      }
   }
}

export function coatSlimeTrails(layer: Layer, box: Box): void {
   if (boxIsCircular(box)) {
      coatFromCircularBox(layer, box);
   } else {
      coatFromRectangularBox(layer, box);
   }
}

const getNumNeighbouringSlimePixels = (layer: Layer, gamePixelIndex: number): number => {
   const gamePixelX = getGamePixelX(gamePixelIndex);
   const gamePixelY = getGamePixelY(gamePixelIndex);

   let numNeighbouring = 0;

   if (layer.slimeTrailPixels.has(getGamePixelIndex(gamePixelX + 1, gamePixelY))) {
      numNeighbouring++;
   }
   if (layer.slimeTrailPixels.has(getGamePixelIndex(gamePixelX - 1, gamePixelY))) {
      numNeighbouring++;
   }
   if (layer.slimeTrailPixels.has(getGamePixelIndex(gamePixelX, gamePixelY + 1))) {
      numNeighbouring++;
   }
   if (layer.slimeTrailPixels.has(getGamePixelIndex(gamePixelX, gamePixelY - 1))) {
      numNeighbouring++;
   }
   
   return numNeighbouring;
}

// @Speed
export function updateSlimeTrails(): void {
   for (const layer of layers) {
      for (const pair of layer.slimeTrailPixels) {
         const gamePixelIndex = pair[0];
         const opacity = pair[1];

         const numNeighbouring = getNumNeighbouringSlimePixels(layer, gamePixelIndex);
         const opacityDecreaseMultiplier = 1 - numNeighbouring / 5;
         
         const newOpacity = opacity - 1 / Vars.SLIME_LAST_TIME_SECONDS * Settings.DT_S * opacityDecreaseMultiplier;
         if (newOpacity <= 0) {
            layer.slimeTrailPixels.delete(gamePixelIndex);
         } else {
            layer.slimeTrailPixels.set(gamePixelIndex, newOpacity);
         }
      }
   }
}

export function renderSlimeTrails(layer: Layer): void {
   if (layer.slimeTrailPixels.size === 0) {
      return;
   }
   
   // const minGamePixelX = convertToGamePixel(minVisibleX);
   // const maxGamePixelX = convertToGamePixel(maxVisibleX);
   // const minGamePixelY = convertToGamePixel(minVisibleY);
   // const maxGamePixelY = convertToGamePixel(maxVisibleY);

   // Create vertices
   // @Garbage
   const vertexData = new Float32Array(layer.slimeTrailPixels.size * 6 * 3);
   let i = 0;
   for (const pair of layer.slimeTrailPixels) {
      const gamePixelIndex = pair[0];
      const slimeOpacity = pair[1];

      const gamePixelX = getGamePixelX(gamePixelIndex);
      const gamePixelY = getGamePixelY(gamePixelIndex);

      // @Temporary?
      // if (gamePixelX < minGamePixelX || gamePixelX > maxGamePixelX || gamePixelY < minGamePixelY || gamePixelY > maxGamePixelY) {
      //    continue;
      // }

      const x1 = gamePixelX * 4;
      const x2 = x1 + 4;
      const y1 = gamePixelY * 4;
      const y2 = y1 + 4;

      const dataOffset = i * 6 * 3;

      vertexData[dataOffset] = x1;
      vertexData[dataOffset + 1] = y1;
      vertexData[dataOffset + 2] = slimeOpacity;

      vertexData[dataOffset + 3] = x2;
      vertexData[dataOffset + 4] = y1;
      vertexData[dataOffset + 5] = slimeOpacity;

      vertexData[dataOffset + 6] = x1;
      vertexData[dataOffset + 7] = y2;
      vertexData[dataOffset + 8] = slimeOpacity;

      vertexData[dataOffset + 9] = x1;
      vertexData[dataOffset + 10] = y2;
      vertexData[dataOffset + 11] = slimeOpacity;

      vertexData[dataOffset + 12] = x2;
      vertexData[dataOffset + 13] = y1;
      vertexData[dataOffset + 14] = slimeOpacity;

      vertexData[dataOffset + 15] = x2;
      vertexData[dataOffset + 16] = y2;
      vertexData[dataOffset + 17] = slimeOpacity;

      i++;
   }

   gl.useProgram(program);

   gl.enable(gl.BLEND);
   // @Hack :DarkTransparencyBug
   gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
   
   // @Speed
   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);


   gl.drawArrays(gl.TRIANGLES, 0, vertexData.length / 3);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}
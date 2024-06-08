import { Settings } from "webgl-test-shared/dist/settings";
import { TileType } from "webgl-test-shared/dist/tiles";
import Camera from "../../Camera";
import { TEXTURE_IMAGE_RECORD } from "../../textures";
import { gl, createWebGLProgram } from "../../webgl";
import { RENDER_CHUNK_EDGE_GENERATION, RenderChunkSolidTileInfo, WORLD_RENDER_CHUNK_SIZE, getRenderChunkIndex, getRenderChunkMaxTileX, getRenderChunkMaxTileY, getRenderChunkMinTileX, getRenderChunkMinTileY } from "../render-chunks";
import Board from "../../Board";
import { TILE_TYPE_TEXTURE_SOURCES } from "../../tile-type-texture-sources";
import { bindUBOToProgram, UBOBindingIndexes } from "../ubos";

let groundTileInfoArray: Array<RenderChunkSolidTileInfo>;
let wallTileInfoArray: Array<RenderChunkSolidTileInfo>;

let program: WebGLProgram;
let tileTextureArray: WebGLTexture;

export function createSolidTileShaders(): void {
   const vertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_tilePos;
   layout(location = 1) in vec2 a_texCoord;
   layout(location = 2) in float a_textureIndex;
   layout(location = 3) in float a_temperature;
   layout(location = 4) in float a_humidity;
   
   out vec2 v_texCoord;
   out float v_textureIndex;
   out float v_temperature;
   out float v_humidity;
   
   void main() {
      vec2 screenPos = (a_tilePos - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);
   
      v_texCoord = a_texCoord;
      v_textureIndex = a_textureIndex;
      v_temperature = a_temperature;
      v_humidity = a_humidity;
   }
   `;
   
   const fragmentShaderText = `#version 300 es
   precision highp float;
   
   uniform highp sampler2DArray u_sampler;
   
   in vec2 v_texCoord;
   in float v_textureIndex;
   in float v_temperature;
   in float v_humidity;
   
   out vec4 outputColour;
   
   // https://stackoverflow.com/questions/9234724/how-to-change-hue-of-a-texture-with-glsl
   vec4 hueShift(vec4 colour, float hueAdjust) {
      const vec4 kRGBToYPrime = vec4 (0.299, 0.587, 0.114, 0.0);
      const vec4 kRGBToI     = vec4 (0.596, -0.275, -0.321, 0.0);
      const vec4 kRGBToQ     = vec4 (0.212, -0.523, 0.311, 0.0);
   
      const vec4 kYIQToR   = vec4 (1.0, 0.956, 0.621, 0.0);
      const vec4 kYIQToG   = vec4 (1.0, -0.272, -0.647, 0.0);
      const vec4 kYIQToB   = vec4 (1.0, -1.107, 1.704, 0.0);
   
      // Convert to YIQ
      float   YPrime  = dot (colour, kRGBToYPrime);
      float   I      = dot (colour, kRGBToI);
      float   Q      = dot (colour, kRGBToQ);
   
      // Calculate the hue and chroma
      float   hue     = atan (Q, I);
      float   chroma  = sqrt (I * I + Q * Q);
   
      // Make the user's adjustments
      hue += hueAdjust;
   
      // Convert back to YIQ
      Q = chroma * sin (hue);
      I = chroma * cos (hue);
   
      // Convert back to RGB
      vec4    yIQ   = vec4 (YPrime, I, Q, 0.0);
      colour.r = dot (yIQ, kYIQToR);
      colour.g = dot (yIQ, kYIQToG);
      colour.b = dot (yIQ, kYIQToB);
   
      return colour;
   }
    
   void main() {
      outputColour = texture(u_sampler, vec3(v_texCoord, v_textureIndex));
      
      if (v_temperature >= 0.0) {
         // Places with low temperature and high humidity don't exist, so if in low temperature
         // then reduce the humidity to at most the temperature
         float humidity = v_humidity;
         if (v_temperature <= 0.5) {
            humidity = mix(humidity, 0.0, 1.0 - v_temperature * 2.0);
         }
         
         // Less humidity desaturates, more humidity saturates
         float humidityMultiplier = (humidity - 0.5) * -0.7;
         if (humidityMultiplier > 0.0) {
            // Desaturate
            outputColour.r = mix(outputColour.r, 1.0, humidityMultiplier * 0.7);
            outputColour.b = mix(outputColour.b, 1.0, humidityMultiplier * 0.7);
         } else {
            // Saturate
            outputColour.r = mix(outputColour.r, 0.0, -humidityMultiplier);
            outputColour.b = mix(outputColour.b, 0.0, -humidityMultiplier);
         }
   
         // Positive hue adjust goes to blue, negative hue adjust goes to red
         float hueAdjust = (v_temperature - 0.5) * 0.8;
         outputColour = hueShift(outputColour, hueAdjust);
      }
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   bindUBOToProgram(gl, program, UBOBindingIndexes.CAMERA);

   gl.useProgram(program);
   
   const samplerUniformLocation = gl.getUniformLocation(program, "u_sampler")!;
   gl.uniform1i(samplerUniformLocation, 0);

   // 
   // Create texture array
   // 

   tileTextureArray = gl.createTexture()!;
   gl.bindTexture(gl.TEXTURE_2D_ARRAY, tileTextureArray);
   gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 5, gl.RGBA8, 16, 16, TILE_TYPE_TEXTURE_SOURCES.length);

   gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
   gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
   
   // Set all texture units
   for (let i = 0; i < TILE_TYPE_TEXTURE_SOURCES.length; i++) {
      const textureSource = TILE_TYPE_TEXTURE_SOURCES[i];
      const image = TEXTURE_IMAGE_RECORD[textureSource];
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, 16, 16, 1, gl.RGBA, gl.UNSIGNED_BYTE, image);
   }

   gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
}

const updateVertexData = (data: Float32Array, renderChunkX: number, renderChunkY: number, isWallTiles: boolean): void => {
   const minTileX = getRenderChunkMinTileX(renderChunkX);
   const maxTileX = getRenderChunkMaxTileX(renderChunkX);
   const minTileY = getRenderChunkMinTileY(renderChunkY);
   const maxTileY = getRenderChunkMaxTileY(renderChunkY);
   
   let i = 0;
   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const tile = Board.getTile(tileX, tileY);
         if (tile.type === TileType.water || tile.isWall !== isWallTiles) {
            continue;
         }

         const textureIndex = tile.type as number;

         const x1 = tile.x * Settings.TILE_SIZE;
         const x2 = (tile.x + 1) * Settings.TILE_SIZE;
         const y1 = tile.y * Settings.TILE_SIZE;
         const y2 = (tile.y + 1) * Settings.TILE_SIZE;

         let temperature = -1;
         let humidity = -1;
         if (tile.type === TileType.grass) {
            const grassInfo = Board.grassInfo[tileX][tileY];
            temperature = grassInfo.temperature;
            humidity = grassInfo.humidity;
         }

         data[i * 42] = x1;
         data[i * 42 + 1] = y1;
         data[i * 42 + 2] = 0;
         data[i * 42 + 3] = 0;
         data[i * 42 + 4] = textureIndex;
         data[i * 42 + 5] = temperature;
         data[i * 42 + 6] = humidity;

         data[i * 42 + 7] = x2;
         data[i * 42 + 8] = y1;
         data[i * 42 + 9] = 1;
         data[i * 42 + 10] = 0;
         data[i * 42 + 11] = textureIndex;
         data[i * 42 + 12] = temperature;
         data[i * 42 + 13] = humidity;

         data[i * 42 + 14] = x1;
         data[i * 42 + 15] = y2;
         data[i * 42 + 16] = 0;
         data[i * 42 + 17] = 1;
         data[i * 42 + 18] = textureIndex;
         data[i * 42 + 19] = temperature;
         data[i * 42 + 20] = humidity;

         data[i * 42 + 21] = x1;
         data[i * 42 + 22] = y2;
         data[i * 42 + 23] = 0;
         data[i * 42 + 24] = 1;
         data[i * 42 + 25] = textureIndex;
         data[i * 42 + 26] = temperature;
         data[i * 42 + 27] = humidity;

         data[i * 42 + 28] = x2;
         data[i * 42 + 29] = y1;
         data[i * 42 + 30] = 1;
         data[i * 42 + 31] = 0;
         data[i * 42 + 32] = textureIndex;
         data[i * 42 + 33] = temperature;
         data[i * 42 + 34] = humidity;

         data[i * 42 + 35] = x2;
         data[i * 42 + 36] = y2;
         data[i * 42 + 37] = 1;
         data[i * 42 + 38] = 1;
         data[i * 42 + 39] = textureIndex;
         data[i * 42 + 40] = temperature;
         data[i * 42 + 41] = humidity;

         i++;
      }
   }
}

// @Cleanup A lot of the webgl calls in create and update render data are the same

const createSolidTileRenderChunkData = (renderChunkX: number, renderChunkY: number, isWallTiles: boolean): RenderChunkSolidTileInfo => {
   const minTileX = getRenderChunkMinTileX(renderChunkX);
   const maxTileX = getRenderChunkMaxTileX(renderChunkX);
   const minTileY = getRenderChunkMinTileY(renderChunkY);
   const maxTileY = getRenderChunkMaxTileY(renderChunkY);

   let numTiles = 0;
   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const tile = Board.getTile(tileX, tileY);
         if (tile.type !== TileType.water && tile.isWall === isWallTiles) {
            numTiles++;
         }
      }
   }

   const vertexData = new Float32Array(numTiles * 6 * 8);
   updateVertexData(vertexData, renderChunkX, renderChunkY, isWallTiles);

   const vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);
   
   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(4, 1, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 6 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);
   gl.enableVertexAttribArray(3);
   gl.enableVertexAttribArray(4);

   gl.bindVertexArray(null);

   return {
      buffer: buffer,
      vao: vao,
      vertexCount: numTiles * 6
   };
}

export function createTileRenderChunks(): void {
   // @Speed: Clear these instead of setting them to empty so that it remains const (good for v8)
   groundTileInfoArray = [];
   wallTileInfoArray = [];
   
   for (let renderChunkY = -RENDER_CHUNK_EDGE_GENERATION; renderChunkY < WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION; renderChunkY++) {
      for (let renderChunkX = -RENDER_CHUNK_EDGE_GENERATION; renderChunkX < WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION; renderChunkX++) {
         groundTileInfoArray.push(createSolidTileRenderChunkData(renderChunkX, renderChunkY, false));
         wallTileInfoArray.push(createSolidTileRenderChunkData(renderChunkX, renderChunkY, true));
      }
   }
}

const recalculateChunkData = (info: RenderChunkSolidTileInfo, renderChunkX: number, renderChunkY: number, isWallTiles: boolean): void => {
   const vertexData = new Float32Array(info.vertexCount);
   updateVertexData(vertexData, renderChunkX, renderChunkY, isWallTiles);

   gl.bindVertexArray(info.vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, info.buffer);
   gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertexData);
   
   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(4, 1, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 6 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);
   gl.enableVertexAttribArray(3);
   gl.enableVertexAttribArray(4);

   gl.bindVertexArray(null);
}

export function recalculateSolidTileRenderChunkData(renderChunkX: number, renderChunkY: number): void {
   const idx = getRenderChunkIndex(renderChunkX, renderChunkY);
   recalculateChunkData(groundTileInfoArray[idx], renderChunkX, renderChunkX, false);
   recalculateChunkData(wallTileInfoArray[idx], renderChunkX, renderChunkX, true);
}

export function renderSolidTiles(isWallTiles: boolean): void {
   gl.useProgram(program);

   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D_ARRAY, tileTextureArray);
   
   const infoArray = isWallTiles ? wallTileInfoArray : groundTileInfoArray;
   for (let renderChunkX = Camera.minVisibleRenderChunkX; renderChunkX <= Camera.maxVisibleRenderChunkX; renderChunkX++) {
      for (let renderChunkY = Camera.minVisibleRenderChunkY; renderChunkY <= Camera.maxVisibleRenderChunkY; renderChunkY++) {
         const idx = getRenderChunkIndex(renderChunkX, renderChunkY);
         const tileInfo = infoArray[idx];

         gl.bindVertexArray(tileInfo.vao);
         gl.drawArrays(gl.TRIANGLES, 0, tileInfo.vertexCount);
      }
   }

   gl.bindVertexArray(null);
}
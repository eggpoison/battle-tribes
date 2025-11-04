import { Settings } from "battletribes-shared/settings";
import { NUM_TILE_TYPES, SubtileType, TileType, TileTypeString } from "battletribes-shared/tiles";
import { gl, createWebGLProgram, createTextureArray } from "../../webgl";
import { RENDER_CHUNK_EDGE_GENERATION, RENDER_CHUNK_SIZE, RenderChunkSolidTileInfo, WORLD_RENDER_CHUNK_SIZE, getRenderChunkIndex, getRenderChunkMaxTileX, getRenderChunkMaxTileY, getRenderChunkMinTileX, getRenderChunkMinTileY } from "../render-chunks";
import { bindUBOToProgram, UBOBindingIndex } from "../ubos";
import Layer, { getSubtileIndex, getTileIndexIncludingEdges } from "../../Layer";
import { layers } from "../../world";
import { minVisibleRenderChunkX, maxVisibleRenderChunkX, minVisibleRenderChunkY, maxVisibleRenderChunkY } from "../../camera";

export const FLOOR_TILE_TEXTURE_SOURCE_RECORD: Partial<Record<TileType, string | null>> = {
   [TileType.grass]: "tiles/grass.png",
   [TileType.water]: null,
   [TileType.rock]: "tiles/rock.png",
   [TileType.snow]: "tiles/snow.png",
   [TileType.ice]: "tiles/ice.png",
   [TileType.permafrost]: "tiles/permafrost.png",
   [TileType.sandyDirt]: "tiles/sandy-dirt.png",
   [TileType.sandyDirtDark]: "tiles/sandy-dirt-dark.png",
   [TileType.sand]: "tiles/sand.png",
   [TileType.sludge]: "tiles/sludge.png",
   [TileType.slime]: "tiles/slime.png",
   [TileType.dropdown]: null,
   [TileType.stone]: "tiles/stone.png",
   [TileType.stoneWallFloor]: "tiles/stone-wall-floor.png",
};
const FLOOR_TILE_TO_TEXTURE_ARRAY_INDEX_RECORD: Partial<Record<TileType, number | null>> = {};
(() => {
   let i = 0;
   for (let tileType: TileType = 0; tileType < NUM_TILE_TYPES; tileType++) {
      const textureSource = FLOOR_TILE_TEXTURE_SOURCE_RECORD[tileType];
      if (typeof textureSource !== "undefined") {
         if (textureSource !== null) {
            FLOOR_TILE_TO_TEXTURE_ARRAY_INDEX_RECORD[tileType] = i;
            i++;
         } else {
            FLOOR_TILE_TO_TEXTURE_ARRAY_INDEX_RECORD[tileType] = null;
         }
      }
   }
})();

export const WALL_TILE_TEXTURE_SOURCE_RECORD: Partial<Record<SubtileType, ReadonlyArray<string>>> = {
   [SubtileType.rockWall]: ["tiles/dark-rock.png"],
   [SubtileType.sandstoneWall]: ["tiles/sandstone.png"],
   [SubtileType.stoneWall]: ["tiles/stone-wall-1.png", "tiles/stone-wall-2.png"],
   [SubtileType.permafrostWall]: ["tiles/permafrost-wall.png"],
};
const WALL_SUBTILE_TO_TEXTURE_ARRAY_INDEX_RECORD: Partial<Record<SubtileType, Array<number>>> = {};
(() => {
   let i = 0;
   for (let subtileType: SubtileType = 0; subtileType < SubtileType._LENGTH_; subtileType++) {
      const textureSources = WALL_TILE_TEXTURE_SOURCE_RECORD[subtileType];
      if (typeof textureSources !== "undefined") {
         if (typeof WALL_SUBTILE_TO_TEXTURE_ARRAY_INDEX_RECORD[subtileType] === "undefined") {
            WALL_SUBTILE_TO_TEXTURE_ARRAY_INDEX_RECORD[subtileType] = [];
         }
         
         for (let j = 0; j < textureSources.length; j++) {
            WALL_SUBTILE_TO_TEXTURE_ARRAY_INDEX_RECORD[subtileType]!.push(i);
            i++;
         }
      }
   }
})();

let groundTileInfoArrays = new Array<Array<RenderChunkSolidTileInfo>>();
let wallTileInfoArrays = new Array<Array<RenderChunkSolidTileInfo>>();

let program: WebGLProgram;
let floorTileTextureArray: WebGLTexture;
let wallTileTextureArray: WebGLTexture;

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
   bindUBOToProgram(gl, program, UBOBindingIndex.CAMERA);

   gl.useProgram(program);
   
   const samplerUniformLocation = gl.getUniformLocation(program, "u_sampler")!;
   gl.uniform1i(samplerUniformLocation, 0);

   // Floors
   const floorTextureSources = new Array<string>();
   for (let tileType: TileType = 0; tileType < NUM_TILE_TYPES; tileType++) {
      const textureSource = FLOOR_TILE_TEXTURE_SOURCE_RECORD[tileType];
      if (typeof textureSource !== "undefined" && textureSource !== null) {
         floorTextureSources.push(textureSource);
      }
   }
   floorTileTextureArray = createTextureArray(floorTextureSources, 16, 16, 5);

   // Walls
   const wallTextureSources = new Array<string>();
   for (let subtileType: SubtileType = 0; subtileType < SubtileType._LENGTH_; subtileType++) {
      const textureSources = WALL_TILE_TEXTURE_SOURCE_RECORD[subtileType];
      if (typeof textureSources !== "undefined") {
         for (const textureSource of textureSources) {
            wallTextureSources.push(textureSource);
         }
      }
   }
   wallTileTextureArray = createTextureArray(wallTextureSources, 16, 16, 5);
}

const addElementToData = (data: Float32Array, dataOffset: number, x1: number, x2: number, y1: number, y2: number, u1: number, u2: number, v1: number, v2: number, textureIndex: number, temperature: number, humidity: number): void => {
   data[dataOffset] = x1;
   data[dataOffset + 1] = y1;
   data[dataOffset + 2] = u1;
   data[dataOffset + 3] = v1;
   data[dataOffset + 4] = textureIndex;
   data[dataOffset + 5] = temperature;
   data[dataOffset + 6] = humidity;

   data[dataOffset + 7] = x2;
   data[dataOffset + 8] = y1;
   data[dataOffset + 9] = u2;
   data[dataOffset + 10] = v1;
   data[dataOffset + 11] = textureIndex;
   data[dataOffset + 12] = temperature;
   data[dataOffset + 13] = humidity;

   data[dataOffset + 14] = x1;
   data[dataOffset + 15] = y2;
   data[dataOffset + 16] = u1;
   data[dataOffset + 17] = v2;
   data[dataOffset + 18] = textureIndex;
   data[dataOffset + 19] = temperature;
   data[dataOffset + 20] = humidity;

   data[dataOffset + 21] = x1;
   data[dataOffset + 22] = y2;
   data[dataOffset + 23] = u1;
   data[dataOffset + 24] = v2;
   data[dataOffset + 25] = textureIndex;
   data[dataOffset + 26] = temperature;
   data[dataOffset + 27] = humidity;

   data[dataOffset + 28] = x2;
   data[dataOffset + 29] = y1;
   data[dataOffset + 30] = u2;
   data[dataOffset + 31] = v1;
   data[dataOffset + 32] = textureIndex;
   data[dataOffset + 33] = temperature;
   data[dataOffset + 34] = humidity;

   data[dataOffset + 35] = x2;
   data[dataOffset + 36] = y2;
   data[dataOffset + 37] = u2;
   data[dataOffset + 38] = v2;
   data[dataOffset + 39] = textureIndex;
   data[dataOffset + 40] = temperature;
   data[dataOffset + 41] = humidity;
}

const updateFloorVertexData = (data: Float32Array, layer: Layer, renderChunkX: number, renderChunkY: number): void => {
   const minTileX = getRenderChunkMinTileX(renderChunkX);
   const maxTileX = getRenderChunkMaxTileX(renderChunkX);
   const minTileY = getRenderChunkMinTileY(renderChunkY);
   const maxTileY = getRenderChunkMaxTileY(renderChunkY);
   
   let i = 0;
   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         const tile = layer.getTile(tileIndex);

         const textureIndex = FLOOR_TILE_TO_TEXTURE_ARRAY_INDEX_RECORD[tile.type];
         if (typeof textureIndex === "undefined") {
            throw new Error(TileTypeString[tile.type]);
         }
         if (textureIndex === null) {
            continue;
         }

         const x1 = tile.x * Settings.TILE_SIZE;
         const x2 = (tile.x + 1) * Settings.TILE_SIZE;
         const y1 = tile.y * Settings.TILE_SIZE;
         const y2 = (tile.y + 1) * Settings.TILE_SIZE;

         let temperature = -1;
         let humidity = -1;
         if (tile.type === TileType.grass) {
            const grassInfo = layer.grassInfo[tileX][tileY];
            temperature = grassInfo.temperature;
            humidity = grassInfo.humidity;
         }

         const dataOffset = i * 42;
         addElementToData(data, dataOffset, x1, x2, y1, y2, 0, 1, 0, 1, textureIndex, temperature, humidity);

         i++;
      }
   }
}

const updateWallVertexData = (data: Float32Array, layer: Layer, renderChunkX: number, renderChunkY: number): void => {
   const minTileX = getRenderChunkMinTileX(renderChunkX);
   const maxTileX = getRenderChunkMaxTileX(renderChunkX);
   const minTileY = getRenderChunkMinTileY(renderChunkY);
   const maxTileY = getRenderChunkMaxTileY(renderChunkY);
   
   const minSubtileX = minTileX * 4;
   const maxSubtileX = maxTileX * 4 + 3;
   const minSubtileY = minTileY * 4;
   const maxSubtileY = maxTileY * 4 + 3;
   
   // Clear any previous data
   for (let i = 0; i < data.length; i++) {
      data[i] = 0;
   }
   
   let i = 0;
   for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
      for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
         const subtileIndex = getSubtileIndex(subtileX, subtileY);
         const subtileType = layer.getSubtileType(subtileIndex);
         if (subtileType === SubtileType.none) {
            continue;
         }

         const textureIndexes = WALL_SUBTILE_TO_TEXTURE_ARRAY_INDEX_RECORD[subtileType];
         if (typeof textureIndexes === "undefined") {
            throw new Error(subtileType.toString());
         }

         const tileX = Math.floor(subtileX / 4);
         const tileY = Math.floor(subtileY / 4);
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);

         const variant = layer.wallSubtileVariants[tileIndex];
         if (typeof variant === "undefined") {
            throw new Error();
         }
         const textureIndex = textureIndexes[variant];
         
         const x1 = subtileX * Settings.SUBTILE_SIZE;
         const x2 = (subtileX + 1) * Settings.SUBTILE_SIZE;
         const y1 = subtileY * Settings.SUBTILE_SIZE;
         const y2 = (subtileY + 1) * Settings.SUBTILE_SIZE;

         const u1 = (subtileX / 4) % 1;
         const u2 = u1 + 0.25;
         const v1 = (subtileY / 4) % 1;
         const v2 = v1 + 0.25;

         const dataOffset = i * 42;
         addElementToData(data, dataOffset, x1, x2, y1, y2, u1, u2, v1, v2, textureIndex, -1, -1);

         i++;
      }
   }
}

// @Cleanup: A lot of the webgl calls in create and update render data are the same

const createSolidTileRenderChunkData = (layer: Layer, renderChunkX: number, renderChunkY: number, isWallTiles: boolean): RenderChunkSolidTileInfo => {
   let numElements: number;
   if (isWallTiles) {
      const minTileX = getRenderChunkMinTileX(renderChunkX);
      const maxTileX = getRenderChunkMaxTileX(renderChunkX);
      const minTileY = getRenderChunkMinTileY(renderChunkY);
      const maxTileY = getRenderChunkMaxTileY(renderChunkY);
   
      const minSubtileX = minTileX * 4;
      const maxSubtileX = maxTileX * 4 + 3;
      const minSubtileY = minTileY * 4;
      const maxSubtileY = maxTileY * 4 + 3;
      
      numElements = 0;
      for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
         for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
            if (layer.subtileIsWall(subtileX, subtileY)) {
               numElements++;
            }
         }
      }
   } else {
      numElements = RENDER_CHUNK_SIZE * RENDER_CHUNK_SIZE;
   }
   

   const vertexData = new Float32Array(numElements * 6 * 7);
   if (isWallTiles) {
      updateWallVertexData(vertexData, layer, renderChunkX, renderChunkY);
   } else {
      updateFloorVertexData(vertexData, layer, renderChunkX, renderChunkY);
   }

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
      vertexCount: numElements * 6
   };
}

export function clearSolidTileRenderingData(): void {
   // @Speed: Clear these instead of setting them to empty so that it remains const (good for v8)
   groundTileInfoArrays = [];
   wallTileInfoArrays = [];
}

export function createTileRenderChunks(layer: Layer): void {
   const groundTileInfoArray = [];
   const wallTileInfoArray = [];
   
   for (let renderChunkY = -RENDER_CHUNK_EDGE_GENERATION; renderChunkY < WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION; renderChunkY++) {
      for (let renderChunkX = -RENDER_CHUNK_EDGE_GENERATION; renderChunkX < WORLD_RENDER_CHUNK_SIZE + RENDER_CHUNK_EDGE_GENERATION; renderChunkX++) {
         groundTileInfoArray.push(createSolidTileRenderChunkData(layer, renderChunkX, renderChunkY, false));
         wallTileInfoArray.push(createSolidTileRenderChunkData(layer, renderChunkX, renderChunkY, true));
      }
   }

   groundTileInfoArrays.push(groundTileInfoArray);
   wallTileInfoArrays.push(wallTileInfoArray);
}

const recalculateChunkData = (info: RenderChunkSolidTileInfo, layer: Layer, renderChunkX: number, renderChunkY: number, isWallTiles: boolean): void => {
   // @Memory @Garbage: Reuse previous array
   const vertexData = new Float32Array(info.vertexCount * 7);
   if (isWallTiles) {
      updateWallVertexData(vertexData, layer, renderChunkX, renderChunkY);
   } else {
      updateFloorVertexData(vertexData, layer, renderChunkX, renderChunkY);
   }

   gl.bindVertexArray(info.vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, info.buffer);
   gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertexData);

   gl.bindVertexArray(null);
}

export function recalculateWallSubtileRenderData(layer: Layer, renderChunkX: number, renderChunkY: number): void {
   const idx = getRenderChunkIndex(renderChunkX, renderChunkY);
   recalculateChunkData(wallTileInfoArrays[layer.idx][idx], layer, renderChunkX, renderChunkY, true);
}

export function recalculateSolidTileRenderChunkData(layer: Layer, renderChunkX: number, renderChunkY: number): void {
   // @Hack
   const layerIdx = layers.indexOf(layer);
   
   const idx = getRenderChunkIndex(renderChunkX, renderChunkY);
   recalculateChunkData(groundTileInfoArrays[layerIdx][idx], layer, renderChunkX, renderChunkX, false);
   recalculateChunkData(wallTileInfoArrays[layerIdx][idx], layer, renderChunkX, renderChunkX, true);
}

export function renderSolidTiles(layer: Layer, isWallTiles: boolean): void {
   gl.useProgram(program);

   gl.activeTexture(gl.TEXTURE0);
   const textureArray = isWallTiles ? wallTileTextureArray : floorTileTextureArray;
   gl.bindTexture(gl.TEXTURE_2D_ARRAY, textureArray);
   // @Hack
   const layerIdx = layers.indexOf(layer);
   
   const infoArray = isWallTiles ? wallTileInfoArrays[layerIdx] : groundTileInfoArrays[layerIdx];
   for (let renderChunkX = minVisibleRenderChunkX; renderChunkX <= maxVisibleRenderChunkX; renderChunkX++) {
      for (let renderChunkY = minVisibleRenderChunkY; renderChunkY <= maxVisibleRenderChunkY; renderChunkY++) {
         const idx = getRenderChunkIndex(renderChunkX, renderChunkY);
         const tileInfo = infoArray[idx];

         gl.bindVertexArray(tileInfo.vao);
         gl.drawArrays(gl.TRIANGLES, 0, tileInfo.vertexCount);
      }
   }

   gl.bindVertexArray(null);
}
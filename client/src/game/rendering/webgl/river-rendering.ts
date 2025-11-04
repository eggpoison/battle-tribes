import { TileType } from "battletribes-shared/tiles";
import { lerp, randFloat, rotateXAroundPoint, rotateYAroundPoint } from "battletribes-shared/utils";
import { WaterRockData, WaterRockSize } from "battletribes-shared/client-server-types";
import { Settings } from "battletribes-shared/settings";
import { createWebGLProgram, gl } from "../../webgl";
import { getTexture } from "../../textures";
import { RenderChunkRiverInfo, WORLD_RENDER_CHUNK_SIZE, getRenderChunkMaxTileX, getRenderChunkMaxTileY, getRenderChunkMinTileX, getRenderChunkMinTileY, getRenderChunkRiverInfo } from "../render-chunks";
import { Tile } from "../../Tile";
import { UBOBindingIndex, bindUBOToProgram } from "../ubos";
import Layer, { getTileIndexIncludingEdges, tileIsWithinEdge } from "../../Layer";
import { undergroundLayer } from "../../world";
import { minVisibleRenderChunkX, maxVisibleRenderChunkX, minVisibleRenderChunkY, maxVisibleRenderChunkY } from "../../camera";

const SHALLOW_WATER_COLOUR = [118/255, 185/255, 242/255] as const;
const DEEP_WATER_COLOUR = [86/255, 141/255, 184/255] as const;

const WATER_VISUAL_FLOW_SPEED = 0.3;

/** How much the stepping stone foam should be offset from their stepping stones */
const FOAM_OFFSET = 3;
/** Extra size given to the foam under stepping stones */
const FOAM_PADDING = 3.5;

const WATER_ROCK_SIZES: Record<WaterRockSize, number> = {
   [WaterRockSize.small]: 24,
   [WaterRockSize.large]: 32
};

const WATER_ROCK_TEXTURES: Record<WaterRockSize, string> = {
   [WaterRockSize.small]: "miscellaneous/river/water-rock-small.png",
   [WaterRockSize.large]: "miscellaneous/river/water-rock-large.png"
};

let baseProgram: WebGLProgram;
let rockProgram: WebGLProgram;
let highlightsProgram: WebGLProgram;
let noiseProgram: WebGLProgram;
let transitionProgram: WebGLProgram;
let foamProgram: WebGLProgram;
let steppingStoneProgram: WebGLProgram;

const riverFoamVAOs = new Array<WebGLVertexArrayObject>();
const riverFoamVertexCounts = new Array<number>();
const riverSteppingStoneVAOs = new Array<WebGLVertexArrayObject>();
const riverSteppingStoneVertexCounts = new Array<number>();

let baseProgramOpacityUniformLocation: WebGLUniformLocation;
let baseProgramIsUndergroundUniformLocation: WebGLUniformLocation;

// @INCOMPLETE: All the stepping stone stuff!

// @SQUEAM
// export function createRiverSteppingStoneData(riverSteppingStones: ReadonlyArray<RiverSteppingStoneData>): void {
//    // Group the stepping stones
//    const groups = new Array<Array<RiverSteppingStoneData>>();
//    for (const steppingStone of riverSteppingStones) {
//       if (typeof groups[steppingStone.groupID] === "undefined") {
//          groups[steppingStone.groupID] = [];
//       }
//       groups[steppingStone.groupID].push(steppingStone);
//    }

//    // Create data
//    for (const steppingStones of groups) {
//       // 
//       // Foam data
//       // 

//       const foamVertexData = calculateFoamVertexData(steppingStones);
//       const foamBuffer = gl.createBuffer()!;
//       gl.bindBuffer(gl.ARRAY_BUFFER, foamBuffer);
//       gl.bufferData(gl.ARRAY_BUFFER, foamVertexData, gl.STATIC_DRAW);

//       riverFoamVAOs.push(createFoamVAO(foamBuffer));
//       riverFoamVertexCounts.push(foamVertexData.length / 7);
      
//       // 
//       // Stepping stone data
//       // 

//       const steppingStoneVertexData = calculateSteppingStoneVertexData(steppingStones);
//       const steppingStoneBuffer = gl.createBuffer()!;
//       gl.bindBuffer(gl.ARRAY_BUFFER, steppingStoneBuffer);
//       gl.bufferData(gl.ARRAY_BUFFER, steppingStoneVertexData, gl.STATIC_DRAW);

//       riverSteppingStoneVAOs.push(createSteppingStoneVAO(steppingStoneBuffer));
//       riverSteppingStoneVertexCounts.push(steppingStoneVertexData.length / 5);
//    }
// }

export function createRiverShaders(): void {
   // Base shaders
   
   const baseVertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in vec2 a_coord;
   layout(location = 2) in float a_topLeftLandDistance;
   layout(location = 3) in float a_topRightLandDistance;
   layout(location = 4) in float a_bottomLeftLandDistance;
   layout(location = 5) in float a_bottomRightLandDistance;
   
   out vec2 v_coord;
   out float v_topLeftLandDistance;
   out float v_topRightLandDistance;
   out float v_bottomLeftLandDistance;
   out float v_bottomRightLandDistance;
    
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);
   
      v_coord = a_coord;
      v_topLeftLandDistance = a_topLeftLandDistance;
      v_topRightLandDistance = a_topRightLandDistance;
      v_bottomLeftLandDistance = a_bottomLeftLandDistance;
      v_bottomRightLandDistance = a_bottomRightLandDistance;
   }
   `;
   
   const baseFragmentShaderText = `#version 300 es
   precision mediump float;
   
   uniform sampler2D u_baseTexture;

   uniform float u_opacity;
   uniform bool u_isUnderground;
    
   in vec2 v_coord;
   in float v_topLeftLandDistance;
   in float v_topRightLandDistance;
   in float v_bottomLeftLandDistance;
   in float v_bottomRightLandDistance;
   
   out vec4 outputColour;
   
   void main() {
      float bottomLerp = mix(v_bottomLeftLandDistance, v_bottomRightLandDistance, v_coord.x);
      float topLerp = mix(v_topLeftLandDistance, v_topRightLandDistance, v_coord.x);
      float dist = mix(bottomLerp, topLerp, v_coord.y);
   
      float r = mix(${SHALLOW_WATER_COLOUR[0]}, ${DEEP_WATER_COLOUR[0]}, dist);
      float g = mix(${SHALLOW_WATER_COLOUR[1]}, ${DEEP_WATER_COLOUR[1]}, dist);
      float b = mix(${SHALLOW_WATER_COLOUR[2]}, ${DEEP_WATER_COLOUR[2]}, dist);
      vec4 colourWithAlpha = vec4(r, g, b, u_opacity);
   
      vec4 textureColour = texture(u_baseTexture, v_coord);
   
      outputColour = colourWithAlpha * textureColour;

      if (u_isUnderground) {
         outputColour.rgb *= 0.8;
      }

      // @Hack :DarkTransparencyBug
      outputColour.rgb *= outputColour.a;
   }
   `;
   
   // Rock shaders
   
   const rockVertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in vec2 a_texCoord;
   layout(location = 2) in float a_opacity;
   layout(location = 3) in float a_textureIdx;
   
   out vec2 v_texCoord;
   out float v_opacity;
   out float v_textureIdx;
    
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);
   
      v_texCoord = a_texCoord;
      v_opacity = a_opacity;
      v_textureIdx = a_textureIdx;
   }
   `;
   
   const rockFragmentShaderText = `#version 300 es
   precision mediump float;
    
   uniform sampler2D u_texture1;
   uniform sampler2D u_texture2;
    
   in vec2 v_texCoord;
   in float v_opacity;
   in float v_textureIdx;
   
   out vec4 outputColour;
    
   void main() {
      if (v_textureIdx < 0.5) {
         outputColour = texture(u_texture1, v_texCoord);
      } else {
         outputColour = texture(u_texture2, v_texCoord);
      }
      outputColour.a *= v_opacity;

      // @Hack :DarkTransparencyBug
      outputColour.rgb *= outputColour.a;
   }
   `;
   
   // 
   // Highlights shaders
   // 
   
   const highlightsVertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in vec2 a_texCoord;
   layout(location = 2) in float a_fadeOffset;
   
   out vec2 v_texCoord;
   out float v_fadeOffset;
    
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);
   
      v_texCoord = a_texCoord;
      v_fadeOffset = a_fadeOffset;
   }
   `;
   
   const highlightsFragmentShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Time {
      uniform float u_time;
   };
    
   uniform sampler2D u_texture1;
   uniform sampler2D u_texture2;
   uniform sampler2D u_texture3;
   
   in vec2 v_texCoord;
   in float v_fadeOffset;
   
   out vec4 outputColour;
    
   void main() {
      float timeFadeProgress = mod(u_time / 3000.0, 3.0);
   
      float fadeProgress = timeFadeProgress + v_fadeOffset;
      fadeProgress = mod(fadeProgress, 3.0);
      
      if (fadeProgress < 1.0) {
         vec4 texture1Colour = texture(u_texture1, v_texCoord);
         vec4 texture2Colour = texture(u_texture2, v_texCoord);
         outputColour = mix(texture1Colour, texture2Colour, fadeProgress);
      } else if (fadeProgress < 2.0) {
         vec4 texture2Colour = texture(u_texture2, v_texCoord);
         vec4 texture3Colour = texture(u_texture3, v_texCoord);
         outputColour = mix(texture2Colour, texture3Colour, fadeProgress - 1.0);
      } else {
         vec4 texture3Colour = texture(u_texture3, v_texCoord);
         vec4 texture1Colour = texture(u_texture1, v_texCoord);
         outputColour = mix(texture3Colour, texture1Colour, fadeProgress - 2.0);
      }
   
      outputColour.a *= 0.4;
      // @Hack :DarkTransparencyBug
      outputColour.rgb *= outputColour.a;
   }
   `;
   
   // 
   // Noise shaders
   // 
   
   const noiseVertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in vec2 a_texCoord;
   layout(location = 2) in vec2 a_flowDirection;
   layout(location = 3) in float a_animationOffset;
   layout(location = 4) in float a_animationSpeed;
   
   out vec2 v_texCoord;
   out vec2 v_flowDirection;
   out float v_animationOffset;
   out float v_animationSpeed;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);
   
      v_texCoord = a_texCoord;
      v_flowDirection = a_flowDirection;
      v_animationOffset = a_animationOffset;
      v_animationSpeed = a_animationSpeed;
   }
   `;
   
   const noiseFragmentShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Time {
      uniform float u_time;
   };
    
   uniform sampler2D u_noiseTexture;
   uniform float u_animationOffset;
    
   in vec2 v_texCoord;
   in vec2 v_flowDirection;
   in float v_animationOffset;
   in float v_animationSpeed;
   
   out vec4 outputColour;
    
   void main() {
      float timeAnimationOffset = u_time * ${WATER_VISUAL_FLOW_SPEED} / 1000.0;
   
      float animationOffset = timeAnimationOffset * v_animationSpeed + v_animationOffset;
      vec2 offsetCoord = v_flowDirection * animationOffset;
      outputColour = texture(u_noiseTexture, fract(v_texCoord - offsetCoord));
   
      outputColour.r += 0.5;
      outputColour.g += 0.5;
      outputColour.b += 0.5;
   
      float distanceFromCenter = max(abs(v_texCoord.x - 0.5), abs(v_texCoord.y - 0.5));
      if (distanceFromCenter >= 0.166) {
         outputColour.a *= mix(1.0, 0.0, (distanceFromCenter - 0.166) * 3.0);
      }

      // @Hack :DarkTransparencyBug
      outputColour.rgb *= outputColour.a;
   }
   `;
   
   // 
   // Transition shaders
   // 
   
   const transitionVertexShaderText = `#version 300 es
   precision mediump float;
   
   #define TILE_SIZE 64.0;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_tile;
   layout(location = 1) in vec2 a_texCoord;
   layout(location = 2) in float a_topLeftMarker;
   layout(location = 3) in float a_topRightMarker;
   layout(location = 4) in float a_bottomLeftMarker;
   layout(location = 5) in float a_bottomRightMarker;
   layout(location = 6) in float a_topMarker;
   layout(location = 7) in float a_rightMarker;
   layout(location = 8) in float a_leftMarker;
   layout(location = 9) in float a_bottomMarker;
   
   out vec2 v_tile;
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
      vec2 position = a_tile * TILE_SIZE;
      vec2 screenPos = (position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);
   
      v_tile = a_tile;
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
   
   const transitionFragmentShaderText = `#version 300 es
   precision mediump float;
   
   #define NOISE_TEXTURE_SIZE 128
   
   uniform sampler2D u_transitionTexture;
   uniform sampler2D u_noiseTexture;
    
   in vec2 v_tile;
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
      if (v_topLeftMarker < 0.5) {
         float topLeftDist = 1.0 - (distance(vec2(0.0, 1.0), v_texCoord) * (1.0 - v_topLeftMarker));
         dist = max(dist, topLeftDist - 0.5);
      }
      if (v_topRightMarker < 0.5) {
         float topRightDist = 1.0 - (distance(vec2(1.0, 1.0), v_texCoord) * (1.0 - v_topRightMarker));
         dist = max(dist, topRightDist - 0.5);
      }
      if (v_bottomLeftMarker < 0.5) {
         float bottomLeftDist = 1.0 - (distance(vec2(0.0, 0.0), v_texCoord) * (1.0 - v_bottomLeftMarker));
         dist = max(dist, bottomLeftDist - 0.5);
      }
      if (v_bottomRightMarker < 0.5) {
         float bottomRightDist = 1.0 - (distance(vec2(1.0, 0.0), v_texCoord) * (1.0 - v_bottomRightMarker));
         dist = max(dist, bottomRightDist - 0.5);
      }
   
      if (v_topMarker < 0.5) {
         float topDist = v_texCoord.y * (1.0 - v_topMarker);
         dist = max(dist, topDist - 0.5);
      }
      if (v_rightMarker < 0.5) {
         float rightDist = (1.0 - v_texCoord.x) * (1.0 - v_rightMarker);
         dist = max(dist, rightDist - 0.5);
      }
      if (v_leftMarker < 0.5) {
         float leftDist = v_texCoord.x * (1.0 - v_leftMarker);
         dist = max(dist, leftDist - 0.5);
      }
      if (v_bottomMarker < 0.5) {
         float bottomDist = (1.0 - v_texCoord.y) * (1.0 - v_bottomMarker);
         dist = max(dist, bottomDist - 0.5);
      }
   
      outputColour = texture(u_transitionTexture, v_texCoord);
      outputColour.a = pow(dist, 0.3);
   
      // 
      // Account for noise in the opacity
      // 
   
      vec2 noiseSampleCoord = mod((v_tile + 0.0) / 8.0, 1.0);
      float noise = texture(u_noiseTexture, noiseSampleCoord).r;
      float noiseDist = dist;
      noiseDist *= 2.0;
      noiseDist = pow(noiseDist, 5.0);
      noiseDist -= 0.1;
   
      float opacitySubtract = noise * 1.3 - 0.3 - min(max(noiseDist, 0.0), 1.0);
      opacitySubtract = noise * 1.3 - 0.3;
      opacitySubtract = pow(opacitySubtract, 1.2);
   
      outputColour.a -= opacitySubtract;

      // @Hack :DarkTransparencyBug
      outputColour.rgb *= outputColour.a;
   }
   `;
   
   // 
   // Foam shaders
   // 
   
   const foamVertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in vec2 a_texCoord;
   layout(location = 2) in vec2 a_flowDirection;
   layout(location = 3) in float a_textureOffset;
   
   out vec2 v_texCoord;
   out vec2 v_flowDirection;
   out float v_textureOffset;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);
   
      v_texCoord = a_texCoord;
      v_textureOffset = a_textureOffset;
      v_flowDirection = a_flowDirection;
   }
   `;
   
   const foamFragmentShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Time {
      uniform float u_time;
   };
    
   uniform sampler2D u_foamTexture;
   uniform float u_textureOffset;
    
   in vec2 v_texCoord;
   in vec2 v_flowDirection;
   in float v_textureOffset;
   
   out vec4 outputColour;
    
   void main() {
      float timeTextureOffset = u_time * ${WATER_VISUAL_FLOW_SPEED} / 1000.0;
   
      float offsetAmount = timeTextureOffset + v_textureOffset;
      vec2 offset = v_flowDirection * offsetAmount;
      outputColour = texture(u_foamTexture, fract(v_texCoord - offset));
   
      float distFromCenter = distance(v_texCoord, vec2(0.5, 0.5));
      float multiplier = 1.0 - distFromCenter * 2.0;
      multiplier = clamp(multiplier, 0.0, 1.0);
      multiplier = pow(multiplier, 0.35);
      outputColour.a *= multiplier;

      // @Hack :DarkTransparencyBug
      outputColour.rgb *= outputColour.a;
   }
   `;
   
   // 
   // Stepping stone shaders
   // 
   
   const steppingStoneVertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in vec2 a_texCoord;
   layout(location = 2) in float a_textureIdx;
   
   out vec2 v_texCoord;
   out float v_textureIdx;
    
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);
   
      v_texCoord = a_texCoord;
      v_textureIdx = a_textureIdx;
   }
   `;
   
   const steppingStoneFragmentShaderText = `#version 300 es
   precision mediump float;
    
   uniform sampler2D u_texture1;
   uniform sampler2D u_texture2;
   uniform sampler2D u_texture3;
    
   in vec2 v_texCoord;
   in float v_textureIdx;
   
   out vec4 outputColour;
    
   void main() {
      if (v_textureIdx < 0.5) {
         outputColour = texture(u_texture1, v_texCoord);
      } else if (v_textureIdx < 1.5) {
         outputColour = texture(u_texture2, v_texCoord);
      } else {
         outputColour = texture(u_texture3, v_texCoord);
      }
   }
   `;

   // 
   // Base program
   // 

   baseProgram = createWebGLProgram(gl, baseVertexShaderText, baseFragmentShaderText);
   bindUBOToProgram(gl, baseProgram, UBOBindingIndex.CAMERA);

   const baseTextureUniformLocation = gl.getUniformLocation(baseProgram, "u_baseTexture")!;
   baseProgramOpacityUniformLocation = gl.getUniformLocation(baseProgram, "u_opacity")!;
   baseProgramIsUndergroundUniformLocation = gl.getUniformLocation(baseProgram, "u_isUnderground")!;

   gl.useProgram(baseProgram);
   gl.uniform1i(baseTextureUniformLocation, 0);

   // 
   // Rock program
   // 

   rockProgram = createWebGLProgram(gl, rockVertexShaderText, rockFragmentShaderText);
   bindUBOToProgram(gl, rockProgram, UBOBindingIndex.CAMERA);

   const rockProgramTexture1UniformLocation = gl.getUniformLocation(rockProgram, "u_texture1")!;
   const rockProgramTexture2UniformLocation = gl.getUniformLocation(rockProgram, "u_texture2")!;

   gl.useProgram(rockProgram);
   gl.uniform1i(rockProgramTexture1UniformLocation, 0);
   gl.uniform1i(rockProgramTexture2UniformLocation, 1);
   
   // 
   // Highlights program
   // 

   highlightsProgram = createWebGLProgram(gl, highlightsVertexShaderText, highlightsFragmentShaderText);
   bindUBOToProgram(gl, highlightsProgram, UBOBindingIndex.CAMERA);
   bindUBOToProgram(gl, highlightsProgram, UBOBindingIndex.TIME);

   const highlightsProgramTexture1UniformLocation = gl.getUniformLocation(highlightsProgram, "u_texture1")!;
   const highlightsProgramTexture2UniformLocation = gl.getUniformLocation(highlightsProgram, "u_texture2")!;
   const highlightsProgramTexture3UniformLocation = gl.getUniformLocation(highlightsProgram, "u_texture3")!;

   gl.useProgram(highlightsProgram);
   gl.uniform1i(highlightsProgramTexture1UniformLocation, 0);
   gl.uniform1i(highlightsProgramTexture2UniformLocation, 1);
   gl.uniform1i(highlightsProgramTexture3UniformLocation, 2);
   
   // 
   // Noise program
   // 

   noiseProgram = createWebGLProgram(gl, noiseVertexShaderText, noiseFragmentShaderText);
   bindUBOToProgram(gl, noiseProgram, UBOBindingIndex.CAMERA);
   bindUBOToProgram(gl, noiseProgram, UBOBindingIndex.TIME);

   const noiseTextureUniformLocation = gl.getUniformLocation(noiseProgram, "u_noiseTexture")!;

   gl.useProgram(noiseProgram);
   gl.uniform1i(noiseTextureUniformLocation, 0);

   // 
   // Transition program
   // 

   transitionProgram = createWebGLProgram(gl, transitionVertexShaderText, transitionFragmentShaderText);
   bindUBOToProgram(gl, transitionProgram, UBOBindingIndex.CAMERA);

   gl.useProgram(transitionProgram);
   
   const transitionTextureUniformLocation = gl.getUniformLocation(transitionProgram, "u_transitionTexture")!;
   gl.uniform1i(transitionTextureUniformLocation, 0);

   const gravelNoiseTextureUniformLocation = gl.getUniformLocation(transitionProgram, "u_noiseTexture")!;
   gl.uniform1i(gravelNoiseTextureUniformLocation, 1);

   // 
   // Foam program
   // 

   foamProgram = createWebGLProgram(gl, foamVertexShaderText, foamFragmentShaderText);
   bindUBOToProgram(gl, foamProgram, UBOBindingIndex.CAMERA);
   bindUBOToProgram(gl, foamProgram, UBOBindingIndex.TIME);

   const foamProgramFoamTextureUniformLocation = gl.getUniformLocation(foamProgram, "u_foamTexture")!;

   gl.useProgram(foamProgram);
   gl.uniform1i(foamProgramFoamTextureUniformLocation, 0);
   
   // 
   // Stepping stone program
   // 

   steppingStoneProgram = createWebGLProgram(gl, steppingStoneVertexShaderText, steppingStoneFragmentShaderText);
   bindUBOToProgram(gl, steppingStoneProgram, UBOBindingIndex.CAMERA);

   const steppingStoneTexture1UniformLocation = gl.getUniformLocation(steppingStoneProgram, "u_texture1")!;
   const steppingStoneTexture2UniformLocation = gl.getUniformLocation(steppingStoneProgram, "u_texture2")!;
   const steppingStoneTexture3UniformLocation = gl.getUniformLocation(steppingStoneProgram, "u_texture3")!;

   gl.useProgram(steppingStoneProgram);
   gl.uniform1i(steppingStoneTexture1UniformLocation, 0);
   gl.uniform1i(steppingStoneTexture2UniformLocation, 1);
   gl.uniform1i(steppingStoneTexture3UniformLocation, 2);
}

const tileIsWaterInt = (layer: Layer, tileX: number, tileY: number): number => {
   if (!tileIsWithinEdge(tileX, tileY)) {
      return 0;
   }
   
   const tile = layer.getTileFromCoords(tileX, tileY);
   return tile.type === TileType.water ? 1 : 0;
}

const calculateTransitionVertexData = (layer: Layer, renderChunkX: number, renderChunkY: number): Float32Array => {
   const minTileX = getRenderChunkMinTileX(renderChunkX);
   const maxTileX = getRenderChunkMaxTileX(renderChunkX);
   const minTileY = getRenderChunkMinTileY(renderChunkY);
   const maxTileY = getRenderChunkMaxTileY(renderChunkY);

   // Find all tiles neighbouring water in the render chunk
   const edgeTiles = new Array<Tile>();
   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         const tile = layer.getTile(tileIndex);
         if (tile.type !== TileType.water && tile.type !== TileType.ice && tile.bordersWater) {
            edgeTiles.push(tile);
         }
      }
   }

   const vertexData = new Float32Array(edgeTiles.length * 6 * 12);
   for (let i = 0; i < edgeTiles.length; i++) {
      const tile = edgeTiles[i];

      let x1 = tile.x;
      let x2 = tile.x + 1;
      let y1 = tile.y;
      let y2 = tile.y + 1;

      const topLeftWaterDistance = 1 - tileIsWaterInt(layer, tile.x - 1, tile.y + 1);
      const topRightWaterDistance = 1 - tileIsWaterInt(layer, tile.x + 1, tile.y + 1);
      const bottomLeftWaterDistance = 1 - tileIsWaterInt(layer, tile.x - 1, tile.y - 1);
      const bottomRightWaterDistance = 1 - tileIsWaterInt(layer, tile.x + 1, tile.y - 1);

      const topMarker = 1 - tileIsWaterInt(layer, tile.x, tile.y + 1);
      const rightMarker = 1 - tileIsWaterInt(layer, tile.x - 1, tile.y);
      const leftMarker = 1 - tileIsWaterInt(layer, tile.x + 1, tile.y);
      const bottomMarker = 1 - tileIsWaterInt(layer, tile.x, tile.y - 1);

      const dataOffset = i * 6 * 12;

      vertexData[dataOffset] = x1;
      vertexData[dataOffset + 1] = y1;
      vertexData[dataOffset + 2] = 0;
      vertexData[dataOffset + 3] = 0;
      vertexData[dataOffset + 4] = topLeftWaterDistance;
      vertexData[dataOffset + 5] = topRightWaterDistance;
      vertexData[dataOffset + 6] = bottomLeftWaterDistance;
      vertexData[dataOffset + 7] = bottomRightWaterDistance;
      vertexData[dataOffset + 8] = topMarker;
      vertexData[dataOffset + 9] = rightMarker;
      vertexData[dataOffset + 10] = leftMarker;
      vertexData[dataOffset + 11] = bottomMarker;

      vertexData[dataOffset + 12] = x2;
      vertexData[dataOffset + 13] = y1;
      vertexData[dataOffset + 14] = 1;
      vertexData[dataOffset + 15] = 0;
      vertexData[dataOffset + 16] = topLeftWaterDistance;
      vertexData[dataOffset + 17] = topRightWaterDistance;
      vertexData[dataOffset + 18] = bottomLeftWaterDistance;
      vertexData[dataOffset + 19] = bottomRightWaterDistance;
      vertexData[dataOffset + 20] = topMarker;
      vertexData[dataOffset + 21] = rightMarker;
      vertexData[dataOffset + 22] = leftMarker;
      vertexData[dataOffset + 23] = bottomMarker;

      vertexData[dataOffset + 24] = x1;
      vertexData[dataOffset + 25] = y2;
      vertexData[dataOffset + 26] = 0;
      vertexData[dataOffset + 27] = 1;
      vertexData[dataOffset + 28] = topLeftWaterDistance;
      vertexData[dataOffset + 29] = topRightWaterDistance;
      vertexData[dataOffset + 30] = bottomLeftWaterDistance;
      vertexData[dataOffset + 31] = bottomRightWaterDistance;
      vertexData[dataOffset + 32] = topMarker;
      vertexData[dataOffset + 33] = rightMarker;
      vertexData[dataOffset + 34] = leftMarker;
      vertexData[dataOffset + 35] = bottomMarker;

      vertexData[dataOffset + 36] = x1;
      vertexData[dataOffset + 37] = y2;
      vertexData[dataOffset + 38] = 0;
      vertexData[dataOffset + 39] = 1;
      vertexData[dataOffset + 40] = topLeftWaterDistance;
      vertexData[dataOffset + 41] = topRightWaterDistance;
      vertexData[dataOffset + 42] = bottomLeftWaterDistance;
      vertexData[dataOffset + 43] = bottomRightWaterDistance;
      vertexData[dataOffset + 44] = topMarker;
      vertexData[dataOffset + 45] = rightMarker;
      vertexData[dataOffset + 46] = leftMarker;
      vertexData[dataOffset + 47] = bottomMarker;

      vertexData[dataOffset + 48] = x2;
      vertexData[dataOffset + 49] = y1;
      vertexData[dataOffset + 50] = 1;
      vertexData[dataOffset + 51] = 0;
      vertexData[dataOffset + 52] = topLeftWaterDistance;
      vertexData[dataOffset + 53] = topRightWaterDistance;
      vertexData[dataOffset + 54] = bottomLeftWaterDistance;
      vertexData[dataOffset + 55] = bottomRightWaterDistance;
      vertexData[dataOffset + 56] = topMarker;
      vertexData[dataOffset + 57] = rightMarker;
      vertexData[dataOffset + 58] = leftMarker;
      vertexData[dataOffset + 59] = bottomMarker;

      vertexData[dataOffset + 60] = x2;
      vertexData[dataOffset + 61] = y2;
      vertexData[dataOffset + 62] = 1;
      vertexData[dataOffset + 63] = 1;
      vertexData[dataOffset + 64] = topLeftWaterDistance;
      vertexData[dataOffset + 65] = topRightWaterDistance;
      vertexData[dataOffset + 66] = bottomLeftWaterDistance;
      vertexData[dataOffset + 67] = bottomRightWaterDistance;
      vertexData[dataOffset + 68] = topMarker;
      vertexData[dataOffset + 69] = rightMarker;
      vertexData[dataOffset + 70] = leftMarker;
      vertexData[dataOffset + 71] = bottomMarker;
   }

   return vertexData;
}

const calculateRockVertexData = (waterRocks: ReadonlyArray<WaterRockData>): Float32Array => {
   const numRocks = waterRocks.length;
   
   const vertexData = new Float32Array(numRocks * 6 * 6);

   let dataOffset = 0;
   for (const waterRock of waterRocks) {
      const size = WATER_ROCK_SIZES[waterRock.size];
      
      let x1 = (waterRock.position[0] - size/2);
      let x2 = (waterRock.position[0] + size/2);
      let y1 = (waterRock.position[1] - size/2);
      let y2 = (waterRock.position[1] + size/2);

      const topLeftX = rotateXAroundPoint(x1, y2, waterRock.position[0], waterRock.position[1], waterRock.rotation);
      const topLeftY = rotateYAroundPoint(x1, y2, waterRock.position[0], waterRock.position[1], waterRock.rotation);
      const topRightX = rotateXAroundPoint(x2, y2, waterRock.position[0], waterRock.position[1], waterRock.rotation);
      const topRightY = rotateYAroundPoint(x2, y2, waterRock.position[0], waterRock.position[1], waterRock.rotation);
      const bottomRightX = rotateXAroundPoint(x2, y1, waterRock.position[0], waterRock.position[1], waterRock.rotation);
      const bottomRightY = rotateYAroundPoint(x2, y1, waterRock.position[0], waterRock.position[1], waterRock.rotation);
      const bottomLeftX = rotateXAroundPoint(x1, y1, waterRock.position[0], waterRock.position[1], waterRock.rotation);
      const bottomLeftY = rotateYAroundPoint(x1, y1, waterRock.position[0], waterRock.position[1], waterRock.rotation);

      const opacity = lerp(0.15, 0.4, waterRock.opacity);

      const textureIdx = waterRock.size as number;
      
      vertexData[dataOffset] = bottomLeftX;
      vertexData[dataOffset + 1] = bottomLeftY;
      vertexData[dataOffset + 2] = 0;
      vertexData[dataOffset + 3] = 0;
      vertexData[dataOffset + 4] = opacity;
      vertexData[dataOffset + 5] = textureIdx;
      
      vertexData[dataOffset + 6] = bottomRightX;
      vertexData[dataOffset + 7] = bottomRightY;
      vertexData[dataOffset + 8] = 1;
      vertexData[dataOffset + 9] = 0;
      vertexData[dataOffset + 10] = opacity;
      vertexData[dataOffset + 11] = textureIdx;
      
      vertexData[dataOffset + 12] = topLeftX;
      vertexData[dataOffset + 13] = topLeftY;
      vertexData[dataOffset + 14] = 0;
      vertexData[dataOffset + 15] = 1;
      vertexData[dataOffset + 16] = opacity;
      vertexData[dataOffset + 17] = textureIdx;
      
      vertexData[dataOffset + 18] = topLeftX;
      vertexData[dataOffset + 19] = topLeftY;
      vertexData[dataOffset + 20] = 0;
      vertexData[dataOffset + 21] = 1;
      vertexData[dataOffset + 22] = opacity;
      vertexData[dataOffset + 23] = textureIdx;
      
      vertexData[dataOffset + 24] = bottomRightX;
      vertexData[dataOffset + 25] = bottomRightY;
      vertexData[dataOffset + 26] = 1;
      vertexData[dataOffset + 27] = 0;
      vertexData[dataOffset + 28] = opacity;
      vertexData[dataOffset + 29] = textureIdx;
      
      vertexData[dataOffset + 30] = topRightX;
      vertexData[dataOffset + 31] = topRightY;
      vertexData[dataOffset + 32] = 1;
      vertexData[dataOffset + 33] = 1;
      vertexData[dataOffset + 34] = opacity;
      vertexData[dataOffset + 35] = textureIdx;

      dataOffset += 36;
   }

   return vertexData;
}

const calculateBaseVertexData = (layer: Layer, waterTiles: ReadonlyArray<Tile>): Float32Array => {
   const vertexData = new Float32Array(waterTiles.length * 6 * 8);

   for (let i = 0; i < waterTiles.length; i++) {
      const tile = waterTiles[i];
      let x1 = tile.x * Settings.TILE_SIZE;
      let x2 = (tile.x + 1) * Settings.TILE_SIZE;
      let y1 = tile.y * Settings.TILE_SIZE;
      let y2 = (tile.y + 1) * Settings.TILE_SIZE;

      const topIsWater = 1 - tileIsWaterInt(layer, tile.x, tile.y + 1);
      const topRightIsWater = 1 - tileIsWaterInt(layer, tile.x + 1, tile.y + 1);
      const rightIsWater = 1 - tileIsWaterInt(layer, tile.x + 1, tile.y);
      const bottomRightIsWater = 1 - tileIsWaterInt(layer, tile.x + 1, tile.y - 1);
      const bottomIsWater = 1 - tileIsWaterInt(layer, tile.x, tile.y - 1);
      const bottomLeftIsWater = 1 - tileIsWaterInt(layer, tile.x - 1, tile.y - 1);
      const leftIsWater = 1 - tileIsWaterInt(layer, tile.x - 1, tile.y);
      const topLeftIsWater = 1 - tileIsWaterInt(layer, tile.x - 1, tile.y + 1);

      const bottomLeftLandDistance = 1 - (bottomLeftIsWater || bottomIsWater || leftIsWater);
      const bottomRightLandDistance = 1 - (bottomRightIsWater || bottomIsWater || rightIsWater);
      const topLeftLandDistance = 1 - (topLeftIsWater || topIsWater || leftIsWater);
      const topRightLandDistance = 1 - (topRightIsWater || topIsWater || rightIsWater);

      const dataOffset = i * 6 * 8;
      
      vertexData[dataOffset] = x1;
      vertexData[dataOffset + 1] = y1;
      vertexData[dataOffset + 2] = 0;
      vertexData[dataOffset + 3] = 0;
      vertexData[dataOffset + 4] = topLeftLandDistance;
      vertexData[dataOffset + 5] = topRightLandDistance;
      vertexData[dataOffset + 6] = bottomLeftLandDistance;
      vertexData[dataOffset + 7] = bottomRightLandDistance;

      vertexData[dataOffset + 8] = x2;
      vertexData[dataOffset + 9] = y1;
      vertexData[dataOffset + 10] = 1;
      vertexData[dataOffset + 11] = 0;
      vertexData[dataOffset + 12] = topLeftLandDistance;
      vertexData[dataOffset + 13] = topRightLandDistance;
      vertexData[dataOffset + 14] = bottomLeftLandDistance;
      vertexData[dataOffset + 15] = bottomRightLandDistance;

      vertexData[dataOffset + 16] = x1;
      vertexData[dataOffset + 17] = y2;
      vertexData[dataOffset + 18] = 0;
      vertexData[dataOffset + 19] = 1;
      vertexData[dataOffset + 20] = topLeftLandDistance;
      vertexData[dataOffset + 21] = topRightLandDistance;
      vertexData[dataOffset + 22] = bottomLeftLandDistance;
      vertexData[dataOffset + 23] = bottomRightLandDistance;

      vertexData[dataOffset + 24] = x1;
      vertexData[dataOffset + 25] = y2;
      vertexData[dataOffset + 26] = 0;
      vertexData[dataOffset + 27] = 1;
      vertexData[dataOffset + 28] = topLeftLandDistance;
      vertexData[dataOffset + 29] = topRightLandDistance;
      vertexData[dataOffset + 30] = bottomLeftLandDistance;
      vertexData[dataOffset + 31] = bottomRightLandDistance;

      vertexData[dataOffset + 32] = x2;
      vertexData[dataOffset + 33] = y1;
      vertexData[dataOffset + 34] = 1;
      vertexData[dataOffset + 35] = 0;
      vertexData[dataOffset + 36] = topLeftLandDistance;
      vertexData[dataOffset + 37] = topRightLandDistance;
      vertexData[dataOffset + 38] = bottomLeftLandDistance;
      vertexData[dataOffset + 39] = bottomRightLandDistance;

      vertexData[dataOffset + 40] = x2;
      vertexData[dataOffset + 41] = y2;
      vertexData[dataOffset + 42] = 1;
      vertexData[dataOffset + 43] = 1;
      vertexData[dataOffset + 44] = topLeftLandDistance;
      vertexData[dataOffset + 45] = topRightLandDistance;
      vertexData[dataOffset + 46] = bottomLeftLandDistance;
      vertexData[dataOffset + 47] = bottomRightLandDistance;
   }

   return vertexData;
}

// @SQUEAM
// const calculateFoamVertexData = (steppingStones: ReadonlyArray<RiverSteppingStoneData>): Float32Array => {
//    const vertexData = new Float32Array(steppingStones.length * 6 * 7);

//    let i = 0;
//    for (const steppingStone of steppingStones) {
//       // @Speed: Garbage collection
      
//       const renderSize = RIVER_STEPPING_STONE_SIZES[steppingStone.size];
      
//       let x1 = (steppingStone.positionX - renderSize/2 - FOAM_PADDING);
//       let x2 = (steppingStone.positionX + renderSize/2 + FOAM_PADDING);
//       let y1 = (steppingStone.positionY - renderSize/2 - FOAM_PADDING);
//       let y2 = (steppingStone.positionY + renderSize/2 + FOAM_PADDING);

//       let topLeft = new Point(x1, y2);
//       let topRight = new Point(x2, y2);
//       let bottomRight = new Point(x2, y1);
//       let bottomLeft = new Point(x1, y1);

//       const pos = new Point(steppingStone.positionX, steppingStone.positionY);

//       // Rotate the points to match the entity's rotation
//       topLeft = rotatePointAroundPivot(topLeft, pos, steppingStone.rotation);
//       topRight = rotatePointAroundPivot(topRight, pos, steppingStone.rotation);
//       bottomRight = rotatePointAroundPivot(bottomRight, pos, steppingStone.rotation);
//       bottomLeft = rotatePointAroundPivot(bottomLeft, pos, steppingStone.rotation);

//       const tileX = Math.floor(steppingStone.positionX / Settings.TILE_SIZE);
//       const tileY = Math.floor(steppingStone.positionY / Settings.TILE_SIZE);
//       const flowDirection = layers[0].getRiverFlowDirection(tileX, tileY);

//       const offsetX = FOAM_OFFSET * Math.sin(flowDirection);
//       const offsetY = FOAM_OFFSET * Math.cos(flowDirection);
//       topLeft.x -= offsetX;
//       topRight.x -= offsetX;
//       bottomLeft.x -= offsetX;
//       bottomRight.x -= offsetX;
//       topLeft.y -= offsetY;
//       topRight.y -= offsetY;
//       bottomLeft.y -= offsetY;
//       bottomRight.y -= offsetY;

//       const flowDirectionX = Math.sin(flowDirection - steppingStone.rotation);
//       const flowDirectionY = Math.cos(flowDirection - steppingStone.rotation);

//       const textureOffset = Math.random();

//       const dataOffset = i * 6 * 7;

//       vertexData[dataOffset] = bottomLeft.x;
//       vertexData[dataOffset + 1] = bottomLeft.y;
//       vertexData[dataOffset + 2] = 0;
//       vertexData[dataOffset + 3] = 0;
//       vertexData[dataOffset + 4] = flowDirectionX;
//       vertexData[dataOffset + 5] = flowDirectionY;
//       vertexData[dataOffset + 6] = textureOffset;

//       vertexData[dataOffset + 7] = bottomRight.x;
//       vertexData[dataOffset + 8] = bottomRight.y;
//       vertexData[dataOffset + 9] = 1;
//       vertexData[dataOffset + 10] = 0;
//       vertexData[dataOffset + 11] = flowDirectionX;
//       vertexData[dataOffset + 12] = flowDirectionY;
//       vertexData[dataOffset + 13] = textureOffset;

//       vertexData[dataOffset + 14] = topLeft.x;
//       vertexData[dataOffset + 15] = topLeft.y;
//       vertexData[dataOffset + 16] = 0;
//       vertexData[dataOffset + 17] = 1;
//       vertexData[dataOffset + 18] = flowDirectionX;
//       vertexData[dataOffset + 19] = flowDirectionY;
//       vertexData[dataOffset + 20] = textureOffset;

//       vertexData[dataOffset + 21] = topLeft.x;
//       vertexData[dataOffset + 22] = topLeft.y;
//       vertexData[dataOffset + 23] = 0;
//       vertexData[dataOffset + 24] = 1;
//       vertexData[dataOffset + 25] = flowDirectionX;
//       vertexData[dataOffset + 26] = flowDirectionY;
//       vertexData[dataOffset + 27] = textureOffset;

//       vertexData[dataOffset + 28] = bottomRight.x;
//       vertexData[dataOffset + 29] = bottomRight.y;
//       vertexData[dataOffset + 30] = 1;
//       vertexData[dataOffset + 31] = 0;
//       vertexData[dataOffset + 32] = flowDirectionX;
//       vertexData[dataOffset + 33] = flowDirectionY;
//       vertexData[dataOffset + 34] = textureOffset;

//       vertexData[dataOffset + 35] = topRight.x;
//       vertexData[dataOffset + 36] = topRight.y;
//       vertexData[dataOffset + 37] = 1;
//       vertexData[dataOffset + 38] = 1;
//       vertexData[dataOffset + 39] = flowDirectionX;
//       vertexData[dataOffset + 40] = flowDirectionY;
//       vertexData[dataOffset + 41] = textureOffset;

//       i++;
//    }

//    return vertexData;
// }

const createBaseVAO = (buffer: WebGLBuffer): WebGLVertexArrayObject => {
   const vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      
   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(4, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 6 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(5, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 7 * Float32Array.BYTES_PER_ELEMENT);
   
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);
   gl.enableVertexAttribArray(3);
   gl.enableVertexAttribArray(4);
   gl.enableVertexAttribArray(5);

   gl.bindVertexArray(null);

   return vao;
}

const createRockVAO = (buffer: WebGLBuffer): WebGLVertexArrayObject => {
   const vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);
   
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);
   gl.enableVertexAttribArray(3);

   gl.bindVertexArray(null);

   return vao;
}

const createHighlightsVAO = (buffer: WebGLBuffer): WebGLVertexArrayObject => {
   const vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);

   gl.bindVertexArray(null);

   return vao;
}

const createNoiseVAO = (buffer: WebGLBuffer): WebGLVertexArrayObject => {
   const vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 6 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(4, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 7 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);
   gl.enableVertexAttribArray(3);
   gl.enableVertexAttribArray(4);

   gl.bindVertexArray(null);

   return vao;
}

const createTransitionVAO = (buffer: WebGLBuffer): WebGLVertexArrayObject => {
   const vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   
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

   return vao;
}

const createFoamVAO = (buffer: WebGLBuffer): WebGLVertexArrayObject => {
   const vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   
   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 7 * Float32Array.BYTES_PER_ELEMENT, 6 * Float32Array.BYTES_PER_ELEMENT);
   
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);
   gl.enableVertexAttribArray(3);

   gl.bindVertexArray(null);

   return vao;
}

const createSteppingStoneVAO = (buffer: WebGLBuffer): WebGLVertexArrayObject => {
   const vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);

   gl.bindVertexArray(null);

   return vao;
}

const getRenderChunkWaterTiles = (layer: Layer, renderChunkX: number, renderChunkY: number): ReadonlyArray<Tile> => {
   const minTileX = getRenderChunkMinTileX(renderChunkX);
   const maxTileX = getRenderChunkMaxTileX(renderChunkX);
   const minTileY = getRenderChunkMinTileY(renderChunkY);
   const maxTileY = getRenderChunkMaxTileY(renderChunkY);

   const tiles = new Array<Tile>();
   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const tile = layer.getTileFromCoords(tileX, tileY);
         if (tile.type === TileType.water) {
            tiles.push(tile);
         }
      }
   }

   return tiles;
}

const renderChunkHasBorderingWaterTiles = (layer: Layer, renderChunkX: number, renderChunkY: number): boolean => {
   const leftTileX = getRenderChunkMinTileX(renderChunkX);
   const rightTileX = getRenderChunkMaxTileX(renderChunkX);
   const bottomTileY = getRenderChunkMinTileY(renderChunkY);
   const topTileY = getRenderChunkMaxTileY(renderChunkY);

   // Left border tiles
   for (let tileY = bottomTileY - 1; tileY <= topTileY + 1; tileY++) {
      if (tileIsWithinEdge(leftTileX - 1, tileY)) {
         const tile = layer.getTileFromCoords(leftTileX - 1, tileY);
         if (tile.type === TileType.water) {
            return true;
         }
      }
   }
   
   // Right border tiles
   for (let tileY = bottomTileY - 1; tileY <= topTileY + 1; tileY++) {
      if (tileIsWithinEdge(rightTileX + 1, tileY)) {
         const tile = layer.getTileFromCoords(rightTileX + 1, tileY);
         if (tile.type === TileType.water) {
            return true;
         }
      }
   }

   // Top border tiles
   for (let tileX = leftTileX; tileX <= rightTileX; tileX++) {
      if (tileIsWithinEdge(tileX, topTileY + 1)) {
         const tile = layer.getTileFromCoords(tileX, topTileY + 1);
         if (tile.type === TileType.water) {
            return true;
         }
      }
   }

   // Bottom border tiles
   for (let tileX = leftTileX; tileX <= rightTileX; tileX++) {
      if (tileIsWithinEdge(tileX, bottomTileY - 1)) {
         const tile = layer.getTileFromCoords(tileX, bottomTileY - 1);
         if (tile.type === TileType.water) {
            return true;
         }
      }
   }

   return false;
}

export function calculateRiverRenderChunkData(layer: Layer, renderChunkX: number, renderChunkY: number, waterRocks: ReadonlyArray<WaterRockData>): RenderChunkRiverInfo | null {
   const waterTiles = getRenderChunkWaterTiles(layer, renderChunkX, renderChunkY);

   // If there are no water tiles don't calculate any data
   // Check for any bordering tiles just outside the render chunk. This is to account for transitions
   // in the current render chunk which happen due to a tile in a different render chunk.
   if (waterTiles.length === 0 && !renderChunkHasBorderingWaterTiles(layer, renderChunkX, renderChunkY)) {
      return null;
   }
   
   const baseVertexData = calculateBaseVertexData(layer, waterTiles);
   const baseBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, baseBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, baseVertexData, gl.STATIC_DRAW);

   const rockVertexData = calculateRockVertexData(waterRocks);
   const rockBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, rockBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, rockVertexData, gl.STATIC_DRAW);

   const highlightsVertexData = calculateHighlightsVertexData(waterTiles);
   const highlightsBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, highlightsBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, highlightsVertexData, gl.STATIC_DRAW);

   const noiseVertexData = calculateNoiseVertexData(layer, waterTiles);
   const noiseBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, noiseBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, noiseVertexData, gl.STATIC_DRAW);

   const transitionVertexData = calculateTransitionVertexData(layer, renderChunkX, renderChunkY);
   const transitionBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, transitionBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, transitionVertexData, gl.STATIC_DRAW);

   // @SQUEAM
   // // Calculate group IDs present in stepping stones in the chunk
   // const groupIDs = new Array<number>();
   // if (renderChunkX >= 0 && renderChunkX < WORLD_RENDER_CHUNK_SIZE && renderChunkY >= 0 && renderChunkY < WORLD_RENDER_CHUNK_SIZE) {
   //    for (let chunkX = renderChunkX * 2; chunkX <= renderChunkX * 2 + 1; chunkX++) {
   //       for (let chunkY = renderChunkY * 2; chunkY <= renderChunkY * 2 + 1; chunkY++) {
   //          const chunk = layer.getChunk(chunkX, chunkY);
   //          for (const steppingStone of chunk.riverSteppingStones) {
   //             if (!groupIDs.includes(steppingStone.groupID)) {
   //                groupIDs.push(steppingStone.groupID);
   //             }
   //          }
   //       }
   //    }
   // } else {
   //    for (const steppingStone of edgeSteppingStones) {
   //       if (!groupIDs.includes(steppingStone.groupID)) {
   //          groupIDs.push(steppingStone.groupID);
   //       }
   //    }
   // }

   return {
      baseVAO: createBaseVAO(baseBuffer),
      baseVertexCount: baseVertexData.length / 8,
      rockVAO: createRockVAO(rockBuffer),
      rockVertexCount: rockVertexData.length / 6,
      highlightsVAO: createHighlightsVAO(highlightsBuffer),
      highlightsVertexCount: highlightsVertexData.length / 5,
      transitionVAO: createTransitionVAO(transitionBuffer),
      transitionVertexCount: transitionVertexData.length / 12,
      noiseVAO: createNoiseVAO(noiseBuffer),
      noiseVertexCount: noiseVertexData.length / 8,
      // riverSteppingStoneGroupIDs: groupIDs,
      waterRocks: []
   };
}

const calculateNoiseVertexData = (layer: Layer, waterTiles: ReadonlyArray<Tile>): Float32Array => {
   let numInstances = 0;
   for (const tile of waterTiles) {
      const flowDirectionIdx = layer.getRiverFlowDirection(tile.x, tile.y);
      if (flowDirectionIdx > 0) {
         numInstances++;
      }
   }
   
   const vertexData = new Float32Array(numInstances * 6 * 8);
   
   for (let i = 0; i < waterTiles.length; i++) {
      const tile = waterTiles[i];
      const flowDirectionIdx = layer.getRiverFlowDirection(tile.x, tile.y);
      if (flowDirectionIdx === 0) {
         continue;
      }
      const flowDirection = flowDirectionIdx - 1;
      
      const x1 = (tile.x - 0.5) * Settings.TILE_SIZE;
      const x2 = (tile.x + 1.5) * Settings.TILE_SIZE;
      const y1 = (tile.y - 0.5) * Settings.TILE_SIZE;
      const y2 = (tile.y + 1.5) * Settings.TILE_SIZE;

      const animationOffset = Math.random();
      const animationSpeed = randFloat(1, 1.67);
      
      const flowDirectionX = Math.sin(flowDirection);
      const flowDirectionY = Math.cos(flowDirection);

      const dataOffset = i * 6 * 8;

      vertexData[dataOffset] = x1;
      vertexData[dataOffset + 1] = y1;
      vertexData[dataOffset + 2] = 0;
      vertexData[dataOffset + 3] = 0;
      vertexData[dataOffset + 4] = flowDirectionX;
      vertexData[dataOffset + 5] = flowDirectionY;
      vertexData[dataOffset + 6] = animationOffset;
      vertexData[dataOffset + 7] = animationSpeed;

      vertexData[dataOffset + 8] = x2;
      vertexData[dataOffset + 9] = y1;
      vertexData[dataOffset + 10] = 1;
      vertexData[dataOffset + 11] = 0;
      vertexData[dataOffset + 12] = flowDirectionX;
      vertexData[dataOffset + 13] = flowDirectionY;
      vertexData[dataOffset + 14] = animationOffset;
      vertexData[dataOffset + 15] = animationSpeed;

      vertexData[dataOffset + 16] = x1;
      vertexData[dataOffset + 17] = y2;
      vertexData[dataOffset + 18] = 0;
      vertexData[dataOffset + 19] = 1;
      vertexData[dataOffset + 20] = flowDirectionX;
      vertexData[dataOffset + 21] = flowDirectionY;
      vertexData[dataOffset + 22] = animationOffset;
      vertexData[dataOffset + 23] = animationSpeed;

      vertexData[dataOffset + 24] = x1;
      vertexData[dataOffset + 25] = y2;
      vertexData[dataOffset + 26] = 0;
      vertexData[dataOffset + 27] = 1;
      vertexData[dataOffset + 28] = flowDirectionX;
      vertexData[dataOffset + 29] = flowDirectionY;
      vertexData[dataOffset + 30] = animationOffset;
      vertexData[dataOffset + 31] = animationSpeed;

      vertexData[dataOffset + 32] = x2;
      vertexData[dataOffset + 33] = y1;
      vertexData[dataOffset + 34] = 1;
      vertexData[dataOffset + 35] = 0;
      vertexData[dataOffset + 36] = flowDirectionX;
      vertexData[dataOffset + 37] = flowDirectionY;
      vertexData[dataOffset + 38] = animationOffset;
      vertexData[dataOffset + 39] = animationSpeed;

      vertexData[dataOffset + 40] = x2;
      vertexData[dataOffset + 41] = y2;
      vertexData[dataOffset + 42] = 1;
      vertexData[dataOffset + 43] = 1;
      vertexData[dataOffset + 44] = flowDirectionX;
      vertexData[dataOffset + 45] = flowDirectionY;
      vertexData[dataOffset + 46] = animationOffset;
      vertexData[dataOffset + 47] = animationSpeed;
   }

   return vertexData;
}

// @SQUEAM
// const calculateSteppingStoneVertexData = (steppingStones: ReadonlyArray<RiverSteppingStoneData>): Float32Array => {
//    const vertexData = new Float32Array(steppingStones.length * 6 * 5);

//    let i = 0;
//    for (const steppingStone of steppingStones) {
//       const size = RIVER_STEPPING_STONE_SIZES[steppingStone.size];
      
//       let x1 = (steppingStone.positionX - size/2);
//       let x2 = (steppingStone.positionX + size/2);
//       let y1 = (steppingStone.positionY - size/2);
//       let y2 = (steppingStone.positionY + size/2);

//       const topLeftX =     rotateXAroundPoint(x1, y2, steppingStone.positionX, steppingStone.positionY, steppingStone.rotation);
//       const topLeftY =     rotateYAroundPoint(x1, y2, steppingStone.positionX, steppingStone.positionY, steppingStone.rotation);
//       const topRightX =    rotateXAroundPoint(x2, y2, steppingStone.positionX, steppingStone.positionY, steppingStone.rotation);
//       const topRightY =    rotateYAroundPoint(x2, y2, steppingStone.positionX, steppingStone.positionY, steppingStone.rotation);
//       const bottomRightX = rotateXAroundPoint(x2, y1, steppingStone.positionX, steppingStone.positionY, steppingStone.rotation);
//       const bottomRightY = rotateYAroundPoint(x2, y1, steppingStone.positionX, steppingStone.positionY, steppingStone.rotation);
//       const bottomLeftX =  rotateXAroundPoint(x1, y1, steppingStone.positionX, steppingStone.positionY, steppingStone.rotation);
//       const bottomLeftY =  rotateYAroundPoint(x1, y1, steppingStone.positionX, steppingStone.positionY, steppingStone.rotation);

//       const textureIdx = steppingStone.size as number;

//       const dataOffset = i * 6 * 5;

//       vertexData[dataOffset] = bottomLeftX;
//       vertexData[dataOffset + 1] = bottomLeftY;
//       vertexData[dataOffset + 2] = 0;
//       vertexData[dataOffset + 3] = 0;
//       vertexData[dataOffset + 4] = textureIdx;

//       vertexData[dataOffset + 5] = bottomRightX;
//       vertexData[dataOffset + 6] = bottomRightY;
//       vertexData[dataOffset + 7] = 1;
//       vertexData[dataOffset + 8] = 0;
//       vertexData[dataOffset + 9] = textureIdx;

//       vertexData[dataOffset + 10] = topLeftX;
//       vertexData[dataOffset + 11] = topLeftY;
//       vertexData[dataOffset + 12] = 0;
//       vertexData[dataOffset + 13] = 1;
//       vertexData[dataOffset + 14] = textureIdx;

//       vertexData[dataOffset + 15] = topLeftX;
//       vertexData[dataOffset + 16] = topLeftY;
//       vertexData[dataOffset + 17] = 0;
//       vertexData[dataOffset + 18] = 1;
//       vertexData[dataOffset + 19] = textureIdx;

//       vertexData[dataOffset + 20] = bottomRightX;
//       vertexData[dataOffset + 21] = bottomRightY;
//       vertexData[dataOffset + 22] = 1;
//       vertexData[dataOffset + 23] = 0;
//       vertexData[dataOffset + 24] = textureIdx;

//       vertexData[dataOffset + 25] = topRightX;
//       vertexData[dataOffset + 26] = topRightY;
//       vertexData[dataOffset + 27] = 1;
//       vertexData[dataOffset + 28] = 1;
//       vertexData[dataOffset + 29] = textureIdx;

//       i++;
//    }

//    return vertexData;
// }

const calculateHighlightsVertexData = (waterTiles: ReadonlyArray<Tile>): Float32Array => {
   const vertexData = new Float32Array(waterTiles.length * 6 * 5);
   
   for (let i = 0; i < waterTiles.length; i++) {
      const tile = waterTiles[i];
      const x1 = tile.x * Settings.TILE_SIZE;
      const x2 = (tile.x + 1) * Settings.TILE_SIZE;
      const y1 = tile.y * Settings.TILE_SIZE;
      const y2 = (tile.y + 1) * Settings.TILE_SIZE;

      const fadeOffset = Math.random() * 3;

      const dataOffset = i * 6 * 5;

      vertexData[dataOffset] = x1;
      vertexData[dataOffset + 1] = y1;
      vertexData[dataOffset + 2] = 0;
      vertexData[dataOffset + 3] = 0;
      vertexData[dataOffset + 4] = fadeOffset;

      vertexData[dataOffset + 5] = x2;
      vertexData[dataOffset + 6] = y1;
      vertexData[dataOffset + 7] = 1;
      vertexData[dataOffset + 8] = 0;
      vertexData[dataOffset + 9] = fadeOffset;

      vertexData[dataOffset + 10] = x1;
      vertexData[dataOffset + 11] = y2;
      vertexData[dataOffset + 12] = 0;
      vertexData[dataOffset + 13] = 1;
      vertexData[dataOffset + 14] = fadeOffset;

      vertexData[dataOffset + 15] = x1;
      vertexData[dataOffset + 16] = y2;
      vertexData[dataOffset + 17] = 0;
      vertexData[dataOffset + 18] = 1;
      vertexData[dataOffset + 19] = fadeOffset;

      vertexData[dataOffset + 20] = x2;
      vertexData[dataOffset + 21] = y1;
      vertexData[dataOffset + 22] = 1;
      vertexData[dataOffset + 23] = 0;
      vertexData[dataOffset + 24] = fadeOffset;

      vertexData[dataOffset + 25] = x2;
      vertexData[dataOffset + 26] = y2;
      vertexData[dataOffset + 27] = 1;
      vertexData[dataOffset + 28] = 1;
      vertexData[dataOffset + 29] = fadeOffset;
   }

   return vertexData;
}

export function calculateVisibleRiverInfo(layer: Layer): ReadonlyArray<RenderChunkRiverInfo> {
   // @Speed: Garbage collection
   const riverInfoArray = new Array<RenderChunkRiverInfo>();

   for (let renderChunkX = minVisibleRenderChunkX; renderChunkX <= maxVisibleRenderChunkX; renderChunkX++) {
      for (let renderChunkY = minVisibleRenderChunkY; renderChunkY <= maxVisibleRenderChunkY; renderChunkY++) {
         const riverInfo = getRenderChunkRiverInfo(layer, renderChunkX, renderChunkY);
         if (riverInfo !== null) {
            riverInfoArray.push(riverInfo);
         }
      }
   }

   return riverInfoArray;
}

export function renderLowerRiverFeatures(layer: Layer, visibleRenderChunks: ReadonlyArray<RenderChunkRiverInfo>): void {
   // 
   // Base program
   // 
   
   gl.useProgram(baseProgram);

   gl.enable(gl.BLEND);
   // @Hack :DarkTransparencyBug
   gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

   gl.uniform1f(baseProgramOpacityUniformLocation, 1);
   gl.uniform1f(baseProgramIsUndergroundUniformLocation, layer === undergroundLayer ? 1 : 1);

   // Bind water base texture
   const baseTexture = getTexture("miscellaneous/river/water-base.png");
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, baseTexture);

   for (const renderChunkInfo of visibleRenderChunks) {
      gl.bindVertexArray(renderChunkInfo.baseVAO);
      gl.drawArrays(gl.TRIANGLES, 0, renderChunkInfo.baseVertexCount);
   }
   
   // 
   // Rock program
   // 

   gl.useProgram(rockProgram);

   // Bind water rock textures
   for (let rockSize: WaterRockSize = 0; rockSize < 2; rockSize++) {
      const textureSource = WATER_ROCK_TEXTURES[rockSize];
      const texture = getTexture(textureSource);
      gl.activeTexture(gl.TEXTURE0 + rockSize);
      gl.bindTexture(gl.TEXTURE_2D, texture);
   }

   for (const renderChunkRiverInfo of visibleRenderChunks) {
      gl.bindVertexArray(renderChunkRiverInfo.rockVAO);
      gl.drawArrays(gl.TRIANGLES, 0, renderChunkRiverInfo.rockVertexCount);
   }

   // 
   // Transition program
   // 

   gl.useProgram(transitionProgram);
      
   // Bind transition texture
   const transitionTexture = getTexture("miscellaneous/river/gravel.png");
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, transitionTexture);
   
   const gravelNoiseTexture = getTexture("miscellaneous/gravel-noise-texture.png");
   gl.activeTexture(gl.TEXTURE1);
   gl.bindTexture(gl.TEXTURE_2D, gravelNoiseTexture);

   for (const renderChunkRiverInfo of visibleRenderChunks) {
      gl.bindVertexArray(renderChunkRiverInfo.transitionVAO);
      gl.drawArrays(gl.TRIANGLES, 0, renderChunkRiverInfo.transitionVertexCount);
   }

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);

   gl.bindVertexArray(null);
}

export function renderUpperRiverFeatures(layer: Layer, visibleRenderChunks: ReadonlyArray<RenderChunkRiverInfo>): void {
   // @SQUEAM
   // // Calculate visible stepping stone groups
   // const steppingStoneGroupIDs = new Array<number>();
   // for (const chunk of visibleRenderChunks) {
   //    for (const groupID of chunk.riverSteppingStoneGroupIDs) {
   //       if (!steppingStoneGroupIDs.includes(groupID)) {
   //          steppingStoneGroupIDs.push(groupID);
   //       }
   //    }
   // }

   // 
   // Base program
   // 
   
   gl.useProgram(baseProgram);

   gl.enable(gl.BLEND);
   // @Hack :DarkTransparencyBug required for transparency now... but why? gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA used to work fine
   gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

   gl.uniform1f(baseProgramOpacityUniformLocation, 0.6);
   gl.uniform1f(baseProgramIsUndergroundUniformLocation, layer === undergroundLayer ? 1 : 1);

   // Bind water base texture
   const baseTexture = getTexture("miscellaneous/river/water-base.png");
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, baseTexture);

   for (const renderChunkInfo of visibleRenderChunks) {
      gl.bindVertexArray(renderChunkInfo.baseVAO);
      gl.drawArrays(gl.TRIANGLES, 0, renderChunkInfo.baseVertexCount);
   }

   // 
   // Highlights program
   // 

   gl.useProgram(highlightsProgram);

   const texture1 = getTexture("miscellaneous/river/river-bed-highlights-1.png");
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, texture1);

   const texture2 = getTexture("miscellaneous/river/river-bed-highlights-2.png");
   gl.activeTexture(gl.TEXTURE1);
   gl.bindTexture(gl.TEXTURE_2D, texture2);

   const texture3 = getTexture("miscellaneous/river/river-bed-highlights-3.png");
   gl.activeTexture(gl.TEXTURE2);
   gl.bindTexture(gl.TEXTURE_2D, texture3);
   
   for (const renderChunkRiverInfo of visibleRenderChunks) {
      gl.bindVertexArray(renderChunkRiverInfo.highlightsVAO);
      gl.drawArrays(gl.TRIANGLES, 0, renderChunkRiverInfo.highlightsVertexCount);
   }
   
   // 
   // Noise program
   // 
   
   gl.useProgram(noiseProgram);
               
   const noiseTexture = getTexture("miscellaneous/river/water-noise.png");
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, noiseTexture);

   for (const renderChunkInfo of visibleRenderChunks) {
      gl.bindVertexArray(renderChunkInfo.noiseVAO);
      gl.drawArrays(gl.TRIANGLES, 0, renderChunkInfo.noiseVertexCount);
   }
   
   // 
   // Foam program
   // 

   gl.useProgram(foamProgram);

   // @SQUEAM
   
   // // Bind foam texture
   // const foamTexture = getTexture("miscellaneous/river/water-foam.png");
   // gl.activeTexture(gl.TEXTURE0);
   // gl.bindTexture(gl.TEXTURE_2D, foamTexture);
   
   // // Bind stepping stone textures
   // for (let size: RiverSteppingStoneSize = 0; size < 3; size++) {
   //    const textureSource = RIVER_STEPPING_STONE_TEXTURES[size];
   //    const steppingStoneTexture = getTexture(textureSource);
   //    gl.activeTexture(gl.TEXTURE1 + size);
   //    gl.bindTexture(gl.TEXTURE_2D, steppingStoneTexture);
   // }

   // for (let i = 0; i < steppingStoneGroupIDs.length; i++) {
   //    const groupID = steppingStoneGroupIDs[i];
   //    gl.bindVertexArray(riverFoamVAOs[groupID]);
   //    gl.drawArrays(gl.TRIANGLES, 0, riverFoamVertexCounts[groupID]);
   // }
   
   // // 
   // // Stepping stone program
   // // 

   // gl.useProgram(steppingStoneProgram);

   // const steppingStoneTexture1 = getTexture(RIVER_STEPPING_STONE_TEXTURES[RiverSteppingStoneSize.small]);
   // gl.activeTexture(gl.TEXTURE0);
   // gl.bindTexture(gl.TEXTURE_2D, steppingStoneTexture1);

   // const steppingStoneTexture2 = getTexture(RIVER_STEPPING_STONE_TEXTURES[RiverSteppingStoneSize.medium]);
   // gl.activeTexture(gl.TEXTURE1);
   // gl.bindTexture(gl.TEXTURE_2D, steppingStoneTexture2);

   // const steppingStoneTexture3 = getTexture(RIVER_STEPPING_STONE_TEXTURES[RiverSteppingStoneSize.large]);
   // gl.activeTexture(gl.TEXTURE2);
   // gl.bindTexture(gl.TEXTURE_2D, steppingStoneTexture3);
   
   // for (let i = 0; i < steppingStoneGroupIDs.length; i++) {
   //    const groupID = steppingStoneGroupIDs[i];
   //    gl.bindVertexArray(riverSteppingStoneVAOs[groupID]);
   //    gl.drawArrays(gl.TRIANGLES, 0, riverSteppingStoneVertexCounts[groupID]);
   // }

   gl.bindVertexArray(null);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}
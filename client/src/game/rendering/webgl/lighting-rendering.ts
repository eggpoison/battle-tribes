import { Settings } from "battletribes-shared/settings";
import { distance, getTileX, getTileY, lerp } from "battletribes-shared/utils";
import { createWebGLProgram, gl } from "../../webgl";
import OPTIONS from "../../options";
import { getLightPositionMatrix } from "../../lights";
import { bindUBOToProgram, UBOBindingIndex } from "../ubos";
import Layer from "../../Layer";
import { surfaceLayer } from "../../world";
import { currentSnapshot } from "../../client";
import { cameraPosition } from "../../camera";
import { gameFramebufferTexture } from "../render";

const enum Vars {
   MAX_LIGHTS = 64,
   DROPDOWN_LIGHT_STRENGTH = 6,

   /** The half-width and half-height of the area the distortion triangles occupy */
   DISTORTION_TRIANGLE_VISIBLE_AREA = 2500,
   DISTORTION_TRIANGLE_SPAWN_DIST = 1.1,
   DISTORTION_TRIANGLE_TELEPORT_DIST = 1.3,
   DISTORTION_TRIANGLE_MAX_SIZE = 800
}

interface RectLight {
   readonly x: number;
   readonly y: number;
   readonly width: number;
   readonly height: number;
}

let lightingProgram: WebGLProgram;

let darknessFramebufferProgram: WebGLProgram;
let darknessFramebuffer: WebGLFramebuffer;
let darknessFramebufferTexture: WebGLTexture;
let darknessFramebufferVertexData: Float32Array;
let lastTextureWidth = 0;
let lastTextureHeight = 0;

let darknessVAO: WebGLVertexArrayObject;

let ambientLightLevelUniformLocation: WebGLUniformLocation;

const lightPositionMatricesData = new Float32Array(9 * Vars.MAX_LIGHTS);
const lightIntensitiesData = new Float32Array(Vars.MAX_LIGHTS);
const lightStrengthsData = new Float32Array(Vars.MAX_LIGHTS);
const lightRadiiData = new Float32Array(Vars.MAX_LIGHTS);
const lightColoursData = new Float32Array(3 * Vars.MAX_LIGHTS);

let lastNumLightsRendered = 0;

export function createNightShaders(): void {
   const lightingVertexShader = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   
   out vec2 v_texCoord;
   out vec2 v_position;
   
   void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
   
      // Calculate and pass on game position
      vec2 screenPos = (a_position + 1.0) * u_halfWindowSize;
      v_position = (screenPos - u_halfWindowSize) / u_zoom + u_playerPos;

      v_texCoord = (a_position + 1.0) * 0.5;
   }
   `;
   const lightingFragmentShader = `#version 300 es
   precision mediump float;
   
   #define MAX_LIGHTS ${Vars.MAX_LIGHTS}
   #define TILE_SIZE ${Settings.TILE_SIZE.toFixed(1)}

   struct RectLight {
      vec2 position;
      vec2 size;
   };
   
   uniform int u_numLights;
   uniform mat3 u_lightPositionMatrices[MAX_LIGHTS];
   uniform float u_lightIntensities[MAX_LIGHTS];
   uniform float u_lightStrengths[MAX_LIGHTS];
   uniform float u_lightRadii[MAX_LIGHTS];
   uniform vec3 u_lightColours[MAX_LIGHTS];

   uniform int u_numRectLights;
   uniform RectLight u_rectLights[MAX_LIGHTS];
   
   uniform float u_ambientLightLevel;

   uniform sampler2D u_gameTexture;
   
   in vec2 v_texCoord;
   in vec2 v_position;
   
   out vec4 outputColour;

   float getDistFromRectLight(vec2 position, RectLight rectLight) {
      float width = rectLight.size.x;
      float height = rectLight.size.y;
   
      // Inside the rect
      if (abs(position.x - rectLight.position.x) <= width * 0.5 && abs(position.y - rectLight.position.y) <= height * 0.5) {
         return 0.0;
      // Matching vertically
      } else if (abs(position.y - rectLight.position.y) <= height * 0.5) {
         return abs(position.x - rectLight.position.x) - width * 0.5;
      // Matching horizontally
      } else if (abs(position.x - rectLight.position.x) <= width * 0.5) {
         return abs(position.y - rectLight.position.y) - height * 0.5;
      // Anywhere else
      } else {
         float closestCornerXOffset;
         if (position.x < rectLight.position.x) {
            closestCornerXOffset = -width * 0.5;
         } else {
            closestCornerXOffset = width * 0.5;
         }
         float closestCornerYOffset;
         if (position.y < rectLight.position.y) {
            closestCornerYOffset = -height * 0.5;
         } else {
            closestCornerYOffset = height * 0.5;
         }
       
         vec2 closestCorner = rectLight.position + vec2(closestCornerXOffset, closestCornerYOffset);
         return distance(position, closestCorner);
      }
   }

   float processColour(float u) {
      if (u > 1.0) {
         // Prevent the colours from being blown out
         return sqrt(u);
      } else {
         return u;
      }
   } 
    
   void main() {
      float r = u_ambientLightLevel;
      float g = u_ambientLightLevel;
      float b = u_ambientLightLevel;

      // Point lights
      for (int i = 0; i < u_numLights; i++) {
         mat3 positionMatrix = u_lightPositionMatrices[i];
         vec2 lightPos = (positionMatrix * vec3(1.0, 1.0, 1.0)).xy;

         float lightIntensity = u_lightIntensities[i];
         float strength = u_lightStrengths[i];
         float radius = u_lightRadii[i];
         
         float dist = distance(v_position, lightPos);
         dist -= radius;
         if (dist < 0.0) {
            dist = 0.0;
         }

         float intensity = exp(-dist / 64.0 / strength) * lightIntensity;
         if (intensity > 0.0) {
            vec3 colour = u_lightColours[i];

            // Note: Multiplying by intensity here doesn't wash out the colour, as it retains the colour ratio
            r += colour.r * intensity;
            g += colour.g * intensity;
            b += colour.b * intensity;
         }
      }

      // Rect lights
      float minDistFromRectLight = 999999.9;
      for (int i = 0; i < u_numRectLights; i++) {
         RectLight rectLight = u_rectLights[i];
         
         float dist = getDistFromRectLight(v_position, rectLight);
         if (dist < minDistFromRectLight) {
            minDistFromRectLight = dist;
         }
      }

      if (minDistFromRectLight < 999999.9) {
         float lightIntensity = 1.0;
         float strength = ${Vars.DROPDOWN_LIGHT_STRENGTH.toFixed(1)};

         float intensity = exp(-minDistFromRectLight / 64.0 / strength) * lightIntensity;
         if (intensity > 0.0) {
            r += intensity;
            g += intensity;
            b += intensity;
         }
      }

      vec4 gameColour = texture(u_gameTexture, v_texCoord);
      gameColour.r *= processColour(r);
      gameColour.g *= processColour(g);
      gameColour.b *= processColour(b);

      outputColour = gameColour;
   }
   `;

   const darknessFramebufferVertexShader = `#version 300 es
   precision mediump float;

   layout(location = 0) in vec2 a_texCoord;

   out vec2 v_texCoord;

   void main() {
      vec2 vertPosition = (a_texCoord - 0.5) * 2.0;

      gl_Position = vec4(vertPosition, 0.0, 1.0);
      v_texCoord = a_texCoord;
   }
   `;

   const darknessFramebufferFragmentShader = `#version 300 es
   precision mediump float;
   
   uniform sampler2D u_framebufferTexture;

   in vec2 v_texCoord;

   out vec4 outputColour;

   void main() {
      vec4 framebufferColour = texture(u_framebufferTexture, v_texCoord);
      outputColour = framebufferColour;
   }
   `;

   // Lighting Program

   lightingProgram = createWebGLProgram(gl, lightingVertexShader, lightingFragmentShader);
   bindUBOToProgram(gl, lightingProgram, UBOBindingIndex.CAMERA);

   gl.useProgram(lightingProgram);

   ambientLightLevelUniformLocation = gl.getUniformLocation(lightingProgram, "u_ambientLightLevel")!;
   
   // Framebuffer Program

   darknessFramebufferProgram = createWebGLProgram(gl, darknessFramebufferVertexShader, darknessFramebufferFragmentShader);

   const darknessFramebufferTextureUniformLocation = gl.getUniformLocation(darknessFramebufferProgram, "u_framebufferTexture")!;

   gl.useProgram(darknessFramebufferProgram);
   gl.uniform1i(darknessFramebufferTextureUniformLocation, 0);

   darknessFramebuffer = gl.createFramebuffer()!;

   darknessFramebufferVertexData = new Float32Array(12);
   darknessFramebufferVertexData[2] = 1;
   darknessFramebufferVertexData[5] = 1;
   darknessFramebufferVertexData[7] = 1;
   darknessFramebufferVertexData[8] = 1;
   darknessFramebufferVertexData[10] = 1;
   darknessFramebufferVertexData[11] = 1;

   darknessVAO = gl.createVertexArray()!;
   gl.bindVertexArray(darknessVAO);

   // @Speed: Garbage collection
   const vertices = [
      -1, -1,
      1, 1,
      -1, 1,
      -1, -1,
      1, -1,
      1, 1
   ];
   
   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.enableVertexAttribArray(0);

   gl.bindVertexArray(null);
}

/** Returns the minimum light level for the layer */
const getAmbientLightLevel = (layer: Layer): number => {
   if (OPTIONS.nightVisionIsEnabled) {
      return 1;
   }
   
   if (layer === surfaceLayer) {
      const time = currentSnapshot.time;
      if (time >= 6 && time < 18) {
         return 1;
      } else if (time >= 18 && time < 20) {
         return lerp(1, Settings.NIGHT_LIGHT_LEVEL, (time - 18) / 2);
      } else if (time >= 4 && time < 6) {
         return lerp(1, Settings.NIGHT_LIGHT_LEVEL, (6 - time) / 2);
      } else {
         return Settings.NIGHT_LIGHT_LEVEL;
      }
   } else {
      return 0;
   }
}

const getVisibleRectLights = (layer: Layer): ReadonlyArray<RectLight> => {
   // Surface has no visible rect lights
   if (layer === surfaceLayer) {
      return [];
   }
   
   // Check the surface layer for dropdown tiles
   const rectLights = new Array<RectLight>();
   for (let i = 0; i < surfaceLayer.dropdownTiles.length; i++) {
      const tileIndex = surfaceLayer.dropdownTiles[i];
      const tileX = getTileX(tileIndex);
      const tileY = getTileY(tileIndex);

      const x = (tileX + 0.5) * Settings.TILE_SIZE;
      const y = (tileY + 0.5) * Settings.TILE_SIZE;

      const dist = distance(x, y, cameraPosition.x, cameraPosition.y);
      const tileDist = dist / Settings.TILE_SIZE;
      if (tileDist < Vars.DROPDOWN_LIGHT_STRENGTH * Vars.DROPDOWN_LIGHT_STRENGTH) {
         rectLights.push({
            x: (tileX + 0.5) * Settings.TILE_SIZE,
            y: (tileY + 0.5) * Settings.TILE_SIZE,
            width: Settings.TILE_SIZE,
            height: Settings.TILE_SIZE
         });
      }
   }
   return rectLights;
}

export function renderLighting(layer: Layer): void {
   const ambientLightLevel = getAmbientLightLevel(layer);

   const pointLights = layer.lights;
   // @Speed
   const rectLights = getVisibleRectLights(layer);

   const numLightsRendered = Math.min(pointLights.length, Vars.MAX_LIGHTS);

   // Fill point light data
   for (let i = 0; i < numLightsRendered; i++) {
      const light = pointLights[i];
      // @Speed
      const positionMatrix = getLightPositionMatrix(light);

      lightPositionMatricesData[i * 9] = positionMatrix[0];
      lightPositionMatricesData[i * 9 + 1] = positionMatrix[1];
      lightPositionMatricesData[i * 9 + 2] = 0;
      lightPositionMatricesData[i * 9 + 3] = positionMatrix[2];
      lightPositionMatricesData[i * 9 + 4] = positionMatrix[3];
      lightPositionMatricesData[i * 9 + 5] = 0;
      lightPositionMatricesData[i * 9 + 6] = positionMatrix[4];
      lightPositionMatricesData[i * 9 + 7] = positionMatrix[5];
      lightPositionMatricesData[i * 9 + 8] = 1;

      lightIntensitiesData[i] = light.intensity;

      lightStrengthsData[i] = light.strength;
      
      lightRadiiData[i] = light.radius;
      
      lightColoursData[i * 3] = light.r;
      lightColoursData[i * 3 + 1] = light.g;
      lightColoursData[i * 3 + 2] = light.b;
   }
   // Fill remaining data with 0
   for (let i = pointLights.length; i < lastNumLightsRendered; i++) {
      lightPositionMatricesData[i * 9] = 0;
      lightPositionMatricesData[i * 9 + 1] = 0;
      lightPositionMatricesData[i * 9 + 2] = 0;
      lightPositionMatricesData[i * 9 + 3] = 0;
      lightPositionMatricesData[i * 9 + 4] = 0;
      lightPositionMatricesData[i * 9 + 5] = 0;
      lightPositionMatricesData[i * 9 + 6] = 0;
      lightPositionMatricesData[i * 9 + 7] = 0;
      lightPositionMatricesData[i * 9 + 8] = 0;

      lightIntensitiesData[i] = 0;

      lightStrengthsData[i] = 0;
      
      lightRadiiData[i] = 0;
      
      lightColoursData[i * 3] = 0;
      lightColoursData[i * 3 + 1] = 0;
      lightColoursData[i * 3 + 2] = 0;
   }

   // 
   // Render lighting to framebuffer
   // 

   gl.bindVertexArray(darknessVAO);
   // @Temporary
   // gl.bindFramebuffer(gl.FRAMEBUFFER, darknessFramebuffer);

   // if (lastTextureWidth !== windowWidth || lastTextureHeight !== windowHeight) {
   //    darknessFramebufferTexture = createTexture(windowWidth, windowHeight);

   //    lastTextureWidth = windowWidth;
   //    lastTextureHeight = windowHeight;

   //    // Attach the texture as the first color attachment
   //    const attachmentPoint = gl.COLOR_ATTACHMENT0;
   //    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, darknessFramebufferTexture, 0);
   // }

   // Reset the previous texture
   gl.clearColor(0, 0, 0, 0);
   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

   gl.useProgram(lightingProgram);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   gl.uniform1f(ambientLightLevelUniformLocation, ambientLightLevel);

   const darknessNumLightsLocation = gl.getUniformLocation(lightingProgram, "u_numLights")!;
   gl.uniform1i(darknessNumLightsLocation, pointLights.length);
   if (pointLights.length > 0) {
      const lightPosLocation = gl.getUniformLocation(lightingProgram, "u_lightPositionMatrices")!;
      gl.uniformMatrix3fv(lightPosLocation, false, lightPositionMatricesData);
      const lightIntensityLocation = gl.getUniformLocation(lightingProgram, "u_lightIntensities")!;
      gl.uniform1fv(lightIntensityLocation, lightIntensitiesData);
      const lightStrengthLocation = gl.getUniformLocation(lightingProgram, "u_lightStrengths")!;
      gl.uniform1fv(lightStrengthLocation, lightStrengthsData);
      const lightRadiiLocation = gl.getUniformLocation(lightingProgram, "u_lightRadii")!;
      gl.uniform1fv(lightRadiiLocation, lightRadiiData);
      const lightColourLocation = gl.getUniformLocation(lightingProgram, "u_lightColours")!;
      gl.uniform3fv(lightColourLocation, lightColoursData);
   }

   const numRectLightsLocation = gl.getUniformLocation(lightingProgram, "u_numRectLights")!;
   gl.uniform1i(numRectLightsLocation, rectLights.length);
   for (let i = 0; i < rectLights.length; i++) {
      const rectLight = rectLights[i];
      
      const positionLocation = gl.getUniformLocation(lightingProgram, "u_rectLights[" + i + "].position");
      const sizeLocation = gl.getUniformLocation(lightingProgram, "u_rectLights[" + i + "].size");

      gl.uniform2f(positionLocation, rectLight.x, rectLight.y);
      gl.uniform2f(sizeLocation, rectLight.width, rectLight.height);
   }

   // Send all stuff which has been rendered to the program
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, gameFramebufferTexture);

   gl.drawArrays(gl.TRIANGLES, 0, 6);

   gl.bindVertexArray(null);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);

   lastNumLightsRendered = numLightsRendered;
}
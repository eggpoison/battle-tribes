import { Settings } from "webgl-test-shared/dist/settings";
import { lerp } from "webgl-test-shared/dist/utils";
import { createWebGLProgram, gl } from "../../webgl";
import Board from "../../Board";
import OPTIONS from "../../options";
import { getLightPosition, getLights } from "../../lights";
import { bindUBOToProgram, UBOBindingIndex } from "../ubos";

const NIGHT_LIGHT = 0.4;

let darknessProgram: WebGLProgram;
let colourProgram: WebGLProgram;
let vao: WebGLVertexArrayObject;

let darkenFactorUniformLocation: WebGLUniformLocation;

export function createNightShaders(): void {
   const colourVertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   
   out vec2 v_position;
   
   void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
   
      // Calculate and pass on game position
      vec2 screenPos1 = (a_position + 1.0) * u_halfWindowSize;
      v_position = (screenPos1 - u_halfWindowSize) / u_zoom + u_playerPos;
   }
   `;
   const colourFragmentShaderText = `#version 300 es
   precision mediump float;
   
   #define MAX_LIGHTS 128
   #define TILE_SIZE ${Settings.TILE_SIZE.toFixed(1)}
   
   // @Cleanup: UBO
   
   uniform int u_numLights;
   uniform vec2 u_lightPositions[MAX_LIGHTS];
   uniform float u_lightIntensities[MAX_LIGHTS];
   uniform float u_lightStrengths[MAX_LIGHTS];
   uniform float u_lightRadii[MAX_LIGHTS];
   
   uniform float u_darkenFactor;
   
   in vec2 v_position;
   
   out vec4 outputColour;
    
   void main() {
      float totalLightIntensity = 0.0;
      for (int i = 0; i < u_numLights; i++) {
         vec2 lightPos = u_lightPositions[i];
         float intensity = u_lightIntensities[i];
         float strength = u_lightStrengths[i] * TILE_SIZE;
         float radius = u_lightRadii[i];

         float dist = distance(v_position, lightPos);
         dist -= radius;
         if (dist < 0.0) {
            dist = 0.0;
         }

         float sampleIntensity = (1.0 - dist / strength) * intensity;
         if (sampleIntensity > 0.0) {
            float intensitySquared = sampleIntensity * sampleIntensity;
            totalLightIntensity += intensitySquared;
         }
      }

      float opacity = mix(1.0 - u_darkenFactor, 0.0, totalLightIntensity);
      outputColour = vec4(0.0, 0.0, 0.0, opacity);
   }
   `;

   const darknessVertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   
   out vec2 v_position;
   
   void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
   
      // Calculate and pass on game position
      vec2 screenPos1 = (a_position + 1.0) * u_halfWindowSize;
      v_position = (screenPos1 - u_halfWindowSize) / u_zoom + u_playerPos;
   }
   `;
   const darknessFragmentShaderText = `#version 300 es
   precision mediump float;
   
   #define MAX_LIGHTS 128
   #define TILE_SIZE ${Settings.TILE_SIZE.toFixed(1)}
   
   // @Cleanup: Use a struct
   // @Cleanup: UBO
   
   uniform int u_numLights;
   uniform vec2 u_lightPositions[MAX_LIGHTS];
   uniform float u_lightIntensities[MAX_LIGHTS];
   uniform float u_lightStrengths[MAX_LIGHTS];
   uniform float u_lightRadii[MAX_LIGHTS];
   uniform vec3 u_lightColours[MAX_LIGHTS];
   
   in vec2 v_position;
   
   out vec4 outputColour;
    
   void main() {
      float r = 0.0;
      float g = 0.0;
      float b = 0.0;
      for (int i = 0; i < u_numLights; i++) {
         vec2 lightPos = u_lightPositions[i];
         float intensity = u_lightIntensities[i];
         float strength = u_lightStrengths[i] * TILE_SIZE;
         float radius = u_lightRadii[i];
         vec3 colour = u_lightColours[i];

         float dist = distance(v_position, lightPos);
         dist -= radius;
         if (dist < 0.0) {
            dist = 0.0;
         }

         float sampleIntensity = (1.0 - dist / strength) * intensity;
         if (sampleIntensity > 0.0) {
            float intensitySquared = sampleIntensity * sampleIntensity;
            r += colour.r * intensitySquared;
            g += colour.g * intensitySquared;
            b += colour.b * intensitySquared;
         }
      }

      outputColour = vec4(r, g, b, 1.0);
   }
   `;

   darknessProgram = createWebGLProgram(gl, colourVertexShaderText, colourFragmentShaderText);
   bindUBOToProgram(gl, darknessProgram, UBOBindingIndex.CAMERA);

   colourProgram = createWebGLProgram(gl, darknessVertexShaderText, darknessFragmentShaderText);
   bindUBOToProgram(gl, colourProgram, UBOBindingIndex.CAMERA);

   darkenFactorUniformLocation = gl.getUniformLocation(darknessProgram, "u_darkenFactor")!;

   vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

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

export function renderNight(): void {
   let ambientLight: number;
   if (Board.time >= 6 && Board.time < 18) {
      ambientLight = 1;
   } else if (Board.time >= 18 && Board.time < 20) {
      ambientLight = lerp(1, NIGHT_LIGHT, (Board.time - 18) / 2);
   } else if (Board.time >= 4 && Board.time < 6) {
      ambientLight = lerp(1, NIGHT_LIGHT, (6 - Board.time) / 2);
   } else {
      ambientLight = NIGHT_LIGHT;
   }

   const lights = getLights();

   // @Speed
   const lightPositions = new Array<number>();
   const lightIntensities = new Array<number>();
   const lightStrengths = new Array<number>();
   const lightRadii = new Array<number>();
   const lightColours = new Array<number>();
   for (let i = 0; i < lights.length; i++) {
      const light = lights[i];
      const position = getLightPosition(i);
      
      lightPositions.push(position.x);
      lightPositions.push(position.y);
      lightIntensities.push(light.intensity);
      lightStrengths.push(light.strength);
      lightRadii.push(light.radius);
      lightColours.push(light.r);
      lightColours.push(light.g);
      lightColours.push(light.b);
   }
   
   gl.enable(gl.BLEND);

   if (!OPTIONS.nightVisionIsEnabled) {
      gl.useProgram(darknessProgram);
   
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
   
      gl.bindVertexArray(vao);
   
      gl.uniform1f(darkenFactorUniformLocation, ambientLight);

      const darknessNumLightsLocation = gl.getUniformLocation(darknessProgram, "u_numLights")!;
      gl.uniform1i(darknessNumLightsLocation, lights.length);
      if (lights.length > 0) {
         const lightPosLocation = gl.getUniformLocation(darknessProgram, "u_lightPositions")!;
         gl.uniform2fv(lightPosLocation, new Float32Array(lightPositions));
         const lightIntensityLocation = gl.getUniformLocation(darknessProgram, "u_lightIntensities")!;
         gl.uniform1fv(lightIntensityLocation, new Float32Array(lightIntensities));
         const lightStrengthLocation = gl.getUniformLocation(darknessProgram, "u_lightStrengths")!;
         gl.uniform1fv(lightStrengthLocation, new Float32Array(lightStrengths));
         const lightRadiiLocation = gl.getUniformLocation(darknessProgram, "u_lightRadii")!;
         gl.uniform1fv(lightRadiiLocation, new Float32Array(lightRadii));
      }
   
      gl.drawArrays(gl.TRIANGLES, 0, 6);
   }

   gl.useProgram(colourProgram);

   gl.blendFunc(gl.ONE, gl.ONE);

   // @Speed: pre-calculate uniform locations
   const colourNumLightsLocation = gl.getUniformLocation(colourProgram, "u_numLights")!;
   gl.uniform1i(colourNumLightsLocation, lights.length);
   if (lights.length > 0) {
      const lightPosLocation = gl.getUniformLocation(colourProgram, "u_lightPositions")!;
      gl.uniform2fv(lightPosLocation, new Float32Array(lightPositions));
      const lightIntensityLocation = gl.getUniformLocation(colourProgram, "u_lightIntensities")!;
      gl.uniform1fv(lightIntensityLocation, new Float32Array(lightIntensities));
      const lightStrengthLocation = gl.getUniformLocation(colourProgram, "u_lightStrengths")!;
      gl.uniform1fv(lightStrengthLocation, new Float32Array(lightStrengths));
      const lightRadiiLocation = gl.getUniformLocation(colourProgram, "u_lightRadii")!;
      gl.uniform1fv(lightRadiiLocation, new Float32Array(lightRadii));
      const lightColourLocation = gl.getUniformLocation(colourProgram, "u_lightColours")!;
      gl.uniform3fv(lightColourLocation, new Float32Array(lightColours));
   }

   gl.drawArrays(gl.TRIANGLES, 0, 6);

   gl.bindVertexArray(null);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}
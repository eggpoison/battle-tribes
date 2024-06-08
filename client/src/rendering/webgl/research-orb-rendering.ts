import { rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared/dist/utils";
import { RESEARCH_ORB_SIZES, ResearchOrb, getResearchOrb, getResearchOrbCompleteProgress } from "../../research";
import { createWebGLProgram, gl } from "../../webgl";
import { UBOBindingIndexes, bindUBOToProgram } from "../ubos";

let program: WebGLProgram;

export function createResearchOrbShaders(): void {
   const vertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;

   out vec2 v_rawPosition;
   
   void main() {
      v_rawPosition = a_position;
      
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0); 
   }
   `;

   const fragmentShaderText = `#version 300 es
   precision mediump float;

   #define BORDER_WIDTH 4.5

   #define BORDER_COLOUR 177.0 / 255.0, 3.0 / 255.0, 252.0 / 255.0
   #define START_COLOUR 216.0 / 87.0, 3.0 / 255.0, 255.0 / 255.0
   #define END_COLOUR 242.0 / 87.0, 156.0 / 255.0, 255.0 / 255.0

   uniform float u_half_orb_size;
   uniform vec2 u_center;
   uniform float u_complete_progress;

   in vec2 v_rawPosition;
   
   out vec4 outputColour;
   
   void main() {
      float rawDist = distance(v_rawPosition, u_center);
      float dist = rawDist / u_half_orb_size;

      if (dist > 1.0) {
         outputColour = vec4(0.0, 0.0, 0.0, 0.0);
      } else {
         float outerOpacity = mix(0.5, 1.0, u_complete_progress);
         // float opacity = mix(1.0, outerOpacity, dist);
         float opacity = outerOpacity;
         
         float distThreshold = u_complete_progress;
         distThreshold += BORDER_WIDTH / u_half_orb_size;
         distThreshold /= 1.0 + BORDER_WIDTH / u_half_orb_size; // Make sure distThreshold can't go less than 0
         distThreshold = 1.0 - distThreshold;
         if (dist < distThreshold) {
            outputColour = vec4(0.0, 0.0, 0.0, 0.0);
         } else if (dist > 1.0 - BORDER_WIDTH / u_half_orb_size) {
            outputColour = vec4(vec3(BORDER_COLOUR), opacity);
         } else {
            float colourMix = smoothstep(0.0, 1.0, dist);
            vec3 rgb = mix(vec3(END_COLOUR), vec3(START_COLOUR), colourMix);

            outputColour = vec4(rgb, opacity);
         }
      }
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   bindUBOToProgram(gl, program, UBOBindingIndexes.CAMERA);
}

const calculateOrbVertices = (orb: ResearchOrb): ReadonlyArray<number> => {
   const halfSize = RESEARCH_ORB_SIZES[orb.size] / 2;
   
   const x1 = orb.positionX - halfSize;
   const x2 = orb.positionX + halfSize;
   const y1 = orb.positionY - halfSize;
   const y2 = orb.positionY + halfSize;

   const tlX = rotateXAroundPoint(x1, y2, orb.positionX, orb.positionY, orb.rotation);
   const tlY = rotateYAroundPoint(x1, y2, orb.positionX, orb.positionY, orb.rotation);
   const trX = rotateXAroundPoint(x2, y2, orb.positionX, orb.positionY, orb.rotation);
   const trY = rotateYAroundPoint(x2, y2, orb.positionX, orb.positionY, orb.rotation);
   const blX = rotateXAroundPoint(x1, y1, orb.positionX, orb.positionY, orb.rotation);
   const blY = rotateYAroundPoint(x1, y1, orb.positionX, orb.positionY, orb.rotation);
   const brX = rotateXAroundPoint(x2, y1, orb.positionX, orb.positionY, orb.rotation);
   const brY = rotateYAroundPoint(x2, y1, orb.positionX, orb.positionY, orb.rotation);
   
   return [
      blX, blY,
      brX, brY,
      tlX, tlY,
      tlX, tlY,
      brX, brY,
      trX, trY
   ];
}

export function renderResearchOrb(): void {
   const orb = getResearchOrb();
   if (orb === null) {
      return;
   }

   const vertices = calculateOrbVertices(orb);

   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   const loc = gl.getUniformLocation(program, "u_half_orb_size")!;
   gl.uniform1f(loc, RESEARCH_ORB_SIZES[orb.size] / 2);

   const loc2 = gl.getUniformLocation(program, "u_center")!;
   gl.uniform2f(loc2, orb.positionX, orb.positionY);

   const lo3 = gl.getUniformLocation(program, "u_complete_progress")!;
   gl.uniform1f(lo3, getResearchOrbCompleteProgress());

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.enableVertexAttribArray(0);

   gl.drawArrays(gl.TRIANGLES, 0, 6);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}
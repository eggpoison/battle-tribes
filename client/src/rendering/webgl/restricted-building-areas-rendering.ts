import { rotateXAroundOrigin, rotateYAroundOrigin } from "webgl-test-shared/dist/utils";
import { RestrictedBuildingAreaData } from "webgl-test-shared/dist/client-server-types";
import { createWebGLProgram, gl } from "../../webgl";
import OPTIONS from "../../options";
import { UBOBindingIndex, bindUBOToProgram } from "../ubos";

const BORDER_WIDTH = 5;

let program: WebGLProgram;

let restrictedBuildingAreas: ReadonlyArray<RestrictedBuildingAreaData>;

export function setVisibleRestrictedBuildingAreas(newRestrictedBuildingAreas: ReadonlyArray<RestrictedBuildingAreaData>): void {
   // @Speed: Garbage collection
   restrictedBuildingAreas = newRestrictedBuildingAreas;
}

export function createRestrictedBuildingAreaShaders(): void {
   const vertexShaderText = `#version 300 es
   precision mediump float;
   precision mediump int;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in float a_isBorder;

   out float v_isBorder;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);

      v_isBorder = a_isBorder;
   }
   `;
   const fragmentShaderText = `#version 300 es
   precision mediump float;

   in float v_isBorder;
   
   out vec4 outputColour;
   
   void main() {
      if (v_isBorder > 0.5) {
         outputColour = vec4(0.7, 0.0, 0.0, 0.8);
      } else {
         outputColour = vec4(1.0, 0.0, 0.0, 0.4);
      }
   }
   `;
   
   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   bindUBOToProgram(gl, program, UBOBindingIndex.CAMERA);
}

export function renderRestrictedBuildingAreas(): void {
   if (!OPTIONS.showRestrictedAreas) {
      return;
   }
   
   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   // @Speed
   const vertices = new Array<number>();
   for (let i = 0; i < restrictedBuildingAreas.length; i++) {
      const restrictedArea = restrictedBuildingAreas[i];

      // Create transparent back
      
      const blX = restrictedArea.x + rotateXAroundOrigin(restrictedArea.width * -0.5 + BORDER_WIDTH, restrictedArea.height * -0.5 + BORDER_WIDTH, restrictedArea.rotation);
      const blY = restrictedArea.y + rotateYAroundOrigin(restrictedArea.width * -0.5 + BORDER_WIDTH, restrictedArea.height * -0.5 + BORDER_WIDTH, restrictedArea.rotation);
      const brX = restrictedArea.x + rotateXAroundOrigin(restrictedArea.width * 0.5 - BORDER_WIDTH, restrictedArea.height * -0.5 + BORDER_WIDTH, restrictedArea.rotation);
      const brY = restrictedArea.y + rotateYAroundOrigin(restrictedArea.width * 0.5 - BORDER_WIDTH, restrictedArea.height * -0.5 + BORDER_WIDTH, restrictedArea.rotation);
      const tlX = restrictedArea.x + rotateXAroundOrigin(restrictedArea.width * -0.5 + BORDER_WIDTH, restrictedArea.height * 0.5 - BORDER_WIDTH, restrictedArea.rotation);
      const tlY = restrictedArea.y + rotateYAroundOrigin(restrictedArea.width * -0.5 + BORDER_WIDTH, restrictedArea.height * 0.5 - BORDER_WIDTH, restrictedArea.rotation);
      const trX = restrictedArea.x + rotateXAroundOrigin(restrictedArea.width * 0.5 - BORDER_WIDTH, restrictedArea.height * 0.5 - BORDER_WIDTH, restrictedArea.rotation);
      const trY = restrictedArea.y + rotateYAroundOrigin(restrictedArea.width * 0.5 - BORDER_WIDTH, restrictedArea.height * 0.5 - BORDER_WIDTH, restrictedArea.rotation);

      vertices.push(
         blX, blY, 0,
         brX, brY, 0,
         tlX, tlY, 0,
         tlX, tlY, 0,
         brX, brY, 0,
         trX, trY, 0
      );

      // Create the top and bottom borders
      for (let i = 0; i < 2; i++) {
         const direction = restrictedArea.rotation + i * Math.PI;

         const blX = restrictedArea.x + rotateXAroundOrigin(restrictedArea.width * -0.5 + BORDER_WIDTH, restrictedArea.height * 0.5 - BORDER_WIDTH, direction);
         const blY = restrictedArea.y + rotateYAroundOrigin(restrictedArea.width * -0.5 + BORDER_WIDTH, restrictedArea.height * 0.5 - BORDER_WIDTH, direction);
         const brX = restrictedArea.x + rotateXAroundOrigin(restrictedArea.width * 0.5 - BORDER_WIDTH, restrictedArea.height * 0.5 - BORDER_WIDTH, direction);
         const brY = restrictedArea.y + rotateYAroundOrigin(restrictedArea.width * 0.5 - BORDER_WIDTH, restrictedArea.height * 0.5 - BORDER_WIDTH, direction);
         const tlX = restrictedArea.x + rotateXAroundOrigin(restrictedArea.width * -0.5, restrictedArea.height * 0.5, direction);
         const tlY = restrictedArea.y + rotateYAroundOrigin(restrictedArea.width * -0.5, restrictedArea.height * 0.5, direction);
         const trX = restrictedArea.x + rotateXAroundOrigin(restrictedArea.width * 0.5, restrictedArea.height * 0.5, direction);
         const trY = restrictedArea.y + rotateYAroundOrigin(restrictedArea.width * 0.5, restrictedArea.height * 0.5, direction);

         vertices.push(
            blX, blY, 1,
            brX, brY, 1,
            tlX, tlY, 1,
            tlX, tlY, 1,
            brX, brY, 1,
            trX, trY, 1
         );
      }

      // Create the left and right borders
      for (let i = 0; i < 2; i++) {
         const direction = restrictedArea.rotation + i * Math.PI;

         const blX = restrictedArea.x + rotateXAroundOrigin(restrictedArea.width * 0.5 - BORDER_WIDTH, restrictedArea.height * -0.5 + BORDER_WIDTH, direction);
         const blY = restrictedArea.y + rotateYAroundOrigin(restrictedArea.width * 0.5 - BORDER_WIDTH, restrictedArea.height * -0.5 + BORDER_WIDTH, direction);
         const brX = restrictedArea.x + rotateXAroundOrigin(restrictedArea.width * 0.5, restrictedArea.height * -0.5, direction);
         const brY = restrictedArea.y + rotateYAroundOrigin(restrictedArea.width * 0.5, restrictedArea.height * -0.5, direction);
         const tlX = restrictedArea.x + rotateXAroundOrigin(restrictedArea.width * 0.5 - BORDER_WIDTH, restrictedArea.height * 0.5 - BORDER_WIDTH, direction);
         const tlY = restrictedArea.y + rotateYAroundOrigin(restrictedArea.width * 0.5 - BORDER_WIDTH, restrictedArea.height * 0.5 - BORDER_WIDTH, direction);
         const trX = restrictedArea.x + rotateXAroundOrigin(restrictedArea.width * 0.5, restrictedArea.height * 0.5, direction);
         const trY = restrictedArea.y + rotateYAroundOrigin(restrictedArea.width * 0.5, restrictedArea.height * 0.5, direction);

         vertices.push(
            blX, blY, 1,
            brX, brY, 1,
            tlX, tlY, 1,
            tlX, tlY, 1,
            brX, brY, 1,
            trX, trY, 1
         );
      }

      // @Incomplete
   }

   const buffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);

   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}
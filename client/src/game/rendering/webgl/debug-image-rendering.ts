import { TransformComponentArray } from "../../entity-components/server-components/TransformComponent";
import { getTexture } from "../../textures";
import { createWebGLProgram, gl } from "../../webgl";
import { bindUBOToProgram, UBOBindingIndex } from "../ubos";

const enum Vars {
   SPRING_WIDTH = 16
}

let program: WebGLProgram;

export function createDebugImageShaders(): void {
   const vertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in vec2 a_texCoord;

   out vec2 v_texCoord;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);

      v_texCoord = a_texCoord;
   }
   `;
   const fragmentShaderText = `#version 300 es
   precision mediump float;

   uniform sampler2D u_texture;

   in vec2 v_texCoord;
   
   out vec4 outputColour;
   
   void main() {
      outputColour = texture(u_texture, v_texCoord);

      // @Hack :DarkTransparencyBug
      outputColour.rgb *= outputColour.a;
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   bindUBOToProgram(gl, program, UBOBindingIndex.CAMERA);
}

export function renderDebugImages(): void {
   const vertices = new Array<number>();
   for (let i = 0; i < TransformComponentArray.components.length; i++) {
      const transformComponent = TransformComponentArray.components[i];

      for (const child of transformComponent.hitboxes) {
         const hitbox = child;
         for (const tether of hitbox.tethers) {
            const direction = hitbox.box.position.angleTo(tether.originBox.position);
            const perpDirection = direction + Math.PI * 0.5;
            
            const x1 = hitbox.box.position.x + Vars.SPRING_WIDTH * 0.5 * Math.sin(perpDirection);
            const y1 = hitbox.box.position.y + Vars.SPRING_WIDTH * 0.5 * Math.cos(perpDirection);
            
            const x2 = hitbox.box.position.x - Vars.SPRING_WIDTH * 0.5 * Math.sin(perpDirection);
            const y2 = hitbox.box.position.y - Vars.SPRING_WIDTH * 0.5 * Math.cos(perpDirection);
            
            const x3 = tether.originBox.position.x + Vars.SPRING_WIDTH * 0.5 * Math.sin(perpDirection);
            const y3 = tether.originBox.position.y + Vars.SPRING_WIDTH * 0.5 * Math.cos(perpDirection);
            
            const x4 = tether.originBox.position.x - Vars.SPRING_WIDTH * 0.5 * Math.sin(perpDirection);
            const y4 = tether.originBox.position.y - Vars.SPRING_WIDTH * 0.5 * Math.cos(perpDirection);
   
            vertices.push(
               x1, y1, 0, 0,
               x2, y2, 1, 0,
               x3, y3, 0, 1,
               x3, y3, 0, 1,
               x2, y2, 1, 0,
               x4, y4, 1, 1
            );
         }
      }
   }

   const vertexData = new Float32Array(vertices);
   
   gl.useProgram(program);

   gl.enable(gl.BLEND);
   // @Hack :DarkTransparencyBug
   // gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   const textureUniformLocation = gl.getUniformLocation(program, "u_texture")!;
   gl.uniform1i(textureUniformLocation, 0);

   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, getTexture("debug/spring.png"));
   
   // @Speed
   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 4 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);

   gl.drawArrays(gl.TRIANGLES, 0, vertexData.length / 4);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}
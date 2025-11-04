import { createWebGLProgram, gl } from "../../webgl";

let program: WebGLProgram;
let vao: WebGLVertexArrayObject;

export function createDarkeningShaders(): void {
   const vertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(location = 0) in vec2 a_position;
   
   void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
   }
   `;
   const fragmentShaderText = `#version 300 es
   precision mediump float;
   
   out vec4 outputColour;
    
   void main() {
      outputColour = vec4(0.0, 0.0, 0.0, 0.25);
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);

   vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   const vertexData = new Float32Array(12);
   vertexData[0] = -1;
   vertexData[1] = -1;
   vertexData[2] = 1;
   vertexData[3] = 1;
   vertexData[4] = -1;
   vertexData[5] = 1;
   vertexData[6] = -1;
   vertexData[7] = -1;
   vertexData[8] = 1;
   vertexData[9] = -1;
   vertexData[10] = 1;
   vertexData[11] = 1;

   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.enableVertexAttribArray(0);

   gl.bindVertexArray(null);
}

export function renderLayerDarkening(): void {
   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   gl.bindVertexArray(vao);

   gl.drawArrays(gl.TRIANGLES, 0, 6);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);

   gl.bindVertexArray(null);
}
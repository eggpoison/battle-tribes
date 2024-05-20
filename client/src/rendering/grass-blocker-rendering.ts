import { GrassBlocker, blockerIsCircluar } from "webgl-test-shared/dist/grass-blockers";
import { getGrassBlockers } from "../client/Client";
import { CAMERA_UNIFORM_BUFFER_BINDING_INDEX, createWebGLProgram, gl, windowHeight, windowWidth } from "../webgl";
import { rotateXAroundOrigin, rotateYAroundOrigin } from "webgl-test-shared/dist/utils";
import { getTexture } from "../textures";

let framebufferProgram: WebGLProgram;
let renderProgram: WebGLProgram;

export function createGrassBlockerShaders(): void {
   const framebufferVertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in float a_opacity;

   // out vec2 v_position;
   out float v_opacity;

   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);

      // v_position = a_position;
      v_opacity = a_opacity;
   }
   `;
   
   const framebufferFragmentShaderText = `#version 300 es
   precision mediump float;

   // in vec2 v_position;
   in float v_opacity;

   out vec4 outputColour;

   void main() {
      outputColour = vec4(1.0, 1.0, 1.0, v_opacity);
   }
   `;
   const renderVertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };

   layout(location = 0) in vec2 a_texCoord;

   out vec2 v_position;
   out vec2 v_texCoord;

   void main() {
      vec2 vertPosition = (a_texCoord - 0.5) * 2.0;

      vec2 relativeGamePos = vertPosition * u_halfWindowSize;
      // vec2 relativeGamePos = (a_position - u_playerPos)

      vec2 screenPos = relativeGamePos * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      // gl_Position = vec4(clipSpacePos, 0.0, 1.0);
      
      gl_Position = vec4(vertPosition, 0.0, 1.0);

      vec2 gamePos = vertPosition * u_halfWindowSize + u_playerPos;
      
      v_position = gamePos;
      v_texCoord = a_texCoord;
   }
   `;
   
   const renderFragmentShaderText = `#version 300 es
   precision mediump float;
   
   #define blurRange 6.0
   #define sx 512.0;
   #define ys 512.0;

   uniform sampler2D u_dirtTexture;
   uniform sampler2D u_blockerTexture;

   in vec2 v_position;
   in vec2 v_texCoord;

   out vec4 outputColour;

   void main() {
      float u = v_texCoord.x;
      float v = v_texCoord.y;

      float x, y, xx, yy, rr = blurRange * blurRange, dx, dy, w, w0;
      w0 = 0.3780 / pow(blurRange, 1.975);
      vec2 p;
      vec4 col = vec4(0.0, 0.0, 0.0, 0.0);

      dx = 1.0 / sx;
      x = -blurRange;
      p.x = u + (x * dx);
      while (x <= blurRange) {
         xx = x * x;

         dy = 1.0 / ys;
         y = -blurRange;
         p.y = v + (y * dy);
         while (y <= blurRange) {
            yy = y * y;
            if (xx + yy <= rr) {
               w = w0 * exp((-xx - yy) / (2.0 * rr));
               col+=texture(u_blockerTexture, p) * w;
            }
            
            y++;
            p.y += dy;
         }

         x++;
         p.x += dx;
      }

      float blockAmount = col.r;

      // Sample the dirt texture
      float dirtTextureU = fract(v_position.x / 64.0);
      float dirtTextureV = fract(v_position.y / 64.0);
      vec4 dirtTexture = texture(u_dirtTexture, vec2(dirtTextureU, dirtTextureV));

      outputColour = vec4(dirtTexture.r, dirtTexture.g, dirtTexture.b, blockAmount);
   }
   `;

   framebufferProgram = createWebGLProgram(gl, framebufferVertexShaderText, framebufferFragmentShaderText);

   const cameraBlockIndex = gl.getUniformBlockIndex(framebufferProgram, "Camera");
   gl.uniformBlockBinding(framebufferProgram, cameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);

   renderProgram = createWebGLProgram(gl, renderVertexShaderText, renderFragmentShaderText);

   const blockerTextureUniformLocation = gl.getUniformLocation(renderProgram, "u_blockerTexture")!;
   const dirtTextureUniformLocation = gl.getUniformLocation(renderProgram, "u_dirtTexture")!;

   gl.useProgram(renderProgram);
   gl.uniform1i(blockerTextureUniformLocation, 0);
   gl.uniform1i(dirtTextureUniformLocation, 1);
}

const calculateGrassBlockerVertices = (grassBlockers: ReadonlyArray<GrassBlocker>): ReadonlyArray<number> => {
   const vertices = new Array<number>();

   for (let i = 0; i < grassBlockers.length; i++) {
      const blocker = grassBlockers[i];

      // @Incomplete
      if (!blockerIsCircluar(blocker)) {
         const halfWidth = blocker.width * 0.5;
         const halfHeight = blocker.height * 0.5;
         
         const topLeftOffsetX = rotateXAroundOrigin(halfWidth, halfHeight, blocker.rotation);
         const topLeftOffsetY = rotateYAroundOrigin(halfWidth, halfHeight, blocker.rotation);
         const topRightOffsetX = rotateXAroundOrigin(halfWidth, halfHeight, blocker.rotation + Math.PI * 0.5);
         const topRightOffsetY = rotateYAroundOrigin(halfWidth, halfHeight, blocker.rotation + Math.PI * 0.5);
         const bottomLeftOffsetX = -topRightOffsetX;
         const bottomLeftOffsetY = -topRightOffsetY;
         const bottomRightOffsetX = -topLeftOffsetX;
         const bottomRightOffsetY = -topLeftOffsetY;

         const opacity = blocker.blockAmount;
         
         vertices.push(
            blocker.position.x + bottomLeftOffsetX, blocker.position.y + bottomLeftOffsetY, opacity,
            blocker.position.x + bottomRightOffsetX, blocker.position.y + bottomRightOffsetY, opacity,
            blocker.position.x + topLeftOffsetX, blocker.position.y + topLeftOffsetY, opacity,
            blocker.position.x + topLeftOffsetX, blocker.position.y + topLeftOffsetY, opacity,
            blocker.position.x + bottomRightOffsetX, blocker.position.y + bottomRightOffsetY, opacity,
            blocker.position.x + topRightOffsetX, blocker.position.y + topRightOffsetY, opacity
         );
      }
   }

   return vertices;
}

export function renderGrassBlockers(): void {
   const grassBlockers = getGrassBlockers();

   const vertices = calculateGrassBlockerVertices(grassBlockers);


   // 
   // create texture
   // 

   // create to render to
   const targetTexture = gl.createTexture();
   gl.bindTexture(gl.TEXTURE_2D, targetTexture);
   
   {
   // define size and format of level 0
   const level = 0;
   const internalFormat = gl.RGBA;
   const border = 0;
   const format = gl.RGBA;
   const type = gl.UNSIGNED_BYTE;
   const data = null;
   gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  windowWidth, windowHeight, border,
                  format, type, data);
   
   // set the filtering so we don't need mips
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
   }

   // Create and bind the framebuffer
   const frameBuffer = gl.createFramebuffer();
   gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
   
   // attach the texture as the first color attachment
   const attachmentPoint = gl.COLOR_ATTACHMENT0;
   gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, targetTexture, 0);


   gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

   
   // @Temporary
   gl.clearColor(0, 0, 0, 1);
   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
   
   gl.useProgram(framebufferProgram);
   
   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
   
   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);

   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);




   gl.useProgram(renderProgram);
   gl.bindFramebuffer(gl.FRAMEBUFFER, null);
   
   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   const framebufferVertices = [
      0, 0,
      1, 0,
      0, 1,
      0, 1,
      1, 0,
      1, 1
   ];

   const buffer2 = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer2);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(framebufferVertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);

   gl.enableVertexAttribArray(0);

   // const blockerTextureLocation = gl.getUniformLocation(renderProgram, "u_blockerTexture")!;
   // gl.uniform(blockerTextureLocation, new Float32Array(lightColours));
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, targetTexture);

   gl.activeTexture(gl.TEXTURE1);
   gl.bindTexture(gl.TEXTURE_2D, getTexture("tiles/dirt.png"));

   gl.drawArrays(gl.TRIANGLES, 0, framebufferVertices.length / 2);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}
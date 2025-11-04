import { createTexture, createWebGLProgram, getCirclePoint, gl, windowHeight, windowWidth } from "../../webgl";
import {  rotateXAroundOrigin, rotateYAroundOrigin } from "battletribes-shared/utils";
import { getTexture } from "../../textures";
import { bindUBOToProgram, UBOBindingIndex } from "../ubos";
import { getGrassBlockers, GrassBlocker } from "../../grass-blockers";
import { boxIsCircular } from "../../../../../shared/src/boxes/boxes";
import { gameFramebuffer } from "../render";

const NUM_CIRCLE_POINTS = 10;

let framebufferProgram: WebGLProgram;
let renderProgram: WebGLProgram;

let frameBuffer: WebGLFramebuffer;
let frameBufferTexture: WebGLTexture;

let lastTextureWidth = 0;
let lastTextureHeight = 0;

let framebufferVertexData: Float32Array;

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

   out float v_opacity;

   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);

      v_opacity = a_opacity;
   }
   `;
   
   const framebufferFragmentShaderText = `#version 300 es
   precision mediump float;

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

      gl_Position = vec4(vertPosition, 0.0, 1.0);

      vec2 gamePos = vertPosition * u_halfWindowSize / u_zoom + u_playerPos;
      
      v_position = gamePos;
      v_texCoord = a_texCoord;
   }
   `;
   
   const renderFragmentShaderText = `#version 300 es
   precision mediump float;
   
   #define PI 3.14159265358979323846
   #define PIXEL_SIZE 4.0
   #define blurRange 5.0
   #define sx 512.0;
   #define ys 512.0;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };

   uniform sampler2D u_dirtTexture;
   uniform sampler2D u_blockerTexture;

   in vec2 v_position;
   in vec2 v_texCoord;

   out vec4 outputColour;
   
   float roundPixel(float num) {
      return round(num / PIXEL_SIZE) * PIXEL_SIZE;
   }

   vec2 pixelateVector(vec2 pos) {
      float x = roundPixel(pos.x);
      float y = roundPixel(pos.y);
      return vec2(x, y);
   }

   float rand(vec2 c){
      return fract(sin(dot(c.xy ,vec2(12.9898,78.233))) * 43758.5453);
   }
   
   float getNoise(vec2 p, float freq ){
      // float unit = u_screenWidth/freq;
      float unit = 1000.0/freq;
      vec2 ij = floor(p/unit);
      vec2 xy = mod(p,unit)/unit;
      //xy = 3.*xy*xy-2.*xy*xy*xy;
      xy = .5*(1.-cos(PI*xy));
      float a = rand((ij+vec2(0.,0.)));
      float b = rand((ij+vec2(1.,0.)));
      float c = rand((ij+vec2(0.,1.)));
      float d = rand((ij+vec2(1.,1.)));
      float x1 = mix(a, b, xy.x);
      float x2 = mix(c, d, xy.x);
      return mix(x1, x2, xy.y);
   }
   
   // float pNoise(vec2 p, int res){
   //    float persistance = .5;
   //    float n = 0.;
   //    float normK = 0.;
   //    float f = 4.;
   //    float amp = 1.;
   //    int iCount = 0;
   //    for (int i = 0; i<50; i++){
   //       n+=amp * getNoise(p, f);
   //       f*=2.;
   //       normK+=amp;
   //       amp*=persistance;
   //       if (iCount == res) break;
   //       iCount++;
   //    }
   //    float nf = n/normK;
   //    return nf*nf*nf*nf;
   // }

   void main() {
      // Make the fade pixelated
      float pixelatedX = roundPixel(v_position.x);
      float pixelatedY = roundPixel(v_position.y);

      // Problem: when player pos goes up by 1 but the v_position stays the same?
      
      vec2 screenPos = (pixelateVector(v_position) - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      // Translate to [0, 1]
      vec2 texturePos = (clipSpacePos + 1.0) * 0.5;
      float u = texturePos.x;
      float v = texturePos.y;

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
               col += texture(u_blockerTexture, p) * w;
            }
            
            y++;
            p.y += dy;
         }

         x++;
         p.x += dx;
      }

      float blockAmount = col.r;

      // Add random noise to the block amount
      if (blockAmount > 0.0) {
         float noiseMult = 1.0 - blockAmount * blockAmount;
         
         float noise = getNoise(pixelateVector(v_position), 200.0);
         blockAmount -= noise * 0.4 * noiseMult;
      }

      // Sample the dirt texture
      float dirtTextureU = fract(v_position.x / 64.0);
      float dirtTextureV = fract(v_position.y / 64.0);
      vec4 dirtTexture = texture(u_dirtTexture, vec2(dirtTextureU, dirtTextureV));
      
      outputColour = vec4(dirtTexture.r, dirtTexture.g, dirtTexture.b, blockAmount);
   }
   `;

   framebufferProgram = createWebGLProgram(gl, framebufferVertexShaderText, framebufferFragmentShaderText);
   bindUBOToProgram(gl, framebufferProgram, UBOBindingIndex.CAMERA);

   renderProgram = createWebGLProgram(gl, renderVertexShaderText, renderFragmentShaderText);

   const blockerTextureUniformLocation = gl.getUniformLocation(renderProgram, "u_blockerTexture")!;
   const dirtTextureUniformLocation = gl.getUniformLocation(renderProgram, "u_dirtTexture")!;

   gl.useProgram(renderProgram);
   gl.uniform1i(blockerTextureUniformLocation, 0);
   gl.uniform1i(dirtTextureUniformLocation, 1);

   frameBuffer = gl.createFramebuffer()!;

   const framebufferVertices = [
      0, 0,
      1, 0,
      0, 1,
      0, 1,
      1, 0,
      1, 1
   ];
   framebufferVertexData = new Float32Array(framebufferVertices);
}

export function calculateGrassBlockerVertexData(grassBlocker: GrassBlocker): Float32Array {
   const vertexData = new Float32Array(!boxIsCircular(grassBlocker.box) ? 6 * 3 : 3 * 3 * NUM_CIRCLE_POINTS);

   const opacity = grassBlocker.blockAmount;
   
   const box = grassBlocker.box;
   if (!boxIsCircular(box)) {
      const halfWidth = box.width * 0.5;
      const halfHeight = box.height * 0.5;
      
      const topLeftOffsetX = rotateXAroundOrigin(-halfWidth, halfHeight, box.angle);
      const topLeftOffsetY = rotateYAroundOrigin(-halfWidth, halfHeight, box.angle);
      const topRightOffsetX = rotateXAroundOrigin(halfWidth, halfHeight, box.angle);
      const topRightOffsetY = rotateYAroundOrigin(halfWidth, halfHeight, box.angle);
      const bottomLeftOffsetX = -topRightOffsetX;
      const bottomLeftOffsetY = -topRightOffsetY;
      const bottomRightOffsetX = -topLeftOffsetX;
      const bottomRightOffsetY = -topLeftOffsetY;

      vertexData[0] = box.position.x + bottomLeftOffsetX;
      vertexData[1] = box.position.y + bottomLeftOffsetY;
      vertexData[2] = opacity;
      vertexData[3] = box.position.x + bottomRightOffsetX;
      vertexData[4] = box.position.y + bottomRightOffsetY;
      vertexData[5] = opacity;
      vertexData[6] = box.position.x + topLeftOffsetX;
      vertexData[7] = box.position.y + topLeftOffsetY;
      vertexData[8] = opacity;
      vertexData[9] = box.position.x + topLeftOffsetX;
      vertexData[10] = box.position.y + topLeftOffsetY;
      vertexData[11] = opacity;
      vertexData[12] = box.position.x + bottomRightOffsetX;
      vertexData[13] = box.position.y + bottomRightOffsetY;
      vertexData[14] = opacity;
      vertexData[15] = box.position.x + topRightOffsetX;
      vertexData[16] = box.position.y + topRightOffsetY;
      vertexData[17] = opacity;
   } else {
      let lastPos = getCirclePoint(NUM_CIRCLE_POINTS, 0, box.position, box.radius);
      for (let i = 1; i <= NUM_CIRCLE_POINTS; i++) {
         // @Garbage
         const pos = getCirclePoint(NUM_CIRCLE_POINTS, i, box.position, box.radius);

         const dataOffset = 3 * 3 * (i - 1);
         vertexData[dataOffset] = box.position.x;
         vertexData[dataOffset + 1] = box.position.y;
         vertexData[dataOffset + 2] = opacity;
         vertexData[dataOffset + 3] = pos.x;
         vertexData[dataOffset + 4] = pos.y;
         vertexData[dataOffset + 5] = opacity;
         vertexData[dataOffset + 6] = lastPos.x;
         vertexData[dataOffset + 7] = lastPos.y;
         vertexData[dataOffset + 8] = opacity;
         
         lastPos = pos;
      }
   }

   return vertexData;
}

export function renderGrassBlockers(): void {
   const grassBlockers = getGrassBlockers();
   if (grassBlockers.size === 0) {
      return;
   }

   gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

   if (lastTextureWidth !== windowWidth || lastTextureHeight !== windowHeight) {
      frameBufferTexture = createTexture(windowWidth, windowHeight);

      lastTextureWidth = windowWidth;
      lastTextureHeight = windowHeight;
   
      // Attach the texture as the first color attachment
      const attachmentPoint = gl.COLOR_ATTACHMENT0;
      gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, frameBufferTexture, 0);
   }

   // 
   // FRAMEBUFFER RENDERING
   // 
   
   gl.useProgram(framebufferProgram);

   // Reset the previous texture
   gl.clearColor(0, 0, 0, 1);
   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
   
   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   for (const pair of grassBlockers) {
      const blocker = pair[1];
      gl.bindVertexArray(blocker.vao);
      gl.drawArrays(gl.TRIANGLES, 0, blocker.vertexDataLength / 3);
   }

   gl.bindVertexArray(null);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);

   // 
   // CANVAS RENDERING
   // 
   
   gl.useProgram(renderProgram);
   gl.bindFramebuffer(gl.FRAMEBUFFER, gameFramebuffer);
   
   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   const buffer2 = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer2);
   gl.bufferData(gl.ARRAY_BUFFER, framebufferVertexData, gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);

   gl.enableVertexAttribArray(0);

   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, frameBufferTexture);

   gl.activeTexture(gl.TEXTURE1);
   gl.bindTexture(gl.TEXTURE_2D, getTexture("tiles/dirt2.png"));

   gl.drawArrays(gl.TRIANGLES, 0, 6);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}
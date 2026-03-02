import { createWebGLProgram, gl, windowWidth, windowHeight, createTexture } from "../../webgl";
import { bindUBOToProgram, UBOBindingIndex } from "../ubos";
import { cleanupEntityRendering, renderEntity, setupEntityRendering } from "./entity-rendering";
import { cleanEntityRenderInfo, getRenderPartRenderPosition, translateEntityRenderParts } from "../render-part-matrices";
import { EntityRenderInfo, updateEntityRenderInfoRenderData } from "../../EntityRenderInfo";
import { gameFramebuffer } from "../render";

let renderProgram: WebGLProgram;

let framebuffer: WebGLFramebuffer;
let framebufferTexture: WebGLTexture;

let lastTextureWidth = 0;
let lastTextureHeight = 0;

let framebufferVertexData: Float32Array;

// @Temporary
let originPositionUniformLocation: WebGLUniformLocation;
let isSelectedUniformLocation: WebGLUniformLocation;

export function createStructureHighlightShaders(): void {
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
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(std140) uniform Time {
      uniform float u_time;
   };

   #define PI 3.14159265358979323846

   uniform sampler2D u_framebufferTexture;
   uniform float u_isSelected;
   uniform vec2 u_originPosition;

   in vec2 v_position;
   in vec2 v_texCoord;

   out vec4 outputColour;

   float atan2(in float y, in float x) {
      bool s = (abs(x) > abs(y));
      return mix(PI/2.0 - atan(x,y), atan(y,x), s);
   }

   void main() {
      vec4 framebufferColour = texture(u_framebufferTexture, v_texCoord);
      
      if (framebufferColour.a > 0.0) {
         if (u_isSelected > 0.5) {
            outputColour = vec4(245.0/255.0, 234.0/255.0, 113.0/255.0, 1.0);
         } else {
            float theta = atan2(v_position.y - u_originPosition.y, v_position.x - u_originPosition.x);

            float opacity = sin(theta * 3.0 + u_time * 0.003);
            opacity = mix(0.65, 1.0, opacity);

            outputColour = vec4(245.0/255.0, 234.0/255.0, 113.0/255.0, opacity);
         }
      } else {
         // Transparent
         outputColour = vec4(0.0, 0.0, 0.0, 0.0);
      }

      // @Hack :DarkTransparencyBug
      outputColour.rgb *= outputColour.a;
   }
   `;

   // Render program

   renderProgram = createWebGLProgram(gl, renderVertexShaderText, renderFragmentShaderText);
   bindUBOToProgram(gl, renderProgram, UBOBindingIndex.CAMERA);
   bindUBOToProgram(gl, renderProgram, UBOBindingIndex.TIME);

   const framebufferTextureUniformLocation = gl.getUniformLocation(renderProgram, "u_framebufferTexture")!;

   gl.useProgram(renderProgram);
   gl.uniform1i(framebufferTextureUniformLocation, 0);
   
   isSelectedUniformLocation = gl.getUniformLocation(renderProgram, "u_isSelected")!;
   originPositionUniformLocation = gl.getUniformLocation(renderProgram, "u_originPosition")!;

   // Framebuffer shit
   
   framebuffer = gl.createFramebuffer()!;

   framebufferVertexData = new Float32Array(12);
   framebufferVertexData[2] = 1;
   framebufferVertexData[5] = 1;
   framebufferVertexData[7] = 1;
   framebufferVertexData[8] = 1;
   framebufferVertexData[10] = 1;
   framebufferVertexData[11] = 1;
}

export function renderEntitySelection(renderInfo: EntityRenderInfo, tickInterp: number, isSelected: boolean): void {
   // 
   // Framebuffer Program
   // 

   gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

   if (lastTextureWidth !== windowWidth || lastTextureHeight !== windowHeight) {
      framebufferTexture = createTexture(windowWidth, windowHeight);

      lastTextureWidth = windowWidth;
      lastTextureHeight = windowHeight;
   
      // Attach the texture as the first color attachment
      const attachmentPoint = gl.COLOR_ATTACHMENT0;
      gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, framebufferTexture, 0);
   }

   // Reset the previous texture
   gl.clearColor(0, 0, 0, 0);
   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

   // For the outline, we render normally
   gl.enable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ONE);

   setupEntityRendering();

   // Right
   translateEntityRenderParts(renderInfo, 4, 0);
   updateEntityRenderInfoRenderData(renderInfo);
   renderEntity(renderInfo);
   cleanEntityRenderInfo(renderInfo, tickInterp);

   // Left
   translateEntityRenderParts(renderInfo, -4, 0);
   updateEntityRenderInfoRenderData(renderInfo);
   renderEntity(renderInfo);
   cleanEntityRenderInfo(renderInfo, tickInterp);

   // Top
   translateEntityRenderParts(renderInfo, 0, 4);
   updateEntityRenderInfoRenderData(renderInfo);
   renderEntity(renderInfo);
   cleanEntityRenderInfo(renderInfo, tickInterp);

   // Bottom
   translateEntityRenderParts(renderInfo, 0, -4);
   updateEntityRenderInfoRenderData(renderInfo);
   renderEntity(renderInfo);
   cleanEntityRenderInfo(renderInfo, tickInterp);

   // Top right
   translateEntityRenderParts(renderInfo, 4, 4);
   updateEntityRenderInfoRenderData(renderInfo);
   renderEntity(renderInfo);
   cleanEntityRenderInfo(renderInfo, tickInterp);

   // Bottom right
   translateEntityRenderParts(renderInfo, 4, -4);
   updateEntityRenderInfoRenderData(renderInfo);
   renderEntity(renderInfo);
   cleanEntityRenderInfo(renderInfo, tickInterp);

   // Bottom left
   translateEntityRenderParts(renderInfo, -4, -4);
   updateEntityRenderInfoRenderData(renderInfo);
   renderEntity(renderInfo);
   cleanEntityRenderInfo(renderInfo, tickInterp);

   // Top left
   translateEntityRenderParts(renderInfo, -4, 4);
   updateEntityRenderInfoRenderData(renderInfo);
   renderEntity(renderInfo);
   cleanEntityRenderInfo(renderInfo, tickInterp);

   // Then, we want to subtract the middle area. To do this we multiply the existing drawn pixels
   // (dfactor) by 1 minus the middle alpha.
   gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);

   updateEntityRenderInfoRenderData(renderInfo);
   renderEntity(renderInfo, { overrideAlphaWithOne: true });

   cleanupEntityRendering();
   
   // 
   // Render program
   // 
   
   gl.useProgram(renderProgram);
   gl.bindFramebuffer(gl.FRAMEBUFFER, gameFramebuffer);
   
   // @Hack :DarkTransparencyBug
   gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

   // @Speed
   const buffer2 = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer2);
   gl.bufferData(gl.ARRAY_BUFFER, framebufferVertexData, gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);

   gl.enableVertexAttribArray(0);

   // @HACK
   const renderPosition = getRenderPartRenderPosition(renderInfo.renderPartsByZIndex[0]);
   
   gl.uniform1f(isSelectedUniformLocation, isSelected ? 1 : 0);
   gl.uniform2f(originPositionUniformLocation, renderPosition.x, renderPosition.y);

   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, framebufferTexture);

   gl.drawArrays(gl.TRIANGLES, 0, 6);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}
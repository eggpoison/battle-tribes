import { rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared/dist/utils";
import { CAMERA_UNIFORM_BUFFER_BINDING_INDEX, createWebGLProgram, gl } from "../webgl";
import Board from "../Board";
import { ATLAS_SLOT_SIZE } from "../texture-atlases/texture-atlas-stitching";
import { ENTITY_TEXTURE_ATLAS, ENTITY_TEXTURE_ATLAS_LENGTH, ENTITY_TEXTURE_ATLAS_SIZE, ENTITY_TEXTURE_SLOT_INDEXES, getTextureHeight, getTextureWidth } from "../texture-atlases/entity-texture-atlas";
import RenderPart from "../render-parts/RenderPart";
import { EntityType } from "webgl-test-shared/dist/entities";

let program: WebGLProgram;
let vao: WebGLVertexArrayObject;
let buffer: WebGLBuffer;
let indexBuffer: WebGLBuffer;

export function createEntityShaders(): void {
   const vertexShaderText = `#version 300 es
   precision highp float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in float a_depth;
   layout(location = 2) in vec2 a_texCoord;
   layout(location = 3) in float a_textureArrayIndex;
   layout(location = 4) in vec3 a_tint;
   layout(location = 5) in float a_opacity;
   
   out vec2 v_texCoord;
   out float v_textureArrayIndex;
   out vec3 v_tint;
   out float v_opacity;
    
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, a_depth, 1.0);
   
      v_texCoord = a_texCoord;
      v_textureArrayIndex = a_textureArrayIndex;
      v_tint = a_tint;
      v_opacity = a_opacity;
   }
   `;
   
   const fragmentShaderText = `#version 300 es
   precision highp float;

   uniform sampler2D u_textureAtlas;
   uniform float u_atlasPixelSize;
   uniform float u_atlasSlotSize;
   uniform float u_textureSlotIndexes[${ENTITY_TEXTURE_ATLAS_LENGTH}];
   uniform vec2 u_textureSizes[${ENTITY_TEXTURE_ATLAS_LENGTH}];
   
   in vec2 v_texCoord;
   in float v_textureArrayIndex;
   in vec3 v_tint;
   in float v_opacity;
   
   out vec4 outputColour;
   
   void main() {
      int textureArrayIndex = int(v_textureArrayIndex);
      float textureIndex = u_textureSlotIndexes[textureArrayIndex];
      vec2 textureSize = u_textureSizes[textureArrayIndex];
      
      // Calculate the coordinates of the top left corner of the texture
      float textureX = mod(textureIndex * u_atlasSlotSize, u_atlasPixelSize);
      float textureY = floor(textureIndex * u_atlasSlotSize / u_atlasPixelSize) * u_atlasSlotSize;
      
      // @Incomplete: This is very hacky, the - 0.2 and + 0.1 shenanigans are to prevent texture bleeding but it causes tiny bits of the edge of the textures to get cut off.
      float u = (textureX + v_texCoord.x * (textureSize.x - 0.2) + 0.1) / u_atlasPixelSize;
      float v = 1.0 - ((textureY + (1.0 - v_texCoord.y) * (textureSize.y - 0.2) + 0.1) / u_atlasPixelSize);
      outputColour = texture(u_textureAtlas, vec2(u, v));
      
      if (v_tint.r > 0.0) {
         outputColour.r = mix(outputColour.r, 1.0, v_tint.r);
      } else {
         outputColour.r = mix(outputColour.r, 0.0, -v_tint.r);
      }
      if (v_tint.g > 0.0) {
         outputColour.g = mix(outputColour.g, 1.0, v_tint.g);
      } else {
         outputColour.g = mix(outputColour.g, 0.0, -v_tint.g);
      }
      if (v_tint.b > 0.0) {
         outputColour.b = mix(outputColour.b, 1.0, v_tint.b);
      } else {
         outputColour.b = mix(outputColour.b, 0.0, -v_tint.b);
      }
   
      outputColour.a *= v_opacity;
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);

   const cameraBlockIndex = gl.getUniformBlockIndex(program, "Camera");
   gl.uniformBlockBinding(program, cameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);

   const textureUniformLocation = gl.getUniformLocation(program, "u_textureAtlas")!;
   const atlasPixelSizeUniformLocation = gl.getUniformLocation(program, "u_atlasPixelSize")!;
   const atlasSlotSizeUniformLocation = gl.getUniformLocation(program, "u_atlasSlotSize")!;
   const textureSlotIndexesUniformLocation = gl.getUniformLocation(program, "u_textureSlotIndexes")!;
   const textureSizesUniformLocation = gl.getUniformLocation(program, "u_textureSizes")!;

   const textureSlotIndexes = new Float32Array(ENTITY_TEXTURE_ATLAS_LENGTH);
   for (let textureArrayIndex = 0; textureArrayIndex < ENTITY_TEXTURE_ATLAS_LENGTH; textureArrayIndex++) {
      textureSlotIndexes[textureArrayIndex] = ENTITY_TEXTURE_SLOT_INDEXES[textureArrayIndex];
   }

   const textureSizes = new Float32Array(ENTITY_TEXTURE_ATLAS_LENGTH * 2);
   for (let textureArrayIndex = 0; textureArrayIndex < ENTITY_TEXTURE_ATLAS_LENGTH; textureArrayIndex++) {
      textureSizes[textureArrayIndex * 2] = getTextureWidth(textureArrayIndex);
      textureSizes[textureArrayIndex * 2 + 1] = getTextureHeight(textureArrayIndex);
   }

   gl.useProgram(program);
   gl.uniform1i(textureUniformLocation, 0);
   gl.uniform1f(atlasPixelSizeUniformLocation, ENTITY_TEXTURE_ATLAS_SIZE);
   gl.uniform1f(atlasSlotSizeUniformLocation, ATLAS_SLOT_SIZE);
   gl.uniform1fv(textureSlotIndexesUniformLocation, textureSlotIndexes);
   gl.uniform2fv(textureSizesUniformLocation, textureSizes);

   // 
   // Create VAO
   // 

   vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 10 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 10 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 10 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 10 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(4, 3, gl.FLOAT, false, 10 * Float32Array.BYTES_PER_ELEMENT, 6 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(5, 1, gl.FLOAT, false, 10 * Float32Array.BYTES_PER_ELEMENT, 9 * Float32Array.BYTES_PER_ELEMENT);
   
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);
   gl.enableVertexAttribArray(3);
   gl.enableVertexAttribArray(4);
   gl.enableVertexAttribArray(5);

   indexBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

   gl.bindVertexArray(null);
}

export function renderGameObjects(): void {
   if (Board.sortedEntities.length === 0) return;

   const numRenderParts = Board.numVisibleRenderParts - Board.fish.length;
   
   const vertexData = new Float32Array(numRenderParts * 4 * 10);
   const indicesData = new Uint16Array(numRenderParts * 6);
   
   let i = 0;
   for (const entity of Board.sortedEntities) {
      entity.updateRenderPosition();

      // Calculate render info for all render parts
      // Update render parts from parent -> child
      const remainingRenderParts: Array<RenderPart> = [];
      for (const child of entity.children) {
         remainingRenderParts.push(child);
      }
      while (remainingRenderParts.length > 0) {
         const renderObject = remainingRenderParts[0];
         renderObject.update();

         for (const child of renderObject.children) {
            remainingRenderParts.push(child);
         }

         remainingRenderParts.splice(0, 1);
      }

      for (const renderPart of entity.allRenderParts) {
         const depth = -renderPart.zIndex * 0.0001 + entity.renderDepth;

   
         const u0 = renderPart.flipX ? 1 : 0;
         const u1 = 1 - u0;

         const width = getTextureWidth(renderPart.textureArrayIndex) * 4;
         const height = getTextureHeight(renderPart.textureArrayIndex) * 4;

         const x1 = renderPart.renderPosition.x - width / 2 * renderPart.scale;
         const x2 = renderPart.renderPosition.x + width / 2 * renderPart.scale;
         const y1 = renderPart.renderPosition.y - height / 2 * renderPart.scale;
         const y2 = renderPart.renderPosition.y + height / 2 * renderPart.scale;

         // Rotate the render part to match its rotation
         // @Speed: hopefully remove the need for this with instanced rendering
         const topLeftX = rotateXAroundPoint(x1, y2, renderPart.renderPosition.x, renderPart.renderPosition.y, renderPart.totalParentRotation + renderPart.rotation);
         const topLeftY = rotateYAroundPoint(x1, y2, renderPart.renderPosition.x, renderPart.renderPosition.y, renderPart.totalParentRotation + renderPart.rotation);
         const topRightX = rotateXAroundPoint(x2, y2, renderPart.renderPosition.x, renderPart.renderPosition.y, renderPart.totalParentRotation + renderPart.rotation);
         const topRightY = rotateYAroundPoint(x2, y2, renderPart.renderPosition.x, renderPart.renderPosition.y, renderPart.totalParentRotation + renderPart.rotation);
         const bottomLeftX = rotateXAroundPoint(x1, y1, renderPart.renderPosition.x, renderPart.renderPosition.y, renderPart.totalParentRotation + renderPart.rotation);
         const bottomLeftY = rotateYAroundPoint(x1, y1, renderPart.renderPosition.x, renderPart.renderPosition.y, renderPart.totalParentRotation + renderPart.rotation);
         const bottomRightX = rotateXAroundPoint(x2, y1, renderPart.renderPosition.x, renderPart.renderPosition.y, renderPart.totalParentRotation + renderPart.rotation);
         const bottomRightY = rotateYAroundPoint(x2, y1, renderPart.renderPosition.x, renderPart.renderPosition.y, renderPart.totalParentRotation + renderPart.rotation);

         const vertexDataOffset = i * 4 * 10;

         const tintR = entity.tintR + renderPart.tintR;
         const tintG = entity.tintG + renderPart.tintG;
         const tintB = entity.tintB + renderPart.tintB;

         vertexData[vertexDataOffset] = bottomLeftX;
         vertexData[vertexDataOffset + 1] = bottomLeftY;
         vertexData[vertexDataOffset + 2] = depth;
         vertexData[vertexDataOffset + 3] = u0;
         vertexData[vertexDataOffset + 4] = 0;
         vertexData[vertexDataOffset + 5] = renderPart.textureArrayIndex;
         vertexData[vertexDataOffset + 6] = tintR;
         vertexData[vertexDataOffset + 7] = tintG;
         vertexData[vertexDataOffset + 8] = tintB;
         vertexData[vertexDataOffset + 9] = renderPart.opacity;

         vertexData[vertexDataOffset + 10] = bottomRightX;
         vertexData[vertexDataOffset + 11] = bottomRightY;
         vertexData[vertexDataOffset + 12] = depth;
         vertexData[vertexDataOffset + 13] = u1;
         vertexData[vertexDataOffset + 14] = 0;
         vertexData[vertexDataOffset + 15] = renderPart.textureArrayIndex;
         vertexData[vertexDataOffset + 16] = tintR;
         vertexData[vertexDataOffset + 17] = tintG;
         vertexData[vertexDataOffset + 18] = tintB;
         vertexData[vertexDataOffset + 19] = renderPart.opacity;

         vertexData[vertexDataOffset + 20] = topLeftX;
         vertexData[vertexDataOffset + 21] = topLeftY;
         vertexData[vertexDataOffset + 22] = depth;
         vertexData[vertexDataOffset + 23] = u0;
         vertexData[vertexDataOffset + 24] = 1;
         vertexData[vertexDataOffset + 25] = renderPart.textureArrayIndex;
         vertexData[vertexDataOffset + 26] = tintR;
         vertexData[vertexDataOffset + 27] = tintG;
         vertexData[vertexDataOffset + 28] = tintB;
         vertexData[vertexDataOffset + 29] = renderPart.opacity;

         vertexData[vertexDataOffset + 30] = topRightX;
         vertexData[vertexDataOffset + 31] = topRightY;
         vertexData[vertexDataOffset + 32] = depth;
         vertexData[vertexDataOffset + 33] = u1;
         vertexData[vertexDataOffset + 34] = 1;
         vertexData[vertexDataOffset + 35] = renderPart.textureArrayIndex;
         vertexData[vertexDataOffset + 36] = tintR;
         vertexData[vertexDataOffset + 37] = tintG;
         vertexData[vertexDataOffset + 38] = tintB;
         vertexData[vertexDataOffset + 39] = renderPart.opacity;

         const indicesDataOffset = i * 6;

         indicesData[indicesDataOffset] = i * 4;
         indicesData[indicesDataOffset + 1] = i * 4 + 1;
         indicesData[indicesDataOffset + 2] = i * 4 + 2;
         indicesData[indicesDataOffset + 3] = i * 4 + 2;
         indicesData[indicesDataOffset + 4] = i * 4 + 1;
         indicesData[indicesDataOffset + 5] = i * 4 + 3;

         i++;
      }
   }

   if (i !== numRenderParts) {
      throw new Error("Detected missing or extra render parts!");
   }

   gl.useProgram(program);

   gl.enable(gl.DEPTH_TEST);
   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
   gl.depthMask(true);

   // Bind texture atlas
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, ENTITY_TEXTURE_ATLAS);

   gl.bindVertexArray(vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
   gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesData, gl.STATIC_DRAW);
   
   gl.drawElements(gl.TRIANGLES, numRenderParts * 6, gl.UNSIGNED_SHORT, 0);

   gl.disable(gl.DEPTH_TEST);
   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
   gl.depthMask(false);

   gl.bindVertexArray(null);
}
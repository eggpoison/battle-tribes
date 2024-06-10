import { rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared/dist/utils";
import { createWebGLProgram, gl } from "../../webgl";
import Board from "../../Board";
import { getEntityTextureAtlas } from "../../texture-atlases/texture-atlases";
import { bindUBOToProgram, ENTITY_TEXTURE_ATLAS_UBO, UBOBindingIndex } from "../ubos";
import Entity, { RenderPartOverlayGroup } from "../../Entity";
import { calculateRenderPartDepth } from "./entity-rendering";
import { createImage } from "../../textures";

const enum Vars {
   ATTRIBUTES_PER_VERTEX = 9
}

// @Cleanup: shouldn't be exported
export const OVERLAY_TEXTURE_SOURCES: Array<string> = [
   "overlays/dirt.png"
];

let program: WebGLProgram;
let vao: WebGLVertexArrayObject;
let buffer: WebGLBuffer;
let indexBuffer: WebGLBuffer;

let overlayTextureArray: WebGLTexture;

export async function createEntityOverlayShaders(): Promise<void> {
   const vertexShaderText = `#version 300 es
   precision highp float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in vec2 a_centerPosition;
   layout(location = 2) in float a_depth;
   layout(location = 3) in vec2 a_texCoord;
   layout(location = 4) in float a_overlayTextureArrayIndex;
   layout(location = 5) in float a_entityTextureArrayIndex;
   
   out vec2 v_relativePosition;
   out vec2 v_texCoord;
   out float v_overlayTextureArrayIndex;
   out float v_entityTextureArrayIndex;
    
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, a_depth, 1.0);
   
      v_relativePosition = a_position - a_centerPosition;
      v_texCoord = a_texCoord;
      v_overlayTextureArrayIndex = a_overlayTextureArrayIndex;
      v_entityTextureArrayIndex = a_entityTextureArrayIndex;
   }
   `;
   
   const fragmentShaderText = `#version 300 es
   precision highp float;

   uniform sampler2D u_entityTextureAtlas;
   ${ENTITY_TEXTURE_ATLAS_UBO}
   
   uniform highp sampler2DArray u_overlayTextures;
   
   in vec2 v_relativePosition;
   in vec2 v_texCoord;
   in float v_overlayTextureArrayIndex;
   in float v_entityTextureArrayIndex;
   
   out vec4 outputColour;
   
   void main() {
      int textureArrayIndex = int(v_entityTextureArrayIndex);
      float textureIndex = u_textureSlotIndexes[textureArrayIndex];
      vec2 textureSize = u_textureSizes[textureArrayIndex];
      
      float atlasPixelSize = u_atlasSize * ATLAS_SLOT_SIZE;
      
      // Calculate the coordinates of the top left corner of the texture
      float textureX = mod(textureIndex * ATLAS_SLOT_SIZE, atlasPixelSize);
      float textureY = floor(textureIndex * ATLAS_SLOT_SIZE / atlasPixelSize) * ATLAS_SLOT_SIZE;
      
      // @Incomplete: This is very hacky, the - 0.2 and + 0.1 shenanigans are to prevent texture bleeding but it causes tiny bits of the edge of the textures to get cut off.
      float u = (textureX + v_texCoord.x * (textureSize.x - 0.2) + 0.1) / atlasPixelSize;
      float v = 1.0 - ((textureY + (1.0 - v_texCoord.y) * (textureSize.y - 0.2) + 0.1) / atlasPixelSize);
      vec4 entityColour = texture(u_entityTextureAtlas, vec2(u, v));

      // Sample the overlay texture
      vec2 uv = v_texCoord * textureSize / 16.0;
      vec4 overlayColour = texture(u_overlayTextures, vec3(uv, v_overlayTextureArrayIndex));
      
      outputColour = vec4(overlayColour.r, overlayColour.g, overlayColour.b, overlayColour.a * entityColour.a);
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   bindUBOToProgram(gl, program, UBOBindingIndex.CAMERA);
   bindUBOToProgram(gl, program, UBOBindingIndex.ENTITY_TEXTURE_ATLAS);

   const entityTextureUniformLocation = gl.getUniformLocation(program, "u_entityTextureAtlas")!;
   const overlayTextureUniformLocation = gl.getUniformLocation(program, "u_overlayTextures")!;

   gl.useProgram(program);
   gl.uniform1i(entityTextureUniformLocation, 0);
   gl.uniform1i(overlayTextureUniformLocation, 1);

   // 
   // Create texture array
   // 

   overlayTextureArray = gl.createTexture()!;
   gl.bindTexture(gl.TEXTURE_2D_ARRAY, overlayTextureArray);
   gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 5, gl.RGBA8, 16, 16, OVERLAY_TEXTURE_SOURCES.length);

   gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
   gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
   
   // Set all texture units
   for (let i = 0; i < OVERLAY_TEXTURE_SOURCES.length; i++) {
      const textureSource = OVERLAY_TEXTURE_SOURCES[i];
      const image = await createImage(textureSource);

      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, 16, 16, 1, gl.RGBA, gl.UNSIGNED_BYTE, image);
   }

   // @Cleanup: why do we do this? shouldn't we not need mipmaps?
   gl.generateMipmap(gl.TEXTURE_2D_ARRAY);

   // 
   // Create VAO
   // 

   vao = gl.createVertexArray()!;
   gl.bindVertexArray(vao);

   buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, Vars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, Vars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 1, gl.FLOAT, false, Vars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(3, 2, gl.FLOAT, false, Vars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(4, 1, gl.FLOAT, false, Vars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 7 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(5, 1, gl.FLOAT, false, Vars.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, 8 * Float32Array.BYTES_PER_ELEMENT);
   
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

const getNumOverlayParts = (): number => {
   let numParts = 0;
   
   for (let i = 0; i < Board.sortedEntities.length; i++) {
      const entity = Board.sortedEntities[i];
      for (let j = 0; j < entity.renderPartOverlayGroups.length; j++) {
         const overlayGroup = entity.renderPartOverlayGroups[j];
         numParts += overlayGroup.renderParts.length;
      }
   }

   return numParts;
}

const calculateGroupDepth = (entity: Entity, overlayGroup: RenderPartOverlayGroup): number => {
   let minDepth = 999999;
   for (let i = 0; i < overlayGroup.renderParts.length; i++) {
      const renderPart = overlayGroup.renderParts[i];
      const depth = calculateRenderPartDepth(renderPart, entity);
      if (depth < minDepth) {
         minDepth = depth;
      }
   }

   return minDepth - 0.0001;
}

export function renderEntityOverlays(): void {
   // @Bug: interacts weirdly with transparency. as it uses depth, the overlays need to be drawn during the entity-rendering loop. somehow, even though they have different shaders
   
   const numParts = getNumOverlayParts();
   if (numParts === 0) return;

   const entityTextureAtlas = getEntityTextureAtlas();

   const vertexData = new Float32Array(numParts * 4 * Vars.ATTRIBUTES_PER_VERTEX);
   const indicesData = new Uint16Array(numParts * 6);

   let partIdx = 0;
   for (let i = 0; i < Board.sortedEntities.length; i++) {
      const entity = Board.sortedEntities[i];

      for (let j = 0; j < entity.renderPartOverlayGroups.length; j++) {
         const overlayGroup = entity.renderPartOverlayGroups[j];
         const overlayTextureArrayIndex = OVERLAY_TEXTURE_SOURCES.indexOf(overlayGroup.textureSource);

         const depth = calculateGroupDepth(entity, overlayGroup);

         for (let k = 0; k < overlayGroup.renderParts.length; k++) {
            const renderPart = overlayGroup.renderParts[k];
            const entityTextureArrayIndex = renderPart.textureArrayIndex;
   
            const width = entityTextureAtlas.textureWidths[entityTextureArrayIndex] * 4;
            const height = entityTextureAtlas.textureHeights[entityTextureArrayIndex] * 4;
   
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
   
            const vertexDataOffset = partIdx * 4 * Vars.ATTRIBUTES_PER_VERTEX;
   
            vertexData[vertexDataOffset] = bottomLeftX;
            vertexData[vertexDataOffset + 1] = bottomLeftY;
            vertexData[vertexDataOffset + 2] = renderPart.renderPosition.x;
            vertexData[vertexDataOffset + 3] = renderPart.renderPosition.y;
            vertexData[vertexDataOffset + 4] = depth;
            vertexData[vertexDataOffset + 5] = 0;
            vertexData[vertexDataOffset + 6] = 0;
            vertexData[vertexDataOffset + 7] = overlayTextureArrayIndex;
            vertexData[vertexDataOffset + 8] = entityTextureArrayIndex;
   
            vertexData[vertexDataOffset + 9] = bottomRightX;
            vertexData[vertexDataOffset + 10] = bottomRightY;
            vertexData[vertexDataOffset + 11] = renderPart.renderPosition.x;
            vertexData[vertexDataOffset + 12] = renderPart.renderPosition.y;
            vertexData[vertexDataOffset + 13] = depth;
            vertexData[vertexDataOffset + 14] = 1;
            vertexData[vertexDataOffset + 15] = 0;
            vertexData[vertexDataOffset + 16] = overlayTextureArrayIndex;
            vertexData[vertexDataOffset + 17] = entityTextureArrayIndex;
   
            vertexData[vertexDataOffset + 18] = topLeftX;
            vertexData[vertexDataOffset + 19] = topLeftY;
            vertexData[vertexDataOffset + 20] = renderPart.renderPosition.x;
            vertexData[vertexDataOffset + 21] = renderPart.renderPosition.y;
            vertexData[vertexDataOffset + 22] = depth;
            vertexData[vertexDataOffset + 23] = 0;
            vertexData[vertexDataOffset + 24] = 1;
            vertexData[vertexDataOffset + 25] = overlayTextureArrayIndex;
            vertexData[vertexDataOffset + 26] = entityTextureArrayIndex;
   
            vertexData[vertexDataOffset + 27] = topRightX;
            vertexData[vertexDataOffset + 28] = topRightY;
            vertexData[vertexDataOffset + 29] = renderPart.renderPosition.x;
            vertexData[vertexDataOffset + 30] = renderPart.renderPosition.y;
            vertexData[vertexDataOffset + 31] = depth;
            vertexData[vertexDataOffset + 32] = 1;
            vertexData[vertexDataOffset + 33] = 1;
            vertexData[vertexDataOffset + 34] = overlayTextureArrayIndex;
            vertexData[vertexDataOffset + 35] = entityTextureArrayIndex;
   
            const indicesDataOffset = partIdx * 6;
   
            indicesData[indicesDataOffset] = partIdx * 4;
            indicesData[indicesDataOffset + 1] = partIdx * 4 + 1;
            indicesData[indicesDataOffset + 2] = partIdx * 4 + 2;
            indicesData[indicesDataOffset + 3] = partIdx * 4 + 2;
            indicesData[indicesDataOffset + 4] = partIdx * 4 + 1;
            indicesData[indicesDataOffset + 5] = partIdx * 4 + 3;
   
            partIdx++;
         }
      }
   }

   gl.useProgram(program);

   gl.enable(gl.DEPTH_TEST);
   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
   gl.depthMask(true);

   // Bind texture atlases
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, entityTextureAtlas.texture);
   gl.activeTexture(gl.TEXTURE1);
   gl.bindTexture(gl.TEXTURE_2D_ARRAY, overlayTextureArray);

   gl.bindVertexArray(vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
   gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesData, gl.STATIC_DRAW);
   
   gl.drawElements(gl.TRIANGLES, numParts * 6, gl.UNSIGNED_SHORT, 0);

   gl.disable(gl.DEPTH_TEST);
   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
   gl.depthMask(false);

   gl.bindVertexArray(null);
}
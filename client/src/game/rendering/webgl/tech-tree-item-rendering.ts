import { Point, polarVec2, randAngle, randFloat, randSign, rotateXAroundPoint, rotateYAroundPoint } from "battletribes-shared/utils";
import { createWebGLProgram, halfWindowHeight, halfWindowWidth } from "../../webgl";
import { ATLAS_SLOT_SIZE } from "../../texture-atlases/texture-atlas-stitching";
import { getTechTreeEntityTextureAtlas, getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import CLIENT_ITEM_INFO_RECORD from "../../client-item-info";
import { getTechTreeGL, techTreeX, techTreeY, techTreeZoom } from "./tech-tree-rendering";
import { Settings } from "battletribes-shared/settings";
import { UBOBindingIndex, bindUBOToProgram } from "../ubos";
import { ItemType } from "battletribes-shared/items/items";
import { TEXTURE_SOURCES } from "../../texture-atlases/texture-sources";

interface TechTreeItem {
   readonly itemType: ItemType;
   readonly position: Point;
   readonly velocity: Point;
   rotation: number;
   angularVelocity: number;
   age: number;
   readonly lifetime: number;
}

const items = new Array<TechTreeItem>();

let program: WebGLProgram;
let vao: WebGLVertexArrayObject;
let buffer: WebGLBuffer;
let indexBuffer: WebGLBuffer;

export function createTechTreeItem(itemType: ItemType, position: Point): void {
   const item: TechTreeItem = {
      itemType: itemType,
      position: position,
      velocity: polarVec2(randFloat(10, 15), randAngle()),
      rotation: randAngle(),
      angularVelocity: randFloat(2, 3) * randSign(),
      age: 0,
      lifetime: randFloat(1, 1.25)
   };
   items.push(item);
}

export function createTechTreeItemShaders(): void {
   const vertexShaderText = `#version 300 es
   precision highp float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in vec2 a_texCoord;
   layout(location = 2) in float a_textureArrayIndex;
   layout(location = 3) in float a_opacity;
   
   out vec2 v_texCoord;
   out float v_textureArrayIndex;
   out float v_opacity;
    
   void main() {
      // vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      // vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      // gl_Position = vec4(clipSpacePos, 0.0, 1.0);
      gl_Position = vec4(a_position, 0.0, 1.0);
   
      v_texCoord = a_texCoord;
      v_textureArrayIndex = a_textureArrayIndex;
      v_opacity = a_opacity;
   }
   `;
   
   const fragmentShaderText = `#version 300 es
   precision highp float;

   uniform sampler2D u_textureAtlas;
   uniform float u_atlasPixelSize;
   uniform float u_atlasSlotSize;
   uniform float u_textureSlotIndexes[${TEXTURE_SOURCES.length}];
   uniform vec2 u_textureSizes[${TEXTURE_SOURCES.length}];
   
   in vec2 v_texCoord;
   in float v_textureArrayIndex;
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
      
      outputColour.a *= v_opacity;
   }
   `;

   // @TEMPORARY: if this runs it crashes cuz too many uniforms or something
   if(1+1===2)return;

   const gl = getTechTreeGL();

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   bindUBOToProgram(gl, program, UBOBindingIndex.CAMERA);

   const textureUniformLocation = gl.getUniformLocation(program, "u_textureAtlas")!;
   const atlasPixelSizeUniformLocation = gl.getUniformLocation(program, "u_atlasPixelSize")!;
   const atlasSlotSizeUniformLocation = gl.getUniformLocation(program, "u_atlasSlotSize")!;
   const textureSlotIndexesUniformLocation = gl.getUniformLocation(program, "u_textureSlotIndexes")!;
   const textureSizesUniformLocation = gl.getUniformLocation(program, "u_textureSizes")!;

   const textureAtlas = getTechTreeEntityTextureAtlas();
   
   const textureSlotIndexes = new Float32Array(TEXTURE_SOURCES.length);
   for (let textureArrayIndex = 0; textureArrayIndex < TEXTURE_SOURCES.length; textureArrayIndex++) {
      textureSlotIndexes[textureArrayIndex] = textureAtlas.textureSlotIndexes[textureArrayIndex];
   }

   const textureSizes = new Float32Array(TEXTURE_SOURCES.length * 2);
   for (let textureArrayIndex = 0; textureArrayIndex < TEXTURE_SOURCES.length; textureArrayIndex++) {
      textureSizes[textureArrayIndex * 2] = textureAtlas.textureWidths[textureArrayIndex];
      textureSizes[textureArrayIndex * 2 + 1] = textureAtlas.textureHeights[textureArrayIndex];
   }

   gl.useProgram(program);
   gl.uniform1i(textureUniformLocation, 0);
   gl.uniform1f(atlasPixelSizeUniformLocation, textureAtlas.atlasSize * ATLAS_SLOT_SIZE);
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

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);
   
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);
   gl.enableVertexAttribArray(3);

   indexBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

   gl.bindVertexArray(null);
}

export function updateTechTreeItems(): void {
   for (let i = 0; i < items.length; i++) {
      const item = items[i];
      item.age += Settings.DT_S;
      if (item.age >= item.lifetime) {
         items.splice(i, 1);
         i--;
         continue;
      }
      
      const vx = item.velocity.x * Settings.DT_S;
      const vy = item.velocity.y * Settings.DT_S;

      item.position.x += vx;
      item.position.y += vy;

      item.rotation += item.angularVelocity * Settings.DT_S;
   }
}

// @Cleanup: Copy and paste

/** X position in the screen (0 = left, windowWidth = right) */
const calculateXScreenPos = (x: number): number => {
   // Account for the player position
   let position = x + techTreeX;
   // Account for zoom
   position = position * techTreeZoom + halfWindowWidth;
   position = position / halfWindowWidth - 1;
   return position;
}

/** Y position in the screen (0 = bottom, windowHeight = top) */
const calculateYScreenPos = (y: number): number => {
   // Account for the player position
   let position = y - techTreeY;
   // Account for zoom
   position = position * techTreeZoom + halfWindowHeight;
   position = position / halfWindowHeight - 1;
   return position;
}

export function renderTechTreeItems(): void {
   if (items.length === 0) {
      return;
   }

   const a = 16; // @Cleanup @Hack: what is this?

   const textureAtlas = getTechTreeEntityTextureAtlas();
   const gl = getTechTreeGL();
   
   const vertexData = new Float32Array(items.length * 4 * 6);
   const indicesData = new Uint16Array(items.length * 6);
   
   for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const vertexDataOffset = i * 4 * 6;

      const clientItemInfo = CLIENT_ITEM_INFO_RECORD[item.itemType];
      const textureArrayIndex = getTextureArrayIndex(clientItemInfo.entityTextureSource);

      // @Cleanup: constant
      const width = textureAtlas.textureWidths[textureArrayIndex] * 0.015 * a;
      const height = textureAtlas.textureHeights[textureArrayIndex] * 0.015 * a;

      let opacity = item.age / item.lifetime;
      opacity = 1 - opacity * opacity;
      
      // @Incomplete
      const scale = 1;

      const x = item.position.x * a;
      const y = item.position.y * a;
      
      // @Incomplete: use render position
      const x1 = x - width / 2 * a * scale;
      const x2 = x + width / 2 * a * scale;
      const y1 = y - height / 2 * a * scale;
      const y2 = y + height / 2 * a * scale;

      // Rotate the render part to match its rotation
      // @Speed: hopefully remove the need for this with instanced rendering
      const topLeftX = calculateXScreenPos(rotateXAroundPoint(x1, y2, x, y, item.rotation));
      const topLeftY = calculateYScreenPos(rotateYAroundPoint(x1, y2, x, y, item.rotation));
      const topRightX = calculateXScreenPos(rotateXAroundPoint(x2, y2, x, y, item.rotation));
      const topRightY = calculateYScreenPos(rotateYAroundPoint(x2, y2, x, y, item.rotation));
      const bottomLeftX = calculateXScreenPos(rotateXAroundPoint(x1, y1, x, y, item.rotation));
      const bottomLeftY = calculateYScreenPos(rotateYAroundPoint(x1, y1, x, y, item.rotation));
      const bottomRightX = calculateXScreenPos(rotateXAroundPoint(x2, y1, x, y, item.rotation));
      const bottomRightY = calculateYScreenPos(rotateYAroundPoint(x2, y1, x, y, item.rotation));

      vertexData[vertexDataOffset] = bottomLeftX;
      vertexData[vertexDataOffset + 1] = bottomLeftY;
      vertexData[vertexDataOffset + 2] = 0;
      vertexData[vertexDataOffset + 3] = 0;
      vertexData[vertexDataOffset + 4] = textureArrayIndex;
      vertexData[vertexDataOffset + 5] = opacity;

      vertexData[vertexDataOffset + 6] = bottomRightX;
      vertexData[vertexDataOffset + 7] = bottomRightY;
      vertexData[vertexDataOffset + 8] = 1;
      vertexData[vertexDataOffset + 9] = 0;
      vertexData[vertexDataOffset + 10] = textureArrayIndex;
      vertexData[vertexDataOffset + 11] = opacity;

      vertexData[vertexDataOffset + 12] = topLeftX;
      vertexData[vertexDataOffset + 13] = topLeftY;
      vertexData[vertexDataOffset + 14] = 0;
      vertexData[vertexDataOffset + 15] = 1;
      vertexData[vertexDataOffset + 16] = textureArrayIndex;
      vertexData[vertexDataOffset + 17] = opacity;

      vertexData[vertexDataOffset + 18] = topRightX;
      vertexData[vertexDataOffset + 19] = topRightY;
      vertexData[vertexDataOffset + 20] = 1;
      vertexData[vertexDataOffset + 21] = 1;
      vertexData[vertexDataOffset + 22] = textureArrayIndex;
      vertexData[vertexDataOffset + 23] = opacity;

      const indicesDataOffset = i * 6;

      indicesData[indicesDataOffset] = i * 4;
      indicesData[indicesDataOffset + 1] = i * 4 + 1;
      indicesData[indicesDataOffset + 2] = i * 4 + 2;
      indicesData[indicesDataOffset + 3] = i * 4 + 2;
      indicesData[indicesDataOffset + 4] = i * 4 + 1;
      indicesData[indicesDataOffset + 5] = i * 4 + 3;
   }

   gl.useProgram(program);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   // Bind texture atlas
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, textureAtlas.texture);

   gl.bindVertexArray(vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
   gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesData, gl.STATIC_DRAW);
   
   gl.drawElements(gl.TRIANGLES, items.length * 6, gl.UNSIGNED_SHORT, 0);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);

   gl.bindVertexArray(null);
}
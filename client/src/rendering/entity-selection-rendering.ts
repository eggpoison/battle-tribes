import { rotateXAroundOrigin, rotateXAroundPoint, rotateYAroundOrigin, rotateYAroundPoint } from "webgl-test-shared/dist/utils";
import Board from "../Board";
import { getHighlightedEntityID, getSelectedEntityID } from "../entity-selection";
import { createWebGLProgram, gl, CAMERA_UNIFORM_BUFFER_BINDING_INDEX, windowWidth, windowHeight, createTexture, TIME_UNIFORM_BUFFER_BINDING_INDEX } from "../webgl";
import Entity from "../Entity";
import { getTextureWidth, getTextureHeight, ENTITY_TEXTURE_ATLAS_LENGTH, ENTITY_TEXTURE_ATLAS_SIZE, ENTITY_TEXTURE_SLOT_INDEXES, ENTITY_TEXTURE_ATLAS } from "../texture-atlases/entity-texture-atlas";
import { ATLAS_SLOT_SIZE } from "../texture-atlases/texture-atlas-stitching";

let framebufferProgram: WebGLProgram;
let renderProgram: WebGLProgram;

let frameBuffer: WebGLFramebuffer;
let frameBufferTexture: WebGLTexture;

let lastTextureWidth = 0;
let lastTextureHeight = 0;

let framebufferVertexData: Float32Array;

// @Incomplete

// export function getClosestGroupNum(entity: Entity): number {
//    const groups = getEntityHighlightInfoArray(entity);
   
//    let minCursorDist = Number.MAX_SAFE_INTEGER;
//    let closestGroupNum = 0;
   
//    for (let i = 0; i < groups.length; i++) {
//       const group = groups[i];

//       for (let j = 0; j < group.length; j++) {
//          const highlightInfo = group[j];

//          const x = entity.position.x + rotateXAroundOrigin(highlightInfo.xOffset, highlightInfo.yOffset, entity.rotation);
//          const y = entity.position.y + rotateYAroundOrigin(highlightInfo.xOffset, highlightInfo.yOffset, entity.rotation);
//          const dist = distance(Game.cursorPositionX!, Game.cursorPositionY!, x, y);
//          if (dist < minCursorDist) {
//             minCursorDist = dist;
//             closestGroupNum = highlightInfo.group;
//          }
//       }
//    }

//    return closestGroupNum;
// }

// @Temporary
export function getClosestGroupNum(entity: Entity): number {
   return 1;
}

// const getHighlightInfoGroup = (entity: Entity): HighlightInfoGroup => {
//    const groupNum = getClosestGroupNum(entity);
//    const highlightInfoArray = getEntityHighlightInfoArray(entity);
//    for (let i = 0; i < highlightInfoArray.length; i++) {
//       const group = highlightInfoArray[i];
//       if (group[0].group === groupNum) {
//          return group;
//       }
//    }
//    throw new Error();
// }

// @Temporary
let originPositionUniformLocation: WebGLUniformLocation;
let isSelectedUniformLocation: WebGLUniformLocation;

export function createStructureHighlightShaders(): void {
   const framebufferVertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   layout(location = 1) in vec2 a_origin;
   layout(location = 2) in vec2 a_texCoord;
   layout(location = 3) in float a_textureArrayIndex;
   layout(location = 4) in float a_lightness;

   out vec2 v_position;
   out vec2 v_origin;
   out vec2 v_texCoord;
   out float v_textureArrayIndex;
   out float v_lightness;
   
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0); 

      v_position = a_position;
      v_origin = a_origin;
      v_texCoord = a_texCoord;
      v_textureArrayIndex = a_textureArrayIndex;
      v_lightness = a_lightness;
   }
   `;
   const framebufferFragmentShaderText = `#version 300 es
   precision mediump float;
   
   // @Cleanup: Copy and paste from game-object-rendering.ts, make into UBO
   uniform sampler2D u_textureAtlas;
   uniform float u_atlasPixelSize;
   uniform float u_atlasSlotSize;
   uniform float u_textureSlotIndexes[${ENTITY_TEXTURE_ATLAS_LENGTH}];
   uniform vec2 u_textureSizes[${ENTITY_TEXTURE_ATLAS_LENGTH}];

   in vec2 v_position;
   in vec2 v_origin;
   in vec2 v_texCoord;
   in float v_textureArrayIndex;
   in float v_lightness;
   
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

      vec4 textureColour = texture(u_textureAtlas, vec2(u, v));

      if (textureColour.a > 0.5) {
         outputColour = vec4(v_lightness, v_lightness, v_lightness, 1.0);
      } else {
         // Transparent
         outputColour = vec4(0.0, 0.0, 0.0, 0.0);
      }
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
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(std140) uniform Time {
      uniform float u_time;
   };

   #define PI 3.14159265358979323846

   uniform sampler2D u_framebufferTexure;
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
      vec4 framebufferColour = texture(u_framebufferTexure, v_texCoord);
      
      if (framebufferColour.r > 0.5) {
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
   }
   `;

   framebufferProgram = createWebGLProgram(gl, framebufferVertexShaderText, framebufferFragmentShaderText);

   const cameraBlockIndex = gl.getUniformBlockIndex(framebufferProgram, "Camera");
   gl.uniformBlockBinding(framebufferProgram, cameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);

   // @Cleanup: Copy and paste

   const textureUniformLocation = gl.getUniformLocation(framebufferProgram, "u_textureAtlas")!;
   const atlasPixelSizeUniformLocation = gl.getUniformLocation(framebufferProgram, "u_atlasPixelSize")!;
   const atlasSlotSizeUniformLocation = gl.getUniformLocation(framebufferProgram, "u_atlasSlotSize")!;
   const textureSlotIndexesUniformLocation = gl.getUniformLocation(framebufferProgram, "u_textureSlotIndexes")!;
   const textureSizesUniformLocation = gl.getUniformLocation(framebufferProgram, "u_textureSizes")!;

   const textureSlotIndexes = new Float32Array(ENTITY_TEXTURE_ATLAS_LENGTH);
   for (let textureArrayIndex = 0; textureArrayIndex < ENTITY_TEXTURE_ATLAS_LENGTH; textureArrayIndex++) {
      textureSlotIndexes[textureArrayIndex] = ENTITY_TEXTURE_SLOT_INDEXES[textureArrayIndex];
   }

   const textureSizes = new Float32Array(ENTITY_TEXTURE_ATLAS_LENGTH * 2);
   for (let textureArrayIndex = 0; textureArrayIndex < ENTITY_TEXTURE_ATLAS_LENGTH; textureArrayIndex++) {
      textureSizes[textureArrayIndex * 2] = getTextureWidth(textureArrayIndex);
      textureSizes[textureArrayIndex * 2 + 1] = getTextureHeight(textureArrayIndex);
   }

   gl.useProgram(framebufferProgram);
   gl.uniform1i(textureUniformLocation, 0);
   gl.uniform1f(atlasPixelSizeUniformLocation, ENTITY_TEXTURE_ATLAS_SIZE);
   gl.uniform1f(atlasSlotSizeUniformLocation, ATLAS_SLOT_SIZE);
   gl.uniform1fv(textureSlotIndexesUniformLocation, textureSlotIndexes);
   gl.uniform2fv(textureSizesUniformLocation, textureSizes);

   // 
   // Render program
   // 

   renderProgram = createWebGLProgram(gl, renderVertexShaderText, renderFragmentShaderText);

   {
      const cameraBlockIndex = gl.getUniformBlockIndex(renderProgram, "Camera");
      gl.uniformBlockBinding(renderProgram, cameraBlockIndex, CAMERA_UNIFORM_BUFFER_BINDING_INDEX);

      const timeBlockIndex = gl.getUniformBlockIndex(renderProgram, "Time");
      gl.uniformBlockBinding(renderProgram, timeBlockIndex, TIME_UNIFORM_BUFFER_BINDING_INDEX);
   }

   const framebufferTextureUniformLocation = gl.getUniformLocation(renderProgram, "u_framebufferTexture")!;

   gl.useProgram(renderProgram);
   gl.uniform1i(framebufferTextureUniformLocation, 0);
   
   isSelectedUniformLocation = gl.getUniformLocation(renderProgram, "u_isSelected")!;
   originPositionUniformLocation = gl.getUniformLocation(renderProgram, "u_originPosition")!;

   // Misc
   
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

const addVertices = (vertices: Array<number>, entity: Entity, offsetX: number, offsetY: number, lightness: number): void => {
   for (let i = 0; i < entity.allRenderParts.length; i++) {
      const renderPart = entity.allRenderParts[i];

      const width = getTextureWidth(renderPart.textureArrayIndex) * 4;
      const height = getTextureHeight(renderPart.textureArrayIndex) * 4;

      // @Cleanup: renderPart.totalParentRotation + renderPart.rotation
      const x = renderPart.renderPosition.x + rotateXAroundOrigin(offsetX, offsetY, renderPart.totalParentRotation + renderPart.rotation);
      const y = renderPart.renderPosition.y + rotateYAroundOrigin(offsetX, offsetY, renderPart.totalParentRotation + renderPart.rotation);

      const x1 = x - width * 0.5;
      const x2 = x + width * 0.5;
      const y1 = y - height * 0.5;
      const y2 = y + height * 0.5;
      
      // @Speed
      // @Cleanup: renderPart.totalParentRotation + renderPart.rotation
      const tlX = rotateXAroundPoint(x1, y2, x, y, renderPart.totalParentRotation + renderPart.rotation);
      const tlY = rotateYAroundPoint(x1, y2, x, y, renderPart.totalParentRotation + renderPart.rotation);
      const trX = rotateXAroundPoint(x2, y2, x, y, renderPart.totalParentRotation + renderPart.rotation);
      const trY = rotateYAroundPoint(x2, y2, x, y, renderPart.totalParentRotation + renderPart.rotation);
      const blX = rotateXAroundPoint(x1, y1, x, y, renderPart.totalParentRotation + renderPart.rotation);
      const blY = rotateYAroundPoint(x1, y1, x, y, renderPart.totalParentRotation + renderPart.rotation);
      const brX = rotateXAroundPoint(x2, y1, x, y, renderPart.totalParentRotation + renderPart.rotation);
      const brY = rotateYAroundPoint(x2, y1, x, y, renderPart.totalParentRotation + renderPart.rotation);

      const textureArrayIndex = renderPart.textureArrayIndex;
      
      // @Speed
      vertices.push(
         blX, blY, x, y, 0, 0, textureArrayIndex, lightness,
         brX, brY, x, y, 1, 0, textureArrayIndex, lightness,
         tlX, tlY, x, y, 0, 1, textureArrayIndex, lightness,
         tlX, tlY, x, y, 0, 1, textureArrayIndex, lightness,
         brX, brY, x, y, 1, 0, textureArrayIndex, lightness,
         trX, trY, x, y, 1, 1, textureArrayIndex, lightness
      );
   }
}

const calculateVertices = (entity: Entity): ReadonlyArray<number> => {
   const vertices = new Array<number>();
   
   addVertices(vertices, entity, -4, 4, 1); // Top left
   addVertices(vertices, entity, 0, 4, 1); // Top
   addVertices(vertices, entity, 4, 4, 1); // Top right
   addVertices(vertices, entity, -4, 0, 1); // Left
   addVertices(vertices, entity, 4, 0, 1); // Right
   addVertices(vertices, entity, -4, -4, 1); // Bottom left
   addVertices(vertices, entity, 0, -4, 1); // Bottom
   addVertices(vertices, entity, 4, -4, 1); // Bottom right
   
   addVertices(vertices, entity, 0, 0, 0); // Middle

   return vertices;
}

// const addSideVertices = (vertices: Array<number>, centerX: number, centerY: number, x1: number, x2: number, y1: number, y2: number, rotation: number): void => {
//    const tlX = rotateXAroundPoint(x1, y2, centerX, centerY, rotation);
//    const tlY = rotateYAroundPoint(x1, y2, centerX, centerY, rotation);
//    const trX = rotateXAroundPoint(x2, y2, centerX, centerY, rotation);
//    const trY = rotateYAroundPoint(x2, y2, centerX, centerY, rotation);
//    const blX = rotateXAroundPoint(x1, y1, centerX, centerY, rotation);
//    const blY = rotateYAroundPoint(x1, y1, centerX, centerY, rotation);
//    const brX = rotateXAroundPoint(x2, y1, centerX, centerY, rotation);
//    const brY = rotateYAroundPoint(x2, y1, centerX, centerY, rotation);

//    vertices.push(
//       blX, blY,
//       brX, brY,
//       tlX, tlY,
//       tlX, tlY,
//       brX, brY,
//       trX, trY
//    );
// }

// @Incomplete

// const calculateVertices = (entity: Entity): ReadonlyArray<number> => {
//    const highlightInfoGroup = getHighlightInfoGroup(entity);
   
//    const vertices = new Array<number>();
//    for (let i = 0; i < highlightInfoGroup.length; i++) {
//       const highlightInfo = highlightInfoGroup[i];

//       if (highlightInfo.isCircle) {
//          const radius = highlightInfo.width / 2;
      
//          const step = 2 * Math.PI / CIRCLE_VERTEX_COUNT;
         
//          // Add the outer vertices
//          for (let i = 0; i < CIRCLE_VERTEX_COUNT; i++) {
//             const radians = i * 2 * Math.PI / CIRCLE_VERTEX_COUNT;
//             // @Speed: Garbage collection
            
//             // Trig shenanigans to get x and y coords
//             const bl = Point.fromVectorForm(radius, radians);
//             const br = Point.fromVectorForm(radius, radians + step);
//             const tl = Point.fromVectorForm(radius + THICKNESS, radians);
//             const tr = Point.fromVectorForm(radius + THICKNESS, radians + step);
      
//             bl.add(entity.position);
//             br.add(entity.position);
//             tl.add(entity.position);
//             tr.add(entity.position);
      
//             vertices.push(
//                bl.x, bl.y,
//                br.x, br.y,
//                tl.x, tl.y,
//                tl.x, tl.y,
//                br.x, br.y,
//                tr.x, tr.y
//             );
//          }
//       } else {
//          const halfWidth = highlightInfo.width / 2;
//          const halfHeight = highlightInfo.height / 2;
      
//          const x = entity.position.x + rotateXAroundOrigin(highlightInfo.xOffset, highlightInfo.yOffset, entity.rotation);
//          const y = entity.position.y + rotateYAroundOrigin(highlightInfo.xOffset, highlightInfo.yOffset, entity.rotation);
      
//          const rotation = entity.rotation + highlightInfo.rotation;
         
//          // Top
//          addSideVertices(vertices, x, y, x - halfWidth - THICKNESS, x + halfWidth + THICKNESS, y + halfHeight, y + halfHeight + THICKNESS, rotation);
//          // Right
//          addSideVertices(vertices, x, y, x + halfWidth, x + halfWidth + THICKNESS, y - halfHeight - THICKNESS, y + halfHeight + THICKNESS, rotation);
//          // Bottom
//          addSideVertices(vertices, x, y, x - halfWidth - THICKNESS, x + halfWidth + THICKNESS, y - halfHeight, y - halfHeight - THICKNESS, rotation);
//          // Left
//          addSideVertices(vertices, x, y, x - halfWidth - THICKNESS, x - halfWidth, y - halfHeight - THICKNESS, y + halfHeight + THICKNESS, rotation);
//       }
//    }

//    return vertices;
// }

export function renderEntitySelection(): void {
   const highlightedStructureID = getHighlightedEntityID();
   const highlightedEntity = Board.entityRecord[highlightedStructureID];
   if (typeof highlightedEntity === "undefined") {
      return;
   }

   if (lastTextureWidth !== windowWidth || lastTextureHeight !== windowHeight) {
      frameBufferTexture = createTexture(windowWidth, windowHeight);

      lastTextureWidth = windowWidth;
      lastTextureHeight = windowHeight;
   }

   const vertices = calculateVertices(highlightedEntity);

   // 
   // Framebuffer Program
   // 

   gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
   
   // Attach the texture as the first color attachment
   const attachmentPoint = gl.COLOR_ATTACHMENT0;
   gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, frameBufferTexture, 0);
   
   gl.useProgram(framebufferProgram);

   // Reset the previous texture
   gl.clearColor(0, 0, 0, 1);
   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
   
   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 4 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 6 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(4, 1, gl.FLOAT, false, 8 * Float32Array.BYTES_PER_ELEMENT, 7 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);
   gl.enableVertexAttribArray(3);
   gl.enableVertexAttribArray(4);

   // Bind texture atlas
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, ENTITY_TEXTURE_ATLAS);

   gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 8);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);

   // 
   // Render program
   // 
   
   gl.useProgram(renderProgram);
   gl.bindFramebuffer(gl.FRAMEBUFFER, null);
   
   gl.enable(gl.BLEND);
   gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

   const buffer2 = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer2);
   gl.bufferData(gl.ARRAY_BUFFER, framebufferVertexData, gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);

   gl.enableVertexAttribArray(0);
   
   gl.uniform1f(isSelectedUniformLocation, highlightedStructureID === getSelectedEntityID() ? 1 : 0);
   gl.uniform2f(originPositionUniformLocation, highlightedEntity.renderPosition.x, highlightedEntity.renderPosition.y);

   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, frameBufferTexture);

   gl.drawArrays(gl.TRIANGLES, 0, 6);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}
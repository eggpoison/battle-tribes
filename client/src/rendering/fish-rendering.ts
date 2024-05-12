import { rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared/dist/utils";
import { TileType } from "webgl-test-shared/dist/tiles";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { CAMERA_UNIFORM_BUFFER_BINDING_INDEX, createWebGLProgram, gl } from "../webgl";
import Board from "../Board";
import { ATLAS_SLOT_SIZE } from "../texture-atlases/texture-atlas-stitching";
import { ENTITY_TEXTURE_ATLAS, ENTITY_TEXTURE_ATLAS_LENGTH, ENTITY_TEXTURE_ATLAS_SIZE, ENTITY_TEXTURE_SLOT_INDEXES, getTextureHeight, getTextureWidth } from "../texture-atlases/entity-texture-atlas";

// @Cleanup: This all sucks. should really be combined with game-object-rendering, as apart from the blur this is just a 1-1 copy of it

let program: WebGLProgram;
let vao: WebGLVertexArrayObject;
let buffer: WebGLBuffer;
let indexBuffer: WebGLBuffer;

export function createFishShaders(): void {
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
   layout(location = 6) in float a_isInWater;
   
   out vec2 v_texCoord;
   out float v_textureArrayIndex;
   out vec3 v_tint;
   out float v_opacity;
   out float v_isInWater;
    
   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, a_depth, 1.0);
   
      v_texCoord = a_texCoord;
      v_textureArrayIndex = a_textureArrayIndex;
      v_tint = a_tint;
      v_opacity = a_opacity;
      v_isInWater = a_isInWater;
   }
   `;
   
   // https://stackoverflow.com/questions/64837705/opengl-blurring
   
   const fragmentShaderText = `#version 300 es
   precision highp float;
   
   #define blurRange 2.0
   #define sx 512.0;
   #define ys 512.0;
   
   uniform sampler2D u_textureAtlas;
   uniform float u_atlasPixelSize;
   uniform float u_atlasSlotSize;
   uniform float u_textureSlotIndexes[${ENTITY_TEXTURE_ATLAS_LENGTH}];
   uniform vec2 u_textureSizes[${ENTITY_TEXTURE_ATLAS_LENGTH}];
   
   in vec2 v_texCoord;
   in float v_textureArrayIndex;
   in vec3 v_tint;
   in float v_opacity;
   in float v_isInWater;
   
   out vec4 outputColour;
   
   void main() {
      int textureArrayIndex = int(v_textureArrayIndex);
      
      float textureIndex = u_textureSlotIndexes[textureArrayIndex];
      vec2 textureSize = u_textureSizes[textureArrayIndex];
      // textureSize = vec2(16.0, 16.0);

      // Calculate the coordinates of the top left corner of the texture
      float textureX = mod(textureIndex * u_atlasSlotSize, u_atlasPixelSize);
      float textureY = floor(textureIndex * u_atlasSlotSize / u_atlasPixelSize) * u_atlasSlotSize;

      // @Incomplete: This is very hacky, the - 0.2 and + 0.1 shenanigans are to prevent texture bleeding but it causes tiny bits of the edge of the textures to get cut off.
      float u = (textureX + v_texCoord.x * (textureSize.x - 0.2) + 0.1) / u_atlasPixelSize;
      float v = 1.0 - ((textureY + (1.0 - v_texCoord.y) * (textureSize.y - 0.2) + 0.1) / u_atlasPixelSize);

      if (v_isInWater > 0.5) {
         float x,y,xx,yy,rr=blurRange*blurRange,dx,dy,w,w0;
         w0 = 0.3780 / pow(blurRange, 1.975);
         vec2 p;
         vec4 col=vec4(0.0,0.0,0.0,0.0);
   
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
                  col+=texture(u_textureAtlas, p) * w;
               }
               
               y++;
               p.y += dy;
            }
   
            x++;
            p.x += dx;
         }
         outputColour = col;
      } else {
         outputColour = texture(u_textureAtlas, vec2(u, v));
      }
      
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

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 11 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 11 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 11 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 11 * Float32Array.BYTES_PER_ELEMENT, 5 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(4, 3, gl.FLOAT, false, 11 * Float32Array.BYTES_PER_ELEMENT, 6 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(5, 1, gl.FLOAT, false, 11 * Float32Array.BYTES_PER_ELEMENT, 9 * Float32Array.BYTES_PER_ELEMENT);
   gl.vertexAttribPointer(6, 1, gl.FLOAT, false, 11 * Float32Array.BYTES_PER_ELEMENT, 10 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);
   gl.enableVertexAttribArray(3);
   gl.enableVertexAttribArray(4);
   gl.enableVertexAttribArray(5);
   gl.enableVertexAttribArray(6);

   indexBuffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

   gl.bindVertexArray(null);
}

export function renderFish(): void {
   if (Board.fish.length === 0) return;
   
   const vertexData = new Float32Array(Board.fish.length * 4 * 11);

   const indicesData = new Uint16Array(Board.fish.length * 6);

   let i = 0;
   for (const fish of Board.fish) {
      fish.updateRenderPosition();

      for (const renderPart of fish.allRenderParts) {
         renderPart.update();
         
         const depth = -renderPart.zIndex * 0.0001 + fish.renderDepth;
   
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

         const vertexDataOffset = i * 4 * 11;

         let opacity = renderPart.opacity;
         if (fish.tile.type === TileType.water) {
            const fishComponent = fish.getServerComponent(ServerComponentType.fish);
            opacity *= 0.75 * fishComponent.waterOpacityMultiplier;
         }

         const isInWater = fish.tile.type === TileType.water ? 1 : 0;

         vertexData[vertexDataOffset] = bottomLeftX;
         vertexData[vertexDataOffset + 1] = bottomLeftY;
         vertexData[vertexDataOffset + 2] = depth;
         vertexData[vertexDataOffset + 3] = u0;
         vertexData[vertexDataOffset + 4] = 0;
         vertexData[vertexDataOffset + 5] = renderPart.textureArrayIndex;
         vertexData[vertexDataOffset + 6] = fish.tintR;
         vertexData[vertexDataOffset + 7] = fish.tintG;
         vertexData[vertexDataOffset + 8] = fish.tintB;
         vertexData[vertexDataOffset + 9] = opacity;
         vertexData[vertexDataOffset + 10] = isInWater;

         vertexData[vertexDataOffset + 11] = bottomRightX;
         vertexData[vertexDataOffset + 12] = bottomRightY;
         vertexData[vertexDataOffset + 13] = depth;
         vertexData[vertexDataOffset + 14] = u1;
         vertexData[vertexDataOffset + 15] = 0;
         vertexData[vertexDataOffset + 16] = renderPart.textureArrayIndex;
         vertexData[vertexDataOffset + 17] = fish.tintR;
         vertexData[vertexDataOffset + 18] = fish.tintG;
         vertexData[vertexDataOffset + 19] = fish.tintB;
         vertexData[vertexDataOffset + 20] = opacity;
         vertexData[vertexDataOffset + 21] = isInWater;

         vertexData[vertexDataOffset + 22] = topLeftX;
         vertexData[vertexDataOffset + 23] = topLeftY;
         vertexData[vertexDataOffset + 24] = depth;
         vertexData[vertexDataOffset + 25] = u0;
         vertexData[vertexDataOffset + 26] = 1;
         vertexData[vertexDataOffset + 27] = renderPart.textureArrayIndex;
         vertexData[vertexDataOffset + 28] = fish.tintR;
         vertexData[vertexDataOffset + 29] = fish.tintG;
         vertexData[vertexDataOffset + 30] = fish.tintB;
         vertexData[vertexDataOffset + 31] = opacity;
         vertexData[vertexDataOffset + 32] = isInWater;

         vertexData[vertexDataOffset + 33] = topRightX;
         vertexData[vertexDataOffset + 34] = topRightY;
         vertexData[vertexDataOffset + 35] = depth;
         vertexData[vertexDataOffset + 36] = u1;
         vertexData[vertexDataOffset + 37] = 1;
         vertexData[vertexDataOffset + 38] = renderPart.textureArrayIndex;
         vertexData[vertexDataOffset + 39] = fish.tintR;
         vertexData[vertexDataOffset + 40] = fish.tintG;
         vertexData[vertexDataOffset + 41] = fish.tintB;
         vertexData[vertexDataOffset + 42] = opacity;
         vertexData[vertexDataOffset + 43] = isInWater;

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

   if (i !== Board.fish.length) {
      throw new Error("Detected missing or extra render parts!");
   }

   gl.useProgram(program);

   // Bind texture atlas
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, ENTITY_TEXTURE_ATLAS);

   gl.bindVertexArray(vao);

   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
   gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesData, gl.STATIC_DRAW);
   
   gl.drawElements(gl.TRIANGLES, 6 * Board.fish.length, gl.UNSIGNED_SHORT, 0);

   gl.bindVertexArray(null);
}
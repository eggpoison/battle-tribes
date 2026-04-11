import { createWebGLProgram, gl } from "../../webgl";
import { getEntityTextureAtlas } from "../../texture-atlases/texture-atlases";
import { bindUBOToProgram, getEntityTextureAtlasUBO, UBOBindingIndex } from "../ubos";
import { EntityRenderObject } from "../../EntityRenderObject";
import { VisualRenderPart, renderPartIsTextured, thingIsVisualRenderPart } from "../../render-parts/render-parts";

const enum Var {
   ATTRIBUTES_PER_VERTEX = 14
}

export const enum EntityRenderingVar {
   ATTRIBUTES_PER_VERTEX = Var.ATTRIBUTES_PER_VERTEX
}

export interface EntityRenderData {
   readonly vao: WebGLVertexArrayObject;
   readonly vertexBuffer: WebGLBuffer;
   readonly vertexData: Float32Array;
   readonly indexBuffer: WebGLBuffer;
}

let program: WebGLProgram;
let overrideAlphaWithOneUniformLocation: WebGLUniformLocation;

let previousOverrideAlphaWithOne = false;

export function createEntityShaders(): void {
   const vertexShaderText = `#version 300 es
   precision highp float;

   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };

   ${getEntityTextureAtlasUBO()}
   
   layout(location = 0) in float a_depth;
   layout(location = 1) in float a_textureIndex;
   layout(location = 2) in vec2 a_textureSize;
   layout(location = 3) in vec3 a_tint;
   // @SPEED This attribute is here only so that the snobe can dig down into snow through the illusion of its opacity decreasing. But a far better and actually better gameplay-wise too method is to have it actually dig down, and have snow stuff above it obscure it naturally.
   layout(location = 4) in float a_opacity;
   layout(location = 5) in vec2 a_modelMatrix_col0;
   layout(location = 6) in vec2 a_modelMatrix_col1;
   layout(location = 7) in vec2 a_modelMatrix_col2;
   
   out vec2 v_texCoord;
   out float v_textureIndex;
   out vec2 v_textureSize;
   out vec3 v_tint;
   out float v_opacity;

   uint pcg_hash(uint val) {
      uint state = val * 747796405u + 2891336453u;
      uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
      return (word >> 22u) ^ word;
   }
   
   void main() {
      int vertexID = gl_VertexID;

      vec2 textureSize;
      if (a_textureIndex == -1.0) {
         // Non-textured render parts

         uint hash = pcg_hash(uint(vertexID));
         float rand = fract(float(hash) / 10000.0);

         float size = mix(1.4, 1.6, rand);
         textureSize = vec2(size, size);
      } else {
         textureSize = a_textureSize;
      }

      int u = vertexID & 1;
      int v = vertexID >> 1;
      vec2 position = vec2(float(u), float(v)) - 0.5;

      mat3 modelMatrix = mat3(
         a_modelMatrix_col0.x, a_modelMatrix_col0.y, 0.0,
         a_modelMatrix_col1.x, a_modelMatrix_col1.y, 0.0,
         a_modelMatrix_col2.x, a_modelMatrix_col2.y, 1.0
      );

      vec2 worldPos = (modelMatrix * vec3(position * textureSize * 4.0, 1.0)).xy;

      vec2 screenPos = (worldPos - u_playerPos) * u_zoom + u_halfWindowSize;
      vec2 clipSpacePos = screenPos / u_halfWindowSize - 1.0;
      gl_Position = vec4(clipSpacePos, a_depth, 1.0);
   
      v_texCoord = position + 0.5;
      v_textureIndex = a_textureIndex;
      v_textureSize = a_textureSize;
      v_tint = a_tint;
      v_opacity = a_opacity;
   }
   `;
   
   const fragmentShaderText = `#version 300 es
   precision highp float;

   uniform sampler2D u_textureAtlas;
   ${getEntityTextureAtlasUBO()}
   
   uniform float u_overrideAlphaWithOne;
   
   in vec2 v_texCoord;
   in float v_textureIndex;
   in vec2 v_textureSize;
   in vec3 v_tint;
   in float v_opacity;
   
   out vec4 outputColour;
   
   void main() {
      if (v_textureIndex == -1.0) {
         // Monocolour textures
         outputColour = vec4(v_tint, 1.0);
      } else {
         float atlasPixelSize = u_atlasSize * ATLAS_SLOT_SIZE;
         
         // Calculate the coordinates of the top left corner of the texture
         float textureXOffset = mod(v_textureIndex, u_atlasSize) * ATLAS_SLOT_SIZE;
         float textureYOffset = floor(v_textureIndex / u_atlasSize) * ATLAS_SLOT_SIZE;

         float textureX = clamp(floor(v_texCoord.x * v_textureSize.x), 0.0, v_textureSize.x - 1.0);
         float textureY = clamp(floor(v_texCoord.y * v_textureSize.y), 0.0, v_textureSize.y - 1.0);
         
         float x = textureXOffset + textureX;
         float y = textureYOffset + textureY;
         float u = (x + 0.5) / atlasPixelSize;
         float v = (y + 0.5) / atlasPixelSize;

         outputColour = texture(u_textureAtlas, vec2(u, v));
      
         outputColour.rgb = mix(outputColour.rgb, step(vec3(0.0), v_tint), abs(v_tint));
      }
   
      if (u_overrideAlphaWithOne > 0.5 && outputColour.a > 0.0) {
         outputColour.a = 1.0;
      } else {
         outputColour.a *= v_opacity;
      }

      // @Hack :DarkTransparencyBug
      outputColour.rgb *= outputColour.a;
   }
   `;

   program = createWebGLProgram(gl, vertexShaderText, fragmentShaderText);
   bindUBOToProgram(gl, program, UBOBindingIndex.CAMERA);
   bindUBOToProgram(gl, program, UBOBindingIndex.ENTITY_TEXTURE_ATLAS);

   const textureUniformLocation = gl.getUniformLocation(program, "u_textureAtlas")!;

   gl.useProgram(program);
   gl.uniform1i(textureUniformLocation, 0);

   overrideAlphaWithOneUniformLocation = gl.getUniformLocation(program, "u_overrideAlphaWithOne")!;
   gl.uniform1f(overrideAlphaWithOneUniformLocation, previousOverrideAlphaWithOne ? 1 : 0);

   gl.bindVertexArray(null);
}

export function createEntityRenderData(maxRenderParts: number): EntityRenderData {
   // The Uint16 index buffer puts a cap on maxRenderParts before the indices wrap around silently, a limit of 65535 / 4
   if (maxRenderParts >= 16383) {
      throw new Error();
   }
   
   const vao = gl.createVertexArray();
   gl.bindVertexArray(vao);
   
   const vertexData = new Float32Array(maxRenderParts * EntityRenderingVar.ATTRIBUTES_PER_VERTEX);

   const vertexBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);

   const TOTAL_BYTES = EntityRenderingVar.ATTRIBUTES_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT;
   gl.vertexAttribPointer(0, 1, gl.FLOAT, false, TOTAL_BYTES, 0); // floatOffset=0
   gl.vertexAttribDivisor(0, 1);
   gl.vertexAttribPointer(1, 1, gl.FLOAT, false, TOTAL_BYTES, 4); // floatOffset=1
   gl.vertexAttribDivisor(1, 1);
   gl.vertexAttribPointer(2, 2, gl.FLOAT, false, TOTAL_BYTES, 8); // floatOffset=2
   gl.vertexAttribDivisor(2, 1);
   gl.vertexAttribPointer(3, 3, gl.FLOAT, false, TOTAL_BYTES, 16); // floatOffset=4
   gl.vertexAttribDivisor(3, 1);
   gl.vertexAttribPointer(4, 1, gl.FLOAT, false, TOTAL_BYTES, 28); // floatOffset=7
   gl.vertexAttribDivisor(4, 1);

   gl.vertexAttribPointer(5, 2, gl.FLOAT, false, TOTAL_BYTES, 32); // floatOffset=8
   gl.vertexAttribDivisor(5, 1);
   gl.vertexAttribPointer(6, 2, gl.FLOAT, false, TOTAL_BYTES, 40); // floatOffset=10
   gl.vertexAttribDivisor(6, 1);
   gl.vertexAttribPointer(7, 2, gl.FLOAT, false, TOTAL_BYTES, 48); // floatOffset=12
   gl.vertexAttribDivisor(7, 1);
   
   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);
   gl.enableVertexAttribArray(2);
   gl.enableVertexAttribArray(3);
   gl.enableVertexAttribArray(4);

   gl.enableVertexAttribArray(5);
   gl.enableVertexAttribArray(6);
   gl.enableVertexAttribArray(7);

   const indicesData = new Uint16Array(6);
   indicesData[1] = 1;
   indicesData[2] = 2;
   indicesData[3] = 2;
   indicesData[4] = 1;
   indicesData[5] = 3;

   const indexBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
   gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesData, gl.STATIC_DRAW);

   return {
      vao: vao,
      vertexBuffer: vertexBuffer,
      vertexData: vertexData,
      indexBuffer: indexBuffer
   };
}

export function deleteEntityRenderData(renderObject: EntityRenderObject): void {
   if (renderObject.vao !== null) {
      gl.deleteBuffer(renderObject.vertexBuffer);
      gl.deleteBuffer(renderObject.indexBuffer);
      gl.deleteVertexArray(renderObject.vao);
   }
}

export function calculateRenderPartDepth(renderPart: VisualRenderPart, renderObject: EntityRenderObject): number {
   return renderObject.renderHeight + renderPart.zIndex * 0.0001;
}

export function setRenderObjectInVertexData(renderObject: EntityRenderObject, vertexData: Float32Array, renderPartIdx: number): void {
   const textureAtlas = getEntityTextureAtlas();

   const baseTintR = renderObject.tintR;
   const baseTintG = renderObject.tintG;
   const baseTintB = renderObject.tintB;

   let vertexDataOffset = renderPartIdx * Var.ATTRIBUTES_PER_VERTEX;
   for (const renderPart of renderObject.renderPartsByZIndex) {
      if (!thingIsVisualRenderPart(renderPart)) {
         continue;
      }
      
      const depth = calculateRenderPartDepth(renderPart, renderObject);
      
      let textureIndex: number;
      let textureWidth: number;
      let textureHeight: number;
      if (renderPartIsTextured(renderPart)) {
         const textureArrayIndex = renderPart.textureArrayIndex;
         textureIndex = textureAtlas.textureSlotIndexes[textureArrayIndex];
         textureWidth = textureAtlas.textureWidths[textureArrayIndex];
         textureHeight = textureAtlas.textureHeights[textureArrayIndex];
      } else {
         textureIndex = -1;
         textureWidth = -1;
         textureHeight = -1;
      }

      const tintR = baseTintR + renderPart.tintR;
      const tintG = baseTintG + renderPart.tintG;
      const tintB = baseTintB + renderPart.tintB;

      const modelMatrix = renderPart.modelMatrix;

      vertexData[vertexDataOffset] = depth;
      vertexData[vertexDataOffset + 1] = textureIndex;
      vertexData[vertexDataOffset + 2] = textureWidth;
      vertexData[vertexDataOffset + 3] = textureHeight;
      vertexData[vertexDataOffset + 4] = tintR;
      vertexData[vertexDataOffset + 5] = tintG;
      vertexData[vertexDataOffset + 6] = tintB;
      vertexData[vertexDataOffset + 7] = renderPart.opacity;
      vertexData[vertexDataOffset + 8] = modelMatrix[0];
      vertexData[vertexDataOffset + 9] = modelMatrix[1];
      vertexData[vertexDataOffset + 10] = modelMatrix[2];
      vertexData[vertexDataOffset + 11] = modelMatrix[3];
      vertexData[vertexDataOffset + 12] = modelMatrix[4];
      vertexData[vertexDataOffset + 13] = modelMatrix[5];

      vertexDataOffset += Var.ATTRIBUTES_PER_VERTEX;
   }
}

export function clearEntityInVertexData(vertexData: Float32Array, firstRenderPartIdx: number, numRenderParts: number): void {
   const vertexDataOffset = firstRenderPartIdx * Var.ATTRIBUTES_PER_VERTEX;
   vertexData.fill(0, vertexDataOffset, vertexDataOffset + numRenderParts * Var.ATTRIBUTES_PER_VERTEX - 1);
}

export function setupEntityRendering(): void {
   gl.useProgram(program);

   // Bind texture atlas
   const textureAtlas = getEntityTextureAtlas();
   gl.activeTexture(gl.TEXTURE0);
   gl.bindTexture(gl.TEXTURE_2D, textureAtlas.texture);
}

/** NOTE: Callers must control the blending. */
export function renderEntity(renderObject: Readonly<EntityRenderObject>): void {
   const numRenderParts = renderObject.renderPartsByZIndex.length;
   
   gl.bindVertexArray(renderObject.vao);
   gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0, numRenderParts);
}

export function cleanupEntityRendering(): void {
   gl.bindVertexArray(null);
}

export function setEntityRenderingOverrideAlphaWithOne(overrideAlphaWithOne: boolean): void {
   gl.uniform1f(overrideAlphaWithOneUniformLocation, overrideAlphaWithOne ? 1 : 0);
}
import { getEntityTextureAtlas } from "../texture-atlases/texture-atlases";
import { ATLAS_SLOT_SIZE } from "../texture-atlases/texture-atlas-stitching";
import { gl, halfWindowHeight, halfWindowWidth } from "../webgl";
import { getTechTreeGL } from "./webgl/tech-tree-rendering";
import { TEXTURE_SOURCES } from "../texture-atlases/texture-sources";
import { cameraPosition, cameraZoom } from "../camera";

export const enum UBOBindingIndex {
   CAMERA = 0,
   TIME = 1,
   ENTITY_TEXTURE_ATLAS = 2
}

export const UBO_NAME_RECORD: Record<UBOBindingIndex, string> = {
   [UBOBindingIndex.CAMERA]: "Camera",
   [UBOBindingIndex.TIME]: "Time",
   [UBOBindingIndex.ENTITY_TEXTURE_ATLAS]: "EntityTextureAtlas"
};

// This is in a function so that the ENTITY_TEXTURE_ATLAS_LENGTH value can wait until all the files register their texture sources
export function getEntityTextureAtlasUBO(): string {
   return `
   #define ATLAS_SLOT_SIZE ${ATLAS_SLOT_SIZE.toFixed(1)}

   // Entity Texture Atlas
   layout(std140) uniform ${UBO_NAME_RECORD[UBOBindingIndex.ENTITY_TEXTURE_ATLAS]} {
      // @Cleanup @Speed: might be better to premultiply this by ATLAS_SLOT_SIZE if it isn't used
      float u_atlasSize;
      // @Cleanup: Use a struct for these 2
      float u_textureSlotIndexes[${TEXTURE_SOURCES.length}];
      vec2 u_textureSizes[${TEXTURE_SOURCES.length}];
   };
   `;
}

const cameraData = new Float32Array(8);
let cameraBuffer: WebGLBuffer;   

// @Cleanup: Copy and paste
const cameraDataTechTree = new Float32Array(8);
let cameraBufferTechTree: WebGLBuffer;

const timeData = new Float32Array(4);
let timeBuffer: WebGLBuffer;

let entityTextureAtlasData: Float32Array;
let entityTextureAtlasBuffer: WebGLBuffer;

export function createUBOs(): void {
   // Camera uniform buffer
   cameraBuffer = gl.createBuffer()!;
   gl.bindBufferBase(gl.UNIFORM_BUFFER, UBOBindingIndex.CAMERA, cameraBuffer);
   gl.bufferData(gl.UNIFORM_BUFFER, cameraData.byteLength, gl.DYNAMIC_DRAW);

   // Time uniform buffer
   timeBuffer = gl.createBuffer()!;
   gl.bindBufferBase(gl.UNIFORM_BUFFER, UBOBindingIndex.TIME, timeBuffer);
   gl.bufferData(gl.UNIFORM_BUFFER, timeData.byteLength, gl.DYNAMIC_DRAW);

   // Camera uniform buffer (for the tech tree)
   {
      const gl = getTechTreeGL();
      cameraBufferTechTree = gl.createBuffer()!;
      gl.bindBufferBase(gl.UNIFORM_BUFFER, UBOBindingIndex.CAMERA, cameraBufferTechTree);
      gl.bufferData(gl.UNIFORM_BUFFER, cameraDataTechTree.byteLength, gl.DYNAMIC_DRAW);
   }

   // Entity texture atlas uniform buffer

   if (typeof entityTextureAtlasData === "undefined") {
      entityTextureAtlasData = new Float32Array(4 + TEXTURE_SOURCES.length * 8);
   }

   const textureAtlas = getEntityTextureAtlas();
   entityTextureAtlasData[0] = textureAtlas.atlasSize;
   for (let i = 0; i < TEXTURE_SOURCES.length; i++) {
      entityTextureAtlasData[4 + i * 4] = textureAtlas.textureSlotIndexes[i];
   }
   for (let i = 0; i < TEXTURE_SOURCES.length; i++) {
      entityTextureAtlasData[4 + TEXTURE_SOURCES.length * 4 + i * 4] = textureAtlas.textureWidths[i];
      entityTextureAtlasData[4 + TEXTURE_SOURCES.length * 4 + i * 4 + 1] = textureAtlas.textureHeights[i];
   }

   entityTextureAtlasBuffer = gl.createBuffer()!;
   gl.bindBufferBase(gl.UNIFORM_BUFFER, UBOBindingIndex.ENTITY_TEXTURE_ATLAS, entityTextureAtlasBuffer);
   gl.bufferData(gl.UNIFORM_BUFFER, entityTextureAtlasData, gl.STATIC_DRAW);
}

// @Speed
export function updateUBOs(): void {
   // @Speed: don't do these calls if the values haven't changed
   
   // Update the camera buffer
   if (cameraData[0] !== cameraPosition.x ||
       cameraData[1] !== cameraPosition.y ||
       cameraData[2] !== halfWindowWidth ||
       cameraData[3] !== halfWindowHeight ||
       cameraData[4] !== cameraZoom) {
      cameraData[0] = cameraPosition.x;
      cameraData[1] = cameraPosition.y;
      cameraData[2] = halfWindowWidth;
      cameraData[3] = halfWindowHeight;
      cameraData[4] = cameraZoom;
      gl.bindBuffer(gl.UNIFORM_BUFFER, cameraBuffer);
      gl.bufferSubData(gl.UNIFORM_BUFFER, 0, cameraData);

      {
         cameraDataTechTree[0] = cameraPosition.x;
         cameraDataTechTree[1] = cameraPosition.y;
         cameraDataTechTree[2] = halfWindowWidth;
         cameraDataTechTree[3] = halfWindowHeight;
         cameraDataTechTree[4] = cameraZoom;

         const gl = getTechTreeGL();
         gl.bindBuffer(gl.UNIFORM_BUFFER, cameraBufferTechTree);
         gl.bufferSubData(gl.UNIFORM_BUFFER, 0, cameraDataTechTree);
      }
   }

   // Update the time buffer
   // @Bug: Should be the same as the time used in other places
   timeData[0] = performance.now();
   gl.bindBuffer(gl.UNIFORM_BUFFER, timeBuffer);
   gl.bufferSubData(gl.UNIFORM_BUFFER, 0, timeData);
}

export function bindUBOToProgram(gl: WebGL2RenderingContext, program: WebGLProgram, bindingIndex: UBOBindingIndex): void {
   const name = UBO_NAME_RECORD[bindingIndex];
   const blockIndex = gl.getUniformBlockIndex(program, name);
   gl.uniformBlockBinding(program, blockIndex, bindingIndex);
}
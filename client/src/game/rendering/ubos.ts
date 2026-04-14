import { getEntityTextureAtlasInfo } from "../../texture-atlases";
import { gl, halfWindowHeight, halfWindowWidth } from "../webgl";
import { getTechTreeGL } from "./webgl/tech-tree-rendering";
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
   const textureAtlas = getEntityTextureAtlasInfo();
   const numTextures = textureAtlas.textureWidths.length;
   
   return `
   #define ATLAS_SLOT_SIZE ${textureAtlas.atlasSlotSize.toFixed(1)}

   // Entity Texture Atlas
   layout(std140) uniform ${UBO_NAME_RECORD[UBOBindingIndex.ENTITY_TEXTURE_ATLAS]} {
      // @Cleanup @Speed: might be better to premultiply this by ATLAS_SLOT_SIZE if it isn't used
      uint u_atlasSize;
      uvec4 u_textureSlotIndices[${Math.ceil(numTextures / 8)}];
      uvec4 u_textureSizes[${Math.ceil(numTextures / 4)}];
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

let entityTextureAtlasData: Uint32Array;
let entityTextureAtlasBuffer: WebGLBuffer;

export function createUBOs(): void {
   // Camera uniform buffer
   cameraBuffer = gl.createBuffer();
   gl.bindBufferBase(gl.UNIFORM_BUFFER, UBOBindingIndex.CAMERA, cameraBuffer);
   gl.bufferData(gl.UNIFORM_BUFFER, cameraData.byteLength, gl.DYNAMIC_DRAW);

   // Time uniform buffer
   timeBuffer = gl.createBuffer();
   gl.bindBufferBase(gl.UNIFORM_BUFFER, UBOBindingIndex.TIME, timeBuffer);
   gl.bufferData(gl.UNIFORM_BUFFER, timeData.byteLength, gl.DYNAMIC_DRAW);

   // Camera uniform buffer (for the tech tree)
   {
      const gl = getTechTreeGL();
      cameraBufferTechTree = gl.createBuffer();
      gl.bindBufferBase(gl.UNIFORM_BUFFER, UBOBindingIndex.CAMERA, cameraBufferTechTree);
      gl.bufferData(gl.UNIFORM_BUFFER, cameraDataTechTree.byteLength, gl.DYNAMIC_DRAW);
   }

   // 
   // Entity texture atlas uniform buffer
   // 

   // @Memory: Could pack even tighter if I fit into one 32-bit uint instead of effectively 48 bits of data per. 9 bits for width, 9 bits for height, 14 for slot index. That would also be far faster to fill with the initial data

   const textureAtlas = getEntityTextureAtlasInfo();
   const textureSources = textureAtlas.textureSources;

   if (entityTextureAtlasData === undefined) {
      entityTextureAtlasData = new Uint32Array(4 + Math.ceil(textureSources.length / 8) * 4 + Math.ceil(textureSources.length / 4) * 4);
   }

   let offset = 0;

   entityTextureAtlasData[offset] = textureAtlas.atlasSize;

   offset += 4;

   for (let i = 0; i < textureSources.length / 8; i++) {
      const iOffset = i * 8;

      entityTextureAtlasData[offset] = textureAtlas.textureSlotIndexes[iOffset] | textureAtlas.textureSlotIndexes[iOffset + 1] << 16;
      entityTextureAtlasData[offset + 1] = textureAtlas.textureSlotIndexes[iOffset + 2] | textureAtlas.textureSlotIndexes[iOffset + 3] << 16;
      entityTextureAtlasData[offset + 2] = textureAtlas.textureSlotIndexes[iOffset + 4] | textureAtlas.textureSlotIndexes[iOffset + 5] << 16;
      entityTextureAtlasData[offset + 3] = textureAtlas.textureSlotIndexes[iOffset + 6] | textureAtlas.textureSlotIndexes[iOffset + 7] << 16;
      offset += 4;
   }

   for (let i = 0; i < textureSources.length / 4; i++) {
      const iOffset = i * 4;
      
      entityTextureAtlasData[offset] = textureAtlas.textureWidths[iOffset] | textureAtlas.textureHeights[iOffset] << 16;
      entityTextureAtlasData[offset + 1] = textureAtlas.textureWidths[iOffset + 1] | textureAtlas.textureHeights[iOffset + 1] << 16;
      entityTextureAtlasData[offset + 2] = textureAtlas.textureWidths[iOffset + 2] | textureAtlas.textureHeights[iOffset + 2] << 16;
      entityTextureAtlasData[offset + 3] = textureAtlas.textureWidths[iOffset + 3] | textureAtlas.textureHeights[iOffset + 3] << 16;
      offset += 4;
   }

   entityTextureAtlasBuffer = gl.createBuffer();
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

      cameraDataTechTree[0] = cameraPosition.x;
      cameraDataTechTree[1] = cameraPosition.y;
      cameraDataTechTree[2] = halfWindowWidth;
      cameraDataTechTree[3] = halfWindowHeight;
      cameraDataTechTree[4] = cameraZoom;

      const techTreeGL = getTechTreeGL();
      techTreeGL.bindBuffer(techTreeGL.UNIFORM_BUFFER, cameraBufferTechTree);
      techTreeGL.bufferSubData(techTreeGL.UNIFORM_BUFFER, 0, cameraDataTechTree);
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
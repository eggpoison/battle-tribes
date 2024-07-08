import Camera from "../Camera";
import { ENTITY_TEXTURE_ATLAS_LENGTH, getEntityTextureAtlas } from "../texture-atlases/texture-atlases";
import { ATLAS_SLOT_SIZE } from "../texture-atlases/texture-atlas-stitching";
import { gl, halfWindowHeight, halfWindowWidth } from "../webgl";
import { getTechTreeGL } from "./webgl/tech-tree-rendering";

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

export const ENTITY_TEXTURE_ATLAS_UBO = `
#define ATLAS_SLOT_SIZE ${ATLAS_SLOT_SIZE.toFixed(1)}

// Entity Texture Atlas
layout(std140) uniform ${UBO_NAME_RECORD[UBOBindingIndex.ENTITY_TEXTURE_ATLAS]} {
   // @Cleanup @Speed: might be better to premultiply this by ATLAS_SLOT_SIZE if it isn't used
   float u_atlasSize;
   // @Cleanup: Use a struct for these 2
   float u_textureSlotIndexes[${ENTITY_TEXTURE_ATLAS_LENGTH}];
   vec2 u_textureSizes[${ENTITY_TEXTURE_ATLAS_LENGTH}];
};
`;

const cameraData = new Float32Array(8);
let cameraBuffer: WebGLBuffer;

// @Cleanup: Copy and paste
const cameraDataTechTree = new Float32Array(8);
let cameraBufferTechTree: WebGLBuffer;

const timeData = new Float32Array(4);
let timeBuffer: WebGLBuffer;

const entityTextureAtlasData = new Float32Array(4 + ENTITY_TEXTURE_ATLAS_LENGTH * 8);
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
   entityTextureAtlasBuffer = gl.createBuffer()!;
   gl.bindBufferBase(gl.UNIFORM_BUFFER, UBOBindingIndex.ENTITY_TEXTURE_ATLAS, entityTextureAtlasBuffer);
   gl.bufferData(gl.UNIFORM_BUFFER, entityTextureAtlasData.byteLength, gl.DYNAMIC_DRAW);
}

export function updateUBOs(): void {
   // Update the camera buffer
   cameraData[0] = Camera.position.x;
   cameraData[1] = Camera.position.y;
   cameraData[2] = halfWindowWidth;
   cameraData[3] = halfWindowHeight;
   cameraData[4] = Camera.zoom;
   gl.bindBuffer(gl.UNIFORM_BUFFER, cameraBuffer);
   gl.bufferSubData(gl.UNIFORM_BUFFER, 0, cameraData);

   // Update the time buffer
   timeData[0] = performance.now();
   gl.bindBuffer(gl.UNIFORM_BUFFER, timeBuffer);
   gl.bufferSubData(gl.UNIFORM_BUFFER, 0, timeData);

   {
      cameraDataTechTree[0] = Camera.position.x;
      cameraDataTechTree[1] = Camera.position.y;
      cameraDataTechTree[2] = halfWindowWidth;
      cameraDataTechTree[3] = halfWindowHeight;
      cameraDataTechTree[4] = Camera.zoom;

      const gl = getTechTreeGL();
      gl.bindBuffer(gl.UNIFORM_BUFFER, cameraBufferTechTree);
      gl.bufferSubData(gl.UNIFORM_BUFFER, 0, cameraDataTechTree);
   }

   // Update the entity texture atlas buffer
   {
      const textureAtlas = getEntityTextureAtlas();
      entityTextureAtlasData[0] = textureAtlas.atlasSize;
      for (let i = 0; i < ENTITY_TEXTURE_ATLAS_LENGTH; i++) {
         entityTextureAtlasData[4 + i * 4] = textureAtlas.textureSlotIndexes[i];
      }
      for (let i = 0; i < ENTITY_TEXTURE_ATLAS_LENGTH; i++) {
         entityTextureAtlasData[4 + ENTITY_TEXTURE_ATLAS_LENGTH * 4 + i * 4] = textureAtlas.textureWidths[i];
         entityTextureAtlasData[4 + ENTITY_TEXTURE_ATLAS_LENGTH * 4 + i * 4 + 1] = textureAtlas.textureHeights[i];
      }
      
      gl.bindBuffer(gl.UNIFORM_BUFFER, entityTextureAtlasBuffer);
      gl.bufferSubData(gl.UNIFORM_BUFFER, 0, entityTextureAtlasData);
   }
}

export function bindUBOToProgram(gl: WebGL2RenderingContext, program: WebGLProgram, bindingIndex: UBOBindingIndex): void {
   const name = UBO_NAME_RECORD[bindingIndex];
   const blockIndex = gl.getUniformBlockIndex(program, name);
   gl.uniformBlockBinding(program, blockIndex, bindingIndex);
}
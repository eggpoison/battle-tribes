import { getTechTreeGL } from "../rendering/webgl/tech-tree-rendering";
import { gl } from "../webgl";
import { TextureAtlasInfo, generateTextureAtlas, stitchTextureAtlas } from "./texture-atlas-stitching";
import { TEXTURE_SOURCES } from "./texture-sources";

let ENTITY_TEXTURE_ATLAS: TextureAtlasInfo;
let TECH_TREE_ENTITY_TEXTURE_ATLAS: TextureAtlasInfo;

export async function createTextureAtlases(): Promise<void> {
   const entityTextureAtlasGenerationInfo = await generateTextureAtlas(TEXTURE_SOURCES);
   Object.freeze(TEXTURE_SOURCES); // Ensure that no further textures are attempted to be registered
   
   ENTITY_TEXTURE_ATLAS = stitchTextureAtlas(entityTextureAtlasGenerationInfo, gl);
   TECH_TREE_ENTITY_TEXTURE_ATLAS = stitchTextureAtlas(entityTextureAtlasGenerationInfo, getTechTreeGL());
}

export function getTextureArrayIndex(textureSource: string): number {
   const textureIndex = TEXTURE_SOURCES.indexOf(textureSource);
   if (textureIndex === -1) {
      throw new Error(`Texture source '${textureSource}' does not exist in the TEXTURE_SOURCES array.`);
   }
   return textureIndex;
}

export function getEntityTextureAtlas(): TextureAtlasInfo {
   return ENTITY_TEXTURE_ATLAS;
}

export function getTechTreeEntityTextureAtlas(): TextureAtlasInfo {
   return TECH_TREE_ENTITY_TEXTURE_ATLAS;
}
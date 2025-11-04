import CLIENT_ITEM_INFO_RECORD from "../client-item-info";
import { BLUEPRINT_PROGRESS_TEXTURE_SOURCES } from "../entity-components/server-components/BlueprintComponent";
import { getTechTreeGL } from "../rendering/webgl/tech-tree-rendering";
import { gl } from "../webgl";
import { TextureAtlasInfo, generateTextureAtlas, stitchTextureAtlas } from "./texture-atlas-stitching";
import { registerTextureSource, TEXTURE_SOURCES } from "./texture-sources";

// Add item textures to entity textures
for (const clientItemInfo of Object.values(CLIENT_ITEM_INFO_RECORD)) {
   registerTextureSource(clientItemInfo.entityTextureSource);

   // Add tool item textures
   if (clientItemInfo.toolTextureSource !== "") {
      registerTextureSource(clientItemInfo.toolTextureSource);
   }
}

// Add partial blueprint textures
for (const progressTextureInfoArray of Object.values(BLUEPRINT_PROGRESS_TEXTURE_SOURCES)) {
   for (const progressTextureInfo of progressTextureInfoArray) {
      for (const textureSource of progressTextureInfo.progressTextureSources) {
         registerTextureSource(textureSource);
      }
   }
}

let ENTITY_TEXTURE_ATLAS: TextureAtlasInfo;
let TECH_TREE_ENTITY_TEXTURE_ATLAS: TextureAtlasInfo;

export async function createTextureAtlases(): Promise<void> {
   const entityTextureAtlasGenerationInfo = await generateTextureAtlas(TEXTURE_SOURCES);
   
   ENTITY_TEXTURE_ATLAS = stitchTextureAtlas(entityTextureAtlasGenerationInfo, gl)
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
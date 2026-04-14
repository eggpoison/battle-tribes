import { gl } from "./game/webgl";

export interface TextureAtlas {
   readonly atlasSize: number;
   readonly textureSources: Array<string>;
   readonly textureWidths: Array<number>;
   readonly textureHeights: Array<number>;
   readonly textureSlotIndexes: Array<number>;
   readonly atlasSlotSize: number;
}

let textureAtlasInfo: TextureAtlas;

let entityTextureAtlasTexture: WebGLTexture;
let techTreeEntityTextureAtlasTexture: WebGLTexture;

export async function loadTextureAtlas(): Promise<void> {
   const [atlasMetadata, atlasImage] = await Promise.all([
      fetch("/atlas-meta.json").then(res => res.json()),
      new Promise<HTMLImageElement>(resolve => {
         const img = new Image();
         img.src = "/atlas.png";
         img.onload = () => resolve(img);
         
         // Uncomment to see the texture atlas visually :D
         // document.body.appendChild(img);
         // img.style.position = "absolute";
      })
   ]);

   textureAtlasInfo = atlasMetadata;

   const canvas = document.createElement("canvas");
   canvas.width = atlasImage.width;
   canvas.height = atlasImage.height;

   entityTextureAtlasTexture = gl.createTexture();
   gl.bindTexture(gl.TEXTURE_2D, entityTextureAtlasTexture);
   // Set parameters
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
   gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlasImage);
   gl.bindTexture(gl.TEXTURE_2D, null);
}

export function getEntityTextureAtlasInfo(): TextureAtlas {
   return textureAtlasInfo;
}

export function getTextureArrayIndex(textureSource: string): number {
   const textureIndex = textureAtlasInfo.textureSources.indexOf(textureSource);
   if (textureIndex === -1) {
      throw new Error(`Texture source '${textureSource}' does not exist in the TEXTURE_SOURCES array.`);
   }
   return textureIndex;
}

export function getEntityTextureAtlas(): WebGLTexture {
   return entityTextureAtlasTexture;
}

export function getTechTreeEntityTextureAtlas(): WebGLTexture {
   return techTreeEntityTextureAtlasTexture;
}
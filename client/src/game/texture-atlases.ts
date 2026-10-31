import { gl } from "./webgl";

// @COPYNPASTE!!! From vite-plugin-texture-atlas
export interface TextureAtlasMetadata {
   readonly atlasSize: number;
   /** The widths of all inputted textures, in the original order */
   readonly textureWidths: number[];
   /** The heights of all inputted textures, in the original order */
   readonly textureHeights: number[];
   /** The indexes of all inputted textures in the texture atlas */
   readonly textureSlotIndexes: number[];
   /** Number of textures inside the atlas */
   readonly numTextures: number;
   readonly atlasSlotSize: number;
}

let textureAtlasInfo: TextureAtlasMetadata;

let entityTextureAtlasTexture: WebGLTexture;
let techTreeEntityTextureAtlasTexture: WebGLTexture;

export async function loadTextureAtlas(): Promise<void> {
   const [atlasMetadata, atlasImage] = await Promise.all([
      fetch("/atlas-meta.json").then(res => res.json()),
      new Promise<HTMLImageElement>(resolve => {
         const img = new Image();
         img.src = "atlas.png";
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

export function getEntityTextureAtlasInfo(): TextureAtlasMetadata {
   return textureAtlasInfo;
}

export function getEntityTextureAtlas(): WebGLTexture {
   return entityTextureAtlasTexture;
}

export function getTechTreeEntityTextureAtlas(): WebGLTexture {
   return techTreeEntityTextureAtlasTexture;
}
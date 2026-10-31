import { assert } from "../../../shared/src/utils";
import { gl } from "./webgl";
import { imageIsLoaded } from "./utils";

export interface TextureInfoCollection {
   readonly textureImageRecord: Record<string, HTMLImageElement>;
   readonly textureRecord: Record<string, WebGLTexture>;
}

export async function loadTextures(): Promise<TextureInfoCollection> {
   const textureSources = import.meta.glob([
      "/src/images/tiles/*",
      "/src/images/miscellaneous/river/*",
      "/src/images/miscellaneous/particle-texture-atlas.png",
      "/src/images/miscellaneous/gravel-noise-texture.png",
      "/src/images/miscellaneous/tile-break-progress-1.png",
      "/src/images/miscellaneous/tile-break-progress-2.png",
      // @SPEED: Don't want this is production...
      "/src/images/debug/spring.png"
   ], { eager: true, query: "?url", import: "default" });

   // Preload all the texture images
   // @INCOMPLETE: This isn't actually doing anything, as there is no work between...
   const textureImageRecord: Record<string, HTMLImageElement> = {};
   for (const [textureSource, src] of Object.entries(textureSources)) {
      assert(typeof src === "string");
      
      const image = new Image();
      image.src = src;
      textureImageRecord[textureSource] = image;
   }

   // Create textures
   const textureRecord: Record<string, WebGLTexture> = {};
   for (const textureSource of Object.keys(textureSources)) {
      const image = textureImageRecord[textureSource];
      if (image.width === 0) {
         console.warn("Have to wait for texture in loadTextures!!!! Need to add more padding time in-between.");
         await imageIsLoaded(image);
      }
      
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);

      // Set parameters
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.bindTexture(gl.TEXTURE_2D, null);

      textureRecord[textureSource] = texture;
   }

   return {
      textureImageRecord,
      textureRecord
   };
}

export function getTextureImage(textureInfoCollection: TextureInfoCollection, textureSource: string): HTMLImageElement {
   assert(textureInfoCollection.textureImageRecord["/src/images/" + textureSource]);
   return textureInfoCollection.textureImageRecord["/src/images/" + textureSource];
}

export function getTexture(textureInfoCollection: TextureInfoCollection, textureSource: string): WebGLTexture {
   assert(textureInfoCollection.textureRecord["/src/images/" + textureSource]);
   return textureInfoCollection.textureRecord["/src/images/" + textureSource];
}
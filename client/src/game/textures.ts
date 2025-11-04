import { gl } from "./webgl";
import { imageIsLoaded } from "./utils";
import { FLOOR_TILE_TEXTURE_SOURCE_RECORD, WALL_TILE_TEXTURE_SOURCE_RECORD } from "./rendering/webgl/solid-tile-rendering";
import { BREAK_PROGRESS_TEXTURE_SOURCES } from "./rendering/webgl/tile-break-progress-rendering";

let TEXTURES: { [key: string]: WebGLTexture } = {};

const TEXTURE_SOURCES: Array<string> = [
   "miscellaneous/river/gravel.png",
   "miscellaneous/river/water-rock-large.png",
   "miscellaneous/river/water-rock-small.png",
   "miscellaneous/river/water-base.png",
   "miscellaneous/river/water-noise.png",
   "miscellaneous/river/water-foam.png",
   "miscellaneous/river/river-bed-highlights-1.png",
   "miscellaneous/river/river-bed-highlights-2.png",
   "miscellaneous/river/river-bed-highlights-3.png",
   "miscellaneous/particle-texture-atlas.png",
   "miscellaneous/gravel-noise-texture.png",
   // @Temporary
   "tiles/dirt2.png",
   "debug/spring.png"
];

// @Hack. remove
export const TEXTURE_IMAGE_RECORD: Record<string, HTMLImageElement> = {};

export function createImage(imageSrc: string): Promise<HTMLImageElement> {
   return new Promise(async resolve => {
      const image = new Image();
      image.src = require("./images/" + imageSrc);
      
      await imageIsLoaded(image).then(() => {
         resolve(image);
      });
   })
}

export function preloadTextureImages(): Array<HTMLImageElement> {
   // Add floor tile textures
   for (const textureSource of Object.values(FLOOR_TILE_TEXTURE_SOURCE_RECORD)) {
      if (textureSource !== null && !TEXTURE_SOURCES.includes(textureSource)) {
         TEXTURE_SOURCES.push(textureSource);
      }
   }
   for (const textureSources of Object.values(WALL_TILE_TEXTURE_SOURCE_RECORD)) {
      for (const textureSource of textureSources) {
         if (!TEXTURE_SOURCES.includes(textureSource)) {
            TEXTURE_SOURCES.push(textureSource);
         }
      }
   }
   for (const textureSource of BREAK_PROGRESS_TEXTURE_SOURCES) {
      if (!TEXTURE_SOURCES.includes(textureSource)) {
         TEXTURE_SOURCES.push(textureSource);
      }
   }

   const images = new Array<HTMLImageElement>();
   for (let i = 0; i < TEXTURE_SOURCES.length; i++) {
      const textureSource = TEXTURE_SOURCES[i];
      const image = new Image();
      image.src = require("./images/" + textureSource);
      images.push(image);
   }
   return images;
} 

export async function loadTextures(textureImages: Array<HTMLImageElement>): Promise<void> {
   // Create textures after all images are loaded
   for (let i = 0; i < textureImages.length; i++) {
      const image = textureImages[i];
      if (image.width === 0) {
         console.warn("Have to wait for texture in loadTextures!!!! Need to add more padding time in-between.");
         await imageIsLoaded(image);
      }
      
      const textureSource = TEXTURE_SOURCES[i];
      
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);

      // Set parameters
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.bindTexture(gl.TEXTURE_2D, null);

      TEXTURES[textureSource] = texture;
      TEXTURE_IMAGE_RECORD[textureSource] = image;
   }
}

export function getTexture(textureSource: string): WebGLTexture {
   if (!TEXTURES.hasOwnProperty(textureSource)) {
      throw new Error(`Couldn't find texture with source '${textureSource}'`);
   }
   return TEXTURES[textureSource];
}
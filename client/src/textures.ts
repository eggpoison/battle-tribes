import { gl } from "./webgl";
import { imageIsLoaded } from "./utils";
import { TILE_TYPE_TEXTURE_SOURCES } from "./tile-type-texture-sources";

let TEXTURES: { [key: string]: WebGLTexture } = {};

const TEXTURE_SOURCES: Array<string> = [
   "miscellaneous/river/gravel.png",
   "miscellaneous/river/water-rock-large.png",
   "miscellaneous/river/water-rock-small.png",
   "miscellaneous/river/river-stepping-stone-small.png",
   "miscellaneous/river/river-stepping-stone-medium.png",
   "miscellaneous/river/river-stepping-stone-large.png",
   "miscellaneous/river/water-base.png",
   "miscellaneous/river/water-noise.png",
   "miscellaneous/river/water-foam.png",
   "miscellaneous/river/river-bed-highlights-1.png",
   "miscellaneous/river/river-bed-highlights-2.png",
   "miscellaneous/river/river-bed-highlights-3.png",
   "miscellaneous/particle-texture-atlas.png",
   "miscellaneous/gravel-noise-texture.png"
];

export const TEXTURE_IMAGE_RECORD: Record<string, HTMLImageElement> = {};

export function loadTextures(): Promise<void> {
   return new Promise(async resolve => {
      // Add solid tile textures
      for (const textureSource of TILE_TYPE_TEXTURE_SOURCES) {
         if (!TEXTURE_SOURCES.includes(textureSource)) {
            TEXTURE_SOURCES.push(textureSource);
         }
      }

      for (const textureSource of TEXTURE_SOURCES) {
         // Load the image
         const image = new Image();
         image.src = require("./images/" + textureSource);

         // Create texture from the image once it is loaded
         await imageIsLoaded(image).then(() => {
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
         });

         TEXTURE_IMAGE_RECORD[textureSource] = image;
      }
      
      resolve();
   });
}

export function getTexture(textureSource: string): WebGLTexture {
   if (!TEXTURES.hasOwnProperty(textureSource)) {
      throw new Error(`Couldn't find texture with source '${textureSource}'`);
   }
   return TEXTURES[textureSource];
}
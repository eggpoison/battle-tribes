import { imageIsLoaded } from "../utils";
import { gl } from "../webgl";

export const ATLAS_SLOT_SIZE = 16;

let unavailableSlots: Array<number>;
let textureSlotIndexes: Array<number>;

/** Attempts to find an available space for a texture, returning -1 if no available space can be found. */
const getAvailableSlotIndex = (slotWidth: number, slotHeight: number, atlasSize: number): number => {
   for (let x = 0; x <= atlasSize - slotWidth; x++) {
      for (let y = 0; y <= atlasSize - slotHeight; y++) {
         // Check availability
         let isAvailable = true;
         for (let cx = x; cx < x + slotWidth; cx++) {
            for (let cy = y; cy < y + slotHeight; cy++) {
               const slotIndex = cy * atlasSize + cx;
               if (unavailableSlots.includes(slotIndex)) {
                  isAvailable = false;
                  break;
               }
            }
         }

         if (isAvailable) {
            return y * atlasSize + x;
         }
      }
   }
   
   return -1;
}

const expand = (atlasSize: number): void => {
   const newAtlasSize = atlasSize + 1;

   // Remap all previous available slots
   const newSlots = new Array<number>();
   for (const slotIndex of unavailableSlots) {
      const width = slotIndex % atlasSize;
      const height = Math.floor(slotIndex / atlasSize);
      newSlots.push(height * newAtlasSize + width);
   }
   unavailableSlots = newSlots;

   // Remap texture slot indexes
   const newIndexes = new Array<number>();
   for (const slotIndex of textureSlotIndexes) {
      const width = slotIndex % atlasSize;
      const height = Math.floor(slotIndex / atlasSize);
      newIndexes.push(height * newAtlasSize + width);
   }
   textureSlotIndexes = newIndexes;
}

export interface TextureAtlasInfo {
   /** The texture atlas */
   readonly texture: WebGLTexture;
   readonly atlasSize: number;
   /** The widths of all inputted textures, in the original order */
   readonly textureWidths: Array<number>;
   /** The heights of all inputted textures, in the original order */
   readonly textureHeights: Array<number>;
   /** The indexes of all inputted textures in the texture atlas */
   readonly textureSlotIndexes: Array<number>;
}

export async function stitchTextureAtlas(textureSources: ReadonlyArray<string>): Promise<TextureAtlasInfo> {
   return new Promise(async (resolve) => {
      unavailableSlots = [];
      textureSlotIndexes = [];

      const textureWidths = new Array<number>();
      const textureHeights = new Array<number>();
      
      let atlasSize = 1;
      
      const atlasElement = document.createElement("canvas");
      atlasElement.width = ATLAS_SLOT_SIZE;
      atlasElement.height = ATLAS_SLOT_SIZE;
      const context = atlasElement.getContext("2d")!;
   
      // Uncomment to see the texture atlas visually :D
      // document.body.appendChild(atlasElement);
      // atlasElement.style.position = "absolute";
   
      let textureImages = new Array<HTMLImageElement>();
      
      for (let i = 0; i < textureSources.length; i++) {
         const textureSource = textureSources[i];
         textureImages[i] = new Image();
         textureImages[i].src = require("../images/" + textureSource);
   
         // eslint-disable-next-line no-loop-func
         await imageIsLoaded(textureImages[i]).then(() => {
            const slotWidth = Math.ceil(textureImages[i].width / ATLAS_SLOT_SIZE);
            const slotHeight = Math.ceil(textureImages[i].height / ATLAS_SLOT_SIZE);
   
            textureWidths.push(textureImages[i].width);
            textureHeights.push(textureImages[i].height);
   
            let slotIndex = getAvailableSlotIndex(slotWidth, slotHeight, atlasSize);
            for (; slotIndex === -1; slotIndex = getAvailableSlotIndex(slotWidth, slotHeight, atlasSize)) {
               expand(atlasSize);
               atlasSize++;
               atlasElement.width = ATLAS_SLOT_SIZE * atlasSize;
               atlasElement.height = ATLAS_SLOT_SIZE * atlasSize;
            }
   
            textureSlotIndexes.push(slotIndex);
   
            // Add to unavailable slots
            const x = slotIndex % atlasSize;
            const y = Math.floor(slotIndex / atlasSize);
            for (let cx = x; cx < x + slotWidth; cx++) {
               for (let cy = y; cy < y + slotHeight; cy++) {
                  unavailableSlots.push(cy * atlasSize + cx);
               }
            }
         });
      }
   
      // Draw textures once the atlas has been fully expanded
      for (let i = 0; i < textureSources.length; i++) {
         const slotIndex = textureSlotIndexes[i];
         const x = (slotIndex % atlasSize) * ATLAS_SLOT_SIZE;
         const y = Math.floor(slotIndex / atlasSize) * ATLAS_SLOT_SIZE;
         
         const image = textureImages[i];
         const width = textureWidths[i];
         const height = textureHeights[i];
         context.drawImage(image, x, y, width, height);
      }
   
      // Make atlas image into texture
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      // Set parameters
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlasElement);
      gl.bindTexture(gl.TEXTURE_2D, null);

      resolve({
         texture: texture,
         atlasSize: atlasSize,
         textureWidths: textureWidths,
         textureHeights: textureHeights,
         textureSlotIndexes: textureSlotIndexes
      });
   });
}
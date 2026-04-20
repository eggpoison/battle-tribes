import { Plugin } from "vite";
import { createCanvas, loadImage, Image } from "canvas";
import fs, { Dirent } from "node:fs";
import path from "node:path";

// @Incomplete
interface BaseTextureAtlasInfo {
   readonly atlasSize: number;
   /** The widths of all inputted textures, in the original order */
   readonly textureWidths: Array<number>;
   /** The heights of all inputted textures, in the original order */
   readonly textureHeights: Array<number>;
   /** The indexes of all inputted textures in the texture atlas */
   readonly textureSlotIndexes: Array<number>;
   /** Number of textures inside the atlas */
   readonly numTextures: number;
   readonly atlasSlotSize: number;
}

const ATLAS_SLOT_SIZE = 16;

let unavailableSlots = new Set<number>();
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
               if (unavailableSlots.has(slotIndex)) {
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

// @SPEED
const expand = (atlasSize: number): void => {
   const newAtlasSize = atlasSize + 1;

   // Remap all previous available slots
   const newSlots = new Set<number>();
   for (const slotIndex of unavailableSlots) {
      const width = slotIndex % atlasSize;
      const height = Math.floor(slotIndex / atlasSize);
      newSlots.add(height * newAtlasSize + width);
   }
   unavailableSlots = newSlots;

   // Remap texture slot indexes
   const newIndexes: Array<number> = [];
   for (const slotIndex of textureSlotIndexes) {
      const width = slotIndex % atlasSize;
      const height = Math.floor(slotIndex / atlasSize);
      newIndexes.push(height * newAtlasSize + width);
   }
   textureSlotIndexes = newIndexes;
}

export default function TextureAtlasStitchingPlugin(): Plugin {
   return {
      name: "texture-atlas-stitching",
      enforce: "pre",
      async buildStart() {
         const srcDir = path.resolve("src/images");
         const outDir = path.resolve("public");

         const files = new Array<Dirent<string>>();
         const includedSubdirs = ["entities", "items", "armour", "gloves", "decorations"];

         for (const subdirectory of includedSubdirs) {
            const subdirFiles = fs.readdirSync(path.join(srcDir, subdirectory), { recursive: true, withFileTypes: true })
            for (const file of subdirFiles) {
               if (!file.isDirectory()) {
                  files.push(file);
               }
            }
         }

         const imageLoadResults = await Promise.allSettled(
            files.map(async file =>
               loadImage(path.join(file.parentPath, file.name))
            )
         );

         const imageFiles: Array<Dirent<string>> = [];
         const textureImages: Array<Image> = [];
         for (let i = 0; i < imageLoadResults.length; i++) {
            const result = imageLoadResults[i];
            if (result.status === "rejected") {
               const file = files[i];
               console.log(`[texture-atlas] File failed to load: ${file.name}`);
            } else {
               imageFiles.push(files[i]);
               textureImages.push(result.value);
            }
         }

         unavailableSlots.clear();
         textureSlotIndexes = [];

         const textureWidths: Array<number> = [];
         const textureHeights: Array<number> = [];
         
         let atlasSize = 1;
         
         const canvas = createCanvas(ATLAS_SLOT_SIZE, ATLAS_SLOT_SIZE);
         const ctx = canvas.getContext("2d")!;
         
         for (const image of textureImages) {
            const slotWidth = Math.ceil(image.width / ATLAS_SLOT_SIZE);
            const slotHeight = Math.ceil(image.height / ATLAS_SLOT_SIZE);

            textureWidths.push(image.width);
            textureHeights.push(image.height);

            let slotIndex = getAvailableSlotIndex(slotWidth, slotHeight, atlasSize);
            for (; slotIndex === -1; slotIndex = getAvailableSlotIndex(slotWidth, slotHeight, atlasSize)) {
               expand(atlasSize);
               atlasSize++;
               canvas.width = ATLAS_SLOT_SIZE * atlasSize;
               canvas.height = ATLAS_SLOT_SIZE * atlasSize;
            }

            textureSlotIndexes.push(slotIndex);

            // Add to unavailable slots
            const x = slotIndex % atlasSize;
            const y = Math.floor(slotIndex / atlasSize);
            for (let cy = y; cy < y + slotHeight; cy++) {
               for (let cx = x; cx < x + slotWidth; cx++) {
                  unavailableSlots.add(cy * atlasSize + cx);
               }
            }
         }

         // Draw textures once the atlas has been fully expanded
         for (let i = 0; i < textureImages.length; i++) {
            const image = textureImages[i];

            const height = image.height;

            const slotIndex = textureSlotIndexes[i];
            const x = (slotIndex % atlasSize) * ATLAS_SLOT_SIZE;
            const y = (atlasSize - Math.floor(slotIndex / atlasSize)) * ATLAS_SLOT_SIZE - height;
            ctx.drawImage(image, x, y, image.width, height);
         }

         // Write atlas image
         const pngBuffer = canvas.toBuffer("image/png");
         fs.writeFileSync(path.join(outDir, "atlas.png"), pngBuffer);

         // Write metadata json
         const meta = {
            atlasSize: atlasSize,
            textureSources: imageFiles.map(file => path.relative(srcDir, path.join(file.parentPath, file.name))),
            textureWidths: textureWidths,
            textureHeights: textureHeights,
            textureSlotIndexes: textureSlotIndexes,
            atlasSlotSize: ATLAS_SLOT_SIZE
         };
         fs.writeFileSync(path.join(outDir, "atlas-meta.json"), JSON.stringify(meta));

         console.log(`[texture-atlas] Built atlas: ${canvas.width}x${canvas.height}, ${textureImages.length} sprites`);
      }
   };
}
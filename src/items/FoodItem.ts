import Board from "../Board";
import Entity, { RenderLayer } from "../entities/Entity";
import HealthComponent from "../entity-components/HealthComponent";
import InventoryComponent from "../entity-components/inventory/InventoryComponent";
import TransformComponent from "../entity-components/TransformComponent";
import Game from "../Game";
import Particle from "../particles/Particle";
import SETTINGS from "../settings";
import { randFloat, randInt, randItem, Vector, Vector3 } from "../utils";
import Item, { ItemInfo } from "./Item";
import ITEMS from "./items";

const IMAGE_SLICE_COUNT = 10;

const IMAGE_SLICES: Partial<Record<string, Array<HTMLImageElement>>> = {};

const imageIsLoaded = (image: HTMLImageElement): Promise<boolean> => {
   return new Promise(resolve => {
      image.addEventListener("load", () => {
         resolve(true);
      });
   })
}

const createImageSlices = (imageSrc: string): Promise<Array<HTMLImageElement>> => {
   return new Promise(async resolve => {
      const imageSlices = new Array<HTMLImageElement>();

      const IMAGE_SIZE = 128;

      for (let i = 0; i < IMAGE_SLICE_COUNT; i++) {
         const tempCanvas = document.createElement("canvas");
         tempCanvas.width = IMAGE_SIZE;
         tempCanvas.height = IMAGE_SIZE;
      
         const image = new Image(IMAGE_SIZE, IMAGE_SIZE);
         
         image.src = require("../images/" + imageSrc);

         await imageIsLoaded(image).then(() => {
            const ctx = tempCanvas.getContext("2d")!;
            ctx.drawImage(image, 0, 0, IMAGE_SIZE, IMAGE_SIZE);

            const imageData = ctx.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE);
            
            const SLICE_WIDTH = randInt(32, 96);
            const SLICE_HEIGHT = randInt(32, 96);

            const SLICE_X_OFFSET = randInt(0, IMAGE_SIZE - SLICE_WIDTH);
            const SLICE_Y_OFFSET = randInt(0, IMAGE_SIZE - SLICE_HEIGHT);

            const sliceImageData = ctx.createImageData(SLICE_WIDTH, SLICE_HEIGHT);
            for (let sliceX = 0; sliceX <= SLICE_WIDTH; sliceX++) {
               for (let sliceY = 0; sliceY <= SLICE_HEIGHT; sliceY++) {
                  const imageX = sliceX + SLICE_X_OFFSET;
                  const imageY = sliceY + SLICE_Y_OFFSET;

                  const sliceStartIdx = (sliceY * SLICE_WIDTH + sliceX) * 4;
                  const startIdx = (imageY * IMAGE_SIZE + imageX) * 4;
                  for (let idxOffset = 0; idxOffset < 4; idxOffset++) {
                     sliceImageData.data[sliceStartIdx + idxOffset] = imageData.data[startIdx + idxOffset];
                  }
               }
            }

            const sliceCanvas = document.createElement("canvas");
            sliceCanvas.width = SLICE_WIDTH;
            sliceCanvas.height = SLICE_HEIGHT;

            const sliceCtx = sliceCanvas.getContext("2d")!;
            sliceCtx.putImageData(sliceImageData, 0, 0);

            const sliceImage = new Image(SLICE_WIDTH, SLICE_HEIGHT);
            sliceImage.src = sliceCanvas.toDataURL();

            imageSlices.push(sliceImage);
         });
      }

      resolve(imageSlices);
   });
}

interface FoodItemInfo extends ItemInfo {
   /** Amount of entity health restored by eating. */
   readonly healthRestoreAmount: number;
   /** The time it takes to eat one of the food, in seconds. */
   readonly eatTime: number;
}

class FoodItem extends Item implements FoodItemInfo {
   public readonly healthRestoreAmount: number;
   public readonly eatTime: number;
   
   constructor(itemInfo: FoodItemInfo) {
      super(itemInfo);

      this.healthRestoreAmount = itemInfo.healthRestoreAmount;
      this.eatTime = itemInfo.eatTime;
   }

   public async duringRightClick(entity: Entity, inventoryComponent: InventoryComponent, slotNum: number): Promise<void> {
      // Average number of particles that get created each second
      const particleRate = 7.5;

      const previousSecondsElapsed = Game.secondsElapsed - 1 / SETTINGS.tps;

      if (Math.floor(previousSecondsElapsed * particleRate) !== Math.floor(Game.secondsElapsed * particleRate)) {
         const entityPosition = entity.getComponent(TransformComponent)!.position;
         const offset = Vector.randomUnitVector();
         offset.magnitude *= 0.25 * Board.tileSize;
         const position = (entityPosition.add(offset.convertToPoint())).convertTo3D();

         const radius = randFloat(2, 3);
         const inclination = randFloat(Math.PI / 8, 3 * Math.PI / 8);
         const azimuth = randFloat(0, Math.PI * 2);
         const initialVelocity = new Vector3(radius, inclination, azimuth);

         const item = inventoryComponent.getItem(slotNum)!;
         const imageSrc = ITEMS[item[0]].imageSrc;

         let imageSlices: Array<HTMLImageElement>;
         // If the image slices array doesn't exist yet, create it
         if (!IMAGE_SLICES.hasOwnProperty(imageSrc)) {
            imageSlices = await createImageSlices(imageSrc);
            IMAGE_SLICES[imageSrc] = imageSlices;
         } else {
            imageSlices = IMAGE_SLICES[imageSrc]!;
         }

         const image = randItem(imageSlices);

         const scaleFactor = randFloat(0.25, 0.35);

         new Particle(position, {
            type: "image",
            size: [image.width * scaleFactor, image.height * scaleFactor],
            image: image,
            renderLayer: RenderLayer.HighParticles,
            initialVelocity: initialVelocity,
            lifespan: [0.25, 0.5]
         });
      }
   }

   public endRightClick(entity: Entity, inventoryComponent: InventoryComponent, slotNum: number): void {
      const healthComponent = entity.getComponent(HealthComponent)!;

      // Don't eat the food if the player's health is already full
      if (healthComponent.getHealth() < healthComponent.getMaxHealth()) {
         // Heal the entity
         entity.getComponent(HealthComponent)!.heal(this.healthRestoreAmount);
         
         // Remove one of the food from the inventory
         inventoryComponent.removeItemFromSlot(slotNum, 1);
      }
   }
}

export default FoodItem;
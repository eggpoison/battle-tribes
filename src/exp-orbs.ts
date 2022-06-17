import Entity, { RenderLayer } from "./entities/Entity";
import Tribesman from "./entities/tribe-members/Tribesman";
import Particle, { ParticleInfoType } from "./particles/Particle";
import Tribe from "./Tribe";
import { imageIsLoaded, lerp, Point, randFloat, Vector3 } from "./utils";

type ExpOrbType = {
   readonly expAmount: number;
   /** Size of the orb in pixels */
   readonly size: number;
   readonly filterColour: [number, number, number];
}

const EXP_ORB_TYPES: ReadonlyArray<ExpOrbType> = [
   { // Green orbs
      expAmount: 1,
      size: 20,
      filterColour: [0, 255, 0]
   },
   { // Yellow orbs
      expAmount: 5,
      size: 30,
      filterColour: [255, 255, 0]
   },
   { // Red orbs
      expAmount: 25,
      size: 40,
      filterColour: [255, 0, 0]
   }
];

const getEXPOrbImages = (): Promise<Array<HTMLImageElement>> => {
   return new Promise(async resolve => {
      const IMAGE_SIZE = 64;
      
      const expOrbImages = new Array<HTMLImageElement>();
      
      for (let orbType = 0; orbType < EXP_ORB_TYPES.length; orbType++) {
         const orbInfo = EXP_ORB_TYPES[orbType];

         const tempCanvas = document.createElement("canvas");
         tempCanvas.width = IMAGE_SIZE;
         tempCanvas.height = IMAGE_SIZE;

         // Create the default image from the image file
         const imageSrc = require("./images/exp-orb.png");
         const image = new Image();
         image.src = imageSrc;
         
         await imageIsLoaded(image).then(() => {
            const ctx = tempCanvas.getContext("2d")!;
            ctx.drawImage(image, 0, 0, IMAGE_SIZE, IMAGE_SIZE);

            const imageData = ctx.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE);

            const colouredImageData = ctx.createImageData(IMAGE_SIZE, IMAGE_SIZE);
            for (let i = 0; i < imageData.data.length; i += 4) {
               let minColourVal: number = 255;
               let maxColourVal: number = 0;

               for (let offset = 0; offset < 3; offset++) {
                  const pixelValue = imageData.data[i + offset];
                  if (pixelValue < minColourVal) minColourVal = pixelValue;
                  if (pixelValue > maxColourVal) maxColourVal = pixelValue;
               }

               const ratio = (maxColourVal - minColourVal) / 255;

               const r = lerp(imageData.data[i], orbInfo.filterColour[0], ratio);
               const g = lerp(imageData.data[i + 1], orbInfo.filterColour[1], ratio);
               const b = lerp(imageData.data[i + 2], orbInfo.filterColour[2], ratio);

               colouredImageData.data[i] = r;
               colouredImageData.data[i + 1] = g;
               colouredImageData.data[i + 2] = b;
               colouredImageData.data[i + 3] = imageData.data[i + 3];
            }

            const colouredCanvas = document.createElement("canvas");
            colouredCanvas.width = IMAGE_SIZE;
            colouredCanvas.height = IMAGE_SIZE;

            const colouredCtx = colouredCanvas.getContext("2d")!;
            colouredCtx.putImageData(colouredImageData, 0, 0);

            const sliceImage = new Image(IMAGE_SIZE, IMAGE_SIZE);
            sliceImage.src = colouredCanvas.toDataURL();

            expOrbImages.push(sliceImage);
         });
      }
      
      resolve(expOrbImages);
   });
}

let EXP_ORB_IMAGES: ReadonlyArray<HTMLImageElement>;
(async () => {
   EXP_ORB_IMAGES = await getEXPOrbImages()
})();

const getOrbType = (expAmount: number): number => {
   for (let idx = 0; idx < EXP_ORB_TYPES.length; idx++) {
      const orbType = EXP_ORB_TYPES[idx];

      if (expAmount < orbType.expAmount) {
         return idx - 1;
      }
   }

   throw new Error("");
}

const createEXPOrb = (position: Point, expAmount: number, tribe: Tribe): void => {
   const radius = 3;
   const inclination = randFloat(Math.PI/4, Math.PI/3);
   const azimuth = randFloat(-Math.PI, Math.PI);
   const randomVelocity = new Vector3(radius, inclination, azimuth);

   const type = getOrbType(expAmount);
   const typeInfo = EXP_ORB_TYPES[type];

   const image = EXP_ORB_IMAGES[type];

   const particleInfo: ParticleInfoType = {
      type: "image",
      image: image,
      imageSrc: "exp-orb.png",
      size: typeInfo.size,
      lifespan: 999,
      renderLayer: RenderLayer.HighParticles,
      initialVelocity: randomVelocity,
      groundFriction: 2,
      yFriction: 1,
      shadowOpacity: 0.3,
      onDestroy(): void {
         tribe.addExp(expAmount);
      },
      duringCollision(entity: Entity, particle: Particle): void {
         if (entity instanceof Tribesman) {
            particle.destroy();
         }
      }
   };

   const initialPosition = position.convertTo3D();

   new Particle(initialPosition, particleInfo);
}

export function createEXPOrbs(position: Point, expAmount: number, tribe: Tribe): void {
   createEXPOrb(position, expAmount, tribe);
}
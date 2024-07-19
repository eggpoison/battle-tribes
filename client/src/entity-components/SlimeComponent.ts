import { lerp, randFloat } from "webgl-test-shared/dist/utils";
import { SlimeSize } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { RenderPart } from "../render-parts/render-parts";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { PacketReader } from "webgl-test-shared/dist/packets";

export const SLIME_SIZES: ReadonlyArray<number> = [
   64, // small
   88, // medium
   120 // large
];

/** Information about an orb inside a slime */
interface SlimeOrbInfo {
   readonly size: SlimeSize;
   /** Offset of the orb from the center of the slime (from 0->1) */
   readonly offset: number;
   rotation: number;
   angularVelocity: number;
}

const SIZE_STRINGS: ReadonlyArray<string> = ["small", "medium", "large"];

const getBodyShakeAmount = (spitProgress: number): number => {
   return lerp(0, 5, spitProgress);
}

class SlimeComponent extends ServerComponent {
   private static readonly EYE_OFFSETS: ReadonlyArray<number> = [16, 24, 34];

   private static readonly EYE_SHAKE_START_FREQUENCY = 0.5;
   private static readonly EYE_SHAKE_END_FREQUENCY = 1.25;
   private static readonly EYE_SHAKE_START_AMPLITUDE = 0.07;
   private static readonly EYE_SHAKE_END_AMPLITUDE = 0.2;

   private readonly bodyRenderPart: RenderPart;
   private readonly eyeRenderPart: RenderPart;
   private readonly orbRenderParts = new Array<RenderPart>();

   public readonly size: number;
   private readonly orbs = new Array<SlimeOrbInfo>();

   private internalTickCounter = 0;

   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.size = reader.readNumber();
      const eyeRotation = reader.readNumber();
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
      const spitChargeProgress = reader.readNumber();
      
      const sizeString = SIZE_STRINGS[this.size];

      // Body
      this.bodyRenderPart = new TexturedRenderPart(
         this.entity,
         2,
         0,
         getTextureArrayIndex(`entities/slime/slime-${sizeString}-body.png`)
      );
      this.bodyRenderPart.shakeAmount = getBodyShakeAmount(spitChargeProgress);
      this.entity.attachRenderPart(this.bodyRenderPart);

      // Shading
      this.entity.attachRenderPart(new TexturedRenderPart(
         this.entity,
         0,
         0,
         getTextureArrayIndex(`entities/slime/slime-${sizeString}-shading.png`)
      ));

      // Eye
      const eyeRenderPart = new TexturedRenderPart(
         this.entity,
         3,
         eyeRotation,
         getTextureArrayIndex(`entities/slime/slime-${sizeString}-eye.png`)
      );

      const eyeOffsetAmount = SlimeComponent.EYE_OFFSETS[this.size];
      eyeRenderPart.offset.x = eyeOffsetAmount * Math.sin(eyeRotation);
      eyeRenderPart.offset.y = eyeOffsetAmount * Math.cos(eyeRotation);
      eyeRenderPart.inheritParentRotation = false;
      this.entity.attachRenderPart(eyeRenderPart);

      this.eyeRenderPart = eyeRenderPart;

      // @Temporary @Speed
      const orbSizes = new Array<SlimeSize>();
      const numOrbs = reader.readNumber();
      for (let i = 0; i < numOrbs; i++) {
         const orbSize = reader.readNumber() as SlimeSize;
         orbSizes.push(orbSize);
      }

      // Create initial orbs
      for (let i = 0; i < orbSizes.length; i++) {
         const size = orbSizes[i];
         this.createOrb(size);
      }
   }

   public tick(): void {
      for (let i = 0; i < this.orbs.length; i++) {
         const orb = this.orbs[i];

         // Randomly move around the orbs
         if (Math.random() < 0.3 / Settings.TPS) {
            orb.angularVelocity = randFloat(-3, 3);
         }

         // Update orb angular velocity & rotation
         orb.rotation += orb.angularVelocity / Settings.TPS;

         // Update the orb's rotation
         if (orb.angularVelocity !== 0) {
            const spriteSize = SLIME_SIZES[this.size];
            const offsetMagnitude = spriteSize / 2 * lerp(0.3, 0.7, orb.offset);
            this.orbRenderParts[i].offset.x = offsetMagnitude * Math.sin(orb.rotation);
            this.orbRenderParts[i].offset.y = offsetMagnitude * Math.cos(orb.rotation);
         }

         orb.angularVelocity -= 3 / Settings.TPS;
         if (orb.angularVelocity < 0) {
            orb.angularVelocity = 0;
         }
      }
   }

   private createOrb(size: SlimeSize): void {
      const orbInfo: SlimeOrbInfo = {
         size: size,
         rotation: 2 * Math.PI * Math.random(),
         offset: Math.random(),
         angularVelocity: 0
      };
      this.orbs.push(orbInfo);

      const sizeString = SIZE_STRINGS[size];
      
      // Calculate the orb's offset from the center of the slime
      const spriteSize = SLIME_SIZES[this.size];
      const offsetMagnitude = spriteSize / 2 * lerp(0.3, 0.7, orbInfo.offset);

      const renderPart = new TexturedRenderPart(
         this.entity,
         1,
         orbInfo.rotation,
         getTextureArrayIndex(`entities/slime/slime-orb-${sizeString}.png`)
      );
      renderPart.offset.x = offsetMagnitude * Math.sin(orbInfo.rotation);
      renderPart.offset.y = offsetMagnitude * Math.cos(orbInfo.rotation);
      this.entity.attachRenderPart(renderPart);
      this.orbRenderParts.push(renderPart);
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(4 * Float32Array.BYTES_PER_ELEMENT);
      
      const numOrbs = reader.readNumber();
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT * numOrbs);
   }

   public updateFromData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
      const eyeRotation = reader.readNumber();
      const anger = reader.readNumber();
      const spitChargeProgress = reader.readNumber();
      // 
      // Update the eye's rotation
      // 

      this.eyeRenderPart.rotation = eyeRotation;
      if (anger >= 0) {
         const frequency = lerp(SlimeComponent.EYE_SHAKE_START_FREQUENCY, SlimeComponent.EYE_SHAKE_END_FREQUENCY, anger);
         this.internalTickCounter += frequency;

         let amplitude = lerp(SlimeComponent.EYE_SHAKE_START_AMPLITUDE, SlimeComponent.EYE_SHAKE_END_AMPLITUDE, anger) * 100;
         amplitude /= Math.PI * SLIME_SIZES[this.size];
         this.eyeRenderPart.rotation += amplitude * Math.sin(this.internalTickCounter * 3);
      } else {
         this.internalTickCounter = 0;
      }

      this.eyeRenderPart.offset.x = SlimeComponent.EYE_OFFSETS[this.size] * Math.sin(this.eyeRenderPart.rotation);
      this.eyeRenderPart.offset.y = SlimeComponent.EYE_OFFSETS[this.size] * Math.cos(this.eyeRenderPart.rotation);

      if (anger === -1) {
         this.bodyRenderPart.shakeAmount = 0;
      } else {
         this.bodyRenderPart.shakeAmount = getBodyShakeAmount(spitChargeProgress);
      }

      // @Temporary @Speed
      const orbSizes = new Array<SlimeSize>();
      const numOrbs = reader.readNumber();
      for (let i = 0; i < numOrbs; i++) {
         const orbSize = reader.readNumber() as SlimeSize;
         orbSizes.push(orbSize);
      }

      // Add any new orbs
      for (let i = this.orbs.length; i < orbSizes.length; i++) {
         const size = orbSizes[i];
         this.createOrb(size);
      }
   }
}

export default SlimeComponent;
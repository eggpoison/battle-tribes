import { lerp, randFloat, randInt } from "battletribes-shared/utils";
import { EntityID, SlimeSize } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { RenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { playSound } from "../../sound";
import { TransformComponentArray } from "./TransformComponent";
import { getEntityRenderInfo } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../Entity";

export interface SlimeComponentConfig {
   readonly size: SlimeSize;
}

export interface SlimeComponentRenderParts {
   readonly bodyRenderPart: RenderPart;
   readonly eyeRenderPart: RenderPart;
}

export interface SlimeComponent {
   bodyRenderPart: RenderPart;
   eyeRenderPart: RenderPart;
   readonly orbRenderParts: Array<RenderPart>;

   size: SlimeSize;
   readonly orbs: Array<SlimeOrbInfo>;

   internalTickCounter: number;
}

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

const EYE_OFFSETS: ReadonlyArray<number> = [16, 24, 34];

const EYE_SHAKE_START_FREQUENCY = 0.5;
const EYE_SHAKE_END_FREQUENCY = 1.25;
const EYE_SHAKE_START_AMPLITUDE = 0.07;
const EYE_SHAKE_END_AMPLITUDE = 0.2;

const getBodyShakeAmount = (spitProgress: number): number => {
   return lerp(0, 5, spitProgress);
}

export const SlimeComponentArray = new ServerComponentArray<SlimeComponent>(ServerComponentType.slime, true, {
   createComponent: createComponent,
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData,
   createRenderParts: createRenderParts
});

function createComponent(config: SlimeComponentConfig, renderParts: SlimeComponentRenderParts): SlimeComponent {
   return {
      bodyRenderPart: renderParts.bodyRenderPart,
      eyeRenderPart: renderParts.eyeRenderPart,
      orbRenderParts: [],
      size: config.size,
      orbs: new Array<SlimeOrbInfo>,
      internalTickCounter: 0
   };
}

function createRenderParts(renderInfo: EntityRenderInfo, config: SlimeComponentConfig): SlimeComponentRenderParts {
   const sizeString = SIZE_STRINGS[config.size];

   // Body
   const bodyRenderPart = new TexturedRenderPart(
      null,
      2,
      0,
      getTextureArrayIndex(`entities/slime/slime-${sizeString}-body.png`)
   );
   renderInfo.attachRenderThing(bodyRenderPart);

   // Shading
   renderInfo.attachRenderThing(new TexturedRenderPart(
      null,
      0,
      0,
      getTextureArrayIndex(`entities/slime/slime-${sizeString}-shading.png`)
   ));

   // Eye
   const eyeRenderPart = new TexturedRenderPart(
      null,
      3,
      0,
      getTextureArrayIndex(`entities/slime/slime-${sizeString}-eye.png`)
   );
   eyeRenderPart.inheritParentRotation = false;
   renderInfo.attachRenderThing(eyeRenderPart);

   return {
      bodyRenderPart: bodyRenderPart,
      eyeRenderPart: eyeRenderPart
   };
}

function onTick(slimeComponent: SlimeComponent, entity: EntityID): void {
   if (Math.random() < 0.2 / Settings.TPS) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      playSound("slime-ambient-" + randInt(1, 4) + ".mp3", 0.4, 1, transformComponent.position);
   }

   for (let i = 0; i < slimeComponent.orbs.length; i++) {
      const orb = slimeComponent.orbs[i];

      // Randomly move around the orbs
      if (Math.random() < 0.3 / Settings.TPS) {
         orb.angularVelocity = randFloat(-3, 3);
      }

      // Update orb angular velocity & rotation
      orb.rotation += orb.angularVelocity / Settings.TPS;

      // Update the orb's rotation
      if (orb.angularVelocity !== 0) {
         const spriteSize = SLIME_SIZES[slimeComponent.size];
         const offsetMagnitude = spriteSize / 2 * lerp(0.3, 0.7, orb.offset);
         slimeComponent.orbRenderParts[i].offset.x = offsetMagnitude * Math.sin(orb.rotation);
         slimeComponent.orbRenderParts[i].offset.y = offsetMagnitude * Math.cos(orb.rotation);
      }

      orb.angularVelocity -= 3 / Settings.TPS;
      if (orb.angularVelocity < 0) {
         orb.angularVelocity = 0;
      }
   }
}

const createOrb = (slimeComponent: SlimeComponent, entity: EntityID, size: SlimeSize): void => {
   const orbInfo: SlimeOrbInfo = {
      size: size,
      rotation: 2 * Math.PI * Math.random(),
      offset: Math.random(),
      angularVelocity: 0
   };
   slimeComponent.orbs.push(orbInfo);

   const sizeString = SIZE_STRINGS[size];
   
   // Calculate the orb's offset from the center of the slime
   const spriteSize = SLIME_SIZES[slimeComponent.size];
   const offsetMagnitude = spriteSize / 2 * lerp(0.3, 0.7, orbInfo.offset);

   const renderPart = new TexturedRenderPart(
      null,
      1,
      orbInfo.rotation,
      getTextureArrayIndex(`entities/slime/slime-orb-${sizeString}.png`)
   );
   renderPart.offset.x = offsetMagnitude * Math.sin(orbInfo.rotation);
   renderPart.offset.y = offsetMagnitude * Math.cos(orbInfo.rotation);
   slimeComponent.orbRenderParts.push(renderPart);

   const renderInfo = getEntityRenderInfo(entity);
   renderInfo.attachRenderThing(renderPart);
}

function padData(reader: PacketReader): void {
   reader.padOffset(4 * Float32Array.BYTES_PER_ELEMENT);
   
   const numOrbs = reader.readNumber();
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT * numOrbs);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const slimeComponent = SlimeComponentArray.getComponent(entity);
   
   // @Incomplete: change render parts when this happens?
   slimeComponent.size = reader.readNumber();
   const eyeRotation = reader.readNumber();
   const anger = reader.readNumber();
   const spitChargeProgress = reader.readNumber();

   // 
   // Update the eye's rotation
   // 

   slimeComponent.eyeRenderPart.rotation = eyeRotation;
   if (anger >= 0) {
      const frequency = lerp(EYE_SHAKE_START_FREQUENCY, EYE_SHAKE_END_FREQUENCY, anger);
      slimeComponent.internalTickCounter += frequency;

      let amplitude = lerp(EYE_SHAKE_START_AMPLITUDE, EYE_SHAKE_END_AMPLITUDE, anger) * 100;
      amplitude /= Math.PI * SLIME_SIZES[slimeComponent.size];
      slimeComponent.eyeRenderPart.rotation += amplitude * Math.sin(slimeComponent.internalTickCounter * 3);
   } else {
      slimeComponent.internalTickCounter = 0;
   }

   slimeComponent.eyeRenderPart.offset.x = EYE_OFFSETS[slimeComponent.size] * Math.sin(slimeComponent.eyeRenderPart.rotation);
   slimeComponent.eyeRenderPart.offset.y = EYE_OFFSETS[slimeComponent.size] * Math.cos(slimeComponent.eyeRenderPart.rotation);

   if (anger === -1) {
      slimeComponent.bodyRenderPart.shakeAmount = 0;
   } else {
      slimeComponent.bodyRenderPart.shakeAmount = getBodyShakeAmount(spitChargeProgress);
   }

   // @Temporary @Speed
   const orbSizes = new Array<SlimeSize>();
   const numOrbs = reader.readNumber();
   for (let i = 0; i < numOrbs; i++) {
      const orbSize = reader.readNumber() as SlimeSize;
      orbSizes.push(orbSize);
   }

   // Add any new orbs
   for (let i = slimeComponent.orbs.length; i < orbSizes.length; i++) {
      const size = orbSizes[i];
      createOrb(slimeComponent, entity, size);
   }
}
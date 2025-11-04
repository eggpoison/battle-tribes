import { lerp, randAngle, randFloat, randInt } from "battletribes-shared/utils";
import { Entity, SlimeSize } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { VisualRenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { playSoundOnHitbox } from "../../sound";
import { TransformComponentArray } from "./TransformComponent";
import { EntityComponentData, getEntityRenderInfo } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { createSlimePoolParticle, createSlimeSpeckParticle } from "../../particles";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface SlimeComponentData {
   readonly size: SlimeSize;
   readonly eyeRotation: number;
   readonly anger: number;
   readonly spitChargeProgress: number;
   readonly orbSizes: Array<SlimeSize>;
}

interface IntermediateInfo {
   readonly bodyRenderPart: VisualRenderPart;
   readonly eyeRenderPart: VisualRenderPart;
}

export interface SlimeComponent {
   bodyRenderPart: VisualRenderPart;
   eyeRenderPart: VisualRenderPart;
   readonly orbRenderParts: Array<VisualRenderPart>;

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

const NUM_PUDDLE_PARTICLES_ON_HIT: ReadonlyArray<number> = [1, 2, 3];
const NUM_PUDDLE_PARTICLES_ON_DEATH: ReadonlyArray<number> = [3, 5, 7];
const NUM_SPECK_PARTICLES_ON_HIT: ReadonlyArray<number> = [3, 5, 7];
const NUM_SPECK_PARTICLES_ON_DEATH: ReadonlyArray<number> = [6, 10, 15];

const getBodyShakeAmount = (spitProgress: number): number => {
   return lerp(0, 5, spitProgress);
}

export const SlimeComponentArray = new ServerComponentArray<SlimeComponent, SlimeComponentData, IntermediateInfo>(ServerComponentType.slime, true, createComponent, getMaxRenderParts, decodeData);
SlimeComponentArray.populateIntermediateInfo = populateIntermediateInfo;
SlimeComponentArray.onTick = onTick;
SlimeComponentArray.updateFromData = updateFromData;
SlimeComponentArray.onHit = onHit;
SlimeComponentArray.onDie = onDie;

function decodeData(reader: PacketReader): SlimeComponentData {
   const size = reader.readNumber() as SlimeSize;
   const eyeRotation = reader.readNumber();
   const anger = reader.readNumber();
   const spitChargeProgress = reader.readNumber();

   const orbSizes = new Array<SlimeSize>();
   const numOrbs = reader.readNumber();
   for (let i = 0; i < numOrbs; i++) {
      const orbSize = reader.readNumber() as SlimeSize;
      orbSizes.push(orbSize);
   }

   return {
      size: size,
      eyeRotation: eyeRotation,
      anger: anger,
      spitChargeProgress: spitChargeProgress,
      orbSizes: orbSizes
   };
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];

   const size = entityComponentData.serverComponentData[ServerComponentType.slime]!.size;
   const sizeString = SIZE_STRINGS[size];

   // Body
   const bodyRenderPart = new TexturedRenderPart(
      hitbox,
      2,
      0,
      getTextureArrayIndex(`entities/slime/slime-${sizeString}-body.png`)
   );
   renderInfo.attachRenderPart(bodyRenderPart);

   // Shading
   renderInfo.attachRenderPart(new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex(`entities/slime/slime-${sizeString}-shading.png`)
   ));

   // Eye
   const eyeRenderPart = new TexturedRenderPart(
      hitbox,
      3,
      0,
      getTextureArrayIndex(`entities/slime/slime-${sizeString}-eye.png`)
   );
   eyeRenderPart.inheritParentRotation = false;
   renderInfo.attachRenderPart(eyeRenderPart);

   return {
      bodyRenderPart: bodyRenderPart,
      eyeRenderPart: eyeRenderPart
   };
}

function createComponent(entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): SlimeComponent {
   return {
      bodyRenderPart: intermediateInfo.bodyRenderPart,
      eyeRenderPart: intermediateInfo.eyeRenderPart,
      orbRenderParts: [],
      size: entityComponentData.serverComponentData[ServerComponentType.slime]!.size,
      orbs: new Array<SlimeOrbInfo>,
      internalTickCounter: 0
   };
}

function getMaxRenderParts(): number {
   // 3 plus 10 max orbs
   return 13;
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity)!;
   const hitbox = transformComponent.hitboxes[0];
   
   if (Math.random() < 0.2 * Settings.DT_S) {
      playSoundOnHitbox("slime-ambient-" + randInt(1, 4) + ".mp3", 0.4, 1, entity, hitbox, false);
   }

   const slimeComponent = SlimeComponentArray.getComponent(entity)!;
   for (let i = 0; i < slimeComponent.orbs.length; i++) {
      const orb = slimeComponent.orbs[i];

      // Randomly move around the orbs
      if (Math.random() < 0.3 * Settings.DT_S) {
         orb.angularVelocity = randFloat(-3, 3);
      }

      // Update orb angular velocity & rotation
      orb.rotation += orb.angularVelocity * Settings.DT_S;

      // Update the orb's rotation
      if (orb.angularVelocity !== 0) {
         const spriteSize = SLIME_SIZES[slimeComponent.size];
         const offsetMagnitude = spriteSize / 2 * lerp(0.3, 0.7, orb.offset);
         slimeComponent.orbRenderParts[i].offset.x = offsetMagnitude * Math.sin(orb.rotation);
         slimeComponent.orbRenderParts[i].offset.y = offsetMagnitude * Math.cos(orb.rotation);
      }

      orb.angularVelocity -= 3 * Settings.DT_S;
      if (orb.angularVelocity < 0) {
         orb.angularVelocity = 0;
      }
   }
}

const createOrb = (slimeComponent: SlimeComponent, entity: Entity, size: SlimeSize): void => {
   const orbInfo: SlimeOrbInfo = {
      size: size,
      rotation: randAngle(),
      offset: Math.random(),
      angularVelocity: 0
   };
   slimeComponent.orbs.push(orbInfo);

   const sizeString = SIZE_STRINGS[size];
   
   // Calculate the orb's offset from the center of the slime
   const spriteSize = SLIME_SIZES[slimeComponent.size];
   const offsetMagnitude = spriteSize / 2 * lerp(0.3, 0.7, orbInfo.offset);

   const transformComponent = TransformComponentArray.getComponent(entity)!;
   const hitbox = transformComponent.hitboxes[0];

   const renderPart = new TexturedRenderPart(
      hitbox,
      1,
      orbInfo.rotation,
      getTextureArrayIndex(`entities/slime/slime-orb-${sizeString}.png`)
   );
   renderPart.offset.x = offsetMagnitude * Math.sin(orbInfo.rotation);
   renderPart.offset.y = offsetMagnitude * Math.cos(orbInfo.rotation);
   slimeComponent.orbRenderParts.push(renderPart);

   const renderInfo = getEntityRenderInfo(entity);
   renderInfo.attachRenderPart(renderPart);
}

function updateFromData(data: SlimeComponentData, entity: Entity): void {
   const slimeComponent = SlimeComponentArray.getComponent(entity)!;
   
   // @Incomplete: change render parts when this happens?
   slimeComponent.size = data.size;
   const eyeRotation = data.eyeRotation;
   const anger = data.anger;
   const spitChargeProgress = data.spitChargeProgress;

   // 
   // Update the eye's rotation
   // 

   slimeComponent.eyeRenderPart.angle = eyeRotation;
   if (anger >= 0) {
      const frequency = lerp(EYE_SHAKE_START_FREQUENCY, EYE_SHAKE_END_FREQUENCY, anger);
      slimeComponent.internalTickCounter += frequency;

      let amplitude = lerp(EYE_SHAKE_START_AMPLITUDE, EYE_SHAKE_END_AMPLITUDE, anger) * 100;
      amplitude /= Math.PI * SLIME_SIZES[slimeComponent.size];
      slimeComponent.eyeRenderPart.angle += amplitude * Math.sin(slimeComponent.internalTickCounter * 3);
   } else {
      slimeComponent.internalTickCounter = 0;
   }

   slimeComponent.eyeRenderPart.offset.x = EYE_OFFSETS[slimeComponent.size] * Math.sin(slimeComponent.eyeRenderPart.angle);
   slimeComponent.eyeRenderPart.offset.y = EYE_OFFSETS[slimeComponent.size] * Math.cos(slimeComponent.eyeRenderPart.angle);

   if (anger === -1) {
      slimeComponent.bodyRenderPart.shakeAmount = 0;
   } else {
      slimeComponent.bodyRenderPart.shakeAmount = getBodyShakeAmount(spitChargeProgress);
   }

   // Add any new orbs
   for (let i = slimeComponent.orbs.length; i < data.orbSizes.length; i++) {
      const size = data.orbSizes[i];
      createOrb(slimeComponent, entity, size);
   }
}

function onHit(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity)!;
   const hitbox = transformComponent.hitboxes[0]!;
   
   const slimeComponent = SlimeComponentArray.getComponent(entity)!;

   const radius = SLIME_SIZES[slimeComponent.size] / 2;
   
   for (let i = 0; i < NUM_PUDDLE_PARTICLES_ON_HIT[slimeComponent.size]; i++) {
      createSlimePoolParticle(hitbox.box.position.x, hitbox.box.position.y, radius);
   }

   for (let i = 0; i < NUM_SPECK_PARTICLES_ON_HIT[slimeComponent.size]; i++) {
      createSlimeSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, radius * Math.random());
   }

   playSoundOnHitbox("slime-hit-" + randInt(1, 2) + ".mp3", 0.4, 1, entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity)!;
   const hitbox = transformComponent.hitboxes[0];
   
   const slimeComponent = SlimeComponentArray.getComponent(entity)!;

   const radius = SLIME_SIZES[slimeComponent.size] / 2;

   for (let i = 0; i < NUM_PUDDLE_PARTICLES_ON_DEATH[slimeComponent.size]; i++) {
      createSlimePoolParticle(hitbox.box.position.x, hitbox.box.position.y, radius);
   }

   for (let i = 0; i < NUM_SPECK_PARTICLES_ON_DEATH[slimeComponent.size]; i++) {
      createSlimeSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, radius * Math.random());
   }

   playSoundOnHitbox("slime-death.mp3", 0.4, 1, entity, hitbox, false);
}
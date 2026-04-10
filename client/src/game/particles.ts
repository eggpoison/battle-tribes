import { BlockType, CactusFlowerSize, Entity, Point, _point, lerp, polarVec2, randAngle, randFloat, randInt, randItem, randSign } from "webgl-test-shared";
import Particle from "./Particle";
import { ParticleColour, ParticleRenderLayer, addMonocolourParticleToBufferContainer, addTexturedParticleToBufferContainer, highMonocolourParticles, highTexturedParticles, lowMonocolourParticles, lowTexturedParticles } from "./rendering/webgl/particle-rendering";
import { TransformComponent, TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { getHitboxVelocity, Hitbox } from "./hitboxes";
import { addTickCallback, tickIntervalHasPassed } from "./game";
import { playerInstance } from "./player";
import { InventoryUseComponentArray } from "./entity-components/server-components/InventoryUseComponent";
import { createTranslationMatrix, matrixMultiplyInPlace } from "./rendering/matrices";
import { getMatrixPosition } from "./rendering/render-part-matrices";
import { playHeadSound } from "./sound";

// @Cleanup: Standardise all these functions to just take the stuff necessary to create them, then have the places which call them modify the returned particle

const BLOOD_COLOUR_LOW: Readonly<ParticleColour> = [150, 0, 0];
const BLOOD_COLOUR_HIGH: Readonly<ParticleColour> = [212, 0, 0];

const BURNING_PARTICLE_COLOURS: ReadonlyArray<ParticleColour> = [
   [255/255, 102/255, 0],
   [255/255, 184/255, 61/255]
];

// @Hack
export const LEAF_SPECK_COLOUR_LOW = [63/255, 204/255, 91/255] as const;
export const LEAF_SPECK_COLOUR_HIGH = [35/255, 158/255, 88/255] as const;

export enum BloodParticleSize {
   small,
   large
}

export function createBloodParticle(size: BloodParticleSize, spawnPositionX: number, spawnPositionY: number, moveDirection: number, moveSpeed: number, hasDrag: boolean): void {
   const lifetime = randFloat(0.3, 0.4);
   
   const pixelSize = size === BloodParticleSize.large ? 8 : 4;

   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);

   const friction = hasDrag ? moveSpeed / lifetime / 1.2 : 0;

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - particle.age / lifetime;
   };

   const colourLerp = Math.random();
   const r = lerp(BLOOD_COLOUR_LOW[0], BLOOD_COLOUR_HIGH[0], colourLerp);
   const g = lerp(BLOOD_COLOUR_LOW[1], BLOOD_COLOUR_HIGH[1], colourLerp);
   const b = lerp(BLOOD_COLOUR_LOW[2], BLOOD_COLOUR_HIGH[2], colourLerp);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      pixelSize, pixelSize,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      friction,
      randAngle(),
      0,
      0,
      0,
      r, g, b
   );
   highMonocolourParticles.push(particle);
}

const BLOOD_FOUNTAIN_RAY_COUNT = 5;

export function createBloodParticleFountain(entity: Entity, interval: number, speedMultiplier: number): void {
   const offset = randAngle();
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   for (let i = 0; i < 4; i++) {
      addTickCallback(interval * (i + 1), () => {
         for (let j = 0; j < BLOOD_FOUNTAIN_RAY_COUNT; j++) {
            let moveDirection = 2 * Math.PI / BLOOD_FOUNTAIN_RAY_COUNT * j + offset;
            moveDirection += randFloat(-0.3, 0.3);

            createBloodParticle(BloodParticleSize.large, hitbox.box.position.x, hitbox.box.position.y, moveDirection, randFloat(100, 200) * speedMultiplier, false);
         }
      });
   }
}

export enum LeafParticleSize {
   small,
   large
}

export function createLeafParticle(spawnPositionX: number, spawnPositionY: number, moveDirection: number, size: LeafParticleSize): void {
   const lifetime = randFloat(2, 2.5);

   let textureIndex: number;
   if (size === LeafParticleSize.small) {
      textureIndex = 8 * 1;
   } else {
      textureIndex = 8 * 1 + 1;
   }

   const velocityMagnitude = randFloat(30, 50);
   const velocityX = velocityMagnitude * Math.sin(moveDirection);
   const velocityY = velocityMagnitude * Math.cos(moveDirection);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.5);
   };

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      64, 64,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      60,
      randAngle(),
      Math.PI * randFloat(-1, 1),
      0,
      1.5 * Math.PI,
      textureIndex,
      0, 0, 0
   );
   lowTexturedParticles.push(particle);
}

export function createFootprintParticle(entity: Entity, isLeftFootprint: boolean, footstepOffset: number, size: number, lifetime: number): void {
   const footstepAngleOffset = isLeftFootprint ? Math.PI : 0;

   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   
   getHitboxVelocity(hitbox);
   const velocityDirection = _point.angle();

   const offsetMagnitude = footstepOffset / 2;
   const offsetDirection = velocityDirection + footstepAngleOffset + Math.PI/2;
   const spawnPositionX = hitbox.box.position.x + offsetMagnitude * Math.sin(offsetDirection);
   const spawnPositionY = hitbox.box.position.y + offsetMagnitude * Math.cos(offsetDirection);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return lerp(0.8, 0, particle.age / lifetime);
   };

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      size, size,
      spawnPositionX, spawnPositionY,
      0, 0,
      0, 0,
      0,
      velocityDirection,
      0,
      0,
      0,
      4,
      0, 0, 0
   );
   lowTexturedParticles.push(particle);
}

export enum BloodPoolSize {
   small,
   medium,
   large
}

export function createBloodPoolParticle(originX: number, originY: number, spawnRange: number): void {
   const lifetime = 7.5;

   const offsetMagnitude = spawnRange * Math.random();
   const offsetDirection = randAngle();
   const spawnPositionX = originX + offsetMagnitude * Math.sin(offsetDirection);
   const spawnPositionY = originY + offsetMagnitude * Math.cos(offsetDirection);

   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - particle.age / lifetime;
   };

   const tint = randFloat(-0.2, 0.2);
   
   const textureIndex = randInt(0, 2);
   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      64, 64,
      spawnPositionX, spawnPositionY,
      0, 0,
      0, 0,
      0,
      randAngle(),
      0,
      0,
      0,
      textureIndex,
      tint, tint, tint
   );
   lowTexturedParticles.push(particle);
}
   
export function createRockParticle(spawnPositionX: number, spawnPositionY: number, moveDirection: number, moveSpeed: number, renderLayer: ParticleRenderLayer): void {
   const lifetime = randFloat(0.3, 0.6);

   let textureIndex: number;
   if (Math.random() < 0.5) {
      // Large rock
      textureIndex = 8 * 1 + 3;
   } else {
      // Small rock
      textureIndex = 8 * 1 + 2;
   }

   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);

   const accelerationMagnitude = moveSpeed / lifetime / 1.25;
   const accelerationDirection = moveDirection + Math.PI;
   const accelerationX = accelerationMagnitude * Math.sin(accelerationDirection);
   const accelerationY = accelerationMagnitude * Math.cos(accelerationDirection);

   const spinDirection = randFloat(-1, 1);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - particle.age / lifetime;
   };

   addTexturedParticleToBufferContainer(
      particle,
      renderLayer,
      64, 64,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      accelerationX, accelerationY,
      0,
      randAngle(),
      2 * Math.PI * spinDirection,
      0,
      Math.abs(Math.PI * spinDirection),
      textureIndex,
      0, 0, 0
   );
   if (renderLayer === ParticleRenderLayer.high) {
      highTexturedParticles.push(particle);
   } else {
      lowTexturedParticles.push(particle);
   }
}

export function createDirtParticle(spawnPositionX: number, spawnPositionY: number, renderLayer: ParticleRenderLayer): void {
   const speedMultiplier = randFloat(1, 2.2);

   const velocityDirection = randAngle();
   const velocityX = 80 * speedMultiplier * Math.sin(velocityDirection);
   const velocityY = 80 * speedMultiplier * Math.cos(velocityDirection);

   const lifetime = 1.5;
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - Math.pow(particle.age / lifetime, 3);
   }

   const angularVelocityMagnitude = Math.PI * randFloat(3, 4);

   addTexturedParticleToBufferContainer(
      particle,
      renderLayer,
      64, 64,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      300,
      randAngle(),
      angularVelocityMagnitude * randSign(),
      0,
      angularVelocityMagnitude / lifetime,
      3,
      0, 0, 0
   );

   if (renderLayer === ParticleRenderLayer.low) {
      lowTexturedParticles.push(particle);
   } else {
      highTexturedParticles.push(particle);
   }
}

const SNOW_PARTICLE_COLOUR_LOW: ParticleColour = [164/255, 175/255, 176/255];
const SNOW_PARTICLE_COLOUR_HIGH: ParticleColour = [199/255, 209/255, 209/255];

export function createSnowParticle(spawnPositionX: number, spawnPositionY: number, moveSpeed: number): void {
   const lifetime = randFloat(0.6, 0.8);

   const velocityDirection = randAngle();
   const velocityX = moveSpeed * Math.sin(velocityDirection);
   const velocityY = moveSpeed * Math.cos(velocityDirection);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - particle.age / lifetime;
   };

   const pixelSize = 4 * randInt(1, 2);

   const colourLerp = Math.random();
   const r = lerp(SNOW_PARTICLE_COLOUR_LOW[0], SNOW_PARTICLE_COLOUR_HIGH[0], colourLerp);
   const g = lerp(SNOW_PARTICLE_COLOUR_LOW[1], SNOW_PARTICLE_COLOUR_HIGH[1], colourLerp);
   const b = lerp(SNOW_PARTICLE_COLOUR_LOW[2], SNOW_PARTICLE_COLOUR_HIGH[2], colourLerp);
   
   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      pixelSize, pixelSize,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      0,
      randAngle(),
      0,
      0,
      0,
      r, g, b
   );
   lowMonocolourParticles.push(particle);
}

// @Copynpaste, basically just so the snobe particles are above snobes
export function createHighSnowParticle(spawnPositionX: number, spawnPositionY: number, moveSpeed: number): void {
   const lifetime = randFloat(0.6, 0.8);

   const velocityDirection = randAngle();
   const velocityX = moveSpeed * Math.sin(velocityDirection);
   const velocityY = moveSpeed * Math.cos(velocityDirection);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - particle.age / lifetime;
   };

   const pixelSize = 4 * randInt(1, 2);

   const colourLerp = Math.random();
   // @HACK @ASS
   const r = lerp(SNOW_PARTICLE_COLOUR_LOW[0] * 0.8, SNOW_PARTICLE_COLOUR_HIGH[0] * 1.05, colourLerp);
   const g = lerp(SNOW_PARTICLE_COLOUR_LOW[1] * 0.8, SNOW_PARTICLE_COLOUR_HIGH[1] * 1.05, colourLerp);
   const b = lerp(SNOW_PARTICLE_COLOUR_LOW[2] * 0.8, SNOW_PARTICLE_COLOUR_HIGH[2] * 1.05, colourLerp);
   
   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      pixelSize, pixelSize,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      0,
      randAngle(),
      0,
      0,
      0,
      r, g, b
   );
   highMonocolourParticles.push(particle);
}

export function createWhiteSmokeParticle(spawnPositionX: number, spawnPositionY: number, strength: number): void {
   const velocityMagnitude = 125 * randFloat(0.8, 1.2) * strength;
   const velocityDirection = randAngle();
   const velocityX = velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityMagnitude * Math.cos(velocityDirection);

   const lifetime = Math.pow(strength, 0.75);

   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - particle.age / lifetime;
   }

   const sizeMultiplier = randFloat(0.7, 1);

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      64 * sizeMultiplier, 64 * sizeMultiplier,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      velocityMagnitude / lifetime / 1.5,
      randAngle(),
      Math.PI * randFloat(2, 3) * randSign(),
      0,
      Math.PI,
      7,
      0, 0, 0
   );
   lowTexturedParticles.push(particle);
}

export function createLeafSpeckParticle(originX: number, originY: number, offset: number, lowColour: Readonly<ParticleColour>, highColour: Readonly<ParticleColour>): void {
   const spawnOffsetDirection = randAngle();
   const spawnPositionX = originX + offset * Math.sin(spawnOffsetDirection);
   const spawnPositionY = originY + offset * Math.cos(spawnOffsetDirection);

   const velocityMagnitude = randFloat(60, 80);
   const velocityDirection = spawnOffsetDirection + randFloat(1, -1);
   const velocityX = velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityMagnitude * Math.cos(velocityDirection);

   const lifetime = randFloat(0.3, 0.5);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.3);
   }
   
   const colourLerp = Math.random();
   const r = lerp(lowColour[0], highColour[0], colourLerp);
   const g = lerp(lowColour[1], highColour[1], colourLerp);
   const b = lerp(lowColour[2], highColour[2], colourLerp);

   const angularVelocity = randFloat(-Math.PI, Math.PI) * 2;

   const scale = randFloat(1, 1.35);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      6 * scale, 6 * scale,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      velocityMagnitude / lifetime / 1.5,
      randAngle(),
      angularVelocity,
      0,
      Math.abs(angularVelocity) / lifetime / 1.5,
      r, g, b
   );
   lowMonocolourParticles.push(particle);
}

export function createWoodSpeckParticle(originX: number, originY: number, offset: number): void {
   const spawnOffsetDirection = randAngle();
   const spawnPositionX = originX + offset * Math.sin(spawnOffsetDirection);
   const spawnPositionY = originY + offset * Math.cos(spawnOffsetDirection);

   const velocityMagnitude = randFloat(60, 80);
   const velocityDirection = spawnOffsetDirection + randFloat(1, -1);
   const velocityX = velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityMagnitude * Math.cos(velocityDirection);

   const lifetime = randFloat(0.3, 0.5);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.3);
   }
   
   const colourLerp = Math.random();
   const r = lerp(64/255, 140/255, colourLerp);
   const g = lerp(31/255, 94/255, colourLerp);
   const b = lerp(2/255, 15/255, colourLerp);

   const angularVelocity = randFloat(-Math.PI, Math.PI) * 2;

   const scale = randFloat(1, 1.35);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      6 * scale, 6 * scale,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      velocityMagnitude / lifetime / 1.5,
      randAngle(),
      angularVelocity,
      0,
      Math.abs(angularVelocity) / lifetime / 1.5,
      r, g, b
   );
   lowMonocolourParticles.push(particle);
}

export function createRockSpeckParticle(originX: number, originY: number, offset: number, velocityAddX: number, velocityAddY: number, renderLayer: ParticleRenderLayer): void {
   const spawnOffsetDirection = randAngle();
   const spawnPositionX = originX + offset * Math.sin(spawnOffsetDirection);
   const spawnPositionY = originY + offset * Math.cos(spawnOffsetDirection);

   const velocityMagnitude = randFloat(60, 80);
   const velocityDirection = spawnOffsetDirection + randFloat(1, -1);
   const velocityX = velocityAddX + velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityAddY + velocityMagnitude * Math.cos(velocityDirection);

   const lifetime = randFloat(0.3, 0.5);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.3);
   }
   
   const angularVelocity = randFloat(-Math.PI, Math.PI) * 2;
   
   const colour = randFloat(0.5, 0.75);
   const scale = randFloat(1, 1.35);

   const baseSize = Math.random() < 0.6 ? 4 : 6;

   addMonocolourParticleToBufferContainer(
      particle,
      renderLayer,
      baseSize * scale, baseSize * scale,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      velocityMagnitude / lifetime / 1.1,
      randAngle(),
      angularVelocity,
      0,
      Math.abs(angularVelocity) / lifetime / 1.5,
      colour, colour, colour
   );
   if (renderLayer === ParticleRenderLayer.high) {
      highMonocolourParticles.push(particle);
   } else {
      lowMonocolourParticles.push(particle);
   }
}

export function createSlimeSpeckParticle(originX: number, originY: number, spawnOffset: number): void {
   const spawnOffsetMagnitude = spawnOffset;
   const spawnOffsetDirection = randAngle();
   const spawnPositionX = originX + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
   const spawnPositionY = originY + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

   const lifetime = randFloat(0.5, 0.65);
   
   const size = randInt(0, 1);

   const moveSpeed = randFloat(30, 40);
   const moveDirection = randAngle();
   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - particle.age / lifetime;
   };

   const tint = randFloat(-0.4, 0.4);

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      64, 64,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      0,
      randAngle(),
      randFloat(-Math.PI, Math.PI) * 2,
      0,
      Math.PI,
      8 * 4 + size,
      tint, tint, tint
   );
   highTexturedParticles.push(particle);
}

export function createSlimePoolParticle(originX: number, originY: number, spawnOffsetRange: number): void {
   const spawnOffsetMagnitude = spawnOffsetRange * Math.random();
   const spawnOffsetDirection = randAngle();
   const spawnPositionX = originX + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
   const spawnPositionY = originY + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

   const lifetime = 7.5;

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return lerp(0.75, 0, particle.age / lifetime);
   }

   const tint = randFloat(-0.2, 0.2);

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      64, 64,
      spawnPositionX, spawnPositionY,
      0, 0,
      0, 0,
      0,
      randAngle(),
      0,
      0,
      0,
      8 * 1 + 4,
      tint, tint, tint
   );
   lowTexturedParticles.push(particle);
}

const WATER_DROPLET_COLOUR_LOW = [8/255, 197/255, 255/255] as const;
const WATER_DROPLET_COLOUR_HIGH = [94/255, 231/255, 255/255] as const;

export function createWaterSplashParticle(spawnPositionX: number, spawnPositionY: number): void {
   const lifetime = 1;

   const velocityMagnitude = randFloat(40, 60);
   const velocityDirection = randAngle()
   const velocityX = velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityMagnitude * Math.cos(velocityDirection);
      
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return lerp(0.75, 0, particle.age / lifetime);
   };

   const colourLerp = Math.random();
   const r = lerp(WATER_DROPLET_COLOUR_LOW[0], WATER_DROPLET_COLOUR_HIGH[0], colourLerp);
   const g = lerp(WATER_DROPLET_COLOUR_LOW[1], WATER_DROPLET_COLOUR_HIGH[1], colourLerp);
   const b = lerp(WATER_DROPLET_COLOUR_LOW[2], WATER_DROPLET_COLOUR_HIGH[2], colourLerp);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      6, 6,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      0,
      randAngle(),
      randFloat(2, 3) * randSign(),
      0,
      0,
      r, g, b
   );
   lowMonocolourParticles.push(particle);
}

export function createSmokeParticle(spawnPositionX: number, spawnPositionY: number, size: number): void {
   const lifetime = randFloat(1.5, 2);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return lerp(0.5, 0, particle.age / lifetime);
   }
   particle.getScale = (): number => {
      const deathProgress = particle.age / lifetime
      return 1 + deathProgress * 2;
   }

   const velocity = polarVec2(30, randAngle());

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      size, size,
      spawnPositionX, spawnPositionY,
      velocity.x, velocity.y,
      0, 0,
      0,
      randAngle(),
      0,
      0.75 * Math.PI * randFloat(-1, 1),
      0,
      5,
      0, 0, 0
   );
   highTexturedParticles.push(particle);
}

export function createEmberParticle(spawnPositionX: number, spawnPositionY: number, initialMoveDirection: number, moveSpeed: number, vAddX: number, vAddY: number): void {
   const lifetime = randFloat(0.6, 1.2);

   const velocityX = moveSpeed * Math.sin(initialMoveDirection);
   const velocityY = moveSpeed * Math.cos(initialMoveDirection);

   const accelerationMagnitude = randFloat(0, 80);
   const accelerationDirection = randAngle();
   const accelerationX = accelerationMagnitude * Math.sin(accelerationDirection);
   const accelerationY = accelerationDirection * Math.cos(accelerationDirection);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      const opacity = 1 - particle.age / lifetime;
      return Math.pow(opacity, 0.3);
   }

   const colour = randItem(BURNING_PARTICLE_COLOURS);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      4, 4,
      spawnPositionX, spawnPositionY,
      velocityX + vAddX, velocityY + vAddY,
      accelerationX, accelerationY,
      0,
      randAngle(),
      0, 
      0,
      0,
      colour[0], colour[1], colour[2]
   );
   highMonocolourParticles.push(particle);
}

export function createPoisonBubble(spawnPositionX: number, spawnPositionY: number, opacity: number) {
   const lifetime = randFloat(0.2, 0.3);
   
   const moveSpeed = randFloat(75, 150);
   const moveDirection = randAngle();
   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return (1 - particle.age / lifetime) * opacity;
   };

   const size = randInt(0, 1);
   
   const purp = Math.random() / 3;

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      64, 64,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      moveSpeed / lifetime / 1.1,
      randAngle(),
      randFloat(-1, 1) * Math.PI * 2,
      0,
      0,
      5 * 8 + 1 + size,
      // 0, randFloat(-0.2, 0.3), 0
      lerp(0, 1, purp), lerp(randFloat(-0.2, 0.3), -1, purp), lerp(0, 1, purp)
   );
   highTexturedParticles.push(particle);
}

export function createFlyParticle(x: number, y: number): void {
   // @Incomplete: once particles are much more like game objects, make flies actually fly around and stuff
   
   const lifetime = randFloat(0.5, 1);
   
   const moveSpeed = randFloat(75, 150);
   const moveDirection = randAngle();
   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);
   
   const accelerateMagnitude = randFloat(75, 150);
   const accelerateDirection = randAngle();
   const accelerationX = accelerateMagnitude * Math.sin(accelerateDirection);
   const accelerationY = accelerateMagnitude * Math.cos(accelerateDirection);

   const opacity = randFloat(0.7, 1);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.3) * opacity;
   };
   particle.getScale = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.5);
   };

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      64, 64,
      x, y,
      velocityX, velocityY,
      accelerationX, accelerationY,
      0,
      randAngle(),
      randFloat(-1, 1) * Math.PI * 2,
      0,
      0,
      1 * 8 + 6,
      0, 0, 0
   );
   highTexturedParticles.push(particle);
}

export function createStarParticle(x: number, y: number): void {
   const lifetime = randFloat(0.5, 1);
   
   const moveSpeed = randFloat(75, 150);
   const moveDirection = randAngle();
   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);

   const opacity = randFloat(0.7, 1);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.3) * opacity;
   };
   particle.getScale = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.5);
   };

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      64, 64,
      x, y,
      velocityX, velocityY,
      0, 0,
      0,
      randAngle(),
      randFloat(-1, 1) * Math.PI * 2,
      0,
      0,
      7 * 8 + randInt(0, 2),
      0, 0, 0
   );
   highTexturedParticles.push(particle);
}

export function createMagicParticle(x: number, y: number): void {
   const velocityMagnitude = randFloat(30, 40);
   const velocityDirection = randAngle();
   const velocityX = velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityMagnitude * Math.cos(velocityDirection);

   const lifetime = randFloat(0.3, 0.5);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.3);
   }
   particle.getScale = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.5);
   }
   
   const angularVelocity = randFloat(-Math.PI, Math.PI) * 2;

   // @Incomplete: fade between dark and light?
   const r = 187;
   const g = 74;
   const b = 240;
   
   const scale = randFloat(1, 1.35);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      4 * scale, 4 * scale,
      x, y,
      velocityX, velocityY,
      0, 0,
      0,
      randAngle(),
      angularVelocity,
      0,
      Math.abs(angularVelocity) / lifetime / 1.5,
      r / 255, g / 255, b / 255
   );
   highMonocolourParticles.push(particle);
}

const HEALING_PARTICLE_TEXTURE_INDEXES = [3 * 8 + 1, 3 * 8 + 2, 3 * 8 + 3];

export function createHealingParticle(position: Point, size: number): void {
   const moveSpeed = randFloat(20, 30);
   const moveDirection = randAngle();
   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);
   
   const lifetime = randFloat(0.8, 1.2);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - particle.age / lifetime;
   }

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      64, 64,
      position.x, position.y,
      velocityX, velocityY,
      0, 0,
      0,
      0,
      0,
      0,
      0,
      HEALING_PARTICLE_TEXTURE_INDEXES[size],
      0, 0, 0
   );
   highTexturedParticles.push(particle);
}

export function createSnowflakeParticle(x: number, y: number): void {
   const moveSpeed = randFloat(20, 30);
   const moveDirection = randAngle();
   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);
   
   const lifetime = randFloat(0.8, 1.2);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - particle.age / lifetime;
   }

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      64, 64,
      x, y,
      velocityX, velocityY,
      0, 0,
      0,
      0,
      0,
      0,
      0,
      6 * 8 + randInt(1, 6),
      0, 0, 0
   );
   highTexturedParticles.push(particle);
}

export function createPaperParticle(x: number, y: number): void {
   const moveSpeed = randFloat(20, 30);
   const moveDirection = randAngle();
   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);
   
   const lifetime = randFloat(1.5, 1.9);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - Math.pow(particle.age / lifetime, 3);
   }

   const angularFrictionMagnitude = randFloat(2, 3.5);

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      64, 64,
      x, y,
      velocityX, velocityY,
      0, 0,
      moveSpeed / lifetime * 1.1,
      randAngle(),
      angularFrictionMagnitude * randSign(),
      0,
      angularFrictionMagnitude / lifetime * 1.1,
      3 * 8 + randInt(5, 6),
      0, 0, 0
   );
   highTexturedParticles.push(particle);
}

const getFlowerTextureIndex = (flowerType: number, size: CactusFlowerSize): number => {
   switch (flowerType) {
      case 0: {
         if (size === CactusFlowerSize.small) {
            return 8 * 2;
         } else {
            return 8 * 2 + 4;
         }
      }
      case 1: {
         if (size === CactusFlowerSize.small) {
            return 8 * 2 + 1;
         } else {
            return 8 * 2 + 5;
         }
      }
      case 2: {
         if (size === CactusFlowerSize.small) {
            return 8 * 2 + 2;
         } else {
            return 8 * 2 + 6;
         }
      }
      case 3: {
         if (size === CactusFlowerSize.small) {
            return 8 * 2 + 3;
         } else {
            return 8 * 2 + 7;
         }
      }
      case 4: {
         return 8 * 3;
      }
      default: {
         throw new Error(`Unknown flower type '${flowerType}'.`);
      }
   }
}

export function createFlowerParticle(spawnPositionX: number, spawnPositionY: number, flowerType: number, size: CactusFlowerSize, rotation: number): void {
   const velocityMagnitude = randFloat(30, 50);
   const velocityDirection = randAngle();
   const velocityX = velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityMagnitude * Math.cos(velocityDirection);
   
   const lifetime = randFloat(3, 5);

   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - Math.pow(particle.age / lifetime, 3);
   }
   
   const textureIndex = getFlowerTextureIndex(flowerType, size);
   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      64, 64,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      75,
      rotation,
      Math.PI * randFloat(-1, 1),
      0,
      1.5 * Math.PI,
      textureIndex,
      0, 0, 0
   );
   lowTexturedParticles.push(particle);
}

export function createCactusSpineParticle(transformComponent: TransformComponent, offset: number, flyDir: number): void {
   const hitbox = transformComponent.hitboxes[0];
   
   // @Speed: Garbage collection
   const spawnPosition = polarVec2(offset, flyDir);
   spawnPosition.add(hitbox.box.position);
   
   const lifetime = randFloat(0.2, 0.3);

   const velocity = polarVec2(randFloat(150, 200), flyDir);

   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - particle.age / lifetime;
   };

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      4, 16,
      spawnPosition.x, spawnPosition.y,
      velocity.x, velocity.y,
      0, 0,
      0,
      flyDir,
      0,
      0,
      0,
      0, 0, 0
   );
   highMonocolourParticles.push(particle);
}

export function createSawdustCloud(x: number, y: number): void {
   const lifetime = randFloat(0.4, 0.7);
   
   const moveSpeed = randFloat(75, 150);
   const moveDirection = randAngle();
   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);

   const opacity = randFloat(0.7, 1);
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return (1 - particle.age / lifetime) * opacity;
   };
   
   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      64, 64,
      x, y,
      velocityX, velocityY,
      0, 0,
      0,
      randAngle(),
      randFloat(-1, 1) * Math.PI * 2,
      0,
      0,
      6 * 8,
      0, 0, 0
   );
   highTexturedParticles.push(particle);
}

export function createDustCloud(x: number, y: number): void {
   const lifetime = randFloat(0.4, 0.7);
   
   const moveSpeed = randFloat(75, 150);
   const moveDirection = randAngle();
   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);

   const opacity = randFloat(0.7, 1);
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return (1 - particle.age / lifetime) * opacity;
   };
   
   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      64, 64,
      x, y,
      velocityX, velocityY,
      0, 0,
      0,
      randAngle(),
      randFloat(-1, 1) * Math.PI * 2,
      0,
      0,
      4 * 8 + 3,
      0, 0, 0
   );
   highTexturedParticles.push(particle);
}
      
const ARROW_DESTROY_PARTICLE_GRAY_COLOUR = [0.6, 0.6, 0.6];
const ARROW_DESTROY_PARTICLE_BROWN_COLOUR = [135/255, 75/255, 28/255];
const ARROW_DESTROY_PARTICLE_ADD_VELOCITY = 80;

export function createArrowDestroyParticle(originX: number, originY: number, velocityX: number, velocityY: number): void {
   // Offset weighted further out
   const spawnOffsetMagnitude = Math.pow(Math.random(), 0.5) * 40;
   const spawnOffsetDirection = randAngle();
   const spawnPositionX = originX + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
   const spawnPositionY = originY + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

   let velocityMagnitude = randFloat(60, 80);
   const velocityDirection = spawnOffsetDirection + randFloat(1, -1);
   let particleVelocityX = velocityMagnitude * Math.sin(velocityDirection);
   let particleVelocityY = velocityMagnitude * Math.cos(velocityDirection);
   
   // Add the destroy velocity
   const arrowVelocityLength = Math.sqrt(velocityX * velocityX + velocityY + velocityY);
   const velocityAddMagnitude = ARROW_DESTROY_PARTICLE_ADD_VELOCITY * Math.random();
   particleVelocityX += velocityAddMagnitude * velocityX / arrowVelocityLength;
   particleVelocityY += velocityAddMagnitude * velocityY / arrowVelocityLength;
   
   const lifetime = randFloat(0.3, 0.5);
   
   const angularVelocity = randFloat(-Math.PI, Math.PI) * 2;
   
   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - Math.pow(particle.age / lifetime, 2);
   }
   
   let r: number;
   let g: number;
   let b: number;
   if (Math.random() < 0.5) {
      // Gray colour
      r = ARROW_DESTROY_PARTICLE_GRAY_COLOUR[0];
      g = ARROW_DESTROY_PARTICLE_GRAY_COLOUR[1];
      b = ARROW_DESTROY_PARTICLE_GRAY_COLOUR[2];
   } else {
      // Brown colour
      r = ARROW_DESTROY_PARTICLE_BROWN_COLOUR[0];
      g = ARROW_DESTROY_PARTICLE_BROWN_COLOUR[1];
      b = ARROW_DESTROY_PARTICLE_BROWN_COLOUR[2];
   }
   
   const size = randInt(4, 6);
   
   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      size, size,
      spawnPositionX, spawnPositionY,
      particleVelocityX, particleVelocityY,
      0, 0,
      velocityMagnitude / lifetime / 1.5,
      randAngle(),
      angularVelocity,
      0,
      Math.abs(angularVelocity) / lifetime / 1.5,
      r, g, b
   )
   lowMonocolourParticles.push(particle);
}

export function createBiteParticle(spawnPositionX: number, spawnPositionY: number): void {
   const lifetime = 0.4;

   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - Math.pow(particle.age / lifetime, 1.5);
   }

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      64, 64,
      spawnPositionX, spawnPositionY,
      0, 0,
      0, 0,
      0,
      Math.PI,
      0,
      0,
      0,
      8 * 3 + 4,
      0, 0, 0
   );

   highTexturedParticles.push(particle);
}

export function createBlueBloodPoolParticle(originX: number, originY: number, spawnRange: number): void {
   const lifetime = 11;

   const offsetMagnitude = spawnRange * Math.random();
   const offsetDirection = randAngle();
   const spawnPositionX = originX + offsetMagnitude * Math.sin(offsetDirection);
   const spawnPositionY = originY + offsetMagnitude * Math.cos(offsetDirection);

   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - particle.age / lifetime;
   };

   const textureIndex = randInt(0, 2);
   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      64, 64,
      spawnPositionX, spawnPositionY,
      0, 0,
      0, 0,
      0,
      randAngle(),
      0,
      0,
      0,
      textureIndex,
      randFloat(-1, -0.7), randFloat(0.3, 0.5), 1
   );
   lowTexturedParticles.push(particle);
}

export function createBlueBloodParticle(size: BloodParticleSize, spawnPositionX: number, spawnPositionY: number, moveDirection: number, moveSpeed: number, hasDrag: boolean): void {
   const lifetime = randFloat(0.3, 0.4);
   
   const pixelSize = size === BloodParticleSize.large ? 8 : 4;

   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);

   const friction = hasDrag ? moveSpeed / lifetime / 1.2 : 0;

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - particle.age / lifetime;
   };

   const r = randFloat(0, 0.35);
   const g = randFloat(0.5, 0.65);
   const b = randFloat(0.75, 0.9);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      pixelSize, pixelSize,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      friction,
      randAngle(),
      0,
      0,
      0,
      r, g, b
   );
   highMonocolourParticles.push(particle);
}

const BLUE_BLOOD_FOUNTAIN_RAY_COUNT = 7;

export function createBlueBloodParticleFountain(transformComponent: TransformComponent, interval: number, speedMultiplier: number): void {
   const hitbox = transformComponent.hitboxes[0];
   const offset = randAngle();

   for (let i = 0; i < 6; i++) {
      addTickCallback(interval * (i + 1), () => {
         for (let j = 0; j < BLUE_BLOOD_FOUNTAIN_RAY_COUNT; j++) {
            let moveDirection = 2 * Math.PI / BLOOD_FOUNTAIN_RAY_COUNT * j + offset;
            moveDirection += randFloat(-0.3, 0.3);

            createBlueBloodParticle(BloodParticleSize.large, hitbox.box.position.x, hitbox.box.position.y, moveDirection, randFloat(100, 200) * speedMultiplier, false);
         }
      });
   }
}

export function createWoodShardParticle(originX: number, originY: number, offset: number): void {
   const spawnOffsetDirection = randAngle();
   const spawnPositionX = originX + offset * Math.sin(spawnOffsetDirection);
   const spawnPositionY = originY + offset * Math.cos(spawnOffsetDirection);

   const velocityMagnitude = randFloat(80, 140);
   const velocityDirection = randAngle();
   const velocityX = velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityMagnitude * Math.cos(velocityDirection);

   const lifetime = randFloat(3.5, 5);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.3);
   }
   
   const colourLerp = Math.random();
   const r = lerp(197/255, 215/255, colourLerp);
   const g = lerp(151/255, 180/255, colourLerp);
   const b = lerp(68/255, 97/255, colourLerp);

   const angularVelocity = randFloat(-Math.PI, Math.PI) * 2;

   const width = randFloat(10, 18);
   const height = randFloat(4, 8);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      width, height,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      velocityMagnitude,
      randAngle(),
      angularVelocity,
      0,
      Math.abs(angularVelocity),
      r, g, b
   );
   lowMonocolourParticles.push(particle);
}

export function createLightWoodSpeckParticle(originX: number, originY: number, offset: number): void {
   const spawnOffsetDirection = randAngle();
   const spawnPositionX = originX + offset * Math.sin(spawnOffsetDirection);
   const spawnPositionY = originY + offset * Math.cos(spawnOffsetDirection);

   const velocityMagnitude = randFloat(60, 80);
   const velocityDirection = spawnOffsetDirection + randFloat(1, -1);
   const velocityX = velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityMagnitude * Math.cos(velocityDirection);

   const lifetime = randFloat(0.3, 0.4);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.5);
   }
   
   const colourLerp = Math.random();
   const r = lerp(197/255, 215/255, colourLerp);
   const g = lerp(151/255, 180/255, colourLerp);
   const b = lerp(68/255, 97/255, colourLerp);

   const angularVelocity = randFloat(-Math.PI, Math.PI) * 2;

   const scale = randFloat(1, 1.8);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      4 * scale, 4 * scale,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      0,
      randAngle(),
      angularVelocity,
      0,
      Math.abs(angularVelocity) / lifetime / 1.5,
      r, g, b
   );
   lowMonocolourParticles.push(particle);
}

export function createColouredParticle(x: number, y: number, moveSpeed: number, r: number, g: number, b: number): void {
   const lifetime = randFloat(0.6, 0.8);

   const velocityDirection = randAngle();
   const velocityX = moveSpeed * Math.sin(velocityDirection);
   const velocityY = moveSpeed * Math.cos(velocityDirection);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - particle.age / lifetime;
   };

   // @Temporary
   // const pixelSize = 4 * randInt(1, 2);
   const pixelSize = randInt(6, 8);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      pixelSize, pixelSize,
      x, y,
      velocityX, velocityY,
      0, 0,
      0,
      randAngle(),
      0,
      0,
      0,
      r, g, b
   );
   lowMonocolourParticles.push(particle);
}

export function createTitleObtainParticle(x: number, y: number, vx: number, vy: number, rotation: number): void {
   const lifetime = randFloat(0.7, 1);

   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      const progress = particle.age / lifetime;
      return 1 - progress * progress;
   };

   const reducedColour = randInt(0, 2);
   const r = reducedColour === 0 ? randFloat(-1, -0.5) : randFloat(-0.5, 0);
   const g = reducedColour === 1 ? randFloat(-1, -0.5) : randFloat(-0.5, 0);
   const b = reducedColour === 2 ? randFloat(-1, -0.5) : randFloat(-0.5, 0);

   const sizeMult = randInt(1, 3) / 8 + 1;
   
   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      64 * sizeMult, 64 * sizeMult,
      x, y,
      vx, vy,
      0, 0,
      30,
      rotation,
      randFloat(2, 5) * randSign(),
      3,
      0,
      8 * 3 + 7,
      r, g, b
   );
   lowTexturedParticles.push(particle);
}

export function createSprintParticle(x: number, y: number, vx: number, vy: number): void {
   const lifetime = randFloat(0.7, 1);
   const opacityMult = randFloat(0.5, 0.75);

   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      const progress = particle.age / lifetime;
      return (1 - progress * progress) * opacityMult;
   };

   const size = randInt(0, 1) * 2 + 4;
   
   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      size, size,
      x, y,
      vx, vy,
      0, 0,
      0,
      randAngle(),
      randFloat(2, 5) * randSign(),
      3,
      0,
      1, 1, 1
   );
   lowMonocolourParticles.push(particle);
}

export function createConversionParticle(x: number, y: number, vx: number, vy: number): void {
   const lifetime = randFloat(0.75, 1.3);

   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      const progress = particle.age / lifetime;
      return (1 - progress * progress);
   };

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      64, 64,
      x, y,
      vx, vy,
      0, 0,
      0,
      randAngle(),
      randFloat(Math.PI*2.5,Math.PI * 4) * randSign(),
      0,
      0,
      8 * 4 + 4,
      0, 0, 0
   );
   lowTexturedParticles.push(particle);
}

export function createSparkParticle(x: number, y: number): void {
   const lifetime = randFloat(0.2, 0.25);
   const opacityMult = randFloat(0.5, 0.75);

   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      const progress = particle.age / lifetime;
      return (1 - progress * progress) * opacityMult;
   };

   const velocityMagnitude = randFloat(180, 250);
   const velocityDirection = randAngle();
   const vx = velocityMagnitude * Math.sin(velocityDirection);
   const vy = velocityMagnitude * Math.cos(velocityDirection);

   const height = Math.random() < 0.5 ? 8 : 4;
   
   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      4, height,
      x, y,
      vx, vy,
      0, 0,
      velocityMagnitude / lifetime / 1.3,
      velocityDirection,
      0,
      3,
      0,
      1, 1, 1
   );
   highMonocolourParticles.push(particle);
}

export function createGrowthParticle(x: number, y: number): void {
   const opacityMult = randFloat(0.5, 1);
   
   const lifetime = randFloat(0.8, 1.1);

   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      const progress = particle.age / lifetime;
      return (1 - progress * progress) * opacityMult;
   };

   const velocityMagnitude = randFloat(22, 35);
   const velocityDirection = randAngle();
   const vx = velocityMagnitude * Math.sin(velocityDirection);
   const vy = velocityMagnitude * Math.cos(velocityDirection);

   const minCol = [87/255, 245/255, 66/255];
   const maxCol = [176/255, 255/255, 166/255];
   const colourLerp = Math.random();
   
   // const size = Math.random() < 0.5 ? 4 : 6;
   const size = 4;
   
   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      size, size,
      x, y,
      vx, vy,
      0, 0,
      2,
      randAngle(),
      randFloat(2, 5) * randSign(),
      3,
      0,
      lerp(minCol[0], maxCol[0], colourLerp), lerp(minCol[1], maxCol[1], colourLerp), lerp(minCol[2], maxCol[2], colourLerp)
      // minCol[0], minCol[1], minCol[2]
   );
   highMonocolourParticles.push(particle);
}

const createFrozenYetiBloodParticle = (size: BloodParticleSize, spawnPositionX: number, spawnPositionY: number, moveDirection: number, moveSpeed: number, hasDrag: boolean, extraVelocityX: number, extraVelocityY: number): void => {
   const lifetime = randFloat(0.3, 0.4);
   
   const pixelSize = size === BloodParticleSize.large ? 8 : 4;

   const velocityX = moveSpeed * Math.sin(moveDirection) + extraVelocityX;
   const velocityY = moveSpeed * Math.cos(moveDirection) + extraVelocityY;

   const friction = hasDrag ? moveSpeed / lifetime / 1.2 : 0;

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - particle.age / lifetime;
   };

   let r = 90/255;
   let g = 159/255;
   let b = 205/255;
   const darkenFactor = randFloat(-0.3, 0.2);
   r -= darkenFactor;
   g -= darkenFactor;
   b -= darkenFactor;

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      pixelSize, pixelSize,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      friction,
      randAngle(),
      0,
      0,
      0,
      r, g, b
   );
   highMonocolourParticles.push(particle);
}

export function createDeepFrostHeartBloodParticles(originX: number, originY: number, extraVelocityX: number, extraVelocityY: number): void {
   if (tickIntervalHasPassed(0.4)) {
      for (let i = 0; i < 6; i++) {
         const spawnPositionOffsetMagnitude = 13;
         const spawnPositionOffsetDirection = randAngle();
         const spawnPositionX = originX + spawnPositionOffsetMagnitude * Math.sin(spawnPositionOffsetDirection);
         const spawnPositionY = originY + spawnPositionOffsetMagnitude * Math.cos(spawnPositionOffsetDirection);
         createFrozenYetiBloodParticle(BloodParticleSize.small, spawnPositionX, spawnPositionY, randAngle(), randFloat(40, 60), true, extraVelocityX, extraVelocityY);
      }
   }
}

export function createAcidParticle(spawnPositionX: number, spawnPositionY: number): void {
   const lifetime = randFloat(0.5, 0.7);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.5);
   };

   const purp = Math.random() / 4;

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      64, 64,
      spawnPositionX, spawnPositionY,
      0, 0,
      0, 0,
      0,
      randAngle(),
      0,
      0,
      0,
      5 * 8 + 0,
      // 0, randFloat(-0.2, 0.2), 0
      lerp(0, 1, purp), lerp(randFloat(-0.2, 0.2), -1, purp), lerp(0, 1, purp)
   );
   lowTexturedParticles.push(particle);
}

const POISON_COLOUR_LOW = [34/255, 12/255, 0];
const POISON_COLOUR_HIGH = [77/255, 173/255, 38/255];

export function createPoisonParticle(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   // Calculate spawn position
   const offsetMagnitude = 20 * Math.random();
   const moveDirection = randAngle();
   const spawnPositionX = hitbox.box.position.x + offsetMagnitude * Math.sin(moveDirection);
   const spawnPositionY = hitbox.box.position.y + offsetMagnitude * Math.cos(moveDirection);

   const lifetime = randFloat(0.2, 0.3);
   
   const pixelSize = 4;

   const moveSpeed = randFloat(75, 150);
   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - particle.age / lifetime;
   };

   const colourLerp = Math.random();
   const r = lerp(POISON_COLOUR_LOW[0], POISON_COLOUR_HIGH[0], colourLerp);
   const g = lerp(POISON_COLOUR_LOW[1], POISON_COLOUR_HIGH[1], colourLerp);
   const b = lerp(POISON_COLOUR_LOW[2], POISON_COLOUR_HIGH[2], colourLerp);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      pixelSize, pixelSize,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      0,
      randAngle(),
      0,
      0,
      0,
      r, g, b
   );
   lowMonocolourParticles.push(particle);
}

export function createIceSpeckProjectile(transformComponent: TransformComponent): void {
   const hitbox = transformComponent.hitboxes[0];

   const spawnOffsetDirection = randAngle();
   const spawnPositionX = hitbox.box.position.x + 4 * Math.sin(spawnOffsetDirection);
   const spawnPositionY = hitbox.box.position.y + 4 * Math.cos(spawnOffsetDirection);

   const velocityMagnitude = randFloat(150, 300);
   const velocityDirection = spawnOffsetDirection + randFloat(-0.8, 0.8);
   const velocityX = velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityMagnitude * Math.cos(velocityDirection);
   
   const lifetime = randFloat(0.1, 0.2);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - Math.pow(particle.age / particle.lifetime, 2);
   }

   const pixelSize = Math.random() < 0.5 ? 4 : 8;

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      pixelSize,
      pixelSize,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      0,
      velocityDirection,
      0,
      0,
      0,
      140/255, 143/255, 207/255
   );
   lowMonocolourParticles.push(particle);
}

export function createBlockParticle(x: number, y: number, blockType: BlockType): void {
   const velocityMagnitude = randFloat(80, 150);
   const velocityDirection = randAngle();
   const velocityX = velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityMagnitude * Math.cos(velocityDirection);
   
   const lifetime = randFloat(0.25, 0.35);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - Math.pow(particle.age / particle.lifetime, 2);
   }

   // const pixelSize = 4;
   const pixelSize = Math.random() < 0.5 ? 4 : 8;

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      pixelSize,
      pixelSize,
      x, y,
      velocityX, velocityY,
      0, 0,
      0,
      velocityDirection,
      0,
      0,
      0,
      blockType === BlockType.toolBlock ? 255/255 : 210/255,
      blockType === BlockType.toolBlock ? 249/255 : 210/255,
      blockType === BlockType.toolBlock ? 201/255 : 210/255
   );
   highMonocolourParticles.push(particle);
}

export function createGemQuakeProjectile(transformComponent: TransformComponent): void {
   const hitbox = transformComponent.hitboxes[0];
   
   const spawnOffsetDirection = randAngle();
   const spawnPositionX = hitbox.box.position.x + 4 * Math.sin(spawnOffsetDirection);
   const spawnPositionY = hitbox.box.position.y + 4 * Math.cos(spawnOffsetDirection);

   const velocityMagnitude = randFloat(30, 60);
   const velocityDirection = randAngle();
   const velocityX = velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityMagnitude * Math.cos(velocityDirection);
   
   const lifetime = randFloat(0.7, 1.1);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - Math.pow(particle.age / particle.lifetime, 2);
   }

   const pixelSize = 4;

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      pixelSize,
      pixelSize,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      velocityMagnitude / lifetime * 1.5,
      velocityDirection,
      0,
      0,
      0,
      230/255, 45/255, 51/255
   );
   lowMonocolourParticles.push(particle);
}

export function createGenericGemParticle(hitbox: Hitbox, spawnOffsetRange: number, r: number, g: number, b: number): void {
   const spawnOffsetDirection = randAngle();
   const spawnPositionX = hitbox.box.position.x + spawnOffsetRange * Math.sin(spawnOffsetDirection);
   const spawnPositionY = hitbox.box.position.y + spawnOffsetRange * Math.cos(spawnOffsetDirection);

   const velocityMagnitude = randFloat(30, 60);
   const velocityDirection = randAngle();
   const velocityX = velocityMagnitude * Math.sin(velocityDirection);
   const velocityY = velocityMagnitude * Math.cos(velocityDirection);
   
   const lifetime = randFloat(0.7, 1.1);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      return 1 - Math.pow(particle.age / particle.lifetime, 2);
   }

   const pixelSize = 4;

   const lightness = randFloat(0, 0.6);
   r = lerp(r, 1, lightness);
   g = lerp(g, 1, lightness);
   b = lerp(b, 1, lightness);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      pixelSize,
      pixelSize,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      velocityMagnitude / lifetime * 1.5,
      velocityDirection,
      0,
      0,
      0,
      r, g, b
   );
   lowMonocolourParticles.push(particle);
}

export function createSlurbParticle(spawnPositionX: number, spawnPositionY: number, initialMoveDirection: number, moveSpeed: number, vAddX: number, vAddY: number): void {
   const lifetime = randFloat(0.4, 0.6);

   const velocityX = moveSpeed * Math.sin(initialMoveDirection);
   const velocityY = moveSpeed * Math.cos(initialMoveDirection);

   const accelerationMagnitude = randFloat(0, 80);
   const accelerationDirection = randAngle();
   const accelerationX = accelerationMagnitude * Math.sin(accelerationDirection);
   const accelerationY = accelerationDirection * Math.cos(accelerationDirection);
   
   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      const opacity = 1 - particle.age / lifetime;
      return Math.pow(opacity, 0.3);
   }

   let r: number, g: number, b: number;
   if (Math.random() < 0.5) {
      r = 181/255;
      g = 89/255;
      b = 170/255;
   } else {
      r = 152/255;
      g = 62/255;
      b = 158/255;
   }

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      8, 8,
      spawnPositionX, spawnPositionY,
      velocityX + vAddX, velocityY + vAddY,
      accelerationX, accelerationY,
      0,
      randAngle(),
      0, 
      0,
      0,
      r, g, b
   );
   highMonocolourParticles.push(particle);
}

export function createHotSparkParticle(x: number, y: number): void {
   const lifetime = randFloat(0.2, 0.25);
   const opacityMult = randFloat(0.5, 0.75);

   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      const progress = particle.age / lifetime;
      return (1 - progress * progress) * opacityMult;
   };

   const velocityMagnitude = randFloat(180, 250);
   const velocityDirection = randAngle();
   const vx = velocityMagnitude * Math.sin(velocityDirection);
   const vy = velocityMagnitude * Math.cos(velocityDirection);

   const height = Math.random() < 0.5 ? 8 : 4;

   const rHigh = 255/255;
   const gHigh = 226/255;
   const bHigh = 145/255;

   const rLow = 255/255;
   const gLow = 197/255;
   const bLow = 168/255;

   const u = Math.random();

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      4, height,
      x, y,
      vx, vy,
      0, 0,
      velocityMagnitude / lifetime / 1.3,
      velocityDirection,
      0,
      3,
      0,
      lerp(rLow, rHigh, u), lerp(gLow, gHigh, u), lerp(bLow, bHigh, u)
   );
   highMonocolourParticles.push(particle);
}

export function createKrumblidChitinParticle(spawnPositionX: number, spawnPositionY: number): void {
   const lifetime = randFloat(5, 7);

   const velocityDirection = randAngle();
   const velocityMagnitude = randFloat(60, 80);
   const vx = velocityMagnitude * Math.sin(velocityDirection);
   const vy = velocityMagnitude * Math.cos(velocityDirection);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return Math.pow(1 - particle.age / lifetime, 0.5);
   };

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      64, 64,
      spawnPositionX, spawnPositionY,
      vx, vy,
      0, 0,
      85,
      randAngle(),
      0,
      0,
      0,
      7 * 8 + randInt(3, 6),
      0, 0, 0
   );
   lowTexturedParticles.push(particle);
}

export function createAnimalStaffCommandParticle(x: number, y: number, moveDirection: number, r: number, g: number, b: number): void {
   const lifetime = randFloat(0.8, 0.9);
   const opacityMult = randFloat(0.5, 0.75);

   const particle = new Particle(lifetime);
   particle.getOpacity = () => {
      const progress = particle.age / lifetime;
      return (1 - progress * progress) * opacityMult;
   };

   const velocityMagnitude = randFloat(40, 50);
   const vx = velocityMagnitude * Math.sin(moveDirection);
   const vy = velocityMagnitude * Math.cos(moveDirection);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      4, 4,
      x, y,
      vx, vy,
      0, 0,
      0,
      moveDirection,
      0,
      0,
      0,
      r, g, b
   );
   highMonocolourParticles.push(particle);
}

export function createHeatParticle(spawnPositionX: number, spawnPositionY: number, moveDirection: number, vx: number, vy: number): void {
   const lifetime = randFloat(0.8, 1.2);
   
   const moveSpeed = randFloat(40, 60);
   const velocityX = vx + moveSpeed * Math.sin(moveDirection);
   const velocityY = vy + moveSpeed * Math.cos(moveDirection);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - Math.pow(particle.age / lifetime, 2);
   };

   // const r = lerp(BLOOD_COLOUR_LOW[0], BLOOD_COLOUR_HIGH[0], colourLerp);
   // const g = lerp(BLOOD_COLOUR_LOW[1], BLOOD_COLOUR_HIGH[1], colourLerp);
   // const b = lerp(BLOOD_COLOUR_LOW[2], BLOOD_COLOUR_HIGH[2], colourLerp);252, 119, 3
   const r = 252/255
   const g = 119/255
   const b = 3/255

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      6, 6,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      0,
      randAngle(),
      0,
      0,
      0,
      r, g, b
   );
   highMonocolourParticles.push(particle);
}

export function createPricklyPearParticle(spawnPositionX: number, spawnPositionY: number, moveDirection: number): void {
   const lifetime = randFloat(0.3, 0.4);
   
   const moveSpeed = randFloat(65, 90);
   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - Math.pow(particle.age / lifetime, 2);
   };

   // const r = lerp(BLOOD_COLOUR_LOW[0], BLOOD_COLOUR_HIGH[0], colourLerp);
   // const g = lerp(BLOOD_COLOUR_LOW[1], BLOOD_COLOUR_HIGH[1], colourLerp);
   // const b = lerp(BLOOD_COLOUR_LOW[2], BLOOD_COLOUR_HIGH[2], colourLerp);252, 119, 3
   const r = 173/255
   const g = 55/255
   const b = 111/255

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      4, 4,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      0,
      randAngle(),
      0,
      0,
      0,
      r, g, b
   );
   highMonocolourParticles.push(particle);
}

export function createCocoonAmbientParticle(spawnPositionX: number, spawnPositionY: number, moveDirection: number): void {
   const lifetime = randFloat(0.5, 0.7);
   
   const moveSpeed = randFloat(65, 90);
   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - Math.pow(particle.age / lifetime, 2);
   };

   const lowR = 148/255;
   const lowG = 137/255;
   const lowB = 78/255;
   const highR = 199/255;
   const highG = 193/255;
   const highB = 122/255;

   const u = Math.random();
   const r = lerp(lowR, highR, u);
   const g = lerp(lowG, highG, u);
   const b= lerp(lowB, highB, u);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      8, 8,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      0,
      randAngle(),
      0,
      0,
      0,
      r, g, b
   );
   highMonocolourParticles.push(particle);
}

export function createCocoonFragmentParticle(spawnPositionX: number, spawnPositionY: number, moveDirection: number): void {
   const lifetime = randFloat(0.5, 0.7);
   
   const moveSpeed = randFloat(65, 90);
   const velocityX = moveSpeed * Math.sin(moveDirection);
   const velocityY = moveSpeed * Math.cos(moveDirection);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - Math.pow(particle.age / lifetime, 2);
   };

   addTexturedParticleToBufferContainer(
      particle,
      ParticleRenderLayer.low,
      64, 64,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      85,
      randAngle(),
      0,
      0,
      0,
      5 * 8 + randInt(3, 7),
      0, 0, 0
   );
   lowTexturedParticles.push(particle);
}

export function createSandParticle(spawnPositionX: number, spawnPositionY: number, vx: number, vy: number, moveDirection: number): void {
   const lifetime = randFloat(0.3, 0.4);
   
   const moveSpeed = randFloat(40, 60);
   const velocityX = vx + moveSpeed * Math.sin(moveDirection);
   const velocityY = vy + moveSpeed * Math.cos(moveDirection);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - Math.pow(particle.age / lifetime, 2);
   };

   const lowR = 227/255;
   const lowG = 219/255;
   const lowB = 127/255;
   const highR = 239/255;
   const highG = 237/255;
   const highB = 137/255;

   const u = Math.random();
   const r = lerp(lowR, highR, u) - 0.23;
   const g = lerp(lowG, highG, u) - 0.23;
   const b = lerp(lowB, highB, u) - 0.23;

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      4, 4,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      0,
      randAngle(),
      0,
      0,
      0,
      r, g, b
   );
   highMonocolourParticles.push(particle);
}

export function createOkrenEyeParticle(spawnPositionX: number, spawnPositionY: number, vx: number, vy: number, moveDirection: number): void {
   const lifetime = randFloat(0.3, 0.4);
   
   const moveSpeed = randFloat(40, 60);
   const velocityX = vx + moveSpeed * Math.sin(moveDirection);
   const velocityY = vy + moveSpeed * Math.cos(moveDirection);

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - Math.pow(particle.age / lifetime, 2);
   };
 
   const lowR = 22/255;
   const lowG = 25/255;
   const lowB = 41/255;
   const highR = 69/255;
   const highG = 73/255;
   const highB = 96/255;

   const u = Math.random();
   const r = lerp(lowR, highR, u);
   const g = lerp(lowG, highG, u);
   const b = lerp(lowB, highB, u);

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      4, 4,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      0,
      randAngle(),
      0,
      0,
      0,
      r, g, b
   );
   highMonocolourParticles.push(particle);
}

export const enum AnimalStaffCommandType {
   follow,
   move,
   carry,
   attack
}

export function createControlCommandParticles(commandType: AnimalStaffCommandType): void {
   if (playerInstance === null) {
      return;
   }
   
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance);

   const activeItemRenderPart = inventoryUseComponent.activeItemRenderParts[0];

   const originMatrix = createTranslationMatrix(14, 14);
   matrixMultiplyInPlace(activeItemRenderPart.modelMatrix, originMatrix);
   getMatrixPosition(originMatrix);
   const origin = _point;

   let r: number;
   let g: number;
   let b: number;
   switch (commandType) {
      case AnimalStaffCommandType.follow: {
         r = 165/255;
         g = 255/255;
         b = 163/255;
         break;
      }
      case AnimalStaffCommandType.move: {
         r = 65/255;
         g = 238/255;
         b = 240/255;
         break;
      }
      case AnimalStaffCommandType.carry: {
         r = 237/255;
         g = 172/255;
         b = 19/255;
         break;
      }
      case AnimalStaffCommandType.attack: {
         r = 237/255;
         g = 0/255;
         b = 0/255;
         break;
      }
   }

   const n = 20;
   for (let i = 0; i < n; i++) {
      const offsetDirection = 2 * Math.PI * i / n;
      const offsetMagnitude = 15;
      const x = origin.x + offsetMagnitude * Math.sin(offsetDirection);
      const y = origin.y + offsetMagnitude * Math.cos(offsetDirection);
      createAnimalStaffCommandParticle(x, y, offsetDirection, r, g, b);
   }

   let soundFile: string;
   switch (commandType) {
      case AnimalStaffCommandType.follow: {
         soundFile = "animal-staff-command-follow.mp3";
         break;
      }
      case AnimalStaffCommandType.move: {
         soundFile = "animal-staff-command-move.mp3";
         break;
      }
      case AnimalStaffCommandType.carry: {
         soundFile = "animal-staff-command-carry.mp3";
         break;
      }
      case AnimalStaffCommandType.attack: {
         soundFile = "animal-staff-command-attack.mp3";
         break;
      }
   }
   playHeadSound(soundFile, 1.3, 1);
}
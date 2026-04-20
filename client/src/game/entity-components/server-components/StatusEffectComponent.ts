import { Entity, customTickIntervalHasPassed, lerp, randAngle, randFloat, randItem, PacketReader, StatusEffect, StatusEffectData, ServerComponentType, _point, Settings } from "webgl-test-shared";
import { playSoundOnHitbox } from "../../sound";
import Particle from "../../Particle";
import { createPoisonBubble, createBloodParticle, BloodParticleSize, createHeatParticle } from "../../particles";
import { addTexturedParticleToBufferContainer, ParticleRenderLayer, addMonocolourParticleToBufferContainer, ParticleColour, lowTexturedParticles, highMonocolourParticles, highTexturedParticles } from "../../rendering/webgl/particle-rendering";
import { Light, removeLight } from "../../lights";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import { EntityComponentData, getEntityRenderObject } from "../../world";
import { ComponentTint, createComponentTint } from "../../EntityRenderObject";
import { playerInstance } from "../../player";
import { getHitboxVelocity } from "../../hitboxes";
import { tickIntervalHasPassed } from "../../game";
import { getEntityServerComponentTypes } from "../../entity-component-types";
import { getServerComponentData } from "../../entity-component-types";

export interface StatusEffectComponentData {
   readonly statusEffects: Array<StatusEffectData>;
}

export interface StatusEffectComponent {
   burningLight: Light | null;
   
   // @Cleanup: should be readonly!
   statusEffects: Array<StatusEffectData>;
}

const BURNING_PARTICLE_COLOURS: ReadonlyArray<ParticleColour> = [
   [255/255, 102/255, 0],
   [255/255, 184/255, 61/255]
];

const BURNING_SMOKE_PARTICLE_FADEIN_TIME = 0.15;

const hasStatusEffect = (statusEffectComponent: StatusEffectComponent, type: StatusEffect): boolean => {
   for (const statusEffect of statusEffectComponent.statusEffects) {
      if (statusEffect.type === type) {
         return true;
      }
   }
   return false;
}

const getStatusEffect = (statusEffectComponent: StatusEffectComponent, type: StatusEffect): StatusEffectData | null => {
   for (const statusEffect of statusEffectComponent.statusEffects) {
      if (statusEffect.type === type) {
         return statusEffect;
      }
   }
   return null;
}

export const StatusEffectComponentArray = new ServerComponentArray<StatusEffectComponent, StatusEffectComponentData, never>(ServerComponentType.statusEffect, true, createComponent, getMaxRenderParts, decodeData);
StatusEffectComponentArray.onTick = onTick;
StatusEffectComponentArray.updateFromData = updateFromData;
StatusEffectComponentArray.updatePlayerFromData = updatePlayerFromData;
StatusEffectComponentArray.calculateTint = calculateTint;

export function createStatusEffectComponentData(): StatusEffectComponentData {
   return {
      statusEffects: []
   };
}

function decodeData(reader: PacketReader): StatusEffectComponentData {
   const statusEffects: Array<StatusEffectData> = [];
   const numStatusEffects = reader.readNumber();
   for (let i = 0; i < numStatusEffects; i++) {
      const type = reader.readNumber() as StatusEffect;
      const ticksElapsed = reader.readNumber();

      const statusEffectData: StatusEffectData = {
         type: type,
         ticksElapsed: ticksElapsed
      }
      statusEffects.push(statusEffectData);
   }

   return {
      statusEffects: statusEffects
   };
}

function createComponent(entityComponentData: EntityComponentData): StatusEffectComponent {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const statusEffectComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.statusEffect);
   return {
      statusEffects: statusEffectComponentData.statusEffects,
      burningLight: null
   };
}

function getMaxRenderParts(): number {
   return 0;
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   
   const statusEffectComponent = StatusEffectComponentArray.getComponent(entity);
   
   const poisonStatusEffect = getStatusEffect(statusEffectComponent, StatusEffect.poisoned);
   if (poisonStatusEffect !== null) {
      // Poison particles
      if (customTickIntervalHasPassed(poisonStatusEffect.ticksElapsed, 0.1)) {
         const spawnOffsetMagnitude = 30 * Math.random();
         const spawnOffsetDirection = randAngle()
         const spawnPositionX = hitbox.box.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = hitbox.box.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

         const lifetime = 2;
         
         const particle = new Particle(lifetime);
         particle.getOpacity = () => {
            return lerp(0.75, 0, particle.age / lifetime);
         }

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
            6,
            0, 0, 0
         );
         lowTexturedParticles.push(particle);
      }

      // Poison bubbles
      if (customTickIntervalHasPassed(poisonStatusEffect.ticksElapsed, 0.1)) {
         const spawnOffsetMagnitude = 30 * Math.random();
         const spawnOffsetDirection = randAngle()
         const spawnPositionX = hitbox.box.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = hitbox.box.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

         createPoisonBubble(spawnPositionX, spawnPositionY, randFloat(0.4, 0.6));
      }
   }

   const fireStatusEffect = getStatusEffect(statusEffectComponent, StatusEffect.burning);
   if (fireStatusEffect !== null) {
      if (statusEffectComponent.burningLight === null) {
         // @INCOMPLETE
         
         // statusEffectComponent.burningLight = createLight(
         //    new Point(0, 0),
         //    1,
         //    2.5,
         //    0.3,
         //    0,
         //    0,
         //    0
         // );

         // // @Hack
         // const renderObject = getEntityRenderObject(entity);
         // attachLightToRenderPart(statusEffectComponent.burningLight, renderObject.renderPartsByZIndex[0], entity);
      }
      
      // Ember particles
      if (customTickIntervalHasPassed(fireStatusEffect.ticksElapsed, 0.1)) {
         const spawnOffsetMagnitude = 30 * Math.random();
         const spawnOffsetDirection = randAngle();
         const spawnPositionX = hitbox.box.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = hitbox.box.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

         const lifetime = randFloat(0.6, 1.2);

         const velocityMagnitude = randFloat(100, 140);
         const velocityDirection = randAngle();
         const velocityX = velocityMagnitude * Math.sin(velocityDirection);
         const velocityY = velocityMagnitude * Math.cos(velocityDirection);

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
            velocityX, velocityY,
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

      // Smoke particles
      if (customTickIntervalHasPassed(fireStatusEffect.ticksElapsed, 3/20)) {
         const spawnOffsetMagnitude = 20 * Math.random();
         const spawnOffsetDirection = randAngle();
         const spawnPositionX = hitbox.box.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = hitbox.box.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

         const accelerationDirection = randAngle();
         const accelerationX = 40 * Math.sin(accelerationDirection);
         let accelerationY = 40 * Math.cos(accelerationDirection);

         // Weight the smoke to accelerate more upwards
         accelerationY += 10;

         const lifetime = randFloat(1.75, 2.25);

         const particle = new Particle(lifetime);
         particle.getOpacity = (): number => {
            if (particle.age <= BURNING_SMOKE_PARTICLE_FADEIN_TIME) {
               return particle.age / BURNING_SMOKE_PARTICLE_FADEIN_TIME;
            }
            return lerp(0.75, 0, (particle.age - BURNING_SMOKE_PARTICLE_FADEIN_TIME) / (lifetime - BURNING_SMOKE_PARTICLE_FADEIN_TIME));
         }
         particle.getScale = (): number => {
            const deathProgress = particle.age / lifetime
            return 1 + deathProgress * 1.5;
         }

         addTexturedParticleToBufferContainer(
            particle,
            ParticleRenderLayer.high,
            64, 64,
            spawnPositionX, spawnPositionY,
            0, 50,
            accelerationX, accelerationY,
            0,
            randAngle(),
            randFloat(-Math.PI, Math.PI),
            randFloat(-Math.PI, Math.PI) / 2,
            0,
            5,
            0, 0, 0
         );
         highTexturedParticles.push(particle);
      }
   } else if (statusEffectComponent.burningLight !== null) {
      removeLight(statusEffectComponent.burningLight);
      statusEffectComponent.burningLight = null;
   }

   const bleedingStatusEffect = getStatusEffect(statusEffectComponent, StatusEffect.bleeding);
   if (bleedingStatusEffect !== null) {
      if (tickIntervalHasPassed(0.15 * Settings.TICK_RATE)) {
         const spawnOffsetDirection = randAngle();
         const spawnPositionX = hitbox.box.position.x + 32 * Math.sin(spawnOffsetDirection);
         const spawnPositionY = hitbox.box.position.y + 32 * Math.cos(spawnOffsetDirection);
         createBloodParticle(Math.random() < 0.5 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, randAngle(), randFloat(40, 60), true);
      }
   }

   const heatSicknessStatusEffect = getStatusEffect(statusEffectComponent, StatusEffect.heatSickness);
   if (heatSicknessStatusEffect !== null) {
      if (tickIntervalHasPassed(0.15 * Settings.TICK_RATE)) {
         getHitboxVelocity(hitbox);
         const hitboxVelocity = _point;
         
         const spawnOffsetDirection = randAngle();
         const spawnPositionX = hitbox.box.position.x + 32 * Math.sin(spawnOffsetDirection);
         const spawnPositionY = hitbox.box.position.y + 32 * Math.cos(spawnOffsetDirection);
         createHeatParticle(spawnPositionX, spawnPositionY, randAngle(), hitboxVelocity.x, hitboxVelocity.y);
      }
   }
}

function updateFromData(data: StatusEffectComponentData, entity: Entity): void {
   const statusEffectComponent = StatusEffectComponentArray.getComponent(entity);

   const previousHasFreezing = hasStatusEffect(statusEffectComponent, StatusEffect.freezing);
   
   for (const statusEffectData of data.statusEffects) {
      if (!hasStatusEffect(statusEffectComponent, statusEffectData.type)) {
         switch (statusEffectData.type) {
            case StatusEffect.freezing: {
               const transformComponent = TransformComponentArray.getComponent(entity);
               const hitbox = transformComponent.hitboxes[0];
               playSoundOnHitbox("freezing.mp3", 0.4, 1, entity, hitbox, false);
               break;
            }
         }
      }
   }
   
   // @Speed @Garbage
   statusEffectComponent.statusEffects = data.statusEffects;

   const newHasFreezing = hasStatusEffect(statusEffectComponent, StatusEffect.freezing);
   if (newHasFreezing !== previousHasFreezing) {
      const renderObject = getEntityRenderObject(entity);
      renderObject.recalculateTint();
   }
}

function updatePlayerFromData(data: StatusEffectComponentData): void {
   updateFromData(data, playerInstance!);
}

function calculateTint(entity: Entity): ComponentTint {
   const statusEffectComponent = StatusEffectComponentArray.getComponent(entity);
   if (hasStatusEffect(statusEffectComponent, StatusEffect.freezing)) {
      return createComponentTint(-0.15, 0, 0.5);
   } else {
      return createComponentTint(0, 0, 0);
   }
}
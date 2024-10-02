import { ServerComponentType } from "battletribes-shared/components";
import { StatusEffectData } from "battletribes-shared/client-server-types";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point, customTickIntervalHasPassed, lerp, randFloat, randItem } from "battletribes-shared/utils";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { playSound } from "../sound";
import Board from "../Board";
import Particle from "../Particle";
import { createPoisonBubble, createBloodParticle, BloodParticleSize } from "../particles";
import { addTexturedParticleToBufferContainer, ParticleRenderLayer, addMonocolourParticleToBufferContainer, ParticleColour } from "../rendering/webgl/particle-rendering";
import { Light, addLight, attachLightToEntity, removeLight } from "../lights";
import { PacketReader } from "battletribes-shared/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";

const BURNING_PARTICLE_COLOURS: ReadonlyArray<ParticleColour> = [
   [255/255, 102/255, 0],
   [255/255, 184/255, 61/255]
];

const BURNING_SMOKE_PARTICLE_FADEIN_TIME = 0.15;

class StatusEffectComponent extends ServerComponent {
   public burningLight: Light | null = null;
   
   public statusEffects = new Array<StatusEffectData>();

   public padData(reader: PacketReader): void {
      const numStatusEffects = reader.readNumber();
      reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT * numStatusEffects);
   }

   public updateFromData(reader: PacketReader): void {
      // @Temporary @Speed
      const statusEffects = new Array<StatusEffectData>();
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
      
      for (const statusEffectData of statusEffects) {
         if (!this.hasStatusEffect(statusEffectData.type)) {
            switch (statusEffectData.type) {
               case StatusEffect.freezing: {
                  const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);
                  playSound("freezing.mp3", 0.4, 1, transformComponent.position)
                  break;
               }
            }
         }
      }
      
      this.statusEffects = statusEffects;
   }

   public updatePlayerFromData(reader: PacketReader): void {
      this.updateFromData(reader);
   }

   public hasStatusEffect(type: StatusEffect): boolean {
      for (const statusEffect of this.statusEffects) {
         if (statusEffect.type === type) {
            return true;
         }
      }
      return false;
   }

   public getStatusEffect(type: StatusEffect): StatusEffectData | null {
      for (const statusEffect of this.statusEffects) {
         if (statusEffect.type === type) {
            return statusEffect;
         }
      }
      return null;
   }
}

export default StatusEffectComponent;

export const StatusEffectComponentArray = new ComponentArray<StatusEffectComponent>(ComponentArrayType.server, ServerComponentType.statusEffect, true, {
   onTick: onTick
});

function onTick(statusEffectComponent: StatusEffectComponent): void {
   if (statusEffectComponent.hasStatusEffect(StatusEffect.freezing)) {
      statusEffectComponent.setTint(-0.15, 0, 0.5);
   } else {
      statusEffectComponent.setTint(0, 0, 0);
   }

   const transformComponent = statusEffectComponent.entity.getServerComponent(ServerComponentType.transform);
   
   const poisonStatusEffect = statusEffectComponent.getStatusEffect(StatusEffect.poisoned);
   if (poisonStatusEffect !== null) {
      // Poison particles
      if (customTickIntervalHasPassed(poisonStatusEffect.ticksElapsed, 0.1)) {
         const spawnOffsetMagnitude = 30 * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random()
         const spawnPositionX = transformComponent.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = transformComponent.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

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
            2 * Math.PI * Math.random(),
            0,
            0,
            0,
            6,
            0, 0, 0
         );
         Board.lowTexturedParticles.push(particle);
      }

      // Poison bubbles
      if (customTickIntervalHasPassed(poisonStatusEffect.ticksElapsed, 0.1)) {
         const spawnOffsetMagnitude = 30 * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random()
         const spawnPositionX = transformComponent.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = transformComponent.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

         createPoisonBubble(spawnPositionX, spawnPositionY, randFloat(0.4, 0.6));
      }
   }

   const fireStatusEffect = statusEffectComponent.getStatusEffect(StatusEffect.burning);
   if (fireStatusEffect !== null) {
      if (statusEffectComponent.burningLight === null) {
         statusEffectComponent.burningLight = {
            offset: new Point(0, 0),
            intensity: 1,
            strength: 2.5,
            radius: 0.3,
            r: 0,
            g: 0,
            b: 0
         };
         const lightID = addLight(statusEffectComponent.burningLight);
         attachLightToEntity(lightID, statusEffectComponent.entity.id);
      }
      
      // Ember particles
      if (customTickIntervalHasPassed(fireStatusEffect.ticksElapsed, 0.1)) {
         const spawnOffsetMagnitude = 30 * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = transformComponent.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = transformComponent.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

         const lifetime = randFloat(0.6, 1.2);

         const velocityMagnitude = randFloat(100, 140);
         const velocityDirection = 2 * Math.PI * Math.random();
         const velocityX = velocityMagnitude * Math.sin(velocityDirection);
         const velocityY = velocityMagnitude * Math.cos(velocityDirection);

         const accelerationMagnitude = randFloat(0, 80);
         const accelerationDirection = 2 * Math.PI * Math.random();
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
            2 * Math.PI * Math.random(),
            0, 
            0,
            0,
            colour[0], colour[1], colour[2]
         );
         Board.highMonocolourParticles.push(particle);
      }

      // Smoke particles
      if (customTickIntervalHasPassed(fireStatusEffect.ticksElapsed, 3/20)) {
         const spawnOffsetMagnitude = 20 * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = transformComponent.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = transformComponent.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

         const accelerationDirection = 2 * Math.PI * Math.random();
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
            2 * Math.PI * Math.random(),
            randFloat(-Math.PI, Math.PI),
            randFloat(-Math.PI, Math.PI) / 2,
            0,
            5,
            0, 0, 0
         );
         Board.highTexturedParticles.push(particle);
      }
   } else if (statusEffectComponent.burningLight !== null) {
      removeLight(statusEffectComponent.burningLight);
      statusEffectComponent.burningLight = null;
   }

   const bleedingStatusEffect = statusEffectComponent.getStatusEffect(StatusEffect.bleeding);
   if (bleedingStatusEffect !== null) {
      if (Board.tickIntervalHasPassed(0.15)) {
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = transformComponent.position.x + 32 * Math.sin(spawnOffsetDirection);
         const spawnPositionY = transformComponent.position.y + 32 * Math.cos(spawnOffsetDirection);
         createBloodParticle(Math.random() < 0.5 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(40, 60), true);
      }
   }
}
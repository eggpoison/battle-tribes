import { ServerComponentType, StatusEffectComponentData } from "webgl-test-shared/dist/components";
import { StatusEffectData } from "webgl-test-shared/dist/client-server-types";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point, customTickIntervalHasPassed, lerp, randFloat, randItem } from "webgl-test-shared/dist/utils";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { playSound } from "../sound";
import Board from "../Board";
import Particle from "../Particle";
import { createPoisonBubble, createBloodParticle, BloodParticleSize } from "../particles";
import { addTexturedParticleToBufferContainer, ParticleRenderLayer, addMonocolourParticleToBufferContainer, ParticleColour } from "../rendering/particle-rendering";
import { Light, addLight, attachLightToEntity, removeLight } from "../lights";

const BURNING_PARTICLE_COLOURS: ReadonlyArray<ParticleColour> = [
   [255/255, 102/255, 0],
   [255/255, 184/255, 61/255]
];

const BURNING_SMOKE_PARTICLE_FADEIN_TIME = 0.15;

class StatusEffectComponent extends ServerComponent<ServerComponentType.statusEffect> {
   private burningLight: Light | null = null;
   
   public statusEffects = new Array<StatusEffectData>()

   constructor(entity: Entity, data: StatusEffectComponentData) {
      super(entity);

      this.updateFromData(data);
   }

   public tick(): void {
      if (this.hasStatusEffect(StatusEffect.freezing)) {
         this.entity.tintB += 0.5;
         this.entity.tintR -= 0.15;
      }
      
      const poisonStatusEffect = this.getStatusEffect(StatusEffect.poisoned);
      if (poisonStatusEffect !== null) {
         // Poison particles
         if (customTickIntervalHasPassed(poisonStatusEffect.ticksElapsed, 0.1)) {
            const spawnOffsetMagnitude = 30 * Math.random();
            const spawnOffsetDirection = 2 * Math.PI * Math.random()
            const spawnPositionX = this.entity.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
            const spawnPositionY = this.entity.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

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
            const spawnPositionX = this.entity.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
            const spawnPositionY = this.entity.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

            createPoisonBubble(spawnPositionX, spawnPositionY, randFloat(0.4, 0.6));
         }
      }

      const fireStatusEffect = this.getStatusEffect(StatusEffect.burning);
      if (fireStatusEffect !== null) {
         if (this.burningLight === null) {
            this.burningLight = {
               position: new Point(0, 0),
               intensity: 1,
               strength: 2.5,
               radius: 0.3,
               r: 0,
               g: 0,
               b: 0
            };
            const lightID = addLight(this.burningLight);
            attachLightToEntity(lightID, this.entity.id);
         }
         
         // Ember particles
         if (customTickIntervalHasPassed(fireStatusEffect.ticksElapsed, 0.1)) {
            const spawnOffsetMagnitude = 30 * Math.random();
            const spawnOffsetDirection = 2 * Math.PI * Math.random();
            const spawnPositionX = this.entity.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
            const spawnPositionY = this.entity.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

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
            const spawnPositionX = this.entity.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
            const spawnPositionY = this.entity.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

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
      } else if (this.burningLight !== null) {
         removeLight(this.burningLight);
         this.burningLight = null;
      }

      const bleedingStatusEffect = this.getStatusEffect(StatusEffect.bleeding);
      if (bleedingStatusEffect !== null) {
         if (Board.tickIntervalHasPassed(0.15)) {
            const spawnOffsetDirection = 2 * Math.PI * Math.random();
            const spawnPositionX = this.entity.position.x + 32 * Math.sin(spawnOffsetDirection);
            const spawnPositionY = this.entity.position.y + 32 * Math.cos(spawnOffsetDirection);
            createBloodParticle(Math.random() < 0.5 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(40, 60), true);
         }
      }
   }

   public updateFromData(data: StatusEffectComponentData): void {
      for (const statusEffectData of data.statusEffects) {
         if (!this.hasStatusEffect(statusEffectData.type)) {
            switch (statusEffectData.type) {
               case StatusEffect.freezing: {
                  playSound("freezing.mp3", 0.4, 1, this.entity.position.x, this.entity.position.y)
                  break;
               }
            }
         }
      }
      
      this.statusEffects = data.statusEffects;
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
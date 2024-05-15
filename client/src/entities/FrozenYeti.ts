import { EntityComponentsData, ServerComponentType } from "webgl-test-shared/dist/components";
import { Point, lerp, randFloat, randInt } from "webgl-test-shared/dist/utils";
import { EntityType, FrozenYetiAttackType } from "webgl-test-shared/dist/entities";
import { HitData } from "webgl-test-shared/dist/client-server-types";
import RenderPart from "../render-parts/RenderPart";
import Player from "./Player";
import Particle from "../Particle";
import { ParticleRenderLayer, addMonocolourParticleToBufferContainer, addTexturedParticleToBufferContainer } from "../rendering/particle-rendering";
import Board from "../Board";
import { BloodParticleSize, createBlueBloodParticle, createBlueBloodParticleFountain, createBlueBloodPoolParticle, createSnowParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import FrozenYetiComponent from "../entity-components/FrozenYetiComponent";
import Entity from "../Entity";
import HealthComponent from "../entity-components/HealthComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import PhysicsComponent from "../entity-components/PhysicsComponent";

class FrozenYeti extends Entity {
   private static readonly SIZE = 152;
   private static readonly HEAD_SIZE = 80;
   private static readonly HEAD_DISTANCE = 60;

   private static readonly PAW_OFFSET = 80;
   private static readonly PAW_RESTING_ANGLE = Math.PI / 3.5;
   private static readonly PAW_HIGH_ANGLE = Math.PI / 6;

   private static readonly ROAR_ARC = Math.PI / 6;
   private static readonly ROAR_REACH = 450;
   public static readonly SNOWBALL_THROW_OFFSET = 150;
   
   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.frozenYeti>) {
      super(position, id, EntityType.frozenYeti, ageTicks);

      this.attachRenderPart(new RenderPart(
         this,
         getTextureArrayIndex("entities/frozen-yeti/frozen-yeti.png"),
         1,
         0
      ));

      const headRenderPart = new RenderPart(
         this,
         getTextureArrayIndex("entities/frozen-yeti/frozen-yeti-head.png"),
         2,
         0
      );
      headRenderPart.offset.y = FrozenYeti.HEAD_DISTANCE;
      this.attachRenderPart(headRenderPart);

      // Create paw render parts
      const pawRenderParts = new Array<RenderPart>();
      for (let i = 0; i < 2; i++) {
         const paw = new RenderPart(
            this,
            getTextureArrayIndex("entities/frozen-yeti/frozen-yeti-paw.png"),
            0,
            0
         );
         const pawOffsetDirection = FrozenYeti.PAW_RESTING_ANGLE * (i === 0 ? -1 : 1);
         paw.offset.x = FrozenYeti.PAW_OFFSET * Math.sin(pawOffsetDirection);
         paw.offset.y = FrozenYeti.PAW_OFFSET * Math.cos(pawOffsetDirection);

         this.attachRenderPart(paw);
         pawRenderParts.push(paw);
      }

      this.addServerComponent(ServerComponentType.physics, new PhysicsComponent(this, componentsData[0]))
      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[1]))
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[2]))
      this.addServerComponent(ServerComponentType.frozenYeti, new FrozenYetiComponent(this, componentsData[4], headRenderPart, pawRenderParts))
   }

   public tick(): void {
      super.tick();

      if (Player.instance === null) {
         return;
      }

      const frozenYetiComponent = this.getServerComponent(ServerComponentType.frozenYeti);
      switch (frozenYetiComponent.attackType) {
         case FrozenYetiAttackType.stomp: {
            switch (frozenYetiComponent.attackStage) {
               // Windup
               case 0: {
                  frozenYetiComponent.headRenderPart.shakeAmount = lerp(1, 2, frozenYetiComponent.stageProgress);
                  for (let i = 0; i < 2; i++) {
                     frozenYetiComponent.pawRenderParts[i].shakeAmount = lerp(1, 2, frozenYetiComponent.stageProgress);
                  }
                  break;
               }
               case 1: {
                  frozenYetiComponent.headRenderPart.shakeAmount = 0;
                  for (let i = 0; i < 2; i++) {
                     frozenYetiComponent.pawRenderParts[i].shakeAmount = 0;
                  }
                  break;
               }
            }
            
            break;
         }
         case FrozenYetiAttackType.snowThrow: {
            switch (frozenYetiComponent.attackStage) {
               // Windup
               case 0: {
                  // Push paws forward
                  const pawOffsetMagnitude = FrozenYeti.PAW_OFFSET;
                  const pawOffsetDirection = lerp(FrozenYeti.PAW_RESTING_ANGLE, FrozenYeti.PAW_HIGH_ANGLE, Math.pow(frozenYetiComponent.stageProgress, 1.2));
                  for (let i = 0; i < 2; i++) {
                     const paw = frozenYetiComponent.pawRenderParts[i];
                     const direction = pawOffsetDirection * (i === 0 ? -1 : 1);
                     paw.offset.x = pawOffsetMagnitude * Math.sin(direction);
                     paw.offset.y = pawOffsetMagnitude * Math.cos(direction);

                     // Create snow particles near the paws
                     const offsetDirection = (pawOffsetDirection - 0.3) * (i === 0 ? -1 : 1) + this.rotation;
                     let spawnPositionX = this.position.x + pawOffsetMagnitude * Math.sin(offsetDirection);
                     let spawnPositionY = this.position.y + pawOffsetMagnitude * Math.cos(offsetDirection);

                     createSnowParticle(spawnPositionX, spawnPositionY, randFloat(40, 70));
                  }

                  break;
               }
               case 2: {
                  // Pull paws back
                  const pawOffsetMagnitude = FrozenYeti.PAW_OFFSET;
                  const pawOffsetDirection = lerp(FrozenYeti.PAW_HIGH_ANGLE, FrozenYeti.PAW_RESTING_ANGLE, Math.pow(frozenYetiComponent.stageProgress, 0.75));
                  for (let i = 0; i < 2; i++) {
                     const paw = frozenYetiComponent.pawRenderParts[i];
                     const direction = pawOffsetDirection * (i === 0 ? -1 : 1);
                     paw.offset.x = pawOffsetMagnitude * Math.sin(direction);
                     paw.offset.y = pawOffsetMagnitude * Math.cos(direction);
                  }
               }
            }
            
            break;
         }
         case FrozenYetiAttackType.roar: {
            switch (frozenYetiComponent.attackStage) {
               case 0: {
                  // Pull head back
                  frozenYetiComponent.headRenderPart.offset.y = FrozenYeti.HEAD_DISTANCE - lerp(0, 20, frozenYetiComponent.stageProgress);

                  frozenYetiComponent.headRenderPart.shakeAmount = lerp(0, 1, frozenYetiComponent.stageProgress);

                  // Pull paws back
                  const pawOffsetMagnitude = FrozenYeti.PAW_OFFSET;
                  const pawOffsetDirection = lerp(FrozenYeti.PAW_RESTING_ANGLE, FrozenYeti.PAW_RESTING_ANGLE + Math.PI / 10, frozenYetiComponent.stageProgress);
                  this.setPawRotationAndOffset(frozenYetiComponent, pawOffsetDirection, pawOffsetMagnitude);
                  break;
               }
               case 1: {
                  // Push head forwards
                  frozenYetiComponent.headRenderPart.offset.y = FrozenYeti.HEAD_DISTANCE - lerp(20, 0, frozenYetiComponent.stageProgress);
                  
                  frozenYetiComponent.headRenderPart.shakeAmount = 2;
                  
                  // Return paws to original position
                  const pawOffsetMagnitude = FrozenYeti.PAW_OFFSET;
                  const pawOffsetDirection = lerp(FrozenYeti.PAW_RESTING_ANGLE + Math.PI / 10, FrozenYeti.PAW_RESTING_ANGLE, frozenYetiComponent.stageProgress);
                  this.setPawRotationAndOffset(frozenYetiComponent, pawOffsetDirection, pawOffsetMagnitude);
                  
                  this.createRoarParticles();

                  const distanceToPlayer = this.position.calculateDistanceBetween(Player.instance.position);

                  // Check if the player is within the arc range of the attack
                  const angleToPlayer = this.position.calculateAngleBetween(Player.instance.position);
                  let angleDifference = this.rotation - angleToPlayer;
                  if (angleDifference >= Math.PI) {
                     angleDifference -= Math.PI * 2;
                  } else if (angleDifference < -Math.PI) {
                     angleDifference += Math.PI * 2;
                  }
                  if (Math.abs(angleDifference) <= FrozenYeti.ROAR_ARC / 2 && distanceToPlayer <= FrozenYeti.ROAR_REACH) {
                     const physicsComponent = this.getServerComponent(ServerComponentType.physics);
                     physicsComponent.velocity.x += 50 * Math.sin(angleToPlayer);
                     physicsComponent.velocity.y += 50 * Math.cos(angleToPlayer);
                  }
                  
                  break;
               }
            }
            
            break;
         }
         case FrozenYetiAttackType.bite: {
            switch (frozenYetiComponent.attackStage) {
               // Charge
               case 0: {
                  // Pull paws back
                  const pawOffsetMagnitude = FrozenYeti.PAW_OFFSET;
                  const pawOffsetDirection = lerp(FrozenYeti.PAW_RESTING_ANGLE, FrozenYeti.PAW_RESTING_ANGLE + Math.PI / 10, frozenYetiComponent.stageProgress);
                  for (let i = 0; i < 2; i++) {
                     const paw = frozenYetiComponent.pawRenderParts[i];
                     const direction = pawOffsetDirection * (i === 0 ? -1 : 1);
                     paw.offset.x = pawOffsetMagnitude * Math.sin(direction);
                     paw.offset.y = pawOffsetMagnitude * Math.cos(direction);
                  }
                  
                  break;
               }
               // Lunge
               case 1: {
                  const scaledProgress = Math.pow(frozenYetiComponent.stageProgress, 0.5);
                  
                  // Push paws forwards
                  const pawOffsetMagnitude = FrozenYeti.PAW_OFFSET;
                  const pawOffsetDirection = lerp(FrozenYeti.PAW_RESTING_ANGLE + Math.PI / 10, FrozenYeti.PAW_RESTING_ANGLE - Math.PI / 10, scaledProgress);
                  for (let i = 0; i < 2; i++) {
                     const paw = frozenYetiComponent.pawRenderParts[i];
                     const direction = pawOffsetDirection * (i === 0 ? -1 : 1);
                     paw.offset.x = pawOffsetMagnitude * Math.sin(direction);
                     paw.offset.y = pawOffsetMagnitude * Math.cos(direction);
                  }

                  break;
               }
               // Wind back
               case 2: {
                  // Return paws to normal position
                  const pawOffsetMagnitude = FrozenYeti.PAW_OFFSET;
                  const pawOffsetDirection = lerp(FrozenYeti.PAW_RESTING_ANGLE - Math.PI / 10, FrozenYeti.PAW_RESTING_ANGLE, frozenYetiComponent.stageProgress);
                  for (let i = 0; i < 2; i++) {
                     const paw = frozenYetiComponent.pawRenderParts[i];
                     const direction = pawOffsetDirection * (i === 0 ? -1 : 1);
                     paw.offset.x = pawOffsetMagnitude * Math.sin(direction);
                     paw.offset.y = pawOffsetMagnitude * Math.cos(direction);
                  }

                  break;
               }
            }

            break;
         }
         case FrozenYetiAttackType.none: {
            frozenYetiComponent.headRenderPart.shakeAmount = 0;
            for (let i = 0; i < 2; i++) {
               frozenYetiComponent.pawRenderParts[i].shakeAmount = 0;
            }
            
            break;
         }
      }
   }

   private setPawRotationAndOffset(frozenYetiComponent: FrozenYetiComponent, rotation: number, offsetMagnitude: number): void {
      for (let i = 0; i < 2; i++) {
         const paw = frozenYetiComponent.pawRenderParts[i];
         const direction = rotation * (i === 0 ? -1 : 1);
         (paw.offset as Point).x = offsetMagnitude * Math.sin(direction);
         (paw.offset as Point).y = offsetMagnitude * Math.cos(direction);
      }
   }

   private createRoarParticles(): void {
      for (let i = 0; i < 2; i++) {
         const direction = randFloat(this.rotation - FrozenYeti.ROAR_ARC / 2, this.rotation + FrozenYeti.ROAR_ARC / 2);

         const spawnOffsetDirection = direction + randFloat(-0.1, 0.1);
         const spawnPositionX = this.position.x + (FrozenYeti.HEAD_DISTANCE + FrozenYeti.HEAD_SIZE / 2) * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.position.y + (FrozenYeti.HEAD_DISTANCE + FrozenYeti.HEAD_SIZE / 2) * Math.cos(spawnOffsetDirection);

         // const velocityMagnitude = randFloat(200, 300);
         const velocityMagnitude = randFloat(500, 700);
         const velocityX = velocityMagnitude * Math.sin(direction);
         const velocityY = velocityMagnitude * Math.cos(direction);

         const lifetime = randFloat(1, 1.3);

         const particle = new Particle(lifetime);
         particle.getOpacity = () => {
            return 1 - Math.pow(particle.age / lifetime, 1.5);
         }

         const size = randInt(4, 7);
         const colour = randFloat(0.7, 1);

         addMonocolourParticleToBufferContainer(
            particle,
            ParticleRenderLayer.high,
            size, size,
            spawnPositionX, spawnPositionY,
            velocityX, velocityY,
            0, 0,
            velocityMagnitude / lifetime / 1.5,
            2 * Math.PI * Math.random(),
            Math.PI,
            0,
            Math.PI,
            colour, colour, colour
         );

         Board.highMonocolourParticles.push(particle);
      }

      {
         const direction = randFloat(this.rotation - FrozenYeti.ROAR_ARC / 2, this.rotation + FrozenYeti.ROAR_ARC / 2);

         const spawnOffsetDirection = direction + randFloat(-0.1, 0.1);
         const spawnPositionX = this.position.x + (FrozenYeti.HEAD_DISTANCE + FrozenYeti.HEAD_SIZE / 2) * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.position.y + (FrozenYeti.HEAD_DISTANCE + FrozenYeti.HEAD_SIZE / 2) * Math.cos(spawnOffsetDirection);

         // const velocityMagnitude = randFloat(200, 300);
         const velocityMagnitude = randFloat(500, 700);
         const velocityX = velocityMagnitude * Math.sin(direction);
         const velocityY = velocityMagnitude * Math.cos(direction);

         const lifetime = randFloat(1, 1.3);

         const particle = new Particle(lifetime);
         particle.getOpacity = () => {
            return 1 - Math.pow(particle.age / lifetime, 1.5);
         }

         const size = 64;
         const darkenFactor = randFloat(-0.25, 0);

         addTexturedParticleToBufferContainer(
            particle,
            ParticleRenderLayer.high,
            size, size,
            spawnPositionX, spawnPositionY,
            velocityX, velocityY,
            0, 0,
            velocityMagnitude / lifetime / 1.5,
            2 * Math.PI * Math.random(),
            Math.PI,
            0,
            Math.PI,
            7,
            darkenFactor, darkenFactor, darkenFactor
         );

         Board.highTexturedParticles.push(particle);
      }
   }

   protected onHit(hitData: HitData): void {
      // Blood pool particle
      createBlueBloodPoolParticle(this.position.x, this.position.y, FrozenYeti.SIZE / 2);
      
      if (hitData.angleFromAttacker !== null) {
         for (let i = 0; i < 10; i++) {
            const offsetDirection = hitData.angleFromAttacker + Math.PI + 0.2 * Math.PI * (Math.random() - 0.5);
            const spawnPositionX = this.position.x + FrozenYeti.SIZE / 2 * Math.sin(offsetDirection);
            const spawnPositionY = this.position.y + FrozenYeti.SIZE / 2 * Math.cos(offsetDirection);
            createBlueBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(150, 250), true);
         }
      }
   }

   public onDie(): void {
      for (let i = 0; i < 4; i++) {
         createBlueBloodPoolParticle(this.position.x, this.position.y, FrozenYeti.SIZE / 2);
      }

      createBlueBloodParticleFountain(this, 0.15, 1.4);
   }
}

export default FrozenYeti;
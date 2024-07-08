import { FrozenYetiComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { FrozenYetiAttackType } from "webgl-test-shared/dist/entities";
import { Point, lerp, randFloat, randInt } from "webgl-test-shared/dist/utils";
import { Settings } from "webgl-test-shared/dist/settings";
import ServerComponent from "./ServerComponent";
import RenderPart from "../render-parts/RenderPart";
import Entity from "../Entity";
import { createBiteParticle, createRockParticle, createSnowParticle, createWhiteSmokeParticle } from "../particles";
import Board from "../Board";
import Particle from "../Particle";
import { addMonocolourParticleToBufferContainer, addTexturedParticleToBufferContainer, ParticleRenderLayer } from "../rendering/webgl/particle-rendering";
import Player from "../entities/Player";

const HEAD_SIZE = 80;
export const FROZEN_YETI_HEAD_DISTANCE = 60;

const PAW_OFFSET = 80;
const PAW_RESTING_ANGLE = Math.PI / 3.5;
const PAW_HIGH_ANGLE = Math.PI / 6;

const ROAR_ARC = Math.PI / 6;
const ROAR_REACH = 450;
const SNOWBALL_THROW_OFFSET = 150;

class FrozenYetiComponent extends ServerComponent<ServerComponentType.frozenYeti> {
   public readonly headRenderPart: RenderPart;
   /** Index 0: left paw, index 1: right paw */
   public readonly pawRenderParts: ReadonlyArray<RenderPart>;
   
   public attackType: FrozenYetiAttackType;
   public attackStage: number;
   public stageProgress: number;

   constructor(entity: Entity, data: FrozenYetiComponentData) {
      super(entity);

      this.attackType = data.attackType;
      this.attackStage = data.attackStage;
      this.stageProgress = data.stageProgress;

      this.headRenderPart = this.entity.getRenderPart("frozenYetiComponent:head");
      this.pawRenderParts = this.entity.getRenderParts("frozenYetiComponent:paw", 2);

      // Initial paw transforms
      this.setPawRotationAndOffset(this, PAW_RESTING_ANGLE, PAW_OFFSET);
   }

   private setPawRotationAndOffset(frozenYetiComponent: FrozenYetiComponent, rotation: number, offsetMagnitude: number): void {
      for (let i = 0; i < 2; i++) {
         const paw = frozenYetiComponent.pawRenderParts[i];
         const direction = rotation * (i === 0 ? -1 : 1);
         paw.offset.x = offsetMagnitude * Math.sin(direction);
         paw.offset.y = offsetMagnitude * Math.cos(direction);
      }
   }

   private createRoarParticles(): void {
      for (let i = 0; i < 2; i++) {
         const direction = randFloat(this.entity.rotation - ROAR_ARC / 2, this.entity.rotation + ROAR_ARC / 2);

         const spawnOffsetDirection = direction + randFloat(-0.1, 0.1);
         const spawnPositionX = this.entity.position.x + (FROZEN_YETI_HEAD_DISTANCE + HEAD_SIZE / 2) * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.entity.position.y + (FROZEN_YETI_HEAD_DISTANCE + HEAD_SIZE / 2) * Math.cos(spawnOffsetDirection);

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
         const direction = randFloat(this.entity.rotation - ROAR_ARC / 2, this.entity.rotation + ROAR_ARC / 2);

         const spawnOffsetDirection = direction + randFloat(-0.1, 0.1);
         const spawnPositionX = this.entity.position.x + (FROZEN_YETI_HEAD_DISTANCE + HEAD_SIZE / 2) * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.entity.position.y + (FROZEN_YETI_HEAD_DISTANCE + HEAD_SIZE / 2) * Math.cos(spawnOffsetDirection);

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

   public tick(): void {
      if (Player.instance === null) {
         return;
      }
      
      switch (this.attackType) {
         case FrozenYetiAttackType.stomp: {
            switch (this.attackStage) {
               // Windup
               case 0: {
                  this.headRenderPart.shakeAmount = lerp(1, 2, this.stageProgress);
                  for (let i = 0; i < 2; i++) {
                     this.pawRenderParts[i].shakeAmount = lerp(1, 2, this.stageProgress);
                  }
                  break;
               }
               case 1: {
                  this.headRenderPart.shakeAmount = 0;
                  for (let i = 0; i < 2; i++) {
                     this.pawRenderParts[i].shakeAmount = 0;
                  }
                  break;
               }
            }
            
            break;
         }
         case FrozenYetiAttackType.snowThrow: {
            switch (this.attackStage) {
               // Windup
               case 0: {
                  // Push paws forward
                  const pawOffsetMagnitude = PAW_OFFSET;
                  const pawOffsetDirection = lerp(PAW_RESTING_ANGLE, PAW_HIGH_ANGLE, Math.pow(this.stageProgress, 1.2));
                  for (let i = 0; i < 2; i++) {
                     const paw = this.pawRenderParts[i];
                     const direction = pawOffsetDirection * (i === 0 ? -1 : 1);
                     paw.offset.x = pawOffsetMagnitude * Math.sin(direction);
                     paw.offset.y = pawOffsetMagnitude * Math.cos(direction);

                     // Create snow particles near the paws
                     const offsetDirection = (pawOffsetDirection - 0.3) * (i === 0 ? -1 : 1) + this.entity.rotation;
                     let spawnPositionX = this.entity.position.x + pawOffsetMagnitude * Math.sin(offsetDirection);
                     let spawnPositionY = this.entity.position.y + pawOffsetMagnitude * Math.cos(offsetDirection);

                     createSnowParticle(spawnPositionX, spawnPositionY, randFloat(40, 70));
                  }

                  break;
               }
               case 2: {
                  // Pull paws back
                  const pawOffsetMagnitude = PAW_OFFSET;
                  const pawOffsetDirection = lerp(PAW_HIGH_ANGLE, PAW_RESTING_ANGLE, Math.pow(this.stageProgress, 0.75));
                  for (let i = 0; i < 2; i++) {
                     const paw = this.pawRenderParts[i];
                     const direction = pawOffsetDirection * (i === 0 ? -1 : 1);
                     paw.offset.x = pawOffsetMagnitude * Math.sin(direction);
                     paw.offset.y = pawOffsetMagnitude * Math.cos(direction);
                  }
               }
            }
            
            break;
         }
         case FrozenYetiAttackType.roar: {
            switch (this.attackStage) {
               case 0: {
                  // Pull head back
                  this.headRenderPart.offset.y = FROZEN_YETI_HEAD_DISTANCE - lerp(0, 20, this.stageProgress);

                  this.headRenderPart.shakeAmount = lerp(0, 1, this.stageProgress);

                  // Pull paws back
                  const pawOffsetMagnitude = PAW_OFFSET;
                  const pawOffsetDirection = lerp(PAW_RESTING_ANGLE, PAW_RESTING_ANGLE + Math.PI / 10, this.stageProgress);
                  this.setPawRotationAndOffset(this, pawOffsetDirection, pawOffsetMagnitude);
                  break;
               }
               case 1: {
                  // Push head forwards
                  this.headRenderPart.offset.y = FROZEN_YETI_HEAD_DISTANCE - lerp(20, 0, this.stageProgress);
                  
                  this.headRenderPart.shakeAmount = 2;
                  
                  // Return paws to original position
                  const pawOffsetMagnitude = PAW_OFFSET;
                  const pawOffsetDirection = lerp(PAW_RESTING_ANGLE + Math.PI / 10, PAW_RESTING_ANGLE, this.stageProgress);
                  this.setPawRotationAndOffset(this, pawOffsetDirection, pawOffsetMagnitude);
                  
                  this.createRoarParticles();

                  const distanceToPlayer = this.entity.position.calculateDistanceBetween(Player.instance.position);

                  // Check if the player is within the arc range of the attack
                  const angleToPlayer = this.entity.position.calculateAngleBetween(Player.instance.position);
                  let angleDifference = this.entity.rotation - angleToPlayer;
                  if (angleDifference >= Math.PI) {
                     angleDifference -= Math.PI * 2;
                  } else if (angleDifference < -Math.PI) {
                     angleDifference += Math.PI * 2;
                  }
                  if (Math.abs(angleDifference) <= ROAR_ARC / 2 && distanceToPlayer <= ROAR_REACH) {
                     const physicsComponent = this.entity.getServerComponent(ServerComponentType.physics);
                     physicsComponent.velocity.x += 50 * Math.sin(angleToPlayer);
                     physicsComponent.velocity.y += 50 * Math.cos(angleToPlayer);
                  }
                  
                  break;
               }
            }
            
            break;
         }
         case FrozenYetiAttackType.bite: {
            switch (this.attackStage) {
               // Charge
               case 0: {
                  // Pull paws back
                  const pawOffsetMagnitude = PAW_OFFSET;
                  const pawOffsetDirection = lerp(PAW_RESTING_ANGLE, PAW_RESTING_ANGLE + Math.PI / 10, this.stageProgress);
                  for (let i = 0; i < 2; i++) {
                     const paw = this.pawRenderParts[i];
                     const direction = pawOffsetDirection * (i === 0 ? -1 : 1);
                     paw.offset.x = pawOffsetMagnitude * Math.sin(direction);
                     paw.offset.y = pawOffsetMagnitude * Math.cos(direction);
                  }
                  
                  break;
               }
               // Lunge
               case 1: {
                  const scaledProgress = Math.pow(this.stageProgress, 0.5);
                  
                  // Push paws forwards
                  const pawOffsetMagnitude = PAW_OFFSET;
                  const pawOffsetDirection = lerp(PAW_RESTING_ANGLE + Math.PI / 10, PAW_RESTING_ANGLE - Math.PI / 10, scaledProgress);
                  for (let i = 0; i < 2; i++) {
                     const paw = this.pawRenderParts[i];
                     const direction = pawOffsetDirection * (i === 0 ? -1 : 1);
                     paw.offset.x = pawOffsetMagnitude * Math.sin(direction);
                     paw.offset.y = pawOffsetMagnitude * Math.cos(direction);
                  }

                  break;
               }
               // Wind back
               case 2: {
                  // Return paws to normal position
                  const pawOffsetMagnitude = PAW_OFFSET;
                  const pawOffsetDirection = lerp(PAW_RESTING_ANGLE - Math.PI / 10, PAW_RESTING_ANGLE, this.stageProgress);
                  for (let i = 0; i < 2; i++) {
                     const paw = this.pawRenderParts[i];
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
            this.headRenderPart.shakeAmount = 0;
            for (let i = 0; i < 2; i++) {
               this.pawRenderParts[i].shakeAmount = 0;
            }
            
            break;
         }
      }
   }

   public updateFromData(data: FrozenYetiComponentData): void {
      // If the yeti did a bite attack, create a bite particle
      if (this.attackType === FrozenYetiAttackType.bite && data.attackStage === 2 && this.attackStage === 1) {
         const spawnPositionX = this.entity.position.x + 140 * Math.sin(this.entity.rotation);
         const spawnPositionY = this.entity.position.y + 140 * Math.cos(this.entity.rotation);
         
         createBiteParticle(spawnPositionX, spawnPositionY);
      }
      
      // If the yeti did a snow throw attack, create impact particles
      if (this.attackType === FrozenYetiAttackType.snowThrow && data.attackStage === 2 && this.attackStage === 1) {
         const offsetMagnitude = SNOWBALL_THROW_OFFSET + 20;
         const impactPositionX = this.entity.position.x + offsetMagnitude * Math.sin(this.entity.rotation);
         const impactPositionY = this.entity.position.y + offsetMagnitude * Math.cos(this.entity.rotation);
         
         for (let i = 0; i < 30; i++) {
            const offsetMagnitude = randFloat(0, 20);
            const offsetDirection = 2 * Math.PI * Math.random();
            const positionX = impactPositionX + offsetMagnitude * Math.sin(offsetDirection);
            const positionY = impactPositionY + offsetMagnitude * Math.cos(offsetDirection);
            
            createSnowParticle(positionX, positionY, randFloat(40, 100));
         }

         // White smoke particles
         for (let i = 0; i < 10; i++) {
            const spawnPositionX = impactPositionX;
            const spawnPositionY = impactPositionY;
            createWhiteSmokeParticle(spawnPositionX, spawnPositionY, 1);
         }
      }

      this.attackType = data.attackType;
      this.attackStage = data.attackStage;
      this.stageProgress = data.stageProgress;

      for (const positionData of data.rockSpikePositions) {
         if (Math.random() < 5 / Settings.TPS) {
            if (Math.random() < 0.5) {
               // @Cleanup: Move to particles file
               
               const spawnOffsetMagnitude = randFloat(0, 5);
               const spawnOffsetDirection = 2 * Math.PI * Math.random();
               const spawnPositionX = positionData[0] + spawnOffsetMagnitude / 2 * Math.sin(spawnOffsetDirection);
               const spawnPositionY = positionData[1] + spawnOffsetMagnitude / 2 * Math.cos(spawnOffsetDirection);
               
               const lifetime = randFloat(1, 1.2);
            
               const velocityMagnitude = randFloat(30, 50);
               const velocityDirection = spawnOffsetDirection + randFloat(-0.5, 0.5);
               const velocityX = velocityMagnitude * Math.sin(velocityDirection);
               const velocityY = velocityMagnitude * Math.cos(velocityDirection);
               
               const particle = new Particle(lifetime);
               particle.getOpacity = (): number => {
                  return 1 - particle.age / lifetime;
               };
            
               const pixelSize = 4 * randInt(1, 2);
            
               const colour = randFloat(0.3, 0.5);
               
               addMonocolourParticleToBufferContainer(
                  particle,
                  ParticleRenderLayer.low,
                  pixelSize, pixelSize,
                  spawnPositionX, spawnPositionY,
                  velocityX, velocityY,
                  0, 0,
                  0,
                  2 * Math.PI * Math.random(),
                  0,
                  0,
                  0,
                  colour, colour, colour
               );
               Board.lowMonocolourParticles.push(particle);
            } else {
               const spawnOffsetMagnitude = randFloat(0, 5);
               const spawnOffsetDirection = 2 * Math.PI * Math.random();
               const spawnPositionX = positionData[0] + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
               const spawnPositionY = positionData[1] + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
   
               createRockParticle(spawnPositionX, spawnPositionY, spawnOffsetDirection + randFloat(-0.5, 0.5), randFloat(80, 125), ParticleRenderLayer.low);
            }
         }
      }
   }
}

export default FrozenYetiComponent;
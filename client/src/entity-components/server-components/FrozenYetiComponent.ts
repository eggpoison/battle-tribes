import { ServerComponentType } from "battletribes-shared/components";
import { EntityID, FrozenYetiAttackType } from "battletribes-shared/entities";
import { lerp, randFloat, randInt } from "battletribes-shared/utils";
import { Settings } from "battletribes-shared/settings";
import { createBiteParticle, createRockParticle, createSnowParticle, createWhiteSmokeParticle } from "../../particles";
import Board from "../../Board";
import Particle from "../../Particle";
import { addMonocolourParticleToBufferContainer, addTexturedParticleToBufferContainer, ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import Player from "../../entities/Player";
import { RenderPart } from "../../render-parts/render-parts";
import { PacketReader } from "battletribes-shared/packets";
import { getEntityRenderInfo } from "../../world";
import TransformComponent, { TransformComponentArray } from "./TransformComponent";
import { PhysicsComponentArray } from "./PhysicsComponent";
import ServerComponentArray from "../ServerComponentArray";

const HEAD_SIZE = 80;
export const FROZEN_YETI_HEAD_DISTANCE = 60;

const PAW_OFFSET = 80;
const PAW_RESTING_ANGLE = Math.PI / 3.5;
const PAW_HIGH_ANGLE = Math.PI / 6;

const ROAR_ARC = Math.PI / 6;
const ROAR_REACH = 450;
const SNOWBALL_THROW_OFFSET = 150;

class FrozenYetiComponent {
   public readonly headRenderPart: RenderPart;
   /** Index 0: left paw, index 1: right paw */
   public readonly pawRenderParts: ReadonlyArray<RenderPart>;
   
   public attackType: FrozenYetiAttackType = 0;
   public attackStage = 0;
   public stageProgress = 0;

   constructor(entity: EntityID) {
      const renderInfo = getEntityRenderInfo(entity);
      this.headRenderPart = renderInfo.getRenderThing("frozenYetiComponent:head") as RenderPart;
      this.pawRenderParts = renderInfo.getRenderThings("frozenYetiComponent:paw", 2) as Array<RenderPart>;
   }
}

export default FrozenYetiComponent;

export const FrozenYetiComponentArray = new ServerComponentArray<FrozenYetiComponent>(ServerComponentType.frozenYeti, true, {
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
});

const setPawRotationAndOffset = (frozenYetiComponent: FrozenYetiComponent, rotation: number, offsetMagnitude: number): void => {
   for (let i = 0; i < 2; i++) {
      const paw = frozenYetiComponent.pawRenderParts[i];
      const direction = rotation * (i === 0 ? -1 : 1);
      paw.offset.x = offsetMagnitude * Math.sin(direction);
      paw.offset.y = offsetMagnitude * Math.cos(direction);
   }
}

const createRoarParticles = (transformComponent: TransformComponent): void => {
   for (let i = 0; i < 2; i++) {
      const direction = randFloat(transformComponent.rotation - ROAR_ARC / 2, transformComponent.rotation + ROAR_ARC / 2);

      const spawnOffsetDirection = direction + randFloat(-0.1, 0.1);
      const spawnPositionX = transformComponent.position.x + (FROZEN_YETI_HEAD_DISTANCE + HEAD_SIZE / 2) * Math.sin(spawnOffsetDirection);
      const spawnPositionY = transformComponent.position.y + (FROZEN_YETI_HEAD_DISTANCE + HEAD_SIZE / 2) * Math.cos(spawnOffsetDirection);

      // const velocityMagnitude = randFloat(200, 300);
      const velocityMagnitude = randFloat(500, 700);
      const velocityX = velocityMagnitude * Math.sin(direction);
      const velocityY = velocityMagnitude * Math.cos(direction);

      const lifetime = randFloat(1, 1.3);

      const particle = new Particle(lifetime);
      particle.getOpacity = () => {
         return 1 - Math.pow(particle.age / lifetime, 1.5);
      }
``
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
      const direction = randFloat(transformComponent.rotation - ROAR_ARC / 2, transformComponent.rotation + ROAR_ARC / 2);

      const spawnOffsetDirection = direction + randFloat(-0.1, 0.1);
      const spawnPositionX = transformComponent.position.x + (FROZEN_YETI_HEAD_DISTANCE + HEAD_SIZE / 2) * Math.sin(spawnOffsetDirection);
      const spawnPositionY = transformComponent.position.y + (FROZEN_YETI_HEAD_DISTANCE + HEAD_SIZE / 2) * Math.cos(spawnOffsetDirection);

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

function onTick(frozenYetiComponent: FrozenYetiComponent, entity: EntityID): void {
   if (Player.instance === null) {
      return;
   }

   const transformComponent = TransformComponentArray.getComponent(entity);
   
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
               const pawOffsetMagnitude = PAW_OFFSET;
               const pawOffsetDirection = lerp(PAW_RESTING_ANGLE, PAW_HIGH_ANGLE, Math.pow(frozenYetiComponent.stageProgress, 1.2));
               for (let i = 0; i < 2; i++) {
                  const paw = frozenYetiComponent.pawRenderParts[i];
                  const direction = pawOffsetDirection * (i === 0 ? -1 : 1);
                  paw.offset.x = pawOffsetMagnitude * Math.sin(direction);
                  paw.offset.y = pawOffsetMagnitude * Math.cos(direction);

                  // Create snow particles near the paws
                  const offsetDirection = (pawOffsetDirection - 0.3) * (i === 0 ? -1 : 1) + transformComponent.rotation;
                  let spawnPositionX = transformComponent.position.x + pawOffsetMagnitude * Math.sin(offsetDirection);
                  let spawnPositionY = transformComponent.position.y + pawOffsetMagnitude * Math.cos(offsetDirection);

                  createSnowParticle(spawnPositionX, spawnPositionY, randFloat(40, 70));
               }

               break;
            }
            case 2: {
               // Pull paws back
               const pawOffsetMagnitude = PAW_OFFSET;
               const pawOffsetDirection = lerp(PAW_HIGH_ANGLE, PAW_RESTING_ANGLE, Math.pow(frozenYetiComponent.stageProgress, 0.75));
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
               frozenYetiComponent.headRenderPart.offset.y = FROZEN_YETI_HEAD_DISTANCE - lerp(0, 20, frozenYetiComponent.stageProgress);

               frozenYetiComponent.headRenderPart.shakeAmount = lerp(0, 1, frozenYetiComponent.stageProgress);

               // Pull paws back
               const pawOffsetMagnitude = PAW_OFFSET;
               const pawOffsetDirection = lerp(PAW_RESTING_ANGLE, PAW_RESTING_ANGLE + Math.PI / 10, frozenYetiComponent.stageProgress);
               setPawRotationAndOffset(frozenYetiComponent, pawOffsetDirection, pawOffsetMagnitude);
               break;
            }
            case 1: {
               // Push head forwards
               frozenYetiComponent.headRenderPart.offset.y = FROZEN_YETI_HEAD_DISTANCE - lerp(20, 0, frozenYetiComponent.stageProgress);
               
               frozenYetiComponent.headRenderPart.shakeAmount = 2;
               
               // Return paws to original position
               const pawOffsetMagnitude = PAW_OFFSET;
               const pawOffsetDirection = lerp(PAW_RESTING_ANGLE + Math.PI / 10, PAW_RESTING_ANGLE, frozenYetiComponent.stageProgress);
               setPawRotationAndOffset(frozenYetiComponent, pawOffsetDirection, pawOffsetMagnitude);
               
               createRoarParticles(transformComponent);

               const playerTransformComponent = TransformComponentArray.getComponent(Player.instance.id);

               const distanceToPlayer = transformComponent.position.calculateDistanceBetween(playerTransformComponent.position);

               // Check if the player is within the arc range of the attack
               const angleToPlayer = transformComponent.position.calculateAngleBetween(playerTransformComponent.position);
               let angleDifference = transformComponent.rotation - angleToPlayer;
               if (angleDifference >= Math.PI) {
                  angleDifference -= Math.PI * 2;
               } else if (angleDifference < -Math.PI) {
                  angleDifference += Math.PI * 2;
               }
               if (Math.abs(angleDifference) <= ROAR_ARC / 2 && distanceToPlayer <= ROAR_REACH) {
                  const physicsComponent = PhysicsComponentArray.getComponent(entity);
                  physicsComponent.selfVelocity.x += 50 * Math.sin(angleToPlayer);
                  physicsComponent.selfVelocity.y += 50 * Math.cos(angleToPlayer);
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
               const pawOffsetMagnitude = PAW_OFFSET;
               const pawOffsetDirection = lerp(PAW_RESTING_ANGLE, PAW_RESTING_ANGLE + Math.PI / 10, frozenYetiComponent.stageProgress);
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
               const pawOffsetMagnitude = PAW_OFFSET;
               const pawOffsetDirection = lerp(PAW_RESTING_ANGLE + Math.PI / 10, PAW_RESTING_ANGLE - Math.PI / 10, scaledProgress);
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
               const pawOffsetMagnitude = PAW_OFFSET;
               const pawOffsetDirection = lerp(PAW_RESTING_ANGLE - Math.PI / 10, PAW_RESTING_ANGLE, frozenYetiComponent.stageProgress);
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

const readRockSpikes = (reader: PacketReader): void => {
   const numRockSpikes = reader.readNumber();
   for (let i = 0; i < numRockSpikes; i++) {
      const x = reader.readNumber();
      const y = reader.readNumber();

      if (Math.random() < 5 / Settings.TPS) {
         if (Math.random() < 0.5) {
            // @Cleanup: Move to particles file
            
            const spawnOffsetMagnitude = randFloat(0, 5);
            const spawnOffsetDirection = 2 * Math.PI * Math.random();
            const spawnPositionX = x + spawnOffsetMagnitude / 2 * Math.sin(spawnOffsetDirection);
            const spawnPositionY = y + spawnOffsetMagnitude / 2 * Math.cos(spawnOffsetDirection);
            
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
            const spawnPositionX = x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
            const spawnPositionY = y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

            createRockParticle(spawnPositionX, spawnPositionY, spawnOffsetDirection + randFloat(-0.5, 0.5), randFloat(80, 125), ParticleRenderLayer.low);
         }
      }
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
   
   const numRockSpikes = reader.readNumber();
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT * numRockSpikes);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const frozenYetiComponent = FrozenYetiComponentArray.getComponent(entity);
   
   const attackType = reader.readNumber();
   const attackStage = reader.readNumber();
   const stageProgress = reader.readNumber();
   readRockSpikes(reader);

   const transformComponent = TransformComponentArray.getComponent(entity);
   
   // If the yeti did a bite attack, create a bite particle
   if (frozenYetiComponent.attackType === FrozenYetiAttackType.bite && attackStage === 2 && frozenYetiComponent.attackStage === 1) {
      const spawnPositionX = transformComponent.position.x + 140 * Math.sin(transformComponent.rotation);
      const spawnPositionY = transformComponent.position.y + 140 * Math.cos(transformComponent.rotation);
      
      createBiteParticle(spawnPositionX, spawnPositionY);
   }
   
   // If the yeti did a snow throw attack, create impact particles
   if (frozenYetiComponent.attackType === FrozenYetiAttackType.snowThrow && attackStage === 2 && frozenYetiComponent.attackStage === 1) {
      const offsetMagnitude = SNOWBALL_THROW_OFFSET + 20;
      const impactPositionX = transformComponent.position.x + offsetMagnitude * Math.sin(transformComponent.rotation);
      const impactPositionY = transformComponent.position.y + offsetMagnitude * Math.cos(transformComponent.rotation);
      
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

   frozenYetiComponent.attackType = attackType;
   frozenYetiComponent.attackStage = attackStage;
   frozenYetiComponent.stageProgress = stageProgress;
}
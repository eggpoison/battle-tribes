import { Entity } from "../../../shared/src/entities";
import { EntityTickEventType } from "../../../shared/src/entity-events";
import { randAngle, randFloat, randInt } from "../../../shared/src/utils";
import { playSound, playSoundOnHitbox } from "./sound";
import { entityExists, surfaceLayer } from "./world";
import { TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { createHotSparkParticle } from "./particles";
import { playBowFireSound } from "./player-action-handling";
import { getRandomPositionOnBoxEdge } from "./hitboxes";
import { Settings } from "../../../shared/src/settings";
import { SubtileType, getSubtileX, getSubtileY } from "../../../shared/src/subtiles";
import Particle from "./Particle";
import { addMonocolourParticleToBufferContainer, ParticleRenderLayer, lowMonocolourParticles, addTexturedParticleToBufferContainer, lowTexturedParticles } from "./rendering/webgl/particle-rendering";

export function processTickEvent(entity: Entity, type: EntityTickEventType, data: number): void {
   // @HACK
   if (!entityExists(entity) && type !== EntityTickEventType.collapse) {
      return;
   }
   
   // @Hack
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   switch (type) {
      case EntityTickEventType.cowFart: {
         playSoundOnHitbox("fart.mp3", 0.3, randFloat(0.9, 1.2), entity, hitbox, false);
         break;
      }
      case EntityTickEventType.fireBow: {
         playBowFireSound(entity, data);
         break;
      }
      case EntityTickEventType.automatonAccident: {
         playSoundOnHitbox("automaton-accident-" + randInt(1, 2) + ".mp3", 0.3, randFloat(0.9, 1.2), entity, hitbox, false);

         // Make sparks fly off
         const position = getRandomPositionOnBoxEdge(hitbox.box);

         for (let i = 0; i < 5; i++) {
            const spawnOffsetRange = 6;
            const spawnOffsetDirection = randAngle();
            const spawnPositionX = position.x + spawnOffsetRange * Math.sin(spawnOffsetDirection);
            const spawnPositionY = position.y + spawnOffsetRange * Math.cos(spawnOffsetDirection);
            createHotSparkParticle(spawnPositionX, spawnPositionY);
         }

         break;
      }
      case EntityTickEventType.cowEat: {
         playSoundOnHitbox("cow-eat.mp3", 0.4, randFloat(0.9, 1.1), entity, hitbox, true);
         break;
      }
      case EntityTickEventType.dustfleaLatch: {
         playSoundOnHitbox("dustflea-latch.mp3", 0.4, randFloat(0.9, 1.1), entity, hitbox, true);
         break;
      }
      case EntityTickEventType.tongueGrab: {
         playSoundOnHitbox("tongue-grab.mp3", 0.8, 1, entity, hitbox, true);
         break;
      }
      case EntityTickEventType.tongueLaunch: {
         playSoundOnHitbox("okren-tongue-launch.mp3", 0.5, 1.2, entity, hitbox, true);
         break;
      }
      case EntityTickEventType.tongueLick: {
         playSoundOnHitbox("okren-tongue-lick.mp3", randFloat(0.3, 0.35), randFloat(0.9, 1.1), entity, hitbox, true);
         break;
      }
      case EntityTickEventType.dustfleaEggPop: {
         playSoundOnHitbox("dustflea-egg-pop.mp3", 0.4, 1, entity, hitbox, true);
         break;
      }
      case EntityTickEventType.okrenEyeHitSound: {
         playSoundOnHitbox("okren-eye-hit.mp3", 1.5, 0.6, entity, hitbox, true);
         break;
      }
      case EntityTickEventType.foodMunch: {
         playSoundOnHitbox("food-munch-" + randInt(1, 5) + ".mp3", 0.4, randFloat(0.9, 1.1), entity, hitbox, true);
         break;
      }
      case EntityTickEventType.foodBurp: {
         playSoundOnHitbox("food-burp.mp3", 0.5, randFloat(0.9, 1.1), entity, hitbox, true);
         break;
      }
      case EntityTickEventType.inguSerpentAngry: {
         playSoundOnHitbox("ingu-serpent-angry-" + randInt(1, 2) + ".mp3", 0.5, randFloat(0.95, 1.05) * 1.3, entity, hitbox, true);
         break;
      }
      case EntityTickEventType.inguSerpentLeap: {
         playSoundOnHitbox("ingu-serpent-leap.mp3", 0.5, randFloat(0.95, 1.05) * 1.3, entity, hitbox, true);
         break;
      }
      case EntityTickEventType.tukmokAngry: {
         playSoundOnHitbox("tukmok-angry-" + randInt(1, 3) + ".mp3", 0.5, randFloat(0.95, 1.05), entity, hitbox, true);
         break;
      }
      case EntityTickEventType.collapse: {
         const subtileIndex = data;
         const subtileX = getSubtileX(subtileIndex);
         const subtileY = getSubtileY(subtileIndex);
         
         const x = (subtileX + 0.5) * Settings.SUBTILE_SIZE;
         const y = (subtileY + 0.5) * Settings.SUBTILE_SIZE;
         // @BUG: layer is wrong!!! @Temporary @hack
         const layer = surfaceLayer;
         playSound("stone-destroy-" + randInt(1, 2) + ".mp3", 0.6, 1, x, y, layer);

         // Speck debris
         for (let i = 0; i < 7; i++) {
            const spawnOffsetDirection = randAngle();
            const spawnPositionX = x + 12 * Math.sin(spawnOffsetDirection);
            const spawnPositionY = y + 12 * Math.cos(spawnOffsetDirection);
         
            const velocityMagnitude = randFloat(50, 70);
            const velocityDirection = randAngle();
            const velocityX = velocityMagnitude * Math.sin(velocityDirection);
            const velocityY = velocityMagnitude * Math.cos(velocityDirection);
         
            const lifetime = randFloat(0.9, 1.5);
            
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
               ParticleRenderLayer.low,
               baseSize * scale, baseSize * scale,
               spawnPositionX, spawnPositionY,
               velocityX, velocityY,
               0, 0,
               velocityMagnitude / lifetime / 0.7,
               randAngle(),
               angularVelocity,
               0,
               Math.abs(angularVelocity) / lifetime / 1.5,
               colour, colour, colour
            );
            lowMonocolourParticles.push(particle);
         }
         
         // Larger debris pieces
         for (let i = 0; i < 5; i++) {
            const spawnOffsetMagnitude = 8 * Math.random();
            const spawnOffsetDirection = randAngle();
            const particleX = x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
            const particleY = y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
            
            const lifetime = randFloat(20, 30);

            let textureIndex: number;
            if (Math.random() < 0.4) {
               // Large rock
               textureIndex = 8 * 1 + 3;
            } else {
               // Small rock
               textureIndex = 8 * 1 + 2;
            }

            const moveSpeed = randFloat(20, 40);
            const moveDirection = randAngle();
            const velocityX = moveSpeed * Math.sin(moveDirection);
            const velocityY = moveSpeed * Math.cos(moveDirection);

            const spinDirection = randFloat(-1, 1);
            
            const particle = new Particle(lifetime);
            particle.getOpacity = (): number => {
               return 1 - Math.pow(particle.age / lifetime, 2);
            };

            const tint = layer.getSubtileType(subtileIndex) === SubtileType.rockWall ? randFloat(-0.1, -0.2) : randFloat(-0.3, -0.5);
            
            addTexturedParticleToBufferContainer(
               particle,
               ParticleRenderLayer.low,
               64, 64,
               particleX, particleY,
               velocityX, velocityY,
               0, 0,
               moveSpeed * 1.5,
               randAngle(),
               1 * Math.PI * spinDirection,
               0,
               Math.abs(Math.PI * spinDirection),
               textureIndex,
               tint, tint, tint
            );
            lowTexturedParticles.push(particle);
         }
         break;
      }
   }
}
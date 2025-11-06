import { Entity, ItemType, randAngle, randFloat, randInt, EntityTickEventType } from "webgl-test-shared";
import { playSoundOnHitbox } from "./sound";
import { entityExists } from "./world";
import { getRandomPositionOnBoxEdge, TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { createHotSparkParticle } from "./particles";
import { playBowFireSound } from "./player-action-handler";

export function processTickEvent(entity: Entity, type: EntityTickEventType, data: number): void {
   // @HACK
   if (!entityExists(entity)) {
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
         // @Cleanup: why need cast?
         playBowFireSound(entity, data as ItemType);
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
   }
}
import { randFloat, randItem, Entity } from "webgl-test-shared";
import { playSoundOnHitbox } from "../../sound";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { TransformComponentArray } from "../server-components/TransformComponent";

export interface RandomSoundComponentData {}

/** Plays sounds coming from the entity randomly */
export interface RandomSoundComponent {
   minSoundIntervalTicks: number;
   maxSoundIntervalTicks: number;
   volume: number;

   soundTimerTicks: number;

   sounds: ReadonlyArray<string>;
}

// @Cleanup this system is so shit
export function updateRandomSoundComponentSounds(randomSoundComponent: RandomSoundComponent, minSoundIntervalTicks: number, maxSoundIntervalTicks: number, sounds: ReadonlyArray<string>, volume: number) {
   // Don't update if already updated
   if (randomSoundComponent.sounds === sounds) {
      return;
   }
   
   randomSoundComponent.minSoundIntervalTicks = minSoundIntervalTicks;
   randomSoundComponent.maxSoundIntervalTicks = maxSoundIntervalTicks;
   randomSoundComponent.sounds = sounds;
   randomSoundComponent.volume = volume;
   
   if (randomSoundComponent.soundTimerTicks === 0) {
      randomSoundComponent.soundTimerTicks = randFloat(minSoundIntervalTicks, maxSoundIntervalTicks);
   } else if (randomSoundComponent.soundTimerTicks > randomSoundComponent.maxSoundIntervalTicks)  {
      randomSoundComponent.soundTimerTicks = randomSoundComponent.maxSoundIntervalTicks;
   }
}

export const RandomSoundComponentArray = new ClientComponentArray<RandomSoundComponent>(ClientComponentType.randomSound, true, createComponent, getMaxRenderParts);
RandomSoundComponentArray.onTick = onTick;

export function createRandomSoundComponentData(): RandomSoundComponentData {
   return {};
}

function createComponent(): RandomSoundComponent {
   return {
      minSoundIntervalTicks: 0,
      maxSoundIntervalTicks: 0,
      volume: 0,
      soundTimerTicks: 0,
      sounds: []
   };
}

function getMaxRenderParts(): number {
   return 0;
}

function onTick(entity: Entity): void {
   const randomSoundComponent = RandomSoundComponentArray.getComponent(entity);
   if (randomSoundComponent.maxSoundIntervalTicks === 0) {
      return;
   }
   
   randomSoundComponent.soundTimerTicks--;
   if (randomSoundComponent.soundTimerTicks <= 0) {
      randomSoundComponent.soundTimerTicks = randFloat(randomSoundComponent.minSoundIntervalTicks, randomSoundComponent.maxSoundIntervalTicks);

      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      
      const soundSrc = randItem(randomSoundComponent.sounds);
      playSoundOnHitbox(soundSrc, randomSoundComponent.volume, 1, entity, hitbox, false);
   }
}
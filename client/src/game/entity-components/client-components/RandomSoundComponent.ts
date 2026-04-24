import { randFloat, randItem, Entity } from "webgl-test-shared";
import { playSoundOnHitbox } from "../../sound";
import { ClientComponentType } from "../client-component-types";
import _ClientComponentArray from "../ClientComponentArray";
import { TransformComponentArray } from "../server-components/TransformComponent";
import { registerClientComponentArray } from "../component-registry";

export interface RandomSoundComponentData {}

/** Plays sounds coming from the entity randomly */
export interface RandomSoundComponent {
   minSoundIntervalTicks: number;
   maxSoundIntervalTicks: number;
   volume: number;

   soundTimerTicks: number;

   sounds: ReadonlyArray<string>;
}

declare module "../component-registry" {
   interface ClientComponentRegistry extends RegisterClientComponent<ClientComponentType.randomSound, _RandomSoundComponentArray> {}
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

class _RandomSoundComponentArray extends _ClientComponentArray<RandomSoundComponent, RandomSoundComponentData> {
   public createComponent(): RandomSoundComponent {
      return {
         minSoundIntervalTicks: 0,
         maxSoundIntervalTicks: 0,
         volume: 0,
         soundTimerTicks: 0,
         sounds: []
      };
   }

   public getMaxRenderParts(): number {
      return 0;
   }

   public onTick(entity: Entity): void {
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
}

export const RandomSoundComponentArray = registerClientComponentArray(ClientComponentType.randomSound, _RandomSoundComponentArray, true);

export function createRandomSoundComponentData(): RandomSoundComponentData {
   return {};
}
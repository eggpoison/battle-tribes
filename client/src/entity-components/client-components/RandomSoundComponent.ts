import { EntityID } from "../../../../shared/src/entities";
import { randFloat, randItem } from "../../../../shared/src/utils";
import { playSound } from "../../sound";
import ClientComponentArray from "../ClientComponentArray";
import { ClientComponentType } from "../components";
import { TransformComponentArray } from "../server-components/TransformComponent";

/** Plays sounds coming from the entity randomly */
export default class RandomSoundComponent {
   public minSoundIntervalTicks = 0;
   public maxSoundIntervalTicks = 0;
   public volume = 0;

   public soundTimerTicks = 0;

   public sounds: ReadonlyArray<string> = [];
   
   constructor(entity: EntityID) {
      // @Hack
      RandomSoundComponentArray.addComponent(entity, this);
   }

   public updateSounds(minSoundIntervalTicks: number, maxSoundIntervalTicks: number, sounds: ReadonlyArray<string>, volume: number) {
      // Don't update if already updated
      if (this.sounds === sounds) {
         return;
      }
      
      this.minSoundIntervalTicks = minSoundIntervalTicks;
      this.maxSoundIntervalTicks = maxSoundIntervalTicks;
      this.sounds = sounds;
      this.volume = volume;
      
      if (this.soundTimerTicks === 0) {
         this.soundTimerTicks = randFloat(minSoundIntervalTicks, maxSoundIntervalTicks);
      } else if (this.soundTimerTicks > this.maxSoundIntervalTicks)  {
         this.soundTimerTicks = this.maxSoundIntervalTicks;
      }
   }
}

export const RandomSoundComponentArray = new ClientComponentArray<RandomSoundComponent>(ClientComponentType.randomSound, true, {
   onTick: onTick
});

function onTick(randomSoundComponent: RandomSoundComponent, entity: EntityID): void {
   if (randomSoundComponent.maxSoundIntervalTicks === 0) {
      return;
   }
   
   randomSoundComponent.soundTimerTicks--;
   if (randomSoundComponent.soundTimerTicks <= 0) {
      randomSoundComponent.soundTimerTicks = randFloat(randomSoundComponent.minSoundIntervalTicks, randomSoundComponent.maxSoundIntervalTicks);

      const soundSrc = randItem(randomSoundComponent.sounds);

      const transformComponent = TransformComponentArray.getComponent(entity);
      playSound(soundSrc, randomSoundComponent.volume, 1, transformComponent.position.copy());
   }
}
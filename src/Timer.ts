import { addTimer } from "./Game";
import SETTINGS from "./settings";

class Timer {
   private readonly duration: number;
   private timeRemaining: number;

   public readonly callback: () => void;

   constructor(duration: number, callback: () => void) {
      this.duration = duration;
      this.timeRemaining = this.duration;
      this.callback = callback;

      addTimer(this);
   }

   public tick(): void {
      this.timeRemaining -= 1 / SETTINGS.tps;
   }

   public hasExpired(): boolean {
      return this.timeRemaining <= 0;
   }
}

export default Timer;
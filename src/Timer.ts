import SETTINGS from "./settings";

type TimerInfo = {
   readonly duration: number;
   readonly onEnd: () => void;
   readonly onTick?: (duration: number) => void;
}

export const timers = new Array<Timer>();

const addTimer = (timer: Timer): void => {
   timers.push(timer);
}

class Timer {
   private readonly duration: number;
   private timeRemaining: number;

   public readonly onEnd: () => void;
   private readonly onTick?: (duration: number) => void;

   constructor(info: TimerInfo) {
      this.duration = info.duration;
      this.timeRemaining = this.duration;
      this.onEnd = info.onEnd;
      if (typeof info.onTick !== "undefined") this.onTick = info.onTick;

      addTimer(this);
   }

   public tick(): void {
      this.timeRemaining -= 1 / SETTINGS.tps;

      if (typeof this.onTick !== "undefined") this.onTick(this.timeRemaining);
   }

   public addDuration(time: number): void {
      this.timeRemaining += time;
   }

   public hasExpired(): boolean {
      return this.timeRemaining <= 0;
   }
}

export default Timer;
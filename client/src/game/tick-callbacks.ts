import { Settings } from "../../../shared/src";

// @CLEANUP this system is awful. kill it

interface TickCallback {
   time: number;
   readonly callback: () => void;
}

const tickCallbacks: Array<TickCallback> = [];

export function addTickCallback(time: number, callback: () => void): void {
   tickCallbacks.push({
      time: time,
      callback: callback
   });
}

export function updateTickCallbacks(): void {
   for (let i = tickCallbacks.length - 1; i >= 0; i--) {
      const tickCallbackInfo = tickCallbacks[i];
      tickCallbackInfo.time -= Settings.DT_S;
      if (tickCallbackInfo.time <= 0) {
         tickCallbackInfo.callback();
         tickCallbacks.splice(i, 1);
      }
   }
}
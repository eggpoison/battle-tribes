import Board from "./Board";
import Camera from "./Camera";
import { renderBoard } from "./components/Canvas";
import { Minimap } from "./components/MinimapCanvas";
import Player from "./entities/tribe-members/Player";
import { stopPlayerMovement } from "./entity-components/PlayerControllerComponent";
import TransformComponent from "./entity-components/TransformComponent";
import SETTINGS from "./settings";
import { timers } from "./Timer";

const NIGHT_START = 20;
const NIGHT_END = 6;

let previousFocus = true;

abstract class Game {
   // private static readonly TIME_SPEED = 1.5;
   private static readonly TIME_SPEED = 100;
   private static time: number = 0;

   public static tick(): void {
      Game.time += Game.TIME_SPEED / SETTINGS.tps / 60;
      if (Game.time >= 24) Game.time -= 24;

      for (const timer of timers.slice()) {
         timer.tick();

         if (timer.hasExpired()) {
            timer.onEnd();

            timers.splice(timers.indexOf(timer), 1);
         }
      }
 
      Camera.updateCameraPosition();
      Camera.tick();
      Minimap.drawEntities(Player.instance.getComponent(TransformComponent)!.position);
      renderBoard();
      Board.tick();

      const focus = document.hasFocus();
      if (previousFocus !== focus && focus) stopPlayerMovement();

      previousFocus = focus;
   }

   /**
    * 
    * @returns How dark the sky is from 0-1 (1 is fully dark)
    */
   public static getSkyDarkness(): number {
      const TRANSITION_TIME = 2;

      // Night time
      if (this.time >= NIGHT_START || this.time <= NIGHT_END) {
         return 1;
      }

      if (this.time <= NIGHT_END + TRANSITION_TIME) {
         return 1 - (this.time - NIGHT_END) / TRANSITION_TIME;
      }
      if (this.time >= NIGHT_START - TRANSITION_TIME) {
         return 1 - (NIGHT_START - this.time) / TRANSITION_TIME;
      }

      return 0;
   }

   public static isNight(): boolean {
      return this.time <= NIGHT_END || this.time >= NIGHT_START;
   }

   public static startGame(): void {
      setInterval(this.tick, 1000 / SETTINGS.tps);
   }
}

export default Game;
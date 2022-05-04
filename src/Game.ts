import Board from "./Board";
import Camera from "./Camera";
import { renderBoard } from "./components/Canvas";
import { Minimap } from "./components/MinimapCanvas";
import Player from "./entities/tribe-members/Player";
import TransformComponent from "./entity-components/TransformComponent";
import SETTINGS from "./settings";
import Timer from "./Timer";

const timers = new Array<Timer>();

export function addTimer(timer: Timer): void {
   timers.push(timer);
}

abstract class Game {
   private static readonly TIME_SPEED = 1.5;
   private static time: number = 0;

   public static tick(): void {
      Game.time += Game.TIME_SPEED / SETTINGS.tps / 60;

      for (const timer of timers.slice()) {
         timer.tick();

         if (timer.hasExpired()) {
            timer.callback();

            timers.splice(timers.indexOf(timer), 1);
         }
      }
 
      Camera.updateCameraPosition();
      Camera.tick();
      Minimap.drawEntities(Player.instance.getComponent(TransformComponent)!.position);
      renderBoard();
      Board.tick();
   }

   public static startGame(): void {
      setInterval(this.tick, 1000 / SETTINGS.tps);
   }
}

export default Game;
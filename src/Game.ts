import Board from "./Board";
import Camera from "./Camera";
import { renderBoard } from "./components/Canvas";
import { Minimap } from "./components/MinimapCanvas";
import Player from "./entities/Player";
import TransformComponent from "./entity-components/TransformComponent";
import SETTINGS from "./settings";
import Timer from "./Timer";

const timers = new Array<Timer>();

export function addTimer(timer: Timer): void {
   timers.push(timer);
}

abstract class Game {
   public static tick(): void {
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
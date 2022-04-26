import Board from "./Board";
import Camera from "./Camera";
import { render } from "./components/Canvas";
import { drawMinimapAttempt } from "./components/MinimapCanvas";
import SETTINGS from "./settings";

let minimapHasBeenDrawn = false;

abstract class Game {
   public static tick(): void {
      if (!minimapHasBeenDrawn) {
         minimapHasBeenDrawn = drawMinimapAttempt();
      }
      Camera.updateCameraPosition();
      render();
      Board.tick();
   }

   public static startGame(): void {
      setInterval(this.tick, 1000 / SETTINGS.tps);
   }
}

export default Game;
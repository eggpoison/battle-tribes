import Board from "./Board";
import Camera from "./Camera";
import { render } from "./components/Canvas";
import SETTINGS from "./settings";

abstract class Game {
   public static tick(): void {
      Camera.updateCameraPosition();
      render();
      Board.tick();
   }

   public static startGame(): void {
      setInterval(this.tick, 1000 / SETTINGS.tps);
   }
}

export default Game;
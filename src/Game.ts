import { render } from "./components/Canvas";
import SETTINGS from "./settings";

abstract class Game {
   public static tick(): void {
      render();
   }

   public static startGame(): void {
      setInterval(this.tick, 1000 / SETTINGS.tps);
   }
}

export default Game;
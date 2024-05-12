import { updateHealthBar } from "../components/game/HealthBar";
import GameState from "./GameState";

/** Stores the definite, 100% known correct information about the game state. */
class DefiniteGameState extends GameState {
   /** Username of the player. Empty string if the player's name has not yet been assigned. */
   public playerUsername: string = "";

   /** Health of the instance player */
   private _playerHealth: number = 20;

   public get playerHealth(): number {
      return this._playerHealth;
   }

   public setPlayerHealth(newHealth: number): void {
      const healthHasChanged = newHealth !== this._playerHealth;

      this._playerHealth = newHealth;

      if (healthHasChanged && typeof updateHealthBar !== "undefined") {
         updateHealthBar(this._playerHealth);
      }
   }

   public playerIsDead(): boolean {
      return this._playerHealth <= 0;
   }
}

export default DefiniteGameState;
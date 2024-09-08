import GameState from "./GameState";

/** Stores the definite, 100% known correct information about the game state. */
class DefiniteGameState extends GameState {
   /** Username of the player. Empty string if the player's name has not yet been assigned. */
   public playerUsername: string = "";
}

export default DefiniteGameState;
import GameState from "./GameState";
/** Stores the definite, 100% known correct information about the game state. */
declare class DefiniteGameState extends GameState {
    /** Username of the player. Empty string if the player's name has not yet been assigned. */
    playerUsername: string;
    /** Health of the instance player */
    private _playerHealth;
    get playerHealth(): number;
    setPlayerHealth(newHealth: number): void;
    playerIsDead(): boolean;
}
export default DefiniteGameState;

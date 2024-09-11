// @Cleanup: remove this whole system
/** Information about the game and player. */
abstract class GameState {
   // @Cleanup: move to player-input.ts
   /** Whether the instance player is placing an entity. */
   public playerIsPlacingEntity = false;

   // @Cleanup: weird to be here
   public hotbarCrossbowLoadProgressRecord: Partial<Record<number, number>> = {};

   // Used to give movement penalty while wearing the leaf suit.
   // @Cleanup: would be great to not store a variable to do this.
   public lastPlantCollisionTicks = 0;

   public resetFlags(): void {
      this.playerIsPlacingEntity = false;
   }
}

export default GameState;
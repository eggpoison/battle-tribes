export const enum GameInteractState {
   none,
   summonEntity,
   spectateEntity,
   selectCarryTarget,
   selectRiderDepositLocation,
   selectMoveTargetPosition,
   selectAttackTarget
}

let gameInteractState = GameInteractState.none;

let isDead = false;

let cinematicModeIsEnabled = false;

let isSimulating = true;

let canAscendLayer = false;

let isHoveringOnMenu = true;

export const gameUIState = {
   get gameInteractState() {
      return gameInteractState;
   },
   setGameInteractState(newState: GameInteractState): void {
      gameInteractState = newState;
   },

   get isDead() {
      return isDead;
   },
   setIsDead(newIsDead: boolean) {
      isDead = newIsDead;
   },

   get cinematicModeIsEnabled() {
      return cinematicModeIsEnabled;
   },
   setCinematicModeIsEnabled(newCinematicModeIsEnabled: boolean): void {
      cinematicModeIsEnabled = newCinematicModeIsEnabled;
   },

   get isSimulating() {
      return isSimulating;
   },
   setIsSimulating(newIsSimulating: boolean): void {
      isSimulating = newIsSimulating;
   },

   get canAscendLayer() {
      return canAscendLayer;
   },
   setCanAscendLayer(newCanAscendLayer: boolean): void {
      canAscendLayer = newCanAscendLayer;
   },

   get isHoveringOnMenu() {
      return isHoveringOnMenu;
   },
   setIsHoveringOnMenu(newIsHoveringOnMenu: boolean): void {
      isHoveringOnMenu = newIsHoveringOnMenu;
   }
};
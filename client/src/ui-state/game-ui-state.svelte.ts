export const enum GameInteractState {
   none,
   summonEntity,
   spectateEntity,
   selectCarryTarget,
   selectRiderDepositLocation,
   selectMoveTargetPosition,
   selectAttackTarget
}

let gameInteractState = $state(GameInteractState.none);

let settingsIsOpen = $state(false);

let isDead = $state(false);

let cinematicModeIsEnabled = $state(false);

let isSimulating = $state(true);

let canAscendLayer = $state(false);

let cursorX = $state(0);
let cursorY = $state(0);

export const gameUIState = {
   get gameInteractState() {
      return gameInteractState;
   },
   setGameInteractState(newState: GameInteractState): void {
      gameInteractState = newState;
   },

   get settingsIsOpen() {
      return settingsIsOpen;
   },
   setSettingsIsOpen(newSettingsIsOpen: boolean): void {
      settingsIsOpen = newSettingsIsOpen;
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

   get cursorX() {
      return cursorX;
   },
   setCursorX(newCursorX: number): void {
      cursorX = newCursorX;
   },

   get cursorY() {
      return cursorY;
   },
   setCursorY(newCursorY: number): void {
      cursorY = newCursorY;
   }
};
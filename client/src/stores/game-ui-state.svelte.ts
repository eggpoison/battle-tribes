export const enum GameInteractState {
   none,
   summonEntity,
   spectateEntity,
   selectCarryTarget,
   selectRiderDepositLocation,
   selectMoveTargetPosition,
   selectAttackTarget
}

export let gameInteractState = $state(GameInteractState.none);
export function setGameInteractState(newState: GameInteractState): void {
   gameInteractState = newState;
}

export let settingsIsOpenState = $state(false);
export function setSettingsIsOpenState(isOpen: boolean): void {
   settingsIsOpenState = isOpen;
}

export let isDeadState = $state(false);
export function setIsDeadState(isDead: boolean): void {
   isDeadState = isDead;
}

export let cinematicModeIsEnabledState = $state(false);
export function setCinematicModeIsEnabledState(cinematicModeIsEnabled: boolean): void {
   cinematicModeIsEnabledState = cinematicModeIsEnabled;
}

export let isSimulatingState = $state(true);
export function setIsSimulatingState(isSimulating: boolean): void {
   isSimulatingState = isSimulating;
}

export let canAscendLayerState = $state(false);
export function setCanAscendLayerState(canAscendLayer: boolean): void {
   canAscendLayerState = canAscendLayer;
}
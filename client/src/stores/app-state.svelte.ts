export const enum AppState {
   mainMenu,
   loading,
   game
}

export let appState = $state<AppState>(AppState.mainMenu);

export function setAppState(newState: AppState): void {
   appState = newState;
}
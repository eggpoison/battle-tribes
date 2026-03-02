import { entitySelectionState } from "./entity-selection-state.svelte";

export const enum AppState {
   mainMenu,
   loading,
   game
}

let state = $state<AppState>(AppState.mainMenu);

export const appState = {
   get state() {
      return state;
   },
   setState(newState: AppState): void {
      if (newState === AppState.game) {
         // Reset state
         entitySelectionState.reset();
      }
      state = newState;
   }
};
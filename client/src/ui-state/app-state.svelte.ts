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
      state = newState;
   }
};
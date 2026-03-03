import { closeGameScreen, openGameScreen } from "../ui/GameScreen";
import { closeLoadingScreen, LoadingScreenStage, setLoadingScreenStage } from "../ui/LoadingScreen";
import { closeMainMenu } from "../ui/MainMenu";
import { entitySelectionState } from "./entity-selection-state";

export const enum AppState {
   mainMenu,
   loading,
   game
}

let state = AppState.mainMenu;

export function getAppState(): AppState {
   return state;
}
export function setAppState(newState: AppState): void {
   if (newState === state) {
      return;
   }

   // Remove previous
   switch (state) {
      case AppState.mainMenu: {
         closeMainMenu();
         break;
      }
      case AppState.loading: {
         closeLoadingScreen();
         break;
      }
      case AppState.game: {
         closeGameScreen();
         break;
      }
   }

   // Create new
   switch (newState) {
      case AppState.mainMenu: {
         // @SQUEAM
         break;
      }
      case AppState.loading: {
         setLoadingScreenStage(LoadingScreenStage.establishingConnection);
         break;
      }
      case AppState.game: {
         openGameScreen();
         break;
      }
   }
   
   if (newState === AppState.game) {
      // Reset state
      entitySelectionState.reset();
   }

   state = newState;
}
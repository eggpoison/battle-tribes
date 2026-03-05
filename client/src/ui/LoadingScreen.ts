import { TribeType } from "../../../shared/src";
import { establishNetworkConnection, reconnectClient } from "../game/networking/networking";
import { playerUsername, isSpectating } from "../game/player";
import { playerTribe } from "../game/tribes";
import { closeGameScreen } from "./GameScreen";
import { openMainMenu } from "./MainMenu";

export const enum LoadingScreenStage {
   establishingConnection,
   sendingPlayerData,
   initialisingGame,
   connectionError
}

const TXT_CONNECT = "Connecting to server...";
const TXT_SEND = "Sending player data...";
const TXT_INIT = "Initialising game...";

const loadingScreenElem = document.getElementById("loading-screen")!;

const textNode = document.getElementById("ls-text")!.firstChild as Text;

document.getElementById("ls-reconnect-button")!.addEventListener("click", () => {
   reconnectClient(playerUsername, playerTribe.tribeType, isSpectating);

   loadingScreenElem.classList.remove("is-error");
   textNode.data = TXT_CONNECT;
});
document.getElementById("ls-main-menu-button")!.addEventListener("click", () => {
   // Reset the text state back to the initial text
   textNode.data = TXT_CONNECT;
   closeLoadingScreen();
   openMainMenu();
});

export function openLoadingScreenFromMainMenu(username: string, tribeType: TribeType, isSpectating: boolean): void {
   // Assume that the loading screen is in a non-error state, and in the "connecting" text state.
   loadingScreenElem.classList.remove("hidden");
   establishNetworkConnection(username, tribeType, isSpectating);
}

export function openLoadingScreenFromNotMainMenu(): void {
   if (loadingScreenElem.classList.contains("hidden")) {
      loadingScreenElem.classList.remove("hidden");
      closeGameScreen();
   }

   loadingScreenElem.classList.add("is-error");
}

// @Speed: can ensure difference
export function setLoadingScreenStage(stage: LoadingScreenStage): void {
   loadingScreenElem.classList.remove("hidden");

   if (stage === LoadingScreenStage.connectionError) {
      loadingScreenElem.classList.add("is-error");
      return;
   }

   loadingScreenElem.classList.remove("is-error");
   
   switch (stage) {
      case LoadingScreenStage.establishingConnection: textNode.data = "Connecting to server..."; break;
      case LoadingScreenStage.sendingPlayerData:      textNode.data = "Sending player data..."; break;
      case LoadingScreenStage.initialisingGame:       textNode.data = "Initialising game..."; break;
   }
}

export function closeLoadingScreen(): void {
   loadingScreenElem.classList.add("hidden");
}
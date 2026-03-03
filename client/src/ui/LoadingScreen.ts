import { assert } from "../../../shared/src";
import { reconnectClient } from "../game/client";
import { AppState, setAppState } from "../ui-state/app-state";

export const enum LoadingScreenStage {
   establishingConnection,
   sendingPlayerData,
   initialisingGame,
   connectionError
}

function getLoadingScreenText(stage: LoadingScreenStage): string {
   switch (stage) {
      case LoadingScreenStage.establishingConnection: return "Connecting to server...";
      case LoadingScreenStage.sendingPlayerData:      return "Sending player data...";
      case LoadingScreenStage.initialisingGame:       return "Initialising game...";
      case LoadingScreenStage.connectionError:        return "";
   }
}

export function setLoadingScreenStage(stage: LoadingScreenStage): void {
   const loadingScreenElem = document.getElementById("loading-screen");
   if (!loadingScreenElem) {
      openLoadingScreen(stage);
      return;
   }
   
   if (stage === LoadingScreenStage.connectionError) {
      loadingScreenElem.classList.add("is-error");
      return;
   }

   loadingScreenElem.classList.remove("is-error");
   
   const textElem = loadingScreenElem.querySelector("#loading-screen p");
   assert(textElem);
   textElem.textContent = getLoadingScreenText(stage);
}

function reconnect(): void {
   reconnectClient();
   setLoadingScreenStage(LoadingScreenStage.establishingConnection);
}

function openMainMenu(): void {
   setAppState(AppState.mainMenu);
}

function openLoadingScreen(stage: LoadingScreenStage): void {
   const loadingScreenElem = document.createElement("div");
   loadingScreenElem.id = "loading-screen";
   if (stage === LoadingScreenStage.connectionError) {
      loadingScreenElem.classList.add("is-error");
   }
   loadingScreenElem.innerHTML = `
      <div class="ls-loading-view">
         <h1 class="title">Loading</h1>
         <div class="loading-message">
            <p>${getLoadingScreenText(stage)}</p>
         </div>
      </div>

      <div class="ls-error-view">
         <h1 class="title">Connection closed</h1>
         <div class="loading-message">
            <p>Connection with server failed.</p>
            <button class="reconnect-button">Reconnect</button>
            <button class="open-main-menu-button">Back</button>
         </div>
      </div>
   `;

   // Don't cache any of the elements here, so that the loading screen has no memory impact on the player when they play the actual game.

   loadingScreenElem.querySelector(".reconnect-button")!.addEventListener("click", reconnect);
   loadingScreenElem.querySelector(".open-main-menu-button")!.addEventListener("click", openMainMenu);
   
   document.body.appendChild(loadingScreenElem);
}

export function closeLoadingScreen(): void {
   document.getElementById("loading-screen")?.remove();
}
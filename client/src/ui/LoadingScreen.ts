import { establishNewNetworkConnection } from "../game/networking/networking";
import { openMainMenu } from "./MainMenu";

const TXT_CONNECTING = "Connecting to server...";
const TXT_WAITING = "Waiting for data...";
const TXT_INITIALISING = "Initialising game...";

const loadingScreenElem = document.getElementById("loading-screen")!;
const textNode = document.getElementById("ls-text")!.firstChild as Text;

// Init button events
{
   const reconnectButton = document.getElementById("ls-reconnect-button")!;

   reconnectButton.onclick = () => {
      establishNewNetworkConnection();

      loadingScreenElem.className = "";
      textNode.data = TXT_CONNECTING;
   };

   const mainMenuButton = reconnectButton.nextElementSibling as HTMLElement;
   mainMenuButton.onclick = () => {
      closeLoadingScreen();
      openMainMenu();

      textNode.data = TXT_CONNECTING;
   };
}

export function openLoadingScreen(): void {
   loadingScreenElem.hidden = false;
}

export function closeLoadingScreen(): void {
   loadingScreenElem.hidden = true;
}

export function setLoadingScreenStateToWaiting(): void {
   textNode.data = TXT_WAITING;
}

export function setLoadingScreenStateToInitialising(): void {
   textNode.data = TXT_INITIALISING;
}

export function setLoadingScreenStateToError(): void {
   loadingScreenElem.className = "is-error";
}
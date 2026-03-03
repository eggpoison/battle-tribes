import { TribeType } from "../../shared/src";
import "./css/index.css";
import { establishNetworkConnection } from "./game/client";
import { AppState, setAppState } from "./ui-state/app-state";
import "./game/entity-components/components"; // @HACK i have to manually import this so that the component arrays are all detected
import { onKeyDown, onKeyUp } from "./game/keyboard-input";
import { createPlayerInputListeners } from "./game/player-action-handling";
import { gameUIState } from "./ui-state/game-ui-state";
import { updateCursorScreenPos } from "./game/camera";
import { resizeCanvas } from "./game/webgl";
import { sendScreenResizePacket } from "./game/networking/packet-sending/screen-resize-packet-sending";

const onMouseMove = (e: MouseEvent): void => {
   gameUIState.setCursorX(e.clientX);
   gameUIState.setCursorY(e.clientY);
   updateCursorScreenPos(e);
}

const onWindowResize = (): void => {
   sendScreenResizePacket();
   resizeCanvas();
}

document.addEventListener("keydown", onKeyDown);
document.addEventListener("keyup", onKeyUp);
document.addEventListener("mousemove", onMouseMove);
document.addEventListener("load", createPlayerInputListeners);
window.addEventListener("resize", onWindowResize);

const getCurrentlyInputUsername = (): string => {
   const usernameInputElem = document.getElementById("username-input") as HTMLInputElement;
   return usernameInputElem.value;
}

/** Checks whether a given username is valid or not */
const usernameIsValid = (username: string): [warning: string, isValid: false] | [warning: null, isValid: true] => {
   const MAX_USERNAME_CHARS = 48;
   if (username.length > MAX_USERNAME_CHARS) return ["Name cannot be more than " + MAX_USERNAME_CHARS + " characters long!", false];
   
   if (username.length === 0) return ["Name cannot be empty!", false];

   // Make sure it doesn't contain any funky characters! only unicode or ur out!
   for (const char of username) {
      if (char.charCodeAt(0) > 127) {
         return ["Name cannot contain funky characters!", false];
      }
   }
   
   return [null, true];
}

function playGame(): void {
   // Make sure the username is valid
   const username = getCurrentlyInputUsername();
   const [warning, isValid] = usernameIsValid(username);
   if (!isValid) {
      alert(warning);
      return;
   }

   const selectedTribeTypeRadio: HTMLInputElement | null = document.querySelector(`input[name="tribe-selection"]:checked`);
   const isSpectatingCheckbox: HTMLInputElement | null = document.querySelector(`#main-menu input[type="checkbox"]`);
   if (selectedTribeTypeRadio !== null && isSpectatingCheckbox !== null) {
      const tribeType: TribeType = Number(selectedTribeTypeRadio.value);
      const isSpectating = isSpectatingCheckbox.checked;
      establishNetworkConnection(username, tribeType, isSpectating);
      setAppState(AppState.loading);
   }
}

function pressEnter(e: KeyboardEvent): void {
   if (e.code === "Enter") {
      playGame();
   }
}

document.getElementById("username-input")?.addEventListener("keydown", pressEnter);
document.getElementById("play-button")?.addEventListener("click", playGame);
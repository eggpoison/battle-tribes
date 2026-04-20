import { TribeType } from "webgl-test-shared";
import { establishNewNetworkConnection } from "../game/networking/networking";
import { setPlayerUsername, setIsSpectating, setPlayerTribeType } from "../game/player";
import { createAudioContext } from "../game/sound";
import { openLoadingScreen } from "./LoadingScreen";

const enum Var {
   MAX_USERNAME_CHARS = 48
}

const mainMenuElem = document.getElementById("main-menu")!;

document.getElementById("username-input")!.addEventListener("keydown", pressEnter);
document.getElementById("play-button")!.addEventListener("click", playGame);

export function openMainMenu(): void {
   mainMenuElem.hidden = false;
}

export function mainMenuIsHidden(): boolean {
   return mainMenuElem.hidden === true;
}

export function closeMainMenu(): void {
   mainMenuElem.hidden = true;
}

function pressEnter(e: KeyboardEvent): void {
   if (e.code === "Enter") {
      playGame();
   }
}

// @Garbage: temp array!!
const usernameIsValid = (username: string): [warning: string, isValid: false] | [warning: null, isValid: true] => {
   if (username.length > Var.MAX_USERNAME_CHARS) return ["Name cannot be more than " + Var.MAX_USERNAME_CHARS + " characters long!", false];
   
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
   // It's sometimes possible to spam-enter the enter key fast enough to call this twice
   if (mainMenuIsHidden()) {
      return;
   }
   
   // Make sure the username is valid
   const username = (document.getElementById("username-input") as HTMLInputElement).value;
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
      
      setPlayerUsername(username);
      setPlayerTribeType(tribeType);
      setIsSpectating(isSpectating);

      closeMainMenu();
      openLoadingScreen();

      establishNewNetworkConnection();
      
      // This is guaranteed to have occurred after a mouse press
      createAudioContext();
   }
}
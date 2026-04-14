import { TribeType } from "webgl-test-shared";
import "./css/index.css";
import "./game/entity-components/components"; // So that the component arrays are all detected
// @HACK because the whole nerdVision tree would otherwise never be imported
import "./ui/game/dev/NerdVision";
// @HACK
import "./ui/game/DeathScreen";
import { onKeyDown, onKeyUp } from "./game/keyboard-input";
import { createPlayerInputListeners } from "./game/player-action-handling";
import { gameUIState } from "./ui-state/game-ui-state";
import { updateCursorScreenPos } from "./game/camera";
import { resizeCanvas } from "./game/webgl";
import { sendScreenResizePacket } from "./game/networking/packet-sending/screen-resize-packet";
import { openLoadingScreenFromMainMenu } from "./ui/LoadingScreen";
import { closeMainMenu, mainMenuIsHidden } from "./ui/MainMenu";
import { createAudioContext } from "./game/sound";

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
// @SPEED: This listener shouldn't be added in the main menu. Will minorly affect loading perf.
document.addEventListener("mousemove", onMouseMove);
window.onresize = onWindowResize;
createPlayerInputListeners();

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

      closeMainMenu();
      openLoadingScreenFromMainMenu(username, tribeType, isSpectating);
      
      // This is guaranteed to have occurred after a mouse press
      createAudioContext();
   }
}

function pressEnter(e: KeyboardEvent): void {
   if (e.code === "Enter") {
      playGame();
   }
}

document.getElementById("username-input")!.addEventListener("keydown", pressEnter);
document.getElementById("play-button")!.addEventListener("click", playGame);

if (import.meta.hot) {
   import.meta.hot.accept();
}
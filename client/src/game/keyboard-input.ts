import { gameIsRunning } from "./client";
import { chatboxState } from "../ui-state/chatbox-state.svelte";
import { gameUIState } from "../ui-state/game-ui-state.svelte";
import { nerdVisionState } from "../ui-state/nerd-vision-state.svelte";
import { techTreeState } from "../ui-state/tech-tree-state.svelte";

const keyListeners: { [key: string]: Array<(e: KeyboardEvent) => void> } = {};

type IDKeyListener = {
   readonly key: string;
   readonly callback: (e: KeyboardEvent) => void;
}

const idKeyListeners: { [id: string]: IDKeyListener } = {};

/** Stores whether a key is pressed or not */
const pressedKeys: { [key: string]: boolean } = {};

export function keyIsPressed(key: string): boolean {
   return pressedKeys.hasOwnProperty(key) && pressedKeys[key];
}

/** Sets all keys to be unpressed */
export function clearPressedKeys(): void {
   for (const key of Object.keys(pressedKeys)) {
      pressedKeys[key] = false;
   }
}

export function addKeyListener(key: string, callback: (e: KeyboardEvent) => void, id?: string): void {
   if (typeof id !== "undefined") {
      idKeyListeners[id] = { key: key, callback: callback };
      return;
   }
   
   if (!keyListeners.hasOwnProperty(key)) {
      keyListeners[key] = [];
   }
   keyListeners[key].push(callback);
}

const callKeyListeners = (key: string, e: KeyboardEvent): void => {
   if (keyListeners.hasOwnProperty(key)) {
      for (const callback of keyListeners[key]) {
         callback(e);
      }
   }

   for (const { key: currentKey, callback } of Object.values(idKeyListeners)) {
      if (currentKey === key) {
         callback(e);
      }
   }
}

/**
 * Gets the key associated with a keyboard event in lowercase form if applicable.
 */
const getKey = (e: KeyboardEvent): string => {
   return e.key.toLowerCase();
}

export function onKeyDown(e: KeyboardEvent): void {
   // If the player is using a text input field, don't register key presses
   if (document.activeElement !== null && document.activeElement.tagName === "INPUT" && (document.activeElement as HTMLInputElement).type === "text") {
      return; 
   }

   const key = getKey(e); 

   callKeyListeners(key, e);

   if (gameIsRunning) {
      // Start a chat message
      if (key === "t") {
         chatboxState.setIsFocused(true);
         e.preventDefault();
         clearPressedKeys();
         return;
      // Toggle cinematic mode
      } else if (key === "o") {
         gameUIState.setCinematicModeIsEnabled(!gameUIState.cinematicModeIsEnabled);
      // Close the settings
      } else if (key === "Escape") {
         gameUIState.setSettingsIsOpen(false);
      // Display nerd vision
      } else if (key === "`") {
         nerdVisionState.setIsVisible(true);
      // Open terminal on tilda press
      } else if (key === "~") {
         nerdVisionState.setIsVisible(true);
         nerdVisionState.setTerminalIsVisible(true);
      // Open/close tech tree
      } else if (key === "p") {
         techTreeState.setIsVisible(!techTreeState.isVisible);
      }
   }

   pressedKeys[key] = true;
}

export function onKeyUp(e: KeyboardEvent): void {
   // If the event's key is undefined, don't continue.
   // This can occur when using autocomplete in a text input.
   if (typeof e.key === "undefined") {
      return;
   }
   
   const key = getKey(e);
   pressedKeys[key] = false;
}
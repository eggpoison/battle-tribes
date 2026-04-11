import { CommandPermissions, assert, commandIsValid } from "webgl-test-shared";
import { isDev } from "../../../game/utils";
import { sendTerminalCommandPacket } from "../../../game/networking/packet-sending/packet-sending";
import { nerdVision } from "../../../ui-state/nerd-vision-funcs";

const terminalLines: Array<string> = [];

const previousCommands: Array<string> = [];
let selectedCommandIndex = 0;

let terminalElem: HTMLDivElement | null = null;
let lineInputElem: HTMLInputElement | null = null;
let lineInputValue = "";

let isFocused = true;

const focusTerminal = (e?: MouseEvent): void => {
   isFocused = true;

   assert(terminalElem !== null);
   terminalElem.className = "focused";

   // Focus the line input
   if (lineInputElem !== null) {
      if (e !== undefined) {
         // Stop the click from registering so the focus is given to the line input
         e.preventDefault();
      }
      
      lineInputElem.focus();
   }
};

const unfocusTerminal = (): void => {
   isFocused = false;
};

function updateLineInputWidth(): void {
   if (lineInputElem !== null) {
      lineInputElem.style.width = Math.max(lineInputValue.length, 1) + "ch"; // Keep the input at least one character long
   }
}

const enterCommand = (): void => {
   const command = lineInputValue;

   terminalLines.push(">" + command);
   previousCommands.push(command);
   
   if (command.length === 0) {
      return;
   }

   const userPermissions = isDev() ? CommandPermissions.dev : CommandPermissions.player;

   const isValidResult = commandIsValid(command, userPermissions);
   if (isValidResult.isValid) {
      // @Hack @Cleanup
      if (command.split(" ")[0] === "clear") {
         terminalLines.length = 0;
      } else {
         sendTerminalCommandPacket(command);
      }
   } else {
      terminalLines.push(isValidResult.errorMessage);
   }

   // Clear the line input
   lineInputValue = "";

   selectedCommandIndex = previousCommands.length;
}

const enterKey = (e: KeyboardEvent): void => {
   switch (e.key) {
      case "Escape": {
         nerdVision.setTerminalIsVisible(false);
         break;
      }
      case "Enter": {
         enterCommand();
         break;
      }
      case "ArrowUp": {
         e.preventDefault();

         // Don't reenter a command if no commands have been entered
         if (previousCommands.length === 0 || selectedCommandIndex === 0) {
            break;
         }

         selectedCommandIndex--;
         
         const command = previousCommands[selectedCommandIndex];
         lineInputValue = command;
         break;
      }
      case "ArrowDown": {
         e.preventDefault();

         // Don't reenter a command if no commands have been entered
         if (previousCommands.length === 0 || selectedCommandIndex >= previousCommands.length) {
            break;
         }

         selectedCommandIndex++;

         let command: string;
         
         // If the user returns to the original command, set it to be blank
         if (selectedCommandIndex === previousCommands.length) {
            command = "";
         } else {
            command = previousCommands[selectedCommandIndex];
         }

         lineInputValue = command;
         break;
      }
   }
};

const checkForTerminalUnfocus = (e: MouseEvent): void => {
   let hasClickedOffTerminal = true;
   for (const element of e.composedPath()) {
      if ((element as HTMLElement).id === "terminal") {
         hasClickedOffTerminal = false;
         break;
      }
   }

   if (hasClickedOffTerminal) {
      unfocusTerminal();
   }
}

export function openTerminal(): void {
   assert(terminalElem === null);
   assert(lineInputElem === null);
   
   terminalElem = document.createElement("div");
   terminalElem.id = "terminal";
   terminalElem.addEventListener("mousedown", focusTerminal);
   
   terminalElem.innerHTML = `
   <div class="lines">
      {#each terminalLines as line}
         <div class="line">
            {line}
         </div>
      {/each}
   </div>

   <div class="line-reader">
      <span>&gt;</span>

      <div class="line-input-wrapper">
         <input name="line-input" type="text" class="line-input" autofocus />
         <div class="dummy-line-input"></div>
      </div>
   </div>
   `;

   lineInputElem = terminalElem.querySelector(`input[name="line-input"]`) as HTMLInputElement;
   lineInputElem.addEventListener("change", updateLineInputWidth);
   lineInputElem.addEventListener("keydown", enterKey);

   window.addEventListener("mousedown", checkForTerminalUnfocus);
}

export function closeTerminal(): void {
   assert(terminalElem);
   terminalElem.remove();
   terminalElem = null;
   
   window.removeEventListener("mousedown", checkForTerminalUnfocus);
}
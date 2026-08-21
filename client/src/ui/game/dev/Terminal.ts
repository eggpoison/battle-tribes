import { assert } from "../../../../../shared/src/utils";
import { commandIsValid, CommandPermissions } from "../../../../../shared/src/commands";
import { sendTerminalCommandPacket } from "../../../game/networking/packet-sending/packet-sending";

const terminalLines: string[] = [];

const previousCommands: string[] = [];
let selectedCommandIndex = 0;

let terminalElem: HTMLDivElement | null = null;
let linesElem: HTMLDivElement | null = null;
let lineInputElem: HTMLInputElement | null = null;

const focusTerminal = (): void => {
// const focusTerminal = (e: MouseEvent): void => {
   lineInputElem!.focus();

   terminalElem!.className = "focused";

   // Stop the click from registering so the focus is given to the line input
   // e.preventDefault();
};

const unfocusTerminal = (): void => {
   lineInputElem!.blur();
};

const createTerminalLineElem = (line: string): HTMLElement => {
   const lineElem = document.createElement("div");
   lineElem.className = "line";
   lineElem.textContent = line;
   return lineElem;
}

function addTerminalLine(line: string): void {
   assert(linesElem !== null);

   const elem = createTerminalLineElem(line);
   linesElem.appendChild(elem);

   terminalLines.push(line);
}

function clearTerminalLines(): void {
   assert(linesElem !== null);
   linesElem.replaceChildren();
   terminalLines.length = 0;
}

const enterCommand = (): void => {
   assert(lineInputElem !== null);
   const command = lineInputElem.value;

   addTerminalLine(">" + command);
   previousCommands.push(command);
   
   if (command.length === 0) {
      return;
   }

   const userPermissions = __DEV__ ? CommandPermissions.dev : CommandPermissions.player;

   const isValidResult = commandIsValid(command, userPermissions);
   if (isValidResult.isValid) {
      // @Hack @Cleanup
      if (command.split(" ")[0] === "clear") {
         clearTerminalLines();
      } else {
         sendTerminalCommandPacket(command);
      }
   } else {
      addTerminalLine(isValidResult.errorMessage);
   }

   // Clear the line input
   lineInputElem.value = "";

   selectedCommandIndex = previousCommands.length;
}

const enterKey = (e: KeyboardEvent): void => {
   assert(lineInputElem !== null);
   switch (e.key) {
      case "Escape": {
         destroyTerminal();
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
         lineInputElem.value = command;
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

         lineInputElem.value = command;
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

export function createTerminal(): void {
   assert(terminalElem === null);
   assert(linesElem === null);
   assert(lineInputElem === null);
   
   terminalElem = document.createElement("div");
   terminalElem.id = "terminal";
   terminalElem.onmousedown = focusTerminal;
   document.body.appendChild(terminalElem);

   linesElem = document.createElement("div");
   linesElem.className = "lines";
   for (const line of terminalLines) {
      const lineElem = createTerminalLineElem(line);
      linesElem.appendChild(lineElem);
   }
   terminalElem.appendChild(linesElem);

   const lineReaderElem = document.createElement("div");
   lineReaderElem.className = "line-reader";
   terminalElem.appendChild(lineReaderElem);

   const gtElem = document.createElement("span");
   gtElem.textContent = ">";
   lineReaderElem.append(gtElem);

   lineInputElem = document.createElement("input");
   lineInputElem.className = "line-input";
   lineInputElem.name = "line-input";
   lineInputElem.type = "text";
   lineInputElem.onkeydown = enterKey;
   lineReaderElem.appendChild(lineInputElem);

   focusTerminal();

   window.onmousedown = checkForTerminalUnfocus;
}

function destroyTerminal(): void {
   assert(terminalElem);
   terminalElem.remove();
   terminalElem = null;
   linesElem = null;
   lineInputElem = null;
   
   window.onmousedown = null;
}

export function openTerminal(e: KeyboardEvent): void {
   if (terminalElem === null) {
      createTerminal();
      // Stop the character "~" being typed into the terminal on open
      e.preventDefault();
   }
}

export function closeTerminal(): void {
   if (terminalElem !== null) {
      destroyTerminal();
   }
}
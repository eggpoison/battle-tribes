import { COMMANDS, CommandPermissions, CommandSpecifications, commandIsValid, parseCommand } from "battletribes-shared/commands";
import { useEffect, useRef, useState } from "react";
import { isDev } from "../../../utils";
import Client from "../../../client/Client";
import { setTerminalButtonOpened } from "./TerminalButton";
import Camera from "../../../Camera";
import Board from "../../../Board";
import { entityExists } from "../../../world";

/** All lines output by the terminal */
let terminalLines = new Array<string>();
/** Commands entered to the terminal */
const enteredCommands = new Array<string>();
let selectedCommandIndex = 0;

/**
 * Checks whether the player is using the terminal or not.
 */
export let playerIsUsingTerminal = false;

const getCommandErrorMessage = (command: string): string => {
   const commandComponents = parseCommand(command);

   // Check if the command type exists
   let commandSpecifications: CommandSpecifications | null = null;
   for (const currentCommandSpecifications of COMMANDS) {
      if (currentCommandSpecifications.name === commandComponents[0]) {
         commandSpecifications = currentCommandSpecifications;
         break;
      }
   }
   if (commandSpecifications === null) {
      return `Invalid command! Unable to find command '${commandComponents[0]}'.`;
   }

   return "Invalid command! Mismatch of parameters.";
}

export let setTerminalVisibility: (isVisible: boolean) => void;
export let toggleTerminalVisiblity: () => void;
export let forceTerminalFocus: () => void;

interface TerminalParams {
   readonly startingIsVisible: boolean;
}

const Terminal = ({ startingIsVisible }: TerminalParams) => {
   const lineInputRef = useRef<HTMLInputElement | null>(null);
   const [isVisible, setIsVisible] = useState(startingIsVisible);
   const [isInFocus, setIsInFocus] = useState(startingIsVisible);
   const [lineInputValue, setLineInputValue] = useState("");
   
   useEffect(() => {
      if (startingIsVisible && lineInputRef.current !== null) {
         lineInputRef.current.focus();
      }
   }, [startingIsVisible]);

   useEffect(() => {
      if (lineInputRef.current !== null) {
         lineInputRef.current.focus();
      }
   }, [isInFocus]);
   
   useEffect(() => {
      setTerminalVisibility = (isVisible: boolean): void => {
         setIsInFocus(false);
         setIsVisible(isVisible);
         setTerminalButtonOpened(isVisible);
         if (!isVisible) {
            setLineInputValue("");
         }
      }

      forceTerminalFocus = (): void => {
         focusTerminal();
      }
   }, []);

   useEffect(() => {
      toggleTerminalVisiblity = (): void => {
         const previousIsVisible = isVisible;
         setTerminalVisibility(!previousIsVisible)
      }
   }, [isVisible]);
   
   const focusTerminal = (e?: MouseEvent): void => {
      setIsInFocus(true);

      // Focus the line input
      if (lineInputRef.current !== null) {
         if (typeof e !== "undefined") {
            // Stop the click from registering so the focus is given to the line input
            e.preventDefault();
         }
         
         lineInputRef.current.focus();
      }
   }

   const unfocusTerminal = (): void => {
      setIsInFocus(false);
   }

   // Whenever the command input changes, update the input's length
   useEffect(() => {
      if (lineInputRef.current === null) return;
      
      // Keep the input at least one character long
      lineInputRef.current.style.width = Math.max(lineInputValue.length, 1) + "ch";
   }, [lineInputValue]);

   const enterCommand = (): void => {
      if (lineInputRef.current === null) return;

      const command = lineInputRef.current.value;

      terminalLines.push(">" + command);
      enteredCommands.push(command);
      
      if (command.length === 0) {
         return;
      }

      // Execute the command
      const userPermissions = isDev() ? CommandPermissions.dev : CommandPermissions.player;
      if (commandIsValid(command, userPermissions)) {
         // @Cleanup
         if (command.split(" ")[0] === "clear") {
            terminalLines = [];
         } else if (command.split(" ")[0] === "zoom") {
            const zoomAmountString = command.split(" ")[1];
            if (!Number.isNaN(zoomAmountString)) {
               const zoomAmount = Number(zoomAmountString);
               Camera.zoom = zoomAmount;
            }
         } else if (command.split(" ")[0] === "track") {
            const trackedEntityID = command.split(" ")[1];
            if (!Number.isNaN(trackedEntityID)) {
               const id = Number(trackedEntityID);
               if (entityExists(id)) {
                  Camera.setTrackedEntityID(id);
               }
            }
         } else if (command.split(" ")[0] === "tpcam") {
            const x = command.split(" ")[1];
            const y = command.split(" ")[2];
            if (!Number.isNaN(x) && !Number.isNaN(y)) {
               Camera.setPosition(Number(x), Number(y));
               Camera.setTrackedEntityID(0);
            }
         } else {
            Client.sendCommand(command);
         }
      } else {
         const errorMessage = getCommandErrorMessage(command);
         terminalLines.push(errorMessage);
      }

      // Clear the line input
      setLineInputValue("");

      selectedCommandIndex = enteredCommands.length;
   }

   const enterLineCharacter = (e: React.ChangeEvent<HTMLInputElement>): void => {
      selectedCommandIndex = enteredCommands.length;

      setLineInputValue(e.target.value);
   }

   const enterKey = (e: KeyboardEvent): void => {
      switch (e.key) {
         case "Escape": {
            setTerminalVisibility(false);
            break;
         }
         case "Enter": {
            enterCommand();
            break;
         }
         case "ArrowUp": {
            e.preventDefault();

            // Don't reenter a command if no commands have been entered
            if (enteredCommands.length === 0 || selectedCommandIndex === 0) {
               break;
            }

            selectedCommandIndex--;
            
            const command = enteredCommands[selectedCommandIndex];
            if (lineInputRef.current !== null) {
               setLineInputValue(command);
            }
            break;
         }
         case "ArrowDown": {
            e.preventDefault();

            // Don't reenter a command if no commands have been entered
            if (enteredCommands.length === 0 || selectedCommandIndex >= enteredCommands.length) {
               break;
            }

            selectedCommandIndex++;

            let command: string;
            
            // If the user returns to the original command, set it to be blank
            if (selectedCommandIndex === enteredCommands.length) {
               command = "";
            } else {
               command = enteredCommands[selectedCommandIndex];
            }

            if (lineInputRef.current !== null) {
               setLineInputValue(command);
            }
            break;
         }
      }
   };

   useEffect(() => {
      playerIsUsingTerminal = isInFocus;
   }, [isInFocus]);

   // When the terminal is closed, set isInFocus to false
   useEffect(() => {
      return () => {
         playerIsUsingTerminal = false;
      }
   }, []);

   useEffect(() => {
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

      window.addEventListener("mousedown", e => checkForTerminalUnfocus(e));

      return () => {
         window.removeEventListener("mousedown", checkForTerminalUnfocus);
      }
   }, []);

   if (!isVisible) return null;

   return <div id="terminal" className={isInFocus ? "focused" : undefined} onMouseDown={e => focusTerminal(e.nativeEvent)}>
      <div className="lines">
         {terminalLines.map((line: string, i: number) => {
            return <div className="line" key={i}>
               {line}
            </div>;
         })}
      </div>

      <div className="line-reader">
         <span>&gt;</span>

         <div className="line-input-wrapper">
            <input ref={lineInputRef} name="line-input" type="text" className="line-input" value={lineInputValue} onChange={e => enterLineCharacter(e)} onKeyDown={e => enterKey(e.nativeEvent)} />
            <div className="dummy-line-input"></div>
         </div>
      </div>
   </div>;
}

export default Terminal;
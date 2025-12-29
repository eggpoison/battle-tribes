<script lang="ts">
   import { CommandPermissions, commandIsValid } from "webgl-test-shared";
   import { isDev } from "../../../game/utils";
   import { nerdVisionState } from "../../../ui-state/nerd-vision-state.svelte";
   import { sendTerminalCommandPacket } from "../../../game/networking/packet-sending";

   /** All lines output by the terminal */
   const terminalLines = $state(new Array<string>());
   /** Commands entered to the terminal */
   const enteredCommands = new Array<string>();
   let selectedCommandIndex = 0;

   let lineInputElem: HTMLInputElement | undefined;
   let lineInputValue = $state("");

   let isFocused = $state(true);
   
   const focusTerminal = (e?: MouseEvent): void => {
      isFocused = true;

      // Focus the line input
      if (typeof lineInputElem !== "undefined") {
         if (typeof e !== "undefined") {
            // Stop the click from registering so the focus is given to the line input
            e.preventDefault();
         }
         
         lineInputElem.focus();
      }
   }

   const unfocusTerminal = (): void => {
      isFocused = false;
   }

   // Whenever the command input changes, update the input's length
   $effect(() => {
      if (typeof lineInputElem !== "undefined") {
         // Keep the input at least one character long
         lineInputElem.style.width = Math.max(lineInputValue.length, 1) + "ch";
      }
   });

   const enterCommand = (): void => {
      const command = lineInputValue;

      terminalLines.push(">" + command);
      enteredCommands.push(command);
      
      if (command.length === 0) {
         return;
      }

      const userPermissions = isDev() ? CommandPermissions.dev : CommandPermissions.player;

      const isValidResult = commandIsValid(command, userPermissions);
      if (isValidResult.isValid) {
         // @Hack @Cleanup
         if (command.split(" ")[0] === "clear") {
            terminalLines.splice(0, terminalLines.length);
         } else {
            sendTerminalCommandPacket(command);
         }
      } else {
         terminalLines.push(isValidResult.errorMessage);
      }

      // Clear the line input
      lineInputValue = "";

      selectedCommandIndex = enteredCommands.length;
   }

   const enterKey = (e: KeyboardEvent): void => {
      switch (e.key) {
         case "Escape": {
            nerdVisionState.setTerminalIsVisible(false);
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
            lineInputValue = command;
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

            lineInputValue = command;
            break;
         }
      }
   };

   $effect(() => {
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
   });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div id="terminal" class:focused={isFocused} onmousedown={focusTerminal}>
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
         <!-- svelte-ignore a11y_autofocus -->
         <input bind:this={lineInputElem} name="line-input" type="text" class="line-input" bind:value={lineInputValue} onkeydown={enterKey} autofocus />
         <div class="dummy-line-input"></div>
      </div>
   </div>
</div>
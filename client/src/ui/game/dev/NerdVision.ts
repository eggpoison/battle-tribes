// @SQUEAM
import { openDebugInfoDisplay } from "./DebugInfoDisplay";
// import HoverDebugDisplay from "./HoverDebugDisplay.svelte";
// import TabSelector from "./TabSelector.svelte";
// import Terminal from "./Terminal.svelte";

let isVisible = false;
let _terminalIsVisible = false;

export function nerdVisionIsVisible(): boolean {
   return isVisible;
}
export function setNerdVisionIsVisible(newIsVisible: boolean): void {
   if (!isVisible && newIsVisible) {
      openNerdVision();
   } else if (isVisible && !newIsVisible) {
      closeNerdVision();
   }
   
   isVisible = newIsVisible;
}

export function terminalIsVisible(): boolean {
   return _terminalIsVisible;
}
export function setTerminalIsVisible(newTerminalIsVisible: boolean): void {
   _terminalIsVisible =  newTerminalIsVisible;
}

const openNerdVision = (): void => {
   const nerdVisionElem = document.createElement("div");
   nerdVisionElem.id = "nerd-vision-wrapper";

   openDebugInfoDisplay(nerdVisionElem);
   
   document.body.appendChild(nerdVisionElem);
};

const closeNerdVision = (): void => {
   document.getElementById("nerd-vision-wrapper")?.remove();
};

// @SQUEAM
// {#if nerdVisionState.isVisible}
//    <div id="nerd-vision-wrapper">
//       <GameInfoDisplay />
//       <HoverDebugDisplay />
//        {#if nerdVisionState.terminalIsVisible}
//          <Terminal/>
//       {/if}

//       <TabSelector />
//    </div>
// {/if}
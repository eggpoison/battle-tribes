import { gameIsRunning } from "../../../game/game";
import { addKeyListener } from "../../../game/keyboard-input";
import { openDebugInfoDisplay } from "./DebugInfoDisplay";
import { nerdVision } from "../../../ui-state/nerd-vision-funcs";
import { hideFrameGraph, showFrameGraph } from "./FrameGraph";
import { createTabSelector, destroyTabSelector } from "./TabSelector";

let isVisible = false;
let _terminalIsVisible = false;

addKeyListener("`", () => {
   // Open/close nerd vision
   if (gameIsRunning) {
      nerdVision.setIsVisible(!nerdVision.isVisible());
   }
});

addKeyListener("~", () => {
   // Open terminal on tilda press
   if (gameIsRunning) {
      nerdVision.setIsVisible(true);
      nerdVision.setTerminalIsVisible(true);
   }
});

nerdVision.isVisible = (): boolean => {
   return isVisible;
}
nerdVision.setIsVisible = (newIsVisible: boolean): void => {
   if (!isVisible && newIsVisible) {
      openNerdVision();
   } else if (isVisible && !newIsVisible) {
      closeNerdVision();
   }
   
   isVisible = newIsVisible;
}

nerdVision.terminalIsVisible = (): boolean => {
   return _terminalIsVisible;
}
nerdVision.setTerminalIsVisible = (newTerminalIsVisible: boolean): void => {
   _terminalIsVisible =  newTerminalIsVisible;
}

function openNerdVision(): void {
   const nerdVisionElem = document.createElement("div");
   nerdVisionElem.id = "nerd-vision-wrapper";
   document.body.appendChild(nerdVisionElem);

   openDebugInfoDisplay(nerdVisionElem);
   createTabSelector(nerdVisionElem);
   
   showFrameGraph();
};

function closeNerdVision(): void {
   document.getElementById("nerd-vision-wrapper")?.remove();

   destroyTabSelector();
   
   hideFrameGraph();
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
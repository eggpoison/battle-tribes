import { openDebugInfoDisplay } from "./DebugInfoDisplay";
import { nerdVision } from "../../../ui-state/nerd-vision-funcs";
import { hideFrameGraph, showFrameGraph } from "./FrameGraph";
import { createTabSelector, destroyTabSelector } from "./TabSelector";
import { assert } from "../../../../../shared/src";

let isVisible = false;
let _terminalIsVisible = false;

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
   const nerdVisionElem = document.getElementById("nerd-vision-wrapper");
   assert(nerdVisionElem !== null);
   nerdVisionElem.remove();

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
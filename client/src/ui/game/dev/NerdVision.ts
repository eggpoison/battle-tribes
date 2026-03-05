// @SQUEAM
import { openDebugInfoDisplay } from "./DebugInfoDisplay";
import { nerdVision } from "./nerd-vision-funcs";

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
   console.log("opened nerd vision!!");
   console.log("2!!");
   const nerdVisionElem = document.createElement("div");
   nerdVisionElem.id = "nerd-vision-wrapper";

   openDebugInfoDisplay(nerdVisionElem);
   
   document.body.appendChild(nerdVisionElem);
};

function closeNerdVision(): void {
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
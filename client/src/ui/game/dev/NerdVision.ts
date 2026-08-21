import { assert } from "../../../../../shared/src/utils";
import { openDebugInfoDisplay } from "./DebugInfoDisplay";
import { hideFrameGraph, showFrameGraph } from "./FrameGraph";
import { createTabSelector, destroyTabSelector } from "./TabSelector";

let nerdVisionElem: HTMLElement | null = null;

const createNerdVision = (): void => {
   assert(nerdVisionElem === null);
   
   const rootElem = document.createElement("div");
   rootElem.id = "nerd-vision-wrapper";
   document.body.appendChild(rootElem);

   openDebugInfoDisplay(rootElem);
   createTabSelector(rootElem);
   
   showFrameGraph();

   nerdVisionElem = rootElem;
};

function destroyNerdVision(): void {
   assert(nerdVisionElem !== null);
   nerdVisionElem.remove();
   nerdVisionElem = null;

   destroyTabSelector();
   
   hideFrameGraph();
};

export function openNerdVision(): void {
   if (nerdVisionElem === null) {
      createNerdVision();
   }
}

export function closeNerdVision(): void {
   if (nerdVisionElem !== null) {
      destroyNerdVision();
   }
}

export function nerdVisionIsVisible(): boolean {
   return nerdVisionElem !== null;
}

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
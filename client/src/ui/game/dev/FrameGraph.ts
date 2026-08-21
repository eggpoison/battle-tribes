import { assert } from "../../../../../shared/src/utils";
import { createWebGLCanvas } from "../../../game/webgl";
import { frameGraph } from "../../../ui-state/frame-graph-funcs";

let fps = 0;
let average = 0;
let min = 0;
let max = 0;

// @Memory
let canvasElem: HTMLElement;
let frameGraphElem: HTMLElement | null = null;

frameGraph.setMetrics = (newFPS: number, newAverage: number, newMin: number, newMax: number): void => {
   fps = newFPS;
   average = newAverage;
   min = newMin;
   max = newMax;
};

export function createFrameGraphCanvas(): HTMLElement {
   canvasElem = createWebGLCanvas("frame-graph-canvas", false);
   return canvasElem;
}

export function createFrameGraph(): void {
   assert(frameGraphElem === null);
   
   frameGraphElem = document.createElement("div");
   frameGraphElem.id = "frame-graph";
   frameGraphElem.hidden = true;
   // @Speed
   frameGraphElem.innerHTML = `
      <p class="info"><span class="highlight">fps=${fps}</span> <span class="highlight">t_avg=${average.toFixed(2)}</span> <span class="highlight">t_min=${min.toFixed(2)}</span> <span class="highlight">t_max=${max.toFixed(2)}</span></p>
   `;
   document.body.appendChild(frameGraphElem);

   frameGraphElem.appendChild(canvasElem);
}

export function destroyFrameGraph(): void {
   assert(frameGraphElem !== null);
   frameGraphElem.remove();
   frameGraphElem = null;
}

export function showFrameGraph(): void {
   assert(frameGraphElem !== null);
   assert(frameGraphElem.hidden);
   frameGraphElem.hidden = false;
}

export function hideFrameGraph(): void {
   assert(frameGraphElem !== null);
   assert(!frameGraphElem.hidden);
   frameGraphElem.hidden = true;
}
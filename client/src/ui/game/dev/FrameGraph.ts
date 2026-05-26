import { assert } from "../../../../../shared/src/utils";
import { frameGraph } from "../../../ui-state/frame-graph-funcs";

let fps = 0;
let average = 0;
let min = 0;
let max = 0;

let frameGraphElem: HTMLElement | null = null;

frameGraph.setMetrics = (newFPS: number, newAverage: number, newMin: number, newMax: number): void => {
   fps = newFPS;
   average = newAverage;
   min = newMin;
   max = newMax;
};

export function createFrameGraph(): void {
   assert(frameGraphElem === null);
   
   frameGraphElem = document.createElement("div");
   frameGraphElem.id = "frame-graph";
   frameGraphElem.hidden = true;
   frameGraphElem.innerHTML = `
      <p class="info"><span class="highlight">fps=${fps}</span> <span class="highlight">t_avg=${average.toFixed(2)}</span> <span class="highlight">t_min=${min.toFixed(2)}</span> <span class="highlight">t_max=${max.toFixed(2)}</span></p>
      <canvas id="frame-graph-canvas"></canvas>
   `;
   document.body.appendChild(frameGraphElem);
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
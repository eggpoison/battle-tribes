<script lang="ts">
   import { FRAME_GRAPH_RECORD_TIME } from "../../../game/rendering/webgl/frame-graph-rendering";
   import { frameGraphState } from "../../../ui-state/frame-graph-state.svelte";
   import { nerdVisionState } from "../../../ui-state/nerd-vision-state.svelte";

   const frames = frameGraphState.trackedFrames;
   
   const fps = frames.length / FRAME_GRAPH_RECORD_TIME;

   let average = 0;
   let min = 999;
   let max = 0;
   for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const duration = frame.endTime - frame.startTime;

      average += duration;
      if (duration < min) {
         min = duration;
      }
      if (duration > max) {
         max = duration;
      }
   }
   average /= frames.length;
</script>

<div id="frame-graph" class:hidden={!nerdVisionState.isVisible}>
   <p class="info"><span>fps={fps}</span> <span>t_avg={average.toFixed(2)}</span> <span>t_min={min.toFixed(2)}</span> <span>t_max={max.toFixed(2)}</span></p>
   <canvas id="frame-graph-canvas"></canvas>
</div>

<style>
   @import url('https://fonts.googleapis.com/css2?family=Inconsolata:wght@400;700;900&display=swap');

   #frame-graph {
      position: absolute;
      left: 0;
      bottom: 0;
      z-index: 2;
      pointer-events: none;
   }

   #frame-graph canvas {
      background-color: rgba(0, 0, 0, 0.3);
   }

   #frame-graph p.info {
      margin: 0;
      position: absolute;
      top: 0.2rem;
      left: 0.2rem;
      user-select: none;
   }

   #frame-graph .info span {
      color: #fff;
      font-family: "Inconsolata";
      font-size: 1rem;
      font-weight: 400;
      background-color: rgba(0, 0, 0, 0.8);
   }
</style>
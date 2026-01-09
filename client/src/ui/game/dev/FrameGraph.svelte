<script lang="ts">
   import { frameGraphState } from "../../../ui-state/frame-graph-state.svelte";
   import { nerdVisionState } from "../../../ui-state/nerd-vision-state.svelte";
</script>

<div id="frame-graph" class:hidden={!nerdVisionState.isVisible}>
   <p class="info"><span class="highlight">fps={frameGraphState.fps}</span> <span class="highlight">t_avg={frameGraphState.average.toFixed(2)}</span> <span class="highlight">t_min={frameGraphState.min.toFixed(2)}</span> <span class="highlight">t_max={frameGraphState.max.toFixed(2)}</span></p>
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
      pointer-events: none;
   }

   #frame-graph .info span {
      color: #fff;
      font-family: "Inconsolata";
      font-size: 1rem;
      font-weight: 400;
      background-color: rgba(0, 0, 0, 0.8);
   }
</style>
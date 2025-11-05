<script lang="ts">
   import { Settings } from "../../../../shared/src/settings";

   let props = $props();

   const elapsedTicks = props.chargeElapsedTicks;
   const duration = props.chargeDuration;
   
   const progress = elapsedTicks / duration;
   const opacity = elapsedTicks <= duration ? 1 : Math.max(1 - (elapsedTicks - duration) * Settings.DT_S, 0);
</script>


{#if elapsedTicks !== -1 || opacity === 0}
   <div id="attack-charge-bar" draggable={false} style:left="{props.mouseX + 2}px" style:top="{props.mouseY}px" style:opacity="opacity: {opacity}">
      <div style="--chargeProgress: {Math.min(progress, 1)}" class="charge-bar"></div>
   </div>
{/if}

<style>
   #attack-charge-bar {
      --scale: 5;
      width: calc(9px * var(--scale));
      height: calc(3px * var(--scale));
      background-image: url("../../images/miscellaneous/attack-charge-bar.png");
      background-size: 100% 100%;
      position: absolute;
      z-index: 2;
      pointer-events: none;
      user-select: none;
      -moz-user-select: none;
      -webkit-user-select: none;
      -webkit-user-drag: none;
      image-rendering: pixelated;
      transform: translateY(-50%);
   }
   #attack-charge-bar .charge-bar {
      width: calc(7px * var(--scale) * var(--chargeProgress));
      height: 3px;
      background-color: #f0f0f0;
      position: absolute;
      top: calc(1px * var(--scale));
      left: calc(1px * var(--scale));
   }
</style>
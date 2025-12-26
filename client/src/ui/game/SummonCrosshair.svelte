<script lang="ts">
   import { onDestroy, onMount } from "svelte";
   import SummonCrosshairImg from "../../images/ui/summon-crosshair.png";

   let positionX = $state(0);
   let positionY = $state(0);

   function setPosition(e: MouseEvent): void {
      positionX = e.clientX;
      positionY = e.clientY;
   }

   onMount(() => {
      document.addEventListener("wheel", setPosition);
   });

   onDestroy(() => {
      document.removeEventListener("wheel", setPosition);
   });
</script>

<div id="summon-crosshair" style:left="{positionX}px" style:top="{positionY}px">
   <img src={SummonCrosshairImg} alt="" />
</div>
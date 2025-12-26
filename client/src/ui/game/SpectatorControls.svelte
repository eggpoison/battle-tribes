<script lang="ts">
   import { getSpectatorSpeed, setSpectatorSpeed } from "../../game/player-action-handler";
   import MenuElem from "./menus/MenuElem.svelte";

   let speed = $state(getSpectatorSpeed());

   $effect(() => {
      setSpectatorSpeed(speed);
   });
</script>

<MenuElem id="spectator-controls">
   <label>
      Speed
      <input type="range" min={200} max={2000} step={10} bind:value={speed} />
   </label>
</MenuElem>

<style>
   :global(#spectator-controls) {
      bottom: 1rem;
      top: unset;
   }
</style>
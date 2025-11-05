<script lang="ts">
   import { getSpectatorHasInstantMovement, getSpectatorSpeed, setSpectatorHasInstantMovement, setSpectatorSpeed } from "../../game/player-action-handler";
   import MenuElem from "./menus/MenuElem.svelte";

   let speed = $state(getSpectatorSpeed());
   let hasInstantMovement = $state(getSpectatorHasInstantMovement());

   $effect(() => {
      setSpectatorSpeed(speed);
   });
   $effect(() => {
      setSpectatorHasInstantMovement(hasInstantMovement);
   });
</script>

<MenuElem id="spectator-controls" class="menu">
   <label>
      Speed
      <input type="range" min={100} max={1000} step={50} bind:value={speed} />
   </label>
   <label>
      Instant movement
      <input type="checkbox" bind:value={hasInstantMovement} />
   </label>
</MenuElem>

<style>
   :global(#spectator-controls) {
      bottom: 1rem;
      top: unset;
   }
</style>
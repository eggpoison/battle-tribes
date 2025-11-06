<script lang="ts">
   import BarrelInventory from "./BarrelInventory.svelte";
   import CookingInventory from "./CookingInventory.svelte";
   import TombstoneEpitaph from "./TombstoneEpitaph.svelte";
   import TribesmanInteractMenu from "./TribesmanInteractMenu.svelte";
   import AmmoBoxInventory from "./AmmoBoxInventory.svelte";
   import { entityExists } from "../../../game/world";
   import { Menu, menuSelectorState } from "../../../ui-state/menu-selector-state.svelte";
   import { entityInteractionState } from "../../../ui-state/entity-interaction-state.svelte";

   // @Hack: "!"
   const selectedEntity = entityInteractionState.selectedEntity!;
   const menuType = menuSelectorState.menu;
</script>

{#if entityExists(selectedEntity)}
   {#if menuType === Menu.barrelInventory}
      <BarrelInventory />
   {:else if menuType === Menu.tribesmanInventory}
      <TribesmanInteractMenu />
   {:else if menuType === Menu.campfireInventory || menuType === Menu.furnaceInventory}
      <CookingInventory />
   {:else if menuType === Menu.tombstoneEpitaph}
      <TombstoneEpitaph />;
   {:else if menuType === Menu.ammoBoxInventory}
      <AmmoBoxInventory />;
   {/if}
{/if}
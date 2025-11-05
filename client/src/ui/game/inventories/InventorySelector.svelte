<script lang="ts">
   import BarrelInventory from "./BarrelInventory.svelte";
   import CookingInventory from "./CookingInventory.svelte";
   import TombstoneEpitaph from "./TombstoneEpitaph.svelte";
   import TribesmanInteractMenu from "./TribesmanInteractMenu.svelte";
   import AmmoBoxInventory from "./AmmoBoxInventory.svelte";
   import { getSelectedEntityID } from "../../../game/entity-selection";
   import { entityExists } from "../../../game/world";
   import { InventoryMenuType, menuSelectorState } from "../../../ui-state/menu-selector-state.svelte";

   const selectedEntity = getSelectedEntityID();
   const menuType = menuSelectorState.inventoryMenuType;
</script>

{#if entityExists(selectedEntity)}
   {#if menuType === InventoryMenuType.barrel}
      <BarrelInventory />
   {:else if menuType === InventoryMenuType.tribesman}
      <TribesmanInteractMenu />
   {:else if menuType === InventoryMenuType.campfire || menuType === InventoryMenuType.furnace}
      <CookingInventory />
   {:else if menuType === InventoryMenuType.tombstone}
      <TombstoneEpitaph />;
   {:else if menuType === InventoryMenuType.ammoBox}
      <AmmoBoxInventory />;
   {/if}
{/if}
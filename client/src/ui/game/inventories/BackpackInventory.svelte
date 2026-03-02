<script lang="ts">
   import { InventoryName } from "webgl-test-shared";
   import { getInventory, InventoryComponentArray } from "../../../game/entity-components/server-components/InventoryComponent";
   import { playerInstance } from "../../../game/player";
   import InventoryContainer from "./ItemSlotsContainer.svelte";
</script>

{#if playerInstance !== null}
   {@const inventoryComponent = InventoryComponentArray.getComponent(playerInstance)}
   {@const backpack = getInventory(inventoryComponent, InventoryName.backpack)!}
   <div id="backpack-inventory" class="inventory">
      <InventoryContainer entityID={playerInstance || undefined} inventory={backpack} />
   </div>
{/if}

<!-- @INCOMPLETE -->
   <!-- const backpackSlot = getInventory(inventoryComponent, InventoryName.backpackSlot);
   const backpack = getInventory(inventoryComponent, InventoryName.backpack);
   
   // @Cleanup: bad. should be done outside
   // If the player doesn't have a backpack equipped or the menu isn't shown, don't show anything
   if ((backpackSlot !== null && !backpackSlot.itemSlots.hasOwnProperty(1)) || backpack === null || !isVisible) return null;
   
   return  -->

<style>
   #backpack-inventory {
      padding: 0.25rem;
      position: absolute;
      bottom: 20rem;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1;
   }
</style>
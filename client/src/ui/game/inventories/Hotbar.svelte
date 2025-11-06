<script lang="ts">
   import { TribeType } from "webgl-test-shared";
   import { InventoryComponentArray } from "../../../game/entity-components/server-components/InventoryComponent";
   import { playerInstance } from "../../../game/player";
   import { playerTribe } from "../../../game/tribes";
   import EmptyItemSlot from "./EmptyItemSlot.svelte";
   import InventoryContainer from "./InventoryContainer.svelte";
   import { inventoryState } from "../../../ui-state/inventory-state.svelte";
   import { playerActionState } from "../../../ui-state/player-action-state.svelte";
</script>

{#if (playerInstance !== null && InventoryComponentArray.hasComponent(playerInstance))}
   <div id="hotbar">
      <div class="flex-container">
         <EmptyItemSlot className="hidden" />
         <EmptyItemSlot className="hidden" />
         <div class="inventory" class:hidden={playerTribe.tribeType !== TribeType.barbarians}>
            <InventoryContainer entityID={playerInstance} inventory={inventoryState.offhand} itemRestTime={playerActionState.offhandItemRestTime} />
         </div>
      </div>
      <div class="middle">
         <div class="inventory">
            <!-- @Hack -->
            <InventoryContainer entityID={playerInstance} inventory={inventoryState.hotbar} itemRestTime={playerActionState.hotbarItemRestTime} selectedItemSlot={inventoryState.selectedItemSlot} />
         </div>
      </div>
      <div class="flex-container">
         <div class="inventory">
            <InventoryContainer entityID={playerInstance} inventory={inventoryState.backpackSlot} />
            <InventoryContainer entityID={playerInstance} inventory={inventoryState.armourSlot} />
            <InventoryContainer entityID={playerInstance} inventory={inventoryState.gloveSlot} />
         </div>
      </div>
   </div>
{/if}
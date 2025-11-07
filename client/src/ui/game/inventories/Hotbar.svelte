<script lang="ts">
   import { TribeType } from "webgl-test-shared";
   import { InventoryComponentArray } from "../../../game/entity-components/server-components/InventoryComponent";
   import { playerInstance } from "../../../game/player";
   import { playerTribe } from "../../../game/tribes";
   import EmptyItemSlot from "./EmptyItemSlot.svelte";
   import { inventoryState } from "../../../ui-state/inventory-state.svelte";
   import { playerActionState } from "../../../ui-state/player-action-state.svelte";
   import BackpackWireframe from "../../../images/miscellaneous/backpack-wireframe.png";
   import ArmourWireframe from "../../../images/miscellaneous/armour-wireframe.png";
   import GloveWireframe from "../../../images/miscellaneous/glove-wireframe.png";
   import ItemSlotsContainer from "./ItemSlotsContainer.svelte";
   import EntityInteractableItemSlot from "./EntityInteractableItemSlot.svelte";
</script>

{#if (playerInstance !== null && InventoryComponentArray.hasComponent(playerInstance))}
   <div id="hotbar">
      <div class="flex-container">
         <EmptyItemSlot class="hidden" />
         <EmptyItemSlot class="hidden" />
         {#if playerTribe.tribeType === TribeType.barbarians}
            <ItemSlotsContainer isBordered>
               <EntityInteractableItemSlot entity={playerInstance} inventory={inventoryState.offhand} itemSlot={1} restTime={playerActionState.offhandItemRestTime} />
            </ItemSlotsContainer>
         {:else}
            <EmptyItemSlot class="hidden" />
         {/if}
      </div>
      <div class="middle">
         <ItemSlotsContainer isBordered>
            {#each inventoryState.hotbar.getSlots() as itemSlot}
               <EntityInteractableItemSlot entity={playerInstance} inventory={inventoryState.hotbar} itemSlot={itemSlot} restTime={playerActionState.hotbarItemRestTime} />
            {/each}
         </ItemSlotsContainer>
      </div>
      <div class="flex-container">
         <ItemSlotsContainer isBordered>
            <EntityInteractableItemSlot entity={playerInstance} inventory={inventoryState.backpackSlot} placeholderImg={BackpackWireframe} itemSlot={1} />
            <EntityInteractableItemSlot entity={playerInstance} inventory={inventoryState.armourSlot}   placeholderImg={ArmourWireframe}   itemSlot={1} />
            <EntityInteractableItemSlot entity={playerInstance} inventory={inventoryState.gloveSlot}    placeholderImg={GloveWireframe}    itemSlot={1} />
         </ItemSlotsContainer>
      </div>
   </div>
{/if}
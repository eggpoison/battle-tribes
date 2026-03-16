<script lang="ts">
   import { type Entity, Inventory, InventoryName } from "webgl-test-shared";
   import MenuElem from "../menus/MenuElem.svelte";
   import ItemSlotsContainer from "./Inventory";
   import InventoryItemSlots from "./InventoryItemSlots.svelte";
   import { selectedEntityInventoryState } from "../../../ui-state/selected-entity-inventory-state";

   interface Props {
      entity: Entity;
   }
  
   const { entity }: Props = $props();

   function getBarrelInventory(): Inventory {
      for (const inventory of selectedEntityInventoryState.inventories) {
         if (inventory.name === InventoryName.inventory) {
            return inventory;
         }
      }
      throw new Error();
   }
   
   const inventory = $derived(getBarrelInventory());
</script>

<MenuElem id="barrel-inventory" class="menu">
   <h2 class="menu-title">Barrel</h2>
   <div class="flex-container center">
      <ItemSlotsContainer isBordered width={inventory.width} height={inventory.height} numItemSlotsPassed={inventory.width * inventory.height}>
         <InventoryItemSlots entity={entity} inventory={inventory} />
      </ItemSlotsContainer>
   </div>
</MenuElem>
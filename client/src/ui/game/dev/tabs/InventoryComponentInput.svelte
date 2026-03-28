<script lang="ts">
   import { EntityType, InventoryName, INVENTORY_NAME_RECORD, Item } from "webgl-test-shared";
   import { ENTITY_INVENTORY_NAME_RECORD, tabSelectorState } from "../../../../ui-state/tab-selector-state";
   import ItemSlotsContainer from "../../inventories/Inventory";
   import { menuSelectorState } from "../../../menus";
   import { type ItemSlotCallbackInfo } from "../../inventories/EntityInteractableItemSlot";
    import InventoryItemSlots from "../../inventories/InventoryItemSlots.svelte";

   interface Props {
      readonly entityType: EntityType;
   }

   let props: Props = $props();

   const inventoryNames = ENTITY_INVENTORY_NAME_RECORD[props.entityType] || [];

   const fillItemSlot = (e: MouseEvent, callbackInfo: ItemSlotCallbackInfo, inventoryName: InventoryName, itemSlot: number): void => {
      if (callbackInfo.itemType === null) {
         return;
      }

      // @Temporary @Incomplete: allow any amount to be added
      const amount = 1;

      const inventory = tabSelectorState.summonedInventories[inventoryName];
      inventory.itemSlots[itemSlot] = new Item(callbackInfo.itemType, amount, 0, "", "");
      
      menuSelectorState.closeCurrentMenu();
   }
   
   const clickInventory = (e: MouseEvent, callbackInfo: ItemSlotCallbackInfo, inventoryName: InventoryName): void => {
      const itemSlot = callbackInfo.itemSlot;
      
      if (e.button === 2) {
         // Clear the item slot
         delete tabSelectorState.summonedInventories[inventoryName].itemSlots[itemSlot];
      } else {
         // @INCOMPLETE

         // const prompt = <ItemCatalogue hasAmountInput onMouseDown={(e: MouseEvent, callbackInfo: ItemSlotCallbackInfo) => fillItemSlot(e, callbackInfo, inventoryName, itemSlot)} />;
         // props.setMenu(prompt);
      }
   }
   
</script>

{#each inventoryNames as inventoryName}
   <p>{INVENTORY_NAME_RECORD[inventoryName]}</p>
   
   {@const inventory = tabSelectorState.summonedInventories[inventoryName]}
   <ItemSlotsContainer width={inventory.width} height={inventory.height} numItemSlotsPassed={inventory.width * inventory.height}>
      <InventoryItemSlots entity={0} inventory={inventory} onmousedown={(e: MouseEvent, callbackInfo: ItemSlotCallbackInfo) => clickInventory(e, callbackInfo, inventoryName)} />
   </ItemSlotsContainer>
{/each}
<script lang="ts">
   import CLIENT_ITEM_INFO_RECORD from "../../../../game/client-item-info";
   import { ItemType, ITEM_INFO_RECORD, Inventory, InventoryName, Item } from "webgl-test-shared";
   import { closeCurrentMenu } from "../../../../game/menus";
   import { ItemSlotCallbackInfo } from "../../inventories/ItemSlot.svelte";
   import InventoryContainer from "../../inventories/InventoryContainer.svelte";

   interface Props {
      readonly hasAmountInput?: boolean;
      onMouseDown?(e: MouseEvent, callbackInfo: ItemSlotCallbackInfo): void;
   }

   const WIDTH = 6;

   let props: Props = $props();

   let filter = $state("");
   
   const getFilteredItemTypes = (): ReadonlyArray<ItemType> => {
      const numItems = Object.keys(ITEM_INFO_RECORD).length;

      const itemTypes = new Array<ItemType>();
      for (let itemType: ItemType = 0; itemType < numItems; itemType++) {
         const clientItemInfo = CLIENT_ITEM_INFO_RECORD[itemType];

         if (clientItemInfo.name.toLowerCase().includes(filter)) {
            itemTypes.push(itemType);
         }
      }

      return itemTypes;
   }

   const itemTypes = getFilteredItemTypes();
   
   // Create inventory
   const inventory = new Inventory(WIDTH, Math.ceil(itemTypes.length / WIDTH), InventoryName.devInventory);
   for (let i = 0; i < itemTypes.length; i++) {
      const itemType = itemTypes[i];
      const itemSlot = i + 1;
      
      const item = new Item(itemType, 1, 0);
      inventory.addItem(item, itemSlot);
   }

   const onFilterKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
         closeCurrentMenu();
      }
   }
</script>
   
<div id="items-catalogue" class="devmode-tab devmode-container">
   <div class="flex-container">
      <div>
         <input type="text" placeholder="Search for items" onkeydown={e => onFilterKeyDown(e)} bind:value={filter} />
      </div>

      {#if props.hasAmountInput}
         <!-- @IncompletE??? @squeam -->
         <!-- <input type="text" placeholder="Give amount" onkeydown={e => onFilterKeyDown(e)} onchange={e => onFilterTextboxChange(e.target.value)} /> -->
         <input type="text" placeholder="Give amount" onkeydown={e => onFilterKeyDown(e)} />
      {/if}
   </div>
   
   <InventoryContainer onMouseDown={props.onMouseDown} entityID={0} inventory={inventory} />
</div>
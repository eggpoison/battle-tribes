<script lang="ts">
   import CLIENT_ITEM_INFO_RECORD from "../../../../game/client-item-info";
   import { ItemType, ITEM_INFO_RECORD, Item } from "webgl-test-shared";
   import ItemSlotsContainer from "../../inventories/ItemSlotsContainer.svelte";
   import ItemSlot from "../../inventories/ItemSlot.svelte";
    import { menuSelectorState } from "../../../../ui-state/menu-selector-state.svelte";

   interface Props {
      readonly hasAmountInput?: boolean;
      onmousedown?(e: MouseEvent, itemType: ItemType): void;
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
   // const inventory = new Inventory(WIDTH, Math.ceil(itemTypes.length / WIDTH), InventoryName.devInventory);
   // for (let i = 0; i < itemTypes.length; i++) {
   //    const itemType = itemTypes[i];
   //    const itemSlot = i + 1;
      
   //    const item = new Item(itemType, 1, 0);
   //    inventory.addItem(item, itemSlot);
   // }

   const onFilterKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
         menuSelectorState.closeMenu();
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
   
   <ItemSlotsContainer width={WIDTH} height={undefined} numItemSlotsPassed={itemTypes.length}>
      {#each itemTypes as itemType}
         <ItemSlot item={new Item(itemType, 1, 0)} onmousedown={e => props.onmousedown?.(e, itemType)} />
      {/each}
   </ItemSlotsContainer>
</div>
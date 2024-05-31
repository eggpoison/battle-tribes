import { ITEM_INFO_RECORD, Inventory, InventoryName, Item, ItemType } from "webgl-test-shared/dist/items";
import InventoryContainer from "../../inventories/InventoryContainer";
import { useEffect, useRef, useState } from "react";
import CLIENT_ITEM_INFO_RECORD from "../../../../client-item-info";

const enum Vars {
   INVENTORY_WIDTH = 6
}

const getFilteredItemTypes = (filter: string): ReadonlyArray<ItemType> => {
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

const ItemsTab = () => {
   const filterInputRef = useRef<HTMLInputElement | null>(null);
   const [filter, setFilter] = useState("");

   useEffect(() => {
      if (filterInputRef.current !== null) {
         filterInputRef.current.focus();
      }
   }, []);
   
   const onFilterTextboxChange = (newFilter: string): void => {
      setFilter(newFilter);
   }
   
   const itemTypes = getFilteredItemTypes(filter);
   
   const inventory = new Inventory(Vars.INVENTORY_WIDTH, Math.ceil(itemTypes.length / Vars.INVENTORY_WIDTH), InventoryName.devInventory);
   
   for (let i = 0; i < itemTypes.length; i++) {
      const itemType = itemTypes[i];
      const itemSlot = i + 1;
      
      const item = new Item(itemType, 1, 0);
      inventory.addItem(item, itemSlot);
   }
   
   return <div id="items-tab" className="devmode-tab devmode-container">
      <input ref={filterInputRef} type="text" placeholder="Search for items" onChange={e => onFilterTextboxChange(e.target.value)} />
      
      <InventoryContainer entityID={0} inventory={inventory} />
   </div>;
}

export default ItemsTab;
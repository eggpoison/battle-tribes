import InventoryContainer from "../../inventories/InventoryContainer";
import { useEffect, useRef, useState } from "react";
import CLIENT_ITEM_INFO_RECORD from "../../../../client-item-info";
import { ItemType, ITEM_INFO_RECORD, Inventory, InventoryName, Item } from "battletribes-shared/items/items";
import { ItemSlotCallbackInfo } from "../../inventories/ItemSlot";
import { closeCurrentMenu } from "../../../../menus";

interface ItemCatalogueProps {
   readonly hasAmountInput?: boolean;
   onMouseDown?(e: MouseEvent, callbackInfo: ItemSlotCallbackInfo): void;
}

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

const ItemCatalogue = (props: ItemCatalogueProps) => {
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

   const onFilterKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === "Escape") {
         closeCurrentMenu();
      }
   }
   
   const itemTypes = getFilteredItemTypes(filter);
   
   // Create inventory
   const inventory = new Inventory(Vars.INVENTORY_WIDTH, Math.ceil(itemTypes.length / Vars.INVENTORY_WIDTH), InventoryName.devInventory);
   for (let i = 0; i < itemTypes.length; i++) {
      const itemType = itemTypes[i];
      const itemSlot = i + 1;
      
      const item = new Item(itemType, 1, 0);
      inventory.addItem(item, itemSlot);
   }
   
   return <div id="items-catalogue" className="devmode-tab devmode-container">
      <div className="flex-container">
         <div>
            <input ref={filterInputRef} type="text" placeholder="Search for items" onKeyDown={e => onFilterKeyDown(e)} onChange={e => onFilterTextboxChange(e.target.value)} />
         </div>

         {props.hasAmountInput ? <div>
            <input ref={filterInputRef} type="text" placeholder="Give amount" onKeyDown={e => onFilterKeyDown(e)} onChange={e => onFilterTextboxChange(e.target.value)} />
         </div> : null}
      </div>
      
      <InventoryContainer onMouseDown={props.onMouseDown} entityID={0} inventory={inventory} />
   </div>;
}

export default ItemCatalogue;
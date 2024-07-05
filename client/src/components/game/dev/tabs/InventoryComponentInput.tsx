import { EntityType } from "webgl-test-shared/dist/entities";
import { InventoryName, Item } from "webgl-test-shared/dist/items/items";
import InventoryContainer from "../../inventories/InventoryContainer";
import ItemCatalogue from "./ItemCatalogue";
import { ItemSlotCallbackInfo } from "../../inventories/ItemSlot";
import { SUMMON_DATA_PARAMS } from "./SummonTab";
import { useReducer } from "react";
import { closeCurrentMenu } from "../../../../menus";

interface InventoryComponentInputProps {
   readonly entityType: EntityType;
   setMenu(element: JSX.Element): void;
}

// @Cleanup: move to separate file?
const INVENTORY_NAME_RECORD: Record<InventoryName, string> = {
   [InventoryName.ammoBoxInventory]: "Ammo Box Inventory",
   [InventoryName.armourSlot]: "Armour Slot",
   [InventoryName.backpack]: "Backpack",
   [InventoryName.backpackSlot]: "Backpack Slot",
   [InventoryName.craftingOutputSlot]: "Crafting Output Slot",
   [InventoryName.devInventory]: "Dev Inventory",
   [InventoryName.fuelInventory]: "Fuel Inventory",
   [InventoryName.gloveSlot]: "Glove Slot",
   [InventoryName.handSlot]: "Hand Slot",
   [InventoryName.heldItemSlot]: "Held Item Slot",
   [InventoryName.hotbar]: "Hotbar",
   [InventoryName.ingredientInventory]: "Ingredient Inventory",
   [InventoryName.inventory]: "Inventory",
   [InventoryName.offhand]: "Offhand",
   [InventoryName.outputInventory]: "Output Inventory"
};

// @Hack
export const NUM_INVENTORY_NAMES = Object.keys(INVENTORY_NAME_RECORD).length;

// @Hack? @Robustness
export const ENTITY_INVENTORY_NAME_RECORD: Partial<Record<EntityType, ReadonlyArray<InventoryName>>> = {
   [EntityType.tribeWarrior]: [InventoryName.hotbar, InventoryName.offhand, InventoryName.armourSlot, InventoryName.backpackSlot, InventoryName.gloveSlot],
   [EntityType.tribeWorker]: [InventoryName.hotbar, InventoryName.offhand, InventoryName.armourSlot, InventoryName.backpackSlot, InventoryName.gloveSlot]
}

const InventoryComponentInput = (props: InventoryComponentInputProps) => {
   const inventoryNames = ENTITY_INVENTORY_NAME_RECORD[props.entityType] || [];
   const [, forceUpdate] = useReducer(x => x + 1, 0);

   const fillItemSlot = (e: MouseEvent, callbackInfo: ItemSlotCallbackInfo, inventoryName: InventoryName, itemSlot: number): void => {
      if (callbackInfo.itemType === null) {
         return;
      }

      // @Temporary @Incomplete: allow any amount to be added
      const amount = 1;

      const inventory = SUMMON_DATA_PARAMS.inventories[inventoryName];
      inventory.itemSlots[itemSlot] = new Item(callbackInfo.itemType, amount, 0);
      
      forceUpdate();
      closeCurrentMenu();
   }
   
   const clickInventory = (e: MouseEvent, callbackInfo: ItemSlotCallbackInfo, inventoryName: InventoryName): void => {
      const itemSlot = callbackInfo.itemSlot;
      
      if (e.button === 2) {
         // Clear the item slot
         delete SUMMON_DATA_PARAMS.inventories[inventoryName].itemSlots[itemSlot];
         forceUpdate();
      } else {
         const prompt = <ItemCatalogue hasAmountInput onMouseDown={(e: MouseEvent, callbackInfo: ItemSlotCallbackInfo) => fillItemSlot(e, callbackInfo, inventoryName, itemSlot)} />;
         props.setMenu(prompt);
      }
   }
   
   const elems = new Array<JSX.Element>();
   for (let i = 0; i < inventoryNames.length; i++) {
      const inventoryName = inventoryNames[i];

      elems.push(
         <p key={elems.length}>{INVENTORY_NAME_RECORD[inventoryName]}</p>
      );
      
      const inventory = SUMMON_DATA_PARAMS.inventories[inventoryName];
      elems.push(
         <InventoryContainer entityID={0} inventory={inventory} key={elems.length} onMouseDown={(e: MouseEvent, callbackInfo: ItemSlotCallbackInfo) => clickInventory(e, callbackInfo, inventoryName)} />
      );
   }
   
   return <>
      {elems}
   </>;
}

export default InventoryComponentInput;
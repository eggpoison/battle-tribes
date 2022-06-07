import InventoryComponent from "../../entity-components/inventory/InventoryComponent";
import ITEMS, { ItemName } from "../../items/items";

export type HeldItem = {
   readonly name: ItemName;
   amount: number;
}
let heldItem: HeldItem | null = null;

export function getHeldItem(): HeldItem | null {
   return heldItem;
}

const stackItem = (slotNum: number, inventoryComponent: InventoryComponent): void => {
   let { name: itemName, amount: itemAmount } = heldItem!;

   const addAmount = inventoryComponent.getItemAddAmount(itemName, itemAmount, slotNum);

   if (addAmount !== null) {
      inventoryComponent.addItemToSlot(slotNum, itemName, addAmount);
    
      // Remove from the held item
      itemAmount -= addAmount;
      // If the held item doesn't have any left, remove it
      if (itemAmount <= 0) {
         heldItem = null;
      }
   }
}

export function clickInventorySlot(slotNum: number, inventoryComponent: InventoryComponent): void {
   const itemSlots = inventoryComponent.getItemSlots();
   const slotInfo = itemSlots[slotNum];

   if (typeof slotInfo === "undefined") { // If the clicked slot is empty
      // If there is a held item, add it to the inventory
      if (heldItem !== null) {
         inventoryComponent.addItemToSlot(slotNum, heldItem.name, heldItem.amount);
         heldItem = null;
      }
   } else { // If the clicked slot has an item

      const [itemName, itemAmount] = slotInfo;

      // If there isn't a held item, hold the clicked item
      if (heldItem === null) {
         heldItem = {
            name: itemName,
            amount: itemAmount
         };

         inventoryComponent.removeItemFromSlot(slotNum, itemAmount);
      } else {
         // If there is a held item and the clicked item is of the same type, stack them
         if (itemName === heldItem.name) {
            stackItem(slotNum, inventoryComponent);
         }
      }
   }
}

interface ItemSlotProps {
   readonly itemName?: ItemName;
   readonly amount?: number;
   readonly slotNum: number;
   getInventoryComponent: () => InventoryComponent;
   readonly isSelected: boolean;
}

const ItemSlot = ({ itemName, amount, slotNum, getInventoryComponent, isSelected }: ItemSlotProps) => {
   const info = typeof itemName !== "undefined" ? ITEMS[ItemName[itemName] as unknown as ItemName] : undefined;

   const onClick = (e: MouseEvent): void => {
      e.preventDefault();

      const inventoryComponent = getInventoryComponent();
      clickInventorySlot(slotNum, inventoryComponent)
   }

   return (
      <div onClick={e => onClick(e.nativeEvent)} className={`item-slot${isSelected ? " selected" : ""}`}>
         {typeof info !== "undefined" ? <>
            <img src={require("../../images/" + info.imageSrc)} alt={info.displayName} className="preview" />
            <div className="amount">{amount}</div>

            <div className="name">{info.displayName}</div>
         </> : undefined}
      </div>
   );
}

export default ItemSlot;
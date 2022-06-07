import Player from "../../entities/tribe-members/Player";
import FiniteInventoryComponent from "../../entity-components/inventory/FiniteInventoryComponent";
import InventoryComponent from "../../entity-components/inventory/InventoryComponent";
import ITEMS, { ItemName } from "../../items/items";

let openedInventoryComponent: InventoryComponent | null = null;

export function updateOpenedInventoryComponent(inventoryComponent: InventoryComponent | null): void {
   openedInventoryComponent = inventoryComponent;
}

export type HeldItem = {
   readonly name: ItemName;
   amount: number;
}
let heldItem: HeldItem | null = null;

export function getHeldItem(): HeldItem | null {
   return heldItem;
}

const getPlayerInventoryComponent = (): FiniteInventoryComponent => {
   return Player.instance.getComponent(FiniteInventoryComponent)!;
}

const quickMoveItem = (slotNum: number, clickedInventoryComponent: InventoryComponent, otherInventoryComponent: InventoryComponent): void => {
   // Get the item
   const [itemName, itemAmount] = clickedInventoryComponent.getItem(slotNum)!;

   // Add the item to the other inventory component
   const numItemsAdded = otherInventoryComponent.addItem(itemName, itemAmount);

   // Remove the item from the clicked inventory component
   clickedInventoryComponent.removeItemFromSlot(slotNum, numItemsAdded);
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

export function clickInventorySlot(slotNum: number, inventoryComponent: InventoryComponent, e: MouseEvent): void {
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

      if (openedInventoryComponent !== null && e.shiftKey) {
         const otherInventoryComponent = inventoryComponent === openedInventoryComponent ? getPlayerInventoryComponent() : openedInventoryComponent;         

         quickMoveItem(slotNum, inventoryComponent, otherInventoryComponent);
      } else {
         // If there isn't currently a held item, hold the clicked item
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
            } else { // Otherwise switch them
               inventoryComponent.setItem(slotNum, heldItem.name, heldItem.amount);

               heldItem = {
                  name: itemName,
                  amount: itemAmount
               };
            }
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
      const inventoryComponent = getInventoryComponent();
      clickInventorySlot(slotNum, inventoryComponent, e);
      
      e.preventDefault();
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
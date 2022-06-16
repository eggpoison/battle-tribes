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

const splitItem = (slotNum: number, inventoryComponent: InventoryComponent): void => {
   const itemSlots = inventoryComponent.getItemSlots();
   const itemSlot = itemSlots[slotNum];
   const [ itemName, itemAmount ] = itemSlot;
   
   const holdAmount = Math.round((itemAmount + Number.EPSILON) / 2);

   // Hold the item
   heldItem = {
      name: itemName,
      amount: holdAmount
   };

   // Take away from the clicked item
   inventoryComponent.removeItemFromSlot(slotNum, holdAmount);
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
   const { name: itemName, amount: itemAmount } = heldItem!;

   const amountAdded = inventoryComponent.addItemToSlot(slotNum, itemName, itemAmount);

   // Remove from the held item
   heldItem!.amount -= amountAdded;
   // If the held item doesn't have any left, remove it
   if (heldItem!.amount <= 0) {
      heldItem = null;
   }
}

const clickInventorySlot = (slotNum: number, inventoryComponent: InventoryComponent, e: MouseEvent): void => {
   const itemSlots = inventoryComponent.getItemSlots();
   const slotInfo = itemSlots[slotNum];

   if (typeof slotInfo === "undefined") { // If the clicked slot is empty
      // If there is a held item, add it to the inventory
      if (heldItem !== null) {
         // Add the item to the inventory
         let amountAdded: number;
         if (e.button === 2) { // If the button was a right click, only add one item
            amountAdded = inventoryComponent.addItemToSlot(slotNum, heldItem.name, 1);
         } else { // If the button was a left click, then add the whole stack.
            amountAdded = inventoryComponent.addItemToSlot(slotNum, heldItem.name, heldItem.amount);
         }

         // Clear the held item
         heldItem.amount -= amountAdded;
         if (heldItem.amount <= 0) {
            heldItem = null;
         }
      }
   } else { // If the clicked slot has an item
      const [itemName, itemAmount] = slotInfo;

      // On right click
      if (e.button === 2) {
         // Split the item if there isn't a held item
         if (heldItem === null) {
            splitItem(slotNum, inventoryComponent);
         } else if (itemName === heldItem.name) { // Otherwise if the held item is of the same type, add 1 to the item
            const amountAdded = inventoryComponent.addItemToSlot(slotNum, itemName, 1);

            // Remove from the held item
            heldItem.amount -= amountAdded;
            if (heldItem.amount === 0) {
               heldItem = null;
            }
         }

         return;
      }

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
   const info = typeof itemName !== "undefined" ? ITEMS[itemName] : undefined;

   const mouseEvent = (e: MouseEvent): void => {
      const inventoryComponent = getInventoryComponent();
      clickInventorySlot(slotNum, inventoryComponent, e);
      
      e.preventDefault();
   }

   return (
      <div onClick={e => mouseEvent(e.nativeEvent)} onContextMenu={e => mouseEvent(e.nativeEvent)} className={`item-slot${isSelected ? " selected" : ""}`}>
         {typeof info !== "undefined" ? <>
            <img src={require("../../images/" + info.imageSrc)} alt={info.displayName} className="preview" />
            <div className="amount">{amount}</div>

            <div className="name">{info.displayName}</div>
         </> : undefined}
      </div>
   );
}

export default ItemSlot;
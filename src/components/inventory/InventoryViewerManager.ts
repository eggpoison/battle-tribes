import InventoryComponent, { ItemSlots } from "../../entity-components/inventory/InventoryComponent";
import { ItemName } from "../../items/items";

export type InventoryViewerIDs = "playerInventory" | "tribeStash";

type ItemInTransit = {
   readonly slotInfo: [ItemName, number];
}
let itemInTransit: ItemInTransit | null = null;

const stackItem = (slotNum: number, inventoryComponent: InventoryComponent): void => {
   const [itemName, itemAmount] = itemInTransit!.slotInfo;

   const addAmount = inventoryComponent.getItemAddAmount(itemName, itemAmount, slotNum);

   if (addAmount !== null) {
      if (addAmount === 0) {
         itemInTransit = null;
         return;
      }

      inventoryComponent.addItemToSlot(slotNum, itemName, addAmount);
    
      // Remove the item in transit
      itemInTransit!.slotInfo[1] -= addAmount;
      if (itemInTransit!.slotInfo[1] <= 0) {
         itemInTransit = null;
      }
   }
}

export function clickInventorySlot(slotNum: number, inventoryViewerManager: InventoryViewerManager): void {
   const inventoryComponent = inventoryViewerManager.inventoryComponent;

   const itemSlots = inventoryComponent.getItemSlots();
   const slotInfo = itemSlots[slotNum];

   if (typeof slotInfo === "undefined") {
      // If the clicked slot is empty

      // If there is an item in transit, deposit it
      if (itemInTransit !== null) {
         inventoryComponent.addItemToSlot(slotNum, itemInTransit.slotInfo[0], itemInTransit.slotInfo[1]);
         inventoryViewerManager.setItemSlots(inventoryComponent.getItemSlots());

         itemInTransit = null;
      }
   } else {
      // If the clicked slot has an item

      // If there isn't an item in transit, move it into transit
      if (itemInTransit === null) {
         itemInTransit = {
            slotInfo: [slotInfo[0], slotInfo[1]]
         };

         inventoryComponent.removeItemFromSlot(slotNum, slotInfo[1]);
         inventoryViewerManager.setItemSlots(inventoryComponent.getItemSlots());
      } else {
         // If there is an item in transit and the clicked item is of the same type, stack them
         if (slotInfo[0] === itemInTransit.slotInfo[0]) {
            stackItem(slotNum, inventoryComponent);

            inventoryViewerManager.setItemSlots(inventoryComponent.getItemSlots());
         }
      }
   }
}

type InventoryViewerManagerInstances = Partial<Record<InventoryViewerIDs, InventoryViewerManager>>;

abstract class InventoryViewerManager {
   private static readonly instances: InventoryViewerManagerInstances = {};

   public readonly id: InventoryViewerIDs;

   public inventoryComponent!: InventoryComponent;

   public updateItemSlots?(itemSlots: ItemSlots): void;

   constructor(id: InventoryViewerIDs) {
      InventoryViewerManager.instances[id] = this;
      this.id = id;
   }

   public static getInstance(name: InventoryViewerIDs): InventoryViewerManager {
      return this.instances[name]!;
   }

   public static hasInstance(name: InventoryViewerIDs): boolean {
      return this.instances.hasOwnProperty(name);
   }

   public setInventoryComponent(inventoryComponent: InventoryComponent): void {
      this.inventoryComponent = inventoryComponent;
   }

   public setItemSlots(itemSlots: ItemSlots): void {
      if (typeof this.updateItemSlots !== "undefined") {
         this.updateItemSlots(itemSlots);
      }
   }
}

export default InventoryViewerManager;
import { useEffect, useState } from "react";
import InventoryComponent, { ItemSlots } from "../entity-components/InventoryComponent";
import ITEMS, { ItemName } from "../items";

type InventoryViewerIDs = "playerInventory" | "tribeStash";

type ItemInTransit = {
   readonly slotInfo: [ItemName, number];
}
let itemInTransit: ItemInTransit | null = null;

const stackItem = (slotNum: number, inventoryViewer: InventoryViewerManager): void => {
   const [itemName, itemAmount] = itemInTransit!.slotInfo;
   inventoryViewer.inventoryComponent.addItemToSlot(slotNum, itemName, itemAmount);

   itemInTransit = null;
}

const clickSlot = (slotNum: number, inventoryViewerName: InventoryViewerIDs): void => {
   const inventoryViewer = InventoryViewerManager.getInstance(inventoryViewerName);
   if (typeof inventoryViewer.inventoryComponent === "undefined") {
      throw new Error(`inventoryComponent was undefined for ${inventoryViewerName}!`);
   }

   const itemSlots = inventoryViewer.inventoryComponent.getItemSlots();
   const slotInfo = itemSlots[slotNum];

   if (typeof slotInfo === "undefined") {
      // If the clicked slot is empty

      // If there is an item in transit, deposit it
      if (itemInTransit !== null) {
         inventoryViewer.inventoryComponent.addItemToSlot(slotNum, itemInTransit.slotInfo[0], itemInTransit.slotInfo[1]);
         inventoryViewer.setInventory(itemSlots);

         itemInTransit = null;
      }
   } else {
      // If the clicked slot has an item

      // If there isn't an item in transit, move it into transit
      if (itemInTransit === null) {
         itemInTransit = {
            slotInfo: slotInfo
         };

         inventoryViewer.inventoryComponent.removeItem(slotNum, slotInfo[1]);
         inventoryViewer.setInventory(itemSlots);
      } else {
         // If there is an item in transit and the clicked item is of the same type, stack them
         if (slotInfo[0] === itemInTransit.slotInfo[0]) {
            stackItem(slotNum, inventoryViewer);

            inventoryViewer.setInventory(itemSlots);
         }
      }
   }
}

interface InventoryViewerProps {
   readonly inventoryViewerManager: InventoryViewerManager;
   readonly isVisible?: boolean;
}
export function InventoryViewer ({ inventoryViewerManager, isVisible = true }: InventoryViewerProps): JSX.Element | null {
   const [itemSlots, setItemSlots] = useState<ItemSlots>([]);
   const [slotCount, setSlotCount] = useState<number>(inventoryViewerManager.initialSlotCount);

   useEffect(() => {
      if (typeof inventoryViewerManager.inventoryComponent !== "undefined") {
         setItemSlots(inventoryViewerManager.inventoryComponent.getItemSlots());
      }
   }, [inventoryViewerManager.inventoryComponent]);
   
   useEffect(() => {
      inventoryViewerManager.setInventoryViewerSlotCount = (slotCount: number): void => {
         setSlotCount(slotCount);
      }

      inventoryViewerManager.updateItemSlots = (itemSlots: ItemSlots): void => {
         setItemSlots(itemSlots.slice());
      }
   }, [inventoryViewerManager]);

   const slotElements = new Array<JSX.Element>();
   for (let i = 0; i < slotCount; i++) {
      if (typeof itemSlots[i] === "undefined") {
         slotElements.push(
            <div onMouseDown={() => clickSlot(i, inventoryViewerManager.id)} className="slot" key={i}></div>
         );
         continue;
      }

      const [itemName, itemCount] = itemSlots[i];

      const itemID = ItemName[itemName] as unknown as ItemName;
      const item = ITEMS[itemID];

      const imageSrc = require("../images/" + item.imageSrc);
      slotElements.push(
         <div onMouseDown={() => clickSlot(i, inventoryViewerManager.id)} className="slot" key={i}>
            <img src={imageSrc} alt={itemName as unknown as string} className="preview" />
            <div className="item-count">{itemCount}</div>
         </div>
      );
   }

   return isVisible ? <div className="inventory">
      {slotElements}
   </div> : null;
}

type InventoryViewerManagerInstances = Partial<Record<InventoryViewerIDs, InventoryViewerManager>>;

class InventoryViewerManager {
   private static readonly instances: InventoryViewerManagerInstances = {};

   public readonly id: InventoryViewerIDs;
   public readonly initialSlotCount: number;

   public inventoryComponent!: InventoryComponent;

   public setInventoryViewerSlotCount?(slotCount: number): void;
   public updateItemSlots?(itemSlots: ItemSlots): void;

   constructor(id: InventoryViewerIDs, initialSlotCount: number) {
      InventoryViewerManager.instances[id] = this;
      this.id = id;
      this.initialSlotCount = initialSlotCount;
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

   public setSlotCount(newSlotCount: number): void {
      if (typeof this.setInventoryViewerSlotCount !== "undefined") {
         this.setInventoryViewerSlotCount(newSlotCount);
      }
   }

   public setInventory(itemSlots: ItemSlots): void {
      if (typeof this.updateItemSlots !== "undefined") {
         this.updateItemSlots(itemSlots);
      }
   }
}

export default InventoryViewerManager;
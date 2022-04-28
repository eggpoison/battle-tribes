import { useEffect, useState } from "react";
import { ItemSlots } from "../entity-components/InventoryComponent";
import ITEMS, { ItemName } from "../items";

interface InventoryViewerProps {
   readonly inventoryViewerManager: InventoryViewerManager;
}
export function InventoryViewer ({ inventoryViewerManager }: InventoryViewerProps): JSX.Element {
   const [itemSlots, setItemSlots] = useState<ItemSlots>([]);
   const [slotCount, setSlotCount] = useState<number>(inventoryViewerManager.initialSlotCount);
   
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
            <div className="slot" key={i}></div>
         );
         continue;
      }

      const [itemName, itemCount] = itemSlots[i];

      const itemID = ItemName[itemName] as unknown as ItemName;
      const item = ITEMS[itemID];

      const imageSrc = require("../images/" + item.imageSrc);
      slotElements.push(
         <div className="slot" key={i}>
            <img src={imageSrc} alt={itemName as unknown as string} className="preview" />
            <div className="item-count">{itemCount}</div>
         </div>
      );
   }

   return <div className="inventory">
      {slotElements}
   </div>
}

type InventoryViewerNames = "playerInventory" | "tribeStash";
type InventoryViewerManagerInstances = Partial<Record<InventoryViewerNames, InventoryViewerManager>>;

class InventoryViewerManager {
   private static readonly instances: InventoryViewerManagerInstances = {};

   public readonly initialSlotCount: number;

   public setInventoryViewerSlotCount?(slotCount: number): void;
   public updateItemSlots?(itemSlots: ItemSlots): void;

   constructor(id: InventoryViewerNames, initialSlotCount: number) {
      InventoryViewerManager.instances[id] = this;
      this.initialSlotCount = initialSlotCount;
   }

   public static getInstance(name: InventoryViewerNames): InventoryViewerManager {
      return this.instances[name]!;
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
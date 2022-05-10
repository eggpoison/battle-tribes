import { useState, useEffect } from "react";
import { ItemSlots } from "../../entity-components/inventory/InventoryComponent";
import FiniteInventoryViewerManager from "./FiniteInventoryViewerManager";
import InfiniteInventoryViewerManager from "./InfiniteInventoryViewerManager";
import InventoryPage from "./InventoryPage";
import InventoryViewerManager from "./InventoryViewerManager";

const getInventoryViewerManagerSlotCount = (inventoryViewerManager: FiniteInventoryViewerManager | InfiniteInventoryViewerManager): number => {
   if (inventoryViewerManager instanceof FiniteInventoryViewerManager) {
      return inventoryViewerManager.initialSlotCount;
   } else {
      return 30;
   }
}

interface InventoryViewerProps {
   readonly inventoryViewerManager: InventoryViewerManager;
   readonly isVisible?: boolean;
}
export function InventoryViewer ({ inventoryViewerManager, isVisible = true }: InventoryViewerProps) {
   const [itemSlots, setItemSlots] = useState<ItemSlots>([]);
   const [slotCount, setSlotCount] = useState<number>(getInventoryViewerManagerSlotCount(inventoryViewerManager));

   useEffect(() => {
      if (typeof inventoryViewerManager.inventoryComponent !== "undefined") {
         setItemSlots(inventoryViewerManager.inventoryComponent.getItemSlots());
      }
   }, [inventoryViewerManager.inventoryComponent]);
   
   useEffect(() => {
      if (inventoryViewerManager instanceof FiniteInventoryViewerManager) {
         inventoryViewerManager.setInventoryViewerSlotCount = (slotCount: number): void => {
            setSlotCount(slotCount);
         }
      }

      inventoryViewerManager.updateItemSlots = (itemSlots: ItemSlots): void => {
         setItemSlots(itemSlots.slice());
      }
   }, [inventoryViewerManager]);

   return isVisible ? <div className="inventory">
      <InventoryPage itemSlots={itemSlots.slice()} slotCount={slotCount} inventoryViewerManager={inventoryViewerManager} />
   </div> : null;
}

export default InventoryViewer;
import InventoryViewerManager, { InventoryViewerIDs } from "./InventoryViewerManager";

class FiniteInventoryViewerManager extends InventoryViewerManager {
   public readonly initialSlotCount: number;
   
   public setInventoryViewerSlotCount?(slotCount: number): void;

   constructor(id: InventoryViewerIDs, initialSlotCount: number) {
      super(id);

      this.initialSlotCount = initialSlotCount;
   }

   public setSlotCount(newSlotCount: number): void {
      if (typeof this.setInventoryViewerSlotCount !== "undefined") {
         this.setInventoryViewerSlotCount(newSlotCount);
      }
   }
}

export default FiniteInventoryViewerManager;
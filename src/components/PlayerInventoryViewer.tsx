import Chief from "../entities/tribe-members/Chief";
import FiniteInventoryViewerManager from "./inventory/FiniteInventoryViewerManager";
import { InventoryViewer } from "./inventory/InventoryViewer";

const PlayerInventoryViewer = () => {
   const inventoryViewerManager = new FiniteInventoryViewerManager("playerInventory", Chief.DEFAULT_INVENTORY_SLOT_COUNT);

   return (
      <div id="inventory-viewer">
         <InventoryViewer inventoryViewerManager={inventoryViewerManager} />
      </div>
   );
}

export default PlayerInventoryViewer;
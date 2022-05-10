import Player from "../entities/tribe-members/Player";
import FiniteInventoryViewerManager from "./inventory/FiniteInventoryViewerManager";
import { InventoryViewer } from "./inventory/InventoryViewer";

const PlayerInventoryViewer = () => {
   const inventoryViewerManager = new FiniteInventoryViewerManager("playerInventory", Player.DEFAULT_INVENTORY_SLOT_COUNT);

   return (
      <div id="inventory-viewer">
         <InventoryViewer inventoryViewerManager={inventoryViewerManager} />
      </div>
   );
}

export default PlayerInventoryViewer;
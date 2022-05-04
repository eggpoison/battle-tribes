import { useRef } from "react";
import Player from "../entities/tribe-members/Player";
import InventoryViewerManager, { InventoryViewer } from "./InventoryViewerManager";

const PlayerInventoryViewer = () => {
   const inventoryViewerManagerRef = useRef<InventoryViewerManager>(
      new InventoryViewerManager("playerInventory", Player.DEFAULT_INVENTORY_SLOT_COUNT)
   );

   return (
      <div id="inventory-viewer">
         <InventoryViewer inventoryViewerManager={inventoryViewerManagerRef.current} />
      </div>
   );
}

export default PlayerInventoryViewer;
// import Chief from "../entities/tribe-members/Chief";
// import FiniteInventoryViewerManager from "./inventory/FiniteInventoryViewerManager";
// import { InventoryViewer } from "./inventory/InventoryViewer";

// const PlayerInventoryViewer = () => {
//    const inventoryViewerManager = new FiniteInventoryViewerManager("playerInventory", Chief.DEFAULT_INVENTORY_SLOT_COUNT);

//    return (
//       <div id="inventory-viewer">
//          <InventoryViewer inventoryViewerManager={inventoryViewerManager} />
//       </div>
//    );
// }

// export default PlayerInventoryViewer;

import { useEffect, useState } from "react";
import Chief from "../../entities/tribe-members/Chief";
import Player from "../../entities/tribe-members/Player";
import FiniteInventoryComponent from "../../entity-components/inventory/FiniteInventoryComponent";
import InventoryComponent, { ItemSlots } from "../../entity-components/inventory/InventoryComponent";
import { ItemName } from "../../items/items";
import Inventory from "./Inventory";
import InventoryWrapper from "./InventoryWrapper";

const getPlayerInventoryComponent = (): InventoryComponent => {
   return Player.instance.getComponent(FiniteInventoryComponent)!;
}

export let updatePlayerInventoryViewer: (itemSlots: ItemSlots) => void;

const PlayerInventoryViewer = () => {
   const [itemSlots, setItemSlots] = useState(new Array<[ItemName, number]>());

   useEffect(() => {
      updatePlayerInventoryViewer = (itemSlots: ItemSlots): void => {
         setItemSlots(itemSlots.slice());
      }
   }, []);

   return (
      <InventoryWrapper id="inventory-viewer">
         <Inventory itemSlots={itemSlots} slotCount={Chief.DEFAULT_INVENTORY_SLOT_COUNT} getInventoryComponent={getPlayerInventoryComponent} />
      </InventoryWrapper>
   );
}

export default PlayerInventoryViewer;
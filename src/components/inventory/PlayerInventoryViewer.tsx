import { useEffect, useState } from "react";
import Chief from "../../entities/tribe-members/Chief";
import Player from "../../entities/tribe-members/Player";
import FiniteInventoryComponent from "../../entity-components/inventory/FiniteInventoryComponent";
import InventoryComponent, { ItemSlots } from "../../entity-components/inventory/InventoryComponent";
import { ItemName } from "../../items/items";
import Inventory from "./Inventory";
import InventoryWrapper from "./InventoryWrapper";

export let updatePlayerInventoryViewerSelectedSlot: (newSelectedSlot: number) => void;

const getPlayerInventoryComponent = (): InventoryComponent => {
   return Player.instance.getComponent(FiniteInventoryComponent)!;
}

export let updatePlayerInventoryViewer: (itemSlots: ItemSlots) => void;

const PlayerInventoryViewer = () => {
   const [itemSlots, setItemSlots] = useState(new Array<[ItemName, number]>());
   const [selectedItemSlot, setSelectedItemSlot] = useState<number>(0);

   useEffect(() => {
      updatePlayerInventoryViewer = (itemSlots: ItemSlots): void => {
         setItemSlots(itemSlots.slice());
      }

      updatePlayerInventoryViewerSelectedSlot = (newSelectedSlot: number): void => {
         setSelectedItemSlot(newSelectedSlot);
      }
   }, []);

   return (
      <InventoryWrapper id="inventory-viewer">
         <Inventory itemSlots={itemSlots} slotCount={Chief.DEFAULT_INVENTORY_SLOT_COUNT} selectedSlot={selectedItemSlot} getInventoryComponent={getPlayerInventoryComponent} />
      </InventoryWrapper>
   );
}

export default PlayerInventoryViewer;
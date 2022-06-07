import { useEffect, useState } from "react";
import Player from "../../entities/tribe-members/Player";
import InfiniteInventoryComponent from "../../entity-components/inventory/InfiniteInventoryComponent";
import InventoryComponent, { ItemSlots } from "../../entity-components/inventory/InventoryComponent";
import { ItemName } from "../../items/items";
import Inventory from "./Inventory";

export let toggleTribeStashViewerVisibility: (newVisibility?: boolean) => void;
export let tribeStashViewerIsOpen: () => boolean;

export let updateTribeStashViewer: (itemSlots: ItemSlots) => void;

const getInventoryComponent = (): InventoryComponent => {
   return Player.instance.tribe.stash.getComponent(InfiniteInventoryComponent)!;
}

const TribeStashViewer = () => {
   const [isVisible, setIsVisible] = useState<boolean>(false);
   const [itemSlots, setItemSlots] = useState(new Array<[ItemName, number]>());

   useEffect(() => {
      updateTribeStashViewer = (itemSlots: ItemSlots): void => {
         setItemSlots(itemSlots.slice());
      }
   }, []);
   
   useEffect(() => {
      toggleTribeStashViewerVisibility = (newVisibility?: boolean): void => {
         const newIsVisible = typeof newVisibility !== "undefined" ? newVisibility : isVisible ? false : true;
         setIsVisible(newIsVisible);
      }

      tribeStashViewerIsOpen = (): boolean => {
         return isVisible;
      }
   }, [isVisible]);

   return isVisible ? (
      <div id="tribe-stash-viewer">
         <Inventory itemSlots={itemSlots} slotCount={40} getInventoryComponent={getInventoryComponent} />
         {/* <InventoryViewer inventoryViewerManager={tribeStashViewerManagerRef.current!} /> */}
      </div>
   ) : null;
}

export default TribeStashViewer;
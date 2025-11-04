import { useEffect, useReducer, useState } from "react";
import InventoryContainer from "./InventoryContainer";
import { getInventory, InventoryComponentArray } from "../../../game/entity-components/server-components/InventoryComponent";
import { InventoryName } from "battletribes-shared/items/items";
import { playerInstance } from "../../../game/player";

export let BackpackInventoryMenu_setIsVisible: (isVisible: boolean) => void = () => {};
export let BackpackInventoryMenu_update: () => void = () => {};

const BackpackInventoryMenu = () => {
   const [, update] = useReducer(x => x + 1, 0);
   const [isVisible, setIsVisible] = useState(false);

   useEffect(() => {
      BackpackInventoryMenu_setIsVisible = (isVisible: boolean) => {
         setIsVisible(isVisible);
      }
      
      BackpackInventoryMenu_update = (): void => {
         update();
      }
   }, []);

   if (playerInstance === null) {
      return;
   }

   const inventoryComponent = InventoryComponentArray.getComponent(playerInstance);
   if (inventoryComponent === null) {
      return;
   }
   
   const backpackSlot = getInventory(inventoryComponent, InventoryName.backpackSlot);
   const backpack = getInventory(inventoryComponent, InventoryName.backpack);
   
   // @Cleanup: bad. should be done outside
   // If the player doesn't have a backpack equipped or the menu isn't shown, don't show anything
   if ((backpackSlot !== null && !backpackSlot.itemSlots.hasOwnProperty(1)) || backpack === null || !isVisible) return null;
   
   return <div id="backpack-inventory" className="inventory">
      <InventoryContainer entityID={playerInstance || undefined} inventory={backpack} />
   </div>;
}

export default BackpackInventoryMenu;
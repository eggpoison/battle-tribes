import { useEffect, useReducer, useState } from "react";
import Player from "../../../entities/Player";
import InventoryContainer from "./InventoryContainer";
import { InventoryComponentArray } from "../../../entity-components/server-components/InventoryComponent";
import { InventoryName } from "battletribes-shared/items/items";

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
   
   const inventoryComponent = Player.instance !== null ? InventoryComponentArray.getComponent(Player.instance.id) : undefined;
   const backpackSlot = inventoryComponent?.getInventory(InventoryName.backpackSlot) || null;
   const backpack = inventoryComponent?.getInventory(InventoryName.backpack) || null;
   
   // @Cleanup: bad. should be done outside
   // If the player doesn't have a backpack equipped or the menu isn't shown, don't show anything
   if ((backpackSlot !== null && !backpackSlot.itemSlots.hasOwnProperty(1)) || backpack === null || !isVisible) return null;
   
   return <div id="backpack-inventory" className="inventory">
      <InventoryContainer entityID={Player.instance?.id} inventory={backpack} />
   </div>;
}

export default BackpackInventoryMenu;
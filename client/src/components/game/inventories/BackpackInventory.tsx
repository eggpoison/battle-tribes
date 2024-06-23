import { useEffect, useReducer, useState } from "react";
import { definiteGameState } from "../../../game-state/game-states";
import Player from "../../../entities/Player";
import InventoryContainer from "./InventoryContainer";

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

   
   // @Cleanup: bad. should be done outside
   // If the player doesn't have a backpack equipped or the menu isn't shown, don't show anything
   if (!definiteGameState.backpackSlot.itemSlots.hasOwnProperty(1) || definiteGameState.backpack === null || !isVisible) return null;
   
   return <div id="backpack-inventory" className="inventory">
      <InventoryContainer entityID={Player.instance!.id} inventory={definiteGameState.backpack} />
   </div>;
}

export default BackpackInventoryMenu;
import { useEffect, useReducer, useState } from "react";
import ItemSlot from "./ItemSlot";
import { getItemTypeImage } from "../../../client-item-info";
import { definiteGameState } from "../../../game-state/game-states";
import { leftClickItemSlot, rightClickItemSlot } from "../../../inventory-manipulation";
import Player from "../../../entities/Player";

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

   
   // If the player doesn't have a backpack equipped or the menu isn't shown, don't show anything
   if (!definiteGameState.backpackSlot.itemSlots.hasOwnProperty(1) || definiteGameState.backpack === null || !isVisible) return null;

   const itemSlots = new Array<JSX.Element>();

   for (let y = 0; y < definiteGameState.backpack.height; y++) {
      const rowItemSlots = new Array<JSX.Element>();
      for (let x = 0; x < definiteGameState.backpack.width; x++) {
         const itemSlot = y * definiteGameState.backpack.width + x + 1;

         if (definiteGameState.backpack.itemSlots.hasOwnProperty(itemSlot)) {
            const item = definiteGameState.backpack.itemSlots[itemSlot];

            const itemImageSrc = getItemTypeImage(item.type);

            rowItemSlots.push(
               <ItemSlot key={x} onClick={e => leftClickItemSlot(e, Player.instance!.id, definiteGameState.backpack!, itemSlot)} onContextMenu={e => rightClickItemSlot(e, Player.instance!.id, definiteGameState.backpack!, itemSlot)} picturedItemImageSrc={itemImageSrc} itemCount={item.count} isSelected={false} />
            );
         } else {
            rowItemSlots.push(
               <ItemSlot key={x} onClick={e => leftClickItemSlot(e, Player.instance!.id, definiteGameState.backpack!, itemSlot)} onContextMenu={e => rightClickItemSlot(e, Player.instance!.id, definiteGameState.backpack!, itemSlot)} isSelected={false} />
            );
         }
      }
      
      itemSlots.push(
         <div key={y} className="inventory-row">
            {rowItemSlots}
         </div>
      );
   }
   
   return <div id="backpack-inventory" className="inventory">
      {itemSlots}
   </div>;
}

export default BackpackInventoryMenu;
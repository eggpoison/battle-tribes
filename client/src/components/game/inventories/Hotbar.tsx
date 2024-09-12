import { TribeType } from "battletribes-shared/tribes";
import { useEffect, useReducer, useState } from "react";
import ItemSlot from "./ItemSlot";
import Player from "../../../entities/Player";
import Game from "../../../Game";
import { InventoryName, Item, itemTypeIsArmour, itemTypeIsBackpack, itemTypeIsGlove } from "battletribes-shared/items/items";
import EmptyItemSlot from "./EmptyItemSlot";
import { InventoryComponentArray } from "../../../entity-components/InventoryComponent";
import InventoryContainer from "./InventoryContainer";
import { getHotbarSelectedItemSlot } from "../../../player-input";

export let Hotbar_update: () => void = () => {};

export let Hotbar_setHotbarSelectedItemSlot: (itemSlot: number) => void = () => {};

export let Hotbar_updateRightThrownBattleaxeItemID: (rightThrownBattleaxeItemID: number) => void = () => {};
export let Hotbar_updateLeftThrownBattleaxeItemID: (leftThrownBattleaxeItemID: number) => void = () => {};

const Hotbar = () => {
   const [selectedItemSlot, setSelectedItemSlot] = useState(1);
   // @Incomplete
   const [rightThrownBattleaxeItemID, setRightThrownBattleaxeItemID] = useState(-1);
   const [leftThrownBattleaxeItemID, setLeftThrownBattleaxeItemID] = useState(-1);
   const [, update] = useReducer(x => x + 1, 0);

   useEffect(() => {
      Hotbar_update = () => {
         update();
      }

      Hotbar_setHotbarSelectedItemSlot = (itemSlot: number): void => {
         setSelectedItemSlot(itemSlot);
      }
 
      Hotbar_updateRightThrownBattleaxeItemID = (rightThrownBattleaxeItemID: number): void => {
         setRightThrownBattleaxeItemID(rightThrownBattleaxeItemID);
      }

      Hotbar_updateLeftThrownBattleaxeItemID = (leftThrownBattleaxeItemID: number): void => {
         setLeftThrownBattleaxeItemID(leftThrownBattleaxeItemID);
      }
   }, []);


   const playerID = Player.instance?.id || undefined;
   
   const inventoryComponent = Player.instance !== null ? InventoryComponentArray.getComponent(Player.instance.id) : undefined;
   const hotbar = inventoryComponent?.getInventory(InventoryName.hotbar) || null;
   const offhand = inventoryComponent?.getInventory(InventoryName.offhand) || null;
   const backpackSlot = inventoryComponent?.getInventory(InventoryName.backpackSlot) || null;
   const armourSlot = inventoryComponent?.getInventory(InventoryName.armourSlot) || null;
   const gloveSlot = inventoryComponent?.getInventory(InventoryName.gloveSlot) || null;

   return <div id="hotbar">
      <div className="flex-container">
         <EmptyItemSlot className="hidden" />
         <EmptyItemSlot className="hidden" />
         <div className={"inventory" + (Game.tribe.tribeType !== TribeType.barbarians ? " hidden" : "")}>
            <InventoryContainer entityID={playerID} inventory={offhand} />
         </div>
      </div>
      <div className="middle">
         <div className="inventory">
            <InventoryContainer entityID={playerID} inventory={hotbar} selectedItemSlot={getHotbarSelectedItemSlot()} />
         </div>
      </div>
      <div className="flex-container">
         <div className="inventory">
            <InventoryContainer entityID={playerID} inventory={backpackSlot} />
            <InventoryContainer entityID={playerID} inventory={armourSlot} />
            <InventoryContainer entityID={playerID} inventory={gloveSlot} />
         </div>
      </div>
   </div>;
}

export default Hotbar;
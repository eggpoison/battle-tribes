import { TribeType } from "webgl-test-shared/dist/tribes";
import { useEffect, useReducer, useState } from "react";
import ItemSlot from "./ItemSlot";
import Player from "../../../entities/Player";
import { definiteGameState } from "../../../game-state/game-states";
import Game from "../../../Game";
import { Item, itemTypeIsArmour, itemTypeIsBackpack, itemTypeIsGlove } from "webgl-test-shared/dist/items/items";
import EmptyItemSlot from "./EmptyItemSlot";

export let Hotbar_update: () => void = () => {};

export let Hotbar_setHotbarSelectedItemSlot: (itemSlot: number) => void = () => {};

export let Hotbar_updateRightThrownBattleaxeItemID: (rightThrownBattleaxeItemID: number) => void = () => {};
export let Hotbar_updateLeftThrownBattleaxeItemID: (leftThrownBattleaxeItemID: number) => void = () => {};

const Hotbar = () => {
   const [selectedItemSlot, setSelectedItemSlot] = useState(1);
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

   // @Cleanup: Copy and paste

   const playerID = Player.instance !== null ? Player.instance.id : 0;

   // @Cleanup: should we use an inventory container here?
   // Create the item slots
   const hotbarItemSlots = new Array<JSX.Element>();
   for (let itemSlot = 1; itemSlot <= definiteGameState.hotbar.width * definiteGameState.hotbar.height; itemSlot++) {
      const item: Item | undefined = definiteGameState.hotbar.itemSlots[itemSlot];
      hotbarItemSlots.push(
         <ItemSlot key={itemSlot} className={typeof item !== "undefined" ? (rightThrownBattleaxeItemID === item.id ? "dark" : undefined) : undefined} entityID={playerID} inventory={definiteGameState.hotbar} itemSlot={itemSlot} isSelected={itemSlot === selectedItemSlot} />
      )
   }
   
   // @Cleanup: Copy and paste

   const offhandItem = definiteGameState.offhandInventory.itemSlots[1];
   const offhandSlotElement = <ItemSlot className={typeof offhandItem !== "undefined" ? (leftThrownBattleaxeItemID === offhandItem.id ? "dark" : undefined) : undefined} entityID={playerID} inventory={definiteGameState.offhandInventory} itemSlot={1} placeholderImg={require("../../../images/miscellaneous/offhand-wireframe.png")} />

   const backpackSlotElement = <ItemSlot entityID={playerID} inventory={definiteGameState.backpackSlot} itemSlot={1} placeholderImg={require("../../../images/miscellaneous/backpack-wireframe.png")} validItemSpecifier={itemTypeIsBackpack} />
   const armourItemSlotElement = <ItemSlot entityID={playerID} inventory={definiteGameState.armourSlot} itemSlot={1} placeholderImg={require("../../../images/miscellaneous/armour-wireframe.png")} validItemSpecifier={itemTypeIsArmour} />
   const gloveItemSlotElement = <ItemSlot entityID={playerID} inventory={definiteGameState.gloveSlot} itemSlot={1} placeholderImg={require("../../../images/miscellaneous/glove-wireframe.png")} validItemSpecifier={itemTypeIsGlove} />

   return <div id="hotbar">
      <div className="flex-container">
         <EmptyItemSlot className="hidden" />
         <EmptyItemSlot className="hidden" />
         <div className={"inventory" + (Game.tribe.tribeType !== TribeType.barbarians ? " hidden" : "")}>
            {offhandSlotElement}
         </div>
      </div>
      <div className="middle">
         <div className="inventory">
            {hotbarItemSlots}
         </div>
      </div>
      <div className="flex-container">
         <div className="inventory">
            {backpackSlotElement}
            {armourItemSlotElement}
            {gloveItemSlotElement}
         </div>
      </div>
   </div>;
}

export default Hotbar;
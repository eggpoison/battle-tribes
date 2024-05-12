import { ITEM_TYPE_RECORD, Item, ItemType } from "webgl-test-shared/dist/items";
import { TribeType } from "webgl-test-shared/dist/tribes";
import { useCallback, useEffect, useReducer, useState } from "react";
import { getItemTypeImage } from "../../../client-item-info";
import { leftClickItemSlot, rightClickItemSlot } from "../../../inventory-manipulation";
import ItemSlot from "./ItemSlot";
import Player from "../../../entities/Player";
import { definiteGameState } from "../../../game-state/game-states";
import Game from "../../../Game";

export let Hotbar_update: () => void = () => {};

export let Hotbar_setHotbarSelectedItemSlot: (itemSlot: number) => void = () => {};

export let Hotbar_updateRightThrownBattleaxeItemID: (rightThrownBattleaxeItemID: number) => void = () => {};
export let Hotbar_updateLeftThrownBattleaxeItemID: (leftThrownBattleaxeItemID: number) => void = () => {};

export const backpackItemTypes: ReadonlyArray<ItemType> = [ItemType.leather_backpack, ItemType.raw_beef];

const Hotbar = () => {
   const [selectedItemSlot, setSelectedItemSlot] = useState(1);
   const [rightThrownBattleaxeItemID, setRightThrownBattleaxeItemID] = useState(-1);
   const [leftThrownBattleaxeItemID, setLeftThrownBattleaxeItemID] = useState(-1);
   const [, update] = useReducer(x => x + 1, 0);

   // @Cleanup: Copy and paste

   const clickBackpackSlot = useCallback((e: MouseEvent): void => {
      // Stop the player placing a non-backpack item in the backpack slot
      const heldItem = definiteGameState.heldItemSlot.itemSlots[1];
      if (typeof heldItem !== "undefined" && !backpackItemTypes.includes(heldItem.type)) {
         return;
      }
      leftClickItemSlot(e, Player.instance!.id, definiteGameState.backpackSlot, 1);
   }, []);

   const clickArmourItemSlot = useCallback((e: MouseEvent): void => {
      // Don't click it the player is holding a non-armour item
      const heldItem = definiteGameState.heldItemSlot.itemSlots[1];
      if (typeof heldItem !== "undefined" && ITEM_TYPE_RECORD[heldItem.type] !== "armour") {
         return;
      }

      leftClickItemSlot(e, Player.instance!.id, definiteGameState.armourSlot, 1);
   }, []);

   const clickGloveItemSlot = useCallback((e: MouseEvent): void => {
      // Don't click it the player is holding a non-armour item
      const heldItem = definiteGameState.heldItemSlot.itemSlots[1];
      if (typeof heldItem !== "undefined" && ITEM_TYPE_RECORD[heldItem.type] !== "glove") {
         return;
      }

      leftClickItemSlot(e, Player.instance!.id, definiteGameState.gloveSlot, 1);
   }, []);

   const clickOffhandItemSlot = useCallback((e: MouseEvent): void => {
      leftClickItemSlot(e, Player.instance!.id, definiteGameState.offhandInventory, 1);
   }, []);

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

   // Create the item slots
   const hotbarItemSlots = new Array<JSX.Element>();
   for (let itemSlot = 1; itemSlot <= definiteGameState.hotbar.width * definiteGameState.hotbar.height; itemSlot++) {
      const item: Item | undefined = definiteGameState.hotbar.itemSlots[itemSlot];
      
      if (typeof item !== "undefined") {
         const imageSrc = getItemTypeImage(item.type);
         hotbarItemSlots.push(
            <ItemSlot className={rightThrownBattleaxeItemID === item.id ? "dark" : undefined} onClick={e => leftClickItemSlot(e, Player.instance!.id, definiteGameState.hotbar, itemSlot)} onContextMenu={e => rightClickItemSlot(e, Player.instance!.id, definiteGameState.hotbar, itemSlot)} isSelected={itemSlot === selectedItemSlot} picturedItemImageSrc={imageSrc} itemCount={item.count} key={itemSlot} />
         );
      } else {
         hotbarItemSlots.push(
            <ItemSlot onClick={e => leftClickItemSlot(e, Player.instance!.id, definiteGameState.hotbar, itemSlot)} onContextMenu={e => rightClickItemSlot(e, Player.instance!.id, definiteGameState.hotbar, itemSlot)} isSelected={itemSlot === selectedItemSlot} key={itemSlot} />
         );
      }
   }
   
   // @Cleanup: Copy and paste

   let offhandSlotElement: JSX.Element;
   const offhandItem = definiteGameState.offhandInventory.itemSlots[1];
   if (typeof offhandItem !== "undefined") {
      const image = getItemTypeImage(offhandItem.type);
      offhandSlotElement = <ItemSlot className={leftThrownBattleaxeItemID === offhandItem.id ? "dark" : undefined} onClick={clickOffhandItemSlot} isSelected={false} picturedItemImageSrc={image} />
   } else {
      const imageSrc = require("../../../images/miscellaneous/offhand-wireframe.png");
      offhandSlotElement = <ItemSlot onClick={clickOffhandItemSlot} isSelected={false} picturedItemImageSrc={imageSrc} />
   }

   let backpackSlotElement: JSX.Element;
   const backpackItem = definiteGameState.backpackSlot.itemSlots[1];
   if (typeof backpackItem !== "undefined") {
      const image = getItemTypeImage(backpackItem.type);
      backpackSlotElement = <ItemSlot onClick={clickBackpackSlot} isSelected={false} picturedItemImageSrc={image} />
   } else {
      const imageSrc = require("../../../images/miscellaneous/backpack-wireframe.png");
      backpackSlotElement = <ItemSlot onClick={clickBackpackSlot} isSelected={false} picturedItemImageSrc={imageSrc} />
   }

   let armourItemSlotElement: JSX.Element;
   const armourItem = definiteGameState.armourSlot.itemSlots[1];
   if (typeof armourItem !== "undefined") {
      const image = getItemTypeImage(armourItem.type);
      armourItemSlotElement = <ItemSlot onClick={clickArmourItemSlot} isSelected={false} picturedItemImageSrc={image} itemCount={armourItem.count} />
   } else {
      const imageSrc = require("../../../images/miscellaneous/armour-wireframe.png");
      armourItemSlotElement = <ItemSlot onClick={clickArmourItemSlot} isSelected={false} picturedItemImageSrc={imageSrc} />
   }

   let gloveItemSlotElement: JSX.Element;
   const gloveItem = definiteGameState.gloveSlot.itemSlots[1];
   if (typeof gloveItem !== "undefined") {
      const image = getItemTypeImage(gloveItem.type);
      gloveItemSlotElement = <ItemSlot onClick={clickGloveItemSlot} isSelected={false} picturedItemImageSrc={image} itemCount={gloveItem.count} />
   } else {
      const imageSrc = require("../../../images/miscellaneous/glove-wireframe.png");
      gloveItemSlotElement = <ItemSlot onClick={clickGloveItemSlot} isSelected={false} picturedItemImageSrc={imageSrc} />
   }

   return <div id="hotbar">
      <div className="flex-container">
         <ItemSlot className="hidden" />
         <ItemSlot className="hidden" />
         <div className={"inventory" + (Game.tribe.tribeType !== TribeType.barbarians ? " hidden" : "")}>
            {Game.tribe.tribeType === TribeType.barbarians ? offhandSlotElement : <ItemSlot />}
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
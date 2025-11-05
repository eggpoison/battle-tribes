import { useEffect, useState } from "react";
import { AnimalStaffItemInfo, ArmourItemInfo, Item, ITEM_INFO_RECORD, ITEM_TYPE_RECORD, ItemType } from "../../../../../shared/src/items/items";
import CLIENT_ITEM_INFO_RECORD from "../../../game/client-item-info";

export let ItemTooltip_setItem: (item: Item | null) => void = () => {};
export let ItemTooltip_setPos: (x: number, y: number) => void = () => {};
export let ItemTooltip_hide: () => void;

export const ItemTooltip = () => {
   const [item, setItem] = useState<Item | null>(null);
   const [x, setX] = useState(0);
   const [y, setY] = useState(0);

   useEffect(() => {
      ItemTooltip_setItem = (item: Item | null): void => {
         setItem(item);
      }
      
      ItemTooltip_setPos = (x: number, y: number): void => {
         setX(x);
         setY(y);
      }

      ItemTooltip_hide = (): void => {
         setItem(null);
      }
   }, []);

   if (item === null) {
      return null;
   }
   
   const clientItemInfo = CLIENT_ITEM_INFO_RECORD[item.type];

   const itemCategory = ITEM_TYPE_RECORD[item.type];
   const itemInfo = ITEM_INFO_RECORD[item.type];
   
   return <div id="item-tooltip" style={{left: x + "px", top: y + "px"}}>
      <p className="item-name">{clientItemInfo.name}</p>

      {itemCategory === "animalStaff" && (
         <p>Control range: {(itemInfo as AnimalStaffItemInfo).controlRange} units</p>
      )}

      {itemCategory === "armour" && (
         <p>Defence: {(itemInfo as ArmourItemInfo).defence * 100}%</p>
      )}

{/* @SQUEAM */}
      {/* @HACK */}
      {item.type === ItemType.yuriMinecraft && (
         <p className="flavour-text">Alex's thoughts keep drifting back to that encounter in the woodland mansion, as much as she wills herself not to. She can't put the cold shivers out of her mind, the cold shivers which make her feel so warm. Perhaps the Illager's intentions weren't hostile...</p>
      )}
      {/* @HACK */}
      {item.type === ItemType.yuriSonichu && (
         <p className="flavour-text">Stuck alone and pent up in the woods for a week, Sonichu has an affliction only Shrekke's gentle yet controlling hands can cure.</p>
      )}

      {typeof clientItemInfo.flavourText !== "undefined" ? (
         <p className="flavour-text">{clientItemInfo.flavourText}</p>
      ) : null}
   </div>;
}
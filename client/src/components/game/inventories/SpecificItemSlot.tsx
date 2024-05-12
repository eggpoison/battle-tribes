import { ItemType } from "webgl-test-shared/dist/items";
import { getItemTypeImage } from "../../../client-item-info";
import ItemSlot, { ItemSlotParams } from "./ItemSlot";

interface SpecificItemSlotParams extends ItemSlotParams {
   readonly itemType?: ItemType;
   readonly itemCount?: number;
   canDropItem?(): void;
}

// @Incomplete: Make better system and actually use

const SpecificItemSlot = ({ itemType, itemCount, isSelected, className, onClick, onMouseOver, onMouseOut, onMouseMove, onMouseDown, onContextMenu, canDropItem }: SpecificItemSlotParams) => {
   const itemImage = typeof itemType !== "undefined" ? getItemTypeImage(itemType) : undefined;
   return <ItemSlot picturedItemImageSrc={itemImage} isSelected={isSelected} itemCount={itemCount} className={className} onClick={onClick} onMouseOver={onMouseOver} onMouseOut={onMouseOut} onMouseMove={onMouseMove} onMouseDown={onMouseDown} onContextMenu={onContextMenu} />
}

export default SpecificItemSlot;
import Item from "../../items/Item";
import ITEMS, { ItemName } from "../../items/items";

interface InventoryItemProps {
   clickCallback: () => void;
   itemSlot: [ItemName, number] | undefined;
}
const InventoryItem = ({ clickCallback, itemSlot}: InventoryItemProps) => {
   const itemInfo: Item | null = typeof itemSlot !== "undefined" ? ITEMS[ItemName[itemSlot[0]] as unknown as ItemName] : null;

   return (
      <div onClick={clickCallback} className="slot">
         {typeof itemSlot !== "undefined" ? <>
            <img src={require("../../images/" + itemInfo!.imageSrc)} alt={itemSlot![0] as unknown as string} className="preview" />
            <div className="item-count">{itemSlot![1]}</div>

            <div className="item-name">{itemInfo!.displayName}</div>
         </> : null}
      </div>
   );
}

export default InventoryItem;
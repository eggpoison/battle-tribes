import { getItemTypeImage } from "../../game/client-item-info";
import { Inventory } from "battletribes-shared/items/items";

interface HeldItemSlotProps {
   readonly heldItemSlot: Inventory;
   readonly mouseX: number;
   readonly mouseY: number;
}

const HeldItemSlot = (props: HeldItemSlotProps) => {
   const heldItem = props.heldItemSlot.getItem(1);
   if (heldItem === null) {
      return null;
   }
   
   return <div id="held-item" style={{left: props.mouseX + "px", top: props.mouseY + "px"}}>
      <img className="held-item-icon" src={getItemTypeImage(heldItem.type)} alt="" />
      <div className="held-item-count">{heldItem.count > 1 ? heldItem.count : ""}</div>
   </div>;
}

export default HeldItemSlot;
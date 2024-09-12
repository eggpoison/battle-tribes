import { Inventory } from "battletribes-shared/items/items";
import ItemSlot from "./ItemSlot";

interface EmptyItemSlotProps {
   readonly className?: string;
}

const EmptyItemSlot = (props: EmptyItemSlotProps) => {
   const inventory = new Inventory(1, 1, 0);
   return <ItemSlot className={props.className} entityID={0} inventory={inventory} itemSlot={1} />
}

export default EmptyItemSlot;
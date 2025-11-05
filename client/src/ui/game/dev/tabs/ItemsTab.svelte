import ItemCatalogue from "./ItemCatalogue";
import { ItemSlotCallbackInfo } from "../../inventories/ItemSlot";
import { sendDevGiveItemPacket } from "../../../../game/networking/packet-sending";
import { getItemStackSize } from "../../../../../../shared/src/items/items";

const ItemsTab = () => {
   const onSlotClick = (e: MouseEvent, callbackInfo: ItemSlotCallbackInfo): void => {
      if (callbackInfo.itemType === null) {
         return;
      }
      
      const amount = e.shiftKey ? getItemStackSize(callbackInfo.itemType) : 1;
      sendDevGiveItemPacket(callbackInfo.itemType, amount);
   }
   
   return <ItemCatalogue onMouseDown={onSlotClick} />;
}

export default ItemsTab;
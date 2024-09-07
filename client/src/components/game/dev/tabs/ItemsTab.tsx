import ItemCatalogue from "./ItemCatalogue";
import { ItemSlotCallbackInfo } from "../../inventories/ItemSlot";
import { sendDevGiveItemPacket } from "../../../../client/packet-creation";

const ItemsTab = () => {
   const onSlotClick = (e: MouseEvent, callbackInfo: ItemSlotCallbackInfo): void => {
      if (callbackInfo.itemType === null) {
         return;
      }
      
      const amount = e.shiftKey ? 99 : 1;
      sendDevGiveItemPacket(callbackInfo.itemType, amount);
   }
   
   return <ItemCatalogue onMouseDown={onSlotClick} />;
}

export default ItemsTab;
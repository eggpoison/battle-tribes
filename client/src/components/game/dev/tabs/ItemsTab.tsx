import Client from "../../../../client/Client";
import ItemCatalogue from "./ItemCatalogue";
import { ItemSlotCallbackInfo } from "../../inventories/ItemSlot";

const ItemsTab = () => {
   const onSlotClick = (e: MouseEvent, callbackInfo: ItemSlotCallbackInfo): void => {
      if (callbackInfo.itemType === null) {
         return;
      }
      
      const amount = e.shiftKey ? 99 : 1;
      Client.sendDevGiveItemPacket(callbackInfo.itemType, amount);
   }
   
   return <ItemCatalogue onMouseDown={onSlotClick} />;
}

export default ItemsTab;
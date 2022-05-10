import { ItemSlots } from "../../entity-components/inventory/InventoryComponent";
import InventoryItem from "./InventoryItem";
import InventoryViewerManager, { clickInventorySlot } from "./InventoryViewerManager";

interface InventoryPageProps {
   itemSlots: ItemSlots;
   slotCount: number;
   inventoryViewerManager: InventoryViewerManager;
   maxWidth?: number;
}
const InventoryPage = ({ itemSlots, slotCount, inventoryViewerManager, maxWidth }: InventoryPageProps) => {

   const slotElements = new Array<JSX.Element>();
   for (let i = 0; i < slotCount; i++) {
      const click = (): void => {
         clickInventorySlot(i, inventoryViewerManager);
      }

      slotElements.push(
         <InventoryItem key={i} clickCallback={click} itemSlot={itemSlots[i]} />
      );
   }

   return (
      <>
         {slotElements}
      </>
   );
}

export default InventoryPage;
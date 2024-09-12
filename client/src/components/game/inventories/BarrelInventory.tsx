import { ServerComponentType } from "battletribes-shared/components";
import InventoryContainer from "./InventoryContainer";
import { getSelectedEntity } from "../../../entity-selection";
import { InventoryName } from "battletribes-shared/items/items";

const BarrelInventory = () => {
   const barrel = getSelectedEntity();
   const inventoryComponent = barrel.getServerComponent(ServerComponentType.inventory);
   
   return <>
      <div id="barrel-inventory" className="menu">
         <h2 className="menu-title">Barrel</h2>
         <div className="area">
            <label>
               <input type="checkbox" defaultChecked={true} />
               Allow friendly tribesmen
            </label>
            <label>
               <input type="checkbox" defaultChecked={false} />
               Allow enemies
            </label>
         </div>
         <div className="flex-container center">
            <InventoryContainer entityID={barrel.id} inventory={inventoryComponent.getInventory(InventoryName.inventory)!} />
         </div>
      </div>
   </>;
}

export default BarrelInventory;
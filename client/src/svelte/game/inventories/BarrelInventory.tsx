import InventoryContainer from "./InventoryContainer";
import { getSelectedEntity } from "../../../game/entity-selection";
import { InventoryName } from "battletribes-shared/items/items";
import { getInventory, InventoryComponentArray } from "../../../game/entity-components/server-components/InventoryComponent";
import Menu from "../menus/Menu";
import { assert } from "../../../../../shared/src/utils";

const BarrelInventory = () => {
   const barrel = getSelectedEntity();
   const inventoryComponent = InventoryComponentArray.getComponent(barrel);

   const inventory = getInventory(inventoryComponent, InventoryName.inventory);
   assert(inventory !== null);
   
   return <>
      <Menu id="barrel-inventory" className="menu">
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
            <InventoryContainer entityID={barrel} inventory={inventory} />
         </div>
      </Menu>
   </>;
}

export default BarrelInventory;
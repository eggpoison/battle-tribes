import { InventoryComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { Inventory } from "webgl-test-shared/dist/items";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { updateInventoryFromData } from "../inventory-manipulation";

class InventoryComponent extends ServerComponent<ServerComponentType.inventory> {
   private readonly inventories: Record<string, Inventory> = {};

   constructor(entity: Entity, data: InventoryComponentData) {
      super(entity);

      this.updateFromData(data);
   }

   public getInventory(inventoryName: string): Inventory {
      return this.inventories[inventoryName];
   }

   public updateFromData(data: InventoryComponentData): void {
      // Add new inventories
      for (const inventoryName of Object.keys(data.inventories)) {
         if (this.inventories.hasOwnProperty(inventoryName)) {
            continue;
         }

         this.inventories[inventoryName] = data.inventories[inventoryName];
      }
      
      // @Speed
      // Update existing inventories
      for (const inventoryName of Object.keys(this.inventories)) {
         const inventoryData = data.inventories[inventoryName];
         updateInventoryFromData(this.inventories[inventoryName], inventoryData);
      }
   }
}

export default InventoryComponent;
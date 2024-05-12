import { InventoryComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { Inventory, InventoryName } from "webgl-test-shared/dist/items";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { updateInventoryFromData } from "../inventory-manipulation";

class InventoryComponent extends ServerComponent<ServerComponentType.inventory> {
   private readonly inventories: Partial<Record<InventoryName, Inventory>> = {};

   constructor(entity: Entity, data: InventoryComponentData) {
      super(entity);

      this.updateFromData(data);
   }

   public getInventory(inventoryName: InventoryName): Inventory {
      const inventory = this.inventories[inventoryName];

      if (typeof inventory === "undefined") {
         throw new Error();
      }
      
      return inventory;
   }

   public updateFromData(data: InventoryComponentData): void {
      // Add new inventories
      for (const inventoryNameKey of Object.keys(data.inventories)) {
         const inventoryName = Number(inventoryNameKey) as InventoryName;
         if (this.inventories.hasOwnProperty(inventoryName)) {
            continue;
         }

         this.inventories[inventoryName] = data.inventories[inventoryName];
      }
      
      // @Speed
      // Update existing inventories
      for (const inventoryNameKey of Object.keys(this.inventories)) {
         const inventoryName = Number(inventoryNameKey) as InventoryName;
         const inventoryData = data.inventories[inventoryName]!;
         updateInventoryFromData(this.getInventory(inventoryName), inventoryData);
      }
   }
}

export default InventoryComponent;
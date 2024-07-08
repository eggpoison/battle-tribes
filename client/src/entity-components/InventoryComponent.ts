import { InventoryComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { createInventoryFromData, updateInventoryFromData } from "../inventory-manipulation";
import { InventoryName, Inventory } from "webgl-test-shared/dist/items/items";

class InventoryComponent extends ServerComponent<ServerComponentType.inventory> {
   private readonly inventories: Partial<Record<InventoryName, Inventory>> = {};

   constructor(entity: Entity, data: InventoryComponentData) {
      super(entity);

      this.updateFromData(data);
   }

   // @Cleanup: just combine these 2 and make it able to return undefined

   public hasInventory(inventoryName: InventoryName): boolean {
      return typeof this.inventories[inventoryName] !== "undefined";
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

         const inventoryData = data.inventories[inventoryName];
         if (typeof inventoryData === "undefined") {
            continue;
         }

         this.inventories[inventoryName] = createInventoryFromData(inventoryData);
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
import { InventoryComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { createInventoryFromData, updateInventoryFromData } from "../inventory-manipulation";
import { InventoryName, Inventory, Item } from "webgl-test-shared/dist/items/items";
import { PacketReader } from "webgl-test-shared/dist/packets";
import { ItemType } from "webgl-test-shared/dist/items/items";

export function readInventory(reader: PacketReader): Inventory {
   const name = reader.readNumber() as InventoryName;
   const width = reader.readNumber();
   const height = reader.readNumber();
   const inventory = new Inventory(width, height, name);

   const numItems = reader.readNumber();
   for (let j = 0; j < numItems; j++) {
      const itemSlot = reader.readNumber();
      const id = reader.readNumber();
      const itemType = reader.readNumber() as ItemType;
      const count = reader.readNumber();

      const item = new Item(itemType, count, id);
      inventory.addItem(item, itemSlot);
   }

   return inventory;
}

class InventoryComponent extends ServerComponent {
   private readonly inventories: Partial<Record<InventoryName, Inventory>> = {};

   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.updateFromData(reader);
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

   public padData(reader: PacketReader): void {
      // @Temporary
      const inventories: Partial<Record<InventoryName, Inventory>> = {};
      const numInventories = reader.readNumber();
      for (let i = 0; i < numInventories; i++) {
         const inventory = readInventory(reader);
         inventories[inventory.name] = inventory;
      }
   }

   public updateFromData(reader: PacketReader): void {
      // @Temporary
      const inventories: Partial<Record<InventoryName, Inventory>> = {};
      const numInventories = reader.readNumber();
      for (let i = 0; i < numInventories; i++) {
         const inventory = readInventory(reader);
         inventories[inventory.name] = inventory;
      }
      const data: InventoryComponentData = {
         componentType: ServerComponentType.inventory,
         inventories: inventories
      };
      
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
import { InventoryComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { Inventory } from "webgl-test-shared/dist/items";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
declare class InventoryComponent extends ServerComponent<ServerComponentType.inventory> {
    private readonly inventories;
    constructor(entity: Entity, data: InventoryComponentData);
    getInventory(inventoryName: string): Inventory;
    updateFromData(data: InventoryComponentData): void;
}
export default InventoryComponent;
